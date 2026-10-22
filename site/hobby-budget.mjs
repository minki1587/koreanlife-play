// A cap constrains the whole hobby bundle. It never creates a new payment,
// family withdrawal, replacement activity, or consent for another action.
export const MAX_HOBBY_MONTHLY_BUDGET_WAN=1000000000;
export function validHobbyMonthlyBudget(value){return value===undefined||value===null||typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=MAX_HOBBY_MONTHLY_BUDGET_WAN;}
export function hobbyMonthlyBudget(s){const value=s?.hobbies?.monthlyBudgetWan;return value===undefined||value===null?null:value;}
export function hobbyWithinMonthlyBudget(s,costWan){const cap=hobbyMonthlyBudget(s);return cap===null||costWan<=cap+1e-7;}
