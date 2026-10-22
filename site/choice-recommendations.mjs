// Presentation only: callers supply the existing eligibility assessment. No draws,
// clock changes, fabricated candidate rows or alterations to the source catalog.
const number=value=>Number.isFinite(value)?value:0;
const id=row=>String(row?.id??'');
const byId=(a,b)=>id(a.row).localeCompare(id(b.row),'en');
function uniqueEligible(candidates){
 const seen=new Set();return candidates.filter(item=>item?.row&&typeof item.row.id==='string'&&item.assessment?.eligible===true&&!seen.has(item.row.id)&&seen.add(item.row.id));
}
function pick(candidates,strategies){
 const remaining=uniqueEligible(candidates),chosen=[];
 for(const {compare,reason,kind}of strategies){
  if(!remaining.length)break;
  const next=[...remaining].sort((a,b)=>compare(a,b,chosen)||byId(a,b))[0];
  chosen.push({row:next.row,reason:typeof reason==='function'?reason(next,chosen):reason,kind});
  remaining.splice(remaining.indexOf(next),1);
 }
 return chosen;
}
const effect=(item,key)=>number(item.row.effects?.[key]);
const focusKeys={learning:['learn'],health:['health'],relationships:['bond'],career:['skill','learn'],balance:['joy','health','learn','bond']};
export function focusEffectScore(row,focus='balance'){return(focusKeys[focus]||focusKeys.balance).reduce((sum,key)=>sum+number(row.effects?.[key]),0);}
const different=(field,a,b,chosen)=>{
 const selected=new Set(chosen.map(item=>field(item.row)));
 return Number(selected.has(field(a.row)))-Number(selected.has(field(b.row)));
};
export function recommendJobs(candidates){return pick(candidates,[
 {kind:'fit',compare:(a,b)=>number(b.assessment.hiringProbability)-number(a.assessment.hiringProbability),reason:'현재 학력·능력·거주 조건을 충족합니다.'},
 {kind:'pay',compare:(a,b)=>number(b.assessment.offeredAnnualWan)-number(a.assessment.offeredAnnualWan),reason:'지원 가능한 직업 중 제시 연봉이 높은 경로입니다.'},
 {kind:'alternative',compare:(a,b,chosen)=>different(row=>row.occupation?.classification?.middleGroupName||'',a,b,chosen),reason:'지원 가능한 다른 직업 경로를 함께 비교해보세요.'}
]);}
export function recommendEducation(candidates,{university=false}={}){return pick(candidates,[
 {kind:'cost',compare:(a,b)=>number(a.row.annualTuitionWan)-number(b.row.annualTuitionWan)||number(b.row.admissionChance)-number(a.row.admissionChance),reason:'지원 가능한 경로 중 학비 부담이 적습니다.'},
 {kind:'learning',compare:(a,b)=>university?number(b.row.admissionChance)-number(a.row.admissionChance):number(b.row.annualLearningBonus)-number(a.row.annualLearningBonus),reason:university?'현재 배움으로 합격 가능성이 높은 경로입니다.':'지원 가능한 경로 중 배움 보너스가 높습니다.'},
 {kind:'alternative',compare:(a,b,chosen)=>different(row=>university?row.field||row.branch||row.id:row.schoolType||row.ownership,a,b,chosen)||number(b.row.admissionChance)-number(a.row.admissionChance),reason:'다른 교육 경로와 비용·조건을 비교해보세요.'}
]);}
export function recommendHobbies(candidates,focus='balance'){return pick(candidates,[
 {kind:'cost',compare:(a,b)=>number(a.row.monthlyCostWan)-number(b.row.monthlyCostWan),reason:'매달 활동비 부담이 적은 취미입니다.'},
 {kind:'focus',compare:(a,b)=>focusEffectScore(b.row,focus)-focusEffectScore(a.row,focus),reason:'현재 삶의 초점과 맞는 효과가 있습니다.'},
 {kind:'alternative',compare:(a,b,chosen)=>different(row=>row.type,a,b,chosen)||number(a.row.monthlyCostWan)-number(b.row.monthlyCostWan),reason:'다른 유형의 활동도 비교해보세요.'}
]);}
export function recommendSpending(candidates,focus='balance'){return pick(candidates,[
 {kind:'cost',compare:(a,b)=>number(a.assessment.costWan)-number(b.assessment.costWan),reason:'지금 선택 가능한 저비용 활동입니다.'},
 {kind:'focus',compare:(a,b)=>focusEffectScore(b.row,focus)-focusEffectScore(a.row,focus),reason:'현재 삶의 초점에 맞는 한 달 활동입니다.'},
 {kind:'alternative',compare:(a,b,chosen)=>different(row=>row.category,a,b,chosen)||effect(b,'joy')-effect(a,'joy'),reason:'다른 종류의 한 달 활동도 비교해보세요.'}
]);}
