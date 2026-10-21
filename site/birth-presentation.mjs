const number=(n,digits=4)=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:digits});
export function birthPresentation(city,source={}){
  if(city.metric==='mean-crude-birth-rate'){
    return {
      probabilityLabel:'추첨 확률 · 평균 조출생률 기준',
      weightLabel:'평균 조출생률 · 주민 1,000명당',
      weightText:number(city.weight)+'명',
      periodText:`${city.periodStart}~${city.periodEnd}년 · 관측 ${city.observedYears}개 연도`,
      method:`${city.periodStart}~${city.periodEnd}년의 확인된 연간 조출생률 ${city.observedYears}개를 단순평균한 ${number(city.weight,6)} ÷ 추첨 대상 지역 평균값의 합 ${number(city.totalWeight,6)}. 인구수나 출생아 수를 가중치로 사용하지 않습니다. 이는 게임에서 정한 지역 추첨 규칙이며 실제 출생아의 지역 분포 확률이 아닙니다.`,
      definition:source.description||[`원표 수록기간 ${source.periodStart??city.periodStart}~${source.periodEnd??city.periodEnd}년.`, '지역별 연간 조출생률(연간 출생아 수 ÷ 해당 연도 연앙인구 × 1,000)을 관측 연도에 걸쳐 단순평균하고, 추첨 대상 지역 평균값의 합으로 나눕니다.', source.cityDefinition||'특별시·광역시는 구·군 단위, 도는 시·군 단위를 사용합니다.', source.comparabilityNote||'', source.missingPolicy||'관측되지 않은 과거 연도를 추정하거나 결측값을 0으로 바꾸지 않습니다.'].filter(Boolean).join(' '),
      spinMessage:'과거 연간 조출생률의 평균을 가중치로 한 번 추첨했습니다. 지역이 나타나는 동안 잠시 기다려주세요.'
    };
  }
  return {probabilityLabel:'추첨 확률 · 이전 인구 기준',weightLabel:'주민등록인구',weightText:number(city.population,0)+'명',periodText:(source.sourceDate||'')+' 기준',method:`${number(city.population,0)}명 ÷ 전국 ${number(city.totalPopulation,0)}명. 이전 버전의 주민등록인구 비중에 따른 추첨입니다.`,definition:'이 자료는 이전 버전의 주민등록인구 기준입니다.',spinMessage:'지역을 한 번 추첨했습니다. 잠시 기다려주세요.'};
}
