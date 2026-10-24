import {activeUniversity,beginServiceDeferral,enableServiceDeferral,progressServiceDeferral,resolveServiceDeferral,serviceDeferralSummary,validServiceDeferral} from './service-deferral.mjs?v=birth-speed-20261024';
import {setReserveAutomation as reserveAutomationPolicy,validReserveAutomation,reserveAutomaticChoice} from './reserve-automation.mjs?v=birth-speed-20261024';
import {enableReserveService,progressReserveService,reserveAction,validReserveService} from './reserve-service.mjs?v=birth-speed-20261024';
import {ensureDegreeHistory,recordDegreeCompletion,prepareDegreeJourney,validDegreeHistory} from './degree-history.mjs?v=birth-speed-20261024';
import {militaryObligation} from './military-obligation.mjs?v=birth-speed-20261024';
import {createFrozenValidationCache} from './immutable-save.mjs?v=birth-speed-20261024';
import {enableChildInheritance,progressChildInheritance,childInheritanceAction,validChildInheritance} from './child-inheritance.mjs?v=birth-speed-20261024';
import {createLaterLife,acknowledgeLaterLifeCard,validLaterLife,laterLifeCard} from './later-life.mjs?v=birth-speed-20261024';
import {serviceReadiness,deferServiceReview,progressServiceReview,resolveServiceReview,validServiceReview} from './service-readiness.mjs?v=birth-speed-20261024';
import {careerMilestone,assessCareerMilestoneAction} from './career-milestone.mjs?v=birth-speed-20261024';
import {cashFlowSnapshot,validLastCashFlow} from './cash-flow-summary.mjs?v=birth-speed-20261024';
import {applyFundedCare,validCareFunding} from './care-funding.mjs?v=birth-speed-20261024';
import {monthlyWorkIncomeWan,monthlyAutomaticConsumptionWan} from './income-rules.mjs?v=birth-speed-20261024';
import {debtRepaymentQuote,PERSONAL_DEBT_ANNUAL_RATE} from './debt-rules.mjs?v=birth-speed-20261024';
import {createEmploymentContract,employmentTypeStatus,progressEmploymentContract,employmentIncomeFactor,validEmploymentContracts} from './employment-contract.mjs?v=birth-speed-20261024';
import {financeMonthOpening,monthlyFinanceEvent} from './monthly-finance.mjs?v=birth-speed-20261024';
import {createEconomicLife,ensureEconomicLife,validEconomicLife,progressEconomicLife,economicJobApplication,economicLifeSummary,economicCostWan,economicAnnualSalaryWan} from './economic-life.mjs?v=birth-speed-20261024';
import {createMarket,ensureMarket,validMarket,progressMarket,applyInvestmentAction} from './market-economy.mjs?v=birth-speed-20261024';
import {protagonistGender} from './person-identity.mjs?v=birth-speed-20261024';
import {academySupportActive,academyOfficerJob,validAcademyState} from './academy.mjs?v=birth-speed-20261024';
import {ensureFormedFamily,validFormedFamily,progressFormedFamily,applyFormedFamilyAction,formedFamilyMonthlyBurden} from './formed-family.mjs?v=birth-speed-20261024';
import {appendLifeEvent,validTimelineHistory} from './timeline-history.mjs?v=birth-speed-20261024';
import {pendingInjuryCare,injuryImpact,selectInjuryCare,recoveryActivityPolicy,recoveryStudyAllowed} from './injury-care.mjs?v=birth-speed-20261024';
import {createLifeHealth,progressLifeHealth,validLifeHealth,validLifeDeath} from './life-health.mjs?v=birth-speed-20261024';
import {createMilitaryPay,progressMilitaryPay,validMilitaryPay} from './military-pay.mjs?v=birth-speed-20261024';
import {createMilitarySavings,fundMilitarySavingsMonth,settleMilitarySavings,validMilitarySavings} from './military-savings.mjs?v=birth-speed-20261024';
import {createFamilyEstate,settleFamilyDeaths,validFamilyEstate} from './family-estate.mjs?v=birth-speed-20261024';
import {createParentLife,advanceParentLife,validParentLife} from './parent-careers.mjs?v=birth-speed-20261024';
import {createHouseholdFinance,validHouseholdFinance,hasHouseholdSupport,settleHouseholdMonth,activeHobbyCost,educationFunding} from './household-finance.mjs?v=birth-speed-20261024';
import {generateBirthFamily,validBirthFamily,familySummary} from './birth-family.mjs?v=birth-speed-20261024';
import {validSpendingState,formatMoney} from './spending.mjs?v=birth-speed-20261024';
import {validHobbyState,progressHobbies} from './hobby-rules.mjs?v=birth-speed-20261024';
import {mortalitySnapshot,validMortality,annualDeathProbability,lifeLimitMonths} from './mortality.mjs?v=birth-speed-20261024';
import {careerModelIncome,careerModelSnapshot,validCareerModel} from './career-economy.mjs?v=birth-speed-20261024';
import {employmentProfile,employmentState,evaluateEmployment,careerTrainingPlan,progressCareerTraining,validEmploymentState,CAREER_REGIONS} from './employment.mjs?v=birth-speed-20261024';
import {createSchoolJourney,educationEvent,schoolDecisionDue,schoolChoices,universityOptions,admissionResult,progressSchoolJourney,schoolTuitionMonth,schoolLearningMonth,schoolMonthlyEffects,schoolJourneyLabel,validSchoolJourney} from './education.mjs?v=birth-speed-20261024';
export {schoolChoices,universityOptions} from './education.mjs?v=birth-speed-20261024';
export const VERSION = 2;
export const clamp = (n,lo=0,hi=100) => Math.min(hi,Math.max(lo,n));
const round=n=>Math.round(n*100)/100, clone=value=>structuredClone(value);
const LIFE_DEATH_CAUSES=new Set(['military-incident','military-injury','military-health','daily-incident','daily-injury','daily-health']);
const FOCUSES=['balance','learning','career','health','relationships'];
const FOCUS_NAMES={balance:'균형',learning:'배움',career:'일',health:'건강',relationships:'관계'};
const WORKING=new Set(['재직','계약직','시간제','프리랜서','자영업']);
const METRICS=['health','learn','bond','joy'], LABELS={health:'건강',learn:'배움',bond:'관계',joy:'만족'};
const RULE_NOTE='임금·생활비·점수·사건은 가상 규칙이며 실제 개인의 미래 확률이 아닙니다.';
export function random(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
const monthRandom=(s,purpose)=>random(`${s.seed}|${s.totalMonths}|${purpose}`);
const cleanLifeSeed=seed=>String(seed??'1').slice(0,64)||'1';
const CITY_KEYS=['id','name','region','population','probability','totalPopulation','features'];
const RATE_METRIC='mean-crude-birth-rate';
const RATE_KEYS=['id','name','region','metric','weight','probability','totalWeight','periodStart','periodEnd','observedYears','features'];
const birthKeys=city=>city?.metric===RATE_METRIC?RATE_KEYS:CITY_KEYS;
const rateNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function validRatePeriod(row){return Number.isInteger(row.periodStart)&&row.periodStart>=1945&&Number.isInteger(row.periodEnd)&&row.periodEnd>=row.periodStart&&Number.isInteger(row.observedYears)&&row.observedYears>0&&row.observedYears<=row.periodEnd-row.periodStart+1;}
function cityRows(data){
  if(!data||!Object.prototype.hasOwnProperty.call(data,'birthCities'))return null;
  if(!Array.isArray(data.birthCities)||!data.birthCities.length)throw new TypeError('출생도시 자료가 비어 있거나 올바른 배열이 아닙니다.');
  const metric=data.birthCitySource?.metric;
  if(metric!==undefined&&metric!==RATE_METRIC&&metric!=='population-share')throw new TypeError('확인되지 않은 출생지역 추첨 기준입니다.');
  const isRate=metric===RATE_METRIC,ids=new Set(),rows=[],regions=Array.isArray(data.regions)?new Set(data.regions):null;
  let total=0;
  for(const row of data.birthCities){
    if(!row||!['id','name','region'].every(key=>typeof row[key]==='string'&&row[key].trim()))throw new TypeError('출생도시 코드·이름·시도 자료가 올바르지 않습니다.');
    if(ids.has(row.id))throw new TypeError('출생도시 코드가 중복되었습니다.');
    ids.add(row.id);
    if(regions&&!regions.has(row.region))throw new TypeError('출생도시의 시도가 게임의 지역 목록과 일치하지 않습니다.');
    if(isRate?(!rateNumber(row.weight)||!validRatePeriod(row)):(!Number.isSafeInteger(row.population)||row.population<0))throw new TypeError('출생지역 가중치 또는 관측기간이 올바르지 않습니다.');
    if(row.sourceRegion!==undefined&&(typeof row.sourceRegion!=='string'||!row.sourceRegion.trim()))throw new TypeError('도시 원천 시도 이름이 올바르지 않습니다.');
    const features=row.features===undefined?[]:row.features;
    if(!Array.isArray(features)||!features.every(value=>typeof value==='string'))throw new TypeError('도시 특징은 문자열 배열이어야 합니다.');
    const weight=isRate?row.weight:row.population;
    total+=weight;
    if(!Number.isFinite(total)||total>Number.MAX_SAFE_INTEGER||(!isRate&&!Number.isSafeInteger(total)))throw new TypeError('출생지역 가중치 합계가 안전한 범위를 넘었습니다.');
    if(weight>0)rows.push({id:row.id,name:row.name,region:row.region,...(isRate?{metric:RATE_METRIC,weight,periodStart:row.periodStart,periodEnd:row.periodEnd,observedYears:row.observedYears}:{population:weight}),features:[...features],...(row.sourceRegion!==undefined?{sourceRegion:row.sourceRegion}:{})});
  }
  if(!total)throw new TypeError('추첨 가능한 출생도시 인구가 없습니다.');
  rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  total=rows.reduce((sum,row)=>sum+(isRate?row.weight:row.population),0);
  return{rows,total,isRate};
}
export function drawBirthCity(seed,data){
  const available=cityRows(data);if(!available)return null;
  const{rows,total,isRate}=available;let point=random(`birth-city|${cleanLifeSeed(seed)}`)()*total,chosen=rows.at(-1);
  for(const row of rows){point-=isRate?row.weight:row.population;if(point<0){chosen=row;break;}}
  return{id:chosen.id,name:chosen.name,region:chosen.region,...(isRate?{metric:RATE_METRIC,weight:chosen.weight,totalWeight:total,periodStart:chosen.periodStart,periodEnd:chosen.periodEnd,observedYears:chosen.observedYears}:{population:chosen.population,totalPopulation:total}),probability:(isRate?chosen.weight:chosen.population)/total,features:[...chosen.features],...(chosen.sourceRegion!==undefined?{sourceRegion:chosen.sourceRegion}:{})};
}
function sameBirthCity(a,b){
  if(a===null||b===null)return a===b;
  const hasSource=Object.prototype.hasOwnProperty.call(b||{},'sourceRegion'),keys=birthKeys(b);
  return!!a&&!!b&&!Array.isArray(a)&&Object.keys(a).length===keys.length+(hasSource?1:0)&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key))&&Object.prototype.hasOwnProperty.call(a,'sourceRegion')===hasSource&&(!hasSource||a.sourceRegion===b.sourceRegion)&&keys.filter(key=>key!=='features').every(key=>a[key]===b[key])&&Array.isArray(a.features)&&a.features.length===b.features.length&&a.features.every((value,index)=>value===b.features[index]);
}
function cityFingerprint(seed,city){
  // Local snapshot damage detection only; this is not a server signature.
  const value=JSON.stringify([cleanLifeSeed(seed),...birthKeys(city).map(key=>city[key]),...(Object.prototype.hasOwnProperty.call(city,'sourceRegion')?['sourceRegion',city.sourceRegion]:[])]);let hash=2166136261;
  for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
  return`birth-city-v1-${(hash>>>0).toString(16).padStart(8,'0')}`;
}
function validBirthCity(city){
  const hasSource=!!city&&Object.prototype.hasOwnProperty.call(city,'sourceRegion'),keys=birthKeys(city),isRate=city?.metric===RATE_METRIC;
  return!!city&&!Array.isArray(city)&&Object.keys(city).length===keys.length+(hasSource?1:0)&&keys.every(key=>Object.prototype.hasOwnProperty.call(city,key))&&(!hasSource||(typeof city.sourceRegion==='string'&&!!city.sourceRegion.trim()))&&['id','name','region'].every(key=>typeof city[key]==='string'&&city[key].trim())&&(isRate?(rateNumber(city.weight)&&city.weight>0&&rateNumber(city.totalWeight)&&city.totalWeight>=city.weight&&validRatePeriod(city)&&city.probability===city.weight/city.totalWeight):(Number.isSafeInteger(city.population)&&city.population>0&&Number.isSafeInteger(city.totalPopulation)&&city.totalPopulation>=city.population&&city.probability===city.population/city.totalPopulation))&&typeof city.probability==='number'&&Array.isArray(city.features)&&city.features.every(value=>typeof value==='string');
}
export const decisions=Object.freeze([
{id:'school-ready',age:6,chapter:'학교를 기다리며',title:'처음 만날 교실을 생각한다',text:'입학을 준비하며 좋아하는 습관 하나를 고른다. 이후에도 매달 자라고 배운다.'},
{id:'school-path',age:15,chapter:'나를 알아가는 시간',title:'어떤 배움을 이어갈까',text:'진로 준비의 방향을 정한다. 배움과 경험은 다음 일자리와 일상에 계속 영향을 준다.'},
{id:'education',age:19,chapter:'내가 고른 방향',title:'학교와 현장 사이에서',text:'공개된 연간 등록금을 참고하되 입학·4년 학업은 가상 경로다. 등록금은 재학 중 매월 나누어 내고 학교 지역으로 이동한다.'},
{id:'service',age:21,chapter:'잠시 다른 시간',title:'지금의 시간을 어디에 쓸까',text:'복무 경로는 대상이라는 가정으로 선택한다. 공개 복무개월을 적용하며 복무 중 학업·등록금·기존 근로소득은 잠시 멈춘다.'},
{id:'first-job',age:25,chapter:'첫 번째 명함',title:'어떤 일을 시작할까',text:'537개 직업 목록에서 게임 학위·준비 증표·능력·가상 공고 근무지역을 확인해 지원한다. 미확인 법적 제약은 별도로 안내하며 실제 채용 합격을 뜻하지 않는다. 취업 준비를 이어가도 된다.'},
{id:'residence',age:29,chapter:'퇴근하고 돌아갈 곳',title:'어느 지역에서 살아갈까',text:'실제 지역을 고르되 이사비·주거비는 가상 예산이다. 이사는 현재 거주지와 매월 지출을 바꾼다. 보증금·집값은 계산하지 않는다.'},
{id:'relationships',age:33,chapter:'함께라는 말',title:'내 곁의 사람들에게 시간을 쓴다',text:'가까운 사람·친구·혼자만의 생활 중 원하는 교류를 고른다. 교제·결혼·자녀 계획은 가족·양육 화면에서 별도로 선택한다.'},
{id:'sustainable-work',age:38,chapter:'오래 갈 수 있는 일상',title:'일과 몸이 보내는 신호',text:'소득을 넓히거나 건강과 공부에 시간을 쓸 수 있다. 선택한 습관은 그날과 이후 월별 변화에 함께 반영된다.'},
{id:'unexpected-cost',age:45,chapter:'예상 밖의 하루',title:'생활을 다시 정리해야 한다',text:'수리와 생활 정비가 필요한 가상 사건이다. 비용은 선택할 때 한 번만 처리한다. 가까운 사람과 나누거나 거주지를 바꿀 수 있다.'},
{id:'care',age:54,chapter:'서로의 일상을 돌보며',title:'돌봄과 나의 생활을 함께 생각한다',text:'가까운 사람을 돕는 5년짜리 가상 상황이다. 지원 방식에 따라 매월 비용과 관계·건강의 부담이 달라진다.'},
{id:'later-work',age:60,chapter:'새로운 속도',title:'다음 일의 속도를 고른다',text:'현재 일을 줄이거나 새로운 기술을 배우고 휴식을 늘릴 수 있다. 법정 정년·연금 수급액을 예측하지 않는다.'},
{id:'retirement',age:66,chapter:'길어진 오후',title:'일과 여가의 비중을 바꾼다',text:'가상 노후 모드로 전환한다. 가벼운 일 외에는 근로소득이 멈추고 자금을 나누어 쓴다. 실제 연금·세금 계산은 포함하지 않는다.'},
{id:'late-life',age:73,chapter:'남아 있는 계절',title:'오늘의 작은 즐거움을 고른다',text:'이 선택 뒤에도 일상은 매달 이어진다. 80세는 게임의 기록 종료 시점이며 사망이나 실제 수명을 뜻하지 않는다.'}
].map(e=>Object.freeze(e)));
const serviceSkipReason=s=>s.academy?'academy':protagonistGender(s)==='여성'?'female':null;
function finishAutomaticService(s){
 const event=decisions[s.decisionIndex],reason=serviceSkipReason(s);
 if(event?.id!=='service'||s.totalMonths!==event.age*12||!reason)return false;
 const title=reason==='academy'?'사관학교의 장교 준비를 이어간다':'학업과 일상을 이어간다',changes=reason==='academy'?['사관학교 학업 계속','병사 복무·적금 추가 없음']:['학업·일상 계속','병사 복무 없음'];
 s.history.push({id:'choice-service',eventId:'service',age:s.age,month:s.month,title:event.title,choice:title,label:title,changes:[...changes],cash:round(s.cash),debt:round(s.debt),automatic:true,automaticReason:reason});
 s.decisionIndex++;s.step=s.decisionIndex;s.pendingDecision=null;s.phase='running';
 log(s,'military-path',title,'',changes);return true;
}
/** Resolve an old waiting record without undoing an already active service term. */
export function normalizeMilitaryPath(original){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');
 return normalizeMilitaryDraft(clone(original));
}
function normalizeMilitaryDraft(s){if(s.employment&&s.phase!=='ended')s.employment=employmentState(s);if(s.phase==='decision'&&s.pendingDecision==='service'&&!s.service.active)finishAutomaticService(s);return s;}
export function nextDecision(s){if(!s||s.phase==='ended')return null;let event=s.pendingDecision?educationEvent(s.pendingDecision)||decisions.find(e=>e.id===s.pendingDecision)||null:decisions[s.decisionIndex]||null;if(!s.pendingDecision&&event?.id==='service'&&serviceSkipReason(s))event=decisions[s.decisionIndex+1]||null;if(event?.id==='first-job'&&s.remedies){const model=careerMilestone(s);return{...event,title:model.title,text:model.text};}return s.schoolJourney&&event?.id==='education'?{...event,title:'대학의 지역과 전공을 선택해 지원한다',text:'국공립·사립, 서울·서울 외 지역, 전공을 고르고 배움 점수에 따른 게임 입학 심사를 받는다. 실제 대학·학과의 합격확률이나 면허 취득을 뜻하지 않는다. 불합격하면 하향 지원하거나 다음 해 준비를 선택할 수 있다.'}:s.mortality&&event?.id==='late-life'?{...event,text:`이 선택 뒤에도 일상은 매달 이어집니다. 매 나이의 사망확률 추첨을 거쳐, 살아 있다면 ${s.mortality.capLabel}까지 이야기를 이어갑니다.`}:event;}
function log(s,type,title,text,changes=[],metadata={}){appendLifeEvent(s,{...metadata,id:`${type}-${s.totalMonths}-${s.logSerial}`,age:s.age,month:s.month,type,title,text,changes:changes.map(String)});s.logSerial++;}
function mortalityAtAge(s){
  if(!s.mortality||s.mortality.lastAgeChecked===s.age)return false;
  const m=s.mortality,q=annualDeathProbability(m,s.age);m.lastAgeChecked=s.age;
  const draw=random(`mortality|${s.seed}|${m.modelVersion}|${s.age}`)();
  if(draw>=q)return false;
  s.phase='ended';if(s.lifeHealth?.careEnabledAtMonth!==undefined)s.lifeHealth.pendingCare=null;s.pendingDecision=null;s.ending={type:'death',atMonth:s.totalMonths,age:s.age,annualProbability:q};settleServiceSavings(s,'death');
  log(s,'ending',`${s.age}세, 삶의 이야기를 마쳤다`,'나이대에 진입할 때 공개 생명표의 연간 확률 평균으로 추첨한 가상 결과입니다. 질병이나 구체적인 사망 원인을 판정하지 않습니다.',[`${s.age}세 ${s.month}개월`,'가상 사망 판정']);return true;
}
function ledger(start){return{yearStartMonth:start,months:0,income:0,expenses:0,tuition:0,interest:0,debtPaid:0,support:0};}
function rememberCareer(s){if(s.employment&&s.job?.occupationId&&s.job.careerModel)s.employment.jobHistory[s.job.occupationId]={months:s.job.experienceMonths,payScale:s.job.payScale};}
function job(s,title,status,income,occupationId){rememberCareer(s);if(s.academy?.status==='officer'&&title!==academyOfficerJob(s.academy.branch).title)s.academy.status='completed';s.salary=round(Math.max(0,income));s.job={title,status,income:s.salary,...(typeof occupationId==='string'?{occupationId}:{})};}
function careerOptions(options,data){
  if(!Array.isArray(data?.careerPaths))return options;
  return options.map((option,index)=>{const entry=data.careerPaths.find(row=>row.optionIndex===index);if(!entry)return option;if(!/^know-[0-9]{6}$/.test(entry.id)||typeof entry.name!=='string'||!entry.name.trim())throw new TypeError('직업 분류 연결이 올바르지 않습니다.');const model=data.occupationModels?.[entry.id];if(model){if(!validCareerModel(model))throw new TypeError('직업 모형 연결이 올바르지 않습니다.');const income=careerModelIncome(model,0);return[`${entry.name} 일을 시작한다`,`입직 연봉 ${formatMoney(income)} · 경력별 게임 추정 · 실제 자격 판정 없음`,{...option[2],income,jobTitle:entry.name,occupationId:entry.id,careerModel:clone(model)}];}return[`${entry.name} 일을 시작한다`,`${option[1]} · 가상 입직 경로, 실제 자격 판정 없음`,{...option[2],jobTitle:entry.name,occupationId:entry.id}];});
}
function cityFor(region){return({서울:'서울특별시',부산:'부산광역시',대구:'대구광역시',인천:'인천광역시',광주:'광주광역시',대전:'대전광역시',울산:'울산광역시',세종:'세종특별자치시'})[region]||`${region} 지역(도시 미기록)`;}
function move(s,region,housing){const home=['보호자 집','가족·지인과 동거'].includes(housing)&&s.profile?.birthCity?.region===region;s.residence={region,city:home?s.profile.birthCity.name:cityFor(region),housing};}
function metricChanges(a,b){return METRICS.filter(k=>round(b[k]-a[k])!==0).map(k=>`${LABELS[k]} ${b[k]-a[k]>=0?'+':''}${round(b[k]-a[k])}`);}
function cover(s){const precise=hasHouseholdSupport(s)||s.service?.active||s.service?.savings||s.service?.pay||s.formedFamily||s.market,q=precise?n=>Math.round(n*10000)/10000:round;if(s.cash<0){s.debt=q(s.debt-s.cash);s.cash=0;}s.cash=q(s.cash);s.debt=q(s.debt);}
function pay(s,amount){if(!amount)return;s.cash-=amount;if(amount>0)s.ledger.expenses=round(s.ledger.expenses+amount);else s.ledger.income=round(s.ledger.income-amount);cover(s);}
function schoolName(s){return s.schooling?.school?.name||'';}
function labels(s){
if(s.schooling?.status==='enrolled')s.education=`${schoolName(s)} ${s.service.active?'휴학 중':'재학 중'}`;
else if(s.schooling?.status==='graduated')s.education=`대학 졸업 · ${schoolName(s)}`;
else if(s.paths.studyTrack==='technical'&&s.age>=19)s.education='고교 졸업 · 현장 기술 학습';
else if(s.age<7)s.education='미취학 · 입학 준비';else if(s.age<13)s.education='초등학교 재학';else if(s.age<16)s.education='중학교 재학';else if(s.age<19)s.education=s.paths.studyTrack==='technical'?'직업계 고교 경로':s.paths.studyTrack==='creative'?'고교 · 창작 활동':'일반계 고교 경로';else s.education='고교 졸업';
if(s.employment&&s.schooling?.status!=='enrolled'&&s.employment.educationLevel>=3&&s.employment.educationLevel> (s.schooling?.status==='graduated'?4:s.age>=19?3:0))s.education=`가상 학위 경로 · ${employmentProfile(s).educationLabel} 이수`;
if(s.schoolJourney&&(!s.employment?.educationLevel||s.schooling?.status==='enrolled'||s.schoolJourney.current))s.education=schoolJourneyLabel(s);
s.relationship=s.paths.relationship==='partner'?'가까운 사람과 생활 의논':s.paths.relationship==='friends'?'친구들과 교류':s.paths.relationship==='solo'?'혼자만의 생활과 교류':s.age<19?'보호자와 함께':'가까운 사람들과 교류';
const partner=s.formedFamily?.spouse,relation=s.formedFamily?.relationshipStatus;if(relation==='dating')s.relationship=`${partner.name}님과 교제 중`;else if(relation==='married')s.relationship=`${partner.name}님과 결혼 생활`;else if(relation==='separated')s.relationship='이별 후의 일상';else if(relation==='widowed'||relation==='bereaved')s.relationship='사별 후의 일상';
s.status=[s.age<7?'영유아기':s.age<19?'성장기':s.retired?'노후 생활':'성인 생활',s.education,s.relationship];
if(s.formedFamily?.children?.length)s.status.push(`자녀 ${s.formedFamily.children.length}명`);
if(s.familyEstate?.closed){if(s.residence.housing==='보호자 집')s.residence.housing='유산 정산 후 생활';if(s.age<19){s.relationship='보호자 부재 · 생활을 이어가는 중';s.status[2]=s.relationship;}s.status.push('부모·보호자를 기억하며');}
if(s.service.active)s.status.push(`${s.service.branch} 복무 중 · ${s.service.remainingMonths}개월 남음`);if(s.academy?.status==='cadet')s.status.push('사관생도 · 학비·숙식 지원');if(s.academy?.status==='officer')s.status.push(`${academyOfficerJob(s.academy.branch).branchLabel} 장교 경로`);if(s.care.remainingMonths>0)s.status.push('가까운 사람 돌봄');if(s.health<45)s.status.push('건강 회복 관리');else if(s.health<60)s.status.push('건강을 살피는 중');if(s.debt>0)s.status.push('가상 차입금 상환 중');s.job.income=s.salary;
}
function pickSchool(data,type,rng){const rows=(data?.tuition||[]).filter(x=>x?.type===type&&typeof x.name==='string'&&Number.isFinite(x.annual)&&x.annual>0);if(!rows.length)throw new TypeError(`등록금 자료가 없습니다: ${type}`);return clone(rows[Math.floor(rng()*rows.length)]);}
export function createLife(seed,data,name='한 사람',options={}){
const cleanSeed=cleanLifeSeed(seed),rng=random(cleanSeed),rows=(data?.birthRegions||[]).filter(x=>typeof x?.name==='string'&&Number.isFinite(x.births)&&x.births>0);let region,birthRegionSource;
if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['birthCity','birthFamily'].includes(key)))throw new TypeError('삶의 시작 옵션이 올바르지 않습니다.');
const drawnCity=drawBirthCity(cleanSeed,data);
if(Object.prototype.hasOwnProperty.call(options,'birthCity')&&!sameBirthCity(options.birthCity,drawnCity))throw new TypeError('미리 추첨한 도시는 같은 삶의 번호와 공식 자료의 결과와 일치해야 합니다.');
if(drawnCity){region=drawnCity.region;birthRegionSource=drawnCity.metric===RATE_METRIC?'공개 연간 조출생률의 관측기간 단순평균을 가중치로 사용한 가상 출생지역':'이전 버전의 공개 주민등록인구 비중을 사용한 가상 출생도시';}else if(rows.length){let point=rng()*rows.reduce((n,x)=>n+x.births,0);region=rows.at(-1).name;for(const x of rows){point-=x.births;if(point<0){region=x.name;break;}}birthRegionSource='공개 출생아 수의 지역 비중';}else{const regions=data?.regions?.filter(x=>typeof x==='string'&&x)||['서울'];region=regions[Math.floor(rng()*regions.length)]||'서울';birthRegionSource='지역 비중 자료가 없어 균등 추첨한 가상 설정';}
const backgrounds=['차분한 일상이 있는','서로 기대며 살아가는','새로운 기회를 찾는'];
const s={version:VERSION,seed:cleanSeed,name:Array.from(String(name).trim()||'한 사람').slice(0,16).join(''),dataVersion:String(data?.version||''),age:0,month:0,totalMonths:0,phase:'running',pendingDecision:null,decisionIndex:0,step:0,focus:'balance',cash:[1200,400,2400][Math.floor(rng()*3)],debt:0,health:75,learn:35,bond:50,joy:55,salary:0,saving:.18,skill:0,retired:false,careerMonths:0,job:{title:'아직 일을 하지 않음',status:'미취업',income:0},residence:{region,city:cityFor(region),housing:'보호자 집'},education:'미취학 · 입학 준비',relationship:'보호자와 함께',status:[],tags:[],history:[],timeline:[],logSerial:0,profile:{region,birthRegion:region,birthRegionSource,background:backgrounds[Math.floor(rng()*backgrounds.length)],publicSchool:pickSchool(data,'국공립',rng),privateSchool:pickSchool(data,'사립',rng)},paths:{habit:'balance',studyTrack:'general',relationship:'family',wellness:'balance'},schooling:null,service:{active:false,branch:null,remainingMonths:0,previousJob:null},care:{remainingMonths:0,annualCost:0,mode:null},ledger:ledger(0),lastYearLedger:null,legacyHistory:[],legacySkippedDecisions:0,migration:null,rules:{moneyUnit:'만원',tuition:'실제 연간 등록금÷12를 재학한 학업개월마다 지급; 48개월 학업 가정, 복무 중 납부·학업 정지',incomeCosts:RULE_NOTE,familyBudget:'19세 전 생활비는 보호자 지원으로 상쇄하는 가상 가계 예산',city:drawnCity?.metric===RATE_METRIC?'공식 지역별 연간 조출생률의 관측기간 단순평균을 가중치로 추첨한다. 실제 출생아 지역 분포 확률과는 다르다. 이전 출생기록은 재추첨하지 않는다.':'이전 인구 기준 출생기록. 도시가 없는 이전 기록에는 도시를 추정해 채우지 않는다.',ending:'80세는 기록 종료 시점. 사망확률·개인 기대수명 계산 없음'}};
s.profile.gender=protagonistGender(s);
if(Object.hasOwn(options,'birthFamily')&&(!data.familyRules||!drawnCity||!validBirthFamily(options.birthFamily,cleanSeed,drawnCity.id)))throw new TypeError('출생 가족 기록이 일치하지 않습니다.');
if(data.familyRules&&drawnCity){s.profile.birthFamily=options.birthFamily?clone(options.birthFamily):generateBirthFamily(cleanSeed,drawnCity,data);s.profile.background=s.profile.birthFamily.label;s.rules.birthFamily='출생 당시의 가상 가족 배경. 부모·가구 자산은 아이의 현금·부채와 별도이며 성장 수치·사망확률에 가산하지 않음.';}
if(data.householdRules&&s.profile.birthFamily)s.householdFinance=createHouseholdFinance(s,data.householdRules);
if(data.parentRules&&s.householdFinance)s.familyLife=createParentLife(s,data);
if(data.estateRules&&s.familyLife)s.familyEstate=createFamilyEstate(s,data.estateRules,data.mortality);
if(data?.lifeHealthEvents===true)s.lifeHealth=createLifeHealth(s);
const schoolJourney=createSchoolJourney(data);if(schoolJourney)s.schoolJourney=schoolJourney;
if(drawnCity){s.profile.birthCity=clone(drawnCity);s.profile.birthCityFingerprint=cityFingerprint(cleanSeed,drawnCity);s.profile.birthCitySource=clone(data.birthCitySource??null);s.residence.city=drawnCity.name;}
if(data?.marketScenarios)s.market=createMarket(s,data.marketScenarios);
if(data?.economicRules&&s.market)s.economicLife=createEconomicLife(s,data.economicRules);
s.formedFamily=ensureFormedFamily(s,data);labels(s);log(s,'birth',`${drawnCity?drawnCity.name:region}에서 삶을 시작했다`,`${s.name}의 일상이 시작되었다. 출생지역은 ${birthRegionSource}, 가구 배경과 초기 여유자금은 가상 설정이다.${s.profile.birthFamily?' '+familySummary(s.profile.birthFamily):''}`,['0세 0개월',RULE_NOTE]);if(data.mortality){s.mortality=mortalitySnapshot(data.mortality,s.seed);s.rules.ending='매 나이 진입 시 국내 생명표 연령대 평균으로 가상 사망 추첨. 최대 120세는 사용자 설정 게임 상한이며 사망과 구분. 100~119세는 95~99세 평균 유지 가정.';mortalityAtAge(s);}const created=data?.remedyRules===true?enableRemedies(s,data):s,continued=data?.continuityRules===true?enableContinuity(created,data):created;return data?.refinementsRules===true?enableRefinements(continued,data):continued;
}
export function choicesFor(s,data){
if(!s||s.phase!=='decision'||!s.pendingDecision)return[];const event=nextDecision(s);if(!event)return[];if(educationEvent(event.id))return schoolChoices(s,data).map(row=>[row.label,`${row.durationMonths}개월 · 연 게임학비 ${row.annualTuitionWan}만원 · ${row.guaranteed?'기본 배정 경로':`게임 합격확률 ${Math.round(row.admissionChance*100)}%`}`,{schoolOptionId:row.id}]);
switch(event.id){
case'school-ready':return[['먼저 친구에게 인사한다','관계 +7 · 이후 교류 습관',{bond:7,joy:3,habit:'friends'}],['책 읽는 습관을 만든다','배움 +8 · 이후 공부 습관',{learn:8,joy:2,habit:'study'}],['몸을 움직이며 논다','건강 +7 · 이후 운동 습관',{health:7,joy:3,habit:'sports'}]];
case'school-path':return[['진학 공부를 준비한다','배움 +9 · 일반계 고교 경로',{learn:9,joy:-2,studyTrack:'general'}],['직업 기술을 배워본다','기술 +1 · 직업계 고교 경로',{learn:5,skill:1,studyTrack:'technical'}],['창작과 협업을 경험한다','배움·관계 +5 · 창작 활동',{learn:5,bond:5,joy:4,studyTrack:'creative'}]];
case'education':if(s.schoolJourney)return [['대학 지원을 다음 해에 준비한다','이번 입학 선택을 마치고 일상으로 돌아간다. 다음 나이부터 다시 지원할 수 있다.',{action:'defer-university'}]];return['public','private'].map((kind,i)=>{const school=s.profile[i?'privateSchool':'publicSchool'];return[i?'사립대 진학':'국공립대 진학',`${school.name} · ${school.region||s.profile.region} 지역으로 이동 · 연 ${Math.round(school.annual/10000)}만원을 월납(4년 가정)`,{action:'college',kind,learn:8,tag:i?'사립대 경로':'국공립대 경로'}];}).concat([['기술을 익히며 일한다','가상 교육비 300만원 · 현장 연소득 1,800만원 가정',{action:'apprentice',learn:5,skill:1,cost:300,tag:'기술과 현장 경로'}]]);
case'service':{if(s.continuity&&!serviceSkipReason(s)&&serviceReadiness(s).recoveryBlocked)return [['회복과 학업을 이어가며 복무를 미룬다','대학 재학 기간을 제외하고 최대 24개월 유예할 수 있다.',{action:'service-defer'}]];if(!serviceSkipReason(s)&&serviceReadiness(s).recoveryBlocked)return [['회복을 마친 뒤 입대를 검토한다','회복 동안 현재 일상을 이어가고, 회복 후 복무를 다시 선택한다.',{action:'service-defer-recovery'}],['현재의 학업과 일을 이어간다','입대하지 않고 현재 일상을 이어간다.',{action:'service-skip'}]];if(serviceSkipReason(s))return[['학업과 일상을 이어간다','병사 복무 없이 현재의 시간을 이어간다.',{action:'service-skip'}]];const service=data?.service||{};return[['army','육군',18],['navy','해군',20],['airforce','공군',21]].map(([key,label,fallback])=>{const months=Number.isInteger(service[key])&&service[key]>0&&service[key]<=36?service[key]:fallback;return[`${label} 복무 경로`,`${months}개월 · 대상이라는 가정, 복무 중 휴학·기존 소득 정지`,{action:'service',branch:label,months,bond:4,learn:2,tag:`${label} ${months}개월`}];}).concat(s.continuity?[['복무 시기를 미룬다','대학 재학 기간을 제외하고 최대 24개월 안에 복무를 선택한다.',{action:'service-defer'}]]:[['학업·일 경험을 이어간다','복무하지 않는 가상 경로 · 현재 학업과 근로 계속',{learn:5,joy:3,tag:'다른 경험의 시간'}]]);}
case'first-job':if(s.remedies&&careerMilestone(s)?.kind!=='seeking')return careerMilestone(s).actions.filter(a=>a.intent==='complete-milestone').map(a=>[a.label,careerMilestone(s).text,{action:'career-milestone',milestoneAction:a.id}]);if(Array.isArray(data?.occupations)&&data.occupations.length)return [['취업 준비하며 다음 달로','537개 직업의 지원 조건을 확인하고 이후에도 지원할 수 있다.',{action:'defer-employment'}]];return careerOptions([['사무·운영 일을 시작한다','가상 연소득 3,200만원부터 · 학업·기술 경험 일부 반영',{action:'job',jobTitle:'사무·운영직',jobStatus:'재직',income:3200,joy:2}],['기술을 살리는 일을 시작한다','가상 연소득 3,500만원부터 · 기술 경험 반영',{action:'job',jobTitle:'기술·설비직',jobStatus:'재직',income:3500,learn:3}],['프로젝트 계약 일을 시작한다','가상 연소득 2,900만원부터 · 협업 활동',{action:'job',jobTitle:'프로젝트 계약직',jobStatus:'계약직',income:2900,bond:4,joy:6}]],data);
case'residence':return[['서울에서 독립한다','서울특별시로 이동 · 가상 월 주거비 70만원 · 이사·가구비 300만원',{action:'move',region:'서울',housing:'월세 독립',cost:300,joy:5}],['부산에서 독립한다','부산광역시로 이동 · 가상 월 주거비 50만원 · 이사·가구비 240만원',{action:'move',region:'부산',housing:'월세 독립',cost:240,joy:5}],[`출생지역 ${s.profile.region}에서 함께 산다`,'가족·지인과 동거 · 가상 월 분담 15만원 · 생활 정비비 100만원',{action:'move',region:s.profile.region,housing:'가족·지인과 동거',cost:100,bond:5,saving:.05}]];
case'relationships':return[['가까운 사람과 생활을 의논한다','관계 +9 · 만족 +4 · 일회 비용 100만원 · 교제·결혼과 별도',{relationship:'partner',bond:9,joy:4,cost:100,tag:'가까운 사람과 의논'}],['친구들과 자주 안부를 나눈다','관계 +8 · 이후 친구들과 교류',{relationship:'friends',bond:8,joy:5,tag:'오랜 친구'}],['나만의 리듬을 지킨다','만족 +9 · 독립적인 생활과 교류',{relationship:'solo',joy:9,learn:3,tag:'나만의 리듬'}]];
case'sustainable-work':return[['역할을 넓히고 승진에 도전한다','현재 연소득 +18% · 건강 -5 · 이후 일 중심',{salaryRate:.18,health:-5,wellness:'career',tag:'경험을 넓힌 사람'}],['운동과 휴식을 일정에 넣는다','건강 +10 · 이후 회복 습관',{health:10,joy:4,wellness:'exercise',tag:'지속하는 운동'}],['새로운 공부를 시작한다','배움 +12 · 가상 비용 200만원 · 이후 학습 습관',{learn:12,cost:200,wellness:'learning',skill:1,tag:'평생 배우는 사람'}]];
case'unexpected-cost':return[['예비 자금으로 수리한다','가상 비용 300만원 · 만족 +3',{cost:300,joy:3}],['가까운 사람과 해결책을 나눈다','가상 비용 220만원 · 관계 +6',{cost:220,bond:6}],[`${s.profile.region}의 함께 사는 집으로 옮긴다`,'가상 이사·정비비 450만원 · 이후 동거 주거비',{action:'move',region:s.profile.region,housing:'가족·지인과 동거',cost:450,bond:3,saving:.03}]];
case'care':return[['직접 시간을 내어 돌본다','5년간 가상 월 30만원 · 관계 +8 · 건강 -3',{action:'care',mode:'direct',annualCost:360,bond:8,health:-3}],['지원과 역할을 함께 나눈다','5년간 가상 월 20만원 · 배움·관계 +5',{action:'care',mode:'shared',annualCost:240,bond:5,learn:5}],['내 생활도 지키며 오래 돕는다','5년간 가상 월 15만원 · 건강 +5 · 관계 +3',{action:'care',mode:'balanced',annualCost:180,health:5,bond:3}]];
case'later-work':return[['일을 줄이고 계속한다','현재 연소득 70% · 시간제 근무로 전환',{action:'later-work',salaryRate:-.3,joy:6}],['다음 일을 위한 기술을 배운다','현재 연소득 85% · 가상 비용 150만원 · 기술 +1',{action:'later-work',salaryRate:-.15,cost:150,learn:8,skill:1,wellness:'learning'}],['휴식과 관계에 무게를 둔다','현재 연소득 50% · 시간제 근무 · 건강·관계 +5',{action:'later-work',salaryRate:-.5,health:5,bond:5,joy:8}]];
case'retirement':return[['가벼운 일을 이어간다','시간제 일 · 가상 연소득 1,000만원',{action:'retirement',income:1000,joy:3,tag:'가벼운 일과 함께'}],['동네 활동에 참여한다','근로소득 종료 · 이후 지역 교류',{action:'retirement',income:0,bond:9,joy:6,relationship:'friends',tag:'동네에서 만난 사람들'}],['운동과 산책을 습관으로 만든다','근로소득 종료 · 건강 +9 · 이후 운동 습관',{action:'retirement',income:0,health:9,joy:5,wellness:'exercise',tag:'걷는 일상'}]];
case'late-life':return[['보고 싶은 사람을 만난다','관계 +7 · 만족 +5',{bond:7,joy:5,relationship:'friends'}],['사진과 이야기를 기록한다','배움 +5 · 만족 +7',{learn:5,joy:7,tag:'이야기를 남긴 사람'}],['처음 가보는 길을 걸어본다','가상 여가비 80만원 · 건강·만족 +5',{health:5,joy:5,cost:80,wellness:'exercise'}]];
default:return[];}}
function basicLivingAnnual(s){return s.service.active||academySupportActive(s)?0:s.age<7?480:s.age<19?720:s.retired?840:900;}
function housingAnnual(s){if(s.service.active||academySupportActive(s))return 0;if(s.age<19||s.residence.housing==='보호자 집')return s.age<19?0:180;let n=s.residence.housing==='기숙사'?360:s.residence.housing==='가족·지인과 동거'?180:s.residence.region==='서울'?840:s.residence.region==='부산'?600:480;if(s.paths.relationship==='partner')n*=.8;return n;}
export function livingCostSummary(s){const q=n=>Math.round(n*10000)/10000,basicLivingWan=economicCostWan(s,basicLivingAnnual(s)/12),housingWan=economicCostWan(s,housingAnnual(s)/12);return{militaryProvided:!!s.service.active,academyProvided:academySupportActive(s),basicLivingWan,housingWan,totalWan:q(basicLivingWan+housingWan)};}
function householdMoneyMonth(s,data,militaryNetWan=0){
 const q=n=>Math.round((n+Number.EPSILON)*10000)/10000,income=q(monthlyWorkIncomeWan(s)),living=s.economicLife?livingCostSummary(s).totalWan:q(basicLivingAnnual(s)/12+housingAnnual(s)/12),discretionary=q(monthlyAutomaticConsumptionWan(s)),care=q(s.care.remainingMonths>0?s.care.annualCost/12:0),interest=q(s.debt*PERSONAL_DEBT_ANNUAL_RATE/12),hobbyCost=activeHobbyCost(s,data?.hobbyCatalog);
 let tuition=q(s.schooling?.status==='enrolled'&&!s.service.active&&!s.schooling.fundingPaused&&recoveryStudyAllowed(s)?s.schooling.annualTuitionWan/12:schoolTuitionMonth(s));
 const result=settleHouseholdMonth(s,{livingWan:living,tuitionWan:tuition,hobbyWan:hobbyCost,personalIncomeWan:income,otherPersonalCostWan:q(discretionary+care+interest+formedFamilyMonthlyBurden(s))});s.householdFinance=result.finance;
 if(!result.tuitionFunded&&tuition>0){
   if(s.schoolJourney?.current){const current=s.schoolJourney.current,free=data?.educationOptions?.schoolOptions.find(r=>r.stage===current.stage&&r.guaranteed&&r.ownership==='public'&&r.annualTuitionWan===0);if(!free)throw new Error('가구 예산에 맞는 무료 학교 경로가 없습니다.');Object.assign(current,{optionId:free.id,name:free.name,ownership:free.ownership,schoolType:free.schoolType,annualTuitionWan:0,annualLearningBonus:free.annualLearningBonus});log(s,'household-school','가구 예산에 맞는 국공립 경로로 옮겼다','유료 학비를 마련하지 못해 같은 학년·이수개월을 유지하는 무료 경로로 조정했습니다. 이번 달 유료 학비나 아동 차입금은 발생하지 않습니다.',['학비 0원 경로','이수개월 보존']);}
   else if(s.schooling?.status==='enrolled'){s.schooling.fundingPaused=true;if(s.job.status==='재학')job(s,'학비 마련을 준비하는 중','미취업',0);log(s,'household-school','학비를 준비하며 대학 학업을 잠시 멈췄다','이번 달 학비를 마련하지 못해 수업료·학업 진행을 멈췄습니다. 취업으로 자금을 마련한 뒤 학교·대학 지원 화면에서 복학할 수 있습니다.',['학비 준비 휴학','추가 학비 차입 없음']);}
   tuition=0;
 }
 const expense=q(living+discretionary+tuition+care),surplus=q(income+militaryNetWan+result.supportWan-expense-interest),repayment=q(surplus>0?Math.min(s.debt,Math.max(0,surplus-hobbyCost-formedFamilyMonthlyBurden(s))*.6):0);s.cash=q(s.cash+surplus-repayment-militaryNetWan);s.debt=q(s.debt-repayment);cover(s);
 for(const[k,v]of Object.entries({income:income+result.supportWan,expenses:expense,tuition,interest,debtPaid:repayment,support:result.supportWan}))s.ledger[k]=q(s.ledger[k]+v);s.ledger.months++;
 return{workIncomeWan:income,livingWan:living,automaticWan:discretionary,tuitionWan:tuition,careWan:care,interestWan:interest,debtPaidWan:repayment,supportWan:result.supportWan};
}
function moneyMonth(s,data,militaryNetWan=0){if(hasHouseholdSupport(s))return householdMoneyMonth(s,data,militaryNetWan);const precise=s.service.active||s.service.pay||s.service.savings||s.formedFamily?.spouse||s.formedFamily?.children?.length||s.market||s.economicLife,q=precise?n=>Math.round(n*10000)/10000:round,c=precise?q:n=>n,income=c(monthlyWorkIncomeWan(s)),living=c(s.economicLife?livingCostSummary(s).basicLivingWan:basicLivingAnnual(s)/12),discretionary=c(monthlyAutomaticConsumptionWan(s)),tuition=c(s.schooling?.status==='enrolled'&&!s.service.active&&!s.schooling.fundingPaused&&recoveryStudyAllowed(s)?s.schooling.annualTuitionWan/12:schoolTuitionMonth(s)),care=c(s.care.remainingMonths>0?s.care.annualCost/12:0),expense=c(living+(s.economicLife?livingCostSummary(s).housingWan:housingAnnual(s)/12)+discretionary+tuition+care),support=s.age<19?expense:0,interest=c(s.debt*PERSONAL_DEBT_ANNUAL_RATE/12),surplus=c(income+militaryNetWan+support-expense-interest),repayment=c(surplus>0?Math.min(s.debt,Math.max(0,surplus-formedFamilyMonthlyBurden(s)-(s.economicLife?activeHobbyCost(s,data?.hobbyCatalog):0))*.6):0);s.cash=q(s.cash+surplus-repayment-militaryNetWan);s.debt=q(s.debt-repayment);cover(s);for(const[k,v]of Object.entries({income:income+support,expenses:expense,tuition,interest,debtPaid:repayment,support}))s.ledger[k]=q(s.ledger[k]+v);s.ledger.months++;return{workIncomeWan:income,livingWan:c(living+(s.economicLife?livingCostSummary(s).housingWan:housingAnnual(s)/12)),automaticWan:discretionary,tuitionWan:tuition,careWan:care,interestWan:interest,debtPaidWan:repayment,supportWan:support};}
function formedFamilyMonth(s){
 if(!s.formedFamily)return null;
 const result=progressFormedFamily(s,s.totalMonths+1),q=n=>Math.round(n*10000)/10000,{personalCostWan,spouseContributionWan,childCostWan,personalInheritanceWan=0,personalFuneralWan=0}=result.settlement;
 s.formedFamily=result.formedFamily;s.cash=q(s.cash+personalInheritanceWan-personalFuneralWan-personalCostWan);cover(s);
 if(personalInheritanceWan)s.ledger.inheritance=q((s.ledger.inheritance||0)+personalInheritanceWan);
 if(personalFuneralWan)s.ledger.funeral=q((s.ledger.funeral||0)+personalFuneralWan);
 // Spousal contributions fund children directly. They appear in the ledger once,
 // while only the player's net share leaves personal cash.
 s.ledger.income=q(s.ledger.income+spouseContributionWan);s.ledger.expenses=q(s.ledger.expenses+childCostWan);
 s.ledger.familyContributions=q((s.ledger.familyContributions||0)+spouseContributionWan);s.ledger.childCosts=q((s.ledger.childCosts||0)+childCostWan);
 for(const key of METRICS)s[key]=clamp(s[key]+(result.effects?.[key]||0));
 return result;
}
function logFormedFamilyEvents(s,events=[]){for(const event of events)log(s,event.type==='spouse-estate'?'formed-family-estate':'formed-family',event.title,event.text||'',event.changes||[]);}
function logMarketSituation(s,result,impact){const{event,record}=result;if(event){const changes=[];if(impact){const{before,after}=impact,p=n=>`${Number((n*100).toFixed(3))}%`;if(before.livingWan!==after.livingWan)changes.push(`월 생활비 ${formatMoney(before.livingWan)} → ${formatMoney(after.livingWan)}`);if(before.annualSalaryWan!==after.annualSalaryWan)changes.push(`연봉 ${formatMoney(before.annualSalaryWan)} → ${formatMoney(economicAnnualSalaryWan(s))}`);changes.push(`채용 합격률 ${p(before.hiringProbability)} → ${p(after.hiringProbability)}`,`월 실직 위험 ${p(before.layoffProbability)} → ${p(after.layoffProbability)}`);}log(s,'market-news',`[${({domestic:'국내',global:'국외',mixed:'국내외'})[event.scope]}] ${event.title}`,event.summary||'',changes);}else if(impact&&impact.before.scope!=='neutral'&&(impact.before.hiringProbability!==impact.after.hiringProbability||impact.before.layoffProbability!==impact.after.layoffProbability)){const p=n=>`${Number((n*100).toFixed(3))}%`;log(s,'economic-impact','채용 여건이 평소 수준으로 돌아왔다','',[`채용 합격률 ${p(impact.before.hiringProbability)} → ${p(impact.after.hiringProbability)}`,`월 실직 위험 ${p(impact.before.layoffProbability)} → ${p(impact.after.layoffProbability)}`]);}const held=s.market.configSnapshot.products.filter(p=>s.market.holdings[p.id].units>0);if(held.length){const delta=Math.round(held.reduce((n,p)=>n+s.market.holdings[p.id].units*(record.prices[p.id]-record.openingPrices[p.id]),0)*10000)/10000;log(s,'market-valuation','보유 투자자산의 월 평가를 확인했다','',[`평가 증감 ${delta>=0?'+':''}${formatMoney(delta)}`,...held.map(p=>`${p.name} ${record.rates[p.id]>=0?'+':''}${(record.rates[p.id]*100).toFixed(2)}%`)]);}}
function logFormedFamilyMonth(s,result){
 logFormedFamilyEvents(s,result.events);const m=result.settlement;
 if(m.childCostWan>0)log(s,'formed-family-finance','가족과 양육의 한 달을 보냈다','',[
  `자녀 양육비 ${formatMoney(m.childCostWan)}`,`배우자 양육비 분담 ${formatMoney(m.spouseContributionWan)}`,`내 양육비 부담 ${formatMoney(m.personalCostWan)}`,
  ...(m.extraActivitiesPaused?['추가 유료 활동 보류 · 균형 양육 적용']:[]),...(m.shortfallWan>0?[`양육비 차입 ${formatMoney(m.shortfallWan)}`]:[])
 ]);
}
function habits(s,data){const studyAllowed=recoveryStudyAllowed(s),learn=s.focus==='learning'&&studyAllowed,health=s.focus==='health',social=s.focus==='relationships',career=s.focus==='career';s.health=clamp(s.health+((health?1.6:0)+(s.paths.habit==='sports'?.35:0)+(s.paths.wellness==='exercise'?1:0)-(s.age>=60?.9:s.age>=40?.4:.08)-(s.paths.wellness==='career'?.2:0)-(s.care.remainingMonths>0&&s.care.mode==='direct'?.35:0))/12);s.learn=clamp(s.learn+((s.age<19?1:s.schooling?.status==='enrolled'&&!s.service.active&&!s.schooling.fundingPaused&&studyAllowed?1.4:.08)+(learn?1.4:0)+(s.paths.habit==='study'&&studyAllowed?.3:0)+(s.paths.wellness==='learning'&&studyAllowed?.65:0))/12);s.bond=clamp(s.bond+((social?1.4:0)+(s.paths.relationship==='partner'||s.paths.relationship==='friends'?.35:.05)+(s.paths.habit==='friends'?.25:0)+(s.care.remainingMonths>0?.3:0)-(career?.15:0))/12);s.joy=clamp(s.joy+((s.focus==='balance'?.6:.2)+(s.paths.relationship==='solo'?.15:0)-(s.debt>s.cash+5000?.5:0))/12);if(WORKING.has(s.job.status)&&!s.service.active&&injuryImpact(s).workFactor>0&&employmentIncomeFactor(s)>0){s.careerMonths++;if(s.job.careerModel){s.job.experienceMonths++;s.job.payScale*=1+((career?.012:0)+(learn?.004:0)+Math.min(s.skill,5)*.001)/12;s.salary=careerModelIncome(s.job.careerModel,s.job.experienceMonths,s.job.payScale);}else s.salary=round(s.salary*(1+(.012+(career?.012:0)+(learn?.004:0)+Math.min(s.skill,5)*.001)/12));}for(const[k,v]of Object.entries(schoolMonthlyEffects(s,data)))s[k]=clamp(s[k]+v);s.job.income=s.salary;}
function settleServiceSavings(s,reason='maturity'){const payment=settleMilitarySavings(s,reason);if(!payment)return;s.service.savings=payment.savings;s.cash=payment.cash;for(const[k,v]of Object.entries({militaryPrincipalReturned:payment.principalWan,militaryMatching:payment.matchingWan,militaryInterest:payment.interestWan}))s.ledger[k]=Math.round(((s.ledger[k]||0)+v)*10000)/10000;log(s,'military-savings',reason==='maturity'?'전역 적금을 받았다':'복무 적금을 정산했다','',[`납입 원금 반환 ${formatMoney(payment.principalWan)}`,`정부 매칭 ${formatMoney(payment.matchingWan)}`,`적금 이자 ${formatMoney(payment.interestWan)}`,`소지금 수령 ${formatMoney(payment.payoutWan)}`]);}
function transitions(s,recovery=recoveryActivityPolicy(s)){if(s.service.active){s.service.remainingMonths--;if(!s.service.remainingMonths){s.service.active=false;settleServiceSavings(s);const j=s.service.previousJob;if(j){s.job=clone(j);s.salary=round(j.income||0);}else job(s,'다음 경험 준비','미취업',0);log(s,'milestone',`${s.service.branch} 복무를 마쳤다`,'정해진 복무개월이 지났다. 휴학 중이었다면 다음 달부터 학업과 월별 등록금을 다시 이어간다.',['복무 종료',s.schooling?.status==='enrolled'?'복학':'다음 일상으로']);}}else if(s.schooling?.status==='enrolled'&&!s.schooling.fundingPaused&&recovery.studyAllowed){s.schooling.progressMonths++;if(s.schooling.progressMonths>=s.schooling.durationMonths){s.schooling.status='graduated';if(s.continuity)s.degreeHistory=recordDegreeCompletion(s);if(s.schoolJourney){s.schoolJourney.highestLevel=4;if(s.schoolJourney.university)s.schoolJourney.university.status='graduated';}const dormExit=s.residence.housing==='기숙사';if(dormExit)s.residence.housing='월세 독립';if(s.academy?.status==='cadet'){const officer=academyOfficerJob(s.academy.branch);s.academy.status='officer';s.academy.graduatedMonth=s.totalMonths;s.residence.housing='장교 숙소';job(s,officer.title,officer.status,officer.income);log(s,'academy-commission',`${officer.branchLabel} 장교의 일상을 시작했다`,'사관학교 학업을 마치고 선택한 군의 장교 경로로 이어갑니다.',[officer.title,`기본 연봉 ${formatMoney(officer.income)}`,'병사 급여·적금 추가 없음']);}else if(s.job.status==='재학')job(s,'첫 일자리 준비','미취업',0);log(s,'milestone',`${schoolName(s)}의 학업을 마쳤다`,`${s.schooling.durationMonths}개월의 게임 학업을 마쳤다. 졸업·전공을 기록하고 월 등록금을 끝낸다. 실제 자격·면허는 자동 취득하지 않는다.`,['대학 졸업','월별 등록금 납부 종료',...(dormExit?['기숙사 퇴실·같은 지역 월세 생활']:[])]);}}else if(s.schooling?.status==='enrolled'&&!s.schooling.fundingPaused&&!recovery.studyAllowed&&s.academy?.status==='cadet'){s.academy.recoveryPausedMonths=(s.academy.recoveryPausedMonths||0)+1;}if(s.care.remainingMonths>0&&!--s.care.remainingMonths)log(s,'milestone','돌봄의 역할을 다시 나누었다','5년의 가상 돌봄 구간이 끝나 지원 방식과 일상을 조정했다. 사망이나 질병의 예측이 아니다.',['정기 돌봄비 종료']);}
function annual(s,{includeEvents=true}={}){const l=clone(s.ledger);l.endMonth=s.totalMonths;s.lastYearLedger=l;log(s,'annual',`${s.age}세의 일상에 도착했다`,`${s.residence.city}에서 일상을 이어갔다. 현재 활동: ${s.job.title}. 월별 처리한 12개월의 가상 예산을 정리한다.`,[`근로수입 ${formatMoney(l.income-l.support-(l.familyContributions||0))}`,`보호자지원 ${formatMoney(l.support)}`,...(l.familyContributions?[`배우자 양육비 분담 ${formatMoney(l.familyContributions)}`]:[]),...(l.childCosts?[`자녀 양육비(지출에 포함) ${formatMoney(l.childCosts)}`]:[]),...(l.militaryIncome?[`군급여 ${formatMoney(l.militaryIncome)}`]:[]),`생활·주거·학비 등 ${formatMoney(l.expenses)}`,`등록금(지출에 포함) ${formatMoney(l.tuition)}`,`이자 ${formatMoney(l.interest)}`,`부채 상환 ${formatMoney(l.debtPaid)}`,...(l.inheritance?[`상속 수령(근로수입 별도) ${formatMoney(l.inheritance)}`]:[]),...(l.funeral?[`장례비 내 부담(생활비 별도) ${formatMoney(l.funeral)}`]:[]),...(l.investmentPurchases?[`투자 매수로 자산 이동 ${formatMoney(l.investmentPurchases)}`]:[]),...(l.investmentSales?[`투자 매도로 현금 회수 ${formatMoney(l.investmentSales)}`]:[]),...(l.militaryContributions?[`적금 계좌로 이동 ${formatMoney(l.militaryContributions)}`]:[]),...(l.militaryPrincipalReturned?[`전역 적금 원금 반환 ${formatMoney(l.militaryPrincipalReturned)}`]:[]),...(l.militaryMatching?[`전역 적금 매칭 ${formatMoney(l.militaryMatching)}`]:[]),...(l.militaryInterest?[`전역 적금 이자 ${formatMoney(l.militaryInterest)}`]:[])]);s.ledger=ledger(s.totalMonths);if(!includeEvents)return;if(!s.schoolJourney&&[7,13,16,19].includes(s.age))log(s,'milestone',s.age===7?'초등학교 생활이 시작되었다':s.age===13?'중학교 생활이 시작되었다':s.age===16?'다음 배움의 교실로 옮겼다':'고교 시기의 배움을 마무리했다','입학·진급 시기는 게임에서 단순화한 가상 연령 규칙이다. 실제 출생월과 학년을 계산한 결과가 아니다.',[]);if(s.age>=25&&s.age<76){const rng=monthRandom(s,'annual-environment'),draw=rng();if(draw<.13){const cost=80+Math.floor(rng()*121);pay(s,cost);log(s,'event','예상 밖의 생활 지출이 생겼다','수리·교통·생활 정비를 묶은 가상 사건이다. 실제 발생률·평균 비용을 뜻하지 않는다.',[`일회 지출 ${cost}만원`]);}else if(draw>.88){s.bond=clamp(s.bond+2);s.joy=clamp(s.joy+2);log(s,'event','반가운 안부가 도착했다','오래 연락하지 못한 사람과 이야기를 나누었다. 가상 환경 사건이다.',['관계 +2','만족 +2']);}}}
function lifeHealthMonth(s,data,openingHealth){
 if(!s.lifeHealth&&data?.lifeHealthEvents!==true)return false;
 if(data?.injuryCareChoices===true){if(!s.lifeHealth)s.lifeHealth=createLifeHealth(s,{activatedAtMonth:s.totalMonths-1});if(s.lifeHealth.careEnabledAtMonth===undefined)Object.assign(s.lifeHealth,{careEnabledAtMonth:s.totalMonths-1,careActions:[],pendingCare:null});}
 const result=progressLifeHealth(openingHealth<=0?{...s,health:0}:s,s.totalMonths,{context:s.service.active||['cadet','officer'].includes(s.academy?.status)?'military':'daily',data});if(!result)return false;
 s.lifeHealth=result.lifeHealth;s.health=result.health;const event=result.event;
 if(!result.death){if(event)log(s,`life-${event.type}`,event.title,event.text||'',event.changes||[]);return false;}
 const death=result.death;if(s.service.active){s.service.remainingMonths--;if(s.service.remainingMonths===0)s.service.active=false;}
 s.phase='ended';if(s.lifeHealth?.careEnabledAtMonth!==undefined)s.lifeHealth.pendingCare=null;s.pendingDecision=null;s.ending={type:'death',cause:`${death.context}-${death.cause==='accident'?'incident':death.cause}`,atMonth:s.totalMonths,age:s.age,incidentId:death.incidentId,modelVersion:death.modelVersion};
 settleServiceSavings(s,'death');if(!s.month)annual(s,{includeEvents:false});labels(s);log(s,'ending',event?.title||`${s.age}세, 삶의 이야기를 마쳤다`,event?.text||'',event?.changes||[]);return true;
}
export function advanceLife(original,data,months=1){if(!Number.isInteger(months)||months<1||months>lifeLimitMonths(original))throw new RangeError('진행 개월이 기록 범위를 벗어났습니다.');if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');let s=normalizeMilitaryDraft(clone(original));if(data?.remedyRules===true&&(!s.remedies||!s.laterLife||s.formedFamily&&!s.childInheritance))activateRemediesDraft(s,data);if(data?.continuityRules===true&&!s.continuity)activateContinuityDraft(s,data);if(data?.refinementsRules===true&&!s.refinements)activateRefinementsDraft(s,data);if(s.formedFamily&&s.phase!=='ended'&&(!s.formedFamily.spouseLife&&data?.mortality||!s.formedFamily.childPlanningPolicy&&data?.childPlanningRules===true||!s.formedFamily.childSupportPolicy&&data?.childSupportRules===true))s.formedFamily=ensureFormedFamily(s,data);if(!s.market&&data?.marketScenarios&&s.phase!=='ended')s.market=ensureMarket(s,data);if(!s.economicLife&&data?.economicRules&&s.market&&s.phase!=='ended')s.economicLife=ensureEconomicLife(s,data);applyAutomaticReserveDraft(s);if(s.phase!=='running'||pendingInjuryCare(s)||militaryObligation(s))return s;for(let i=0;i<months&&s.phase==='running'&&!pendingInjuryCare(s)&&!militaryObligation(s);i++){const financeOpening=financeMonthOpening(s);let monthMoney;try{const openingCollege=activeUniversity(s),openingHealth=s.health,recoveryOpening=recoveryActivityPolicy(s),economicBefore={livingWan:livingCostSummary(s).totalWan,annualSalaryWan:economicAnnualSalaryWan(s),...economicLifeSummary(s)},marketProgress=progressMarket(s,s.totalMonths+1),economicProgress=progressEconomicLife(s,marketProgress,s.totalMonths+1);if(marketProgress)s.market=marketProgress.market;if(economicProgress){s.economicLife=economicProgress.economicLife;if(economicProgress.laidOff)job(s,'다음 일자리를 준비하는 중','실직',0);}const economicImpact=economicProgress?{before:economicBefore,after:{livingWan:livingCostSummary(s).totalWan,annualSalaryWan:economicAnnualSalaryWan(s),...economicLifeSummary(s)}}:null,contractProgress=progressEmploymentContract(s,s.totalMonths+1);if(contractProgress){if(contractProgress.expired)job(s,'계약을 마치고 다음 일자리를 준비하는 중','계약 종료',0);else s.job.employmentContract=contractProgress.contract;}const parents=advanceParentLife(s,data);if(parents)s.familyLife=parents.life;const estate=settleFamilyDeaths(s,parents?.events.filter(e=>e.type==='death').map(e=>e.guardianId)||[],s.totalMonths+1);const payroll=progressMilitaryPay(s);if(payroll){s.service.pay=payroll.pay;s.cash=payroll.cash;const deposit=fundMilitarySavingsMonth(s,s.totalMonths+1,{availablePayWan:payroll.payment.grossWan});if(!deposit||deposit.contributionWan!==payroll.payment.contributionWan)throw new Error('군급여 적금 납입을 확인해 주세요.');s.service.savings=deposit.savings;s.cash=deposit.cash;s.ledger.militaryIncome=Math.round(((s.ledger.militaryIncome||0)+payroll.payment.grossWan)*10000)/10000;s.ledger.militaryContributions=Math.round(((s.ledger.militaryContributions||0)+deposit.contributionWan)*10000)/10000;}monthMoney=moneyMonth(s,data,payroll?.payment.netWan||0);const formedMonth=formedFamilyMonth(s);habits(s,data);s.totalMonths++;s.age=Math.floor(s.totalMonths/12);s.month=s.totalMonths%12;if(formedMonth)logFormedFamilyMonth(s,formedMonth);if(s.childInheritance){const children=progressChildInheritance(s);s.childInheritance=children.childInheritance;for(const e of children.events)log(s,e.type,e.title,e.text,e.changes);}if(contractProgress?.event)log(s,contractProgress.event.type,contractProgress.event.title,'',contractProgress.event.changes);if(marketProgress)logMarketSituation(s,marketProgress,economicImpact);if(economicProgress?.laidOff)log(s,'economic-layoff','경기 변화로 일자리를 잃었다','다음 일자리를 준비한다.',[`${economicProgress.record.employmentContext.jobTitle} → 구직 중`,'연봉 0원']);const allowance=s.householdFinance?.lastMonth;if(allowance?.allowanceWan>0&&s.householdFinance.lastProcessedMonth===s.totalMonths)log(s,'family-allowance',`가족에게 용돈 ${formatMoney(allowance.allowanceWan)}을 받았다`,'',[]);if(parents)for(const e of parents.events)log(s,e.type==='death'?'family-death':'family-career',e.title,e.type==='death'?'수집한 연령대별 생명표를 월 확률로 환산한 가상 결과입니다. 사망 원인은 추정하지 않습니다.':`${e.fromOccupation||'근로소득 없음'} → ${e.toOccupation||'근로소득 없음'}`,[`${s.profile.birthFamily.guardians.find(g=>g.id===e.guardianId)?.role||'보호자'} 개인 연 근로소득 ${formatMoney(e.annualIncomeWan)}`,`부모 합계 연 근로소득 ${formatMoney(s.familyLife.guardians.reduce((sum,p)=>sum+p.annualIncomeWan,0))}`],e.type==='death'?{}:{subtype:e.type});if(estate)for(const r of estate.records){const g=s.profile.birthFamily.guardians.find(g=>g.id===r.guardianId);log(s,'family-estate',`${g.role} ${g.name}님의 장례·유산을 정산했다`,'장례비·채무를 처리하고 남은 순재산을 게임 규칙으로 분배했습니다. 부동산 지분은 평가액으로 현금 정산합니다.',[`장례비 ${formatMoney(r.funeralCostWan)}`,`내 장례비 부담 ${formatMoney(r.personalFuneralWan)}`,`내 상속 수령 ${formatMoney(r.personalInheritanceWan)}`,`유산 채무 변제 ${formatMoney(r.debtPaidWan)}`,`미충당 유산채무 ${formatMoney(r.unpaidEstateDebtWan)}`]);}if(data?.hobbyCatalog&&s.hobbies?.active){const hobby=progressHobbies(s,data.hobbyCatalog);Object.assign(s,hobby.state);if(hobby.result.status==='applied'){log(s,'hobby','취미와 함께한 한 달',hobby.result.names.join(' · '),[`취미 비용 ${formatMoney(hobby.result.costWan)}`,...Object.entries(hobby.result.effects).filter(([,n])=>n).map(([k,n])=>`${({health:'건강',learn:'배움',bond:'관계',joy:'만족',skill:'기술'})[k]} +${n}`)]);}else if(['insufficient_funds','budget_exceeded','age_blocked','unavailable'].includes(hobby.result.status))log(s,'hobby','취미 활동을 잠시 멈췄다',hobby.result.reason,['비용·효과 없음']);}if(lifeHealthMonth(s,data,openingHealth))break;const training=progressCareerTraining(s,{recovery:recoveryOpening});if(training){s.employment=training.employment;if(training.completed)log(s,'career-training',`${training.completed.label} 과정을 마쳤다`,'월별 게임 훈련 과정을 마쳤다. 실제 법정 학위·시험 합격·면허·등록을 부여하지 않는다.',['게임 준비 과정 이수']);}transitions(s,recoveryOpening);if(s.continuity){const deferral=progressServiceDeferral(s,{college:openingCollege});if(deferral){s.serviceDeferral=deferral.serviceDeferral;for(const e of deferral.events)log(s,e.type,e.title,e.text,e.changes);}const reserve=progressReserveService(s);if(reserve?.reserveService){s.reserveService=reserve.reserveService;for(const e of reserve.events)log(s,e.type,e.title,e.text,e.changes);}}const serviceReview=progressServiceReview(s);if(serviceReview){s.serviceReview=serviceReview.review;if(serviceReview.notice)log(s,serviceReview.notice.type,serviceReview.notice.title,serviceReview.notice.text,serviceReview.notice.changes);}const schoolProgress=progressSchoolJourney(s);if(schoolProgress){s.schoolJourney=schoolProgress.journey;if(schoolProgress.completed)log(s,'school-milestone',`${schoolProgress.completed.name} 과정을 마쳤다`,'정해진 게임 학업개월을 마쳤다. 다음 학교 단계는 별도의 입학 선택으로 이어진다.',['학교 과정 이수']);}if(!s.month)annual(s);labels(s);if(s.totalMonths>=lifeLimitMonths(s)){s.phase='ended';if(s.lifeHealth?.careEnabledAtMonth!==undefined)s.lifeHealth.pendingCare=null;s.pendingDecision=null;if(s.mortality){s.ending={type:'record-cap',atMonth:s.totalMonths,age:s.age};settleServiceSavings(s,'record-cap');log(s,'ending','설정한 마지막 계절에 도착했다',`${s.mortality.capLabel}. 게임에서 정한 최대 플레이 범위의 끝이며 사망 판정을 뜻하지 않습니다.`,[`${s.age}세 ${s.month}개월`,'최대 플레이 나이 도달']);}else{settleServiceSavings(s,'record-cap');log(s,'ending','80세까지의 기록을 마쳤다','정해진 게임 기록 구간의 끝이며 사망을 뜻하지 않는다. 함께한 사람들과 고른 일상이 하나의 이야기가 되었다.',['80세 0개월','기록 종료']);}break;}if(!s.month&&mortalityAtAge(s)){if(s.lifeHealth?.careEnabledAtMonth!==undefined)s.lifeHealth.pendingCare=null;break;}const schoolEvent=schoolDecisionDue(s);if(schoolEvent){s.phase='decision';s.pendingDecision=schoolEvent.id;break;}const e=decisions[s.decisionIndex];if(e&&s.totalMonths===e.age*12){if(e.id==='service'&&finishAutomaticService(s))continue;s.phase='decision';s.pendingDecision=e.id;}}finally{const finance=monthlyFinanceEvent(s,financeOpening,monthMoney);if(finance){s.lastCashFlow=cashFlowSnapshot(s,financeOpening);log(s,'monthly-finance',finance.title,finance.text,finance.changes);}applyAutomaticReserveDraft(s);}}return s;}
function startSoldierService(s,branch,months){const fx={branch,months};s.service={active:true,branch:fx.branch,remainingMonths:fx.months,previousJob:clone(s.job)};s.service.savings=createMilitarySavings(s);s.service.pay=createMilitaryPay(s,{totalServiceMonths:fx.months});job(s,`${fx.branch} 복무`,'복무',0);}
export function choose(original,index,data){if(pendingInjuryCare(original))throw new Error('부상 대응을 먼저 선택해 주세요.');if(!validSave(original)||original.phase!=='decision')throw new Error('결정을 기다리는 갈림길이 없습니다.');if(original.pendingDecision==='service'&&serviceSkipReason(original)){if(![0,3].includes(index))throw new Error('이 삶에는 병사 복무를 선택할 수 없습니다.');return normalizeMilitaryPath(original);}if(educationEvent(original.pendingDecision)){const rows=schoolChoices(original,data);if(!Number.isInteger(index)||index<0||index>=rows.length)throw new RangeError('유효하지 않은 학교 선택입니다.');return applyToSchool(original,rows[index].id,data);}if(original.remedies&&original.pendingDecision==='first-job'&&careerMilestone(original)?.kind!=='seeking'){const a=careerMilestone(original).actions.filter(a=>a.intent==='complete-milestone')[index];if(!a)throw new RangeError('현재 일과 진로의 선택을 확인해 주세요.');return completeCareerMilestone(original,a.id);}if(original.schoolJourney&&original.pendingDecision==='education'){if(index!==0)throw new RangeError('대학 지원 화면에서 경로를 선택해 주세요.');return deferUniversity(original,data);}const options=choicesFor(original,data);if(!Number.isInteger(index)||index<0||index>=options.length)throw new RangeError('유효하지 않은 선택입니다.');const s=clone(original),e=nextDecision(s),[title,,fx]=options[index],before=clone(s),changes=[];for(const k of METRICS)s[k]=clamp(s[k]+(fx[k]||0));s.skill+=fx.skill||0;s.saving=clamp(s.saving+(fx.saving||0),.05,.45);for(const k of['habit','studyTrack','relationship','wellness'])if(fx[k])s.paths[k]=fx[k];if(fx.cost){pay(s,fx.cost);changes.push(`일회 지출 ${fx.cost}만원`);}if(fx.tag&&!s.tags.includes(fx.tag))s.tags.push(fx.tag);
switch(fx.action){
case'college':{const school=clone(s.profile[fx.kind==='public'?'publicSchool':'privateSchool']);s.schooling={school,status:'enrolled',progressMonths:0,durationMonths:48,annualTuitionWan:school.annual/10000};move(s,school.region||s.profile.region,'기숙사');job(s,'대학에서 배우는 중','재학',0);changes.push(`${school.name} 재학`,`${s.residence.region} · 기숙사`,`연 등록금 ${Math.round(school.annual/10000)}만원을 학업개월에 월납`);break;}
case'apprentice':s.paths.studyTrack='technical';s.schooling=null;job(s,'현장 기술 수습','재직',1800);changes.push('현장 학습 시작','연소득 1,800만원(가상)');break;
case'service':{const check=serviceReadiness(s);if(!check.eligible)throw new Error(check.reasons.join(' '));startSoldierService(s,fx.branch,fx.months);changes.push(`${fx.branch} ${fx.months}개월`,'군급여·적금 납입 시작','기존 근로소득 정지');break;}
case'service-defer':s.serviceDeferral=beginServiceDeferral(original);s.serviceReview={schemaVersion:1,deferredAtMonth:252,status:serviceReadiness(original).recoveryBlocked?'recovering':'ready',readyNotifiedAtMonth:serviceReadiness(original).recoveryBlocked?null:s.totalMonths,resolvedAtMonth:null};changes.push('대학 재학 기간 외 최대 24개월 입대 유예');break;
case'service-defer-recovery':s.serviceReview=deferServiceReview(original);changes.push('회복 후 복무 재검토','현재 일상 유지');break;
case'job':{const income=fx.careerModel?fx.income:fx.income+(s.schooling?.status==='graduated'?200:0)+s.skill*100;job(s,fx.jobTitle,fx.jobStatus,income,fx.occupationId);if(fx.careerModel){s.job.careerModel=clone(fx.careerModel);s.job.experienceMonths=0;s.job.payScale=1;}changes.push(`${fx.jobTitle} 시작`,`연소득 ${formatMoney(income)}(가상)`,...(fx.occupationId?['공개 직업분류 연결 · 실제 평균연봉·취업 자격을 뜻하지 않음']:[]));break;}
case'move':move(s,fx.region,fx.housing);changes.push(`${s.residence.region} · ${s.residence.city}로 이동`,s.residence.housing);break;
case'care':s.care={remainingMonths:60,annualCost:fx.annualCost,mode:fx.mode};changes.push('5년간 돌봄 역할',`월 ${fx.annualCost/12}만원(가상)`);break;
case'later-work':if(s.academy?.status==='officer')s.academy.status='completed';s.job.status='시간제';s.job.title='경험을 이어가는 시간제 일';break;
case'retirement':s.retired=true;job(s,fx.income?'가벼운 시간제 일':'지역과 나의 일상',fx.income?'시간제':'은퇴',fx.income);changes.push('가상 노후 모드',`근로 연소득 ${formatMoney(fx.income)}`);break;
}
if(fx.salaryRate){if(s.job.careerModel)s.job.payScale*=1+fx.salaryRate;s.salary=round(s.salary*(1+fx.salaryRate));s.job.income=s.salary;changes.push(`현재 연소득 ${formatMoney(s.salary)}(가상)`);}labels(s);changes.push(...metricChanges(before,s));s.history.push({id:`choice-${e.id}`,eventId:e.id,age:s.age,month:s.month,title:e.title,choice:title,label:title,changes:clone(changes),cash:round(s.cash),debt:round(s.debt)});log(s,'decision',title,`‘${e.title}’의 갈림길에서 이 방향을 골랐다. 이 선택을 품고 다음 계절을 맞이한다.`,changes);s.decisionIndex++;s.step=s.decisionIndex;s.pendingDecision=null;s.phase='running';return s;}
export function repayDebt(original,amountWan){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');
 const quote=debtRepaymentQuote(original,amountWan);if(!quote.eligible)throw new Error(quote.reasons.join(' '));
 const s=clone(original);s.cash=quote.cashAfterWan;s.debt=quote.remainingDebtWan;s.ledger.debtPaid=Math.round((s.ledger.debtPaid+quote.amountWan)*10000)/10000;
 const interestText=n=>n>0&&n<1?`${Math.round(n*10000).toLocaleString('ko-KR')}원`:formatMoney(n);
 log(s,'debt-repayment','대출 원금을 상환했다','',[`상환 원금 ${formatMoney(quote.amountWan)}`,`남은 대출금 ${formatMoney(s.debt)}`,`내 소지금 ${formatMoney(s.cash)}`,`다음 달 예상 이자 ${interestText(quote.afterInterestWan)}`,`월 이자 감소 ${interestText(quote.monthlyInterestSavingWan)}`]);labels(s);return s;
}
export function setFocus(original,focus){if(!FOCUSES.includes(focus))throw new RangeError('유효하지 않은 생활 방향입니다.');if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original);if(s.phase==='ended')return s;if(s.focus!==focus){s.focus=focus;log(s,'focus',`${FOCUS_NAMES[focus]}에 시간을 더 쓰기로 했다`,'시간을 건너뛰지 않고 다음 월부터 생활 습관과 일의 성장에 반영한다.',[`${FOCUS_NAMES[focus]} 중심`]);}return s;}

