const instances=new WeakMap();
export function scrollEdges({scrollLeft=0,clientWidth=0,scrollWidth=0}={}){
 const max=Math.max(0,scrollWidth-clientWidth);
 return{overflow:max>3,before:max>3&&scrollLeft>3,after:max>3&&scrollLeft<max-3};
}
/** Add controls only when a single-line row actually has hidden content. */
export function initScrollHints(document=globalThis.document){
 if(!document?.querySelectorAll)return;
 for(const row of document.querySelectorAll('.daily-stats,.focus-group')){
  if(instances.has(row))continue;
  const wrapper=document.createElement('div');wrapper.className='one-line-scroll';row.before(wrapper);wrapper.append(row);
  const name=row.getAttribute('aria-label')||'항목',buttons=[];
  for(const [direction,symbol,label]of [[-1,'‹','이전'],[1,'›','다음']]){
   const button=document.createElement('button');button.type='button';button.className=`row-scroll row-scroll-${direction<0?'before':'after'}`;button.textContent=symbol;button.setAttribute('aria-label',`${name} ${label} 항목 보기`);
   button.addEventListener('click',()=>row.scrollBy({left:direction*Math.max(100,row.clientWidth*.65),behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'instant':'smooth'}));wrapper.append(button);buttons.push(button);
  }
  const update=()=>{const overflow=row.scrollWidth>(wrapper.clientWidth||row.clientWidth)+3;wrapper.dataset.overflow=String(overflow);const edges=overflow?scrollEdges(row):{before:false,after:false};for(const [i,visible]of [[0,edges.before],[1,edges.after]]){if(!visible&&document.activeElement===buttons[i]){if(!row.hasAttribute('tabindex'))row.tabIndex=-1;row.focus({preventScroll:true});}buttons[i].hidden=!visible;}};
  row.addEventListener('scroll',update,{passive:true});
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(update):null;
  observer?.observe(row);for(const child of row.children)observer?.observe(child);
  globalThis.addEventListener?.('resize',update,{passive:true});
  instances.set(row,{update,observer});update();
 }
}
