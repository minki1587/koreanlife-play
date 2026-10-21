const probability=q=>typeof q==='number'&&Number.isFinite(q)&&q>=0&&q<=1;
function fingerprint(m,seed){
  const raw=JSON.stringify([seed,m.modelVersion,m.referenceYear,m.maxAgeMonths,m.annualQx,m.tailQx,m.capLabel,m.sourceUrl]);
  let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);
  return `mortality-v1-${(h>>>0).toString(16).padStart(8,'0')}`;
}
export function mortalitySnapshot(table,seed){
  const annual=table?.annual;
  const cap=table?.maxAge?.completedMonths;
  const tail=table?.tail?.qx;
  if(!Array.isArray(annual)||annual.length!==100||annual.some((r,i)=>r.age!==i||!probability(r.qx))||!Number.isInteger(cap)||cap<=1200||cap>1800||!probability(tail))throw new TypeError('사망확률·최고령 기록의 실행 설정이 확정되지 않았습니다.');
  const m={schemaVersion:1,modelVersion:String(table.modelVersion),referenceYear:table.referenceYear,
    maxAgeMonths:cap,annualQx:annual.map(r=>r.qx),tailQx:tail,
    capLabel:String(table.maxAge.label||`${Math.floor(cap/12)}세 기록 기준`),
    capVerification:String(table.maxAge.verificationLevel||table.maxAge.status||''),
    sourceUrl:String(table.source?.url||table.sources?.[0]?.url||''),
    tailNote:String(table.tail.note||''),lastAgeChecked:-1};
  m.fingerprint=fingerprint(m,seed);return m;
}
export function validMortality(m,seed,age){
  return !!m&&m.schemaVersion===1&&typeof m.modelVersion==='string'&&Number.isInteger(m.referenceYear)&&m.referenceYear>=1900&&Number.isInteger(m.maxAgeMonths)&&m.maxAgeMonths>1200&&m.maxAgeMonths<=1800&&Array.isArray(m.annualQx)&&m.annualQx.length===100&&m.annualQx.every(probability)&&probability(m.tailQx)&&typeof m.capLabel==='string'&&typeof m.sourceUrl==='string'&&Number.isInteger(m.lastAgeChecked)&&m.lastAgeChecked>=-1&&m.lastAgeChecked<=age&&m.fingerprint===fingerprint(m,seed);
}
export function annualDeathProbability(m,age){
  if(!Number.isInteger(age)||age<0)throw new RangeError('사망확률 연령이 올바르지 않습니다.');
  const q=age<100?m.annualQx[age]:m.tailQx;
  if(!probability(q))throw new TypeError('해당 연령의 확률이 없습니다.');return q;
}
export const lifeLimitMonths=s=>s?.mortality?.maxAgeMonths??960;
export function mortalityNotice(s){
  const m=s?.mortality;if(!m)return '이전 저장 기록: 80세 회고까지 진행하는 기존 규칙을 유지합니다.';
  const q=annualDeathProbability(m,s.age),band=s.age===0?'0세':s.age<5?'1~4세':s.age>=100?'100세 이상':`${Math.floor(s.age/5)*5}~${Math.floor(s.age/5)*5+4}세`;
  return `${m.referenceYear}년 생명표 · ${band}의 연간 확률 평균 ${(q*100).toLocaleString('ko-KR',{maximumFractionDigits:3})}% · 나이 진입 때 1회 추첨${s.age>=100?' · '+m.tailNote:''} · 상한: ${m.capLabel}`;
}
