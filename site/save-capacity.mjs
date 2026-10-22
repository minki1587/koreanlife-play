const PREFIX='koreanlife-save-v2';
export const SAVE_STORAGE_WARNING_BYTES=4*1024*1024;
/** UTF-16 character storage estimate, not a promise about a browser's quota. */
export function saveStorageUsage(storage){
 const definitions=[[PREFIX,'현재 진행 기록'],[PREFIX+'-previous','이전 삶 백업'],[PREFIX+'-import-backup','불러오기 전 백업'],[PREFIX+'-import-journal-v1','불러오기 복구 기록'],[PREFIX+'-pending-birth','출생 추첨 기록'],['koreanlife-save-v1','이전 버전 기록']];
 const items=definitions.flatMap(([key,label])=>{const raw=storage.getItem(key);return raw===null?[]:[{key,label,characters:raw.length,estimatedBytes:2*(key.length+raw.length)}];});
 const totalBytes=items.reduce((sum,item)=>sum+item.estimatedBytes,0);
 return{items,totalBytes,warning:totalBytes>=SAVE_STORAGE_WARNING_BYTES,warningThresholdBytes:SAVE_STORAGE_WARNING_BYTES,quotaKnown:false};
}
export function isStorageQuotaError(error){return!!error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014);}
export function formatStorageBytes(bytes){return`${(Math.max(0,Number(bytes)||0)/(1024*1024)).toFixed(2)} MiB`;}
