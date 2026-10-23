import {pendingInjuryCare} from './injury-care.mjs?v=remedy-1';

// Optional suggestions only. All actual spending, moves and jobs use existing APIs.
const TOPICS=['budget','experience','care'],INTERVAL=60,MIN_MONTH=73*12,MAX_MONTH=120*12;
const ACTIONS={
 budget:[['keep-life','현재 생활을 이어간다',null],['review-housing','주거비와 거주지를 살펴본다','housing'],['review-hobby-budget','취미 활동과 예산을 살펴본다','hobbies']],
 experience:[['review-jobs','경험을 이어갈 일자리를 살펴본다','jobs'],['review-hobbies','가벼운 취미를 살펴본다','hobbies'],['review-focus','일상의 초점을 살펴본다','focus']],
 care:[['review-recording','기록하며 보내는 활동을 살펴본다','spending'],['review-people','가까운 사람들을 살펴본다','family'],['review-gentle-hobby','부담이 적은 취미를 살펴본다','hobbies']],
};
const clone=value=>structuredClone(value),month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const keys=(value,expected)=>!!value&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
const ageBand=s=>s.age<85?'73-84':s.age<100?'85-99':'100-119';
function candidates(s){
 const spouse=s.formedFamily?.relationshipStatus||s.formedFamily?.spouse?.status||'none',health=s.health<25?'low':s.health<45?'recover':s.health<60?'watch':'well',housing=s.residence?.housing||'',rows=[];
 if(s.debt>s.cash&&housing==='월세 독립')rows.push({topic:'budget',title:'앞으로의 생활비를 다시 살핀다',text:'지금의 주거와 정기 활동 비용을 비교하며 생활의 부담을 조절할 수 있습니다.',stateKey:JSON.stringify([housing,s.residence?.region||'',s.debt>s.cash*2?'high':'moderate'])});
 if(['widowed','bereaved'].includes(spouse)||s.health<45||s.age>=100)rows.push({topic:'care',title:'나에게 맞는 하루를 고른다',text:'기록과 교류, 부담이 적은 활동 가운데 지금 마음이 가는 방향을 살펴봅니다.',stateKey:JSON.stringify([ageBand(s),spouse,health])});
 if(s.retired||(s.careerMonths||0)>=120)rows.push({topic:'experience',title:'쌓아 온 경험과 여유를 나눈다',text:'일을 이어갈 조건을 알아보거나, 취미와 휴식에 시간을 쓸 수 있습니다.',stateKey:JSON.stringify([ageBand(s),!!s.retired,s.job?.occupationId||s.job?.title||'',s.job?.status||'',Math.floor((s.careerMonths||0)/60)])});
 if(s.age>=85&&!rows.some(row=>row.topic==='care'))rows.push({topic:'care',title:'나에게 맞는 하루를 고른다',text:'기록과 교류, 부담이 적은 활동 가운데 지금 마음이 가는 방향을 살펴봅니다.',stateKey:JSON.stringify([ageBand(s),spouse,health])});
 return rows;
}
export function createLaterLife(s){
 if(!month(s?.totalMonths))throw new TypeError('노년 일상 안내를 시작할 시점을 확인해 주세요.');
 return{schemaVersion:1,activatedAtMonth:s.totalMonths,entries:[]};
}
export function laterLifeCard(s){
 if(!s?.laterLife||!validLaterLife(s)||s.phase!=='running'||pendingInjuryCare(s)||s.totalMonths<=s.laterLife.activatedAtMonth||s.totalMonths<MIN_MONTH||s.totalMonths>=MAX_MONTH)return null;
 const row=candidates(s).find(candidate=>{const previous=s.laterLife.entries.findLast(entry=>entry.topic===candidate.topic);return!previous||s.totalMonths-previous.atMonth>=INTERVAL&&previous.stateKey!==candidate.stateKey;});
 if(!row)return null;
 return{...row,id:`later-${row.topic}-${row.stateKey}`,optional:true,blocksTime:false,actions:ACTIONS[row.topic].map(([id,label,target])=>({id,label,intent:target?'navigate':'acknowledge',target}))};
}
/** Record attention only; choosing a route does not grant money or stat bonuses. */
export function acknowledgeLaterLifeCard(s,cardId,actionId){
 const card=laterLifeCard(s);
 if(!card||card.id!==cardId||!card.actions.some(action=>action.id===actionId))throw new Error('현재 노년 일상 안내에서 선택해 주세요.');
 const next=clone(s.laterLife);next.entries.push({topic:card.topic,stateKey:card.stateKey,atMonth:s.totalMonths,actionId});return next;
}
export function validLaterLife(s){
 const value=s?.laterLife;if(value===undefined)return true;
 if(!keys(value,['schemaVersion','activatedAtMonth','entries'])||value.schemaVersion!==1||!month(value.activatedAtMonth)||value.activatedAtMonth>s.totalMonths||!Array.isArray(value.entries)||value.entries.length>64)return false;
 const latest={};let previousMonth=value.activatedAtMonth;
 for(const entry of value.entries){
  if(!keys(entry,['topic','stateKey','atMonth','actionId'])||!TOPICS.includes(entry.topic)||typeof entry.stateKey!=='string'||!entry.stateKey||entry.stateKey.length>512||!month(entry.atMonth)||entry.atMonth<=value.activatedAtMonth||entry.atMonth<MIN_MONTH||entry.atMonth>=MAX_MONTH||entry.atMonth>s.totalMonths||entry.atMonth<previousMonth||!ACTIONS[entry.topic].some(([id])=>id===entry.actionId))return false;
  const prior=latest[entry.topic];if(prior&&(entry.atMonth-prior.atMonth<INTERVAL||prior.stateKey===entry.stateKey))return false;
  latest[entry.topic]=entry;previousMonth=entry.atMonth;
 }
 return true;
}
