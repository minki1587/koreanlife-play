import {estateSummary} from './family-estate.mjs?v=decision-popup-1';
import {formatMoney} from './spending.mjs';
const percent=n=>`${(n*100).toLocaleString('ko-KR',{maximumFractionDigits:4})}%`;
export function renderEstateDetails(s,{document=globalThis.document}={}){
 const e=estateSummary(s);if(!e)return null;const make=(tag,text,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;},section=make('section',undefined,'family-section');section.id='family-estates';section.append(make('h3','장례·유산 정산'));
 section.append(make('p',`부모 사망은 ${s.familyEstate.mortality.referenceYear}년 수집 생명표의 연령대별 연간 확률을 월 확률 1 − (1 − 연간확률)^(1/12)로 환산합니다. 100세 이상은 기존 꼬리 구간의 게임 가정을 적용합니다.`,'family-note'));
 if(!e.records.length)section.append(make('p','아직 장례·유산 정산 기록이 없습니다. 이전 사망·상속을 소급 생성하지 않습니다.','family-note'));
 for(const b of e.batches)for(const r of b.records){const g=s.profile.birthFamily.guardians.find(g=>g.id===r.guardianId),details=make('details',undefined,'family-estate-record');details.open=true;details.append(make('summary',`${g.role} ${g.name} · 내 나이 ${Math.floor(b.atMonth/12)}세 ${b.atMonth%12}개월 정산`));const dl=make('dl',undefined,'family-facts');
  for(const [label,value]of [['유산 지분',percent(r.ownershipShare)],['유산 현금',formatMoney(r.liquidWan)],['주택·보증금 지분 현금정산',formatMoney(r.propertyWan)],['유산 채무',formatMoney(r.estateDebtWan)],['장례비 설정',formatMoney(r.funeralCostWan)],['장례비 · 유산에서 지급',formatMoney(r.estateFuneralWan)],['장례비 · 남은 가구 현금에서 지급',formatMoney(r.familyFuneralWan)],['장례비 · 내 소지금에서 지급',formatMoney(r.personalFuneralWan)],['미충당 장례비',formatMoney(r.unpaidFuneralWan)],['유산 채무 변제',formatMoney(r.debtPaidWan)],['미충당 유산채무 · 개인 이전 없음',formatMoney(r.unpaidEstateDebtWan)],['분배할 순재산',formatMoney(r.netWan)],['내 상속 수령액',formatMoney(r.personalInheritanceWan)],['남은 보호자에게 분배 · 가구 현금',formatMoney(r.familyInheritanceWan)],['형제자매에게 분배 · 별도 수령',formatMoney(r.siblingInheritanceWan)]]){const row=make('div',undefined,'family-fact');row.append(make('dt',label),make('dd',value));dl.append(row);}details.append(dl);section.append(details);
 }
 section.append(make('p',`장례비 ${formatMoney(e.funeralCostWan)} 및 지분·순재산 균등 분배·부동산 평가액 현금정산은 게임 가정입니다. 실제 상속 절차·법정 지분·세금·장례비 평균은 재현하지 않습니다. 미충당 비용·채무는 기록하며 유산채무·미충당 장례비를 새 개인 대출로 전환하지 않습니다.${e.closed?' 남은 보호자가 없어 가구 계정과 지원을 종료했습니다.':''}`,'family-note'));
 return section;
}
