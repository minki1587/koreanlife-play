import {protagonistGender} from './person-identity.mjs?v=birth-draw-20261024';
import {pendingInjuryCare,injuryImpact} from './injury-care.mjs?v=birth-draw-20261024';

// New soldier-entry policy only. Existing service/pay/savings are never rewritten.
const clone=value=>structuredClone(value);
const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const keys=(value,expected)=>!!value&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
export function serviceReadiness(s){
 const recoveryBlocked=!!pendingInjuryCare(s)||injuryImpact(s).active;
 let code='ready',reason='';
 if(!s||s.phase==='ended'){code='ended';reason='종료된 삶에서는 새 복무를 시작할 수 없습니다.';}
 else if(protagonistGender(s)==='여성'){code='no-conscription';reason='이 삶은 병사 징병 경로를 거치지 않습니다. 사관학교 지원은 별도입니다.';}
 else if(protagonistGender(s)!=='남성'){code='identity';reason='주인공의 성별 기록을 확인해 주세요.';}
 else if(s.academy){code='academy';reason='사관학교·장교 경로는 병사 복무와 별도로 이어집니다.';}
 else if(s.service?.active||s.service?.branch||s.service?.completed||s.service?.pay||s.service?.savings){code='already-served';reason='이미 시작했거나 마친 병사 복무를 다시 시작할 수 없습니다.';}
 else if(s.serviceDeferral?.status==='legacy-expired'){code='expired';reason='이전 입대 검토 기간이 지나 새 입대 경로는 종료되었습니다. 지난 기록은 유지합니다.';}
 else if(!Number.isInteger(s.age)||s.age<21){code='not-due';reason='병사 복무를 검토하는 시기는 21세부터입니다.';}
 else if(s.phase!=='running'&&!(s.phase==='decision'&&s.pendingDecision==='service')){code='other-choice';reason='현재 갈림길을 먼저 마쳐 주세요.';}
 else if(s.serviceDeferral?.status==='legacy-expired'){code='expired';reason='입대 재검토 기간이 지난 기존 기록입니다.';}
 else if(recoveryBlocked){code='recovery';reason='부상 대응과 회복을 마친 뒤 입대를 검토할 수 있습니다.';}
 return{eligible:code==='ready',recoveryBlocked,code,reasons:reason?[reason]:[]};
}
export function deferServiceReview(s){
 const check=serviceReadiness(s);
 if(s?.serviceReview||s?.phase!=='decision'||s.pendingDecision!=='service'||s.totalMonths!==252||check.code!=='recovery'||pendingInjuryCare(s))throw new Error('부상 대응을 마친 21세 복무 갈림길에서 회복 후 검토를 선택해 주세요.');
 return{schemaVersion:1,deferredAtMonth:s.totalMonths,status:'recovering',readyNotifiedAtMonth:null,resolvedAtMonth:null};
}
export function progressServiceReview(s){
 const review=s?.serviceReview;if(review===undefined)return null;
 if(!validServiceReview(s))throw new TypeError('복무 재검토 기록을 확인해 주세요.');
 const next=clone(review);
 if(next.status==='recovering'&&s.phase==='running'&&serviceReadiness(s).eligible){
  next.status='ready';next.readyNotifiedAtMonth=s.totalMonths;
  return{review:next,notice:{type:'service-review',title:'회복을 마쳐 복무를 다시 검토할 수 있다',text:'현재 일상을 유지하거나 복무 경로를 직접 검토할 수 있습니다.',changes:[]}};
 }
 return{review:next,notice:null};
}
export function resolveServiceReview(s,outcome){
 if(!validServiceReview(s)||!s.serviceReview||!['recovering','ready'].includes(s.serviceReview.status)||!['enlisted','declined'].includes(outcome)||s.phase!=='running'||pendingInjuryCare(s))throw new Error('진행 중인 복무 재검토에서 선택해 주세요.');
 if(outcome==='enlisted'&&!serviceReadiness(s).eligible)throw new Error(serviceReadiness(s).reasons.join(' '));
 return{...clone(s.serviceReview),status:outcome,resolvedAtMonth:s.totalMonths};
}
export function validServiceReview(s){
 const r=s?.serviceReview;if(r===undefined)return true;
 if(!keys(r,['schemaVersion','deferredAtMonth','status','readyNotifiedAtMonth','resolvedAtMonth'])||r.schemaVersion!==1||r.deferredAtMonth!==252||r.deferredAtMonth>s.totalMonths||!['recovering','ready','declined','enlisted'].includes(r.status)||protagonistGender(s)!=='남성'||s.academy)return false;
 if(r.readyNotifiedAtMonth!==null&&(!month(r.readyNotifiedAtMonth)||r.readyNotifiedAtMonth<r.deferredAtMonth||r.readyNotifiedAtMonth>s.totalMonths))return false;
 const resolved=['declined','enlisted'].includes(r.status);
 if(resolved?(!month(r.resolvedAtMonth)||r.resolvedAtMonth<r.deferredAtMonth||r.resolvedAtMonth>s.totalMonths):r.resolvedAtMonth!==null)return false;
 if(r.status==='recovering'&&r.readyNotifiedAtMonth!==null||r.status==='ready'&&r.readyNotifiedAtMonth===null)return false;
 if(r.readyNotifiedAtMonth!==null&&resolved&&r.readyNotifiedAtMonth>r.resolvedAtMonth)return false;
 // 'enlisted' is attached atomically with the engine's ordinary enlistment path.
 if(r.status==='enlisted'&&!s.service?.branch)return false;
 if(!resolved&&(s.service?.active||s.service?.branch||s.service?.pay||s.service?.savings))return false;
 return true;
}
