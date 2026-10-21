export const militaryMoney=wan=>`${Math.round(wan*10000).toLocaleString('ko-KR')}원`;

/** Presentation facts only: wages, locked principal and payouts stay separate. */
export function militaryFinanceView(pay,savings){
 const payFacts=pay?[
  ['상태',pay.active?'복무 중':'복무 종료'],['군별',pay.branch],['계급',pay.rank],
  ['복무 경과',`${pay.servedMonths} / ${pay.policyTotalMonths}개월`],
  ...(pay.active?[['다음 군 월급',militaryMoney(pay.monthlyPayWan)]]:[]),
  ['급여 지급 개월',`${pay.paidMonths}개월`],['누적 군 월급',militaryMoney(pay.cumulativePaidWan)],
 ]:[];
 const last=pay?.lastPayment;
 const paymentFacts=last?[
  ['지급 당시',`${last.serviceMonth}개월 차 · ${last.rank}`],['월급',militaryMoney(last.grossWan)],
  ['적금 자동 납입',militaryMoney(last.contributionWan)],['소지금에 남긴 월급',militaryMoney(last.netWan)],
 ]:[];
 const accountFacts=savings?[
  ['상태',savings.statusLabel],['적립 진행',`${savings.elapsedMonths} / ${savings.plannedMonths}개월`],
  ['월 자동 납입 한도',militaryMoney(savings.monthlyLimitWan)],['적립 원금',militaryMoney(savings.principalWan)],
  ...(!savings.settlement?[
   ['최근 납입',militaryMoney(savings.lastContributionWan)],['적금에 묶인 원금',militaryMoney(savings.lockedPrincipalWan)],
   ['누적 이자',militaryMoney(savings.accruedInterestWan)],['예상 만기 지원금',militaryMoney(savings.pendingMatchingWan)],
  ]:[]),
 ]:[];
 const settlement=savings?.settlement;
 const settlementFacts=settlement?[
  ['돌려받은 원금',militaryMoney(settlement.principalWan)],['받은 이자',militaryMoney(settlement.interestWan)],
  ['받은 지원금',militaryMoney(settlement.matchingWan)],['총 수령액',militaryMoney(settlement.payoutWan)],
 ]:[];
 return{payFacts,paymentFacts,accountFacts,settlementFacts,settlementTitle:settlement?.reason==='maturity'?'전역 정산 내역':'중도 정산 내역'};
}