function careerRow(id,data){const key=typeof id==='string'?id:id?.id;const row=Array.isArray(data?.occupations)?data.occupations.find(value=>value.id===key):null;if(!row)throw new TypeError('수집한 537개 직업 목록에서 지원 대상을 선택해 주세요.');return row;}
function careerActionState(original,{allowFirstJob=false,minimumAge=16,allowRecovery=false,allowAcademy=false}={}){if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');if(original.phase==='ended')throw new Error('종료된 삶의 기록에는 활동을 추가할 수 없습니다.');if(original.phase!=='running'&&!(allowFirstJob&&original.phase==='decision'&&original.pendingDecision==='first-job'))throw new Error('현재 갈림길을 먼저 선택해 주세요.');if(pendingInjuryCare(original)||!allowRecovery&&injuryImpact(original).workFactor===0)throw new Error('부상 대응과 회복을 먼저 마쳐 주세요.');if(original.service.active)throw new Error('복무 중에는 이 활동을 할 수 없습니다.');if(!allowAcademy&&academySupportActive(original))throw new Error('사관학교 학업 중에는 이 활동을 할 수 없습니다.');if(original.age<minimumAge)throw new Error(`${minimumAge}세 이상부터 가능한 게임 활동입니다.`);return clone(original);}
function finishEmploymentDecision(s,title,changes){if(s.phase!=='decision'||s.pendingDecision!=='first-job')return;const event=nextDecision(s);s.history.push({id:'choice-first-job',eventId:'first-job',age:s.age,month:s.month,title:event.title,choice:title,label:title,changes:clone(changes),cash:round(s.cash),debt:round(s.debt)});s.decisionIndex++;s.step=s.decisionIndex;s.pendingDecision=null;s.phase='running';}
export function applyForJob(original,occupationId,data,options={}){
  const row=careerRow(occupationId,data),assessment=evaluateEmployment(original,row);if(!assessment.eligible)throw new Error(assessment.reasons.join('\n'));
  const s=careerActionState(original,{allowFirstJob:true});s.employment=employmentState(s);
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='employmentType'))throw new TypeError('고용형태 선택을 확인해 주세요.');
  const contract=data?.employmentContracts===true?createEmploymentContract(s,row,options.employmentType):null;
  const model=careerModelSnapshot(row);if(!model)throw new Error('이 직업의 게임 급여 모형이 없습니다.');
  const application=economicJobApplication(s,row.id);if(application.economicLife){s.economicLife=application.economicLife;s.employment.lastAppliedMonth=s.totalMonths;}if(!application.success){const changes=[`${row.occupation.name} 지원 불합격`,`채용 합격률 ${Number((application.probability*100).toFixed(3))}%`,WORKING.has(s.job.status)?'현재 일자리 유지':'다음 달 재지원 가능'];finishEmploymentDecision(s,`${row.occupation.name} 지원을 마쳤다`,changes);log(s,'economic-hiring',`${row.occupation.name} 지원에 합격하지 못했다`,'다음 달에 다시 지원할 수 있다.',changes);labels(s);return s;}
  rememberCareer(s);
  const saved=s.employment.jobHistory[row.id],experience=saved?.months||0,scale=saved?.payScale||1,income=careerModelIncome(model,experience,scale);
  job(s,row.occupation.name,contract?employmentTypeStatus(contract.type):'재직',income,row.id);s.job.careerModel=model;s.job.experienceMonths=experience;s.job.payScale=scale;if(contract)s.job.employmentContract=contract;s.retired=false;s.employment.lastAppliedMonth=s.totalMonths;
  const changes=[`${row.occupation.name} 취업`,`연봉 ${formatMoney(economicAnnualSalaryWan(s))}`,`해당 직업 경력 ${experience}개월`,`${s.residence.region}의 가상 채용공고`,...(contract?[`고용형태 ${employmentTypeStatus(contract.type)}`]:[])];
  finishEmploymentDecision(s,`${row.occupation.name}에 지원했다`,changes);log(s,'employment',`${row.occupation.name} 일을 시작했다`,'게임 학위·직업준비 증표·5축 능력·공고 근무지역을 확인한 가상 채용이다. 공식 조문상의 개인별 자격 충족이나 실제 채용 합격을 뜻하지 않는다.',changes);labels(s);return s;
}
export function deferEmployment(original,data){
  const s=careerActionState(original,{allowFirstJob:true,allowRecovery:true,allowAcademy:true});if(s.phase!=='decision'||s.pendingDecision!=='first-job')throw new Error('첫 취업 갈림길에서만 미루기를 선택할 수 있습니다.');
  finishEmploymentDecision(s,'취업을 준비하며 다음 달로',[`현재 활동: ${s.job.title}`]);log(s,'employment','취업 준비를 이어가기로 했다','현재 일과 예산을 유지하고 자동 흐름을 다시 시작한다. 직업 목록은 이후에도 열 수 있다.',['첫 취업 갈림길 완료']);labels(s);return s;
}
export function trainForCareer(original,request,data){
  const s=careerActionState(original,{allowRecovery:true});if(s.schoolJourney?.current||s.schooling?.status==='enrolled'&&!s.schooling.fundingPaused||s.job.status==='재학')throw new Error('정규 학업을 마친 뒤 게임 진로 훈련을 시작해 주세요.');
  s.employment=employmentState(s);if(s.employment.training)throw new Error('이미 진행 중인 게임 훈련이 있습니다.');if(s.employment.lastTrainingMonth===s.totalMonths)throw new Error('훈련 등록은 한 달에 한 번 가능합니다.');
  const row=request?.type==='qualification'?careerRow(request.occupationId,data):null,plan=careerTrainingPlan(s,request,row);pay(s,plan.cost);s.employment.training={...plan,remainingMonths:plan.durationMonths,startedMonth:s.totalMonths};s.employment.lastTrainingMonth=s.totalMonths;
  log(s,'career-training',`${plan.label}에 등록했다`,`${plan.durationMonths}개월 동안 매월 진행하는 게임 과정이다. 실제 학위·법정 면허를 발급하지 않으며 복무·정규 재학 중에는 진행을 멈춘다.`,[`게임 훈련비 ${plan.cost}만원`,`${plan.durationMonths}개월 준비`]);labels(s);return s;
}
export function moveForCareer(original,region,data){
  const s=careerActionState(original,{allowFirstJob:true,minimumAge:19});if(!CAREER_REGIONS.includes(region)||Array.isArray(data?.regions)&&!data.regions.includes(region))throw new TypeError('게임 지역 목록에서 이사할 곳을 선택해 주세요.');if(region===s.residence.region)throw new Error('현재 거주지역과 같습니다.');s.employment=employmentState(s);if(s.employment.lastMovedMonth===s.totalMonths)throw new Error('진로 이사는 한 달에 한 번 가능합니다.');pay(s,300);move(s,region,'월세 독립');s.employment.lastMovedMonth=s.totalMonths;log(s,'career-move',`${region}에서 일할 준비를 했다`,'실제 공고가 아닌 게임의 근무지역 조건을 준비하는 이사다. 이사비와 월세 예산은 게임 가정이며 부족한 자금은 기존 차입 규칙으로 처리한다.',['가상 이사비 300만원',`${region} · ${s.residence.city} · 월세 독립`]);labels(s);return s;
}

