import {injuryImpact} from './injury-care.mjs?v=private-school-1';
import {economicAnnualSalaryWan} from './economic-life.mjs?v=private-school-1';
export function monthlyWorkIncomeWan(s){
 return s.service?.active?0:economicAnnualSalaryWan(s)/12*injuryImpact(s).workFactor;
}
