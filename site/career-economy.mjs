const clone=x=>structuredClone(x);
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
export function careerModelSnapshot(row){
  const m=row?.modeled;
  if(m?.status!=='model_estimate')return null;
  if(typeof m.modelVersion!=='string'||!positive(m.salary?.averageAnnualWan))throw new TypeError('직업 연봉 모형이 올바르지 않습니다.');
  const stages=m.careerWage?.stages;
  if(!Array.isArray(stages)||!stages.length||stages[0].minYears!==0||stages.some((s,i)=>!Number.isFinite(s.minYears)||s.minYears<0||!positive(s.annualWan)||(i&&s.minYears<=stages[i-1].minYears)))throw new TypeError('경력별 임금 모형이 올바르지 않습니다.');
  return{modelVersion:m.modelVersion,occupationId:row.id,annualRepresentativeWan:m.salary.averageAnnualWan,
    stages:stages.map(s=>({minYears:s.minYears,annualWan:s.annualWan,label:String(s.label||'')})),
    weeklyHours:m.workingTime?.weeklyHours??null,shiftLikelihood:m.workingTime?.shift?.likelihood??null,
    employmentTypes:(m.employmentType?.types||[]).map(x=>String(x.label)),sourceIds:clone(m.sourceIds||[])};
}
export function validCareerModel(model){
  if(!model||typeof model.modelVersion!=='string'||!/^know-[0-9]{6}$/.test(model.occupationId)||!positive(model.annualRepresentativeWan)||!Array.isArray(model.stages)||!model.stages.length||model.stages[0].minYears!==0)return false;
  return Array.isArray(model.employmentTypes)&&model.employmentTypes.every(v=>typeof v==='string')&&(model.weeklyHours===null||(typeof model.weeklyHours==='number'&&Number.isFinite(model.weeklyHours)&&model.weeklyHours>=0&&model.weeklyHours<=168))&&[null,'low','medium','high'].includes(model.shiftLikelihood)&&Array.isArray(model.sourceIds)&&model.sourceIds.every(v=>typeof v==='string')&&model.stages.every((s,i)=>typeof s.label==='string'&&Number.isFinite(s.minYears)&&s.minYears>=0&&positive(s.annualWan)&&(!i||s.minYears>model.stages[i-1].minYears));
}
export function careerModelIncome(model,experienceMonths,scale=1){
  if(!validCareerModel(model)||!Number.isInteger(experienceMonths)||experienceMonths<0||!positive(scale))throw new TypeError('경력 임금을 계산할 수 없습니다.');
  const years=experienceMonths/12;
  const stage=model.stages.filter(s=>s.minYears<=years).at(-1);
  return Math.round(stage.annualWan*scale*100)/100;
}
export function occupationModelIndex(catalog){
  const result={};
  for(const row of catalog?.occupations||[]){const snapshot=careerModelSnapshot(row);if(snapshot)result[row.id]=snapshot;}
  return result;
}
