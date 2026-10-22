import {formatStorageBytes} from './save-capacity.mjs?v=review-two-1';
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function button(text,handler,className='secondary'){const node=el('button',text,className);node.type='button';node.addEventListener('click',handler);return node;}
function facts(host,life){
 const list=el('dl',undefined,'finance-facts');
 for(const [label,value] of [['이름',life.name],['나이',`${life.age}세 ${life.month}개월`],['직업',life.job.title],['거주지',`${life.residence.region} · ${life.residence.city}`],['진행 상태',life.phase==='ended'?'종료된 삶':life.phase==='decision'?'갈림길 선택 대기':'이어서 진행 가능']]){const row=el('div');row.append(el('dt',label),el('dd',String(value)));list.append(row);}
 host.replaceChildren(list);
}
export function createSaveTransferBrowser({prepareFile,onImport,getBackup,getBackups,onRestore,onDownloadBackup,onDeleteBackup,getStorageUsage,getStorageError,onDownloadCurrent,canDownloadCurrent,onRetrySave,getRecoveryDownloads,getRecoveryError,onDownloadRecovery,onOpen,onClose}){
 const dialog=el('dialog',undefined,'life-tools-dialog save-transfer-dialog');dialog.id='save-transfer-dialog';dialog.setAttribute('aria-labelledby','save-transfer-title');
 const top=el('div',undefined,'dialog-top'),title=el('h2','진행 기록 불러오기');title.id='save-transfer-title';title.tabIndex=-1;
 const close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','기록 불러오기 창 닫기');top.append(title,close);
 const body=el('div',undefined,'life-tool-body'),intro=el('p','다른 기기에서 저장한 JSON 파일(최대 8MB)을 선택해 주세요. 파일은 이 브라우저에서 확인하며 서버로 전송하지 않습니다.');
 const label=el('label','진행 기록 JSON 파일 선택','save-file-label'),input=el('input');input.type='file';input.id='save-import-file';input.accept='.json,application/json';label.htmlFor=input.id;
 const status=el('p','','life-tool-status');status.id='save-import-status';status.setAttribute('role','status');input.setAttribute('aria-describedby',status.id);
 const error=el('p','','save-transfer-error');error.id='save-import-error';error.setAttribute('role','alert');
 const preview=el('section');preview.id='save-import-preview';preview.hidden=true;preview.setAttribute('aria-label','불러올 기록 미리보기');
 const actions=el('div',undefined,'save-transfer-actions');
 const confirm=button('불러와 이어하기',async()=>{if(!prepared||working)return;working=true;setBusy();try{await onImport(prepared);dialog.close();}catch(e){error.textContent=e?.message||'기록을 불러오지 못했습니다. 기존 기록은 유지합니다.';}finally{working=false;setBusy();}},'primary');confirm.id='save-import-confirm';confirm.disabled=true;
 const cancel=button('취소',()=>dialog.close());actions.append(confirm,cancel);
 const note=el('p','불러오기를 확정하면 현재 기록을 먼저 백업합니다. 새 기록은 일시정지 상태로 열립니다. 다른 기기에서는 현재 기기의 파일을 직접 옮겨 선택해 주세요.','small');
 const capacity=el('section',undefined,'save-capacity-section'),capacityText=el('p'),capacityItems=el('ul'),capacityActions=el('div',undefined,'save-transfer-actions');capacity.hidden=!getStorageUsage;
 const currentDownload=button('현재 화면 기록 내려받기',()=>{try{onDownloadCurrent?.();}catch(e){error.textContent=e?.message||'현재 기록을 내려받지 못했습니다.';}});currentDownload.id='save-current-download';
 const retrySave=button('다시 저장하고 이어가기',async()=>{if(working)return;working=true;setBusy();try{const result=await onRetrySave?.();if(result===false)throw new Error('저장하지 못했습니다. 백업 파일을 확인한 뒤 공간을 정리해 주세요.');dialog.close();}catch(e){error.textContent=e?.message||'다시 저장하지 못했습니다.';refreshUsage();}finally{working=false;setBusy();}});retrySave.id='save-storage-retry';
 capacityActions.append(currentDownload,retrySave);capacity.append(el('h3','저장 공간 관리'),capacityText,capacityItems,el('p','아래 용량은 이 게임의 문자열 보관량 추정입니다. 브라우저의 실제 한도는 환경마다 다릅니다. 백업 원본을 내려받아 파일을 확인한 뒤, 원할 때만 해당 백업을 정리할 수 있습니다.','small'),capacityActions);
 const backup=el('section',undefined,'save-backup-section'),backupTitle=el('h3','기존 저장 백업'),backupText=el('p'),backupRows=el('div');backupText.id='save-backup-description';
 backup.append(backupTitle,backupText,backupRows,el('p','저장일이 있는 최신 백업부터 표시합니다. 복원할 때도 현재 기록을 백업합니다. 백업은 이 기기에만 보관되므로 필요한 파일은 직접 내려받아 주세요.','small'));
 const recovery=el('section',undefined,'save-backup-section');recovery.id='save-recovery-files';recovery.hidden=true;
 body.append(intro,label,input,status,error,preview,note,actions,capacity,backup,recovery);dialog.append(top,body);document.body.append(dialog);
 let prepared=null,working=false,token=0,backupButtons=[],downloadedSnapshots=new Map();
 function setBusy(){confirm.disabled=working||!prepared;input.disabled=working;for(const row of backupButtons){row.restore.disabled=working||!row.info.valid;row.download.disabled=working||typeof row.info.raw!=='string';if(row.cleanup){row.cleanup.disabled=working||downloadedSnapshots.get(row.info.key)!==row.info.raw;row.confirmDelete.disabled=working;row.cancelDelete.disabled=working;}}currentDownload.hidden=!onDownloadCurrent;currentDownload.disabled=working||canDownloadCurrent?.()===false;retrySave.hidden=!onRetrySave||!getStorageError?.();retrySave.disabled=working||canDownloadCurrent?.()===false;cancel.disabled=working;close.disabled=working;}
 function refreshUsage(){if(!getStorageUsage)return;try{const usage=getStorageUsage();capacityText.textContent=`이 게임의 저장 기록 ${formatStorageBytes(usage.totalBytes)}${getStorageError?.()?' · 저장 공간이 부족해 진행을 멈췄습니다.':usage.warning?' · 용량이 커지고 있습니다.':''}`;capacityItems.replaceChildren(...usage.items.map(item=>el('li',`${item.label}: ${formatStorageBytes(item.estimatedBytes)}`)));}catch{capacityText.textContent='저장 공간 정보를 읽지 못했습니다. 현재 기록을 파일로 보관해 주세요.';}setBusy();}
 function refreshBackup(){
  const infos=getBackups?.()??[getBackup?.()].filter(Boolean);backupButtons=[];backupRows.replaceChildren();backupText.textContent=infos.length?'복원할 기록을 선택해 주세요.':'아직 백업한 기록이 없습니다.';
  for(const [index,info]of infos.entries()){
   const card=el('article',undefined,'save-backup-section');card.dataset.backupKey=info.key||'';const heading=el('h4',`${index===0&&info.savedAt?'최근 백업 · ':''}${info.label||'저장 백업'}`),details=el('ul');
   if(info.life)details.append(el('li',`이름: ${info.life.name}`),el('li',`나이: ${info.life.age}세 ${info.life.month}개월`));else details.append(el('li','현재 버전에서 검증되지 않아 복원은 제한합니다. 원본 파일은 내려받을 수 있습니다.'));
   details.append(el('li',`저장일: ${info.savedAt?new Date(info.savedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미기록'}`));
   const actions=el('div',undefined,'save-transfer-actions');
   const download=button('백업 파일 내려받기 ↓',async()=>{if(working)return;working=true;setBusy();try{await onDownloadBackup(info.key,info);downloadedSnapshots.set(info.key,info.raw);status.textContent='표시된 백업 원본의 다운로드를 요청했습니다. 저장된 JSON 파일을 확인한 뒤에만 백업을 정리해 주세요.';}catch(e){error.textContent=e?.message||'백업 파일을 확인할 수 없습니다.';}finally{working=false;setBusy();}});download.id=`save-backup-download${index?'-'+index:''}`;
   const restore=button('백업 복원하기',async()=>{if(working)return;working=true;setBusy();try{await onRestore(info.key,info);dialog.close();}catch(e){error.textContent=e?.message||'백업을 복원하지 못했습니다. 현재 기록은 유지합니다.';if(e?.code==='STORAGE_CHANGED')refreshBackup();}finally{working=false;setBusy();}});restore.id=`save-backup-restore${index?'-'+index:''}`;
   const row={info,download,restore};actions.append(download,restore);card.append(heading,details,actions);
   if(onDeleteBackup){
    const confirmation=el('div',undefined,'save-backup-delete-confirm');confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-label',`${info.label||'백업'} 정리 확인`);
    const cleanup=button('내려받은 백업 정리',()=>{confirmation.hidden=false;row.confirmDelete.focus({preventScroll:true});});cleanup.id=`save-backup-cleanup${index?'-'+index:''}`;
    const confirmDelete=button('파일을 확인했습니다 · 이 백업만 삭제',async()=>{if(working||downloadedSnapshots.get(info.key)!==info.raw)return;working=true;setBusy();try{await onDeleteBackup(info.key,info);status.textContent='선택한 백업만 이 기기에서 정리했습니다. 현재 진행 기록은 유지합니다.';refreshBackup();}catch(e){error.textContent=e?.message||'백업을 정리하지 못했습니다.';if(e?.code==='STORAGE_CHANGED')refreshBackup();}finally{working=false;setBusy();}});confirmDelete.id=`save-backup-delete-confirm${index?'-'+index:''}`;
    const cancelDelete=button('백업 유지',()=>{confirmation.hidden=true;cleanup.focus({preventScroll:true});});
    confirmation.append(el('p',`${info.life?info.life.name+' · '+info.life.age+'세 '+info.life.month+'개월':'표시한 백업'}의 JSON 파일이 저장되었는지 확인해 주세요. 확정하면 이 기기의 해당 백업만 삭제합니다. 현재 진행 기록과 다른 백업은 유지합니다.`),confirmDelete,cancelDelete);actions.append(cleanup);card.append(confirmation);Object.assign(row,{cleanup,confirmDelete,cancelDelete});
   }
   backupRows.append(card);backupButtons.push(row);
  }
  recovery.replaceChildren();const copies=getRecoveryDownloads?.()||[];recovery.hidden=!copies.length;if(copies.length){recovery.append(el('h3','중단 전 기록 보관'));for(const [i,copy]of copies.entries())recovery.append(button(`복구용 원본 ${i+1} 내려받기 ↓`,()=>onDownloadRecovery(copy)));}refreshUsage();setBusy();
 }
 input.addEventListener('change',async()=>{const ticket=++token,file=input.files?.[0];prepared=null;preview.hidden=true;preview.replaceChildren();error.textContent='';if(!file){status.textContent='';setBusy();return;}working=true;status.textContent='파일을 확인하고 있습니다.';setBusy();try{const next=await prepareFile(file);if(ticket!==token||!dialog.open)return;prepared=next;facts(preview,next.life);preview.hidden=false;status.textContent=`${file.name} · 기록 확인 완료. 내용을 확인하고 불러오기를 눌러 주세요.`;}catch(e){if(ticket===token)error.textContent=e?.message||'파일을 확인하지 못했습니다. 기존 기록은 유지합니다.';}finally{if(ticket===token){working=false;if(!prepared)status.textContent='';setBusy();}}});
 dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});
 dialog.addEventListener('close',()=>{token++;working=false;prepared=null;input.value='';onClose?.();});
 dialog.addEventListener('click',e=>{if(working||e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 return{get isOpen(){return dialog.open;},refresh(){if(dialog.open&&!working)refreshBackup();},open(){if(dialog.open||onOpen?.()===false)return;prepared=null;working=false;downloadedSnapshots=new Map();input.value='';status.textContent='';error.textContent=getRecoveryError?.()||'';preview.hidden=true;refreshBackup();dialog.showModal();title.focus({preventScroll:true});},close(){if(dialog.open&&!working)dialog.close();}};
}
