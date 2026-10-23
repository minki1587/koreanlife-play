import {SAVE_CODEC,encodeSaveRecord,unpackParsedSaveRecord} from './save-codec.mjs?v=continuity-1';
import {validSave,VERSION} from './engine.mjs?v=continuity-1';
import {validCareerModel} from './career-economy.mjs?v=continuity-1';
import {storedSaveMetadata,validSavedAt} from './save-coordination.mjs?v=continuity-1';

export const SAVE_KEY='koreanlife-save-v2';
export const IMPORT_BACKUP_KEY=SAVE_KEY+'-import-backup';
export const PREVIOUS_BACKUP_KEY=SAVE_KEY+'-previous';
export const JOURNAL_KEY=SAVE_KEY+'-import-journal-v1';
export const MAX_SAVE_FILE_BYTES=8*1024*1024;
export const MAX_SAVE_DEPTH=64;
export const MAX_SAVE_NODES=1000000;
const MAX_JOURNAL_BYTES=MAX_SAVE_FILE_BYTES*3+65536;
const previews=new WeakMap(),unsafeKeys=new Set(['__proto__','prototype','constructor']);
const bytes=text=>new TextEncoder().encode(text).byteLength;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const own=(v,k)=>Object.hasOwn(v,k);

export class SaveTransferError extends Error{
 constructor(code,message,options={}){super(message,options.cause?{cause:options.cause}:undefined);this.name='SaveTransferError';this.code=code;this.recoveryRequired=!!options.recoveryRequired;if(options.rollbackComplete!==undefined)this.rollbackComplete=options.rollbackComplete;}
}
function fail(code,message,options){throw new SaveTransferError(code,message,options);}
function checkGraph(root,{freeze=false,maxDepth=MAX_SAVE_DEPTH,maxNodes=MAX_SAVE_NODES}={}){
 const stack=[{value:root,depth:0}],active=new WeakSet(),objects=new Set();let count=0;
 while(stack.length){const frame=stack.pop(),v=frame.value;
  if(frame.leave){active.delete(v);continue;}
  if(++count>maxNodes)fail('JSON_COMPLEXITY','파일의 항목 수가 너무 많습니다.');
  if(frame.depth>maxDepth)fail('JSON_DEPTH','파일의 중첩 구조가 너무 깊습니다.');
  if(typeof v==='number'&&(!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER/10))fail('JSON_NUMBER','파일에 허용 범위를 벗어난 숫자가 있습니다.');
  if(v===null||typeof v!=='object'){if(!['string','number','boolean'].includes(typeof v)&&v!==null)fail('SAVE_INVALID','저장 파일의 값 형식을 확인해 주세요.');continue;}
  if(!Array.isArray(v)&&!plain(v)||active.has(v))fail('SAVE_INVALID','저장 파일의 객체 구조가 올바르지 않습니다.');
  if(Array.isArray(v)&&v.length>maxNodes)fail('JSON_COMPLEXITY','파일의 항목 수가 너무 많습니다.');
  active.add(v);objects.add(v);stack.push({value:v,leave:true});
  for(const key of Object.keys(v)){if(unsafeKeys.has(key))fail('JSON_UNSAFE_KEY','허용되지 않는 객체 키가 포함된 파일입니다.');stack.push({value:v[key],depth:frame.depth+1});}
 }
 if(freeze)for(const object of objects)Object.freeze(object);
}
function parseText(text,{maxBytes=MAX_SAVE_FILE_BYTES}={}){
 if(typeof text!=='string'||!text.trim())fail('FILE_EMPTY','빈 파일은 불러올 수 없습니다.');
 if(text.length>maxBytes||bytes(text)>maxBytes)fail('FILE_TOO_LARGE','저장 파일은 8 MiB 이하만 불러올 수 있습니다.');
 const source=text.charCodeAt(0)===0xfeff?text.slice(1):text;let depth=0,quoted=false,escaped=false;
 // Reject excessive nesting before native JSON parsing allocates that structure.
 for(const char of source){if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;}else if(char==='"')quoted=true;else if(char==='{'||char==='['){if(++depth>MAX_SAVE_DEPTH+2)fail('JSON_DEPTH','파일의 중첩 구조가 너무 깊습니다.');}else if(char==='}'||char===']')depth--;}
 let parsed;try{parsed=JSON.parse(source);}catch(cause){fail('JSON_INVALID','JSON 형식이 올바르지 않습니다. 저장한 원본 파일을 선택해 주세요.',{cause});}
 // Tuples add tag/index nodes; they are representation overhead, not additional
 // decoded game facts. Unpack and the following graph check retain the original
 // one-million-node limit, 64-level depth and 8 MiB expansion ceiling.
 checkGraph(parsed,{maxDepth:MAX_SAVE_DEPTH+2,maxNodes:parsed?.codec===SAVE_CODEC?MAX_SAVE_NODES*4+110020:MAX_SAVE_NODES});return parsed;
}
function checkFileType(fileName,mimeType){
 if(typeof fileName!=='string'||!fileName.toLowerCase().endsWith('.json'))fail('FILE_TYPE','확장자가 .json인 진행 기록 파일을 선택해 주세요.');
 const mime=String(mimeType||'').split(';')[0].trim().toLowerCase();
 if(mime&&!['application/json','text/json','text/plain','application/octet-stream'].includes(mime))fail('FILE_TYPE','JSON 진행 기록 파일만 불러올 수 있습니다.');
}
function normalizeSettings(settings){
 if(settings!==undefined&&(!plain(settings)||own(settings,'paused')&&typeof settings.paused!=='boolean'||own(settings,'speed')&&![1,2,5].includes(settings.speed)))fail('SETTINGS_INVALID','저장 파일의 진행 속도 설정을 확인해 주세요.');
 return{paused:true,speed:settings?.speed??1};
}
function checkLife(life){
 if(!plain(life))fail('SAVE_INVALID','파일에서 게임 진행 기록을 찾지 못했습니다.');
 if(life.version!==VERSION)fail('SAVE_VERSION',`지원하지 않는 저장 버전입니다. 현재는 버전 ${VERSION} 진행 기록을 불러올 수 있습니다.`);
 checkGraph(life);
 if(!plain(life.paths)||!['habit','studyTrack','relationship','wellness'].every(k=>typeof life.paths[k]==='string')||typeof life.retired!=='boolean'||!Number.isInteger(life.careerMonths)||!validSave(life))fail('SAVE_INVALID','게임 진행 기록의 구조나 수치가 올바르지 않습니다. 기존 기록은 변경하지 않았습니다.');
 const previous=life.service?.previousJob;
 if(previous!==null&&previous!==undefined&&(!plain(previous)||typeof previous.title!=='string'||typeof previous.status!=='string'||!Number.isFinite(previous.income)||previous.income<0||own(previous,'occupationId')&&!/^know-\d{6}$/u.test(previous.occupationId)||own(previous,'careerModel')&&(!validCareerModel(previous.careerModel)||previous.careerModel.occupationId!==previous.occupationId||!Number.isInteger(previous.experienceMonths)||previous.experienceMonths<0||!Number.isFinite(previous.payScale)||previous.payScale<=0)))fail('SAVE_INVALID','복무 전 직업 기록이 올바르지 않습니다.');
 if(!life.legacyHistory.every(h=>plain(h)&&Number.isInteger(h.age)&&h.age>=0&&h.age<=life.age&&(typeof h.choice==='string'||typeof h.title==='string')&&(!own(h,'changes')||Array.isArray(h.changes)&&h.changes.every(v=>typeof v==='string'))))fail('SAVE_INVALID','이전 버전의 선택 기록이 올바르지 않습니다.');
}
function previewFrom(text,{fileName='koreanlife-save-v2.json',mimeType='',sourceKey=null}={}){
 checkFileType(fileName,mimeType);const parsed=unpackParsedSaveRecord(parseText(text));checkGraph(parsed);const wrapped=plain(parsed)&&own(parsed,'life'),life=wrapped?parsed.life:parsed,settings=normalizeSettings(wrapped?parsed.settings:undefined);checkLife(life);
 checkGraph(life,{freeze:true});Object.freeze(settings);
 const summary=Object.freeze({name:life.name,age:life.age,month:life.month,job:life.job.title,residence:[life.residence.region,life.residence.city].filter(Boolean).join(' '),phase:life.phase,choices:life.history.length+life.legacyHistory.length});
 const preview=Object.freeze({life,settings,summary,fileName,bytes:bytes(text),formatVersion:VERSION});previews.set(preview,{life,settings,sourceKey,sourceText:sourceKey?text:null});return preview;
}

