import {investmentSummary,investmentAssessment} from './market-economy.mjs?v=news-20261024';
import {appendUiFacts,clearActionError,reportActionError} from './ui-copy.mjs?v=news-20261024';
import {pendingInjuryCare} from './injury-care.mjs?v=news-20261024';

const TABS=Object.freeze([['property','부동산'],['stock','주식'],['fund','펀드']]);
const units=value=>`${Number(value||0).toLocaleString('ko-KR',{maximumFractionDigits:0})}단위`;
export function investmentMoney(value){const won=Math.round(Math.abs(value||0)*10000),eok=Math.floor(won/100000000),wan=Math.floor(won%100000000/10000),rest=won%10000,parts=[];if(eok)parts.push(`${eok.toLocaleString('ko-KR')}억`);if(wan)parts.push(`${wan.toLocaleString('ko-KR')}만`);if(rest)parts.push(`${rest.toLocaleString('ko-KR')}원`);else if(parts.length)parts[parts.length-1]+='원';else parts.push('0원');return(value<0&&won?'-':'')+parts.join(' ');}
const signedMoney=value=>`${value>0?'+':''}${investmentMoney(value||0)}`;
const percent=value=>Number.isFinite(value)?`${value>0?'+':''}${(value*100).toLocaleString('ko-KR',{maximumFractionDigits:3})}%`:'0%';

