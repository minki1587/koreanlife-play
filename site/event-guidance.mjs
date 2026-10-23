import {injuryImpact} from './injury-care.mjs?v=refinements-2';
/** Screen guidance is authored separately from historical source records and
 * model notices. Only known active decision IDs receive a presentation copy. */
const GUIDANCE=Object.freeze({
 'school-ready':'입학을 준비하며 좋아하는 습관 하나를 골라보세요. 일상에서 꾸준히 이어갈 방향을 정합니다.',
 'school-primary':'처음 다닐 초등학교를 골라보세요. 학비와 배움 효과를 함께 비교할 수 있습니다.',
 'school-middle':'새로운 교실에서 배움을 이어갈 중학교를 골라보세요. 학비와 배움 효과를 함께 비교할 수 있습니다.',
 'school-high':'고등학교의 종류와 배움 방향을 골라보세요. 현재 배움과 학비, 지원 조건을 확인할 수 있습니다.',
 'school-path':'좋아하는 과목을 더 배우거나 현장에서 경험을 쌓으며, 앞으로 준비할 방향을 골라보세요.',
 'education':'다니고 싶은 대학의 지역과 전공을 골라보세요. 배움과 학비를 비교하고, 불합격하면 다른 과정에 지원하거나 다음 해를 준비할 수 있습니다.',
 'service':'복무할 경로를 골라보세요. 복무 중에는 학업과 등록금 납부, 기존 근로소득이 잠시 멈춥니다.',
 'first-job':'지원 가능한 일자리부터 살펴보세요. 연봉과 근무 조건을 비교하거나 취업 준비를 이어갈 수 있습니다.',
 'residence':'퇴근하고 돌아갈 지역을 골라보세요. 이사비는 한 번 지출하고, 새 주거비는 매달 반영됩니다.',
 'relationships':'친구나 가까운 사람들과 시간을 보내거나, 혼자만의 생활을 돌보세요. 교제·결혼·자녀 계획은 ‘삶 관리 → 가족’에서 선택할 수 있습니다.',
 'sustainable-work':'일과 몸이 보내는 신호를 살펴보세요. 소득을 넓히거나 건강과 공부에 시간을 쓸 수 있습니다.',
 'unexpected-cost':'수리와 생활 정비가 필요한 때입니다. 지금 한 번 지출할 비용과 앞으로 지낼 곳을 함께 생각해 보세요.',
 'care':'앞으로 5년 동안 가까운 사람을 어떻게 도울지 골라보세요. 지원 방식에 따라 매달 돌봄 비용과 관계·건강의 부담이 달라집니다.',
 'later-work':'현재 일을 줄이거나 새로운 기술을 배우며, 몸에 맞는 일의 속도를 골라보세요.',
 'retirement':'일과 여가의 비중을 다시 골라보세요. 가벼운 일을 제외하면 근로소득이 멈추고, 모아 둔 돈으로 생활을 이어갑니다.',
 'late-life':'사람들과 시간을 보내거나, 이야기를 남기거나, 새로운 산책길을 골라보세요.',
});
export const lateLifeGuidance=()=>GUIDANCE['late-life'];
export function eventGuidance(event,state){
 if(!event||typeof event!=='object')return event;
 if(event.id==='service'&&injuryImpact(state).active)return{...event,text:'회복을 마친 뒤 입대를 다시 검토하거나, 지금의 학업과 일을 이어갈 수 있습니다.'};
 if(event.id==='education'&&state&&!state.schoolJourney)return{...event,text:'학교에서 배움을 이어가거나 현장에서 기술을 익힐 방향을 골라보세요. 대학은 4년 동안 재학하며 학비를 매달 나누어 냅니다.'};
 const text=GUIDANCE[event.id];return text===undefined?event:{...event,text};
}
