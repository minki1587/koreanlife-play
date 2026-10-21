export function decisionKey(life) {
  return life?.phase === 'decision' && life.pendingDecision
    ? `${life.seed}|${life.pendingDecision}|${life.totalMonths}` : null;
}

/** Folding never resolves a decision. Native modality provides focus containment and backdrop. */
export function createDecisionDialog({dialog,reminder,reopen,fold,heading}) {
  let key=null, folded=false, blocked=false;
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
    folded=true;paint();reopen.focus({preventScroll:true});
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
      if(nextKey!==key){key=nextKey;folded=false;}
      blocked=nextBlocked;paint();
    },
    suspend(){blocked=true;paint();},
    minimize,
  });
}
