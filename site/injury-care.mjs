import {hobbyActivity,hobbyAllowedDuringRecovery} from './hobby-activity.mjs?v=continuity-2';
// Explicit, versioned game choices; amounts are in ten thousand won.
export const CARE_VERSION='injury-care-v1';
const q=n=>Math.round(n*10000)/10000;
export function pendingInjuryCare(s){return s?.phase!=='ended'&&!!s?.lifeHealth?.pendingCare;}
export function injuryImpact(s){
 const i=s?.lifeHealth?.injury,active=!!i&&i.remainingRecoveryMonths>0&&s.phase!=='ended';
 const workFactor=!active?1:i.care?.mode==='rest'?0:({minor:.8,major:.5,critical:0})[i.severity];
 return{active,severity:active?i.severity:null,workFactor,workLabel:!active?'정상 근무':workFactor?`회복 중 · 소득이 회복 기간 동안 ${Math.round(workFactor*100)}%로 감소`:'회복 휴무 · 근로소득 없음'};
}
export function recoveryActivityPolicy(s){
 const impact=injuryImpact(s),mode=impact.active?s.lifeHealth.injury.care?.mode||'pending':null,studyAllowed=!impact.active||impact.severity!=='critical'&&!(impact.severity==='major'&&mode==='rest');
 return{version:'recovery-activities-v1',active:impact.active,severity:impact.severity,mode,studyAllowed,physicalTrainingAllowed:!impact.active};
}
export const recoveryStudyAllowed=s=>recoveryActivityPolicy(s).studyAllowed;
export function recoveryActivityNotes(s){const p=recoveryActivityPolicy(s);if(!p.active)return[];return[
 p.studyAllowed?'학교·이론 훈련 진행 · 신체 훈련은 휴식':'초·중·고 학년 달력 유지 · 재학 보너스는 휴식',
 ...(!p.studyAllowed?['대학 학비·이수와 진로 훈련 정지 · 회복 후 자동 재개']:[]),
 p.severity==='critical'?'모든 취미와 운동·여행은 휴식':p.severity==='major'&&p.mode==='rest'?'학습 취미·운동은 휴식 · 부담이 적은 실내 감상 가능':'신체 부담이 적은 실내 활동만 가능'
 ];}
export function hobbyInjuryAllowed(s,row){const impact=injuryImpact(s);if(!impact.active)return true;if(!hobbyAllowedDuringRecovery(impact.severity,row))return false;const p=recoveryActivityPolicy(s),activity=hobbyActivity(row);if(p.mode==='rest'&&activity.physicalDemand!=='minimal')return false;return p.studyAllowed||row.type!=='지능'&&activity.physicalDemand==='minimal';}
export function injuryCareOptions(s){
 const i=s?.lifeHealth?.injury;if(!i||!pendingInjuryCare(s))return[];
 const n={minor:0,major:1,critical:2}[i.severity],left=i.remainingRecoveryMonths;
 return[
  {id:'treatment',label:'치료받기',costWan:[12,60,180][n],months:Math.max(1,Math.ceil(left*.5)),gain:[4,8,12][n]},
  {id:'rest',label:'충분히 쉬기',costWan:0,months:left+1,gain:0},
  {id:'rehab',label:'재활하기',costWan:[6,30,90][n],months:Math.max(1,Math.ceil(left*.75)),gain:[1,3,5][n]},
 ].map(r=>({...r,gain:Math.min(r.gain,i.healthLoss-i.allocatedHealth,100-s.health),affordable:s.cash+1e-9>=r.costWan,activityNotes:recoveryActivityNotes({...s,lifeHealth:{...s.lifeHealth,injury:{...i,care:{mode:r.id}}}})}));
}
export function applyCareRecord(injury,action){
 const fake={phase:'running',cash:Infinity,health:action.healthBefore,lifeHealth:{injury,pendingCare:injury.id}},option=injuryCareOptions(fake).find(r=>r.id===action.mode);
 if(!option||action.injuryId!==injury.id||action.atMonth!==injury.atMonth||action.version!==CARE_VERSION||action.costWan!==option.costWan||Math.abs(action.healthAfter-action.healthBefore-option.gain)>1e-8)throw new Error('부상 대응 기록을 확인해 주세요.');
 const next=structuredClone(injury);next.allocatedHealth+=option.gain;next.recoveredHealth+=option.gain;next.recoveryMonths=option.months;next.remainingRecoveryMonths=option.months;next.care={mode:option.id,label:option.label,costWan:option.costWan,atMonth:action.atMonth};return next;
}
export function selectInjuryCare(original,id){
 if(!pendingInjuryCare(original))throw new Error('현재 선택할 부상 대응이 없습니다.');
 const s=structuredClone(original),option=injuryCareOptions(s).find(r=>r.id===id);if(!option)throw new Error('부상 대응을 선택해 주세요.');if(!option.affordable)throw new Error('소지금이 부족합니다. 비용 없는 휴식을 선택할 수 있습니다.');
 const m=s.lifeHealth,action={version:CARE_VERSION,injuryId:m.injury.id,atMonth:s.totalMonths,mode:id,costWan:option.costWan,healthBefore:s.health,healthAfter:s.health+option.gain};
 m.injury=applyCareRecord(m.injury,action);m.careActions.push(action);m.pendingCare=null;s.health=action.healthAfter;s.cash=q(s.cash-option.costWan);s.ledger.expenses=q(s.ledger.expenses+option.costWan);return{state:s,option,action};
}
