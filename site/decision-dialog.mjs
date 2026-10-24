export function decisionKey(life) {
  return life?.phase === 'decision' && life.pendingDecision
    ? `${life.seed}|${life.pendingDecision}|${life.totalMonths}` : null;
}

/** Folding never resolves a decision. Native modality provides focus containment and backdrop. */
export function createDecisionDialog({dialog,reminder,reopen,fold,heading}) {
  let key=null, folded=false, blocked=false, touchActivation=null, closingTouch=null;
  const isTouchClick=e=>e.isTrusted&&e.pointerType==='touch'&&e.detail>0;
  // A queued second tap can arrive at the newly exposed page after close().
  // Consume only that same-position touch click, never down/move/up or keys.
  dialog.addEventListener('click',e=>{
    if(!e.isTrusted||!e.target.closest?.('button')||!dialog.contains(e.target))return;
    touchActivation=isTouchClick(e)?{x:e.clientX,y:e.clientY,time:e.timeStamp}:null;
  },true);
  dialog.ownerDocument.addEventListener('click',e=>{
    if(!closingTouch||!e.isTrusted)return;
    const touch=closingTouch;closingTouch=null;
    const elapsed=e.timeStamp-touch.time;
    if(!dialog.open&&isTouchClick(e)&&elapsed>=0&&elapsed<=350&&
       Math.hypot(e.clientX-touch.x,e.clientY-touch.y)<=24&&!e.target.closest?.('dialog[open]')){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  function paint() {
    const visible=!!key&&!folded&&!blocked;
    if(visible&&!dialog.open){dialog.showModal();heading.focus({preventScroll:true});}
    else if(!visible&&dialog.open)dialog.close();
    reminder.hidden=!key||visible;
    reopen.setAttribute('aria-expanded',String(dialog.open));
    // render() may replace the selected choice while this modal remains open.
    if(dialog.open&&!dialog.contains(dialog.ownerDocument.activeElement))heading.focus({preventScroll:true});
  }
  function minimize() {
    if(!key)return;
    touchActivation=null;folded=true;paint();reopen.focus({preventScroll:true});
  }
  fold.addEventListener('click',minimize);
  reopen.addEventListener('click',()=>{if(key){folded=false;paint();}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();minimize();});
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)minimize();
  });
  return Object.freeze({
    get isOpen(){return dialog.open;},
    update(nextKey,{blocked:nextBlocked=false}={}){
      if(nextKey!==key){
        closingTouch=key&&!nextKey&&dialog.open&&!folded&&!blocked?touchActivation:null;
        touchActivation=null;key=nextKey;folded=false;
      }
      blocked=nextBlocked;paint();
    },
    suspend(){touchActivation=null;blocked=true;paint();},
    minimize,
  });
}
