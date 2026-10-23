import {serviceDeferralSummary} from './service-deferral.mjs?v=continuity-2';
import {reserveTrainingDue} from './reserve-service.mjs?v=continuity-2';
import {pendingInjuryCare} from './injury-care.mjs?v=continuity-2';

/** Existing fixed-age decisions and urgent injury care keep their own priority. */
export function militaryObligation(s){
 if(!s||s.phase!=='running'||pendingInjuryCare(s))return null;
 const review=serviceDeferralSummary(s);
 if(review?.canChoose)return{kind:'service',id:`${s.seed}|service-deadline|${s.serviceDeferral.deadlineReachedAtMonth}`,title:'복무할 군을 선택할 시간',text:'대학 재학 기간을 제외한 입대 유예 24개월을 모두 사용했습니다. 복무할 군을 선택해 주세요.',actions:[{kind:'service',branch:'army',label:'육군 복무 시작',facts:['18개월 복무']},{kind:'service',branch:'navy',label:'해군 복무 시작',facts:['20개월 복무']},{kind:'service',branch:'airforce',label:'공군 복무 시작',facts:['21개월 복무']}]};
 const training=reserveTrainingDue(s);if(!training)return null;
 return{kind:'reserve',id:`${s.seed}|reserve|${training.year}|${s.reserveService.actions.length}`,title:training.title,text:training.student?'대학 재학생 단축 훈련으로 참여합니다.':'예비군 훈련 일정을 확인했습니다. 참여할 방법을 선택해 주세요.',actions:[{kind:'reserve',type:'attend',label:'훈련에 참여하기',disabled:!training.canAttend,facts:[`${training.remainingHours}시간 이수`,'근로소득과 학업 이수개월 유지']},...(training.canPostpone?[{kind:'reserve',type:'postpone-health',label:'회복 후로 일정 조정',facts:['회복이 끝난 뒤 다시 확인']}]:[])]};
}
