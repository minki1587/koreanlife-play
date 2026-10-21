import {estateSummary} from './family-estate.mjs?v=economy-ui-2';
import {formatMoney} from './spending.mjs?v=economy-ui-2';
import {appendUiFacts} from './ui-copy.mjs?v=economy-ui-2';
const percent=n=>`${(n*100).toLocaleString('ko-KR',{maximumFractionDigits:4})}%`;
export function renderEstateDetails(s,{document=globalThis.document}={}){
 const e=estateSummary(s);if(!e)return null;
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;},section=make('section',undefined,'family-section');section.id='family-estates';section.append(make('h3','장례·유산 정산'));
 if(!e.records.length)section.append(make('p','아직 장례·유산 정산 기록이 없습니다.','family-note'));
 for(const b of e.batches)for(const r of b.records){
  const g=s.profile.birthFamily.guardians.find(g=>g.id===r.guardianId),details=make('details',undefined,'family-estate-record');details.open=true;details.append(make('summary',`${g.role} ${g.name}`));
  appendUiFacts(document,details,[['정산 시점',`내 나이 ${Math.floor(b.atMonth/12)}세 ${b.atMonth%12}개월`],['유산 지분',percent(r.ownershipShare)],['유산 현금',formatMoney(r.liquidWan)],['주택·보증금 지분 현금정산',formatMoney(r.propertyWan)],['유산 채무',formatMoney(r.estateDebtWan)],['장례비',formatMoney(r.funeralCostWan)],['장례비 · 유산에서 지급',formatMoney(r.estateFuneralWan)],['장례비 · 남은 가구 현금에서 지급',formatMoney(r.familyFuneralWan)],['장례비 · 내 소지금에서 지급',formatMoney(r.personalFuneralWan)],['미충당 장례비',formatMoney(r.unpaidFuneralWan)],['유산 채무 변제',formatMoney(r.debtPaidWan)],['미충당 유산채무 · 개인 이전 없음',formatMoney(r.unpaidEstateDebtWan)],['분배할 순재산',formatMoney(r.netWan)],['내 상속 수령액',formatMoney(r.personalInheritanceWan)],['남은 보호자에게 분배 · 가구 현금',formatMoney(r.familyInheritanceWan)],['형제자매에게 분배 · 별도 수령',formatMoney(r.siblingInheritanceWan)]],'family-facts');section.append(details);
 }
 if(e.closed)section.append(make('p','가구 유산 정산이 끝나 부모 지원이 종료됐습니다.','family-note'));
 return section;
}
