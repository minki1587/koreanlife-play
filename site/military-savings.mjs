// Amounts are in 만원; four decimal places represent one won.
export const MILITARY_SAVINGS_RULES=Object.freeze({version:'military-savings-v1',monthlyLimitWan:55,matchingRate:1,annualInterestRate:.05});
const q=n=>Math.round(n*10000)/10000,clone=x=>structuredClone(x),money=n=>Number.isFinite(n)&&n>=0&&Math.abs(q(n)-n)<1e-8;

export function createMilitarySavings(state,{activatedAtMonth=state.totalMonths}={}){
 if(!state.service?.active||!Number.isInteger(state.service.remainingMonths)||state.service.remainingMonths<1||state.service.remainingMonths>36)return null;
 return{...MILITARY_SAVINGS_RULES,activatedAtMonth,plannedMonths:state.service.remainingMonths,lastProcessedMonth:activatedAtMonth,status:'active',deposits:[],settlement:null};
}
function amounts(savings){
 const principalWan=q(savings.deposits.reduce((n,d)=>n+d.contributionWan,0)),weighted=savings.deposits.reduce((n,d)=>n+d.contributionWan*(savings.lastProcessedMonth-d.atMonth+1),0);
 return{principalWan,interestWan:q(weighted*savings.annualInterestRate/12),matchingWan:q(principalWan*savings.matchingRate)};
}

// This is a transfer from an existing wallet, never a new wage or an expense.
// A save created before this feature starts at its next actual month, not enlistment.
export function fundMilitarySavingsMonth(state,atMonth=state.totalMonths+1){
 if(!state.service?.active)return null;
 const savings=clone(state.service.savings||createMilitarySavings(state,{activatedAtMonth:atMonth-1}));
 if(!savings||savings.status!=='active'||atMonth<=savings.lastProcessedMonth)return null;
 if(atMonth!==savings.lastProcessedMonth+1||savings.deposits.length>=savings.plannedMonths)throw new RangeError('적금 납입 월이 이어지지 않습니다.');
 const contributionWan=q(Math.min(savings.monthlyLimitWan,Math.max(0,state.cash)));
 savings.deposits.push({atMonth,contributionWan});savings.lastProcessedMonth=atMonth;
 return{savings,cash:q(state.cash-contributionWan),contributionWan,atMonth};
}

// Government matching is conditional on completing the remaining service term.
// On an interrupted life record, return only actual principal and accrued interest.
export function settleMilitarySavings(state,reason='maturity'){
 const original=state.service?.savings;if(!original||original.status!=='active')return null;
 if(!['maturity','death','record-cap'].includes(reason))throw new RangeError('적금 정산 사유를 확인해 주세요.');
 if(reason==='maturity'&&original.deposits.length!==original.plannedMonths)throw new RangeError('복무 적금 만기 전입니다.');
 const savings=clone(original),a=amounts(savings),matchingWan=reason==='maturity'?a.matchingWan:0,payoutWan=q(a.principalWan+a.interestWan+matchingWan);
 savings.status=reason==='maturity'?'matured':'interrupted';
 savings.settlement={atMonth:state.totalMonths,reason,principalWan:a.principalWan,interestWan:a.interestWan,matchingWan,payoutWan};
 return{savings,cash:q(state.cash+payoutWan),...savings.settlement};
}

export function militarySavingsSummary(state){
 const s=state.service?.savings||(state.service?.active?createMilitarySavings(state):null);if(!s)return null;
 const a=amounts(s),settled=s.status!=='active';
 return{status:s.status,statusLabel:({active:'복무 중 적립',matured:'전역 정산 완료',interrupted:'중도 정산 완료'})[s.status],branch:state.service.branch,monthlyLimitWan:s.monthlyLimitWan,annualInterestRate:s.annualInterestRate,matchingRate:s.matchingRate,paidMonths:s.deposits.filter(d=>d.contributionWan>0).length,elapsedMonths:s.deposits.length,plannedMonths:s.plannedMonths,remainingMonths:settled?0:s.plannedMonths-s.deposits.length,principalWan:a.principalWan,lockedPrincipalWan:settled?0:a.principalWan,accruedInterestWan:a.interestWan,pendingMatchingWan:settled?0:a.matchingWan,lastContributionWan:s.deposits.at(-1)?.contributionWan||0,payoutWan:s.settlement?.payoutWan||0,settlement:s.settlement?clone(s.settlement):null};
}

export function validMilitarySavings(state){try{
 const s=state?.service?.savings;if(s===undefined)return true;
 if(!s||s.version!==MILITARY_SAVINGS_RULES.version||!['monthlyLimitWan','matchingRate','annualInterestRate'].every(k=>s[k]===MILITARY_SAVINGS_RULES[k])||!Number.isInteger(s.activatedAtMonth)||s.activatedAtMonth<0||s.activatedAtMonth>state.totalMonths||!Number.isInteger(s.plannedMonths)||s.plannedMonths<1||s.plannedMonths>36||!Array.isArray(s.deposits)||s.deposits.length>s.plannedMonths||s.lastProcessedMonth!==s.activatedAtMonth+s.deposits.length||s.lastProcessedMonth>state.totalMonths||!['active','matured','interrupted'].includes(s.status))return false;
 if(!s.deposits.every((d,i)=>d&&d.atMonth===s.activatedAtMonth+i+1&&money(d.contributionWan)&&d.contributionWan<=s.monthlyLimitWan))return false;
 if(s.status==='active')return s.settlement===null&&state.service.active&&s.lastProcessedMonth===state.totalMonths&&state.service.remainingMonths===s.plannedMonths-s.deposits.length;
 const p=s.settlement,a=amounts(s);if(!p||p.atMonth!==s.lastProcessedMonth||!['principalWan','interestWan','matchingWan','payoutWan'].every(k=>money(p[k]))||p.principalWan!==a.principalWan||p.interestWan!==a.interestWan||p.payoutWan!==q(p.principalWan+p.interestWan+p.matchingWan))return false;
 if(s.status==='matured')return p.reason==='maturity'&&p.matchingWan===a.matchingWan&&s.deposits.length===s.plannedMonths&&!state.service.active&&state.service.remainingMonths===0;
 return ['death','record-cap'].includes(p.reason)&&p.matchingWan===0&&state.phase==='ended'&&state.ending?.type===p.reason;
}catch{return false;}}
