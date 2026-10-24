import {activeUniversity} from './service-deferral.mjs?v=living-costs-20261024';
import {pendingInjuryCare,injuryImpact} from './injury-care.mjs?v=living-costs-20261024';
const clone=value=>structuredClone(value),month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const same=(a,b)=>{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));};
const KEYS=['version','activatedAtMonth','dischargedAtMonth','lastProcessedMonth','calendarAnchor','legacyExemptYears','years','actions'];
const keys=(value,list)=>!!value&&!Array.isArray(value)&&Object.keys(value).length===list.length&&list.every(key=>Object.hasOwn(value,key));
export const RESERVE_RULES=Object.freeze({version:1,trackYears:8,trainingYears:6,earlyYearsHours:32,laterYearsHours:20,studentHours:8,kind:'game_assumption',calendarAnchor:'life-year-zero'});
function discharge(s){const service=s?.service,settlement=service?.savings?.settlement;return!s?.academy&&!service?.active&&service?.remainingMonths===0&&['육군','해군','공군'].includes(service?.branch)&&service?.savings?.status==='matured'&&settlement?.reason==='maturity'&&month(settlement.atMonth)&&settlement.atMonth<=s.totalMonths?settlement.atMonth:null;}
const yearAt=(r,atMonth)=>Math.floor(atMonth/12)-Math.floor(r.dischargedAtMonth/12);
const baseHours=year=>year<=4?32:20;
function openCurrentYear(r,s){const year=yearAt(r,s.totalMonths);if(year<1||year>6||r.legacyExemptYears.includes(year)||r.years.some(row=>row.year===year))return;const student=activeUniversity(s);r.years.push({year,openedAtMonth:s.totalMonths,initialStudent:student,requiredHours:student?8:baseHours(year),completedHours:0,postponedUntilMonth:null});}
export function enableReserveService(s){
 if(s.reserveService!==undefined)return{reserveService:clone(s.reserveService),events:[]};
 const dischargedAtMonth=discharge(s);if(dischargedAtMonth===null||s.phase==='ended')return{reserveService:undefined,events:[]};
 const current=Math.floor(s.totalMonths/12)-Math.floor(dischargedAtMonth/12),r={version:1,activatedAtMonth:s.totalMonths,dischargedAtMonth,lastProcessedMonth:s.totalMonths,calendarAnchor:'life-year-zero',legacyExemptYears:Array.from({length:Math.max(0,Math.min(6,current-1))},(_,index)=>index+1),years:[],actions:[]};
 openCurrentYear(r,s);return{reserveService:r,events:[{type:'reserve-service',title:'전역 후 예비군 일정을 확인했다',text:'전역 다음 연도부터 예비군 연차를 계산합니다. 군 정보에서 이번 훈련 일정을 확인합니다.',changes:[]}]};
}
export function progressReserveService(s){
 const source=s?.reserveService;if(source===undefined)return enableReserveService(s);
 if(!validReserveService(s))throw new TypeError('예비군 훈련 기록을 확인해 주세요.');
 const r=clone(source);if(s.phase==='ended')return{reserveService:r,events:[]};
 if(s.totalMonths>r.lastProcessedMonth+1)throw new Error('예비군 일정을 한 달씩 이어 주세요.');
 const before=r.years.length;r.lastProcessedMonth=s.totalMonths;openCurrentYear(r,s);
 return{reserveService:r,events:r.years.length>before?[{type:'reserve-service',title:`예비군 ${yearAt(r,s.totalMonths)}년차 훈련을 준비한다`,text:'군 정보에서 훈련 참여와 회복 사유의 일정 조정을 선택할 수 있습니다.',changes:[]}]:[]};
}
export function reserveTrainingDue(s){
 const r=s?.reserveService;if(!r||s.phase!=='running'||pendingInjuryCare(s)||yearAt(r,s.totalMonths)<1||yearAt(r,s.totalMonths)>8)return null;
 const row=r.years.find(value=>value.completedHours<value.requiredHours&&(value.postponedUntilMonth===null||value.postponedUntilMonth<=s.totalMonths));if(!row)return null;
 const student=activeUniversity(s),hours=student?8:baseHours(row.year),recovering=injuryImpact(s).active;
 return{year:row.year,currentYear:yearAt(r,s.totalMonths),student,requiredHours:hours,remainingHours:Math.max(0,hours-row.completedHours),canAttend:!recovering,canPostpone:recovering,canReviewStudent:student&&!r.actions.some(action=>action.year===row.year&&action.type==='review-student'),title:`예비군 ${row.year}년차 훈련`,actions:['attend',...(recovering?['postpone-health']:[]),...(student&&!r.actions.some(action=>action.year===row.year&&action.type==='review-student')?['review-student']:[])]};
}
function applyRecord(r,action){
 const row=r.years.find(value=>value.year===action.year);if(!row)throw new Error('해당 연차 훈련 기록이 없습니다.');
 if(row.completedHours>=row.requiredHours||row.postponedUntilMonth!==null&&row.postponedUntilMonth>action.atMonth)throw new Error('이미 이수했거나 연기 중인 훈련입니다.');
 if(action.type==='attend'){if(action.injuryRemainingMonths!==0)throw new Error('회복 중에는 훈련에 참여할 수 없습니다.');row.requiredHours=action.student?8:baseHours(row.year);row.completedHours=row.requiredHours;row.postponedUntilMonth=null;}
 else if(action.type==='postpone-health'){if(action.injuryRemainingMonths<1)throw new Error('현재 회복 사유가 필요합니다.');row.postponedUntilMonth=action.atMonth+action.injuryRemainingMonths;}
 else if(action.type==='review-student'){if(!action.student||r.actions.some(value=>value.year===action.year&&value.type==='review-student'))throw new Error('현재 재학생 단축 훈련을 확인해 주세요.');row.requiredHours=8;}
 else throw new Error('예비군 선택을 확인해 주세요.');
 r.actions.push(clone(action));
}
export function reserveAction(s,type){
 if(!validReserveService(s))throw new TypeError('예비군 훈련 기록을 확인해 주세요.');
 const due=reserveTrainingDue(s);if(!due||!due.actions.includes(type))throw new Error('현재 예비군 훈련 일정에서 선택해 주세요.');
 const injuryRemainingMonths=injuryImpact(s).active?Math.max(1,s.lifeHealth.injury.remainingRecoveryMonths):0,r=clone(s.reserveService),action={type,year:due.year,atMonth:s.totalMonths,student:due.student,injuryRemainingMonths};applyRecord(r,action);
 const title=type==='attend'?`예비군 ${due.year}년차 훈련에 참여했다`:type==='postpone-health'?'회복 후로 예비군 훈련을 조정했다':'재학생 예비군 훈련 시간을 확인했다';
 return{reserveService:r,events:[{type:'reserve-training',title,text:'',changes:type==='attend'?[`${due.requiredHours}시간 이수`]:type==='postpone-health'?[`${injuryRemainingMonths}개월 뒤 재검토`]:['재학 중 단축 훈련 8시간']}]};
}
export function reserveSummary(s){const r=s?.reserveService;if(!r)return null;const currentYear=yearAt(r,s.totalMonths);return{currentYear,status:currentYear<1?'전역 연도 · 신규 훈련 없음':currentYear<=8?'예비군 편성 중':'예비군 편성 기간 종료',years:clone(r.years),completedHours:r.years.reduce((sum,row)=>sum+row.completedHours,0),outstandingHours:r.years.reduce((sum,row)=>sum+Math.max(0,row.requiredHours-row.completedHours),0),due:reserveTrainingDue(s)};}
export function validReserveService(s){
 const r=s?.reserveService;if(r===undefined)return true;
 if(!keys(r,KEYS)||r.version!==1||r.calendarAnchor!=='life-year-zero'||discharge(s)!==r.dischargedAtMonth||!month(r.activatedAtMonth)||r.activatedAtMonth<r.dischargedAtMonth||r.activatedAtMonth>s.totalMonths||!month(r.lastProcessedMonth)||r.lastProcessedMonth<r.activatedAtMonth||r.lastProcessedMonth>s.totalMonths||!Array.isArray(r.legacyExemptYears)||!same(r.legacyExemptYears,Array.from({length:Math.max(0,Math.min(6,yearAt(r,r.activatedAtMonth)-1))},(_,index)=>index+1))||!Array.isArray(r.years)||r.years.length>6||!Array.isArray(r.actions)||r.actions.length>1800)return false;
 const expectedYears=Array.from({length:Math.max(0,Math.min(6,yearAt(r,r.lastProcessedMonth)))},(_,index)=>index+1).filter(year=>!r.legacyExemptYears.includes(year));
 if(!same(r.years.map(row=>row?.year),expectedYears))return false;
 const rebuilt={...r,years:[],actions:[]};let previousYear=0;
 for(const row of r.years){if(!keys(row,['year','openedAtMonth','initialStudent','requiredHours','completedHours','postponedUntilMonth'])||!Number.isInteger(row.year)||row.year<1||row.year>6||row.year<=previousYear||r.legacyExemptYears.includes(row.year)||!month(row.openedAtMonth)||row.openedAtMonth!==Math.max(r.activatedAtMonth,(Math.floor(r.dischargedAtMonth/12)+row.year)*12)||row.openedAtMonth>r.lastProcessedMonth||yearAt(r,row.openedAtMonth)!==row.year||typeof row.initialStudent!=='boolean')return false;rebuilt.years.push({...row,requiredHours:row.initialStudent?8:baseHours(row.year),completedHours:0,postponedUntilMonth:null});previousYear=row.year;}
 let previousMonth=r.activatedAtMonth;
 try{for(const action of r.actions){if(!keys(action,['type','year','atMonth','student','injuryRemainingMonths'])||!month(action.atMonth)||action.atMonth<previousMonth||action.atMonth>r.lastProcessedMonth||yearAt(r,action.atMonth)>8||typeof action.student!=='boolean'||!Number.isInteger(action.injuryRemainingMonths)||action.injuryRemainingMonths<0||action.injuryRemainingMonths>120||action.atMonth<(r.years.find(row=>row.year===action.year)?.openedAtMonth??Infinity))return false;applyRecord(rebuilt,action);previousMonth=action.atMonth;}}catch{return false;}
 return same(rebuilt.years,r.years);
}
