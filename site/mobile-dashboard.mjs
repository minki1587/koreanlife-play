/** Keep narrow-screen essentials nearby without duplicating or moving save state. */
export function createMobileDashboard({document=globalThis.document,matchMedia=globalThis.matchMedia,compact=false}={}){
 const game=document.getElementById('game'),history=document.querySelector('.history-rail');
 if(!game||!history)return{update(){},select(){},destroy(){}};
 const media=matchMedia('(max-width: 1023px)'),summary=document.createElement('section'),nav=document.createElement('nav'),buttons=new Map(),values={};let active='life';
 summary.className='mobile-game-summary';summary.id='mobile-game-summary';summary.setAttribute('aria-label','나이와 생활 요약');
 for(const [id,label]of [['age','나이'],['cash','내 소지금'],['living','생활비 / 월']]){
  const node=document.createElement(id==='age'?'div':'button'),caption=document.createElement('span'),value=document.createElement('strong');caption.textContent=label;node.append(caption,value);values[id]=value;
  if(id!=='age'){node.type='button';node.setAttribute('aria-label',`${label} · 돈의 기록 보기`);node.addEventListener('click',()=>{select('money');history.scrollIntoView?.({behavior:'smooth',block:'start'});});}summary.append(node);
 }
 game.insertBefore(summary,game.querySelector('.clockbar')?.nextSibling||game.firstChild);
 nav.className='mobile-record-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','기록 종류');
 const panels={life:document.getElementById('timeline-panel'),money:document.getElementById('finance-panel')};
 for(const [id,label]of [['life','흘러온 시간'],['money','돈의 기록']]){
  const b=document.createElement('button');b.type='button';b.id=`mobile-${id}-tab`;b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[id].id);b.addEventListener('click',()=>select(id));
  b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?'life':e.key==='End'?'money':active==='life'?'money':'life';select(target);buttons.get(target).focus();});buttons.set(id,b);nav.append(b);
 }
 history.insertBefore(nav,history.firstChild);
 function paint(){const narrow=media.matches||compact;summary.hidden=compact||!narrow;nav.hidden=!narrow;for(const [id,panel]of Object.entries(panels)){panel.hidden=narrow&&active!==id;panel.setAttribute('role',narrow?'tabpanel':'region');panel.setAttribute('aria-labelledby',narrow?buttons.get(id).id:id==='life'?'timeline-title':'finance-title');const b=buttons.get(id);b.setAttribute('aria-selected',String(active===id));b.tabIndex=active===id?0:-1;}}
 function select(id){if(!Object.hasOwn(panels,id))return;active=id;paint();}
 const onChange=()=>paint();media.addEventListener?.('change',onChange);if(!media.addEventListener)media.addListener?.(onChange);paint();
 return{update({ageText,cashText,livingText}){values.age.textContent=ageText;values.cash.textContent=cashText;values.living.textContent=livingText;},select,destroy(){media.removeEventListener?.('change',onChange);media.removeListener?.(onChange);summary.remove();nav.remove();for(const panel of Object.values(panels)){panel.hidden=false;panel.setAttribute('role','region');}}};
}
