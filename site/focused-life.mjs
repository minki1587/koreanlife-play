import {militaryObligation} from './military-obligation.mjs?v=living-costs-20261024';
import {careerMilestone} from './career-milestone.mjs?v=living-costs-20261024';
import {displayCopy} from './ui-copy.mjs?v=living-costs-20261024';
import {timelineFamilyCopy} from './timeline-copy.mjs?v=living-costs-20261024';
import {formatMoney} from './spending.mjs?v=living-costs-20261024';
import {focusedImportantEvents} from './history-digest.mjs?v=living-costs-20261024';
import {cashFlowSummary} from './cash-flow-summary.mjs?v=living-costs-20261024';

export const MANAGER_GROUPS=Object.freeze([
 {id:'learning',label:'학업·일',actions:['education-manage','employment-open','training-open','military-info-open','careers']},
 {id:'living',label:'생활',actions:['hobbies-open','spending-open']},
 {id:'family',label:'가족',actions:['family-open','formed-family-open']},
 {id:'assets',label:'재산',actions:['property-open-title','investment-open-title','debt-balance']},
]);
const FOCUS_NAMES={balance:'균형',learning:'배움',career:'일과 성장',health:'건강',relationships:'사람들'};
const SCHOOL_IDS=new Set(['school-primary','school-middle','school-high']);

export function recentEventTitle(event,state){return displayCopy(timelineFamilyCopy(event?.choice||event?.title||'삶의 변화',state));}

/** One current task, derived from existing pending decisions. Never executes it. */
export function currentLifeTask(state){
 if(!state||state.phase==='ended')return null;
 if(state.lifeHealth?.pendingCare)return{id:'injury-care-reopen',label:'몸 돌보기 선택',kind:'care'};
 const duty=militaryObligation(state);if(duty)return{id:'military-duty-reopen',label:duty.kind==='service'?'복무 선택하기':'예비군 훈련 선택',kind:'military'};
 if(state.phase!=='decision')return null;
 const id=state.pendingDecision;
 if(SCHOOL_IDS.has(id))return{id:'education-manage',label:'학교 선택하기',kind:'school'};
 if(id==='education'&&state.schoolJourney)return{id:'education-manage',label:'대학 선택하기',kind:'university'};
 if(id==='first-job')return state.remedies&&careerMilestone(state)?.kind!=='seeking'?{id:'decision-reopen',label:'일과 진로 선택',kind:'career-context'}:{id:'employment-open',label:'일자리 알아보기',kind:'jobs'};
 return{id:'decision-reopen',label:'갈림길 선택하기',kind:'decision'};
}

/** The guide explains a real event; it cannot create or resolve a game event. */
export function milestoneGuide(state,{initialMonth=state?.totalMonths??0,seen=[]}={}){
 if(!state||state.phase==='ended')return null;
 const task=currentLifeTask(state),done=new Set(seen),make=(id,text)=>done.has(id)?null:{id,text};
 if(task?.kind==='school')return make(state.pendingDecision,'학비와 배움 효과를 비교해 학교를 선택하세요. 추천부터 보고 전체 학교도 확인할 수 있어요.');
 if(task?.kind==='university')return make('university','현재 배움과 준비 가능한 학비에 맞는 경로부터 살펴보세요. 지역과 전공을 직접 찾아볼 수도 있어요.');
 if(task?.kind==='career-context')return make('career-context','지금의 학업과 일을 이어가거나 다음 방향을 살펴보세요. 현재 일상을 유지해도 괜찮아요.');
 if(task?.kind==='jobs')return make('jobs','현재 지원 가능한 일자리부터 추천해요. 제시 세후 연봉과 필요한 조건을 비교한 뒤 지원하세요.');
 if(state.pendingDecision==='school-ready')return make('school-ready','어떤 습관으로 자랄지 골라보세요. 삶의 초점은 일상 화면에서 언제든 바꿀 수 있어요.');
 if(state.totalMonths===0&&initialMonth===0)return make('birth','시간은 한 달씩 흘러요. 중요한 갈림길에서는 멈추고, 필요한 관리는 ‘삶 관리’에서 할 수 있어요.');
 if(state.totalMonths<=initialMonth)return null;
 if(state.salary>0&&state.job?.experienceMonths===1)return make('first-income','급여와 생활비는 매달 반영돼요. 소지금 옆에는 이번 달 현금 변화가 표시되고, 재산은 ‘삶 관리’에서 확인해요.');
 const recent=(state.timeline||[]).filter(e=>(e.atMonth??e.age*12+(e.month||0))===state.totalMonths);
 if(recent.some(e=>/출산|자녀.*태어|결혼/.test(e.title||'')))return make('family','가족이 늘면 생활과 양육 부담도 달라져요. ‘삶 관리 → 가족’에서 현재 상태와 선택을 확인하세요.');
 return null;
}

