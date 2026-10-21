// Activity burden is a versioned game setting, separate from observed fees and display categories.
export const HOBBY_ACTIVITY_MODEL='hobby-activity-v1';
const DEMANDS=['minimal','light','moderate','high'];
export function validHobbyActivity(row){
 const keys=['gameActivityModel','gamePhysicalDemand','gameOutdoor'],present=keys.filter(key=>Object.hasOwn(row,key));
 return !present.length||present.length===keys.length&&row.gameActivityModel===HOBBY_ACTIVITY_MODEL&&DEMANDS.includes(row.gamePhysicalDemand)&&typeof row.gameOutdoor==='boolean';
}
export function hobbyActivity(row){
 if(!row||!validHobbyActivity(row))return{physicalDemand:'high',outdoor:true};
 if(row.gameActivityModel===HOBBY_ACTIVITY_MODEL)return{physicalDemand:row.gamePhysicalDemand,outdoor:row.gameOutdoor};
 // Old custom catalogs retain a conservative fallback; all shipped rows have explicit tags.
 return{physicalDemand:({지능:'minimal',감상:'minimal',창작:'light',교류:'light',운동:'high',야외:'moderate'})[row.type]||'high',outdoor:row.type==='야외'};
}
export function hobbyAllowedDuringRecovery(severity,row){
 if(severity==='critical')return false;
 const activity=hobbyActivity(row),allowed=severity==='major'?['minimal']:['minimal','light'];
 return !activity.outdoor&&allowed.includes(activity.physicalDemand);
}
