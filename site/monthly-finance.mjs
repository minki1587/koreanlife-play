import {formatMoney} from './spending.mjs?v=ux-design-1';
const q=n=>Math.round(n*10000)/10000;
export function financeMonthOpening(s){return{atMonth:s.totalMonths,cashWan:s.cash,debtWan:s.debt,ledger:structuredClone(s.ledger)};}
/** Report actual cash movements after the month, including discharge and death. */
export function monthlyFinanceEvent(s,opening,month){
 if(!month||s.totalMonths!==opening.atMonth+1)return null;
 const l=s.month===0&&s.lastYearLedger?.endMonth===s.totalMonths?s.lastYearLedger:s.ledger,d=k=>q((l[k]||0)-(opening.ledger[k]||0)),cashDelta=q(s.cash-opening.cashWan),debtDelta=q(s.debt-opening.debtWan);
 const militaryIncome=d('militaryIncome'),militaryContributions=d('militaryContributions'),support=month.supportWan,principal=d('militaryPrincipalReturned'),matching=d('militaryMatching'),militaryInterest=d('militaryInterest'),inheritance=d('inheritance'),funeral=d('funeral'),hobby=s.hobbies?.lastResult?.atMonth===s.totalMonths&&s.hobbies.lastResult.status==='applied'?s.hobbies.lastResult.costWan:0,childNet=q(d('childCosts')-d('familyContributions'));
 const newBorrowing=Math.max(0,q(debtDelta+month.debtPaidWan)),known=q(month.workIncomeWan+militaryIncome-militaryContributions+support+principal+matching+militaryInterest+inheritance-month.livingWan-month.automaticWan-month.tuitionWan-month.careWan-month.interestWan-month.debtPaidWan-hobby-childNet-funeral),other=q(cashDelta-known-newBorrowing),changes=[];
 const line=(label,value)=>changes.push(`${label} ${formatMoney(value)}`),optional=(label,value)=>{if(value)line(label,value);};
 line('근로수입',month.workIncomeWan);optional('군급여',militaryIncome);optional('군복무 적금 납입',militaryContributions);optional('가족 지원·용돈',support);
 line('기본 생활비·주거비',month.livingWan);line('자동 소비',month.automaticWan);optional('학비',month.tuitionWan);optional('돌봄비',month.careWan);optional('취미비',hobby);optional('내 자녀 양육비 부담',childNet);line('이자',month.interestWan);line('대출 원금 상환',month.debtPaidWan);
 optional('상속 수령',inheritance);optional('장례비 내 부담',funeral);optional('전역 적금 원금 반환',principal);optional('전역 적금 지원금',matching);optional('전역 적금 이자',militaryInterest);optional('추가 차입',newBorrowing);if(other)line(other>0?'그 밖의 수입':'그 밖의 지출',Math.abs(other));
 changes.push(`소지금 순증감 ${cashDelta>=0?'+':''}${formatMoney(cashDelta)}`);if(debtDelta)changes.push(`대출금 증감 ${debtDelta>=0?'+':''}${formatMoney(debtDelta)}`);
 return{title:'한 달의 돈 흐름',text:'',changes};
}