function educationDraw(s,stage){return random(`education|${s.seed}|${s.schoolJourney.modelVersion}|${stage}|${s.age}`)();}
function recordAdmission(s,result){s.schoolJourney.applications.push(clone(result));s.schoolJourney.lastOutcome=clone(result);}
export function applyToSchool(original,optionId,data){
 if(pendingInjuryCare(original))throw new Error('부상 대응을 먼저 선택해 주세요.');
  if(!validSave(original)||!original.schoolJourney)throw new TypeError('새 교육 경로가 있는 유효한 기록이 필요합니다.');const row=schoolChoices(original,data).find(r=>r.id===optionId);if(!row)throw new RangeError('현재 단계의 학교 경로를 선택해 주세요.');if(!row.eligible)throw new Error(row.reasons.join('\n'));
  const s=clone(original),result=admissionResult(s,row,educationDraw(s,row.stage));recordAdmission(s,result);
  if(result.status==='accepted'){s.schoolJourney.current={stage:row.stage,optionId:row.id,name:row.name,ownership:row.ownership,schoolType:row.schoolType,startedMonth:s.totalMonths,progressMonths:0,durationMonths:row.durationMonths,annualTuitionWan:row.annualTuitionWan,annualLearningBonus:row.annualLearningBonus};s.pendingDecision=null;s.phase='running';log(s,'school-admission',`${row.name}에서 배우기 시작했다`,hasHouseholdSupport(s)?'학교 종류를 고른 게임 결과다. 실제 학교의 입학·배정 결과가 아니며 수업료는 매월 가구 지원 여력과 내 소지금에서 납부한다.':'학교 종류를 고른 게임 결과다. 실제 학교의 입학·배정 결과가 아니며 미성년 수업료는 보호자 지원에 포함한다.',[`연 게임수업료 ${row.annualTuitionWan}만원`,`${row.durationMonths}개월 과정`]);}
  else log(s,'school-admission',`${row.name} 지원 결과를 확인했다`,'게임 선발식에서 합격하지 못했다. 같은 경로는 다시 추첨하지 않고 더 낮은 문턱이나 일반고 기본 경로를 선택할 수 있다.',[`배움 ${round(result.learn)}`,`게임 합격확률 ${round(result.chance*100)}%`]);
  labels(s);return s;
}
function finishUniversityDecision(s,title,changes){if(s.phase!=='decision'||s.pendingDecision!=='education')return;const event=nextDecision(s);s.history.push({id:'choice-education',eventId:'education',age:s.age,month:s.month,title:event.title,choice:title,label:title,changes:clone(changes),cash:round(s.cash),debt:round(s.debt)});s.decisionIndex++;s.step=s.decisionIndex;s.pendingDecision=null;s.phase='running';}
export function applyToUniversity(original,optionId,data){
 if(pendingInjuryCare(original))throw new Error('부상 대응을 먼저 선택해 주세요.');
  if(!validSave(original))throw new TypeError('유효한 대학 지원 기록이 필요합니다.');const prepared=clone(original);if(prepared.continuity){prepared.degreeHistory=ensureDegreeHistory(prepared);if(!prepared.schoolJourney&&prepared.schooling?.status==='graduated')prepared.schoolJourney=prepareDegreeJourney(prepared,data);}if(!prepared.schoolJourney)throw new TypeError('새 교육 경로가 있는 유효한 기록이 필요합니다.');if(militaryObligation(prepared))throw new Error('현재 복무·예비군 선택을 먼저 마쳐 주세요.');const row=universityOptions(prepared,{},data).find(r=>r.id===optionId);if(!row)throw new RangeError('검토한 대학 경로에서 지원 대상을 선택해 주세요.');if(!row.eligible)throw new Error(row.reasons.join('\n'));
  const s=prepared,result=admissionResult(s,row,educationDraw(s,row.academy?'academy':'university'));recordAdmission(s,result);
  if(result.status==='accepted'){
    s.schooling={school:{name:row.name,region:row.region,type:row.ownershipLabel,annual:row.annualTuitionWan*10000},status:'enrolled',progressMonths:0,durationMonths:row.durationMonths,annualTuitionWan:row.annualTuitionWan,major:row.field,majorLabel:row.fieldLabel,educationOptionId:row.id,gamePath:true};
    s.schoolJourney.university={optionId:row.id,field:row.field,durationMonths:row.durationMonths,status:'enrolled',startedMonth:s.totalMonths};
    if(row.academy){s.academy={schemaVersion:1,schoolId:row.id,branch:row.branch,status:'cadet',startedMonth:s.totalMonths,graduatedMonth:null};move(s,row.region,'사관학교 기숙사');s.residence.city=row.city;job(s,`${row.name} 사관생도`,'재학',0);}
    else{move(s,row.region,'기숙사');job(s,`${row.fieldLabel} 과정에서 배우는 중`,'재학',0);}
    const changes=[row.name,`${row.region} · 기숙사`,`${row.durationMonths}개월 게임 과정`,`연 ${row.annualTuitionWan}만원을 재학개월에12분할`];finishUniversityDecision(s,`${row.name}에 진학했다`,changes);log(s,'school-admission',`${row.fieldLabel} 공부를 시작했다`,'배움 점수와 고정 난수에 따른 가상 입학 결과다. 집계 등록금 평균에 전공별 게임 배율을 적용했으며 실제 대학·학과의 합격이나 학비를 뜻하지 않는다. 졸업해도 면허는 자동 취득하지 않는다.',changes);
  }else log(s,'school-admission',`${row.fieldLabel} 지원에서 다음 방향을 생각했다`,'이번 게임 선발식에서 합격하지 못했다. 동일 학년도에는 같은 난수를 유지하며 더 낮은 문턱의 경로로 지원하거나 다음 해를 준비할 수 있다.',[`배움 ${round(result.learn)}`,`게임 합격확률 ${round(result.chance*100)}%`]);
  labels(s);return s;
}
export function deferUniversity(original,data){
 if(pendingInjuryCare(original))throw new Error('부상 대응을 먼저 선택해 주세요.');
  if(!validSave(original)||!original.schoolJourney||original.age<19||original.phase==='ended'||original.service.active||original.schooling?.status==='enrolled'||original.schooling?.status==='graduated'||original.phase!=='running'&&!(original.phase==='decision'&&original.pendingDecision==='education'))throw new Error('대학 진학을 준비하는 상황에서 선택해 주세요.');
  if(original.schoolJourney.applications.some(a=>a.stage==='university'&&a.cycle===original.age&&['accepted','deferred'].includes(a.status)))throw new Error('이 학년도의 선택을 이미 마쳤습니다.');
  const s=clone(original),result={stage:'university',cycle:s.age,optionId:`university-deferred-${s.age}`,label:'대학 진학을 다음 해에 준비',status:'deferred',atMonth:s.totalMonths};recordAdmission(s,result);finishUniversityDecision(s,'대학 진학을 다음 해에 준비한다',['고교 졸업 상태 유지','다음 나이부터 재지원 가능']);log(s,'school-admission','다음 배움을 준비하기로 했다','대학 진학을 미루고 일상과 취업 준비를 이어간다. 다음 나이에는 새 학년도 지원이 가능하다.',['대학 입학 유예']);labels(s);return s;
}
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const goodSchool=(x,{allowZero=false}={})=>!!x&&typeof x.name==='string'&&finite(x.annual)&&(allowZero?x.annual>=0:x.annual>0);
function goodLedger(l){return!!l&&Number.isInteger(l.yearStartMonth)&&l.yearStartMonth>=0&&Number.isInteger(l.months)&&l.months>=0&&l.months<=12&&['income','expenses','tuition','interest','debtPaid','support'].every(k=>finite(l[k])&&l[k]>=0)&&['inheritance','funeral','militaryContributions','militaryPrincipalReturned','militaryMatching','militaryInterest','militaryIncome','familyContributions','childCosts','investmentPurchases','investmentSales'].every(k=>l[k]===undefined||finite(l[k])&&l[k]>=0);}
const cachedSaveValidation=createFrozenValidationCache(validateSave);
export function validSave(s){return cachedSaveValidation(s);}
function validateSave(s){try{
if(s?.refinements!==undefined&&(!s.refinements||s.refinements.version!==1||Object.keys(s.refinements).length!==2||!Number.isInteger(s.refinements.activatedAtMonth)||s.refinements.activatedAtMonth<0||s.refinements.activatedAtMonth>s.totalMonths))return false;
if(s?.remedies!==undefined&&(!s.remedies||s.remedies.version!==1||Object.keys(s.remedies).length!==2||!Number.isInteger(s.remedies.activatedAtMonth)||s.remedies.activatedAtMonth<0||s.remedies.activatedAtMonth>s.totalMonths))return false;
if(s?.continuity!==undefined&&(!s.continuity||s.continuity.version!==1||Object.keys(s.continuity).length!==2||!Number.isInteger(s.continuity.activatedAtMonth)||s.continuity.activatedAtMonth<0||s.continuity.activatedAtMonth>s.totalMonths||!s.degreeHistory))return false;
if(!validReserveAutomation(s)||!validServiceDeferral(s)||!validReserveService(s)||!validDegreeHistory(s))return false;
if(!validChildInheritance(s)||!validLaterLife(s)||!validServiceReview(s)||!validCareFunding(s)||!validLastCashFlow(s)||!validSpendingState(s)||!validHobbyState(s)||!validMarket(s)||!validEconomicLife(s)||!validEmploymentContracts(s))return false;
if(!validFormedFamily(s)||!validAcademyState(s)||!validEmploymentState(s)||!validSchoolJourney(s)||!validMilitarySavings(s)||!validMilitaryPay(s)||!validLifeHealth(s))return false;
if(!s||s.version!==VERSION||typeof s.seed!=='string'||!s.seed||s.seed.length>64||typeof s.name!=='string'||!s.name||!Number.isInteger(s.totalMonths)||s.totalMonths<0||s.totalMonths>lifeLimitMonths(s)||s.age!==Math.floor(s.totalMonths/12)||s.month!==s.totalMonths%12)return false;
if(Object.hasOwn(s,'mortality')&&!validMortality(s.mortality,s.seed,s.age))return false;
const lifeEventDeath=s.ending?.type==='death'&&LIFE_DEATH_CAUSES.has(s.ending?.cause);if(s.ending?.cause!==undefined&&!lifeEventDeath)return false;if(lifeEventDeath&&!validLifeDeath(s))return false;
if(s.mortality){const capBirthday=s.phase==='ended'&&s.ending?.type==='record-cap'&&s.month===0,interruptedBirthday=lifeEventDeath&&s.month===0,expectedAge=capBirthday||interruptedBirthday?s.age-1:s.age;if(s.mortality.lastAgeChecked!==expectedAge)return false;const q=annualDeathProbability(s.mortality,expectedAge),dies=random(`mortality|${s.seed}|${s.mortality.modelVersion}|${expectedAge}`)()<q;if(lifeEventDeath?dies:(s.ending?.type==='death')!==dies)return false;if(s.ending?.type==='death'&&!lifeEventDeath&&s.decisionIndex!==decisions.filter(e=>e.age<s.age).length)return false;}
if(!Number.isInteger(s.decisionIndex)||s.decisionIndex<0||s.decisionIndex>decisions.length||s.step!==s.decisionIndex||!FOCUSES.includes(s.focus)||!['running','decision','ended'].includes(s.phase))return false;
if(!['cash','debt','salary','saving','skill','careerMonths',...METRICS].every(k=>finite(s[k]))||['cash','debt','salary','skill','careerMonths'].some(k=>s[k]<0)||METRICS.some(k=>s[k]<0||s[k]>100)||s.saving<.05||s.saving>.45)return false;
if(!s.job||typeof s.job.title!=='string'||typeof s.job.status!=='string'||s.job.income!==s.salary||!s.residence||!['region','city','housing'].every(k=>typeof s.residence[k]==='string')||typeof s.education!=='string'||typeof s.relationship!=='string'||!Array.isArray(s.status)||!s.status.every(x=>typeof x==='string'))return false;
if(Object.hasOwn(s.job,'careerModel')&&(!validCareerModel(s.job.careerModel)||s.job.careerModel.occupationId!==s.job.occupationId||!Number.isInteger(s.job.experienceMonths)||s.job.experienceMonths<0||!finite(s.job.payScale)||s.job.payScale<=0))return false;
if(Object.hasOwn(s.job,'occupationId')&&(typeof s.job.occupationId!=='string'||!/^know-[0-9]{6}$/.test(s.job.occupationId)))return false;
if(!s.profile||typeof s.profile.region!=='string'||typeof s.profile.birthRegion!=='string'||!goodSchool(s.profile.publicSchool)||!goodSchool(s.profile.privateSchool)||!s.paths||!s.service||typeof s.service.active!=='boolean'||!Number.isInteger(s.service.remainingMonths)||s.service.remainingMonths<0||(s.service.active&&s.service.remainingMonths===0)||!s.care||!Number.isInteger(s.care.remainingMonths)||s.care.remainingMonths<0||!finite(s.care.annualCost)||s.care.annualCost<0)return false;
if(Object.prototype.hasOwnProperty.call(s.profile,'birthCity')){const city=s.profile.birthCity;if(!validBirthCity(city)||s.profile.region!==city.region||s.profile.birthRegion!==city.region||s.profile.birthCityFingerprint!==cityFingerprint(s.seed,city))return false;}else if(Object.prototype.hasOwnProperty.call(s.profile,'birthCityFingerprint'))return false;
if(Object.hasOwn(s.profile,'birthFamily')&&(!s.profile.birthCity||!validBirthFamily(s.profile.birthFamily,s.seed,s.profile.birthCity.id)))return false;
if(!validParentLife(s)||!validFamilyEstate(s)||!validHouseholdFinance(s)||(s.schooling&&Object.hasOwn(s.schooling,'fundingPaused')&&typeof s.schooling.fundingPaused!=='boolean'))return false;
if(s.schooling&&(!goodSchool(s.schooling.school,{allowZero:!!s.academy})||!['enrolled','graduated'].includes(s.schooling.status)||!Number.isInteger(s.schooling.progressMonths)||s.schooling.progressMonths<0||(!s.schoolJourney?s.schooling.durationMonths!==48:![48,72].includes(s.schooling.durationMonths))||s.schooling.progressMonths>s.schooling.durationMonths||!finite(s.schooling.annualTuitionWan)||s.schooling.annualTuitionWan<0))return false;
if(!goodLedger(s.ledger)||s.ledger.months!==s.month||s.ledger.yearStartMonth!==s.totalMonths-s.month||(s.lastYearLedger!==null&&!goodLedger(s.lastYearLedger)))return false;
if(!Array.isArray(s.tags)||!s.tags.every(x=>typeof x==='string')||!Array.isArray(s.legacyHistory)||!Number.isInteger(s.legacySkippedDecisions)||s.legacySkippedDecisions<0||s.legacySkippedDecisions>s.decisionIndex||!Array.isArray(s.history)||s.history.length+s.legacySkippedDecisions!==s.decisionIndex)return false;
if(!s.history.every((h,i)=>h?.eventId===decisions[i+s.legacySkippedDecisions].id&&h.age===decisions[i+s.legacySkippedDecisions].age&&h.month===0&&typeof h.choice==='string'&&Array.isArray(h.changes)))return false;
if(!validTimelineHistory(s))return false;
if(s.phase==='ended'){if(s.pendingDecision!==null)return false;if(lifeEventDeath)return validLifeDeath(s)&&s.totalMonths<=lifeLimitMonths(s);if(!s.mortality)return s.totalMonths===960&&s.decisionIndex===decisions.length;const end=s.ending;if(!end||end.atMonth!==s.totalMonths||end.age!==s.age)return false;if(end.type==='record-cap')return s.totalMonths===lifeLimitMonths(s)&&s.decisionIndex===decisions.length;return end.type==='death'&&s.month===0&&s.mortality.lastAgeChecked===s.age&&end.annualProbability===annualDeathProbability(s.mortality,s.age)&&s.totalMonths<lifeLimitMonths(s);}if(s.totalMonths===lifeLimitMonths(s)||Object.hasOwn(s,'ending'))return false;const e=decisions[s.decisionIndex];if(s.phase==='decision'){const schoolEvent=educationEvent(s.pendingDecision);if(schoolEvent)return!!s.schoolJourney&&s.totalMonths===schoolEvent.age*12&&schoolDecisionDue(s)?.id===schoolEvent.id&&s.decisionIndex===decisions.filter(event=>event.age<schoolEvent.age).length;return!!e&&s.pendingDecision===e.id&&s.totalMonths===e.age*12;}return s.pendingDecision===null&&(!e||s.totalMonths<e.age*12);
}catch{return false;}}
export function migrateSave(old,data){try{
if(validSave(old))return clone(old);
if(!old||old.version!==1||typeof old.seed!=='string'||typeof old.name!=='string'||!Number.isInteger(old.step)||old.step<0||old.step>15||!Array.isArray(old.history)||old.history.length!==old.step||!Number.isInteger(old.age)||old.age<0||old.age>80||!['cash','debt','salary','saving','skill',...METRICS].every(k=>finite(old[k]))||old.cash<0||old.debt<0||old.salary<0||METRICS.some(k=>old[k]<0||old[k]>100)||!old.profile||!goodSchool(old.profile.publicSchool)||!goodSchool(old.profile.privateSchool))return null;
const legacyData={...data};for(const flag of ['refinementsRules','childSupportRules','continuityRules','remedyRules','childPlanningRules','employmentContracts','lifeHealthRisk'])delete legacyData[flag];delete legacyData.economicRules;delete legacyData.marketScenarios;delete legacyData.birthCities;delete legacyData.mortality;delete legacyData.occupationModels;delete legacyData.educationOptions;delete legacyData.familyRules;delete legacyData.householdRules;delete legacyData.parentRules;delete legacyData.estateRules;delete legacyData.lifeHealthEvents;const s=createLife(old.seed,legacyData,old.name);delete s.formedFamily;s.profile={...clone(s.profile),...clone(old.profile),birthRegion:old.profile.region};delete s.profile.birthCity;delete s.profile.birthCityFingerprint;delete s.profile.birthCitySource;s.age=old.age;s.month=0;s.totalMonths=old.age*12;for(const k of['cash','debt','salary','skill',...METRICS])s[k]=old[k];s.saving=clamp(old.saving,.05,.45);s.retired=!!old.retired;s.tags=Array.isArray(old.tags)?old.tags.filter(x=>typeof x==='string'):[];s.legacyHistory=clone(old.history);s.legacySkippedDecisions=decisions.filter(e=>e.age<=old.age).length;s.decisionIndex=s.legacySkippedDecisions;s.step=s.decisionIndex;s.history=[];s.phase=old.age===80?'ended':'running';s.pendingDecision=null;s.ledger=ledger(s.totalMonths);s.lastYearLedger=null;move(s,s.profile.region,old.age<19?'보호자 집':'가족·지인과 동거');job(s,old.salary>0?'이전 기록에서 이어온 일':old.age<19?'아직 일을 하지 않음':old.retired?'나의 일상':'다음 경험 준비',old.salary>0?(old.retired?'시간제':'재직'):(old.retired?'은퇴':'미취업'),old.salary);
const college=s.tags.includes('사립대 경로')?'privateSchool':s.tags.includes('국공립대 경로')?'publicSchool':null;if(college){const progress=clamp((old.age-19)*12,0,48);s.schooling={school:clone(s.profile[college]),status:progress>=48?'graduated':'enrolled',progressMonths:progress,durationMonths:48,annualTuitionWan:0,legacyPrepaid:true};}else if(s.tags.includes('기술과 현장 경로'))s.paths.studyTrack='technical';if(s.tags.includes('동반자'))s.paths.relationship='partner';else if(s.tags.includes('오랜 친구'))s.paths.relationship='friends';else if(s.tags.includes('나만의 리듬'))s.paths.relationship='solo';s.migration={fromVersion:1,atAge:old.age,legacyTuitionPrepaid:!!college,note:'이전 선택기록·잔액을 보존하고 지난 갈림길을 다시 과금하지 않음. 이전 일시납 등록금도 다시 청구하지 않음.'};labels(s);log(s,'migration','이전 삶의 기록을 이어받았다',s.migration.note,[`${old.age}세부터 월별 흐름으로 이어가기`,`이전 선택 ${old.history.length}개 별도 보존`]);return validSave(s)?s:null;
}catch{return null;}}
export function headline(s){return s.joy>=75?'내가 좋아하는 삶의 모양을 찾았다':s.bond>=75?'함께한 사람들이 나의 이야기가 되었다':s.learn>=75?'새로운 것을 배우는 마음으로 살아왔다':'작은 선택들이 모여 나의 삶이 되었다';}

