import {createFrozenValidationCache} from './immutable-save.mjs?v=birth-draw-20261024';
import {applyCareRecord} from './injury-care.mjs?v=birth-draw-20261024';
import {INCIDENT_RISK_RULES,incidentRiskProfile,validIncidentRisk} from './incident-risk.mjs?v=birth-draw-20261024';
// Explicit game rules. No medical diagnosis, external data, DOM or I/O.
export const LIFE_HEALTH_RULES=Object.freeze({version:'life-health-v1',monthlyFatalProbability:.00001,monthlyInjuryProbability:.01,severities:Object.freeze([
 Object.freeze({id:'minor',label:'경상',probability:.85,healthLoss:8,recoveryMonths:2}),
 Object.freeze({id:'major',label:'중상',probability:.13,healthLoss:18,recoveryMonths:3}),
 Object.freeze({id:'critical',label:'위중',probability:.02,healthLoss:35,recoveryMonths:7}),
])});
const clone=x=>structuredClone(x),finite=n=>typeof n==='number'&&Number.isFinite(n),health=n=>finite(n)&&n>=0&&n<=100,month=n=>Number.isInteger(n)&&n>=0&&n<=1800,contextOk=c=>c==='military'||c==='daily';
const clamp=n=>Math.max(0,Math.min(100,n)),near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-8;
function rng(seed){let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function seedOk(seed){return typeof seed==='string'&&seed.length>0&&seed.length<=64;}
function fingerprint(seed){let h=2166136261;for(const c of JSON.stringify([seed,LIFE_HEALTH_RULES]))h=Math.imul(h^c.charCodeAt(0),16777619);return`life-health-${(h>>>0).toString(16).padStart(8,'0')}`;}
function same(a,b){if(typeof a==='number'||typeof b==='number')return near(a,b);if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a),other=Object.keys(b);return keys.length===other.length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));}

/** One monthly event draw; a second deterministic draw chooses injury severity. */
export function lifeHealthDraw(seed,atMonth,risk=null){
 if(!seedOk(seed)||!month(atMonth)||atMonth<1)throw new RangeError('몸 상태 사건의 시점을 확인해 주세요.');
 const factor=risk?.multiplier??1,random=rng(`life-health|${seed}|${LIFE_HEALTH_RULES.version}|${atMonth}`),roll=random(),severityRoll=random(),fatal=roll<LIFE_HEALTH_RULES.monthlyFatalProbability*factor,injured=!fatal&&roll<(LIFE_HEALTH_RULES.monthlyFatalProbability+LIFE_HEALTH_RULES.monthlyInjuryProbability)*factor;
 let threshold=0;const severity=LIFE_HEALTH_RULES.severities.find(row=>(threshold+=row.probability)>severityRoll)||LIFE_HEALTH_RULES.severities.at(-1);
 return{roll,severityRoll,fatal,injured,severity:severity.id};
}

export function createLifeHealth(state,{activatedAtMonth=state.totalMonths}={}){
 if(!seedOk(state.seed)||!month(activatedAtMonth))throw new TypeError('몸 상태 기록을 시작할 수 없습니다.');
 return{version:LIFE_HEALTH_RULES.version,rulesSnapshot:clone(LIFE_HEALTH_RULES),fingerprint:fingerprint(state.seed),activatedAtMonth,lastProcessedMonth:activatedAtMonth,records:[],injury:null};
}

