import {economicAnnualSalaryWan} from './economic-life.mjs?v=home-20261024';
import {livingCostSummary} from './engine.mjs?v=home-20261024';
import {investmentSummary} from './market-economy.mjs?v=home-20261024';
import {monthlyAutomaticConsumptionWan} from './income-rules.mjs?v=home-20261024';
import {homeValueWan,mortgageBalanceWan} from './home-ownership.mjs?v=home-20261024';

/** The protagonist's portfolio is separate from parents, partners and child trusts. */
export function personalFinanceOverview(state){
 const portfolio=investmentSummary(state);
 return{cashWan:state.cash,propertyWan:portfolio.totals.propertyValueWan+homeValueWan(state),investmentWan:portfolio.totals.securityValueWan,debtWan:state.debt+mortgageBalanceWan(state),annualSalaryWan:economicAnnualSalaryWan(state),monthlyLivingWan:Math.round((livingCostSummary(state).totalWan+monthlyAutomaticConsumptionWan(state))*10000)/10000};
}
