import {livingCostSummary} from './engine.mjs?v=investment-1';
import {investmentSummary} from './market-economy.mjs?v=investment-1';

/** The protagonist's portfolio is separate from parents, partners and child trusts. */
export function personalFinanceOverview(state){
 const portfolio=investmentSummary(state);
 return{cashWan:state.cash,propertyWan:portfolio.totals.propertyValueWan,investmentWan:portfolio.totals.securityValueWan,debtWan:state.debt,annualSalaryWan:state.salary,monthlyLivingWan:livingCostSummary(state).totalWan};
}