/** Inspection has no storage writes. Only an explicit confirmation may commit. */
export function inspectSaveText(text,options={}){return previewFrom(text,options);}
export async function readSaveFile(file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<0||typeof file.text!=='function')fail('FILE_READ','선택한 파일을 읽을 수 없습니다.');
 checkFileType(file.name,file.type);
 if(file.size>MAX_SAVE_FILE_BYTES)fail('FILE_TOO_LARGE','저장 파일은 8 MiB 이하만 불러올 수 있습니다.');
 let text;try{text=await file.text();}catch(cause){fail('FILE_READ','파일을 읽지 못했습니다. 파일 접근 권한을 확인해 주세요.',{cause});}
 return previewFrom(text,{fileName:file.name,mimeType:file.type});
}
function get(storage,key){try{return storage.getItem(key);}catch(cause){fail('STORAGE_READ','브라우저의 저장 기록을 읽지 못했습니다. 저장 공간 접근을 확인해 주세요.',{cause});}}
export function previewStoredBackup(storage,{key=IMPORT_BACKUP_KEY,expectedRaw}={}){const raw=get(storage,key);if(expectedRaw!==undefined&&raw!==expectedRaw)fail('STORAGE_CHANGED','표시한 백업이 다른 탭에서 변경되었습니다. 새 목록에서 내용을 다시 확인해 주세요.');return raw===null?null:previewFrom(raw,{fileName:'koreanlife-backup-v2.json',mimeType:'application/json',sourceKey:key});}
function downloadDescriptor(raw,fileName){
 let valid=false,life=null;try{const preview=previewFrom(raw,{fileName});valid=true;life=preview.life;}catch{}
 return{text:raw,raw,fileName,mimeType:'application/json',bytes:bytes(raw),valid,life};
}
/** Return the exact stored bytes, even for a damaged backup that must be preserved. */
export function createBackupDownload(storage,{key=SAVE_KEY}={}){const raw=get(storage,key);return raw===null?null:downloadDescriptor(raw,key===SAVE_KEY?'koreanlife-current-backup-v2.json':key===IMPORT_BACKUP_KEY?'koreanlife-import-backup-v2.json':'koreanlife-previous-backup-v2.json');}
/** Both independent backup slots remain visible. Undated legacy files are not
 * assigned a timestamp using character age or the time this menu was opened. */
