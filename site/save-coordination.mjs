import {peekSaveMetadata} from './save-codec.mjs?v=birth-speed-20261024';
/** All same-origin save writers share a Web Lock; exact observed bytes also
 * protect against older releases that do not use this lock. No unload writes. */
export class SaveConflictError extends Error {
 constructor(message='다른 탭에서 더 최신 기록을 저장했습니다. 이 화면의 진행을 멈췄습니다.') {super(message);this.name='SaveConflictError';this.code='SAVE_CONFLICT';}
}
export function storedSaveMetadata(raw){
 try{const meta=peekSaveMetadata(raw);return meta&&Number.isSafeInteger(meta.revision)&&meta.revision>=0&&typeof meta.writer==='string'?{revision:meta.revision,writer:meta.writer,savedAt:validSavedAt(meta.savedAt)}:null;}catch{return null;}
}
export function validSavedAt(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;}
export function createSaveCoordinator({storage,locks,key='koreanlife-save-v2',writer=globalThis.crypto?.randomUUID?.()||`tab-${Math.random().toString(36).slice(2)}`,now=()=>new Date().toISOString(),onConflict=()=>{}}){
 let observed=null,ready=false,conflicted=false,queue=Promise.resolve();
 const conflict=()=>{if(!conflicted){conflicted=true;onConflict(new SaveConflictError());}throw new SaveConflictError();};
 function exclusive(action){
  const run=async()=>{if(typeof locks?.request!=='function'){const error=new Error('이 브라우저에서는 탭 사이의 안전한 자동 저장을 사용할 수 없습니다. 진행 기록을 파일로 보관해 주세요.');error.code='SAVE_LOCK_UNAVAILABLE';throw error;}return locks.request(`${key}-writer`,{mode:'exclusive'},action);};
  const pending=queue.then(run,run);queue=pending.catch(()=>{});return pending;
 }
 return {
  get conflicted(){return conflicted;},get observed(){return observed;},get writer(){return writer;},
  initialize(recover=()=>{}){return exclusive(()=>{recover();observed=storage.getItem(key);ready=true;return observed;});},
  /** Explicit resume adopts a storage snapshot only while holding the writer lock. */
  adopt(read,{recover=()=>{}}={}){return exclusive(()=>{recover();const raw=storage.getItem(key),result=read(raw);observed=raw;ready=true;conflicted=false;return result;});},
  check(){if(!ready||conflicted)return false;if(storage.getItem(key)!==observed)conflict();return true;},
  observeChange(newValue){if(ready&&newValue!==observed&&storage.getItem(key)!==observed&&!conflicted){conflicted=true;onConflict(new SaveConflictError());return true;}return false;},
  run(action){return exclusive(()=>{
   if(!ready)throw new Error('안전한 저장을 준비하지 못했습니다. 새로고침 후 다시 확인해 주세요.');
   if(conflicted||storage.getItem(key)!==observed)conflict();
   const previous=storedSaveMetadata(observed),metadata={revision:(previous?.revision||0)+1,writer,savedAt:now()};
   const result=action({beforePrimary:observed,metadata});
   if(result&&typeof result.then==='function')throw new Error('Save operations must complete within one synchronous transaction.');
   observed=storage.getItem(key);return result;
  });},
  async settled(){await queue;}
 };
}
