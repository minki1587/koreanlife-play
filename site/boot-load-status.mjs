import {particle} from './korean-particle.mjs?v=popup-auto-20261024';
/** Presentation-only boot progress. A failed file stays visible until that same
 * file is ready, even when unrelated requests finish or a manual retry starts. */
export function createBootLoadStatus({onChange=()=>{}}={}){
 const files=new Map();let lastError=null;
 function snapshot(){
  const values=[...files.values()],failedFiles=values.filter(row=>row.error).map(row=>({url:row.url,label:row.label,error:row.error})),readyCount=values.filter(row=>row.status==='ready').length,totalCount=values.length,retrying=values.find(row=>row.status==='retrying'),failed=failedFiles.length>0||Boolean(lastError),progress=`게임 자료 준비 중 · ${readyCount}/${totalCount}`;
  const message=failed?[...failedFiles.map(row=>row.error.message),...(lastError&&!failedFiles.some(row=>row.error===lastError)?[lastError.message]:[]),progress].filter(Boolean).join('\n'):retrying?`${progress} · ${retrying.label} 다시 받는 중 (${retrying.nextAttempt}/${retrying.maxAttempts})`:values.length?`${progress}${values.at(-1)?.label?' · '+values.at(-1).label:''}`:'게임 자료를 준비하고 있습니다.';
  return{failed,readyCount,totalCount,retrying:Boolean(retrying),failedFiles,message};
 }
 function emit(){const value=snapshot();try{onChange(value);}catch{}return value;}
 return{
  status(event){if(!event?.url)return emit();const previous=files.get(event.url)||{},row={...previous,...event};if(event.status==='failed')row.error=event.error||new Error(`${event.label||event.url}${particle(event.label||event.url,'을')} 불러오지 못했습니다.`);else if(event.status==='ready'){row.error=null;if(lastError?.url===event.url)lastError=null;}else row.error=previous.error||null;files.set(event.url,row);return emit();},
  fail(error){const value=error instanceof Error?error:new Error(String(error||'자료를 불러오지 못했습니다.'));if(value.url){const previous=files.get(value.url)||{};files.set(value.url,{...previous,url:value.url,label:value.label||previous.label||value.url,status:'failed',error:value});}else lastError=value;return emit();},
  reset(){files.clear();lastError=null;return emit();},
  get snapshot(){return snapshot();},
 };
}
