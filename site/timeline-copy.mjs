import {formatMoney} from './spending.mjs?v=focused-play-2';
/** Relationship labels are a view of the save; names stay in family details. */
function relations(state){
 const rows=[],add=(name,role)=>{if(typeof name==='string'&&name&&typeof role==='string'&&role)rows.push([name,role]);};
 for(const person of state?.profile?.birthFamily?.guardians||[])add(person.name,person.role||'보호자');
 for(const person of state?.profile?.birthFamily?.siblings||[])add(person.name,'형제자매');
 const family=state?.formedFamily;
 const partners=new Map();let activePartner;
 for(const action of family?.actions||[]){if(action.partnerSnapshot?.name){activePartner=action.partnerSnapshot.name;partners.set(activePartner,'연인');}if(action.request?.type==='marry'&&activePartner)partners.set(activePartner,'배우자');}
 for(const account of family?.spouseLife?.accounts||[])if(!partners.has(account.name))partners.set(account.name,'배우자');
 for(const estate of family?.spouseLife?.estates||[])partners.set(estate.partnerName,estate.marriedAtDeath===false?'연인':'배우자');
 if(family?.spouse){const name=family.spouse.name,status=family.relationshipStatus;partners.set(name,['dating','bereaved'].includes(status)?'연인':['married','widowed'].includes(status)?'배우자':partners.get(name)||'배우자');}
 for(const [name,role]of partners)add(name,role);
 for(const child of family?.children||[])add(child.name,'자녀');
 return rows;
}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function particle(role,original){
 const code=role.charCodeAt(role.length-1)-0xac00,ending=code>=0&&code<=11171?code%28:0;
 if(['이','가'].includes(original))return ending?'이':'가';
 if(['은','는'].includes(original))return ending?'은':'는';
 if(['을','를'].includes(original))return ending?'을':'를';
 if(['과','와'].includes(original))return ending?'과':'와';
 if(['으로','로'].includes(original))return ending&&ending!==8?'으로':'로';
 return original||'';
}
export function timelineContextKey(state){return JSON.stringify(relations(state));}
export function timelineFamilyCopy(value,state){
 let text=String(value??'');const rows=relations(state),roles=new Map();
 // Old history may retain a relation and honorific even when its person
 // snapshot is unavailable; that explicit relation is sufficient to hide a name.
 text=text.replace(/(어머니|아버지|할머니|할아버지|친인척 보호자|보호자|배우자|자녀|형제자매)\s+[가-힣]{2,5}\s*님(으로|로|에게|께서|께|의|이|가|은|는|을|를|과|와)?/gu,(_,role,suffix)=>role+particle(role,suffix));
 for(const [name,role]of rows){const prior=roles.get(name);roles.set(name,prior&&prior!==role?'가족':role);}
 // First replace an explicit relation + name, so identical names in a family
 // retain their stated relationship instead of picking an arbitrary person.
 for(const [name,role]of rows){const pattern=new RegExp(`(?<![가-힣A-Za-z0-9])${escape(role)}\\s+${escape(name)}(?:\\s*님)?(으로|로|에게|께서|께|의|이|가|은|는|을|를|과|와)?`,'gu');text=text.replace(pattern,(_,suffix)=>role+particle(role,suffix));}
 for(const [name,role]of [...roles].sort((a,b)=>b[0].length-a[0].length)){const pattern=new RegExp(`(?<![가-힣A-Za-z0-9])${escape(name)}(?:\\s*님)?(으로|로|에게|께서|께|의|이|가|은|는|을|를|과|와)?`,'gu');text=text.replace(pattern,(_,suffix)=>role+particle(role,suffix));}
 return text;
}
export function timelinePresentation(event,state){
 if(event?.type==='birth')return{...event,changes:[...(event.changes||[])]};
 if(['formed-family','formed-family-finance'].includes(event?.type)&&event.title==='가족과 양육의 한 달을 보냈다')event={...event,type:'formed-family-finance',title:'자녀 양육비를 지급했다'};
 const text=String(event?.text||'').replace('장례비·채무를 처리하고 남은 순재산을 게임 규칙으로 분배했습니다.','장례비와 채무를 처리하고 남은 재산을 나누었다.')
  .replace('동일 학년도에는 같은 난수를 유지하며 더 낮은 문턱의 경로로 지원하거나 다음 해를 준비할 수 있다.','같은 학년도에는 지원 기준이 낮은 경로를 고르거나 다음 해를 준비할 수 있다.');
 const storageNotes=new Set(['성장 기록 유지','자녀와 계획의 기록 유지']);
 const careerRole=event?.type==='family-career'?(String(event.title||'').match(/(?:^|[^가-힣])(친인척 보호자|할아버지|할머니|아버지|어머니|보호자)/u)?.[1]||'해당 보호자'):null;
 return{...event,title:timelineFamilyCopy(event?.title||event?.choice||'삶의 기록',state),text:timelineFamilyCopy(text,state),changes:(event?.changes||[]).filter(value=>!storageNotes.has(value)).map(value=>{
  let copy=timelineFamilyCopy(value,state).replace('배우자 공동 기여 종료','배우자 양육비 분담 종료');
  if(careerRole)copy=copy.replace(/^부모 연 (?:근로)?소득(?=\s+\d)/u,`${careerRole} 개인 연 근로소득`);
  return event.type==='formed-family-estate'?copy.replace(/([\d,.]+)만원/gu,(_,n)=>formatMoney(Number(n.replaceAll(',','')))):copy;
 })};
}