export function listStoredBackups(storage){return [[PREVIOUS_BACKUP_KEY,'이전 삶의 기록'],[IMPORT_BACKUP_KEY,'불러오기 전 기록']].flatMap(([key,label])=>{const copy=createBackupDownload(storage,{key});return copy?[{...copy,key,label,savedAt:storedSaveMetadata(copy.text)?.savedAt??null}]:[];}).sort((a,b)=>a.savedAt&&b.savedAt?Date.parse(b.savedAt)-Date.parse(a.savedAt):a.savedAt?-1:b.savedAt?1:0);}
/** Explicit cleanup never touches the current save or a pending import journal.
 * The caller also holds the same cross-tab writer lock used for save/import. */
export function removeStoredBackup(storage,{key,expectedRaw,confirmed=false}={}){
 if(confirmed!==true)fail('BACKUP_DELETE_CONFIRMATION_REQUIRED','내려받은 파일을 확인한 뒤 백업 정리를 확정해 주세요.');
 if(![IMPORT_BACKUP_KEY,PREVIOUS_BACKUP_KEY].includes(key)||typeof expectedRaw!=='string')fail('BACKUP_DELETE_INVALID','표시한 백업 원본을 먼저 확인해 주세요.');
 if(get(storage,JOURNAL_KEY)!==null)fail('STORAGE_PENDING','중단된 불러오기 복구를 먼저 완료해 주세요.',{recoveryRequired:true});
 if(get(storage,key)!==expectedRaw)fail('STORAGE_CHANGED','표시한 백업이 다른 탭에서 변경되었습니다. 새 목록에서 내용을 다시 확인해 주세요.');
 storage.removeItem(key);if(get(storage,key)!==null)fail('STORAGE_WRITE','백업을 정리하지 못했습니다. 파일과 기존 저장을 확인해 주세요.');
 return{removed:true,key};
}

