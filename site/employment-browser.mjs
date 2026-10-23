import {formatMoney} from './spending.mjs?v=continuity-1';
import {displayCopy,displayLines,appendUiFacts,completeModalAction,clearActionError} from './ui-copy.mjs?v=continuity-1';
import {searchOccupations} from './career-browser.mjs?v=continuity-1';
import {employmentProfile,evaluateEmployment,careerTrainingPlan,employmentRequirements} from './employment.mjs?v=continuity-1';
import {economicAnnualSalaryWan} from './economic-life.mjs?v=continuity-1';
import {pendingInjuryCare,injuryImpact,recoveryActivityPolicy} from './injury-care.mjs?v=continuity-1';
import {employmentTypeOptions,employmentContractSummary} from './employment-contract.mjs?v=continuity-1';
import {recommendJobs} from './choice-recommendations.mjs?v=continuity-1';

const ABILITIES={analytical:'분석·문제 해결',communication:'소통·협업',physical:'신체 활동',precision:'정밀·주의',digital:'디지털 활용'};
const cash=n=>formatMoney(Number(n||0));
const percent=n=>`${Math.round(n*1000)/10}%`;
const PAGE_SIZE=20;
function el(tag,copy,cls){const node=document.createElement(tag);if(copy!==undefined)node.textContent=displayCopy(copy);if(cls)node.className=cls;return node;}
function facts(host,pairs){return appendUiFacts(document,host,pairs,'employment-facts');}
function appendList(host,values,cls='employment-notes'){const ul=el('ul',undefined,cls);for(const value of values)for(const text of displayLines(value))ul.append(el('li',text));if(ul.children.length)host.append(ul);}
function button(copy,handler,cls='employment-button'){const node=el('button',copy,cls);node.type='button';node.addEventListener('click',handler);return node;}
function disclosure(label){const node=el('details',undefined,'employment-more');node.append(el('summary',label));return node;}