export function createInvestmentBrowser({getState,onAction,onOpen,onClose,data,document=globalThis.document}){
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
 const button=(text,action,className='secondary')=>{const node=el('button',text,className);node.type='button';if(action)node.addEventListener('click',action);return node;};
 const facts=(host,pairs)=>appendUiFacts(document,host,pairs,'investment-facts');
 const disclosure=label=>{const node=el('details',undefined,'investment-more');node.append(el('summary',label));return node;};
 const list=(host,values,className='investment-reasons')=>{const ul=el('ul',undefined,className);for(const value of values||[])if(typeof value==='string'&&value)ul.append(el('li',value));host.append(ul);};
 const dialog=el('dialog',undefined,'life-tools-dialog investment-dialog');dialog.id='investment-dialog';dialog.setAttribute('aria-labelledby','investment-title');
 const heading=el('h2','부동산·투자');heading.id='investment-title';heading.tabIndex=-1;
 const close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','투자 창 닫기');const top=el('div',undefined,'dialog-top');top.append(heading,close);
 const tabs=el('div',undefined,'investment-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','자산 종류');
 const status=el('p','','investment-error');status.setAttribute('role','alert');
 const body=el('div',undefined,'life-tool-body investment-body');body.id='investment-panel';body.setAttribute('role','tabpanel');
 dialog.append(top,tabs,status,body);document.body.append(dialog);
 let tab='property',working=false,opener=null,controls=[],refreshQuotes=[];const tabButtons=new Map(),buyAmounts=new Map();
 function select(next,{focus=false}={}){if(working||!tabButtons.has(next))return;tab=next;clearActionError(status);render();if(focus)tabButtons.get(next).focus({preventScroll:true});}
 for(const[id,label]of TABS){const node=button(label,()=>select(id));node.id=`investment-tab-${id}`;node.setAttribute('role','tab');node.setAttribute('aria-controls',body.id);tabs.append(node);tabButtons.set(id,node);node.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const at=TABS.findIndex(([value])=>value===tab),next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(at+(event.key==='ArrowRight'?1:TABS.length-1))%TABS.length;select(TABS[next][0],{focus:true});});}
 function setBusy(value){working=value;close.disabled=value;for(const node of tabButtons.values())node.disabled=value;for(const node of controls)node.disabled=value;for(const update of refreshQuotes)update();}
 async function act(action,anchor){if(working)return;clearActionError(status);setBusy(true);try{await onAction(structuredClone(action));clearActionError(status);dialog.close();}catch(error){reportActionError(status,error,{dialog,anchor,fallback:'주문 조건을 확인해 주세요.'});}finally{setBusy(false);}}
 function assessment(action){try{const state=getState(),result=investmentAssessment(state,action,data);return pendingInjuryCare(state)?{...result,eligible:false,reasons:['부상 대응을 먼저 선택해 주세요.',...(result.reasons||[])]}:result;}catch(error){return{eligible:false,reasons:[error?.message||'주문 조건을 확인해 주세요.'],units:0,costWan:0,payoutWan:0};}}
 function orderForm(row,type){
  const buying=type==='buy',form=el('form',undefined,'investment-order');form.dataset.trade=type;form.append(el('h4',buying?'매수':'매도'));
  const id=`investment-${type}-amount`,label=el('label',buying?'매수 예산 (만원)':'매도 수량 (단위)');label.setAttribute('for',id);
  const input=el('input');input.id=id;input.type='number';input.inputMode=buying?'decimal':'numeric';input.min=buying?'10':'1';input.step=buying?'0.0001':'1';input.value=buying?(buyAmounts.get(tab)||'10'):String(Math.max(1,row.units||0));if(!buying)input.max=String(row.units||0);input.required=true;
  const preview=el('div',undefined,'investment-quote'),submit=button(buying?'매수 시작':'매도하기',null,'primary');submit.type='submit';
  form.append(label,input,preview,submit);controls.push(input);let quote;
  const action=()=>buying?{type:'buy',productId:row.id,amountWan:Number(input.value)}:{type:'sell',productId:row.id,units:Number(input.value)};
  function update(){quote=assessment(action());preview.replaceChildren();facts(preview,[['주문 수량',units(quote.units)],...(Number.isFinite(quote.feeWan)?[['수수료',investmentMoney(quote.feeWan)]]:[]),[buying?'실제 결제 예상':'소지금 환급 예상',investmentMoney((buying?quote.costWan:quote.payoutWan)||0)]]);if(quote.reasons?.length)list(preview,quote.reasons);submit.disabled=working||!quote.eligible;}
  refreshQuotes.push(update);input.addEventListener('input',()=>{if(buying)buyAmounts.set(tab,input.value);update();});form.addEventListener('submit',event=>{event.preventDefault();const anchor=event.submitter||submit;update();if(!working&&quote.eligible)return act(action(),anchor);});
  if(!buying){const all=button('전량 매도',event=>{const anchor=event.currentTarget,request={type:'sell',productId:row.id,units:row.units},allQuote=assessment(request);if(!working&&allQuote.eligible)return act(request,anchor);});form.append(all);refreshQuotes.push(()=>all.disabled=working||!assessment({type:'sell',productId:row.id,units:row.units}).eligible);}
  update();return form;
 }
 function render(){
  body.replaceChildren();controls=[];refreshQuotes=[];for(const[id,node]of tabButtons){node.setAttribute('aria-selected',String(id===tab));node.tabIndex=id===tab?0:-1;}body.setAttribute('aria-labelledby',`investment-tab-${tab}`);
  const state=getState();if(!state){body.append(el('p','게임을 시작한 뒤 자산을 관리할 수 있습니다.'));return;}
  const summary=investmentSummary(state,data),row=summary.products.find(product=>product.id===tab||product.kind===tab);
  facts(body,[['내 소지금',investmentMoney(summary.availableCashWan)]]);const portfolio=disclosure('전체 보유자산 요약');facts(portfolio,[['보유 자산 평가액',investmentMoney(summary.totals.totalValueWan)],['전체 평가손익',signedMoney(summary.totals.unrealizedWan)]]);body.append(portfolio);
  body.append(el('p',`${state.age}세 ${state.month}개월 · 이번 달 가격`,'investment-month'));
  if(!row){body.append(el('p','이 자산의 상품 정보를 확인할 수 없습니다.'));return;}
  const asset=el('section',undefined,'investment-product');asset.append(el('h3',row.name));const description=(state.market?.configSnapshot?.products||data?.marketScenarios?.products||[]).find(product=>product.id===row.id)?.description;facts(asset,[['현재 단가',investmentMoney(row.unitPriceWan)],['현재 평가액',investmentMoney(row.valueWan)],['투입 원금',investmentMoney(row.principalWan)],['평가손익',signedMoney(row.unrealizedWan)],['보유 단위',units(row.units)],['이번 달 변동',percent(row.monthlyChangeRate)],['진행 정세',row.scenarioTitle||'변동 대기']]);if(description){if(row.kind==='property')asset.append(el('p',description,'investment-guide'));else{const information=disclosure('상품 안내');information.append(el('p',description,'investment-guide'));asset.append(information);}}body.append(asset);
  if(state.phase==='ended'){body.append(el('p','이 삶에서는 거래를 마쳤습니다.','investment-guide'));return;}
  body.append(el('p','매수한 자산의 손익은 다음 달부터 반영됩니다.','investment-guide'));
  const orders=el('div',undefined,'investment-orders');orders.append(orderForm(row,'buy'),orderForm(row,'sell'));body.append(orders);for(const update of refreshQuotes)update();
  const guide=disclosure('매수 예산 안내');guide.append(el('p','매수 예산에서 실제 결제한 금액만 사용합니다.','investment-guide'));body.append(guide);
 }
 dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
 dialog.addEventListener('click',event=>{if(working||event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{onClose?.();if(opener?.isConnected&&opener.getClientRects?.().length)opener.focus({preventScroll:true});});
 return{get isOpen(){return dialog.open;},open(which='property'){if(working)return;tab=tabButtons.has(which)?which:'property';clearActionError(status);if(dialog.open){render();return;}opener=document.activeElement;onOpen?.();working=false;render();dialog.showModal();dialog.scrollTop=0;heading.focus({preventScroll:true});},close(){if(dialog.open&&!working)dialog.close();}};
}