function readJournal(storage){
 const raw=get(storage,JOURNAL_KEY);if(raw===null)return null;
 let journal;try{journal=parseText(raw,{maxBytes:MAX_JOURNAL_BYTES});}catch(cause){fail('JOURNAL_INVALID','중단된 불러오기 기록을 확인하지 못했습니다. 기존 파일을 내려받고 복구를 다시 시도해 주세요.',{cause,recoveryRequired:true});}
 if(!plain(journal)||journal.schemaVersion!==1||!['prepared','committed'].includes(journal.stage)||![journal.beforePrimary,journal.beforeBackup].every(v=>v===null||typeof v==='string')||typeof journal.nextPrimary!=='string'||journal.backupKey!==undefined&&![IMPORT_BACKUP_KEY,PREVIOUS_BACKUP_KEY].includes(journal.backupKey))fail('JOURNAL_INVALID','중단된 불러오기 기록의 형식이 올바르지 않습니다.',{recoveryRequired:true});return journal;
}
function restoreKey(storage,key,value){if(storage.getItem(key)===value)return;if(value===null)storage.removeItem(key);else storage.setItem(key,value);if(storage.getItem(key)!==value)throw new Error('Storage restore mismatch');}
function rollBack(storage,journal){
 const failures=[];for(const [key,value]of [[SAVE_KEY,journal.beforePrimary],[journal.backupKey??IMPORT_BACKUP_KEY,journal.beforeBackup]])try{restoreKey(storage,key,value);}catch(error){failures.push(error);}
 let cleaned=false;if(!failures.length)try{storage.removeItem(JOURNAL_KEY);cleaned=storage.getItem(JOURNAL_KEY)===null;}catch{}
 return{complete:!failures.length,cleaned};
}
/** Recover before ordinary save/start/resume writes; no financial/game rules are changed. */
export function recoverSaveTransfer(storage){
 const journal=readJournal(storage);if(!journal)return{recovered:false,cleanedCommitted:false};
 if(journal.stage==='committed'){try{storage.removeItem(JOURNAL_KEY);if(storage.getItem(JOURNAL_KEY)!==null)throw new Error('Journal cleanup mismatch');return{recovered:false,cleanedCommitted:true};}catch(cause){fail('STORAGE_RECOVERY_REQUIRED','불러오기는 완료했지만 복구 기록을 정리하지 못했습니다. 저장 공간 접근을 확인하고 다시 시도해 주세요.',{cause,recoveryRequired:true});}}
 let current,backup;try{current=get(storage,SAVE_KEY);backup=get(storage,journal.backupKey??IMPORT_BACKUP_KEY);}catch(error){error.recoveryRequired=true;throw error;}const expectedBackup=journal.beforePrimary??journal.beforeBackup;
 if(![journal.beforePrimary,journal.nextPrimary].includes(current)||![journal.beforeBackup,expectedBackup].includes(backup))fail('STORAGE_CHANGED','다른 탭에서 저장 기록이 바뀌었습니다. 현재 기록을 내려받은 뒤 복구를 확인해 주세요.',{recoveryRequired:true});
 const result=rollBack(storage,journal);if(!result.complete||!result.cleaned)fail('STORAGE_RECOVERY_REQUIRED','이전 기록 복구를 완료하지 못했습니다. 저장 쓰기를 멈추고 복구용 파일을 보관해 주세요.',{recoveryRequired:true,rollbackComplete:result.complete});return{recovered:true,cleanedCommitted:false};
}
export function getPendingRecoveryDownloads(storage){const journal=readJournal(storage);return journal?[...(journal.beforePrimary===null?[]:[downloadDescriptor(journal.beforePrimary,'koreanlife-recovery-original-v2.json')]),...(journal.beforeBackup===null?[]:[downloadDescriptor(journal.beforeBackup,'koreanlife-recovery-earlier-backup-v2.json')])]:[];}

/** Transaction journal + rollback protect both the current save and its import backup.
 * LocalStorage has atomic individual writes, not multi-key browser transactions.
 * A prepared journal is rolled back on the next startup; a committed journal is
 * only cleaned up, so later gameplay is never reverted after a successful import.
 */
