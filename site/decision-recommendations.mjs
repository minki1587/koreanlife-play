import {schoolChoices,universityOptions} from './education.mjs?v=home-20261024';
import {evaluateEmployment} from './employment.mjs?v=home-20261024';
import {employmentTypeOptions} from './employment-contract.mjs?v=home-20261024';
import {recommendEducation,recommendJobs} from './choice-recommendations.mjs?v=home-20261024';
import {formatMoney} from './spending.mjs?v=home-20261024';
import {displayCopy,completeModalAction,clearActionError} from './ui-copy.mjs?v=home-20261024';

/** Same real support checks as the full browsers; presentation consumes no RNG. */
export function decisionRecommendations(state,data){
 if(state?.phase!=='decision')return null;
 if(state.schoolJourney&&['school-primary','school-middle','school-high'].includes(state.pendingDecision))return{kind:'school',items:recommendEducation(schoolChoices(state,data).map(row=>({row,assessment:row})))};
 if(state.schoolJourney&&state.pendingDecision==='education'){
  const candidates=[...universityOptions(state,{path:'university'},data),...universityOptions(state,{path:'academy'},data)];
  return{kind:'university',items:recommendEducation(candidates.map(row=>({row,assessment:row})),{university:true})};
 }
 if(state.pendingDecision==='first-job'&&data.occupations?.length)return{kind:'jobs',items:recommendJobs(data.occupations.map(row=>({row,assessment:evaluateEmployment(state,row)})))};
 return null;
}

export function renderDecisionRecommendations({document=globalThis.document,host,state,data,onChoose,onBrowse,onDefer,onError}){
 const model=decisionRecommendations(state,data);if(!model)return false;
 const dialog=host.closest?.('dialog'),scope=dialog||host;
 let status=document.getElementById?.('decision-error'),pending=false;
 if(!status){status=document.createElement('p');status.className='decision-recommendation-status';status.setAttribute('role','alert');host.append(status);}
 // The decision controller handles Escape itself. Capture cancellation before its
 // bubble listener can fold the dialog while a save transaction is pending.
 const guardCancel=event=>{if(pending){event.preventDefault?.();event.stopImmediatePropagation?.();}};
 function run(callback,argument,anchor){
  if(pending||scope.dataset?.actionPending==='true')return Promise.resolve(false);
  pending=true;scope.addEventListener?.('cancel',guardCancel,true);
  const result=completeModalAction(scope,status,async value=>{try{return await callback(value);}catch(error){onError?.(error);throw error;}},argument,'지금은 처리할 수 없습니다. 조건을 확인해주세요.',{anchor,keepOpen:!dialog});
  return Promise.resolve(result).finally(()=>{pending=false;scope.removeEventListener?.('cancel',guardCancel,true);});
 }
 const intro=document.createElement('p');intro.className='choice-introduction';intro.textContent=model.items.length?`지금 선택 가능한 추천 ${model.items.length}개예요. 전체 목록에서 직접 찾아볼 수도 있어요.`:'지금 바로 선택할 수 있는 경로가 없어요. 전체 목록에서 필요한 준비를 확인해보세요.';host.append(intro);
 for(const item of model.items){
  const {row}=item,card=document.createElement('article'),title=document.createElement('h3'),reason=document.createElement('p'),facts=document.createElement('ul'),button=document.createElement('button');card.className='decision-recommendation';
  title.textContent=displayCopy(model.kind==='jobs'?row.occupation.name:row.label||row.name);reason.textContent=item.reason;reason.className='choice-reason';let request;
  const add=text=>{const li=document.createElement('li');li.textContent=displayCopy(text);facts.append(li);};
  if(model.kind==='jobs'){
   const assessment=evaluateEmployment(state,row),contract=data.employmentContracts?employmentTypeOptions(row)[0]:null;
   add(Number.isFinite(assessment.offeredAnnualWan)?`제시 세후 연봉 ${formatMoney(assessment.offeredAnnualWan)}`:'제시 세후 연봉 미확인');if(contract)add(`고용형태 ${contract.label}`);
   if(assessment.economicContext?.activated)add(`합격 가능성 ${Math.round(assessment.hiringProbability*1000)/10}% · 월 1회 지원`);
   if(row.modeled?.workingTime?.weeklyHours)add(`근무시간 주 ${row.modeled.workingTime.weeklyHours}시간`);
   if(Number.isFinite(row.modeled?.occupationalRisks?.level))add(`업무 위험도 ${row.modeled.occupationalRisks.level}/5`);
   request={kind:'jobs',id:row.id,employmentType:contract?.id};button.textContent='이 일자리에 지원하기';
  }else{
   add(`학비 연 ${formatMoney(row.annualTuitionWan)}`);if(row.funding&&!row.funding.legacy)add(`내 학비 부담 월 ${formatMoney(row.funding.personalMonthlyWan)}`);
   add(`과정 ${row.durationMonths}개월`);if(model.kind==='school')add(`배움 보너스 연 +${row.annualLearningBonus.toFixed(2)}`);
   add(`합격 가능성 ${Math.round(row.admissionChance*1000)/10}%`);
   if(row.academy)add(`학비·숙식 제공 · 졸업 후 ${row.branchLabel} 장교`);
   request={kind:model.kind,id:row.id};button.textContent='이 과정에 지원하기';
  }
  button.type='button';button.className='primary';button.addEventListener('click',()=>run(onChoose,request,button));
  card.append(title,reason,facts,button);host.append(card);
 }
 const browse=document.createElement('button');browse.type='button';browse.className='secondary';browse.textContent=model.kind==='jobs'?'전체 직업·조건 보기 ›':'전체 학교·과정 보기 ›';browse.addEventListener('click',()=>{if(pending||scope.dataset?.actionPending==='true')return;clearActionError(status);onBrowse(model.kind);});host.append(browse);
 if(model.kind!=='school'){const defer=document.createElement('button');defer.type='button';defer.className='quiet';defer.textContent=model.kind==='jobs'?'취업 준비하며 다음 달로':'대학 진학을 미루고 경험 쌓기';defer.addEventListener('click',()=>run(onDefer,model.kind,defer));host.append(defer);}
 return true;
}
