export class AssetLoadError extends Error{
 constructor(code,url,label,detail,{cause}={}){const file=String(url).split(/[?#]/u)[0].split('/').at(-1)||String(url);super(`${label&&label!==file?`${label} (${file})`:file}을 불러오지 못했습니다. ${detail}`,cause?{cause}:undefined);this.name='AssetLoadError';this.code=code;this.url=url;this.label=label||file;}
}
/** A failed file is evicted independently; successful files and concurrent
 * requests for the same URL/type are reused during retries. */
export function createAssetLoader({fetchImpl=globalThis.fetch,timeoutMs=12000,onStatus=()=>{}}={}){
 const cache=new Map();
 const notify=event=>{try{onStatus(event);}catch{}};
 function load(kind,url,{label,validate,signal}={}){
  const key=`${kind}:${url}`,displayLabel=label||String(url).split(/[?#]/u)[0].split('/').at(-1)||String(url);
  if(signal?.aborted)return Promise.reject(new AssetLoadError('ASSET_ABORTED',url,displayLabel,'요청이 중단되었습니다. 다시 시도해 주세요.'));
  let record=cache.get(key);
  if(!record){
   const controller=new AbortController();record={controller,promise:null};cache.set(key,record);notify({url,label:displayLabel,status:'loading'});
   record.promise=(async()=>{
    let timer,abortListener,externalAbort,timedOut=false;
    try{
     const aborted=new Promise((resolve,reject)=>{abortListener=()=>reject(new AssetLoadError(timedOut?'ASSET_TIMEOUT':'ASSET_ABORTED',url,displayLabel,timedOut?'연결 대기 시간이 지났습니다. 이 파일을 다시 시도해 주세요.':'요청이 중단되었습니다. 다시 시도해 주세요.'));controller.signal.addEventListener('abort',abortListener,{once:true});});
     if(signal){externalAbort=()=>controller.abort(signal.reason);signal.addEventListener('abort',externalAbort,{once:true});}
     if(Number.isFinite(timeoutMs)&&timeoutMs>0)timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
     const fetchResource=(async()=>{
      let response;try{response=await fetchImpl(url,{signal:controller.signal});}catch(cause){if(controller.signal.aborted)throw new AssetLoadError(timedOut?'ASSET_TIMEOUT':'ASSET_ABORTED',url,displayLabel,'요청이 중단되었습니다. 다시 시도해 주세요.',{cause});throw new AssetLoadError('ASSET_NETWORK',url,displayLabel,'연결을 확인하고 이 파일을 다시 시도해 주세요.',{cause});}
      if(!response?.ok)throw new AssetLoadError('ASSET_HTTP',url,displayLabel,`응답 오류 ${response?.status??'확인 불가'}. 다시 시도해 주세요.`);
      try{return await response[kind]();}catch(cause){throw new AssetLoadError('ASSET_PARSE',url,displayLabel,kind==='json'?'JSON 자료의 형식을 확인하지 못했습니다. 다시 시도해 주세요.':'자료의 내용을 읽지 못했습니다. 다시 시도해 주세요.',{cause});}
     })();
     const value=await Promise.race([fetchResource,aborted]);
     try{if(validate&&await validate(value)===false)throw new Error('Validation returned false');}catch(cause){throw new AssetLoadError('ASSET_INVALID',url,displayLabel,'자료의 항목을 확인하지 못했습니다. 다시 시도해 주세요.',{cause});}
     notify({url,label:displayLabel,status:'ready'});return value;
    }catch(error){if(cache.get(key)===record)cache.delete(key);notify({url,label:displayLabel,status:'failed',error});throw error;}
    finally{if(timer!==undefined)clearTimeout(timer);if(abortListener)controller.signal.removeEventListener('abort',abortListener);if(signal&&externalAbort)signal.removeEventListener('abort',externalAbort);}
   })();
  }
  return record.promise;
 }
 return{json:(url,options)=>load('json',url,options),text:(url,options)=>load('text',url,options)};
}
