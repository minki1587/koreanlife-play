/** Move keyboard context only for a real screen transition, never a monthly render. */
export function focusScreen(document,screen,{enqueue=queueMicrotask}={}){
 if(screen==='birth')return;
 enqueue(()=>{
  const root=document.getElementById(screen);if(!root||root.hidden||document.querySelector('dialog[open]'))return;
  const id=screen==='game'?'person':screen==='ending'?'ending-title':document.getElementById('resume')?.hidden?'start':'resume';
  const target=document.getElementById(id);if(!target||target.hidden||target.disabled)return;
  if(!['BUTTON','A','INPUT'].includes(target.tagName))target.tabIndex=-1;
  target.focus({preventScroll:true});
 });
}
export function focusBirthResult(document,{enqueue=queueMicrotask}={}){
 enqueue(()=>{const root=document.getElementById('birth'),target=document.getElementById('city-reel');if(!root||root.hidden||root.getAttribute('aria-busy')==='true'||!target||document.querySelector('dialog[open]'))return;target.tabIndex=-1;target.focus({preventScroll:true});});
}
