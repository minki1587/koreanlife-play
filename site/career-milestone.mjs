import {pendingInjuryCare} from './injury-care.mjs?v=remedy-1';

const WORKING=new Set(['재직','계약직','시간제','프리랜서','자영업','수습']);
const action=(id,label,intent,target=null)=>({id,label,intent,target});
/** Presentation of the existing first-job milestone; no RNG, hiring or money. */
export function careerMilestone(s){
 if(!s||s.phase==='ended')return null;
 let kind,title,text,actions;
 if(s.service?.active){kind='service';title='복무 이후의 일상을 생각한다';text='지금의 복무를 이어가고, 전역 후 학업과 일을 다시 살펴봅니다.';actions=[action('continue-service','지금의 복무를 이어간다','complete-milestone')];}
 else if(s.academy?.status==='cadet'||s.schoolJourney?.current||s.schooling?.status==='enrolled'&&!s.schooling.fundingPaused||s.job?.status==='재학'){
  kind='study';title='지금의 배움을 이어간다';text='현재 학업을 유지합니다. 취업 조건은 졸업 후에도 확인할 수 있습니다.';
  actions=[action('continue-study','학업을 이어간다','complete-milestone'),action('review-study','학업 진행을 확인한다','navigate','education')];
 }else if(WORKING.has(s.job?.status)){
  kind='working';title='쌓아 온 일의 다음 방향을 고른다';text='현재 직장을 그대로 유지하거나, 다른 직업과 필요한 준비를 살펴볼 수 있습니다.';
  actions=[action('continue-current','현재 일을 이어간다','complete-milestone'),action('browse-jobs','다른 일자리 조건을 살펴본다','navigate','jobs'),action('open-training','진로 훈련을 살펴본다','navigate','training')];
 }else{
  kind='seeking';title='앞으로의 일을 준비한다';text='지원 가능한 일자리와 준비할 조건을 확인합니다. 지금 취업하지 않아도 일상은 이어집니다.';
  actions=[action('prepare-job','취업을 준비하며 일상을 이어간다','complete-milestone'),action('browse-jobs','지원 가능한 일자리를 살펴본다','navigate','jobs'),action('open-training','필요한 준비 과정을 살펴본다','navigate','training')];
 }
 return{eventId:'first-job',kind,title,text,actions};
}
/** Navigation never substitutes for the existing job/training eligibility checks. */
export function assessCareerMilestoneAction(s,id){
 const model=careerMilestone(s),selected=model?.actions.find(item=>item.id===id),reasons=[];
 if(s?.phase!=='decision'||s.pendingDecision!=='first-job')reasons.push('현재 일과 진로의 갈림길에서 선택해 주세요.');
 if(pendingInjuryCare(s))reasons.push('부상 대응을 먼저 선택해 주세요.');
 if(!selected)reasons.push('현재 상태에 맞는 선택을 확인해 주세요.');
 return{eligible:reasons.length===0,reasons,kind:model?.kind||null,action:selected?{...selected}:null};
}
export const getCareerMilestone=careerMilestone;
