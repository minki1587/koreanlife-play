import {livingCostSummary} from './engine.mjs?v=ui-spouse-1';

/** Personal property and investment ledgers do not exist yet; parent assets stay separate. */
export function personalFinanceOverview(state){
 return{cashWan:state.cash,propertyWan:0,investmentWan:0,debtWan:state.debt,annualSalaryWan:state.salary,monthlyLivingWan:livingCostSummary(state).totalWan};
}
