import {createDecisionDialog} from './decision-dialog.mjs?v=birth-draw-20261024';

export function createMilitaryDutyBrowser({document=globalThis.document,onAction,onOpen,onClose}={}){
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const dialog=node('dialog');dialog.id='military-duty-dialog';dialog.className='decision-dialog';dialog.setAttribute('aria-labelledby','military-duty-title');dialog.setAttribute('aria-describedby','military-duty-text');
 const top=node('div');top.className='decision-dialog-top';const category=node('span','복무와 예비군'),fold=node('button','− 잠시 접고 게임 보기');fold.type='button';fold.className='secondary';top.append(category,fold);
 const body=node('section');body.className='story-card';const heading=node('h2');heading.id='military-duty-title';heading.tabIndex=-1;const text=node('p');text.id='military-duty-text';const choices=node('div'),error=node('p');error.setAttribute('role','alert');body.append(heading,text,choices,error);dialog.append(top,body);
 const reminder=node('aside');reminder.className='decision-reminder';reminder.hidden=true;const reopen=node('button','복무·예비군 선택 다시 열기');reopen.id='military-duty-reopen';reopen.type='button';reopen.className='secondary';reopen.setAttribute('aria-controls',dialog.id);reminder.append(reopen);document.getElementById('game').append(reminder);document.body.append(dialog);
 const control=createDecisionDialog({dialog,reminder,reopen,fold,heading});let current=null,working=false,blockedNow=false;
 async function act(action){
  if(working)return;working=true;error.textContent='';for(const b of choices.children)b.disabled=true;fold.disabled=true;
  try{await onAction(action);}
  catch(cause){error.textContent=cause?.message||'현재 조건을 다시 확인해 주세요.';}
  finally{working=false;fold.disabled=false;paintChoices();control.update(current?.id??null,{blocked:blockedNow});}
 }
 function paintChoices(){
  choices.replaceChildren();for(const action of current?.actions||[]){const b=node('button'),label=node('b',action.label),facts=node('ul');b.type='button';b.className='choice';for(const fact of action.facts||[])facts.append(node('li',fact));b.append(label,facts);b.disabled=working||!!action.disabled;b.addEventListener('click',()=>act(action));choices.append(b);}
 }
 dialog.addEventListener('cancel',event=>{if(working){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 dialog.addEventListener('click',event=>{if(working&&event.target===dialog){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 dialog.addEventListener('close',()=>onClose?.());
 return{get isOpen(){return dialog.open;},get isPending(){return working;},reopen(){if(current)reopen.click();},suspend(){control.suspend();},update(model,{blocked=false}={}){blockedNow=blocked;const changed=current?.id!==model?.id;current=model;if(changed)error.textContent='';if(current){heading.textContent=current.title;text.textContent=current.text;}paintChoices();const wasOpen=dialog.open;control.update(current?.id??null,{blocked});if(!wasOpen&&dialog.open)onOpen?.();},close(){if(working)return false;control.update(null);current=null;return true;},destroy(){control.update(null);dialog.remove();reminder.remove();}};
}
