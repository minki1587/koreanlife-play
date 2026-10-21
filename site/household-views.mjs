import {householdSummary} from './household-finance.mjs';
import {formatMoney} from './spending.mjs';
export function householdFacts(s){
 const h=householdSummary(s);if(!h)return [];
 const m=h.lastMonth;
 return [['내 소지금',formatMoney(s.cash)],['가구 금융자산',formatMoney(h.liquidAssetsWan)],['가구 주택·보증금',formatMoney(h.housingAssetWan)],['가구 부채',formatMoney(h.debtWan)],['월 가구 소득 예산',formatMoney(h.monthlyIncomeWan)],['월 주거비',formatMoney(h.monthlyHousingWan)],['월 추가 지원 여력',formatMoney(h.familyMonthlyCapacityWan)],['지난달 생활비 지원',formatMoney(m?.livingWan||0)],['지난달 용돈',formatMoney(m?.allowanceWan||0)],['지난달 학비 지원',formatMoney(m?.tuitionWan||0)],['지난달 취미비 지원',formatMoney(m?.hobbyWan||0)],['지난달 기본생활 보호',formatMoney(m?.protectionWan||0)]];
}
export function renderHouseholdPanel(host,s){
 const h=householdSummary(s);host.hidden=!h;if(!h)return;
 const doc=host.ownerDocument,list=host.querySelector('.household-overview');list.replaceChildren();
 for(const [label,value]of householdFacts(s).filter(([label])=>!['가구 주택·보증금','가구 부채','지난달 기본생활 보호'].includes(label))){const pair=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=value;pair.append(dt,dd);list.append(pair);}
 const note=host.querySelector('.household-status');
 note.textContent=h.eligible?'가구 소득·금융자산으로 생활비 → 학비 → 용돈 → 취미비 순서로 지원합니다. 집값·보증금과 내 소지금은 별도입니다.':'현재는 가구 지원 대상이 아닙니다. 교육·취미 비용은 내 소지금으로 준비합니다.';
 if(h.lastMonth?.fixedShortfallWan)note.textContent+=` 가구 기본 지출 미충당 ${formatMoney(h.lastMonth.fixedShortfallWan)}.`;
 if(h.lastMonth?.protectionWan)note.textContent+=` 가상 기본생활 보호 ${formatMoney(h.lastMonth.protectionWan)}는 생활비에만 적용됩니다.`;
}
