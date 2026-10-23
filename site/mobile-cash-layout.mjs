/** Reposition the existing wallet only; money, events and IDs stay shared. */
export function createCashGlanceLayout({document=globalThis.document,matchMedia=globalThis.matchMedia}={}){
 const cash=document.querySelector('.cash-glance'),game=document.getElementById('game'),clock=document.getElementById('clockbar');
 if(!cash||!game||!clock||typeof matchMedia!=='function')return{destroy(){}};
 const anchor=document.createComment('original-wallet-position');cash.parentNode.insertBefore(anchor,cash);
 const media=matchMedia('(max-width: 1023px)');
 function move(parent,before){
  if(before===cash||cash.parentNode===parent&&cash.nextSibling===before)return;
  const active=document.activeElement,focused=active&&cash.contains(active);
  parent.insertBefore(cash,before);
  if(focused&&document.activeElement!==active)active.focus?.({preventScroll:true});
 }
 const restore=()=>{if(anchor.parentNode)move(anchor.parentNode,anchor.nextSibling);};
 const paint=()=>{if(media.matches)move(game,clock.nextSibling===cash?cash.nextSibling:clock.nextSibling);else restore();};
 media.addEventListener?.('change',paint);if(!media.addEventListener)media.addListener?.(paint);paint();
 return{destroy(){media.removeEventListener?.('change',paint);if(!media.removeEventListener)media.removeListener?.(paint);restore();anchor.remove();}};
}