/** A playable, local-only hiring market. Source records remain untouched. */
export function createEmploymentBrowser({catalog,getState,data,onApply,onTrain,onMove,onDefer,onReference,onOpen,onClose}){
 const dialog=el('dialog',undefined,'employment-dialog');dialog.id='employment-dialog';dialog.setAttribute('aria-labelledby','employment-title');
 const top=el('div',undefined,'dialog-top'),heading=el('h2','취업·이직');heading.id='employment-title';heading.tabIndex=-1;
 const closeButton=button('×',()=>dialog.close(),'dialog-close');closeButton.setAttribute('aria-label','취업·훈련 창 닫기');top.append(heading,closeButton);
 const tabs=el('nav',undefined,'employment-tabs');tabs.setAttribute('aria-label','일과 준비');
 const summary=el('div',undefined,'employment-summary'),body=el('div',undefined,'employment-body'),status=el('p','','employment-status');status.setAttribute('role','status');
 dialog.append(top,tabs,summary,status,body);document.body.append(dialog);
 let tab='jobs',query='',group='',filter='all',page=0,selectedId=null,showAll=false;const selectedEmploymentTypes=new Map(),jobViews=new Map();
 const rows=catalog.occupations,groups=[...new Set(rows.map(row=>row.occupation.classification.middleGroupName))];
 const tabButtons=new Map();
 for(const [id,label]of [['jobs','취업·이직'],['training','자격·능력 훈련'],['move','이사']]){const b=button(label,()=>{tab=id;render();});tabButtons.set(id,b);tabs.append(b);}
 const current=()=>rows.find(row=>row.id===selectedId)||rows[0];
 function act(callback,argument,anchor){return completeModalAction(dialog,status,callback,argument,'지금은 처리할 수 없습니다. 조건을 확인해주세요.',{anchor});}
 function renderSummary(){
  const s=getState();summary.replaceChildren();if(!s){summary.append(el('p','게임을 시작하면 취업과 준비를 선택할 수 있습니다.'));return;}
  const p=employmentProfile(s);summary.append(el('strong',s.name));facts(summary,[['나이',`${s.age}세 ${s.month}개월`],['거주지역',s.residence.region],['학력',p.educationLabel],['현재 직업',s.job.title],['현재 연봉',cash(economicAnnualSalaryWan(s))]]);
  const contract=employmentContractSummary(s);if(contract){facts(summary,[['고용형태',contract.label],...(contract.remainingMonths!==null?[['계약 남은 기간',`${contract.remainingMonths}개월`]]:[]),...(contract.workState==='gap'||contract.workState==='closed'?[['활동 상태',contract.workState==='gap'?'일감 대기 중':'이번 달 영업 휴식']]:[])]);const extra=disclosure('고용·수입 세부');facts(extra,[['기준 연수입',cash(economicAnnualSalaryWan(s))],...(contract.lastIncomeFactor!==null?[['이번 달 수입 계수',`${Math.round(contract.lastIncomeFactor*100)}%`]]:[])]);summary.append(extra);}
  const abilities=disclosure('내 능력 상세');facts(abilities,Object.entries(ABILITIES).map(([key,label])=>[label,`${Math.round(p.abilities[key]??0)}/100`]));summary.append(abilities);
  if(p.training)facts(summary,[['준비 중',p.training.label||p.training.type],['남은 훈련',`${p.training.remainingMonths??'—'}개월`]]);
  if(p.training){const recovery=recoveryActivityPolicy(s);if(!recovery.studyAllowed||p.training.type==='ability'&&p.training.ability==='physical'&&!recovery.physicalTrainingAllowed)facts(summary,[['훈련 상태','회복을 위해 잠시 정지 · 회복 후 자동 재개']]);}
 }
 function selectedDetails(target){
  const row=current(),s=getState(),evaluation=evaluateEmployment(s,row);target.replaceChildren();
  target.append(el('h3',row.occupation.name),el('p',row.occupation.classification.middleGroupName,'small'));
  facts(target,[...(evaluation.offeredAnnualWan===null?[]:[['제시 연봉',`${cash(evaluation.offeredAnnualWan)} / 년`]]),...(evaluation.economicContext.activated?[['합격 확률',percent(evaluation.hiringProbability)],['이달 정세',evaluation.economicContext.scenarioTitle],['지원 횟수','합격·불합격과 관계없이 한 달에 한 번']]:[]),...(evaluation.experienceMonths?[['인정 경력',`${evaluation.experienceMonths}개월`]]:[])]);
  facts(target,[['지원 비용','없음'],['채용 후','취업·이직 상태 유지'],...(Number.isFinite(row.modeled?.workingTime?.weeklyHours)?[['근무시간',`주 ${row.modeled.workingTime.weeklyHours}시간`]]:[]),...(Number.isFinite(row.modeled?.occupationalRisks?.level)?[['업무 위험도',`${row.modeled.occupationalRisks.level}/5`]]:[])]);
  if(evaluation.vacancy)facts(target,[['공고 근무지',`${evaluation.vacancy.label} · ${evaluation.vacancyRegions.join(' · ')}`],['지역 준비',evaluation.vacancyRegions.includes(s.residence.region)?'현재 거주지역에서 지원 가능':'공고 근무지역으로 이사 후 지원 가능']]);
  if(s.employment?.progressionLedger?.hasUnknownEarlierMonths&&evaluation.progression.rule){const note=disclosure('이전 경력 안내');note.append(el('p','직종을 확인할 수 없는 이전 근무 기간은 선행 경력에서 제외했습니다.','small'));target.append(note);}
  let employmentType;
  if(data.employmentContracts===true){const options=employmentTypeOptions(row),label=el('label','고용형태'),select=el('select'),details=el('p',undefined,'small');select.setAttribute('aria-label','지원할 고용형태');for(const option of options)select.append(new Option(option.label,option.id));employmentType=selectedEmploymentTypes.get(row.id);if(!options.some(option=>option.id===employmentType))employmentType=options[0].id;select.value=employmentType;const update=()=>{employmentType=select.value;selectedEmploymentTypes.set(row.id,employmentType);details.textContent=options.find(option=>option.id===employmentType)?.details||'';};select.addEventListener('change',update);update();label.append(select);target.append(label,details);}
  target.append(el('p',s?.job.occupationId===row.id?'현재 다니는 직업입니다. 이직할 다른 직업을 선택할 수 있습니다.':evaluation.eligible?evaluation.economicContext.activated?'지원 요건을 갖췄습니다. 합격 여부는 심사 후 결정됩니다.':'현재 조건으로 지원할 수 있습니다.':'지원 전에 아래 조건을 준비해주세요.',s?.job.occupationId===row.id||evaluation.eligible?'employment-pass':'employment-blocked'));
  const actions=el('div',undefined,'employment-actions'),apply=button(s?.job.occupationId===row.id?'현재 다니는 직업':s?.job.occupationId?'이 직업으로 이직하기':'이 직업에 지원하기',event=>act(onApply,data.employmentContracts===true?{occupationId:row.id,employmentType}:row.id,event.currentTarget),'employment-button employment-primary');apply.disabled=!evaluation.eligible;actions.append(apply,button('이 직업을 준비하기',()=>{tab='training';render();}),button('수집한 원자료 보기',()=>{dialog.close();onReference?.(row.id);}));target.append(actions);
  if(s?.pendingDecision==='first-job')target.append(button('취업 준비하며 다음 달로',event=>act(onDefer,undefined,event.currentTarget),'employment-button'));
  const list=el('ul',undefined,'employment-requirements'),met=el('ul',undefined,'employment-requirements-detail');for(const requirement of evaluation.requirements||[]){const li=el('li');li.dataset.met=String(requirement.met);li.append(el('span',`${requirement.met===true?'✓':requirement.met===false?'○':'—'} ${requirement.label}`));appendList(li,requirement.kind==='unknown'?['미확인']:displayLines(requirement.value??'미확인'),'employment-requirement-values');(requirement.met===false?list:met).append(li);}target.append(list);if(met.children.length){const full=disclosure('충족 조건·자료 자세히');full.append(met);target.append(full);}
  if(evaluation.reasons?.length){const reasons=el('ul',undefined,'employment-reasons');for(const reason of evaluation.reasons)reasons.append(el('li',displayCopy(reason)));target.append(reasons);}

 }
 function renderJobs(){
  body.append(el('p','현재 조건에 맞는 직업부터 비교해보세요. 지원 전 학력·자격·거주 조건을 다시 확인합니다.','choice-introduction'));
  const controls=el('div',undefined,'employment-search'),searchLabel=el('label','직업명·분류·코드 검색'),search=el('input');search.type='search';search.placeholder='예: 웹개발자, 간호사, 조리사';search.value=query;searchLabel.append(search);
  const groupLabel=el('label','직업 분류'),groupSelect=el('select');groupSelect.append(new Option('모든 분류',''));for(const name of groups)groupSelect.append(new Option(name,name));groupSelect.value=group;groupLabel.append(groupSelect);
  const filterLabel=el('label','지원 상태'),filterSelect=el('select');for(const [value,label]of [['all','모든 직업'],['eligible','지원 가능한 직업'],['preparing','준비가 필요한 직업']])filterSelect.append(new Option(label,value));filterSelect.value=filter;filterLabel.append(filterSelect);controls.append(searchLabel,groupLabel,filterLabel);
  const view=el('div',undefined,'choice-view-bar'),viewCopy=el('p'),toggle=button('',()=>{showAll=!showAll;const saved=jobViews.get(showAll);if(saved){page=saved.page;selectedId=saved.selectedId;}else{const s=getState(),found=searchOccupations(rows,query,group).filter(row=>filter==='all'||evaluateEmployment(s,row).eligible===(filter==='eligible'));page=showAll?Math.max(0,Math.floor(found.findIndex(row=>row.id===selectedId)/PAGE_SIZE)):0;}update();},'employment-button choice-view-toggle');toggle.setAttribute('aria-controls','employment-candidates');view.append(viewCopy,toggle);
  const count=el('div',undefined,'small'),layout=el('div',undefined,'employment-job-layout'),list=el('div',undefined,'employment-job-list'),detail=el('section',undefined,'employment-job-detail'),pager=el('div',undefined,'employment-pager');layout.id='employment-candidates';detail.setAttribute('aria-label','선택한 직업의 지원 조건');layout.append(list,detail);body.append(view,controls,count,layout,pager);
  function update(){
   clearActionError(status);controls.hidden=!showAll;const s=getState();let found=searchOccupations(rows,query,group);if(filter!=='all')found=found.filter(row=>evaluateEmployment(s,row).eligible===(filter==='eligible'));
   const recommendations=recommendJobs(found.map(row=>({row,assessment:evaluateEmployment(s,row)}))),reasonById=new Map(recommendations.map(item=>[item.row.id,item.reason]));
   page=Math.min(page,Math.max(0,Math.ceil(found.length/PAGE_SIZE)-1));count.replaceChildren();if(showAll)facts(count,[['직업 검색',`${rows.length}개 중 ${found.length}개`],['페이지',`${page+1}/${Math.max(1,Math.ceil(found.length/PAGE_SIZE))}`]]);
   viewCopy.textContent=showAll?'모든 직업에서 직접 찾아볼 수 있습니다.':recommendations.length?`지금 지원 가능한 추천 직업 ${recommendations.length}개`:'현재 조건으로 바로 지원할 수 있는 직업이 없습니다.';toggle.textContent=showAll?'추천만 보기':`전체 직업 보기 (${rows.length}개)`;toggle.setAttribute('aria-expanded',String(showAll));
   const visible=showAll?found.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE):recommendations.map(item=>item.row);
   if(!visible.some(row=>row.id===selectedId))selectedId=visible[0]?.id||null;list.replaceChildren();pager.replaceChildren();
   jobViews.set(showAll,{selectedId,page});
   for(const row of visible){const result=evaluateEmployment(s,row),isCurrent=s?.job.occupationId===row.id,b=button('',()=>{selectedId=row.id;update();list.querySelector(`[data-occupation-id="${row.id}"]`)?.focus({preventScroll:true});},'employment-job');b.dataset.occupationId=row.id;b.setAttribute('aria-pressed',String(selectedId===row.id));b.append(el('b',row.occupation.name),el('span',isCurrent?'재직 중':result.eligible?'지원 가능':'조건 준비',isCurrent||result.eligible?'employment-pass':'employment-blocked'));if(!showAll)b.append(el('small',reasonById.get(row.id),'choice-reason'));list.append(b);}
   if(visible.length)selectedDetails(detail);else{detail.replaceChildren(el('p',showAll?'조건에 맞는 직업이 없습니다. 검색어나 지원 상태를 바꿔보세요.':'전체 직업에서 부족한 조건을 확인하거나 자격·능력 훈련을 준비해보세요.','choice-empty'));if(!showAll){detail.append(button('자격·능력 훈련 알아보기',()=>{tab='training';render();}));if(s?.pendingDecision==='first-job')detail.append(button('취업 준비하며 다음 달로',event=>act(onDefer,undefined,event.currentTarget)));}else list.append(el('p','검색 결과가 없습니다.'));}
   if(showAll){const prev=button('이전 20개',()=>{page--;update();}),next=button('다음 20개',()=>{page++;update();});prev.disabled=page===0;next.disabled=(page+1)*PAGE_SIZE>=found.length;pager.append(prev,next);}
  }
  search.addEventListener('input',()=>{query=search.value;showAll=true;page=0;update();});groupSelect.addEventListener('change',()=>{group=groupSelect.value;showAll=true;page=0;update();});filterSelect.addEventListener('change',()=>{filter=filterSelect.value;showAll=true;page=0;update();});update();
 }
 function renderTraining(){
  const s=getState(),p=s?employmentProfile(s):null;body.append(el('h3','지원 조건을 차근차근 준비하기'));
  if(!s){body.append(el('p','먼저 게임을 시작해주세요.'));return;}
  appendList(body,['훈련비는 등록할 때 한 번 지출합니다.','자금 부족분은 차입으로 처리합니다.','동시에 한 과정, 한 달에 한 번만 등록할 수 있습니다.','복무·정규 재학 중에는 훈련이 진행되지 않습니다.']);
  if(s.pendingDecision==='first-job')body.append(button('취업을 미루고 훈련 준비하기',event=>act(onDefer,undefined,event.currentTarget)));
  const blocked=s.phase!=='running'||s.age<16||s.service.active||s.schoolJourney?.current||s.schooling?.status==='enrolled'&&!s.schooling.fundingPaused||s.job.status==='재학'||!!p.training||p.lastTrainingMonth===s.totalMonths||pendingInjuryCare(s)||!recoveryActivityPolicy(s).studyAllowed;
  if(blocked)body.append(el('p',pendingInjuryCare(s)||!recoveryActivityPolicy(s).studyAllowed?'부상 대응과 회복을 먼저 마쳐 주세요.':p.training?'진행 중인 훈련을 마친 뒤 새 과정에 등록할 수 있습니다.':'16세 이후, 갈림길·복무·정규 학업을 마친 뒤 등록할 수 있습니다. 이달 이미 등록했다면 다음 달에 다시 선택해주세요.','employment-blocked'));
  const cards=el('div',undefined,'employment-training-grid');
  function courseCard(title,request){const card=el('section',undefined,'employment-training-card');card.append(el('h4',title));let plan;try{plan=careerTrainingPlan(s,request);}catch(error){card.append(el('p',error.message));return card;}facts(card,[...(request.type==='ability'?[['현재 능력',`${Math.round(p.abilities[request.ability]??0)}/100`]]:request.type==='education'?[['현재 학력',p.educationLabel]]:[]),['기간',`${plan.durationMonths}개월`],['등록비',cash(plan.cost)],...(request.type==='ability'?[['완료 효과','능력 +8점']]:[])]);const b=button(`${plan.label} 시작`,event=>act(onTrain,request,event.currentTarget));b.disabled=blocked;card.append(b);return card;}
  for(const [ability,label]of Object.entries(ABILITIES))cards.append(courseCard(label,{type:'ability',ability}));
  cards.append(courseCard('학력 경로',{type:'education'}));
  const prep=el('section',undefined,'employment-training-card'),label=el('label','직업 준비 과정'),select=el('select'),qualificationRows=rows.filter(row=>employmentRequirements(row).qualificationRequired),courseInfo=el('div');for(const row of qualificationRows)select.append(new Option(row.occupation.name,row.id));select.value=qualificationRows.some(row=>row.id===selectedId)?selectedId:qualificationRows[0]?.id;select.setAttribute('aria-label','준비할 직업');label.append(select);
  const prepButton=button('직업 준비 과정 시작',event=>act(onTrain,{type:'qualification',occupationId:select.value},event.currentTarget));
  function updatePreparation(){const row=qualificationRows.find(row=>row.id===select.value);try{const plan=careerTrainingPlan(s,{type:'qualification',occupationId:row?.id},row);courseInfo.replaceChildren();facts(courseInfo,[['기간',`${plan.durationMonths}개월`],['등록비',cash(plan.cost)]]);prepButton.disabled=blocked;}catch(error){courseInfo.textContent=displayCopy(error.message);prepButton.disabled=true;}}
  select.addEventListener('change',()=>{selectedId=select.value;updatePreparation();});updatePreparation();prep.append(el('h4','직업별 자격 준비'),label,courseInfo,el('p','학력 조건을 갖춘 뒤 준비 과정을 이수합니다.'),prepButton);cards.append(prep);body.append(cards);
 }
 function renderMove(){
  const s=getState();body.append(el('h3','새 거주지역 선택하기'));appendList(body,['이사비 300만원을 한 번 지출합니다.','자금이 부족하면 차입합니다.']);
  if(!s){body.append(el('p','먼저 게임을 시작해주세요.'));return;}
  const label=el('label','새 거주지역'),select=el('select');select.setAttribute('aria-label','새 거주지역');for(const region of data.regions)select.append(new Option(region,region));select.value=s.residence.region;label.append(select);facts(body,[['현재 거주지역',s.residence.region],['주거 형태',s.residence.housing]]);body.append(label,button('선택한 지역으로 이사하기',event=>act(onMove,select.value,event.currentTarget)));
 }
 function render(){clearActionError(status);for(const [id,b]of tabButtons)b.setAttribute('aria-pressed',String(id===tab));renderSummary();body.replaceChildren();if(tab==='jobs')renderJobs();else if(tab==='training')renderTraining();else renderMove();}
 dialog.addEventListener('close',()=>onClose?.());dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 return{get isOpen(){return dialog.open;},open(which='jobs',options={}){tab=which;if(options.all===true)showAll=true;if(!selectedId)selectedId=getState()?.job?.occupationId||rows[0].id;clearActionError(status);onOpen?.();render();if(!dialog.open)dialog.showModal();heading.focus({preventScroll:true});},close(){if(dialog.open)dialog.close();},refresh(){if(dialog.open)render();}};
}
