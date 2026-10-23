import {pendingInjuryCare} from './injury-care.mjs?v=refinements-2';

// This uses the existing personal-loan rate. Family debt is a separate account.
export const PERSONAL_DEBT_ANNUAL_RATE=.035;
const q=n=>Math.round(n*10000)/10000;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function debtRepaymentQuote(state,amountWan){
 const cash=amount(state?.cash)?state.cash:0,debt=amount(state?.debt)?state.debt:0,maxWan=Math.floor((Math.min(cash,debt)+1e-9)*10000)/10000;
 const reasons=[];
 if(!state||state.phase!=='running')reasons.push(state?.phase==='ended'?'종료된 삶에서는 상환할 수 없습니다.':'현재 갈림길을 먼저 선택해 주세요.');
 if(pendingInjuryCare(state))reasons.push('부상 대응을 먼저 선택해 주세요.');
 if(debt<=0)reasons.push('상환할 대출금이 없습니다.');
 if(!amount(amountWan)||amountWan<.0001||Math.abs(q(amountWan)-amountWan)>1e-8)reasons.push('상환 금액을 1원 이상 입력해 주세요.');
 else if(amountWan>maxWan+1e-8)reasons.push('내 소지금과 남은 대출금 안에서 상환해 주세요.');
 const paid=amount(amountWan)?q(Math.min(amountWan,maxWan)):0,beforeInterestWan=q(debt*PERSONAL_DEBT_ANNUAL_RATE/12),remainingDebtWan=q(debt-paid),afterInterestWan=q(remainingDebtWan*PERSONAL_DEBT_ANNUAL_RATE/12);
 return{eligible:!reasons.length,reasons,maxWan,amountWan:paid,cashAfterWan:q(cash-paid),remainingDebtWan,beforeInterestWan,afterInterestWan,monthlyInterestSavingWan:q(beforeInterestWan-afterInterestWan)};
}