export function enableHouseholdFinance(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original);
 if(!s.householdFinance&&s.profile.birthFamily&&data?.householdRules&&s.phase!=='ended')s.householdFinance=createHouseholdFinance(s,data.householdRules);
 if(!s.familyLife&&s.householdFinance&&data?.parentRules&&s.phase!=='ended')s.familyLife=createParentLife(s,data);
 if(!s.familyEstate&&s.familyLife&&data?.estateRules&&s.phase!=='ended')s.familyEstate=createFamilyEstate(s,data.estateRules,data.mortality);
 return s;
}
/** Begin the new personal-family ledger now; never infer a past marriage. */
export function enableFormedFamily(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original);
 if(s.phase!=='ended')s.formedFamily=ensureFormedFamily(s,data);
 labels(s);return s;
}
export function familyAction(original,action,data){if(action?.type==='inheritance-education')return supportChildEducation(original,action.childId);
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');
 if(original.phase!=='running'||pendingInjuryCare(original))throw new Error('현재 갈림길·부상 대응을 먼저 마쳐 주세요.');
 const s=enableFormedFamily(original,data),result=applyFormedFamilyAction(s,action,data),q=n=>Math.round(n*10000)/10000;
 if(!Number.isFinite(result.costWan)||result.costWan<0||s.cash<result.costWan)throw new Error('가족 활동에 필요한 내 소지금이 부족합니다.');
 s.formedFamily=result.formedFamily;s.cash=q(s.cash-result.costWan);s.ledger.expenses=q(s.ledger.expenses+result.costWan);
 for(const key of METRICS)s[key]=clamp(s[key]+(result.effects?.[key]||0));
 logFormedFamilyEvents(s,result.events);labels(s);return s;
}
/** Activate at this month only; never backfill a portfolio or historical prices. */
export function enableMarket(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original);if(!s.market&&s.phase!=='ended'&&data?.marketScenarios)s.market=ensureMarket(s,data);return s;
}
/** Start household and labour effects now, preserving every earlier wage and quote. */
export function enableEconomicLife(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=enableMarket(original,data);if(!s.economicLife&&s.phase!=='ended'&&s.market&&data?.economicRules)s.economicLife=ensureEconomicLife(s,data);return s;
}
export function investmentAction(original,action,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');if(original.phase!=='running'||pendingInjuryCare(original))throw new Error('현재 갈림길·부상 대응을 먼저 마쳐 주세요.');
 const s=enableMarket(original,data),result=applyInvestmentAction(s,action,data),q=n=>Math.round(n*10000)/10000;s.market=result.market;s.cash=q(s.cash+result.cashDeltaWan);
 if(s.cash<0)throw new Error('내 소지금 안에서만 투자할 수 있습니다.');if(result.costWan)s.ledger.investmentPurchases=q((s.ledger.investmentPurchases||0)+result.costWan);if(result.payoutWan)s.ledger.investmentSales=q((s.ledger.investmentSales||0)+result.payoutWan);
 const product=s.market.configSnapshot.products.find(p=>p.id===action.productId);log(s,'investment-trade',`${product.name} 지분을 ${action.type==='buy'?'매수':'매도'}했다`,'',[`지분 ${result.units}개`,action.type==='buy'?`소지금에서 자산으로 ${formatMoney(result.costWan)}`:`소지금 회수 ${formatMoney(result.payoutWan)}`,...(action.type==='sell'?[`실현 손익 ${formatMoney(result.record.realizedWan)}`]:[])]);return s;
}
export function setUniversityFundingPause(original,paused,data){
 if(!validSave(original)||typeof paused!=='boolean'||original.phase!=='running'||original.service.active||academySupportActive(original)||original.schooling?.status!=='enrolled')throw new Error('대학 재학 중 현재 갈림길·복무를 마친 뒤 선택해 주세요.');
 const s=clone(original);if(!!s.schooling.fundingPaused===paused)return s;
 if(!paused){const funding=educationFunding(s,s.schooling.annualTuitionWan,{university:true,hobbyCostWan:activeHobbyCost(s,data?.hobbyCatalog)});if(!funding.eligible)throw new Error(funding.reasons.join(' '));job(s,`${s.schooling.majorLabel||'대학'} 과정에서 배우는 중`,'재학',0);}
 else if(s.job.status==='재학')job(s,'학비 마련을 준비하는 중','미취업',0);
 s.schooling.fundingPaused=paused;log(s,'household-school',paused?'학비 준비를 위해 휴학했다':'준비한 학비로 복학했다',paused?'수업료와 학업 진행을 멈추고 취업으로 자금을 준비할 수 있습니다.':'앞으로의 학비 예산을 확인했습니다. 복학하면 근로소득을 멈추고 학업을 이어갑니다.',[paused?'학비·학업 진행 정지':'월 학비·학업 재개']);labels(s);return s;
}

