import {formedFamilySummary,formedFamilyOptions} from './formed-family.mjs?v=economic-life-1';
import {renderFormedFamilySummary} from './formed-family-views.mjs?v=economic-life-1';
import {formatMoney} from './spending.mjs?v=economic-life-1';
export {renderFormedFamilyFinance} from './formed-family-views.mjs?v=economic-life-1';

function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;}
function button(text,handler,className='secondary'){const node=el('button',text,className);node.type='button';node.addEventListener('click',handler);return node;}
function lines(values,className){const list=el('ul',undefined,className);for(const value of values||[])if(typeof value==='string'&&value.trim())list.append(el('li',value));return list;}
export function createFormedFamilyBrowser({getState,data,onAction,onOpen,onClose}){
 const dialog=el('dialog',undefined,'life-tools-dialog formed-family-dialog');dialog.id='formed-family-dialog';dialog.setAttribute('aria-labelledby','formed-family-title');
 const heading=el('h2','결혼·자녀');heading.id='formed-family-title';heading.tabIndex=-1;
 const top=el('div',undefined,'dialog-top'),close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','결혼·자녀 창 닫기');top.append(heading,close);
 const status=el('p','','life-tool-status formed-family-error');status.setAttribute('role','alert');
 const body=el('div',undefined,'life-tool-body');dialog.append(top,status,body);document.body.append(dialog);
 let working=false,opener=null,actionButtons=[];
 function setBusy(value){working=value;close.disabled=value;for(const [node,eligible]of actionButtons)node.disabled=value||!eligible;}
 async function act(action){if(working)return;status.textContent='';setBusy(true);try{await onAction(structuredClone(action));dialog.close();}catch(error){status.textContent=error?.message||'지금은 이 선택을 할 수 없습니다. 조건을 확인해 주세요.';status.scrollIntoView?.({block:'nearest'});}finally{setBusy(false);}}
 function optionCard(option,{child}={}){
  const card=el('section',undefined,'formed-action-card'),b=button(option.label,()=>act(option.action),option.costWan===0?'secondary formed-free-action':'primary');b.disabled=!option.eligible;b.dataset.familyAction=option.id;
  if(child&&option.action.type==='parenting'){b.setAttribute('aria-pressed',String(child.parentingStyle===option.action.mode));b.setAttribute('aria-label',`${child.name} · ${option.label}`);}
  actionButtons.push([b,option.eligible]);card.append(b);
  const facts=[];if(Number.isFinite(option.costWan))facts.push(`지금 비용 ${formatMoney(option.costWan)}`);if(Number.isFinite(option.monthlyCostWan))facts.push(`월 비용 ${formatMoney(option.monthlyCostWan)}`);
  card.append(lines([...facts,...(option.effects||[])],'formed-action-effects'));
  if(option.reasons?.length)card.append(lines(option.reasons,'formed-action-reasons'));return card;
 }
 function group(title,options){if(!options.length)return;const section=el('section',undefined,'formed-action-group');section.append(el('h3',title));for(const option of options)section.append(optionCard(option));body.append(section);}
 function render(){
  const state=getState();body.replaceChildren();actionButtons=[];if(!state){body.append(el('p','게임을 시작한 뒤 가족의 일상을 선택할 수 있습니다.'));return;}
  const summary=formedFamilySummary(state),options=formedFamilyOptions(state,data)||[];
  const intro=el('p',`${state.name} · ${state.age}세 ${state.month}개월`,'formed-person-line');body.append(intro);
  body.append(renderFormedFamilySummary(state,{summary,onChild:(child,card)=>{
   const childOptions=options.filter(option=>option.action.type==='parenting'&&option.action.childId===child.id);
   if(childOptions.length){const section=el('div',undefined,'formed-parenting-actions');section.setAttribute('role','group');section.setAttribute('aria-label',`${child.name} 양육 방식`);for(const option of childOptions)section.append(optionCard(option,{child}));card.append(section);}
  }}));
  group('교제와 결혼',options.filter(option=>['meet','date','marry','separate'].includes(option.action.type)));
  group('아이를 맞이할 계획',options.filter(option=>['plan-child','cancel-plan'].includes(option.action.type)));
  if(state.phase==='ended')body.append(el('p','이 삶의 진행이 끝났습니다. 가족의 기록을 살펴볼 수 있습니다.'));
 }
 dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
 dialog.addEventListener('click',event=>{if(working||event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{onClose?.();if(opener?.isConnected&&opener.getClientRects?.().length)opener.focus({preventScroll:true});});
 return{get isOpen(){return dialog.open;},open(){if(dialog.open)return;opener=document.activeElement;onOpen?.();working=false;status.textContent='';render();dialog.showModal();dialog.scrollTop=0;heading.focus({preventScroll:true});},close(){if(dialog.open&&!working)dialog.close();}};
}
