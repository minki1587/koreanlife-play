import {parentDeathCheck} from './family-estate.mjs?v=review-two-1';
import {employmentRequirements,ABILITY_AXES} from './employment.mjs?v=review-two-1';
import {careerModelSnapshot,careerModelIncome,validCareerModel} from './career-economy.mjs?v=review-two-1';
import {careerProgressionAssessment} from './career-progression.mjs?v=review-two-1';
import {gameVacancyRegions} from './vacancy-regions.mjs?v=review-two-1';

const VERSION='parent-life-1',clone=x=>structuredClone(x),round=n=>Math.round(n*100)/100;
const nn=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const str=x=>typeof x==='string'&&x.length>0&&x.length<=250;
const statuses=['employed','unemployed','homemaking','retired','deceased'];
const statusLabels={employed:'취업 중',unemployed:'구직 중',homemaking:'육아·가사',retired:'은퇴',deceased:'사망'};
const caches=new WeakMap();
function ticket(seed,id,month,kind){let h=2166136261;for(const c of `${VERSION}|${seed}|${id}|${month}|${kind}`)h=Math.imul(h^c.charCodeAt(0),16777619);h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;}
const verified=(v,key)=>v&&String(v.status||'').startsWith('verified')&&Array.isArray(v.sourceURLs)&&v.sourceURLs.length&&v[key]!==undefined;
function restrictions(row){return {min:verified(row.ageRestriction,'minAge')?row.ageRestriction.minAge:null,max:verified(row.ageRestriction,'maxAge')?row.ageRestriction.maxAge:null,sex:!!verified(row.sexRestriction,'allowedSexes')};}
function rows(data){if(caches.has(data))return caches.get(data);if(!Array.isArray(data?.occupations)||!data.occupations.length)throw new TypeError('부모의 직업 자료가 없습니다.');const result=[...data.occupations].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>({row,requirements:employmentRequirements(row),model:careerModelSnapshot(row),limits:restrictions(row)}));if(result.some(r=>!r.model))throw new TypeError('부모 직업의 경력 임금 자료를 확인해 주세요.');caches.set(data,result);return result;}
export function validateParentRules(r){if(r?.version!==VERSION||r.kind!=='game_assumption'||!Number.isInteger(r.retirementAge)||r.retirementAge<50||r.retirementAge>80||!Number.isInteger(r.historyLimit)||r.historyLimit<1||r.historyLimit>240||!['monthlyLossChance','monthlyChangeChance','monthlyHireChance','monthlySearchChance'].every(k=>nn(r[k])&&r[k]<=1))throw new TypeError('부모 생애 규칙을 확인해 주세요.');return r;}
function career(entry,months,scale,workplace){const {row,requirements:q,model,limits}=entry;return {id:row.id,name:row.occupation.name,model:clone(model),experienceMonths:months,incomeScale:scale,annualIncomeWan:careerModelIncome(model,months,scale),educationMinimum:q.educationLevel,requiredRegions:[...q.requiredRegions],qualificationRequired:q.qualificationRequired,limits:clone(limits),workplace:clone(workplace),employmentType:model.employmentTypes[0]||'게임 근무 설정',weeklyHours:model.weeklyHours};}
const statusFor=g=>g.activity==='구직 중'?'unemployed':g.activity==='은퇴·돌봄'?'retired':'homemaking';
export function createParentLife(s,data){
 const r=validateParentRules(data.parentRules),f=s.profile?.birthFamily;if(!f||!s.householdFinance)throw new TypeError('부모 생애에는 가족과 가구 계정이 필요합니다.');const jobs=rows(data);
 const guardians=f.guardians.map(g=>{
  const ageMonths=g.ageAtBirth*12+s.totalMonths,entry=g.occupation?jobs.find(j=>j.row.id===g.occupation.id):null;if(g.occupation&&!entry)throw new TypeError('저장된 부모 직업을 찾지 못했습니다.');
  const o=entry?career(entry,g.occupation.experienceMonths+s.totalMonths,g.occupation.incomeScale,g.occupation.workplace):null,retired=ageMonths>=r.retirementAge*12||(o?.limits.max!==null&&o?.limits.max!==undefined&&Math.floor(ageMonths/12)>o.limits.max),status=retired?'retired':o?'employed':statusFor(g),preparedOccupationIds=entry?.requirements.qualificationRequired?[entry.row.id]:[],abilities={};
  for(const a of ABILITY_AXES)abilities[a.id]=Math.min(100,Math.max(55+g.education.level*4,entry?.requirements.requiredAbilities[a.id]||0));
  return {id:g.id,ageMonths,status,occupation:status==='employed'?o:null,lastOccupation:o,experienceByOccupation:o?{[o.id]:o.experienceMonths}:{},preparedOccupationIds,abilities,searchMonths:0,lastChangeMonth:s.totalMonths,annualIncomeWan:status==='employed'?o.annualIncomeWan:0};
 });
 return {version:VERSION,familyFingerprint:f.fingerprint,activatedAtMonth:s.totalMonths,lastProcessedMonth:s.totalMonths,rules:clone(r),guardians,events:[]};
}
export function parentJobCandidates(s,p,data){
 const birth=s.profile.birthFamily.guardians.find(g=>g.id===p.id),age=Math.floor(p.ageMonths/12);
 if(age>=s.familyLife.rules.retirementAge||['retired','deceased'].includes(p.status))return [];
 return rows(data).filter(({row,requirements:q,limits:a})=>q.educationLevel<=birth.education.level&&q.requiredRegions.includes(birth.residence.region)&&(!gameVacancyRegions(row)||gameVacancyRegions(row).regions.includes(birth.residence.region))&&careerProgressionAssessment(p,row,{educationLevel:birth.education.level}).eligible&&(!q.qualificationRequired||p.preparedOccupationIds.includes(row.id))&&Object.entries(q.requiredAbilities).every(([key,value])=>p.abilities[key]>=value)&&!a.sex&&(a.min===null||age>=a.min)&&(a.max===null||age<=a.max));
}
export function advanceParentLife(s,data){
 if(!s.familyLife)return null;
 const life=clone(s.familyLife),atMonth=s.totalMonths+1;if(life.lastProcessedMonth!==s.totalMonths)throw new Error('부모 생애의 정산 월이 일치하지 않습니다.');const events=[];
 for(const p of life.guardians){
  if(p.status==='deceased')continue;
  const birth=s.profile.birthFamily.guardians.find(g=>g.id===p.id),before=p.status,oldJob=p.occupation?.name||'',oldIncome=p.annualIncomeWan;p.ageMonths++;
  const draw=kind=>ticket(s.seed,p.id,atMonth,kind),age=Math.floor(p.ageMonths/12),emit=(type,title)=>{p.lastChangeMonth=atMonth;events.push({id:`${p.id}-${atMonth}-${type}`,atMonth,guardianId:p.id,type,title,fromStatus:before,toStatus:p.status,fromOccupation:oldJob,toOccupation:p.occupation?.name||'',fromAnnualIncomeWan:oldIncome,annualIncomeWan:p.annualIncomeWan});};
  let event=null;const mortality=parentDeathCheck(s,p,atMonth);if(mortality){p.lastMortalityCheck=mortality;if(mortality.dies){p.death=clone(mortality);p.lastOccupation=p.occupation||p.lastOccupation;p.occupation=null;p.status='deceased';p.annualIncomeWan=0;emit('death',`${birth.role} ${birth.name}님을 기억하며`);continue;}}
  if(p.status!=='retired'&&(age>=life.rules.retirementAge||(p.occupation?.limits.max!==null&&p.occupation?.limits.max!==undefined&&age>p.occupation.limits.max))){p.lastOccupation=p.occupation||p.lastOccupation;p.occupation=null;p.status='retired';event=['retirement',`${birth.role} ${birth.name}님이 은퇴했다`];}
  else if(p.status==='employed'){
   if(draw('loss')<life.rules.monthlyLossChance){p.lastOccupation=p.occupation;p.occupation=null;p.status='unemployed';p.searchMonths=0;event=['job-loss',`${birth.role} ${birth.name}님이 실직해 구직을 시작했다`];}
   else if(draw('change')<life.rules.monthlyChangeChance){const options=parentJobCandidates({...s,familyLife:life},p,data).filter(j=>j.row.id!==p.occupation.id);if(options.length){const entry=options[Math.floor(draw('vacancy')*options.length)];p.lastOccupation=p.occupation;p.occupation=career(entry,p.experienceByOccupation[entry.row.id]||0,p.occupation.incomeScale,birth.residence);event=['job-change',`${birth.role} ${birth.name}님이 ${p.occupation.name}(으)로 이직했다`];}}
  }else if(p.status==='unemployed'){
   p.searchMonths++;if(draw('hire')<life.rules.monthlyHireChance){const options=parentJobCandidates({...s,familyLife:life},p,data);if(options.length){const entry=options[Math.floor(draw('vacancy')*options.length)];p.occupation=career(entry,p.experienceByOccupation[entry.row.id]||0,p.lastOccupation?.incomeScale||1,birth.residence);p.status='employed';p.searchMonths=0;event=['job-hire',`${birth.role} ${birth.name}님이 ${p.occupation.name} 일을 시작했다`];}}
  }else if(p.status==='homemaking'&&draw('search')<life.rules.monthlySearchChance){p.status='unemployed';p.searchMonths=0;event=['job-search',`${birth.role} ${birth.name}님이 구직을 시작했다`];}
  if(p.status==='employed'){const o=p.occupation;o.experienceMonths++;o.annualIncomeWan=careerModelIncome(o.model,o.experienceMonths,o.incomeScale);p.experienceByOccupation[o.id]=o.experienceMonths;p.annualIncomeWan=o.annualIncomeWan;}else p.annualIncomeWan=0;
  if(!event&&p.status==='employed'&&p.annualIncomeWan>oldIncome)event=['wage-rise',`${birth.role} ${birth.name}님의 경력 임금이 올랐다`];
  if(event)emit(...event);
 }
 life.events=[...life.events,...events].slice(-life.rules.historyLimit);life.lastProcessedMonth=atMonth;
 return {life,events};
}
export const currentFamilyIncome=s=>s.familyLife?round(s.familyLife.guardians.reduce((sum,p)=>sum+p.annualIncomeWan,0)):s.profile.birthFamily.household.annualIncomeWan;
export function currentParents(s){if(!s.familyLife)return [];return s.familyLife.guardians.map(p=>{const g=s.profile.birthFamily.guardians.find(g=>g.id===p.id);return {...clone(p),role:g.role,name:g.name,education:clone(g.education),residence:clone(g.residence),age:Math.floor(p.ageMonths/12),month:p.ageMonths%12,statusLabel:statusLabels[p.status]};});}
function validCareer(o,g,p){return o&&/^know-\d{6}$/.test(o.id)&&str(o.name)&&validCareerModel(o.model)&&o.model.occupationId===o.id&&Number.isInteger(o.experienceMonths)&&o.experienceMonths>=0&&o.experienceMonths<=p.ageMonths-g.education.entryAge*12&&nn(o.incomeScale)&&o.incomeScale>0&&nn(o.annualIncomeWan)&&o.annualIncomeWan===careerModelIncome(o.model,o.experienceMonths,o.incomeScale)&&Number.isInteger(o.educationMinimum)&&o.educationMinimum<=g.education.level&&Array.isArray(o.requiredRegions)&&o.requiredRegions.includes(o.workplace?.region)&&['id','region','name','sourceRegion'].every(k=>str(o.workplace[k]))&&typeof o.qualificationRequired==='boolean'&&(!o.qualificationRequired||p.preparedOccupationIds.includes(o.id))&&o.limits&&['min','max'].every(k=>o.limits[k]===null||Number.isInteger(o.limits[k])&&o.limits[k]>=0)&&o.limits.sex===false&&str(o.employmentType)&&(o.weeklyHours===null||nn(o.weeklyHours)&&o.weeklyHours<=168);}
export function validParentLife(s){try{
 const l=s?.familyLife;if(l===undefined)return true;const f=s.profile?.birthFamily;
 if(!l||!f||!s.householdFinance||l.version!==VERSION||l.familyFingerprint!==f.fingerprint||!Number.isInteger(l.activatedAtMonth)||l.activatedAtMonth<0||l.activatedAtMonth>s.totalMonths||l.lastProcessedMonth!==s.totalMonths)return false;validateParentRules(l.rules);
 if(!Array.isArray(l.guardians)||l.guardians.length!==f.guardians.length||new Set(l.guardians.map(p=>p.id)).size!==l.guardians.length)return false;
 for(const p of l.guardians){const g=f.guardians.find(g=>g.id===p.id);if(!g||p.ageMonths!==g.ageAtBirth*12+(p.status==='deceased'?p.death?.atMonth:s.totalMonths)||!statuses.includes(p.status)||!Number.isInteger(p.searchMonths)||p.searchMonths<0||p.searchMonths>s.totalMonths-l.activatedAtMonth||!Number.isInteger(p.lastChangeMonth)||p.lastChangeMonth<l.activatedAtMonth||p.lastChangeMonth>s.totalMonths||!nn(p.annualIncomeWan)||!Array.isArray(p.preparedOccupationIds)||p.preparedOccupationIds.length!==new Set(p.preparedOccupationIds).size||!p.preparedOccupationIds.every(id=>id===g.occupation?.id)||!p.abilities||!ABILITY_AXES.every(a=>nn(p.abilities[a.id])&&p.abilities[a.id]<=100)||!p.experienceByOccupation||Array.isArray(p.experienceByOccupation)||!Object.entries(p.experienceByOccupation).every(([id,n])=>/^know-\d{6}$/.test(id)&&Number.isInteger(n)&&n>=0&&n<=p.ageMonths-g.education.entryAge*12))return false;
  if(p.lastOccupation!==null&&!validCareer(p.lastOccupation,g,p))return false;
  if(p.status==='employed'){if(!validCareer(p.occupation,g,p)||p.annualIncomeWan!==p.occupation.annualIncomeWan||p.ageMonths>=l.rules.retirementAge*12||p.occupation.limits.min!==null&&Math.floor(p.ageMonths/12)<p.occupation.limits.min||p.occupation.limits.max!==null&&Math.floor(p.ageMonths/12)>p.occupation.limits.max||p.experienceByOccupation[p.occupation.id]!==p.occupation.experienceMonths)return false;}
  else if(p.occupation!==null||p.annualIncomeWan!==0)return false;
 }
 if(!Array.isArray(l.events)||l.events.length>l.rules.historyLimit||new Set(l.events.map(e=>e.id)).size!==l.events.length)return false;
 return l.events.every((e,i)=>str(e.id)&&Number.isInteger(e.atMonth)&&e.atMonth>l.activatedAtMonth&&e.atMonth<=s.totalMonths&&(!i||e.atMonth>=l.events[i-1].atMonth)&&f.guardians.some(g=>g.id===e.guardianId)&&['retirement','job-loss','job-hire','job-change','job-search','death','wage-rise'].includes(e.type)&&str(e.title)&&statuses.includes(e.fromStatus)&&statuses.includes(e.toStatus)&&typeof e.fromOccupation==='string'&&typeof e.toOccupation==='string'&&nn(e.fromAnnualIncomeWan)&&nn(e.annualIncomeWan));
 }catch{return false;}}
