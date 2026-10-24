export function lifeHealthFacts(summary){
 if(!summary)return[];
 const facts=[['현재 상태',summary.statusLabel]];
 if(summary.injuryLabel&&summary.remainingRecoveryMonths>0){
  facts.push(['부상',summary.injuryLabel],['남은 회복 기간',`${summary.remainingRecoveryMonths}개월`],['부상으로 줄어든 건강',String(summary.healthLoss)],['회복한 건강',String(summary.recoveredHealth)]);
 }
 return facts;
}

export function lifeEndingReason(ending){
 const labels={
  'military-incident':'군 복무 중 사고로 삶을 마쳤습니다.',
  'daily-incident':'일상 중 사고로 삶을 마쳤습니다.',
  'military-injury':'군 복무 중 입은 부상으로 건강이 소진되어 삶을 마쳤습니다.',
  'daily-injury':'일상 중 입은 부상으로 건강이 소진되어 삶을 마쳤습니다.',
  'military-health':'군 복무 중 건강이 소진되어 삶을 마쳤습니다.',
  'daily-health':'건강이 소진되어 삶을 마쳤습니다.',
 };
 if(labels[ending?.cause])return labels[ending.cause];
 if(ending?.type==='death'&&!ending.cause&&Number.isFinite(ending.annualProbability))return '연령대별 사망률에 따른 추첨으로 삶을 마쳤습니다.';
 return '';
}

export function lifeHealthHistory(summary){
 return [...(summary?.incidentHistory||[])].reverse().map(event=>({
  when:`${Math.floor(event.atMonth/12)}세 ${event.atMonth%12}개월`,
  title:event.title,
  facts:[event.context==='military'?'군 복무 중':'일상 중',...(Number.isFinite(event.healthDelta)&&Number(event.healthDelta.toFixed(1))!==0?[`건강 ${event.healthDelta>0?'+':''}${Number(event.healthDelta.toFixed(1))}`]:[])],
 }));
}