export function chooseInjuryCare(original,id,plan=null,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');
 const {state:s,option,action,funding,trades=[]}=plan?applyFundedCare(original,id,plan,data):selectInjuryCare(original,id);
 for(const trade of trades)log(s,'investment-trade','치료비 마련을 위해 보유 자산을 매도했다','',[`소지금 회수 ${formatMoney(trade.payoutWan||trade.record?.payoutWan||0)}`]);
 if(funding?.familySupportWan)log(s,'family-medical-support','가족이 치료비를 지원했다','',[`치료비 직접 지원 ${formatMoney(funding.familySupportWan)}`]);
 if(funding?.loanWan)log(s,'medical-loan','치료비 부족분을 대출로 마련했다','',[`대출 원금 ${formatMoney(funding.loanWan)}`,`남은 대출금 ${formatMoney(s.debt)}`]);
 log(s,'injury-care',`${({treatment:'치료받기로',rest:'충분히 쉬기로',rehab:'재활하기로'})[id]} 했다`,'',[`대응 비용 ${formatMoney(option.costWan)}`,`회복 기간 ${option.months}개월`,`건강 +${Number((action.healthAfter-action.healthBefore).toFixed(4))}`]);labels(s);return s;
}

export function enlistAfterRecovery(original,branch,data){
 if(!validSave(original)||!original.serviceReview||!['recovering','ready'].includes(original.serviceReview.status))throw new Error('회복 후 복무 재검토를 확인해 주세요.');
 const check=serviceReadiness(original);if(!check.eligible)throw new Error(check.reasons.join(' '));
 const branches={army:['육군',18],navy:['해군',20],airforce:['공군',21]},row=branches[branch];if(!row)throw new Error('복무 경로를 선택해 주세요.');
 const s=clone(original);s.serviceReview=resolveServiceReview(s,'enlisted');const months=data?.service?.[branch]||row[1];startSoldierService(s,row[0],months);if(s.serviceDeferral)s.serviceDeferral=resolveServiceDeferral(s);labels(s);log(s,'military-path',`${row[0]} 복무를 시작했다`,'',[`${months}개월 복무`,'군급여·적금 납입 시작']);return s;
}
export function declineDeferredService(original){
 if(original?.serviceDeferral)throw new Error('유예 기간 안에 복무할 군을 선택해 주세요.');
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original);s.serviceReview=resolveServiceReview(s,'declined');log(s,'service-review','현재의 학업과 일을 이어가기로 했다','',[]);return s;
}
export function completeCareerMilestone(original,actionId){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const check=assessCareerMilestoneAction(original,actionId);if(!check.eligible||check.action.intent!=='complete-milestone')throw new Error(check.reasons.join(' ')||'해당 관리 화면에서 조건을 확인해 주세요.');
 const s=clone(original),model=careerMilestone(s),choice=check.action.label;s.history.push({id:'choice-first-job',eventId:'first-job',age:s.age,month:s.month,title:model.title,choice,label:choice,changes:[],cash:round(s.cash),debt:round(s.debt)});s.decisionIndex++;s.step=s.decisionIndex;s.pendingDecision=null;s.phase='running';log(s,'decision',choice,model.text,[]);return s;
}