function step(seed,atMonth,context,before,currentInjury,risk=null){
 let injury=clone(currentInjury),after=before,type='none',incidentId=null,severity=null,deathCause=null,plannedRecovery=0,actualRecovery=0;
 const recovering=!!injury&&injury.remainingRecoveryMonths>0,draw=lifeHealthDraw(seed,atMonth,risk);
 if(before<=0){type='death';deathCause='health';}
 else if(draw.fatal){type='death';deathCause='accident';}
 else if(recovering){
  const target=injury.allocatedHealth+(injury.healthLoss-injury.allocatedHealth)/injury.remainingRecoveryMonths;
  plannedRecovery=target-injury.allocatedHealth;after=clamp(before+plannedRecovery);actualRecovery=after-before;
  injury.allocatedHealth=target;injury.recoveredHealth+=actualRecovery;injury.remainingRecoveryMonths--;
  type=injury.remainingRecoveryMonths?'recovery':'recovered';incidentId=injury.id;severity=injury.severity;
 }
 else if(draw.injured){
  const rule=LIFE_HEALTH_RULES.severities.find(row=>row.id===draw.severity),loss=Math.min(before,rule.healthLoss);after=clamp(before-loss);severity=rule.id;incidentId=`life-injury-${atMonth}`;
  injury={id:incidentId,atMonth,context,severity:rule.id,label:rule.label,nominalHealthLoss:rule.healthLoss,healthLoss:loss,recoveryMonths:rule.recoveryMonths,remainingRecoveryMonths:rule.recoveryMonths,allocatedHealth:0,recoveredHealth:0};
  if(after<=0){type='death';deathCause='injury';}else type='injury';
 }
 if(type==='death')incidentId=`life-death-${atMonth}`;
 return{injury,record:{atMonth,context,healthBefore:before,healthAfter:after,type,incidentId,severity,deathCause,healthDelta:after-before,plannedRecovery,actualRecovery,...(risk?{risk:clone(risk)}:{})}};
}
function presentation(record){
 const where=record.context==='military'?'군 복무 중':'일상 중',rule=LIFE_HEALTH_RULES.severities.find(row=>row.id===record.severity),severity=rule?.label||'';
 const title=record.type==='death'?(record.deathCause==='health'?'건강이 다해 삶을 마쳤다':record.deathCause==='injury'?`${where} 입은 부상으로 삶을 마쳤다`:`${where} 사고로 삶을 마쳤다`):record.type==='injury'?`${where} ${severity} 부상을 입었다`:record.type==='recovered'?'부상 회복을 마쳤다':'몸을 회복하고 있다';
 const changes=record.healthDelta?[`건강 ${record.healthDelta>0?'+':''}${Number(record.healthDelta.toFixed(6))}`]:[];
 return{id:record.type==='recovery'||record.type==='recovered'?`${record.incidentId}-recovery-${record.atMonth}`:record.incidentId,atMonth:record.atMonth,type:record.type,title,context:record.context,healthDelta:record.healthDelta,severity:record.severity,injuryLabel:severity,cause:record.deathCause,changes};
}

/** Run after the clock advances, before service discharge; does not mutate state. */
export function progressLifeHealth(state,atMonth=state.totalMonths,{context=state.service?.active?'military':'daily',data}={}){
 if(state.phase==='ended')return null;
 if(state.lifeHealth&&month(atMonth)&&atMonth<=state.lifeHealth.lastProcessedMonth)return null;
 if(!seedOk(state.seed)||!health(state.health)||!month(atMonth)||atMonth<1||!contextOk(context))throw new TypeError('몸 상태를 진행할 기록이 올바르지 않습니다.');
 const medical=clone(state.lifeHealth||createLifeHealth(state,{activatedAtMonth:atMonth-1}));
 if(atMonth<=medical.lastProcessedMonth)return null;
 if(atMonth!==medical.lastProcessedMonth+1)throw new RangeError('몸 상태 기록의 월이 이어지지 않습니다.');
 if(!medical.riskPolicy&&data?.lifeHealthRisk===true)medical.riskPolicy={version:INCIDENT_RISK_RULES.version,activatedAtMonth:atMonth-1,rulesSnapshot:clone(INCIDENT_RISK_RULES)};
 const risk=medical.riskPolicy?incidentRiskProfile(state,data,{context}):null;
 const result=step(state.seed,atMonth,context,state.health,medical.injury,risk);medical.injury=result.injury;medical.records.push(result.record);medical.lastProcessedMonth=atMonth;
 if(medical.careEnabledAtMonth!==undefined)medical.pendingCare=result.record.type==='injury'?result.injury.id:null;
 const event=result.record.type==='none'?null:presentation(result.record),death=result.record.type==='death'?{type:'death',cause:result.record.deathCause,context,incidentId:result.record.incidentId,modelVersion:medical.version,atMonth,age:Math.floor(atMonth/12)}:null;
 return{lifeHealth:medical,health:result.record.healthAfter,event,death};
}

