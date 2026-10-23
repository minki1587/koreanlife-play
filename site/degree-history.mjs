const clone=value=>structuredClone(value),month=value=>Number.isInteger(value)&&value>=0&&value<=1800,finite=value=>typeof value==='number'&&Number.isFinite(value);
const keys=(value,list)=>!!value&&!Array.isArray(value)&&Object.keys(value).length===list.length&&list.every(key=>Object.hasOwn(value,key));
function snapshot(s,knownGraduation){
 const school=s?.schooling;if(school?.status!=='graduated')return null;
 const start=s.schoolJourney?.university?.startedMonth;
 const name=school.school?.name||'이전 대학 과정';
 return{optionId:school.educationOptionId||`legacy:${name}`,field:typeof school.major==='string'?school.major:null,fieldLabel:school.majorLabel||name,durationMonths:school.durationMonths,studyMonths:school.progressMonths,startedAtMonth:month(start)?start:null,graduatedAtMonth:knownGraduation?s.totalMonths:null,recordedAtMonth:s.totalMonths,school:{name,region:school.school?.region||'',type:school.school?.type||'',annual:school.school?.annual??0}};
}
const sameCourse=(a,b)=>a.optionId===b.optionId&&a.field===b.field&&a.startedAtMonth===b.startedAtMonth;
function archive(s,knownGraduation){
 if(s.degreeHistory!==undefined&&!validDegreeHistory(s))throw new TypeError('완료한 학위 기록을 확인해 주세요.');
 const history=s.degreeHistory?clone(s.degreeHistory):{version:1,activatedAtMonth:s.totalMonths,completed:[]},entry=snapshot(s,knownGraduation);
 if(entry&&!history.completed.some(row=>sameCourse(row,entry)))history.completed.push(entry);
 return history;
}
export const ensureDegreeHistory=s=>archive(s,false);
export const recordDegreeCompletion=s=>archive(s,true);
export function completedDegrees(s){
 const rows=clone(s?.degreeHistory?.completed||[]),current=snapshot(s,false);
 if(current&&!rows.some(row=>sameCourse(row,current)))rows.push(current);return rows;
}
export function canStartSecondDegree(s){return!!s?.degreeHistory&&s.schooling?.status==='graduated'&&!s.academy&&s.phase!=='ended'&&!s.service?.active;}
/** Old college completion is credited without inventing past school admissions. */
export function prepareDegreeJourney(s,data){
 if(s.schoolJourney)return clone(s.schoolJourney);
 if(!canStartSecondDegree(s)||!data?.educationOptions?.modelVersion)throw new Error('완료한 대학 학력 기록을 먼저 확인해 주세요.');
 return{schemaVersion:1,modelVersion:data.educationOptions.modelVersion,highestLevel:4,completedStages:[],legacyCreditLevel:3,current:null,applications:[],lastOutcome:null,university:null};
}
export function validDegreeHistory(s){
 const history=s?.degreeHistory;if(history===undefined)return true;
 if(!keys(history,['version','activatedAtMonth','completed'])||history.version!==1||!month(history.activatedAtMonth)||history.activatedAtMonth>s.totalMonths||!Array.isArray(history.completed)||history.completed.length>32)return false;
 const seen=[];let previous=history.activatedAtMonth;
 for(const row of history.completed){
  if(!keys(row,['optionId','field','fieldLabel','durationMonths','studyMonths','startedAtMonth','graduatedAtMonth','recordedAtMonth','school'])||typeof row.optionId!=='string'||!row.optionId||row.optionId.length>250||(row.field!==null&&(typeof row.field!=='string'||!row.field||row.field.length>100))||typeof row.fieldLabel!=='string'||!row.fieldLabel||![48,72].includes(row.durationMonths)||row.studyMonths!==row.durationMonths||!month(row.recordedAtMonth)||row.recordedAtMonth<previous||row.recordedAtMonth>s.totalMonths||!row.school||!['name','region','type'].every(key=>typeof row.school[key]==='string')||!finite(row.school.annual)||row.school.annual<0)return false;
  if(row.startedAtMonth!==null&&(!month(row.startedAtMonth)||row.startedAtMonth+row.durationMonths>row.recordedAtMonth))return false;
  if(row.graduatedAtMonth!==null&&(!month(row.graduatedAtMonth)||row.graduatedAtMonth>row.recordedAtMonth||row.graduatedAtMonth<history.activatedAtMonth||row.startedAtMonth!==null&&row.graduatedAtMonth<row.startedAtMonth+row.durationMonths))return false;
  // A new completion must be backed by its retained admission. An observed
  // legacy completion is recorded once at activation, without a made-up date.
  const admission=s.schoolJourney?.applications?.find(a=>a.stage==='university'&&a.status==='accepted'&&a.optionId===row.optionId&&a.atMonth===row.startedAtMonth);
  if(row.optionId.startsWith('university-')&&(typeof row.field!=='string'||!row.optionId.endsWith(`-${row.field}`)))return false;
  if(row.graduatedAtMonth===null){if(row.recordedAtMonth!==history.activatedAtMonth||seen.length!==0)return false;}
  else if(row.graduatedAtMonth!==row.recordedAtMonth||!(row.optionId.startsWith('legacy:')&&row.field===null&&row.durationMonths===48&&row.startedAtMonth===null)&&!(row.startedAtMonth!==null&&admission&&admission.label===row.school.name))return false;
  const current=snapshot(s,false);
  if(current&&sameCourse(current,row)&&['field','durationMonths','studyMonths'].some(key=>current[key]!==row[key]))return false;
  if(seen.some(value=>sameCourse(value,row)))return false;seen.push(row);previous=row.recordedAtMonth;
 }
 return true;
}
