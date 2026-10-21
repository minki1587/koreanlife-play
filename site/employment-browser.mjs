import {formatMoney} from './spending.mjs?v=economy-ui-2';
import {displayCopy,displayLines,appendUiFacts,completeModalAction} from './ui-copy.mjs?v=economy-ui-2';
import {searchOccupations} from './career-browser.mjs?v=economy-ui-2';
import {careerModelSnapshot,careerModelIncome} from './career-economy.mjs?v=economy-ui-2';
import {employmentProfile,evaluateEmployment,careerTrainingPlan,employmentRequirements} from './employment.mjs?v=economy-ui-2';

const ABILITIES={analytical:'분석·문제 해결',communication:'소통·협업',physical:'신체 활동',precision:'정밀·주의',digital:'디지털 활용'};
const cash=n=>formatMoney(Number(n||0));
const PAGE_SIZE=20;
function el(tag,copy,cls){const node=document.createElement(tag);if(copy!==undefined)node.textContent=displayCopy(copy);if(cls)node.className=cls;return node;}
function facts(host,pairs){return appendUiFacts(document,host,pairs,'employment-facts');}
function appendList(host,values,cls='employment-notes'){const ul=el('ul',undefined,cls);for(const value of values)for(const text of displayLines(value))ul.append(el('li',text));if(ul.children.length)host.append(ul);}
function button(copy,handler,cls='employment-button'){const node=el('button',copy,cls);node.type='button';node.addEventListener('click',handler);return node;}