export function createFocusedLife({document=globalThis.document,storage,getState,parts,beforeOpen=()=>true,onClose=()=>{},onAction=()=>{}}={}){
 const $=id=>document.getElementById(id),manager=$('life-manager'),records=$('records-dialog');
 let switching=false,group='learning',seed=null,initialMonth=0,seen=new Set(),activeGuide=null,selectRecords=()=>{};
 const key='koreanlife-focus-interface-v1';
 function readPreferences(s){
  initialMonth=s.totalMonths;seen=new Set();activeGuide=null;
  try{const value=JSON.parse(storage?.getItem(key)||'null');if(value?.seed===s.seed&&Array.isArray(value.seen))seen=new Set(value.seen.filter(x=>typeof x==='string').slice(0,24));}catch{}
 }
 function persist(){try{storage?.setItem(key,JSON.stringify({seed,seen:[...seen]}));}catch{}}
 function closeLocal(except){switching=true;try{for(const dialog of [manager,records])if(dialog!==except&&dialog.open)dialog.close();}finally{switching=false;}}
 function open(dialog){if(!getState()||beforeOpen(dialog.id)===false)return false;closeLocal(dialog);if(!dialog.open)dialog.showModal();return true;}
 function selectGroup(id){
  if(!MANAGER_GROUPS.some(x=>x.id===id))return;group=id;
  for(const tab of document.querySelectorAll('[data-manager-group]')){const selected=tab.dataset.managerGroup===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  for(const panel of document.querySelectorAll('[data-manager-panel]'))panel.hidden=panel.dataset.managerPanel!==id;
 }
 function openManager(id=group){selectGroup(id);if(open(manager))$('manager-title').focus({preventScroll:true});}
 function openRecords(channel){if(open(records)){selectRecords(channel);$('records-title').focus({preventScroll:true});}}
 function close({silent=false}={}){const old=switching;switching=silent;try{for(const dialog of [manager,records])if(dialog.open)dialog.close();}finally{switching=old;}}
 for(const dialog of [manager,records]){
  dialog.addEventListener('close',()=>{if(!switching)onClose();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 }
 $('life-manage-open').addEventListener('click',()=>openManager());
 $('manager-close').addEventListener('click',()=>manager.close());$('records-close').addEventListener('click',()=>records.close());
 $('all-records-open').addEventListener('click',()=>openRecords());$('cash-details-open').addEventListener('click',()=>openRecords('money'));
 $('manager-records-open').addEventListener('click',()=>openRecords('money'));
 $('current-life-task').addEventListener('click',()=>{const task=currentLifeTask(getState());if(task)onAction(task.id);});
 $('guide-dismiss').addEventListener('click',()=>{if(activeGuide){seen.add(activeGuide.id);activeGuide=null;persist();$('milestone-guide').hidden=true;}});
 for(const tab of document.querySelectorAll('[data-manager-group]')){
  tab.addEventListener('click',()=>selectGroup(tab.dataset.managerGroup));
  tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const ids=MANAGER_GROUPS.map(x=>x.id),at=ids.indexOf(group),next=event.key==='Home'?ids[0]:event.key==='End'?ids.at(-1):ids[(at+(event.key==='ArrowRight'?1:ids.length-1))%ids.length];selectGroup(next);document.querySelector(`[data-manager-group="${next}"]`)?.focus();});
 }
 // Move existing action controls, retaining their ids and listeners.
 for(const item of MANAGER_GROUPS){const panel=document.querySelector(`[data-manager-panel="${item.id}"]`);for(const id of item.actions){const node=$(id);if(node){
  if(id==='property-open-title'||id==='investment-open-title'){const parent=node.parentNode,label=id==='property-open-title'?'부동산':'투자 (주식·펀드)';parent.textContent=label;}
  if(id==='debt-balance'){const value=document.createElement('strong');value.id='record-debt-value';node.parentNode.append(value);}
  if(/[›→]\s*$/.test(node.textContent))node.textContent=node.textContent.replace(/[›→]\s*$/,'').trim();
  panel.append(node);
 }}}
 const future=$('future-actions');if(future)$('manager-help').append(future);
 const extra=$('manager-profile');for(const id of ['status-tags','profile-details','lifestyle-settings','health-status-panel']){const node=$(id);if(node)extra.append(node);}
 $('profile-details-content').hidden=false;$('profile-details-toggle').hidden=true;
 for(const id of ['restart','quick-download','game-import-save','about']){const node=$(id);if(node)$('manager-save-actions').append(node);}
 // Existing tool dialogs receive a return route, without stacking dialogs.
 function installBackLinks(){for(const dialog of document.querySelectorAll('dialog')){
 if(['life-manager','records-dialog','decision-dialog','injury-care-dialog','info','sources-dialog'].includes(dialog.id))continue;
 const existing=dialog.querySelector('[data-return-manager]');
 if(existing){const label=getState()?.phase==='ended'?'‹ 돌아가기':'‹ 삶 관리';if(existing.textContent!==label)existing.textContent=label;continue;}
  const header=dialog.querySelector('.dialog-top,.employment-top,.family-dialog-top,.family-top')||dialog.firstElementChild;
  if(!header||!header.querySelector?.('h2'))continue;
  const back=document.createElement('button');back.type='button';back.className='quiet manager-return';back.dataset.returnManager='true';back.textContent='‹ 삶 관리';back.addEventListener('click',()=>{if(getState()?.phase==='ended')dialog.close();else openManager();});header.append(back);
 }}
 installBackLinks();const Observer=document.defaultView?.MutationObserver??globalThis.MutationObserver;const observer=typeof Observer==='function'?new Observer(installBackLinks):null;observer?.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 function update(state,events=[]){
  if(seed!==state.seed){seed=state.seed;readPreferences(state);selectGroup(state.age<6?'family':state.age<19||!state.job?.occupationId?'learning':'living');}
  const task=currentLifeTask(state),taskButton=$('current-life-task');taskButton.hidden=!task;taskButton.textContent=task?.label||'';
  $('current-focus-label').textContent=FOCUS_NAMES[state.focus]||FOCUS_NAMES.balance;
  $('personal-cash').textContent=formatMoney(state.cash);
  $('debt-balance').textContent=`대출금 · ${formatMoney(state.debt)}`;$('record-debt-value').textContent=formatMoney(state.debt);
  const cash=cashFlowSummary(state);$('cash-month-change').textContent=cash?`이번 달 ${cash.deltaWan>=0?'+':''}${formatMoney(cash.deltaWan)}`:'이번 달 정산 전';
  const pendingGuide=activeGuide&&(['school-primary','school-middle','school-high','school-ready','university','jobs','career-context'].includes(activeGuide.id));
  const expected=activeGuide?.id==='university'?'education':['jobs','career-context'].includes(activeGuide?.id)?'first-job':activeGuide?.id;
  if(pendingGuide&&state.pendingDecision!==expected){seen.add(activeGuide.id);activeGuide=null;persist();}
  const candidate=milestoneGuide(state,{initialMonth,seen:[...seen]});if(candidate&&candidate.id!==activeGuide?.id)activeGuide=candidate;
  if(activeGuide&&seen.has(activeGuide.id))activeGuide=null;
  $('milestone-guide').hidden=!activeGuide;if(activeGuide)$('guide-copy').textContent=activeGuide.text;
  const rows=focusedImportantEvents(events,{state,limit:3,parts,channel:'all'}),host=$('recent-important');
  const signature=JSON.stringify(rows.map(e=>[e.id,recentEventTitle(e,state),e.age,e.month]));
  if(host.dataset.signature!==signature){host.replaceChildren();for(const event of rows){
   const row=document.createElement('li'),time=document.createElement('span'),title=document.createElement('strong');time.textContent=`${event.age}세${event.month?' '+event.month+'개월':''}`;title.textContent=recentEventTitle(event,state);row.append(time,title);host.append(row);
  }host.dataset.signature=signature;}
  $('recent-empty').hidden=rows.length>0;
 }
 selectGroup(group);
 return{update,openManager,openRecords,close,setRecordSelector(fn){selectRecords=fn;},get isOpen(){return manager.open||records.open;},destroy(){observer?.disconnect();close({silent:true});}};
}
