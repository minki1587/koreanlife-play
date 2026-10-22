/** Deterministic employment paths. Existing jobs without this snapshot are unchanged. */
export const EMPLOYMENT_CONTRACT_VERSION='employment-contract-v1';
const TYPES={regular:{label:'정규직·상시 고용',status:'재직',durationMonths:null},contract:{label:'기간제·계약직',status:'계약직',durationMonths:12},freelance:{label:'프리랜서·프로젝트',status:'프리랜서',durationMonths:null},self:{label:'자영업',status:'자영업',durationMonths:null}};
const clone=x=>structuredClone(x),int=(n,min=0)=>Number.isInteger(n)&&n>=min,ids=id=>/^know-\d{6}$/.test(id);
function same(a,b){if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));}
function draw(seed,contract,atMonth){let h=2166136261;for(const c of `${EMPLOYMENT_CONTRACT_VERSION}|${seed}|${contract.occupationId}|${contract.startedMonth}|${contract.type}|${atMonth}`)h=Math.imul(h^c.charCodeAt(0),16777619);h+=0x6D2B79F5;let n=Math.imul(h^h>>>15,1|h);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;}
export function employmentTypeOptions(row){
 const labels=(row?.modeled?.employmentType?.types||[]).map(r=>r.label),types=new Set();
 for(const label of labels){if(/정규직|고용 전문직|고용근로|공무원|공공부문|직업군인/.test(label))types.add('regular');if(/계약|기간제|시간제|일용|도급|위탁|위촉|성과보수/.test(label))types.add('contract');if(/프리랜서|프로젝트|위촉|도급/.test(label))types.add('freelance');if(/자영업|개업/.test(label))types.add('self');}
 if(!types.size)types.add('regular');
 return [...types].map(id=>({id,...TYPES[id],details:id==='regular'?'매달 기준 소득을 받습니다.':id==='contract'?'12개월 계약. 만료 뒤 새 일자리에 지원합니다.':id==='freelance'?'월별 일감에 따라 기준 소득의 0~135%를 받습니다.':'영업 상황에 따라 사업비를 제외한 기준 소득의 0~140%를 받습니다.'}));
}
export const employmentTypeStatus=type=>TYPES[type]?.status||'재직';
export function createEmploymentContract(s,row,type=employmentTypeOptions(row)[0].id){
 if(!ids(row?.id)||!employmentTypeOptions(row).some(t=>t.id===type)||!int(s?.totalMonths))throw new TypeError('이 직업에서 선택할 수 있는 고용형태를 확인해 주세요.');
 return{version:EMPLOYMENT_CONTRACT_VERSION,occupationId:row.id,type,startedMonth:s.totalMonths,durationMonths:TYPES[type].durationMonths,months:[],lastMonth:null};
}
function monthRecord(s,c,atMonth){
 const index=c.months.length+1;if(c.durationMonths!==null&&index>c.durationMonths)return null;
 const r=draw(s.seed,c,atMonth);let incomeFactor=1,workState='work';
 if(c.type==='freelance'){incomeFactor=r<.2?0:r<.45?.65:r<.8?1:1.35;workState=incomeFactor===0?'gap':incomeFactor>1?'busy':incomeFactor<1?'reduced':'work';}
 else if(c.type==='self'){incomeFactor=r<.1?0:r<.35?.6:r<.8?1:1.4;workState=incomeFactor===0?'closed':incomeFactor>1?'busy':incomeFactor<1?'reduced':'work';}
 return{atMonth,index,incomeFactor,workState,remainingMonths:c.durationMonths===null?null:c.durationMonths-index};
}
export function progressEmploymentContract(s,atMonth=s.totalMonths+1){
 const source=s?.job?.employmentContract;if(!source||s.phase==='ended'||s.service?.active)return null;
 if(!int(atMonth,1)||atMonth!==s.totalMonths+1||source.lastMonth?.atMonth>=atMonth)throw new RangeError('고용 계약의 진행 월을 확인해 주세요.');
 const c=clone(source),record=monthRecord(s,c,atMonth);
 if(!record)return{contract:c,expired:true,incomeFactor:0,event:{type:'contract-ended',title:'근로 계약이 끝나 새 일자리를 준비한다',changes:['12개월 계약 종료','새 직업 지원 가능']}};
 const previous=c.lastMonth;c.months.push(record);c.lastMonth=record;let event=null;
 if(['freelance','self'].includes(c.type)&&(record.incomeFactor!==previous?.incomeFactor||record.incomeFactor===0))event={type:'employment-income',title:record.workState==='gap'?'이번 달은 새 일감을 기다린다':record.workState==='closed'?'이번 달 영업을 쉬었다':c.type==='self'?'이번 달 영업 수입이 달라졌다':'이번 달 프로젝트 수입을 확인했다',changes:[`기준 소득의 ${Math.round(record.incomeFactor*100)}%`,...(record.incomeFactor===0?['이번 달 근로 수입 없음']:[])]};
 else if(c.type==='contract'&&record.remainingMonths===0)event={type:'contract-ending',title:'이번 달로 근로 계약을 마친다',changes:['이번 달 급여 지급','다음 달 계약 종료']};
 return{contract:c,expired:false,incomeFactor:record.incomeFactor,event};
}
/** Current settlement uses its already drawn record; budgets preview only this path. */
export function employmentIncomeFactor(s){
 const c=s?.job?.employmentContract;if(!c||s.service?.active)return 1;
 if(c.lastMonth?.atMonth===s.totalMonths+1)return c.lastMonth.incomeFactor;
 return monthRecord(s,c,s.totalMonths+1)?.incomeFactor??0;
}
function validForJob(s,job){
 const c=job?.employmentContract;if(c===undefined)return true;
 if(!c||c.version!==EMPLOYMENT_CONTRACT_VERSION||!ids(c.occupationId)||c.occupationId!==job.occupationId||!Object.hasOwn(TYPES,c.type)||!job.careerModel||!employmentTypeOptions({modeled:{employmentType:{types:job.careerModel.employmentTypes.map(label=>({label}))}}}).some(t=>t.id===c.type)||!int(c.startedMonth)||c.startedMonth>s.totalMonths||c.durationMonths!==TYPES[c.type].durationMonths||!Array.isArray(c.months)||c.months.length>s.totalMonths-c.startedMonth||c.durationMonths!==null&&c.months.length>c.durationMonths||!same(c.lastMonth,c.months.at(-1)||null))return false;
 const replay={...c,months:[],lastMonth:null};let previous=c.startedMonth;
 for(const record of c.months){if(!record||!int(record.atMonth,previous+1)||record.atMonth>s.totalMonths)return false;const expected=monthRecord(s,replay,record.atMonth);if(!same(expected,record))return false;replay.months.push(expected);replay.lastMonth=expected;previous=record.atMonth;}
 return true;
}
export function validEmploymentContracts(s){try{return validForJob(s,s.job)&&validForJob(s,s.service?.previousJob);}catch{return false;}}
export function employmentContractSummary(s){
 const c=s?.job?.employmentContract;if(!c)return null;
 const type=TYPES[c.type],last=c.lastMonth;return{type:c.type,label:type.label,status:type.status,startedMonth:c.startedMonth,paidMonths:c.months.length,remainingMonths:c.durationMonths===null?null:Math.max(0,c.durationMonths-c.months.length),lastIncomeFactor:last?.incomeFactor??null,nextIncomeFactor:employmentIncomeFactor(s),workState:last?.workState||'starting',baseAnnualWan:s.salary||0};
}
