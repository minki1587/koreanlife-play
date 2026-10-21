// 2026 MPM military pay table, note 6. Promotion uses the ordinary minimum
// 2/6/6-month schedule; actual individual promotion reviews are not simulated.
export const MILITARY_PAY_RULES=Object.freeze({version:'military-pay-2026-v1',referenceYear:2026,branchMonths:Object.freeze({'육군':18,'해군':20,'공군':21}),ranks:Object.freeze([{rank:'이병',fromMonth:1,grossWan:75},{rank:'일병',fromMonth:3,grossWan:90},{rank:'상병',fromMonth:9,grossWan:120},{rank:'병장',fromMonth:15,grossWan:150}].map(Object.freeze))});
const q=n=>Math.round(n*10000)/10000,integer=n=>Number.isInteger(n)&&n>=0,amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&Math.abs(q(n)-n)<1e-8;
export function militaryRankForMonth(serviceMonth){if(!Number.isInteger(serviceMonth)||serviceMonth<1||serviceMonth>36)throw new RangeError('복무 개월을 확인해 주세요.');return MILITARY_PAY_RULES.ranks.findLast(r=>serviceMonth>=r.fromMonth);}
export function createMilitaryPay(state,{totalServiceMonths}={}){
 const service=state.service;if(!service?.active||!Number.isInteger(service.remainingMonths)||service.remainingMonths<1||service.remainingMonths>36)return null;
 const total=totalServiceMonths??Math.max(MILITARY_PAY_RULES.branchMonths[service.branch]||service.remainingMonths,service.remainingMonths);
 if(!Number.isInteger(total)||total<service.remainingMonths||total>36)throw new RangeError('전체 복무기간을 확인해 주세요.');
 return{version:MILITARY_PAY_RULES.version,referenceYear:2026,activatedAtMonth:state.totalMonths,totalServiceMonths:total,servedMonthsAtActivation:total-service.remainingMonths,lastProcessedMonth:state.totalMonths,payments:[]};
}
export function progressMilitaryPay(state){
 if(!state.service?.active||state.phase==='ended')return null;
 const pay=structuredClone(state.service.pay||createMilitaryPay(state)),atMonth=state.totalMonths+1;if(!pay||pay.lastProcessedMonth>=atMonth)return null;
 if(atMonth!==pay.lastProcessedMonth+1||pay.servedMonthsAtActivation+pay.payments.length>=pay.totalServiceMonths)throw new RangeError('군급여 지급 월이 이어지지 않습니다.');
 const serviceMonth=pay.servedMonthsAtActivation+pay.payments.length+1,{rank,grossWan}=militaryRankForMonth(serviceMonth),contributionWan=q(Math.min(grossWan,55)),netWan=q(grossWan-contributionWan),payment={atMonth,serviceMonth,rank,grossWan,contributionWan,netWan};
 pay.payments.push(payment);pay.lastProcessedMonth=atMonth;
 return{pay,payment,cash:q(state.cash+grossWan)};
}
export function militaryPaySummary(state){
 const pay=state.service?.pay||(state.service?.active?createMilitaryPay(state):null);if(!pay)return null;
 const active=state.service.active&&state.phase!=='ended',servedMonths=pay.servedMonthsAtActivation+pay.payments.length,currentServiceMonth=Math.min(pay.totalServiceMonths,servedMonths+(active?1:0)),current=militaryRankForMonth(Math.max(1,currentServiceMonth)),lastPayment=pay.payments.at(-1);
 return{active,branch:state.service.branch,rank:current.rank,servedMonths,currentServiceMonth,policyTotalMonths:pay.totalServiceMonths,remainingMonths:Math.max(0,pay.totalServiceMonths-servedMonths),monthlyPayWan:current.grossWan,lastPayment:lastPayment?structuredClone(lastPayment):null,cumulativePaidWan:q(pay.payments.reduce((n,p)=>n+p.grossWan,0)),cumulativeContributionsWan:q(pay.payments.reduce((n,p)=>n+p.contributionWan,0)),cumulativeNetWan:q(pay.payments.reduce((n,p)=>n+p.netWan,0)),paidMonths:pay.payments.length};
}
export function validMilitaryPay(state){try{
 const pay=state?.service?.pay;if(pay===undefined)return true;
 if(!pay||pay.version!==MILITARY_PAY_RULES.version||pay.referenceYear!==2026||!integer(pay.activatedAtMonth)||pay.activatedAtMonth>state.totalMonths||!integer(pay.totalServiceMonths)||pay.totalServiceMonths<1||pay.totalServiceMonths>36||!integer(pay.servedMonthsAtActivation)||pay.servedMonthsAtActivation>=pay.totalServiceMonths||!Array.isArray(pay.payments)||pay.payments.length+pay.servedMonthsAtActivation>pay.totalServiceMonths||pay.lastProcessedMonth!==pay.activatedAtMonth+pay.payments.length||pay.lastProcessedMonth>state.totalMonths)return false;
 const savings=state.service.savings;
 if(!pay.payments.every((p,i)=>{const month=pay.servedMonthsAtActivation+i+1,rank=militaryRankForMonth(month),deposit=savings?.deposits.find(d=>d.atMonth===p.atMonth);return p.atMonth===pay.activatedAtMonth+i+1&&p.serviceMonth===month&&p.rank===rank.rank&&p.grossWan===rank.grossWan&&amount(p.contributionWan)&&p.contributionWan===Math.min(55,p.grossWan)&&p.netWan===q(p.grossWan-p.contributionWan)&&deposit?.contributionWan===p.contributionWan&&deposit.fundingSource==='military-pay'&&deposit.payWan===p.grossWan;}))return false;
 const served=pay.servedMonthsAtActivation+pay.payments.length;if(state.service.active)return pay.lastProcessedMonth===state.totalMonths&&state.service.remainingMonths===pay.totalServiceMonths-served;
 return state.service.remainingMonths===0&&served===pay.totalServiceMonths;
}catch{return false;}}
