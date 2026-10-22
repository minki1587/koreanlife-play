import {economicAnnualSalaryWan} from './economic-life.mjs?v=review-two-1';
import {livingCostSummary} from './engine.mjs?v=review-two-1';
import {investmentSummary} from './market-economy.mjs?v=review-two-1';
import {monthlyAutomaticConsumptionWan} from './income-rules.mjs?v=review-two-1';

/** The protagonist's portfolio is separate from parents, partners and child trusts. */
export function personalFinanceOverview(state){
 const portfolio=investmentSummary(state);
 return{cashWan:state.cash,propertyWan:portfolio.totals.propertyValueWan,investmentWan:portfolio.totals.securityValueWan,debtWan:state.debt,annualSalaryWan:economicAnnualSalaryWan(state),monthlyLivingWan:Math.round((livingCostSummary(state).totalWan+monthlyAutomaticConsumptionWan(state))*10000)/10000};
}
