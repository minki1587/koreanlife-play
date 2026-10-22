import {debtRepaymentQuote} from './debt-rules.mjs?v=focused-play-2';
import {investmentMoney} from './investment-browser.mjs?v=focused-play-2';
import {appendUiFacts,reportActionError,clearActionError} from './ui-copy.mjs?v=focused-play-2';

export function createDebtBrowser({getState,onAction,onOpen,onClose,document=globalThis.document}){
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
 const button=(text,handler,className='secondary')=>{const node=el('button',text,className);node.type='button';if(handler)node.addEventListener('click',handler);return node;};
 const dialog=el('dialog',undefined,'life-tools-dialog debt-dialog');dialog.id='debt-dialog';dialog.setAttribute('aria-labelledby','debt-title');
 const heading=el('h2','대출 상환');heading.id='debt-title';heading.tabIndex=-1;
 const close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','대출 상환 창 닫기');const top=el('div',undefined,'dialog-top');top.append(heading,close);
 const status=el('p','','life-tool-status');status.setAttribute('role','alert');const body=el('div',undefined,'life-tool-body');dialog.append(top,status,body);document.body.append(dialog);
 let working=false,opener=null,input,submit,maximum,quote,preview;
 const facts=(node,pairs)=>appendUiFacts(document,node,pairs,'finance-facts');
 function update(){
  quote=debtRepaymentQuote(getState(),Number(input.value));preview.replaceChildren();facts(preview,[['상환 후 내 소지금',investmentMoney(quote.cashAfterWan)],['상환 후 대출금',investmentMoney(quote.remainingDebtWan)],['다음 달 예상 이자',investmentMoney(quote.afterInterestWan)],['월 이자 감소',investmentMoney(quote.monthlyInterestSavingWan)]]);
  if(quote.reasons.length){const list=el('ul');for(const reason of quote.reasons)list.append(el('li',reason));preview.append(list);}submit.disabled=working||!quote.eligible;maximum.disabled=working||quote.maxWan<=0;input.disabled=working;close.disabled=working;
 }
  async function act(){if(working)return;update();if(!quote.eligible)return;const selected=quote.amountWan;working=true;clearActionError(status);update();try{await onAction(selected);dialog.close();}catch(error){reportActionError(status,error,{dialog,anchor:()=>submit,fallback:'상환 조건을 다시 확인해 주세요.'});}finally{working=false;update();}}
 function render(){
  const state=getState();body.replaceChildren();facts(body,[['내 소지금',investmentMoney(state?.cash||0)],['대출금',investmentMoney(state?.debt||0)]]);
  body.append(el('p','내 소지금으로 원금을 바로 상환합니다. 이후 월 이자는 남은 원금으로 계산되며, 자동 상환도 계속 적용됩니다.'));
  const form=el('form');form.id='debt-repayment-form';const label=el('label','상환 금액 (만원)');label.setAttribute('for','debt-amount');input=el('input');input.id='debt-amount';input.type='number';input.inputMode='decimal';input.min='0.0001';input.step='0.0001';input.required=true;
   const limit=debtRepaymentQuote(state,0).maxWan;input.max=String(limit);input.value=String(limit);input.addEventListener('input',()=>{clearActionError(status);update();});
  maximum=button('상환 가능한 전액 입력',()=>{input.value=String(debtRepaymentQuote(getState(),0).maxWan);update();});preview=el('div');preview.setAttribute('aria-live','polite');submit=button('이 금액 상환하기',null,'primary');submit.type='submit';form.append(label,input,maximum,preview,submit);form.addEventListener('submit',event=>{event.preventDefault();return act();});body.append(form);update();
 }
 dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});dialog.addEventListener('click',event=>{if(working||event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{onClose?.();if(opener?.isConnected)opener.focus({preventScroll:true});});
  return{open(){if(working)return;opener=document.activeElement;onOpen?.();clearActionError(status);render();if(!dialog.open)dialog.showModal();heading.focus({preventScroll:true});},close(){if(!working&&dialog.open)dialog.close();},get isOpen(){return dialog.open;}};
}
