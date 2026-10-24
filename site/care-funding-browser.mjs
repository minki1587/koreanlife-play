import {injuryCareOptions,pendingInjuryCare,injuryImpact} from './injury-care.mjs?v=birth-draw-20261024';
import {PERSONAL_DEBT_ANNUAL_RATE} from './debt-rules.mjs?v=birth-draw-20261024';
import {investmentSummary} from './market-economy.mjs?v=birth-draw-20261024';
import {previewCareFunding} from './care-funding.mjs?v=birth-draw-20261024';
import {formatMoney} from './spending.mjs?v=birth-draw-20261024';

// Debt is rounded to one won by the ledger; keep small interest visible too.
export const careInterestMoney=value=>`${Math.round(value*10000).toLocaleString('ko-KR')}원`;

export function createCareFundingView({document=globalThis.document,host,getState,data,onConfirm,onError=()=>{}}){
 let busy=false,lastInjury=null;const drafts=new Map(),locks=new Map(),dialog=host.closest?.('dialog')||host;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function guard(event){if(busy&&(event.type==='cancel'||event.type==='keydown'&&event.key==='Escape'||event.type==='click'&&(event.target===dialog||event.target?.closest?.('button')))){event.preventDefault();event.stopImmediatePropagation();}}
 for(const type of ['cancel','keydown','click'])dialog.addEventListener(type,guard,true);
 function setLocked(value){if(value){for(const n of dialog.querySelectorAll('input,button')){locks.set(n,!!n.disabled);n.disabled=true;}}else{for(const [n,disabled]of locks)n.disabled=disabled;locks.clear();}host.setAttribute('aria-busy',String(value));}
 async function confirm(id,plan){if(busy)return;busy=true;setLocked(true);try{await onConfirm(id,plan);busy=false;setLocked(false);render();}catch(error){busy=false;setLocked(false);onError(error);}}
 function render(){
  if(busy)return;const state=getState();host.replaceChildren();if(!pendingInjuryCare(state))return;const injuryId=`${state.seed}|${state.lifeHealth.pendingCare}`;if(injuryId!==lastInjury){drafts.clear();lastInjury=injuryId;}
  for(const option of injuryCareOptions(state)){
   const card=el('section'),button=el('button',`${option.label} · ${formatMoney(option.costWan)}`);button.type='button';button.dataset.care=option.id;card.className='injury-care-option';const work=injuryImpact({...state,lifeHealth:{...state.lifeHealth,injury:{...state.lifeHealth.injury,care:{mode:option.id}}}}),facts=el('ul');for(const t of [`회복 ${option.months}개월`,`건강 +${option.gain}`,state.service?.active?'군복무 월급은 회복 중에도 정상 지급':work.workLabel,...option.activityNotes])facts.append(el('li',t));card.append(button,facts);host.append(card);
   if(option.affordable){button.addEventListener('click',()=>confirm(option.id,{sales:[],useFamilySupport:false,allowLoan:false}));continue;}
   const panel=el('div');panel.hidden=true;panel.className='care-funding-panel';button.addEventListener('click',()=>{if(!busy)panel.hidden=!panel.hidden;});const draft=drafts.get(option.id)||{sales:[],useFamilySupport:false,allowLoan:false};drafts.set(option.id,draft);
   const inputs=[],quote=el('ul'),error=el('p'),submit=el('button','이 자금 계획으로 치료 확정'),cancel=el('button','자금 설정 접기');submit.type=cancel.type='button';submit.dataset.fundedCare=option.id;error.setAttribute('role','alert');
   if(state.age<19){const label=el('label'),box=el('input');box.type='checkbox';box.checked=draft.useFamilySupport;box.dataset.funding='family';box.addEventListener('change',()=>{draft.useFamilySupport=box.checked;update();});label.append(box,el('span','보호자 가구의 여유 현금에서 치료비 지원받기'));panel.append(label);inputs.push(box);}
   for(const product of investmentSummary(state,data).products.filter(p=>p.units>0)){const label=el('label',`${product.name} 매각 지분 (보유 ${product.units}개)`),input=el('input');input.type='number';input.min='0';input.max=String(product.units);input.step='1';input.value=String(draft.sales.find(s=>s.productId===product.id)?.units||0);input.dataset.sellProduct=product.id;input.addEventListener('input',()=>{draft.sales=draft.sales.filter(s=>s.productId!==product.id);const units=Number(input.value);if(units!==0)draft.sales.push({productId:product.id,units});update();});label.append(input);panel.append(label);inputs.push(input);}
   if(state.age>=19){const loanLabel=el('label'),loan=el('input');loan.type='checkbox';loan.checked=draft.allowLoan;loan.dataset.funding='loan';loan.addEventListener('change',()=>{draft.allowLoan=loan.checked;update();});loanLabel.append(loan,el('span','위 자금으로 부족한 치료비만 대출하는 데 동의합니다. 기존 대출금에 합산되며 같은 이자 규칙이 적용됩니다.'));panel.append(loanLabel);}panel.append(quote,error,submit,cancel);card.append(panel);
   function update(){const p=previewCareFunding(getState(),option.id,draft,data);quote.replaceChildren();const rows=[['치료비',option.costWan],['내 소지금',p.cashWan],...(state.age<19?[['가구 지원 가능액',p.familyAvailableWan]]:[]),['가구 지원',p.familySupportWan],['선택 지분 매각금',p.saleProceedsWan],['대출 전 부족액',p.shortfallWan],['새 치료비 대출',p.loanWan],...(p.loanWan>0?[['다음 달 추가 대출이자',Math.round(p.loanWan*PERSONAL_DEBT_ANNUAL_RATE/12*10000)/10000,careInterestMoney]]:[]),['확정 후 남을 소지금',p.eligible?Math.max(0,p.cashWan+p.familySupportWan+p.saleProceedsWan+p.loanWan-option.costWan):0]];for(const [label,value,formatter=formatMoney]of rows)quote.append(el('li',`${label} ${formatter(value||0)}`));error.textContent=p.reasons.join(' ');submit.disabled=busy||!p.eligible;}
   submit.addEventListener('click',()=>{const p=previewCareFunding(getState(),option.id,draft,data);if(p.eligible)confirm(option.id,structuredClone(draft));else error.textContent=p.reasons.join(' ');});cancel.addEventListener('click',()=>{if(!busy)panel.hidden=true;});update();
  }
 }
 return{render,destroy(){if(!busy){for(const type of ['cancel','keydown','click'])dialog.removeEventListener?.(type,guard,true);host.replaceChildren();}},get pending(){return busy;}};
}