function validated(state){
 const m=state?.lifeHealth;if(!m)return null;
 if(!seedOk(state.seed)||!month(state.totalMonths)||!m||m.version!==LIFE_HEALTH_RULES.version||!same(m.rulesSnapshot,LIFE_HEALTH_RULES)||m.fingerprint!==fingerprint(state.seed)||!month(m.activatedAtMonth)||m.activatedAtMonth>state.totalMonths||!Array.isArray(m.records)||m.records.length>1800||m.lastProcessedMonth!==m.activatedAtMonth+m.records.length||m.lastProcessedMonth!==state.totalMonths)return null;
 const care=m.careEnabledAtMonth!==undefined;
 if(care&&(!month(m.careEnabledAtMonth)||m.careEnabledAtMonth<m.activatedAtMonth||m.careEnabledAtMonth>state.totalMonths||!Array.isArray(m.careActions)||m.careActions.length>m.records.length))return null;
 if(!care&&(m.careActions!==undefined||m.pendingCare!==undefined))return null;
 const policy=m.riskPolicy;if(policy&&(!same(policy.rulesSnapshot,INCIDENT_RISK_RULES)||policy.version!==INCIDENT_RISK_RULES.version||!month(policy.activatedAtMonth)||policy.activatedAtMonth<m.activatedAtMonth||policy.activatedAtMonth>state.totalMonths))return null;
 let injury=null,death=null,pending=null,actionIndex=0;
 for(let i=0;i<m.records.length;i++){
  const record=m.records[i],atMonth=m.activatedAtMonth+i+1;if(!record||record.atMonth!==atMonth||!contextOk(record.context)||!health(record.healthBefore)||death)return null;
  const risky=!!policy&&atMonth>policy.activatedAtMonth;if(risky?!validIncidentRisk(record.risk,{healthBefore:record.healthBefore,context:record.context}):record.risk!==undefined)return null;
  const expected=step(state.seed,atMonth,record.context,record.healthBefore,injury,risky?record.risk:null);if(!same(record,expected.record))return null;injury=expected.injury;if(record.type==='death')death=record;
  if(care&&atMonth>m.careEnabledAtMonth&&record.type==='injury')pending=injury.id;
  const action=m.careActions?.[actionIndex];if(action?.atMonth===atMonth){if(!pending||action.healthBefore!==record.healthAfter)return null;try{injury=applyCareRecord(injury,action);}catch{return null;}pending=null;actionIndex++;}
  if(pending&&i<m.records.length-1)return null;
 }
 if(!same(m.injury,injury)||care&&(actionIndex!==m.careActions.length||m.pendingCare!==(state.phase==='ended'?null:pending)))return null;
 return{medical:m,death};
}

export function validLifeDeath(state){try{
 const proof=validated(state),record=proof?.death,end=state?.ending;if(!record||state.phase!=='ended'||!end||end.type!=='death'||end.atMonth!==record.atMonth||end.age!==Math.floor(record.atMonth/12)||end.incidentId!==record.incidentId||end.modelVersion!==LIFE_HEALTH_RULES.version)return false;
 const suffix=record.deathCause==='accident'?'incident':record.deathCause;if(end.cause!==`${record.context}-${suffix}`)return false;
 return near(state.health,record.healthAfter);
}catch{return false;}}
function fullvalidLifeHealth(state){try{
 if(state?.lifeHealth===undefined)return true;
 const proof=validated(state);if(!proof)return false;
 const special=/^(?:daily|military)-(?:incident|injury|health)$/u.test(state.ending?.cause||'');
 if(proof.death||special)return validLifeDeath(state);
 return true;
}catch{return false;}}

export function lifeHealthSummary(state){
 const m=state?.lifeHealth;if(!m)return null;
 const injury=m.injury,incidentHistory=[...m.records.filter(row=>row.type!=='none').map(presentation),...(m.careActions||[]).map(a=>({id:`${a.injuryId}-care`,atMonth:a.atMonth,type:'care',title:`${({treatment:'치료를',rest:'휴식을',rehab:'재활을'})[a.mode]} 선택했다`,context:m.records.find(r=>r.atMonth===a.atMonth)?.context||'daily',healthDelta:a.healthAfter-a.healthBefore}))].sort((a,b)=>a.atMonth-b.atMonth),lastIncident=incidentHistory.at(-1)||null,ended=state.phase==='ended',dead=lastIncident?.type==='death',recovering=!!injury&&injury.remainingRecoveryMonths>0&&!ended;
 return{active:!ended,statusLabel:dead?(lastIncident.cause==='health'?'건강 소진으로 사망':lastIncident.cause==='injury'?'부상으로 사망':'사고로 사망'):ended?(state.ending?.type==='death'?'사망':injury?.remainingRecoveryMonths?'회복 중단':'기록 종료'):recovering?'회복 중':injury?'회복 완료':'이상 없음',context:ended?m.records.at(-1)?.context||'daily':state.service?.active||['cadet','officer'].includes(state.academy?.status)?'military':'daily',injuryLabel:injury?.label||'없음',remainingRecoveryMonths:ended?0:injury?.remainingRecoveryMonths||0,healthLoss:injury?.healthLoss||0,recoveredHealth:injury?.recoveredHealth||0,incidentHistory:clone(incidentHistory),lastIncident:lastIncident?clone(lastIncident):null,modelVersion:m.version,activatedAtMonth:m.activatedAtMonth,lastProcessedMonth:m.lastProcessedMonth};
}

const cachedvalidLifeHealth=createFrozenValidationCache(fullvalidLifeHealth);
export function validLifeHealth(s){return cachedvalidLifeHealth(s);}
