import {formedFamilySummary,formedFamilyOptions} from './formed-family.mjs?v=refinements-1';
import {renderFormedFamilySummary} from './formed-family-views.mjs?v=refinements-1';
import {formatMoney} from './spending.mjs?v=refinements-1';
import {clearActionError,reportActionError} from './ui-copy.mjs?v=refinements-1';
import {childInheritanceAssessment} from './child-inheritance.mjs?v=refinements-1';
export {renderFormedFamilyFinance} from './formed-family-views.mjs?v=refinements-1';

function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;}
function button(text,handler,className='secondary'){const node=el('button',text,className);node.type='button';node.addEventListener('click',handler);return node;}
function lines(values,className){const list=el('ul',undefined,className);for(const value of values||[])if(typeof value==='string'&&value.trim())list.append(el('li',value));return list;}
function disclosure(label,node){const section=el('details',undefined,'formed-family-more');section.append(el('summary',label));if(node)section.append(node);return section;}
function foldFactRows(host,labels,label){const dl=[...host.children].find(node=>node.tagName?.toLowerCase()==='dl');if(!dl)return;const rows=[...dl.children],extra=rows.filter(row=>labels.includes(row.children[0]?.textContent));if(!extra.length)return;const more=el('dl',undefined,dl.className);more.append(...extra);dl.replaceChildren(...rows.filter(row=>!extra.includes(row)));host.append(disclosure(label,more));}
export function createFormedFamilyBrowser({getState,data,onAction,onOpen,onClose}){
 const dialog=el('dialog',undefined,'life-tools-dialog formed-family-dialog');dialog.id='formed-family-dialog';dialog.setAttribute('aria-labelledby','formed-family-title');
 const heading=el('h2','결혼·자녀');heading.id='formed-family-title';heading.tabIndex=-1;
 const top=el('div',undefined,'dialog-top'),close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','결혼·자녀 창 닫기');top.append(heading,close);
 const status=el('p','','life-tool-status formed-family-error');status.setAttribute('role','alert');
 const body=el('div',undefined,'life-tool-body');dialog.append(top,status,body);document.body.append(dialog);
 let working=false,opener=null,actionButtons=[];
 function setBusy(value){working=value;close.disabled=value;for(const [node,eligible]of actionButtons)node.disabled=value||!eligible;}
 async function act(action,anchor){if(working)return;clearActionError(status);setBusy(true);try{await onAction(structuredClone(action));clearActionError(status);dialog.close();}catch(error){reportActionError(status,error,{dialog,anchor,fallback:'지금은 이 선택을 할 수 없습니다. 조건을 확인해 주세요.'});}finally{setBusy(false);}}
 function optionCard(option,{child}={}){
  const card=el('section',undefined,'formed-action-card'),b=button(option.label,event=>act(option.action,event.currentTarget),option.costWan===0?'secondary formed-free-action':'primary');b.disabled=!option.eligible;b.dataset.familyAction=option.id;
  if(child&&option.action.type==='parenting'){b.setAttribute('aria-pressed',String(child.parentingStyle===option.action.mode));b.setAttribute('aria-label',`${child.name} · ${option.label}`);}
  actionButtons.push([b,option.eligible]);card.append(b);
  const facts=[];if(Number.isFinite(option.costWan))facts.push(`지금 비용 ${formatMoney(option.costWan)}`);if(Number.isFinite(option.monthlyCostWan))facts.push(`월 비용 ${formatMoney(option.monthlyCostWan)}`);
  card.append(lines([...facts,...(option.effects||[])],'formed-action-effects'));
  if(option.reasons?.length)card.append(lines(option.reasons,'formed-action-reasons'));return card;
 }
 function appendOptions(host,options,{child}={}){
  const selected=option=>child&&option.action.type==='parenting'&&child.parentingStyle===option.action.mode,visible=options.filter(option=>option.eligible||selected(option)),unavailable=options.filter(option=>!option.eligible&&!selected(option));
  for(const option of visible)host.append(optionCard(option,{child}));
  if(unavailable.length){
   if(!visible.length)host.append(el('p','지금 선택할 수 있는 항목이 없습니다. 조건을 펼쳐 확인할 수 있습니다.'));
   const more=disclosure(`지금 선택할 수 없는 항목 · ${unavailable.length}개`);for(const option of unavailable)more.append(optionCard(option,{child}));host.append(more);
  }
 }
 function group(title,options){if(!options.length)return;const section=el('section',undefined,'formed-action-group');section.append(el('h3',title));appendOptions(section,options);body.append(section);}
 function render(){
  const state=getState();body.replaceChildren();actionButtons=[];if(!state){body.append(el('p','게임을 시작한 뒤 가족의 일상을 선택할 수 있습니다.'));return;}
  const summary=formedFamilySummary(state),options=formedFamilyOptions(state,data)||[];
  const intro=el('p',`${state.name} · ${state.age}세 ${state.month}개월`,'formed-person-line');body.append(intro);
  const family=renderFormedFamilySummary(state,{summary,onChild:(child,card)=>{
   foldFactRows(card,['자녀 명의 상속 보관금','자녀 상속 누적 배정','추가 교육비 누적 지원','성년 자녀계정 인계 누적'],'자녀 상속 보관금 상세');
   const childOptions=options.filter(option=>option.action.type==='parenting'&&option.action.childId===child.id);
   if(childOptions.length){const section=el('div',undefined,'formed-parenting-actions');section.setAttribute('role','group');section.setAttribute('aria-label',`${child.name} 양육 방식`);appendOptions(section,childOptions,{child});card.append(section);}
   if(child.inheritance&&child.inheritance.ageMonths<228&&child.inheritance.grantedWan>0){
    const assessment=childInheritanceAssessment(state,child.id),section=el('section',undefined,'formed-action-card'),support=button('상속 보관금으로 이번 달 추가 교육비 지원',event=>act({type:'inheritance-education',childId:child.id},event.currentTarget),'secondary');
    support.dataset.familyAction=`inheritance-education-${child.id}`;support.disabled=!assessment.eligible;actionButtons.push([support,assessment.eligible]);
    section.append(support,lines([`자녀 상속 보관금에서 ${formatMoney(assessment.costWan)} 사용`,`자녀 배움 +${assessment.learnGain}`,'자녀별 월 1회 · 이번 한 달의 추가 교육비','내 소지금과 정기 양육비는 바뀌지 않습니다.'],'formed-action-effects'));
    if(assessment.reasons.length)section.append(lines(assessment.reasons,'formed-action-reasons'));card.append(section);
   }
  }});const sections=[...family.children].map(section=>{const classes=String(section.className||'').split(/\s+/);if(classes.includes('formed-spouse-card'))foldFactRows(section,['고향','학력','개인 자산','개인 부채'],'인연의 배경·자산 상세');return classes.includes('formed-estate-card')?disclosure('장례·상속 상세',section):section;});family.replaceChildren(...sections);body.append(family);
  group('교제와 결혼',options.filter(option=>['meet','date','marry','separate'].includes(option.action.type)));
  group('아이를 맞이할 계획',options.filter(option=>['plan-child','cancel-plan'].includes(option.action.type)));
  if(state.phase==='ended')body.append(el('p','이 삶의 진행이 끝났습니다. 가족의 기록을 살펴볼 수 있습니다.'));
 }
 dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
 dialog.addEventListener('click',event=>{if(working||event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{onClose?.();if(opener?.isConnected&&opener.getClientRects?.().length)opener.focus({preventScroll:true});});
 return{get isOpen(){return dialog.open;},open(){if(dialog.open)return;opener=document.activeElement;onOpen?.();working=false;clearActionError(status);render();dialog.showModal();dialog.scrollTop=0;heading.focus({preventScroll:true});},close(){if(dialog.open&&!working)dialog.close();}};
}
