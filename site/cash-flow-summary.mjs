const q=n=>Math.round(n*10000)/10000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
/** Observation of actual settled cash. It does not value investments or settle money. */
export function cashFlowSnapshot(s,opening){if(s.totalMonths!==opening.atMonth+1)return null;return{atMonth:s.totalMonths,openingWan:opening.cashWan,closingWan:s.cash,deltaWan:q(s.cash-opening.cashWan)};}
export function validLastCashFlow(s){
 const r=s?.lastCashFlow;if(r===undefined)return true;
 return!!r&&!Array.isArray(r)&&Object.keys(r).length===4&&Number.isInteger(r.atMonth)&&r.atMonth>0&&r.atMonth<=s.totalMonths&&finite(r.openingWan)&&r.openingWan>=0&&finite(r.closingWan)&&r.closingWan>=0&&finite(r.deltaWan)&&Math.abs(q(r.closingWan-r.openingWan)-r.deltaWan)<.0001;
}
/** Include direct cash actions later in the same month, without parsing history copy. */
export function currentMonthCashFlow(s){const r=s?.lastCashFlow;return r&&validLastCashFlow(s)&&r.atMonth===s.totalMonths?{atMonth:r.atMonth,openingWan:r.openingWan,currentWan:s.cash,deltaWan:q(s.cash-r.openingWan)}:null;}
export const cashFlowSummary=currentMonthCashFlow;
