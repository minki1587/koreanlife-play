import {pendingInjuryCare,injuryImpact} from './injury-care.mjs?v=birth-speed-20261024';
import {reserveTrainingDue,validReserveService} from './reserve-service.mjs?v=birth-speed-20261024';
import {militaryObligation} from './military-obligation.mjs?v=birth-speed-20261024';

const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const FIELDS=['version','activatedAtMonth','updatedAtMonth','enabled'];

/** Optional preference only; absence keeps every existing save on manual play. */
export function validReserveAutomation(s){try{
 const setting=s?.reserveAutomation;if(setting===undefined)return true;
 return!!setting&&!Array.isArray(setting)&&Object.keys(setting).length===FIELDS.length&&FIELDS.every(key=>Object.hasOwn(setting,key))&&setting.version===1&&typeof setting.enabled==='boolean'&&month(s.totalMonths)&&month(setting.activatedAtMonth)&&month(setting.updatedAtMonth)&&setting.activatedAtMonth<=setting.updatedAtMonth&&setting.updatedAtMonth<=s.totalMonths;
}catch{return false;}}

/** Return a namespace for the engine wrapper; never alter training or money. */
export function setReserveAutomation(s,enabled){
 if(typeof enabled!=='boolean')throw new TypeError('예비군 자동 참여 여부를 확인해 주세요.');
 if(!s||!month(s.totalMonths)||s.phase!=='running'||!validReserveAutomation(s))throw new Error('진행 중인 유효한 기록에서 예비군 자동 참여를 설정해 주세요.');
 return{version:1,activatedAtMonth:s.reserveAutomation?.activatedAtMonth??s.totalMonths,updatedAtMonth:s.totalMonths,enabled};
}

/** Auto-confirm only the current year's single visible, enabled attend choice.
 * Injury decisions, earlier postponements and carried years remain manual.
 * The engine applies this ordinary action once through reserveAction. */
export function reserveAutomaticChoice(s){try{
 if(!validReserveAutomation(s)||s?.reserveAutomation?.enabled!==true||s.phase!=='running'||pendingInjuryCare(s)||injuryImpact(s).active||!validReserveService(s))return null;
 const due=reserveTrainingDue(s);if(!due||!due.canAttend||due.currentYear!==due.year||due.year<1||due.year>6)return null;
 const row=s.reserveService.years.find(row=>row.year===due.year);
 if(!row||row.postponedUntilMonth!==null||s.reserveService.actions.some(action=>action.year===due.year&&action.type==='postpone-health'))return null;
 const obligation=militaryObligation(s),action=obligation?.actions?.[0];
 if(obligation?.kind!=='reserve'||obligation.actions.length!==1||action?.kind!=='reserve'||action.type!=='attend'||action.disabled)return null;
 return{type:'attend'};
}catch{return null;}}