/** A playable, local-only hiring market. Source records remain untouched. */
export function createEmploymentBrowser({catalog,getState,data,onApply,onTrain,onMove,onDefer,onReference,onOpen,onClose}){
 const dialog=el('dialog',undefined,'employment-dialog');dialog.id='employment-dialog';dialog.setAttribute('aria-labelledby','employment-title');
 const top=el('div',undefined,'dialog-top'),heading=el('h2','취업·이직');heading.id='employment-title';heading.tabIndex=-1;
 const closeButton=button('×',()=>dialog.close(),'dialog-close');closeButton.setAttribute('aria-label','취업·훈련 창 닫기');top.append(heading,closeButton);
 const tabs=el('nav',undefined,'employment-tabs');tabs.setAttribute('aria-label','일과 준비');
 const summary=el('div',undefined,'employment-summary'),body=el('div',undefined,'employment-body'),status=el('p','','employment-status');status.setAttribute('role','status');
 dialog.append(top,tabs,summary,status,body);document.body.append(dialog);
 let tab='jobs',query='',group='',filter='all',page=0,selectedId=null;
 const rows=catalog.occupations,groups=[...new Set(rows.map(row=>row.occupation.classification.middleGroupName))];
 const tabButtons=new Map();
 for(const [id,label]of [['jobs','취업·이직'],['training','자격·능력 훈련'],['move','이사']]){const b=button(label,()=>{tab=id;status.textContent='';render();});tabButtons.set(id,b);tabs.append(b);}
 const current=()=>rows.find(row=>row.id===selectedId)||rows[0];
 function act(callback,argument){return completeModalAction(dialog,status,callback,argument,'지금은 처리할 수 없습니다. 조건을 확인해주세요.');}
 function renderSummary(){
  const s=getState();summary.replaceChildren();if(!s){summary.append(el('p','게임을 시작하면 취업과 준비를 선택할 수 있습니다.'));return;}
  const p=employmentProfile(s);summary.append(el('strong',s.name));facts(summary,[['나이',`${s.age}세 ${s.month}개월`],['거주지역',s.residence.region],['학력',p.educationLabel],['현재 직업',s.job.title],['연수입',cash(s.salary)]]);
  facts(summary,Object.entries(ABILITIES).map(([key,label])=>[label,`${Math.round(p.abilities[key]??0)}/100`]));
  if(p.training)facts(summary,[['준비 중',p.training.label||p.training.type],['남은 훈련',`${p.training.remainingMonths??'—'}개월`]]);
 }
 function selectedDetails(target){
  const row=current(),s=getState(),evaluation=evaluateEmployment(s,row),model=careerModelSnapshot(row);target.replaceChildren();
  target.append(el('h3',row.occupation.name),el('p',row.occupation.classification.middleGroupName,'small'));
  if(model)target.append(el('p',`입직 연봉 ${cash(careerModelIncome(model,0))} / 년`,'employment-pay'));
  target.append(el('p',s?.job.occupationId===row.id?'현재 다니는 직업입니다. 이직할 다른 직업을 선택할 수 있습니다.':evaluation.eligible?'현재 조건으로 지원할 수 있습니다.':'지원 전에 아래 조건을 준비해주세요.',s?.job.occupationId===row.id||evaluation.eligible?'employment-pass':'employment-blocked'));
  const actions=el('div',undefined,'employment-actions'),apply=button(s?.job.occupationId===row.id?'현재 다니는 직업':s?.job.occupationId?'이 직업으로 이직하기':'이 직업에 지원하기',()=>act(onApply,row.id,`${row.occupation.name}에 입직했습니다. 다음 달부터 월 수입에 반영됩니다.`),'employment-button employment-primary');apply.disabled=!evaluation.eligible;actions.append(apply,button('이 직업을 준비하기',()=>{tab='training';render();}),button('수집한 원자료 보기',()=>{dialog.close();onReference?.(row.id);}));target.append(actions);
  if(s?.pendingDecision==='first-job')target.append(button('취업 준비하며 다음 달로',()=>act(onDefer,undefined,'취업을 미루고 준비를 이어갑니다.'),'employment-button'));
  const list=el('ul',undefined,'employment-requirements');for(const requirement of evaluation.requirements||[]){const li=el('li');li.dataset.met=String(requirement.met);li.append(el('span',`${requirement.met===true?'✓':requirement.met===false?'○':'—'} ${requirement.label}`));appendList(li,requirement.kind==='unknown'?['미확인']:displayLines(requirement.value??'미확인'),'employment-requirement-values');list.append(li);}target.append(list);
  if(evaluation.reasons?.length){const reasons=el('ul',undefined,'employment-reasons');for(const reason of evaluation.reasons)reasons.append(el('li',displayCopy(reason)));target.append(reasons);}

 }
 function renderJobs(){
  const controls=el('div',undefined,'employment-search'),searchLabel=el('label','직업명·분류·코드 검색'),search=el('input');search.type='search';search.placeholder='예: 웹개발자, 간호사, 조리사';search.value=query;searchLabel.append(search);
  const groupLabel=el('label','직업 분류'),groupSelect=el('select');groupSelect.append(new Option('모든 분류',''));for(const name of groups)groupSelect.append(new Option(name,name));groupSelect.value=group;groupLabel.append(groupSelect);
  const filterLabel=el('label','지원 상태'),filterSelect=el('select');for(const [value,label]of [['all','모든 직업'],['eligible','지원 가능한 직업'],['preparing','준비가 필요한 직업']])filterSelect.append(new Option(label,value));filterSelect.value=filter;filterLabel.append(filterSelect);controls.append(searchLabel,groupLabel,filterLabel);
  const count=el('div',undefined,'small'),layout=el('div',undefined,'employment-job-layout'),list=el('div',undefined,'employment-job-list'),detail=el('section',undefined,'employment-job-detail'),pager=el('div',undefined,'employment-pager');detail.setAttribute('aria-label','선택한 직업의 지원 조건');layout.append(list,detail);body.append(controls,count,layout,pager);
  function update(){
   const s=getState();let found=searchOccupations(rows,query,group);if(filter!=='all')found=found.filter(row=>evaluateEmployment(s,row).eligible===(filter==='eligible'));
   page=Math.min(page,Math.max(0,Math.ceil(found.length/PAGE_SIZE)-1));count.replaceChildren();facts(count,[['직업 검색',`537개 중 ${found.length}개`],['페이지',`${page+1}/${Math.max(1,Math.ceil(found.length/PAGE_SIZE))}`]]);
   if(!found.some(row=>row.id===selectedId))selectedId=found[0]?.id||null;list.replaceChildren();pager.replaceChildren();
   for(const row of found.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){const result=evaluateEmployment(s,row),isCurrent=s?.job.occupationId===row.id,b=button('',()=>{selectedId=row.id;update();list.querySelector(`[data-occupation-id="${row.id}"]`)?.focus({preventScroll:true});},'employment-job');b.dataset.occupationId=row.id;b.setAttribute('aria-pressed',String(selectedId===row.id));b.append(el('b',row.occupation.name),el('span',isCurrent?'재직 중':result.eligible?'지원 가능':'조건 준비',isCurrent||result.eligible?'employment-pass':'employment-blocked'));list.append(b);}
   if(found.length)selectedDetails(detail);else{detail.replaceChildren(el('p','조건에 맞는 직업이 없습니다. 검색어나 지원 상태를 바꿔보세요.'));list.append(el('p','검색 결과가 없습니다.'));}
   const prev=button('이전 20개',()=>{page--;update();}),next=button('다음 20개',()=>{page++;update();});prev.disabled=page===0;next.disabled=(page+1)*PAGE_SIZE>=found.length;pager.append(prev,next);
  }
  search.addEventListener('input',()=>{query=search.value;page=0;update();});groupSelect.addEventListener('change',()=>{group=groupSelect.value;page=0;update();});filterSelect.addEventListener('change',()=>{filter=filterSelect.value;page=0;update();});update();
 }
 function renderTraining(){
  const s=getState(),p=s?employmentProfile(s):null;body.append(el('h3','지원 조건을 차근차근 준비하기'));
  if(!s){body.append(el('p','먼저 게임을 시작해주세요.'));return;}
  appendList(body,['훈련비는 등록할 때 한 번 지출합니다.','자금 부족분은 차입으로 처리합니다.','동시에 한 과정, 한 달에 한 번만 등록할 수 있습니다.','복무·정규 재학 중에는 훈련이 진행되지 않습니다.']);
  if(s.pendingDecision==='first-job')body.append(button('취업을 미루고 훈련 준비하기',()=>act(onDefer,undefined,'취업 갈림길을 마쳤습니다. 이제 과정을 골라 등록할 수 있습니다.')));
  const blocked=s.phase!=='running'||s.age<16||s.service.active||s.schoolJourney?.current||s.schooling?.status==='enrolled'||s.job.status==='재학'||!!p.training||p.lastTrainingMonth===s.totalMonths;
  if(blocked)body.append(el('p',p.training?'진행 중인 훈련을 마친 뒤 새 과정에 등록할 수 있습니다.':'16세 이후, 갈림길·복무·정규 학업을 마친 뒤 등록할 수 있습니다. 이달 이미 등록했다면 다음 달에 다시 선택해주세요.','employment-blocked'));
  const cards=el('div',undefined,'employment-training-grid');
  function courseCard(title,request){const card=el('section',undefined,'employment-training-card');card.append(el('h4',title));let plan;try{plan=careerTrainingPlan(s,request);}catch(error){card.append(el('p',error.message));return card;}facts(card,[...(request.type==='ability'?[['현재 능력',`${Math.round(p.abilities[request.ability]??0)}/100`]]:request.type==='education'?[['현재 학력',p.educationLabel]]:[]),['기간',`${plan.durationMonths}개월`],['등록비',cash(plan.cost)],...(request.type==='ability'?[['완료 효과','능력 +8점']]:[])]);const b=button(`${plan.label} 시작`,()=>act(onTrain,request,`${plan.label}에 등록했습니다. 월별 진행으로 이수합니다.`));b.disabled=blocked;card.append(b);return card;}
  for(const [ability,label]of Object.entries(ABILITIES))cards.append(courseCard(label,{type:'ability',ability}));
  cards.append(courseCard('학력 경로',{type:'education'}));
  const prep=el('section',undefined,'employment-training-card'),label=el('label','직업 준비 과정'),select=el('select'),qualificationRows=rows.filter(row=>employmentRequirements(row).qualificationRequired),courseInfo=el('div');for(const row of qualificationRows)select.append(new Option(row.occupation.name,row.id));select.value=qualificationRows.some(row=>row.id===selectedId)?selectedId:qualificationRows[0]?.id;select.setAttribute('aria-label','준비할 직업');label.append(select);
  const prepButton=button('직업 준비 과정 시작',()=>act(onTrain,{type:'qualification',occupationId:select.value}));
  function updatePreparation(){const row=qualificationRows.find(row=>row.id===select.value);try{const plan=careerTrainingPlan(s,{type:'qualification',occupationId:row?.id},row);courseInfo.replaceChildren();facts(courseInfo,[['기간',`${plan.durationMonths}개월`],['등록비',cash(plan.cost)]]);prepButton.disabled=blocked;}catch(error){courseInfo.textContent=displayCopy(error.message);prepButton.disabled=true;}}
  select.addEventListener('change',()=>{selectedId=select.value;updatePreparation();});updatePreparation();prep.append(el('h4','직업별 자격 준비'),label,courseInfo,el('p','학력 조건을 갖춘 뒤 준비 과정을 이수합니다.'),prepButton);cards.append(prep);body.append(cards);
 }
 function renderMove(){
  const s=getState();body.append(el('h3','채용공고의 근무지로 이사하기'));appendList(body,['이사비 300만원을 한 번 지출합니다.','자금이 부족하면 차입합니다.']);
  if(!s){body.append(el('p','먼저 게임을 시작해주세요.'));return;}
  const label=el('label','새 거주지역'),select=el('select');select.setAttribute('aria-label','새 거주지역');for(const region of data.regions)select.append(new Option(region,region));select.value=s.residence.region;label.append(select);facts(body,[['현재 거주지역',s.residence.region],['주거 형태',s.residence.housing]]);body.append(label,button('선택한 지역으로 이사하기',()=>act(onMove,select.value,'이사했습니다. 새 거주지역으로 지원 조건을 다시 확인할 수 있습니다.')));
 }
 function render(){for(const [id,b]of tabButtons)b.setAttribute('aria-pressed',String(id===tab));renderSummary();body.replaceChildren();if(tab==='jobs')renderJobs();else if(tab==='training')renderTraining();else renderMove();}
 dialog.addEventListener('close',()=>onClose?.());dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 return{get isOpen(){return dialog.open;},open(which='jobs'){tab=which;if(!selectedId)selectedId=getState()?.job?.occupationId||rows[0].id;status.textContent='';onOpen?.();render();if(!dialog.open)dialog.showModal();heading.focus({preventScroll:true});},close(){if(dialog.open)dialog.close();},refresh(){if(dialog.open)render();}};
}