/** Activate future-facing optional policies at the current month only. */
export function enableRemedies(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');return activateRemediesDraft(clone(original),data);
}
function activateRemediesDraft(s,data){
 if(s.phase==='ended')return s;
 if(!s.remedies)s.remedies={version:1,activatedAtMonth:s.totalMonths};if(!s.laterLife)s.laterLife=createLaterLife(s);if(s.formedFamily){const result=enableChildInheritance(s);s.childInheritance=result.childInheritance;for(const e of result.events)log(s,e.type,e.title,e.text,e.changes);}return s;
}

export function supportChildEducation(original,childId){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original),result=childInheritanceAction(s,childId);s.childInheritance=result.childInheritance;for(const e of result.events)log(s,e.type,e.title,e.text,e.changes);return s;
}
export function chooseLaterLife(original,cardId,actionId){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original),card=laterLifeCard(s);s.laterLife=acknowledgeLaterLifeCard(s,cardId,actionId);log(s,'later-life',card.title,'지금의 생활에 맞는 방향을 살펴보았다.',[]);return s;
}


/** Enable only future choices; completed service, grants and history stay intact. */
export function enableContinuity(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');return activateContinuityDraft(clone(original),data);
}
function activateContinuityDraft(s,data){
 if(s.phase==='ended')return s;
 if(!s.continuity)s.continuity={version:1,activatedAtMonth:s.totalMonths};
 s.degreeHistory=ensureDegreeHistory(s);
 const deferral=enableServiceDeferral(s);if(deferral){s.serviceDeferral=deferral;if(deferral.status==='legacy-expired'&&!s.timeline.some(e=>e.type==='service-expired'))log(s,'service-expired','지난 입대 재검토 기간을 마쳤다','지난 진행과 복무 이력은 그대로 보관합니다.',[]);}
 const reserve=enableReserveService(s);if(reserve.reserveService){s.reserveService=reserve.reserveService;for(const e of reserve.events)log(s,e.type,e.title,e.text,e.changes);}
 return s;
}
export function participateReserve(original,type){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');const s=clone(original),result=reserveAction(s,type);s.reserveService=result.reserveService;for(const e of result.events)log(s,e.type,e.title,e.text,e.changes);return s;
}

/** Apply prospective policies at the current month without replaying money. */
export function enableRefinements(original,data){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');return activateRefinementsDraft(clone(original),data);
}
function activateRefinementsDraft(s,data){
 if(s.phase==='ended')return s;
 if(!s.refinements)s.refinements={version:1,activatedAtMonth:s.totalMonths};
 if(s.formedFamily&&data?.childSupportRules===true)s.formedFamily=ensureFormedFamily(s,data);
 return applyAutomaticReserveDraft(s);
}

function applyAutomaticReserveDraft(s){
 const choice=reserveAutomaticChoice(s);if(!choice)return s;
 const result=reserveAction(s,choice.type);s.reserveService=result.reserveService;
 for(const e of result.events)log(s,e.type,e.title,e.text,e.changes);return s;
}
/** No-op by identity between actual normal training dates. */
export function settleAutomaticReserve(original){
 if(!reserveAutomaticChoice(original))return original;
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');return applyAutomaticReserveDraft(clone(original));
}
export function setReserveAutomation(original,enabled){
 if(!validSave(original))throw new TypeError('유효하지 않은 삶의 기록입니다.');
 const s=clone(original);s.reserveAutomation=reserveAutomationPolicy(s,enabled);return applyAutomaticReserveDraft(s);
}
