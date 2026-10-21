/** Focus contributions per month; other age, habit and work changes are added separately. */
const EFFECTS=Object.freeze({
  balance:[['만족',0.6/12]],
  learning:[['배움',1.4/12],['만족',0.2/12]],
  career:[['관계',-0.15/12],['만족',0.2/12]],
  health:[['건강',1.6/12],['만족',0.2/12]],
  relationships:[['관계',1.4/12],['만족',0.2/12]],
});
export function focusEffects(state){
  const focus=Object.hasOwn(EFFECTS,state?.focus)?state.focus:'balance';
  const facts=EFFECTS[focus].map(([label,amount])=>`${label} ${amount<0?'−':'+'}${Math.abs(amount).toLocaleString('ko-KR',{maximumFractionDigits:3})} / 월`);
  if(['재직','계약직','시간제'].includes(state?.job?.status)&&!state?.service?.active){
    if(focus==='career')facts.push('연봉 성장 +0.1% / 월');
    if(focus==='learning')facts.push('연봉 성장 +0.033% / 월');
  }
  return facts;
}
