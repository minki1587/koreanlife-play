export class AssetLoadError extends Error{
 constructor(code,url,label,detail,{cause,httpStatus,retryAfterMs}={}){const file=String(url).split(/[?#]/u)[0].split('/').at(-1)||String(url);super(`${label&&label!==file?`${label} (${file})`:file}을 불러오지 못했습니다. ${detail}`,cause?{cause}:undefined);this.name='AssetLoadError';this.code=code;this.url=url;this.label=label||file;if(httpStatus!==undefined)this.httpStatus=httpStatus;if(retryAfterMs!==undefined)this.retryAfterMs=retryAfterMs;}
}
const MAX_RETRY_DELAY=8000;
export function transientAssetError(error){return error?.code==='ASSET_TIMEOUT'||error?.code==='ASSET_NETWORK'||error?.code==='ASSET_HTTP'&&(error.httpStatus===408||error.httpStatus===429||error.httpStatus>=500&&error.httpStatus<=599);}
function retryAfter(response,now){const raw=response.headers?.get?.('retry-after');if(typeof raw!=='string'||!raw.trim())return undefined;const seconds=Number(raw),value=Number.isFinite(seconds)?seconds*1000:Date.parse(raw)-now();return Number.isFinite(value)?Math.min(MAX_RETRY_DELAY,Math.max(0,value)):undefined;}
function pause(ms,signal){return new Promise((resolve,reject)=>{let timer;const aborted=()=>{clearTimeout(timer);signal.removeEventListener('abort',aborted);reject(signal.reason);};if(signal.aborted){aborted();return;}signal.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>{signal.removeEventListener('abort',aborted);resolve();},ms);});}

/** Transient failures get at most two retries. Successful files and concurrent
 * requests share one record; a final failure evicts only that record. */
export function createAssetLoader({fetchImpl=globalThis.fetch,timeoutMs=12000,onStatus=()=>{},maxAttempts=3,retryDelaysMs=[1000,3000],waitImpl=pause,now=Date.now}={}){
 const cache=new Map(),attemptLimit=Number.isInteger(maxAttempts)?Math.max(1,Math.min(3,maxAttempts)):3;
 const notify=event=>{try{onStatus(event);}catch{}};
 function load(kind,url,{label,validate,signal}={}){
  const key=`${kind}:${url}`,displayLabel=label||String(url).split(/[?#]/u)[0].split('/').at(-1)||String(url);
  const abortedError=()=>new AssetLoadError('ASSET_ABORTED',url,displayLabel,'요청이 중단되었습니다. 다시 시도해 주세요.');
  if(signal?.aborted)return Promise.reject(abortedError());
  let record=cache.get(key);
  if(!record){
   const controller=new AbortController();record={controller,promise:null};cache.set(key,record);
   record.promise=(async()=>{
    const externalAbort=()=>controller.abort(signal?.reason);if(signal)signal.addEventListener('abort',externalAbort,{once:true});
    try{
     for(let attempt=1;attempt<=attemptLimit;attempt++){
      if(controller.signal.aborted)throw abortedError();notify({url,label:displayLabel,status:'loading',attempt,maxAttempts:attemptLimit});
      try{
       const value=await request();notify({url,label:displayLabel,status:'ready',attempt,maxAttempts:attemptLimit});return value;
      }catch(error){
       if(controller.signal.aborted)throw abortedError();
       if(attempt===attemptLimit||!transientAssetError(error))throw error;
       const configured=Number(retryDelaysMs[attempt-1]),delay=error.retryAfterMs??(Number.isFinite(configured)?Math.max(0,configured):attempt===1?1000:3000),retryDelayMs=Math.min(MAX_RETRY_DELAY,delay);
       notify({url,label:displayLabel,status:'retrying',attempt,nextAttempt:attempt+1,maxAttempts:attemptLimit,retryDelayMs,error});
       try{await waitImpl(retryDelayMs,controller.signal);}catch{throw abortedError();}
      }
     }
    }catch(error){if(cache.get(key)===record)cache.delete(key);notify({url,label:displayLabel,status:'failed',error});throw error;}
    finally{if(signal)signal.removeEventListener('abort',externalAbort);}

    async function request(){
     const attemptController=new AbortController();let timer,abortListener,timedOut=false;
     const cancel=()=>attemptController.abort(controller.signal.reason);controller.signal.addEventListener('abort',cancel,{once:true});
     try{
      const aborted=new Promise((resolve,reject)=>{abortListener=()=>reject(timedOut?new AssetLoadError('ASSET_TIMEOUT',url,displayLabel,'연결 대기 시간이 지났습니다. 이 파일을 다시 시도해 주세요.'):abortedError());attemptController.signal.addEventListener('abort',abortListener,{once:true});});
      if(Number.isFinite(timeoutMs)&&timeoutMs>0)timer=setTimeout(()=>{timedOut=true;attemptController.abort();},timeoutMs);
      const resource=(async()=>{
       let response;try{response=await fetchImpl(url,{signal:attemptController.signal});}catch(cause){if(attemptController.signal.aborted)throw timedOut?new AssetLoadError('ASSET_TIMEOUT',url,displayLabel,'연결 대기 시간이 지났습니다. 이 파일을 다시 시도해 주세요.',{cause}):abortedError();throw new AssetLoadError('ASSET_NETWORK',url,displayLabel,'연결을 확인하고 이 파일을 다시 시도해 주세요.',{cause});}
       if(!response?.ok)throw new AssetLoadError('ASSET_HTTP',url,displayLabel,`응답 오류 ${response?.status??'확인 불가'}. 다시 시도해 주세요.`,{httpStatus:response?.status,retryAfterMs:retryAfter(response,now)});
       let value;try{value=await response[kind]();}catch(cause){throw new AssetLoadError('ASSET_PARSE',url,displayLabel,kind==='json'?'JSON 자료의 형식을 확인하지 못했습니다. 다시 시도해 주세요.':'자료의 내용을 읽지 못했습니다. 다시 시도해 주세요.',{cause});}
       try{if(validate&&await validate(value)===false)throw new Error('Validation returned false');}catch(cause){throw new AssetLoadError('ASSET_INVALID',url,displayLabel,'자료의 항목을 확인하지 못했습니다. 다시 시도해 주세요.',{cause});}
       return value;
      })();
      return await Promise.race([resource,aborted]);
     }finally{clearTimeout(timer);if(abortListener)attemptController.signal.removeEventListener('abort',abortListener);controller.signal.removeEventListener('abort',cancel);}
    }
   })();
  }
  return record.promise;
 }
 return{json:(url,options)=>load('json',url,options),text:(url,options)=>load('text',url,options)};
}
