function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function button(text,handler,className='secondary'){const node=el('button',text,className);node.type='button';node.addEventListener('click',handler);return node;}
function facts(host,life){
 const list=el('dl',undefined,'finance-facts');
 for(const [label,value] of [['이름',life.name],['나이',`${life.age}세 ${life.month}개월`],['직업',life.job.title],['거주지',`${life.residence.region} · ${life.residence.city}`],['진행 상태',life.phase==='ended'?'종료된 삶':life.phase==='decision'?'갈림길 선택 대기':'이어서 진행 가능']]){const row=el('div');row.append(el('dt',label),el('dd',String(value)));list.append(row);}
 host.replaceChildren(list);
}
export function createSaveTransferBrowser({prepareFile,onImport,getBackup,onRestore,onDownloadBackup,getRecoveryDownloads,getRecoveryError,onDownloadRecovery,onOpen,onClose}){
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
 const backup=el('section',undefined,'save-backup-section'),backupTitle=el('h3','기존 저장 백업'),backupText=el('p');backupText.id='save-backup-description';
 const backupActions=el('div',undefined,'save-transfer-actions');
 const download=button('백업 파일 내려받기 ↓',()=>{try{onDownloadBackup();status.textContent='기존 저장 백업을 파일로 보관했습니다.';}catch(e){error.textContent=e?.message||'백업 파일을 확인할 수 없습니다.';}});download.id='save-backup-download';
 const restore=button('백업 복원하기',async()=>{if(working)return;working=true;setBusy();try{await onRestore();dialog.close();}catch(e){error.textContent=e?.message||'백업을 복원하지 못했습니다. 현재 기록은 유지합니다.';}finally{working=false;setBusy();}});restore.id='save-backup-restore';
 backupActions.append(download,restore);backup.append(backupTitle,backupText,backupActions,el('p','복원할 때도 현재 기록을 백업해 다시 돌아올 수 있습니다. 백업은 이 기기에만 보관되므로 필요한 파일은 직접 내려받아 주세요.','small'));
 const recovery=el('section',undefined,'save-backup-section');recovery.id='save-recovery-files';recovery.hidden=true;
 body.append(intro,label,input,status,error,preview,note,actions,backup,recovery);dialog.append(top,body);document.body.append(dialog);
 let prepared=null,working=false,token=0,backupInfo=null;
 function setBusy(){confirm.disabled=working||!prepared;input.disabled=working;restore.disabled=working||!backupInfo?.valid;download.disabled=working||!backupInfo?.raw;cancel.disabled=working;close.disabled=working;}
 function refreshBackup(){backupInfo=getBackup();backupText.textContent=backupInfo?.life?`${backupInfo.life.name} · ${backupInfo.life.age}세 ${backupInfo.life.month}개월`:backupInfo?.raw?'백업 파일을 내려받을 수 있습니다. 현재 버전에서 검증되지 않아 복원은 제한합니다.':'아직 백업한 기록이 없습니다.';recovery.replaceChildren();const copies=getRecoveryDownloads?.()||[];recovery.hidden=!copies.length;if(copies.length){recovery.append(el('h3','중단 전 기록 보관'));for(const [i,copy]of copies.entries())recovery.append(button(`복구용 원본 ${i+1} 내려받기 ↓`,()=>onDownloadRecovery(copy)));}setBusy();}
 input.addEventListener('change',async()=>{const ticket=++token,file=input.files?.[0];prepared=null;preview.hidden=true;preview.replaceChildren();error.textContent='';if(!file){status.textContent='';setBusy();return;}working=true;status.textContent='파일을 확인하고 있습니다.';setBusy();try{const next=await prepareFile(file);if(ticket!==token||!dialog.open)return;prepared=next;facts(preview,next.life);preview.hidden=false;status.textContent=`${file.name} · 기록 확인 완료. 내용을 확인하고 불러오기를 눌러 주세요.`;}catch(e){if(ticket===token)error.textContent=e?.message||'파일을 확인하지 못했습니다. 기존 기록은 유지합니다.';}finally{if(ticket===token){working=false;if(!prepared)status.textContent='';setBusy();}}});
 dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();});
 dialog.addEventListener('close',()=>{token++;working=false;prepared=null;input.value='';onClose?.();});
 dialog.addEventListener('click',e=>{if(working||e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 return{get isOpen(){return dialog.open;},open(){if(dialog.open)return;onOpen?.();prepared=null;working=false;input.value='';status.textContent='';error.textContent=getRecoveryError?.()||'';preview.hidden=true;refreshBackup();dialog.showModal();title.focus({preventScroll:true});},close(){if(dialog.open&&!working)dialog.close();}};
}
