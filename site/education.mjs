import {educationFunding,activeHobbyCost} from './household-finance.mjs?v=economy-ui-2';
// Game education paths. No real admissions, legal licenses or child debt claims.
const clone=x=>structuredClone(x),finite=x=>typeof x==='number'&&Number.isFinite(x),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const SCHOOL_EVENTS=Object.freeze([
  {id:'school-primary',stage:'primary',age:7,title:'어떤 초등학교 생활을 시작할까',text:'국공립·사립 초등학교 경로를 고른다. 실제 학교 배정·모집을 재현하지 않는 게임 선택이며 학교별 학비와 지원 예산을 확인할 수 있다.'},
  {id:'school-middle',stage:'middle',age:13,title:'새로운 중학교의 교실',text:'국공립 또는 일반 사립중 경로를 고른다. 의무교육 위탁의 일반 사립중을 모든 사립중의 별도학비 경로와 혼동하지 않는다.'},
  {id:'school-high',stage:'high',age:16,title:'다음 배움의 방향을 고른다',text:'공립·사립 일반고, 자사고, 공립·사립 외고 경로를 고른다. 선발형 경로의 배움 점수와 합격식은 게임 가정이며 실패해도 일반고 경로를 선택할 수 있다.'}
].map(Object.freeze));
const STAGES=['primary','middle','high'],STAGE_LABEL={primary:'초등학교',middle:'중학교',high:'고등학교'};
export const educationEvent=id=>SCHOOL_EVENTS.find(e=>e.id===id)||null;
export function validEducationCatalog(c){return!!c&&c.schemaVersion===1&&c.kind==='game_education_paths'&&typeof c.modelVersion==='string'&&Array.isArray(c.schoolOptions)&&c.schoolOptions.length===9&&Array.isArray(c.universityFields)&&c.universityFields.length===8&&c.schoolOptions.every(r=>r&&typeof r.id==='string'&&STAGES.includes(r.stage)&&['public','private'].includes(r.ownership)&&typeof r.name==='string'&&[36,72].includes(r.durationMonths)&&finite(r.annualTuitionWan)&&r.annualTuitionWan>=0&&finite(r.learningThreshold)&&typeof r.guaranteed==='boolean'&&finite(r.annualLearningBonus))&&new Set(c.schoolOptions.map(r=>r.id)).size===9&&c.universityFields.every(f=>typeof f.id==='string'&&typeof f.label==='string'&&[48,72].includes(f.durationMonths)&&finite(f.learningThreshold)&&finite(f.tuitionMultiplier)&&f.tuitionMultiplier>0);}
function catalog(data){const c=data?.educationOptions;if(!validEducationCatalog(c))throw new TypeError('검토한 교육 경로 자료가 없습니다.');return c;}
export function createSchoolJourney(data){if(!data?.educationOptions)return null;const c=catalog(data);return{schemaVersion:1,modelVersion:c.modelVersion,highestLevel:0,completedStages:[],current:null,applications:[],lastOutcome:null,university:null};}
export function schoolDecisionDue(s){if(!s?.schoolJourney||s.month!==0)return null;return SCHOOL_EVENTS.find(e=>s.age===e.age&&!s.schoolJourney.completedStages.includes(e.stage)&&s.schoolJourney.current?.stage!==e.stage)||null;}
function currentCycleApplications(s,stage){return(s.schoolJourney?.applications||[]).filter(a=>a.stage===stage&&a.cycle===s.age);}
function chanceFor(s,row,stage){if(row.guaranteed)return 1;const first=currentCycleApplications(s,stage)[0],learn=first?.learn??s.learn;return clamp(.5+(learn-row.learningThreshold)/50,.05,.95);}
function applicantReasons(s,row,stage){
  const reasons=[];if(!s?.schoolJourney)reasons.push('이전 기록은 기존 교육 경로를 유지합니다.');if(s?.phase==='ended')reasons.push('종료된 기록입니다.');if(s?.service?.active)reasons.push('복무 중에는 입학 지원을 할 수 없습니다.');
  if(stage!=='university'){if(s?.phase!=='decision'||educationEvent(s.pendingDecision)?.stage!==stage)reasons.push('해당 학교 입학 갈림길에서 선택해 주세요.');}
  else{if(s?.age<19)reasons.push('대학 지원은 게임에서19세부터 가능합니다.');if(s?.phase!=='running'&&!(s?.phase==='decision'&&s.pendingDecision==='education'))reasons.push('현재 갈림길을 먼저 마쳐 주세요.');if(s?.schooling?.status==='enrolled'||s?.schooling?.status==='graduated')reasons.push('현재 대학 과정이 있거나 이미 대학을 졸업했습니다.');if(s?.schoolJourney&&s.schoolJourney.highestLevel<3)reasons.push('고교 과정을 먼저 마쳐 주세요.');}
  const applications=currentCycleApplications(s,stage);if(applications.some(a=>a.optionId===row.id))reasons.push('같은 학년도·같은 경로를 다시 추첨할 수 없습니다.');if(applications.some(a=>a.status==='accepted'||a.status==='deferred'))reasons.push('이 학년도의 입학 선택을 이미 마쳤습니다.');
  const rejected=applications.filter(a=>a.status==='rejected');if(rejected.length&&!row.guaranteed&&row.learningThreshold>=Math.min(...rejected.map(a=>a.learningThreshold)))reasons.push('불합격 후에는 더 낮은 게임 문턱의 경로로 지원하거나 유예해 주세요.');
  return reasons;
}
function displayRow(s,row,stage,data){const reasons=applicantReasons(s,row,stage),funding=educationFunding(s,row.annualTuitionWan,{university:stage==='university',hobbyCostWan:activeHobbyCost(s,data?.hobbyCatalog)});reasons.push(...funding.reasons);return{...clone(row),funding,label:row.name,ownershipLabel:row.ownership==='public'?'국공립':'사립',admissionChance:chanceFor(s,row,stage),eligible:reasons.length===0,reasons,note:'합격식·입학 연령·비용·학습 효과는 게임 설정입니다. 실제 개인의 합격확률·성적·학교 등급을 나타내지 않습니다.'};}
export function schoolChoices(s,data){const event=educationEvent(s?.pendingDecision);if(!event)return[];return catalog(data).schoolOptions.filter(r=>r.stage===event.stage).map(r=>displayRow(s,r,event.stage,data));}
function stableIndex(key,length){let h=2166136261;for(const ch of key)h=Math.imul(h^ch.charCodeAt(0),16777619);return(h>>>0)%length;}
export function universityOptions(s,filters={},data){
  const c=catalog(data),result=[];
  for(const ownership of ['public','private'])for(const location of ['seoul','regional'])for(const field of c.universityFields){
    if(field.publicOnly&&ownership!=='public')continue;if(filters.ownership&&filters.ownership!==ownership||filters.location&&filters.location!==location||filters.field&&filters.field!==field.id)continue;
    const type=ownership==='public'?'국공립':'사립',rows=(data?.tuition||[]).filter(r=>r.type===type&&finite(r.annual)&&r.annual>0&&typeof r.region==='string'&&(location==='seoul'?r.region==='서울':r.region!=='서울'));
    if(!rows.length)continue;const mean=rows.reduce((sum,r)=>sum+r.annual,0)/rows.length,regions=[...new Set(rows.map(r=>r.region))].sort(),id=`university-${ownership}-${location}-${field.id}`,region=regions[stableIndex(id,regions.length)],annualTuitionWan=Math.round(mean/10000*field.tuitionMultiplier*100)/100;
    const locationLabel=location==='seoul'?'서울':'서울 외 지역',name=`${type} · ${locationLabel} · ${field.label} 게임 과정`,row={id,stage:'university',name,ownership,location,locationLabel,field:field.id,fieldLabel:field.label,region,durationMonths:field.durationMonths,annualTuitionWan,learningThreshold:field.learningThreshold+(ownership==='public'?3:0)+(location==='seoul'?8:0),guaranteed:false,costNote:'수집한 대학의 설립별×서울/서울외 연간 등록금 평균에 가상 전공 배율을 적용한 게임 학비. 특정 학교·학과의 실제 등록금이 아님.',tuitionBasis:{kind:'observed-average-with-game-multiplier',sampleSchools:rows.length,averageAnnualWon:mean,fieldMultiplier:field.tuitionMultiplier},fieldNote:field.note||'게임 전공 경로이며 특정 자격을 자동 부여하지 않음'};
    result.push(displayRow(s,row,'university',data));
  }
  return result;
}
export function admissionResult(s,row,draw){const stage=row.stage,first=currentCycleApplications(s,stage)[0],learn=first?.learn??s.learn,chance=chanceFor(s,row,stage);return{stage,cycle:s.age,optionId:row.id,label:row.name,status:draw<chance?'accepted':'rejected',chance,learn,learningThreshold:row.learningThreshold,atMonth:s.totalMonths};}
export function progressSchoolJourney(s){
  if(!s.schoolJourney?.current||s.service?.active)return null;const journey=clone(s.schoolJourney),current=journey.current;current.progressMonths++;
  if(current.progressMonths<current.durationMonths)return{journey,completed:null};
  journey.completedStages.push(current.stage);journey.highestLevel=Math.max(journey.highestLevel,STAGES.indexOf(current.stage)+1);journey.current=null;return{journey,completed:{...current,completedMonth:s.totalMonths}};
}
export function schoolTuitionMonth(s){return s.schoolJourney?.current&&!s.service?.active?s.schoolJourney.current.annualTuitionWan/12:0;}
export function schoolLearningMonth(s){return s.schoolJourney?.current&&!s.service?.active?s.schoolJourney.current.annualLearningBonus/12:0;}
export function schoolJourneyLabel(s){const j=s.schoolJourney;if(!j)return null;if(s.schooling?.status==='enrolled')return`${s.schooling.majorLabel?`${s.schooling.majorLabel} · `:''}${s.schooling.school.name} ${s.service.active?'휴학 중':s.schooling.fundingPaused?'학비 준비 휴학 중':'재학 중'}`;if(s.schooling?.status==='graduated')return`대학 졸업 · ${s.schooling.majorLabel||s.schooling.school.name}`;if(j.current)return`${j.current.name} 재학`;return j.highestLevel>=3?'고교 과정 졸업':j.highestLevel===2?'중학교 과정 졸업':j.highestLevel===1?'초등학교 과정 졸업':'미취학 · 입학 준비';}
export function validSchoolJourney(s){
  const j=s?.schoolJourney;if(j===undefined)return true;if(!j||j.schemaVersion!==1||typeof j.modelVersion!=='string'||!Number.isInteger(j.highestLevel)||j.highestLevel<0||j.highestLevel>4||!Array.isArray(j.completedStages)||j.completedStages.length>3||j.completedStages.some((stage,i)=>stage!==STAGES[i])||j.highestLevel<j.completedStages.length||!Array.isArray(j.applications)||j.applications.length>500)return false;
  if(!j.applications.every(a=>a&&[...STAGES,'university'].includes(a.stage)&&Number.isInteger(a.cycle)&&a.cycle>=7&&a.cycle<=s.age&&typeof a.optionId==='string'&&typeof a.label==='string'&&['accepted','rejected','deferred'].includes(a.status)&&Number.isInteger(a.atMonth)&&a.atMonth>=0&&a.atMonth<=s.totalMonths&&(a.status==='deferred'||finite(a.chance)&&a.chance>=0&&a.chance<=1&&finite(a.learn)&&a.learn>=0&&a.learn<=100&&finite(a.learningThreshold))))return false;
  const keys=j.applications.map(a=>`${a.stage}|${a.cycle}|${a.optionId}`);if(keys.length!==new Set(keys).size)return false;
  const c=j.current;if(c!==null&&(!c||!STAGES.includes(c.stage)||typeof c.name!=='string'||typeof c.optionId!=='string'||!['public','private'].includes(c.ownership)||!Number.isInteger(c.startedMonth)||c.startedMonth<0||c.startedMonth>s.totalMonths||!Number.isInteger(c.progressMonths)||c.progressMonths<0||!Number.isInteger(c.durationMonths)||c.durationMonths!==(c.stage==='primary'?72:36)||c.progressMonths>=c.durationMonths||!finite(c.annualTuitionWan)||c.annualTuitionWan<0||!finite(c.annualLearningBonus)||c.annualLearningBonus<0||j.completedStages.includes(c.stage)||STAGES[j.completedStages.length]!==c.stage))return false;
  if(j.highestLevel!==j.completedStages.length+(s.schooling?.status==='graduated'?1:0))return false;
  if(j.university!==null&&(!j.university||typeof j.university.optionId!=='string'||typeof j.university.field!=='string'||![48,72].includes(j.university.durationMonths)||!s.schooling||s.schooling.gamePath!==true||s.schooling.educationOptionId!==j.university.optionId||s.schooling.major!==j.university.field||s.schooling.durationMonths!==j.university.durationMonths||s.schooling.status!==j.university.status))return false;
  if(j.university===null&&s.schooling)return false;
  if(j.lastOutcome!==null&&(!j.lastOutcome||!j.applications.some(a=>JSON.stringify(a)===JSON.stringify(j.lastOutcome))))return false;
  return true;
}
