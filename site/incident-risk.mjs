import {hobbyActivity} from './hobby-activity.mjs?v=birth-timing-20261024';
import {injuryImpact} from './injury-care.mjs?v=birth-timing-20261024';
// Game balance only. Collected hazard levels are not statistical accident rates.
export const INCIDENT_RISK_RULES=Object.freeze({version:'incident-risk-v1',occupation:Object.freeze([1,1.05,1.15,1.3,1.5]),military:1.25,hobby:Object.freeze([1,1,1.02,1.1,1.2]),safety:.85,lowHealth:1.25,minimum:.65,maximum:2});
const groups={'01':1,'02':1,'03':2,11:1,12:3,13:2,14:3,15:3,21:2,22:2,23:2,24:4,25:4,30:3,41:2,42:3,51:2,52:2,53:3,54:3,55:3,56:3,61:2,62:4,70:4,81:4,82:4,83:4,84:3,85:4,86:3,87:3,88:3,90:4};
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
function multiplier(p){const r=INCIDENT_RISK_RULES;return Math.round(Math.max(r.minimum,Math.min(r.maximum,r.occupation[p.occupationLevel]*(p.military?r.military:1)*r.hobby[p.hobbyDemand]*(p.safety?r.safety:1)*(p.lowHealth?r.lowHealth:1)))*1000000)/1000000;}
export function incidentRiskProfile(s,data={},{context=s.service?.active?'military':'daily'}={}){
 const worked=s.job?.employmentContract?.lastMonth,workThisMonth=worked?.atMonth===s.totalMonths?worked.incomeFactor>0:true;
 const military=context==='military',working=!military&&workThisMonth&&['재직','계약직','시간제','프리랜서','자영업','수습'].includes(s.job?.status)&&injuryImpact(s).workFactor>0,occupationId=working&&/^know-\d{6}$/.test(s.job?.occupationId||'')?s.job.occupationId:null;
 const row=occupationId&&(data.occupations||[]).find(r=>r.id===occupationId),collected=row?.modeled?.occupationalRisks?.level;
 // Prefix fallback uses the same published middle-group settings when the
 // optional full occupation reference has not loaded yet.
 const occupationLevel=occupationId?(int(collected,0,4)?collected:groups[occupationId.slice(5,7)]??0):0;
 const applied=s.hobbies?.active&&s.hobbies.lastResult?.status==='applied'&&s.hobbies.lastResult.atMonth===s.totalMonths,rows=data.hobbyCatalog?.hobbies||[],selected=applied?rows.filter(r=>s.hobbies.selectedIds.includes(r.id)&&s.hobbies.lastResult.names.includes(r.name)):[];
 const hobbyDemand=selected.reduce((n,r)=>Math.max(n,({minimal:1,light:2,moderate:3,high:4})[hobbyActivity(r).physicalDemand]||0),0);
 const p={version:INCIDENT_RISK_RULES.version,occupationId,occupationLevel,military,hobbyIds:selected.map(r=>r.id).sort(),hobbyDemand,safety:s.focus==='health',lowHealth:s.health<20};p.multiplier=multiplier(p);return p;
}
export function validIncidentRisk(p,{healthBefore,context}={}){
 return!!p&&Object.keys(p).length===9&&p.version===INCIDENT_RISK_RULES.version&&(p.occupationId===null||/^know-\d{6}$/.test(p.occupationId))&&int(p.occupationLevel,0,4)&&(p.occupationId!==null||p.occupationLevel===0)&&typeof p.military==='boolean'&&(!p.military||p.occupationId===null)&&Array.isArray(p.hobbyIds)&&p.hobbyIds.length<=3&&new Set(p.hobbyIds).size===p.hobbyIds.length&&p.hobbyIds.every(id=>/^hobby-[a-z0-9-]+$/.test(id))&&int(p.hobbyDemand,0,4)&&(p.hobbyIds.length>0?p.hobbyDemand>0:p.hobbyDemand===0)&&typeof p.safety==='boolean'&&typeof p.lowHealth==='boolean'&&p.lowHealth===(healthBefore<20)&&p.military===(context==='military')&&p.multiplier===multiplier(p);
}
