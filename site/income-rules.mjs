import {injuryImpact} from './injury-care.mjs?v=family-life-2';
export function monthlyWorkIncomeWan(s){
 return s.service?.active?0:s.salary/12*injuryImpact(s).workFactor;
}
