import {pendingInjuryCare,injuryImpact,recoveryActivityPolicy} from './injury-care.mjs?v=birth-timing-20261024';
import {professionRule,professionFieldMet,professionFieldRequirement} from './profession-rules.mjs?v=birth-timing-20261024';
import {careerModelSnapshot,careerModelIncome} from './career-economy.mjs?v=birth-timing-20261024';
import {economicLifeSummary,economicAnnualSalaryWan} from './economic-life.mjs?v=birth-timing-20261024';
import {gameVacancyRegions} from './vacancy-regions.mjs?v=birth-timing-20261024';
import {careerProgressionAssessment,recordedCareerMonths} from './career-progression.mjs?v=birth-timing-20261024';
import {protagonistGender} from './person-identity.mjs?v=birth-timing-20261024';
// Public-source notes and fictional hiring rules are deliberately separate.
export const CAREER_REGIONS=Object.freeze(['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']);
export const ABILITY_AXES=Object.freeze([{id:'analytical',label:'분석·문제해결'},{id:'communication',label:'의사소통·협업'},{id:'physical',label:'신체활동·지구력'},{id:'precision',label:'정밀·절차수행'},{id:'digital',label:'디지털·기술활용'}].map(Object.freeze));
const LEVEL_LABELS=['학업 준비','초등 과정','중등 과정','고교 과정','대학 과정','대학원 과정','박사 과정'];
const AXES=ABILITY_AXES.map(x=>x.id),finite=n=>typeof n==='number'&&Number.isFinite(n),clamp=n=>Math.min(100,Math.max(0,n)),clone=x=>structuredClone(x),idOk=id=>typeof id==='string'&&/^know-[0-9]{6}$/.test(id);
const completedLevel=s=>s.schoolJourney?(Number.isInteger(s.schoolJourney.highestLevel)?Math.min(4,Math.max(0,s.schoolJourney.highestLevel)):0):s.schooling?.status==='graduated'?4:s.age>=19?3:s.age>=16?2:s.age>=13?1:0;
const modelNote='학위·전공·직업준비 증표·능력 문턱은 게임 규칙입니다. 실제 채용공고·법정 자격·취업 가능성을 판정하지 않습니다.';
function currentAbilityBase(s){
  const learn=finite(s?.learn)?s.learn:35,bond=finite(s?.bond)?s.bond:50,health=finite(s?.health)?s.health:75,skill=finite(s?.skill)?s.skill:0;
  return{analytical:clamp(learn),communication:clamp(bond),physical:clamp(health),precision:clamp(learn+skill*2),digital:clamp(learn+skill*2)};
}
export function employmentProfile(s){
  const e=s?.employment,base=currentAbilityBase(s),abilities=e?.abilities?clone(e.abilities):base;
  if(e?.abilityModel)for(const axis of AXES)abilities[axis]=clamp(base[axis]+e.abilities[axis]-e.abilityModel.base[axis]+e.abilityModel.training[axis]);
  const educationLevel=Math.max(completedLevel(s||{}),e?.educationLevel||0);
  return{educationLevel,educationLabel:LEVEL_LABELS[educationLevel],abilities,qualifications:[...(e?.qualificationOccupationIds||[])],training:e?.training?clone(e.training):null,lastAppliedMonth:e?.lastAppliedMonth??null,lastTrainingMonth:e?.lastTrainingMonth??null,lastMovedMonth:e?.lastMovedMonth??null,note:modelNote};
}
export function employmentState(s){
  const p=employmentProfile(s),e=s.employment?clone(s.employment):{schemaVersion:1,abilities:clone(p.abilities),educationLevel:p.educationLevel,qualificationOccupationIds:[],training:null,lastAppliedMonth:null,lastTrainingMonth:null,lastMovedMonth:null,jobHistory:{}};
  // Preserve the old absolute scores, including completed training. Only future
  // changes in learning, relationships, health and skills affect that anchor.
  if(!e.abilityModel)e.abilityModel={version:1,base:currentAbilityBase(s),training:Object.fromEntries(AXES.map(axis=>[axis,0]))};
  if(!e.progressionLedger)e.progressionLedger={version:1,activatedAtMonth:s.totalMonths,hasUnknownEarlierMonths:(s.careerMonths||0)>Object.values(recordedCareerMonths(s)).reduce((n,v)=>n+v,0)};
  return e;
}
function publicStructured(value,key){return value&&typeof value==='object'&&String(value.status||'').startsWith('verified')&&Array.isArray(value.sourceURLs)&&value.sourceURLs.length&&value[key]!==undefined;}
export function employmentRequirements(row,{actor='player'}={}){
  if(!idOk(row?.id)||typeof row?.occupation?.name!=='string')throw new TypeError('공개 직업분류를 확인할 수 없습니다.');
  const group=String(row.modeled?.groupId||'').replace('know-middle-','');
  const educationLevel=['11','12'].includes(group)?5:['13','14','15','21','22','30'].includes(group)?4:3;
  const emphasis=row.modeled?.workAbilities?.levels||{},requiredAbilities={};
  for(const axis of AXES)requiredAbilities[axis]=finite(emphasis[axis])?Math.round(emphasis[axis]*.65):0;
  const profession=professionRule(row,{actor}),qualificationRequired=!!profession||String(row.qualifications?.status||'').startsWith('verified');
  const officialRegions=publicStructured(row.regionRestriction,'allowedRegions')&&Array.isArray(row.regionRestriction.allowedRegions)&&row.regionRestriction.allowedRegions.length?row.regionRestriction.allowedRegions.filter(region=>CAREER_REGIONS.includes(region)):null;
  return{educationLevel,educationLabel:LEVEL_LABELS[educationLevel],requiredAbilities,requiredRegions:officialRegions?.length?[...officialRegions]:[...CAREER_REGIONS],regionKind:officialRegions?.length?'official':'unrestricted',qualificationRequired,qualificationId:row.id,profession:profession?{...profession}:null,kind:'game_assumption',note:modelNote,regionNote:officialRegions?.length?'확인된 구조화 지역 조건을 우선 적용합니다.':'확인된 구조화 지역 조건이 없는 직업은 게임에서 모든 시도에서 지원할 수 있습니다. 법적 제한의 부재를 확정한 뜻은 아닙니다.'};
}
function phaseReasons(s,{firstJob=false}={}){const reasons=[];if(!s||s.phase==='ended')reasons.push('삶의 기록이 종료되었습니다.');if(s?.phase==='decision'&&!(firstJob&&s.pendingDecision==='first-job'))reasons.push('현재 갈림길을 먼저 선택해 주세요.');if(s?.service?.active)reasons.push('복무 중에는 지원·훈련·이사를 할 수 없습니다.');if(pendingInjuryCare(s)||injuryImpact(s).workFactor===0)reasons.push('부상 대응과 회복을 먼저 마쳐 주세요.');return reasons;}
export function evaluateEmployment(s,row){
  const rules=employmentRequirements(row),profile=employmentProfile(s),reasons=phaseReasons(s,{firstJob:true}),requirements=[],warnings=[],economicContext=economicLifeSummary(s);
  const add=(label,value,met,kind='game_assumption')=>{requirements.push({label,value,met,kind});if(met===false)reasons.push(`${label}: ${value}`);};
  add('지원 나이','16세 이상 · 게임 규칙',s?.age>=16);
  add('현재 학업','정규 재학·복무를 마친 뒤 지원',!s?.schoolJourney?.current&&(s?.schooling?.status!=='enrolled'||s?.schooling?.fundingPaused===true)&&s?.job?.status!=='재학');
  add('이달 지원',economicContext.activated?'합격·불합격과 관계없이 한 달에 한 번 지원':'성공한 취업·이직은 한 달에 한 번',profile.lastAppliedMonth!==s?.totalMonths);
  add('현재 직업','현재 직업에 중복 지원할 수 없음',s?.job?.occupationId!==row.id);
  add('게임 학위',`${rules.educationLabel} 이수 이상 · 실제 법정 학력 판정 아님`,profile.educationLevel>=rules.educationLevel);
  if(rules.profession)add('전공 이수',professionFieldRequirement(rules.profession),professionFieldMet(s,rules.profession));
  const progression=careerProgressionAssessment(s,row,{educationLevel:profile.educationLevel});requirements.push(...progression.requirements);reasons.push(...progression.reasons);
  for(const axis of ABILITY_AXES)add(axis.label,`${Math.round(profile.abilities[axis.id]*10)/10} / 게임 문턱 ${rules.requiredAbilities[axis.id]}`,profile.abilities[axis.id]>=rules.requiredAbilities[axis.id]);
  const vacancy=gameVacancyRegions(row);
  if(vacancy)add('공고 근무지역',`${vacancy.regions.join(' · ')} · ${vacancy.label}`,vacancy.regions.includes(s?.residence?.region),'game_vacancy');
  else if(rules.regionKind==='unrestricted')add('지원 지역','모든 시도에서 지원 가능',true);
  if(rules.qualificationRequired)add('게임 직업준비 증표','24개월 준비 과정 이수 · 실제 면허 발급 아님',profile.qualifications.includes(row.id));
  const education=row.education?.required;
  if(education?.text){requirements.push({label:'확인한 학력 조문',value:education.text,met:null,kind:'official'});warnings.push('공식 학력·학점·예외 경로의 개인별 충족 여부는 자동 판정하지 않습니다.');}
  else requirements.push({label:'법적 학력 요건',value:'미확인 · 재직자 학력분포는 최소학력이 아님',met:null,kind:'unknown'});
  if(row.qualifications?.text){requirements.push({label:'확인한 자격 조문',value:row.qualifications.text,met:null,kind:'official'});warnings.push('게임 증표는 실제 시험 합격·학위·수습·등록·면허를 대체하지 않습니다.');}
  const min=row.ageRestriction;
  if(publicStructured(min,'minAge')&&Number.isInteger(min.minAge))add('확인된 최소 나이',`${min.minAge}세`,s.age>=min.minAge,'official');
  if(publicStructured(min,'maxAge')&&Number.isInteger(min.maxAge))add('확인된 최대 나이',`${min.maxAge}세`,s.age<=min.maxAge,'official');
  if(!min)requirements.push({label:'직업별 법적 나이',value:'미확인 · 종사자 평균나이로 제한하지 않음',met:null,kind:'unknown'});
  if(publicStructured(row.regionRestriction,'allowedRegions')&&Array.isArray(row.regionRestriction.allowedRegions))add('확인된 지역 조건',row.regionRestriction.allowedRegions.join(' · '),row.regionRestriction.allowedRegions.includes(s?.residence?.region),'official');
  else requirements.push({label:'직업 자체의 법적 지역 제한',value:'미확인',met:null,kind:'unknown'});
  const sex=protagonistGender(s),sexLabels={male:'남성',female:'여성',남:'남성',여:'여성'};
  if(publicStructured(row.sexRestriction,'allowedSexes')&&Array.isArray(row.sexRestriction.allowedSexes)){
    const allowed=row.sexRestriction.allowedSexes.map(value=>sexLabels[value]||value);
    if(sex!=='미기록') add('확인된 성별 조건',allowed.join(' · '),allowed.includes(sex),'official');
    else{requirements.push({label:'성별 조건 심사',value:'캐릭터 성별 미기록 · 수동 확인 필요',met:null,kind:'unknown'});warnings.push('성별을 추측하지 않았습니다. 실제 자격은 수동 확인이 필요합니다.');}
  }else requirements.push({label:'직업별 성별 조건',value:sex!=='미기록'?'제약 미확인 · 성별분포로 제한하지 않음':'성별 미기록·법적 제약 미확인 · 필요한 경우 수동 확인',met:null,kind:'unknown'});
  warnings.push(modelNote,rules.regionNote);
  const trainingOptions=ABILITY_AXES.map(axis=>({type:'ability',ability:axis.id,label:`${axis.label} 훈련`,durationMonths:1,cost:30}));
  if(profile.educationLevel<6)trainingOptions.push({type:'education',label:`${LEVEL_LABELS[profile.educationLevel<3?3:profile.educationLevel+1]} 게임 과정`,durationMonths:profile.educationLevel<3?12:profile.educationLevel===3?48:profile.educationLevel===4?24:36,cost:profile.educationLevel<3?120:profile.educationLevel===3?2400:1200});
  if(rules.qualificationRequired&&!profile.qualifications.includes(row.id))trainingOptions.push({type:'qualification',occupationId:row.id,label:`${row.occupation.name} 직업준비`,durationMonths:24,cost:600});
  const model=careerModelSnapshot(row),saved=s?.employment?.jobHistory?.[row.id],experienceMonths=saved?.months||0,payScale=saved?.payScale||1;
  const baseAnnualWan=model?careerModelIncome(model,experienceMonths,payScale):null;
  const offeredAnnualWan=baseAnnualWan===null?null:economicAnnualSalaryWan(s,baseAnnualWan,{occupationTitle:row.occupation.name});
  return{eligible:reasons.length===0,reasons,requirements,warnings,progression,requiredRegions:[...rules.requiredRegions],vacancyRegions:vacancy?.regions||null,vacancy,requiredAbilities:rules.requiredAbilities,educationLevel:rules.educationLevel,profile,trainingOptions,hiringProbability:economicContext.hiringProbability,offeredAnnualWan,baseAnnualWan,experienceMonths,economicContext,requiresManualReview:requirements.some(r=>r.kind==='unknown'||r.kind==='official'&&r.met===null),note:modelNote};
}
export function careerTrainingPlan(s,request,row){
  const p=employmentProfile(s);if(!request||typeof request!=='object')throw new TypeError('훈련 종류를 선택해 주세요.');
  if(!recoveryActivityPolicy(s).studyAllowed)throw new Error('이론 훈련은 회복을 위한 휴식을 마친 뒤 시작할 수 있습니다.');
  if(request.type==='ability'&&AXES.includes(request.ability)){if(request.ability==='physical'&&!recoveryActivityPolicy(s).physicalTrainingAllowed)throw new Error('신체활동 훈련은 부상 회복을 마친 뒤 시작할 수 있습니다.');if(p.abilities[request.ability]>=100)throw new Error('이미 이 능력의 게임 상한에 도달했습니다.');return{type:'ability',ability:request.ability,label:`${ABILITY_AXES.find(a=>a.id===request.ability).label} 훈련`,durationMonths:1,cost:30,gain:8};}
  if(request.type==='education'){if(p.educationLevel>=6)throw new Error('게임 학위 과정을 모두 마쳤습니다.');const targetLevel=p.educationLevel<3?3:p.educationLevel+1;return{type:'education',targetLevel,label:`${LEVEL_LABELS[targetLevel]} 게임 과정`,durationMonths:targetLevel===3?12:targetLevel===4?48:targetLevel===5?24:36,cost:targetLevel===3?120:targetLevel===4?2400:1200};}
  if(request.type==='qualification'&&row&&employmentRequirements(row).qualificationRequired){const rules=employmentRequirements(row);if(p.qualifications.includes(row.id))throw new Error('이 직업의 게임 준비 증표를 이미 받았습니다.');if(p.educationLevel<rules.educationLevel)throw new Error('게임 학위 과정을 먼저 마쳐 주세요.');if(!professionFieldMet(s,rules.profession))throw new Error(`${professionFieldRequirement(rules.profession)} 후 직업 준비 과정을 시작할 수 있습니다.`);return{type:'qualification',occupationId:row.id,label:`${row.occupation.name} 직업준비 · 실제 면허 아님`,durationMonths:24,cost:600};}
  throw new TypeError('지원하지 않는 훈련입니다.');
}
export function progressCareerTraining(s,{recovery=recoveryActivityPolicy(s)}={}){
  if(!s.employment?.training||s.service?.active||s.schoolJourney?.current||(s.schooling?.status==='enrolled'&&!s.schooling?.fundingPaused))return null;
  if(!recovery.studyAllowed||s.employment.training.type==='ability'&&s.employment.training.ability==='physical'&&!recovery.physicalTrainingAllowed)return null;
  const employment=employmentState(s),t=employment.training;t.remainingMonths--;if(t.remainingMonths>0)return{employment,completed:null};
  if(t.type==='ability')employment.abilityModel.training[t.ability]=clamp(employment.abilityModel.training[t.ability]+t.gain);
  else if(t.type==='education')employment.educationLevel=Math.max(employment.educationLevel,t.targetLevel);
  else if(t.type==='qualification'&&!employment.qualificationOccupationIds.includes(t.occupationId))employment.qualificationOccupationIds.push(t.occupationId);
  employment.training=null;return{employment,completed:clone(t)};
}
export function validEmploymentState(s){
  const e=s?.employment;if(e===undefined)return true;
  if(!e||e.schemaVersion!==1||!e.abilities||Object.keys(e.abilities).length!==5||!AXES.every(k=>finite(e.abilities[k])&&e.abilities[k]>=0&&e.abilities[k]<=100)||!Number.isInteger(e.educationLevel)||e.educationLevel<0||e.educationLevel>6||!Array.isArray(e.qualificationOccupationIds)||e.qualificationOccupationIds.length!==new Set(e.qualificationOccupationIds).size||!e.qualificationOccupationIds.every(idOk)||!e.jobHistory||typeof e.jobHistory!=='object'||Array.isArray(e.jobHistory))return false;
  if(e.abilityModel!==undefined){const model=e.abilityModel;if(!model||model.version!==1||!['base','training'].every(key=>model[key]&&Object.keys(model[key]).length===5&&AXES.every(axis=>finite(model[key][axis])&&model[key][axis]>=0&&model[key][axis]<=100)))return false;}
  if(e.progressionLedger!==undefined){const ledger=e.progressionLedger;if(!ledger||ledger.version!==1||!Number.isInteger(ledger.activatedAtMonth)||ledger.activatedAtMonth<0||ledger.activatedAtMonth>s.totalMonths||typeof ledger.hasUnknownEarlierMonths!=='boolean')return false;}
  if(!['lastAppliedMonth','lastTrainingMonth','lastMovedMonth'].every(k=>e[k]===null||Number.isInteger(e[k])&&e[k]>=0&&e[k]<=s.totalMonths))return false;
  if(!Object.entries(e.jobHistory).every(([id,h])=>idOk(id)&&h&&Number.isInteger(h.months)&&h.months>=0&&h.months<=s.totalMonths&&finite(h.payScale)&&h.payScale>0))return false;
  const t=e.training;if(t===null)return true;
  if(!t||!['ability','education','qualification'].includes(t.type)||typeof t.label!=='string'||!Number.isInteger(t.startedMonth)||t.startedMonth<0||t.startedMonth>s.totalMonths||!Number.isInteger(t.durationMonths)||t.durationMonths<1||t.durationMonths>48||!Number.isInteger(t.remainingMonths)||t.remainingMonths<1||t.remainingMonths>t.durationMonths||!finite(t.cost)||t.cost<0)return false;
  return t.type==='ability'?AXES.includes(t.ability)&&t.durationMonths===1&&t.gain===8:t.type==='education'?Number.isInteger(t.targetLevel)&&t.targetLevel>=3&&t.targetLevel<=6:idOk(t.occupationId)&&t.durationMonths===24;
}
