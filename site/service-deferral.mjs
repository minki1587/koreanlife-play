import {protagonistGender} from './person-identity.mjs?v=refinements-1';
import {injuryImpact,pendingInjuryCare} from './injury-care.mjs?v=refinements-1';
const clone=value=>structuredClone(value),month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
export const SERVICE_DEFERRAL_RULES=Object.freeze({version:1,outsideUniversityLimitMonths:24,kind:'game_assumption'});
export const activeUniversity=s=>s?.schooling?.status==='enrolled'&&!s.schooling.fundingPaused&&!s.academy;
function eligibleHost(s){return protagonistGender(s)==='남성'&&!s.academy&&!s.service?.active&&!s.service?.branch&&!s.service?.pay&&!s.service?.savings;}
function pastOutside(s,start){
 const elapsed=s.totalMonths-start,events=[...(s.timelineArchive?.events||[]),...(s.timeline||[])],applications=(s.schoolJourney?.applications||[]).filter(row=>row.stage==='university'&&row.status==='accepted');
 if(!s.schooling&&!applications.length)return{outside:elapsed,evidence:'known-no-college'};
 if(!s.schoolJourney||s.timelineArchive?.hasEarlierGaps)return{outside:0,evidence:'unknown-college-history'};
 const intervals=[];
 for(const admission of applications){
  const degree=[...(s.degreeHistory?.completed||[]),...(s.schooling?[{optionId:s.schooling.educationOptionId,school:s.schooling.school,graduatedAtMonth:s.schooling.status==='graduated'?null:undefined}]:[])].find(row=>row.optionId===admission.optionId);
  const graduation=degree?.graduatedAtMonth??events.find(event=>event.type==='milestone'&&event.title===`${degree?.school?.name}의 학업을 마쳤다`&&event.age*12+event.month>=admission.atMonth)?.age;
  let end=s.totalMonths;
  if(typeof graduation==='number'){
   const event=events.find(event=>event.type==='milestone'&&event.title===`${degree?.school?.name}의 학업을 마쳤다`&&event.age*12+event.month>=admission.atMonth);
   end=degree?.graduatedAtMonth??(event?event.age*12+event.month:s.totalMonths);
  }else if(!s.schooling||s.schooling.educationOptionId!==admission.optionId||s.schooling.status==='graduated')return{outside:0,evidence:'unknown-college-history'};
  intervals.push({start:admission.atMonth,end});
 }
 let outside=0;
 for(let opening=start;opening<s.totalMonths;opening++){
  const enrolled=intervals.some(row=>opening>=row.start&&opening<row.end);
  const lastPause=events.filter(event=>event.type==='household-school'&&['학비 준비를 위해 휴학했다','준비한 학비로 복학했다'].includes(event.title)&&event.age*12+event.month<=opening).at(-1);
  if(!enrolled||lastPause?.title==='학비 준비를 위해 휴학했다')outside++;
 }
 return{outside,evidence:'recorded-college-history'};
}
function create(s,start,migration){
 if(!eligibleHost(s)||!month(start)||start>s.totalMonths)throw new Error('미복무 남성의 입대 유예 기록에서 시작해 주세요.');
 const prior=migration?pastOutside(s,start):{outside:0,evidence:'new'},overdue=migration&&prior.outside>=24;
 return{version:1,activatedAtMonth:s.totalMonths,deferredAtMonth:start,initialOutsideMonths:prior.outside,evidence:prior.evidence,lastProcessedMonth:s.totalMonths,months:[],status:overdue?'legacy-expired':'active',deadlineReachedAtMonth:overdue?s.totalMonths:null,resolvedAtMonth:null};
}
export function beginServiceDeferral(s){
 if(s.serviceDeferral||s.phase!=='decision'||s.pendingDecision!=='service'||s.totalMonths!==252)throw new Error('21세 복무 갈림길에서 유예를 시작해 주세요.');
 return create(s,s.totalMonths,false);
}
export function enableServiceDeferral(s){
 if(s.serviceDeferral!==undefined)return clone(s.serviceDeferral);
 if(s.phase==='ended'||!['recovering','ready'].includes(s.serviceReview?.status))return undefined;
 return create(s,s.serviceReview.deferredAtMonth,true);
}
/** Call after clock advancement; pass opening-college status before graduation. */
export function progressServiceDeferral(s,{college=activeUniversity(s)}={}){
 const source=s?.serviceDeferral;if(source===undefined)return null;
 if(!validServiceDeferral(s))throw new TypeError('입대 유예 개월 기록을 확인해 주세요.');
 const next=clone(source);if(s.totalMonths===next.lastProcessedMonth||s.phase==='ended')return{serviceDeferral:next,events:[]};
 if(s.totalMonths!==next.lastProcessedMonth+1||typeof college!=='boolean')throw new Error('입대 유예 기록을 한 달씩 이어 주세요.');
 next.lastProcessedMonth=s.totalMonths;
 if(!['active','required','waiting-recovery'].includes(next.status))return{serviceDeferral:next,events:[]};
 if(s.service?.active||s.service?.branch){next.status='resolved';next.resolvedAtMonth=s.totalMonths;return{serviceDeferral:next,events:[]};}
 next.months.push({atMonth:s.totalMonths,college});
 const outside=next.initialOutsideMonths+next.months.filter(row=>!row.college).length,events=[];
 if(outside>=24){
  if(next.deadlineReachedAtMonth===null)next.deadlineReachedAtMonth=s.totalMonths;
  const blocked=pendingInjuryCare(s)||injuryImpact(s).active,newStatus=blocked?'waiting-recovery':'required';
  if(next.status!==newStatus)events.push({type:'service-deadline',title:blocked?'회복을 마친 뒤 복무를 선택해야 한다':'입대 유예 기간을 마쳐 복무를 선택한다',text:'군은 직접 선택합니다.',changes:[]});
  next.status=newStatus;
 }
 return{serviceDeferral:next,events};
}
export function serviceDeferralSummary(s){const d=s?.serviceDeferral;if(!d)return null;const outsideMonths=d.initialOutsideMonths+d.months.filter(row=>!row.college).length;return{status:d.status,outsideMonths,remainingMonths:Math.max(0,24-outsideMonths),collegeExcluded:activeUniversity(s),required:['required','waiting-recovery'].includes(d.status),canChoose:d.status==='required'&&!pendingInjuryCare(s)&&!injuryImpact(s).active,legacyExpired:d.status==='legacy-expired',evidence:d.evidence};}
export function resolveServiceDeferral(s){
 if(!s.serviceDeferral||!s.service?.branch||s.serviceDeferral.status==='legacy-expired')throw new Error('실제 입대 경로에서 유예 기록을 마쳐 주세요.');
 return{...clone(s.serviceDeferral),status:'resolved',resolvedAtMonth:s.totalMonths,lastProcessedMonth:s.totalMonths};
}
export function validServiceDeferral(s){
 const d=s?.serviceDeferral;if(d===undefined)return true;
 if(!d||Object.keys(d).length!==10||!['version','activatedAtMonth','deferredAtMonth','initialOutsideMonths','evidence','lastProcessedMonth','months','status','deadlineReachedAtMonth','resolvedAtMonth'].every(key=>Object.hasOwn(d,key))||d.version!==1||!month(d.activatedAtMonth)||d.activatedAtMonth>s.totalMonths||!month(d.deferredAtMonth)||d.deferredAtMonth>d.activatedAtMonth||!Number.isInteger(d.initialOutsideMonths)||d.initialOutsideMonths<0||d.initialOutsideMonths>d.activatedAtMonth-d.deferredAtMonth||!['new','known-no-college','recorded-college-history','unknown-college-history'].includes(d.evidence)||!month(d.lastProcessedMonth)||d.lastProcessedMonth<d.activatedAtMonth||d.lastProcessedMonth>s.totalMonths||!Array.isArray(d.months)||d.months.length>1800||!['active','required','waiting-recovery','legacy-expired','resolved'].includes(d.status)||protagonistGender(s)!=='남성'||s.academy)return false;
 if(!d.months.every((row,index)=>row&&Object.keys(row).length===2&&row.atMonth===d.activatedAtMonth+index+1&&row.atMonth<=d.lastProcessedMonth&&typeof row.college==='boolean'))return false;
 if(d.evidence==='new'&&(d.initialOutsideMonths!==0||d.deferredAtMonth!==d.activatedAtMonth)||d.evidence==='unknown-college-history'&&d.initialOutsideMonths!==0||d.evidence==='known-no-college'&&d.initialOutsideMonths!==d.activatedAtMonth-d.deferredAtMonth)return false;
 const outside=d.initialOutsideMonths+d.months.filter(row=>!row.college).length;
 if(d.deadlineReachedAtMonth!==null&&(!month(d.deadlineReachedAtMonth)||d.deadlineReachedAtMonth<d.activatedAtMonth||d.deadlineReachedAtMonth>d.lastProcessedMonth))return false;
 if(['required','waiting-recovery','legacy-expired'].includes(d.status)&&(outside<24||d.deadlineReachedAtMonth===null))return false;
 if(d.status==='active'&&(outside>=24||d.deadlineReachedAtMonth!==null))return false;
 if(d.status==='legacy-expired'&&(d.initialOutsideMonths<24||d.months.length))return false;
 if(d.status==='resolved'){
  if(!s.service?.branch||!month(d.resolvedAtMonth)||d.resolvedAtMonth<d.activatedAtMonth||d.resolvedAtMonth>s.totalMonths||d.months.some(row=>row.atMonth>d.resolvedAtMonth))return false;
 }else if(d.resolvedAtMonth!==null||s.service?.active||s.service?.branch)return false;
 if(['active','required','waiting-recovery'].includes(d.status)&&d.months.length!==d.lastProcessedMonth-d.activatedAtMonth)return false;
 const crossing=d.initialOutsideMonths>=24?d.activatedAtMonth:d.months.filter(row=>!row.college)[23-d.initialOutsideMonths]?.atMonth??null;
 if(d.deadlineReachedAtMonth!==crossing)return false;
 return true;
}
