import {pendingInjuryCare,injuryCareOptions} from './injury-care.mjs?v=news-20261024';

// Optional per-severity preference: "handle the next injury like this one".
// Critical injuries always ask, because they can change the rest of a life.
export const AUTOMATABLE_SEVERITIES=Object.freeze(['minor','major']);
const MODES=Object.freeze(['treatment','rest','rehab']);
const FIELDS=['version','activatedAtMonth','updatedAtMonth','modes'];
const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;

/** Absence keeps every existing save on manual injury care. */
export function validInjuryAutomation(s){try{
 const setting=s?.injuryAutomation;if(setting===undefined)return true;
 if(!setting||Array.isArray(setting)||Object.keys(setting).length!==FIELDS.length||!FIELDS.every(key=>Object.hasOwn(setting,key)))return false;
 const modes=setting.modes;
 if(!modes||Array.isArray(modes)||typeof modes!=='object'||!Object.entries(modes).every(([severity,mode])=>AUTOMATABLE_SEVERITIES.includes(severity)&&MODES.includes(mode)))return false;
 return setting.version===1&&month(s.totalMonths)&&month(setting.activatedAtMonth)&&month(setting.updatedAtMonth)&&setting.activatedAtMonth<=setting.updatedAtMonth&&setting.updatedAtMonth<=s.totalMonths;
}catch{return false;}}

/** Returns the new setting; mode null forgets that severity. Never touches money or health. */
export function injuryAutomationPolicy(s,severity,mode){
 if(!AUTOMATABLE_SEVERITIES.includes(severity))throw new TypeError('자동으로 처리할 수 있는 부상 정도가 아닙니다.');
 if(mode!==null&&!MODES.includes(mode))throw new TypeError('부상 대응 방법을 확인해 주세요.');
 if(!s||!month(s.totalMonths)||s.phase==='ended'||!validInjuryAutomation(s))throw new Error('진행 중인 유효한 기록에서 부상 자동 처리를 설정해 주세요.');
 const modes={...(s.injuryAutomation?.modes||{})};if(mode===null)delete modes[severity];else modes[severity]=mode;
 return{version:1,activatedAtMonth:s.injuryAutomation?.activatedAtMonth??s.totalMonths,updatedAtMonth:s.totalMonths,modes};
}

/** The remembered option for the pending injury, or null when the player must choose.
 * An option the player cannot pay for in cash still asks, so no loan is ever automatic. */
export function injuryAutomaticChoice(s){try{
 if(!validInjuryAutomation(s)||!pendingInjuryCare(s))return null;
 const severity=s.lifeHealth.injury?.severity,mode=s.injuryAutomation?.modes?.[severity];
 if(!AUTOMATABLE_SEVERITIES.includes(severity)||!mode)return null;
 const option=injuryCareOptions(s).find(row=>row.id===mode);
 return option?.affordable?mode:null;
}catch{return null;}}

/** Short lines for the health panel, e.g. ['경상', '치료받기']. */
export function injuryAutomationRows(s){
 const modes=s?.injuryAutomation?.modes||{},labels={minor:'경상',major:'중상'},modeLabels={treatment:'치료받기',rest:'충분히 쉬기',rehab:'재활하기'};
 return AUTOMATABLE_SEVERITIES.filter(severity=>modes[severity]).map(severity=>({severity,label:labels[severity],mode:modes[severity],modeLabel:modeLabels[modes[severity]]}));
}