export function commitSaveTransfer(storage,preview,{confirmed=false,life:preparedLife,saveMetadata,expectedPrimary,backupKey=IMPORT_BACKUP_KEY,settings:preparedSettings}={}){
 const record=previews.get(preview);if(!record)fail('IMPORT_PREVIEW_INVALID','먼저 진행 기록 파일을 확인해 주세요.');
 if(confirmed!==true)fail('IMPORT_CONFIRMATION_REQUIRED','미리보기를 확인한 뒤 ‘불러와 이어하기’를 눌러 주세요.');
 if(saveMetadata!==undefined&&(!plain(saveMetadata)||!Number.isSafeInteger(saveMetadata.revision)||saveMetadata.revision<1||typeof saveMetadata.writer!=='string'||!validSavedAt(saveMetadata.savedAt)))fail('SAVE_METADATA_INVALID','저장 시각과 개정 정보를 확인하지 못했습니다.');
 if(expectedPrimary!==undefined&&get(storage,SAVE_KEY)!==expectedPrimary)fail('STORAGE_CHANGED','다른 탭에서 저장 기록이 바뀌었습니다. 최신 기록을 다시 확인해 주세요.');
 if(![IMPORT_BACKUP_KEY,PREVIOUS_BACKUP_KEY].includes(backupKey))fail('BACKUP_SLOT_INVALID','허용된 백업 위치를 확인해 주세요.');
 if(preparedSettings!==undefined)normalizeSettings(preparedSettings);
 const life=structuredClone(preparedLife??record.life);checkLife(life);const settings=preparedSettings?{paused:preparedSettings.paused??true,speed:preparedSettings.speed??1}:{paused:true,speed:record.settings.speed},nextPrimary=encodeSaveRecord({life,settings,...(saveMetadata?{saveMetadata}:{})});
 if(bytes(nextPrimary)>MAX_SAVE_FILE_BYTES)fail('FILE_TOO_LARGE','준비한 진행 기록이 저장 크기 제한을 넘었습니다.');
 if(get(storage,JOURNAL_KEY)!==null)fail('STORAGE_PENDING','중단된 불러오기 복구를 먼저 완료해 주세요.',{recoveryRequired:true});
 if(record.sourceKey&&get(storage,record.sourceKey)!==record.sourceText)fail('STORAGE_CHANGED','확인한 백업이 다른 탭에서 바뀌었습니다. 미리보기를 다시 열어 주세요.');
 const journal={schemaVersion:1,stage:'prepared',beforePrimary:get(storage,SAVE_KEY),beforeBackup:get(storage,backupKey),nextPrimary,...(backupKey===IMPORT_BACKUP_KEY?{}:{backupKey})};
 try{storage.setItem(JOURNAL_KEY,JSON.stringify(journal));}catch(cause){let recoveryRequired=false;try{if(storage.getItem(JOURNAL_KEY)!==null){storage.removeItem(JOURNAL_KEY);recoveryRequired=storage.getItem(JOURNAL_KEY)!==null;}}catch{recoveryRequired=true;}fail('STORAGE_WRITE','복구용 기록을 보관할 저장 공간이 부족하거나 접근할 수 없습니다. 기존 기록은 유지했습니다.',{cause,recoveryRequired,rollbackComplete:true});}
 // Refuse a concurrent writer before modifying either game save slot.
 let unchanged;try{unchanged=get(storage,SAVE_KEY)===journal.beforePrimary&&get(storage,backupKey)===journal.beforeBackup;}catch(cause){const result=rollBack(storage,journal);fail('STORAGE_WRITE','불러오기 중 저장 접근이 중단되었습니다. 기존 기록의 복구 상태를 확인해 주세요.',{cause,recoveryRequired:!result.complete||!result.cleaned,rollbackComplete:result.complete});}
 if(!unchanged){let recoveryRequired=true;try{storage.removeItem(JOURNAL_KEY);recoveryRequired=storage.getItem(JOURNAL_KEY)!==null;}catch{}fail('STORAGE_CHANGED','다른 탭에서 저장 기록이 바뀌었습니다. 미리보기를 다시 열어 주세요.',{recoveryRequired});}
 try{
  if(journal.beforePrimary!==null)storage.setItem(backupKey,journal.beforePrimary);
  storage.setItem(SAVE_KEY,nextPrimary);
  if(storage.getItem(SAVE_KEY)!==nextPrimary||storage.getItem(backupKey)!==(journal.beforePrimary??journal.beforeBackup))throw new Error('Storage transaction mismatch');
  storage.setItem(JOURNAL_KEY,JSON.stringify({...journal,stage:'committed'}));
 }catch(cause){const result=rollBack(storage,journal);fail('STORAGE_WRITE',result.complete?'불러오기를 저장하지 못해 기존 기록과 백업을 복원했습니다.':'불러오기 중 저장 오류가 발생했습니다. 복구용 기록을 보존했으니 저장 쓰기를 멈추고 복구를 다시 시도해 주세요.',{cause,recoveryRequired:!result.complete||!result.cleaned,rollbackComplete:result.complete});}
 let cleanupPending=false;try{storage.removeItem(JOURNAL_KEY);cleanupPending=storage.getItem(JOURNAL_KEY)!==null;}catch{cleanupPending=true;}
 return{life,settings,backupUpdated:journal.beforePrimary!==null,cleanupPending};
}
