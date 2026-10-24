import {injuryImpact} from './injury-care.mjs?v=living-costs-20261024';
import {economicAnnualSalaryWan} from './economic-life.mjs?v=living-costs-20261024';
import {progressMilitaryPay} from './military-pay.mjs?v=living-costs-20261024';
import {employmentIncomeFactor} from './employment-contract.mjs?v=living-costs-20261024';
import {lifestyleConsumptionFactor} from './living-costs.mjs?v=living-costs-20261024';
export function monthlyWorkIncomeWan(s){
 return s.service?.active?0:economicAnnualSalaryWan(s)/12*injuryImpact(s).workFactor*employmentIncomeFactor(s);
}
/** The same recurring consumption is used by settlement, previews and budgets. */
export function monthlyAutomaticConsumptionWan(s){
 const saving=Number.isFinite(s.saving)?s.saving:.18;
 return s.age>=19?monthlyWorkIncomeWan(s)*(1-saving)*.35*lifestyleConsumptionFactor(s):0;
}
/** Preview only. Payroll credits gross pay and funds the deposit in the engine. */
export function monthlyMilitaryNetIncomeWan(s){return progressMilitaryPay(s)?.payment.netWan||0;}
