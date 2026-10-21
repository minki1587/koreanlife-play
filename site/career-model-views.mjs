const hazardNames={"vdt_posture": "화면·자세 부담", "work_stress": "업무 피로·스트레스", "ergonomic": "반복동작·근골격 부담", "customer_aggression": "고객·대인 응대 부담", "machinery": "기계·도구 접촉", "fall_height": "높이·추락 상황", "electricity": "전기 접촉", "chemicals": "화학물질 취급", "noise": "소음 노출", "heat": "고열·폭염 작업", "biological": "감염·생물학적 접촉", "confined_space": "밀폐공간 작업", "traffic": "운전·운반·이동", "fire": "화재·폭발 상황", "dust": "분진 발생 작업", "water": "수상·수중 주변 작업"};
const text=v=>typeof v==='string'?v.trim():'';
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const num=v=>finite(v)?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(v):'미확인';
const names={analytical:'분석·문제 해결',communication:'소통·협업',physical:'신체 활동',precision:'정밀·주의',digital:'디지털 활용'};

/** Model values stay separate from the untouched observed and legal records. */
export function careerModelFieldViews(row){
  const m=row?.modeled;
  if(m?.status!=='model_estimate')return[];
  const result=[];
  const field=(key,label,summary,lines=[],notes=[],extraIds=[])=>result.push({key,label,summary,lines,notes:notes.filter(Boolean).map(v=>v.replaceAll('share는 null이며','구성비는 제공하지 않으며').replaceAll('low/medium/high','낮음·있음·높음').replaceAll('imputed:true','보완한 값')),missingReason:'',sourceIds:[...new Set([...(extraIds.length?extraIds:m.sourceIds||[])].filter(x=>typeof x==='string'))]});
  const salary=m.salary||{};
  field('modeledSalary','연봉 대표값 · 게임 추정',`${num(salary.averageAnnualWan)}만원/년`,[],[salary.method==='official_monthly_aggregate_annualized_proxy'?'공식 월 임금 집계를 연환산한 직업 대리값':salary.method,salary.note],salary.sourceIds||[]);
  const employment=m.employmentType||{};
  field('employmentType','고용형태 · 게임 추정',(employment.types||[]).map(v=>text(v.label)+(finite(v.share)?` ${num(v.share*100)}%`:'')).join(' · ')||'미확인',[],[employment.note],employment.sourceIds||[]);
  const time=m.workingTime||{},shift=time.shift||{};
  field('workingTime','근무시간·교대 · 게임 추정',`주 ${num(time.weeklyHours)}시간`,[`교대 가능성: ${{low:'낮음',medium:'있음',high:'높음'}[shift.likelihood]||'미확인'}`],[time.note,shift.note],time.sourceIds||[]);
  const career=m.careerWage||{};
  field('careerWage','경력별 연봉 · 게임 추정','같은 직종의 경력 구간별 대표값',(career.stages||[]).map(s=>`${text(s.label)||`${num(s.minYears)}년 이상`}: ${num(s.annualWan)}만원/년`),[career.note],career.sourceIds||[]);
  const ability=m.workAbilities||{};
  field('modeledAbilities','업무 능력 · 게임 추정','가상 능력 요구도 (0~100점)',Object.entries(names).map(([k,label])=>`${label}: ${num(ability.levels?.[k])}점`),[ability.note,'요구도 점수는 직업별 실측 평가나 개인의 적성 판정이 아닙니다.'],ability.sourceIds||[]);
  const risk=m.occupationalRisks||{};
  field('modeledRisks','업무상 위험 · 게임 추정',`위험 노출 강도 ${num(risk.level)}/4`,(risk.tags||[]).filter(v=>typeof v==='string').map(v=>hazardNames[v]||v),[risk.note,'노출 강도는 사고·사망 확률이 아닙니다. 연령별 사망확률에 직업 위험을 중복 가산하지 않습니다.'],risk.sourceIds||[]);
  return result;
}
