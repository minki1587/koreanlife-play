
export const ACADEMY_PATHS=Object.freeze([
 {id:'academy-army',branch:'army',name:'육군사관학교',branchLabel:'육군',region:'서울',city:'노원구',location:'seoul',locationLabel:'서울특별시 노원구',learningThreshold:78,healthThreshold:55},
 {id:'academy-navy',branch:'navy',name:'해군사관학교',branchLabel:'해군',region:'경남',city:'창원시 진해구',location:'regional',locationLabel:'경상남도 창원시 진해구',learningThreshold:80,healthThreshold:55},
 {id:'academy-airforce',branch:'airforce',name:'공군사관학교',branchLabel:'공군',region:'충북',city:'청주시 상당구',location:'regional',locationLabel:'충청북도 청주시 상당구',learningThreshold:82,healthThreshold:55}
].map(Object.freeze));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function validAcademyCatalog(rows){
 if(rows===undefined)return true;
 return Array.isArray(rows)&&rows.length===3&&new Set(rows.map(row=>row?.id)).size===3&&rows.every(row=>{
  const reviewed=ACADEMY_PATHS.find(item=>item.id===row?.id);
  return reviewed&&Object.entries(reviewed).every(([key,value])=>row[key]===value)&&row.durationMonths===48&&row.annualTuitionWan===0&&row.support?.tuition===true&&row.support?.lodging===true&&row.support?.meals===true;
 });
}
function firstAcademyApplication(s){return s?.schoolJourney?.applications?.find(a=>a.stage==='university'&&a.cycle===s.age&&a.selection==='academy');}
export function academyAssessment(s,row){
 const reasons=[],first=firstAcademyApplication(s),learn=first?.learn??s?.learn,health=first?.health??s?.health;
 if(!s?.schoolJourney)reasons.push('학교 교육 기록이 있는 삶에서 지원할 수 있습니다.');
 if(s?.phase==='ended')reasons.push('종료된 삶에서는 지원할 수 없습니다.');
 if(s?.phase!=='running'&&!(s?.phase==='decision'&&s.pendingDecision==='education'))reasons.push('현재 갈림길을 먼저 마쳐 주세요.');
 if(!Number.isInteger(s?.age)||s.age<19||s.age>=21)reasons.push('사관학교 지원은 19~20세에 가능합니다.');
 if(s?.schoolJourney&&s.schoolJourney.highestLevel<3)reasons.push('고교 과정을 먼저 마쳐 주세요.');
 if(s?.service?.active||s?.service?.completed)reasons.push('병사 복무를 시작했거나 마친 삶에서는 새 사관학교 경로를 선택할 수 없습니다.');
 if(s?.schooling?.status==='enrolled'||s?.schooling?.status==='graduated'||s?.academy)reasons.push('이미 시작한 대학·사관학교 과정이 있습니다.');
 if(!finite(s?.health)||s.health<row.healthThreshold)reasons.push(`현재 건강 ${row.healthThreshold} 이상이 필요합니다.`);
 if(s?.lifeHealth?.injury?.remainingRecoveryMonths>0)reasons.push('부상 회복을 마친 뒤 지원할 수 있습니다.');
 const attempts=(s?.schoolJourney?.applications||[]).filter(a=>a.stage==='university'&&a.cycle===s.age);
 if(attempts.some(a=>a.optionId===row.id))reasons.push('같은 학년도에 같은 사관학교를 다시 지원할 수 없습니다.');
 if(attempts.some(a=>['accepted','deferred'].includes(a.status)))reasons.push('이 학년도의 진학 선택을 이미 마쳤습니다.');
 const rejected=attempts.filter(a=>a.selection==='academy'&&a.status==='rejected');
 if(rejected.length&&row.learningThreshold>=Math.min(...rejected.map(a=>a.learningThreshold)))reasons.push('불합격 후에는 지원 기준이 더 낮은 사관학교나 일반대학을 선택해 주세요.');
 const score=(finite(learn)?learn:0)*.7+(finite(health)?health:0)*.3;
 return{eligible:reasons.length===0,reasons,learn,health,selectionScore:score,admissionChance:clamp(.4+(score-row.learningThreshold)/70,.03,.85)};
}
export function academyOptions(s,filters={},data){
 const rows=data?.educationOptions?.academyOptions;
 if(!rows)return[];
 if(!validAcademyCatalog(rows))throw new TypeError('검토한 사관학교 자료가 없습니다.');
 if(filters.path&&filters.path!=='academy')return[];
 return rows.filter(row=>(!filters.ownership||filters.ownership==='public')&&(!filters.location||filters.location===row.location)&&(!filters.field||filters.field==='military-academy')).map(row=>({
  ...structuredClone(row),academy:true,gamePath:true,stage:'university',selection:'academy',ownership:'public',ownershipLabel:'국립 사관학교',field:'military-academy',fieldLabel:`${row.branchLabel} 장교 양성`,label:row.name,guaranteed:false,
  ...academyAssessment(s,row),funding:{legacy:false,eligible:true,reasons:[],monthlyTuitionWan:0,familyMonthlyWan:0,personalMonthlyWan:0},
  fieldNote:'사관학교를 졸업하면 해당 군의 장교 경로로 이어집니다.',note:'학업·건강 선발식은 게임 설정이며 실제 개인의 입학·임관을 판정하지 않습니다.'
 }));
}
export function academyOfficerJob(branch){
 const row=ACADEMY_PATHS.find(item=>item.branch===branch);
 if(!row)throw new RangeError('알 수 없는 사관학교 군 구분입니다.');
 return{title:`${row.branchLabel} 소위(장교)`,status:'재직',income:3600,branchLabel:row.branchLabel};
}
export function academySupportActive(s){return s?.academy?.status==='cadet'&&s?.schooling?.status==='enrolled'&&s?.phase!=='ended';}
export function validAcademyState(s){
 const a=s?.academy;if(a===undefined)return true;
 const row=ACADEMY_PATHS.find(item=>item.id===a?.schoolId),school=s?.schooling;
 if(!a||a.schemaVersion!==1||!row||row.branch!==a.branch||!['cadet','officer','completed'].includes(a.status)||!Number.isInteger(a.startedMonth)||a.startedMonth<228||a.startedMonth>=252||a.startedMonth>s.totalMonths)return false;
 if(!school||school.gamePath!==true||school.educationOptionId!==row.id||school.major!=='military-academy'||school.durationMonths!==48||school.annualTuitionWan!==0||school.school?.annual!==0||s.service?.active||s.service?.savings||s.service?.pay)return false;
 if(a.status==='cadet'&&s.job?.status!=='재학'||a.status==='officer'&&(s.job?.title!==academyOfficerJob(a.branch).title||s.job?.status!=='재직'))return false;
 if(a.status==='cadet'){const gap=s.totalMonths-a.startedMonth-school.progressMonths;return school.status==='enrolled'&&Number.isInteger(school.progressMonths)&&school.progressMonths>=0&&school.progressMonths<48&&!school.fundingPaused&&a.graduatedMonth===null&&(gap===0||s.phase==='ended'&&gap===1);}
 return school.status==='graduated'&&school.progressMonths===48&&Number.isInteger(a.graduatedMonth)&&a.graduatedMonth===a.startedMonth+48&&a.graduatedMonth<=s.totalMonths;
}
