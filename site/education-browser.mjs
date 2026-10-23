import {educationFunding,householdSummary,activeHobbyCost} from './household-finance.mjs?v=refinements-2';
import {schoolChoices,universityOptions,schoolManagementSummary} from './education.mjs?v=refinements-2';
import {formatMoney} from './spending.mjs?v=refinements-2';
import {displayCopy,displayLines,appendUiFacts,completeModalAction,clearActionError} from './ui-copy.mjs?v=refinements-2';
import {recoveryStudyAllowed,recoveryActivityNotes} from './injury-care.mjs?v=refinements-2';
import {recommendEducation} from './choice-recommendations.mjs?v=refinements-2';
import {completedDegrees} from './degree-history.mjs?v=refinements-2';
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=displayCopy(text);if(cls)node.className=cls;return node;}
function button(text,handler,cls='life-tool-button'){const node=el('button',text,cls);node.type='button';node.addEventListener('click',handler);return node;}
function list(host,values,cls='education-notes'){const ul=el('ul',undefined,cls);for(const value of values)for(const text of displayLines(value))ul.append(el('li',text));if(ul.children.length)host.append(ul);}
function facts(host,pairs,cls='education-facts'){return appendUiFacts(document,host,pairs,cls);}
function disclosure(label){const node=el('details',undefined,'education-more');node.append(el('summary',label));return node;}
export function createEducationBrowser({getState,data,onSchool,onUniversity,onDefer,onFundingPause,onOpen,onClose}){
 const dialog=el('dialog',undefined,'life-tools-dialog');dialog.id='education-dialog';dialog.setAttribute('aria-labelledby','education-title');
 const top=el('div',undefined,'dialog-top'),heading=el('h2','학교·대학 지원');heading.id='education-title';heading.tabIndex=-1;
 const close=button('×',()=>dialog.close(),'dialog-close');close.setAttribute('aria-label','학교 지원 창 닫기');top.append(heading,close);
 const summary=el('div',undefined,'life-tool-summary'),status=el('p','','life-tool-status'),body=el('div',undefined,'life-tool-body');status.setAttribute('role','status');dialog.append(top,summary,status,body);document.body.append(dialog);
 let mode='overview',universityPath='university',filters={ownership:'',location:'',field:''},showAll=false;
 const act=(callback,id,anchor)=>completeModalAction(dialog,status,callback,id,'지원 조건을 확인해주세요.',{anchor});
 const fundingFacts=(host,funding)=>facts(host,[['월 학비',formatMoney(funding.monthlyTuitionWan)],['가족 지원 예상',formatMoney(funding.familyMonthlyWan)],['월 내 준비액',formatMoney(funding.personalMonthlyWan)],...(funding.commitmentMonths?[['예산 확인 기간',`${funding.commitmentMonths}개월`]]:[])],'education-facts funding-note');
 function render(){
  clearActionError(status);
  const s=getState();summary.replaceChildren(el('strong',s.name));facts(summary,[['나이',`${s.age}세 ${s.month}개월`],['배움',`${Math.round(s.learn)}/100`],['학업',s.education]]);body.replaceChildren();
  if(mode==='university'&&s.degreeHistory){const completed=completedDegrees(s);if(completed.length){const history=disclosure('완료한 대학 과정');for(const degree of completed)facts(history,[['이수 전공',degree.fieldLabel],['학업 이수',`${degree.studyMonths}개월`],['완료 시점',degree.graduatedAtMonth===null?'이전 졸업 기록 보존':`내 나이 ${Math.floor(degree.graduatedAtMonth/12)}세 ${degree.graduatedAtMonth%12}개월`]]);body.append(history);if(s.schooling?.status==='graduated'&&!s.academy)body.append(el('p','완료한 전공과 준비 증표는 보존합니다. 다른 전공을 새로 공부할 수 있습니다.','choice-introduction'));}}
  if(mode==='overview'){
   const school=schoolManagementSummary(s,data);body.append(el('h3','나의 학업'));
   facts(body,[['현재 과정',school.currentName],...(school.stage?[['이수 기간',`${school.progressMonths}/${school.durationMonths}개월`],['남은 과정',`${school.remainingMonths}개월`],['배움 보너스',`연 +${school.annualLearningBonus.toFixed(2)}`],...(school.annualBondBonus?[['관계 보너스',`연 +${school.annualBondBonus.toFixed(2)}`]]:[]),...(school.annualJoyBonus?[['만족 보너스',`연 +${school.annualJoyBonus.toFixed(2)}`]]:[]),['연 등록금',formatMoney(school.annualTuitionWan)]]:[]),['다음 입학',`${school.nextEntry.label} · ${school.nextEntry.age}세`],['남은 시간',school.nextEntry.remainingMonths?`${school.nextEntry.remainingMonths}개월`:'해당 입학 갈림길에서 선택']]);
   list(body,[school.stage?(recoveryStudyAllowed(s)?'재학 기간에 맞춰 매달 배움이 쌓입니다.':'회복 중에는 재학 보너스를 쉬고 학년 달력은 이어갑니다.'):'입학 시기가 되면 학교를 선택하는 갈림길이 열립니다.',...recoveryActivityNotes(s)]);return;
  }
  const household=householdSummary(s);
  if(household&&!(mode==='university'&&(universityPath==='academy'||s.academy))){facts(body,[['내 소지금',formatMoney(s.cash)],['월 추가 지원 여력',formatMoney(household.familyMonthlyCapacityWan)]],'education-facts funding-note');const support=disclosure('가구 학비 지원 배경');facts(support,[['가구 금융자산',formatMoney(household.liquidAssetsWan)]],'education-facts funding-note');list(support,['유료 학비는 생활비·주거비와 준비금을 제외한 12개월 예산을 확인합니다.','부모의 취업·실직·이직·은퇴·사망에 따라 지원액이 달라집니다.']);body.append(support);}
  if(mode==='university'&&s.academy){
   const cadet=s.academy.status==='cadet';body.append(el('h3',s.schooling.school.name));facts(body,[['학업 상태',cadet?'사관생도 재학 중':'사관학교 졸업'],['이수 기간',`${s.schooling.progressMonths}/48개월`],['등록금',formatMoney(0)],['재학 지원','학비·숙식 제공'],['진로',cadet?'졸업 후 해당 군 장교':s.academy.status==='officer'?'장교 복무 중':'장교 복무 이력 보유']]);
   if(cadet)list(body,['48개월 교육을 마치면 해당 군의 장교로 임관합니다.','일반 병사 복무·병사 월급·군복무 적금을 중복 적용하지 않습니다.',...recoveryActivityNotes(s)]);return;
  }
  if(mode==='university'&&s.schooling?.status==='enrolled'){
   const paused=!!s.schooling.fundingPaused,funding=educationFunding(s,s.schooling.annualTuitionWan,{university:true,hobbyCostWan:activeHobbyCost(s,data.hobbyCatalog)});
   body.append(el('h3',displayLines(s.schooling.school.name).at(-1)));facts(body,[['학업 상태',paused?'학비 준비 휴학 중':recoveryStudyAllowed(s)?'대학 재학 중':'회복을 위한 학업 휴식 중']]);fundingFacts(body,{...funding,monthlyTuitionWan:paused||!recoveryStudyAllowed(s)?0:s.schooling.annualTuitionWan/12});
   const b=button(paused?'학비 마련 후 복학하기':'학비 준비로 휴학하기',event=>act(onFundingPause,!paused,event.currentTarget),'life-tool-button life-tool-primary');b.disabled=s.phase!=='running'||s.service.active||paused&&!funding.eligible;body.append(b);
   list(body,funding.reasons,'education-notes life-tool-blocked');list(body,['휴학 중에는 수업료와 학업 진행을 멈춥니다.','복학하면 근로소득을 중단하고 학업을 이어갑니다.',...recoveryActivityNotes(s)]);return;
  }
  let options,allOptions;
  if(mode==='university'){
   const paths=el('div',undefined,'life-tool-actions');paths.setAttribute('role','group');paths.setAttribute('aria-label','대학 진학 경로');
   for(const [path,title]of [['university','일반대학'],['academy','사관학교 · 3개']]){const b=button(title,()=>{universityPath=path;render();});b.setAttribute('aria-pressed',String(universityPath===path));paths.append(b);}body.append(paths);
   if(universityPath==='academy'){
    body.append(el('h3','육군·해군·공군 사관학교'));body.append(el('p','학비·숙식을 지원받으며 4년 교육 후 해당 군 장교로 이어집니다.','choice-introduction'));options=allOptions=universityOptions(s,{path:'academy'},data);
   }else{
   const all=universityOptions(s,{path:'university'},data),controls=el('div',undefined,'education-filters');allOptions=all;controls.hidden=!showAll;
   for(const [key,label,values]of [['ownership','1. 대학 설립',[['public','국공립'],['private','사립']]],['location','2. 대학 지역',[['seoul','서울'],['regional','서울 외 지역']]],['field','3. 계열·전공',[...new Map(all.map(row=>[row.field,[row.field,row.fieldLabel]])).values()]]]){
    const l=el('label',label),select=el('select');select.setAttribute('aria-label',label);select.append(new Option('선택해주세요',''));for(const [value,text]of values)select.append(new Option(text,value));select.value=filters[key];
    select.addEventListener('change',()=>{filters[key]=select.value;showAll=true;render();body.querySelector(`[aria-label="${label}"]`)?.focus({preventScroll:true});});l.append(select);controls.append(l);
   }
   body.append(controls);
   if(Object.values(filters).some(value=>!value)){if(showAll)body.append(el('p','설립 유형 → 지역 → 계열·전공을 선택해주세요.'));options=showAll?[]:all;}else options=universityOptions(s,{...filters,path:'university'},data);
   const guide=disclosure('대학 경로 안내');list(guide,['서울 외 지역에는 경기·인천도 포함됩니다.','의학·치의학·수의학·한의학·약학 과정은 6년입니다.']);body.append(guide);list(body,['교대 계열은 국공립 경로를 제공합니다.','같은 입학 시기의 같은 과정에 중복 지원할 수 없습니다.']);
   }
  }else options=allOptions=schoolChoices(s,data);
  const recommendations=recommendEducation(options.map(row=>({row,assessment:row})),{university:mode==='university'}),reasonById=new Map(recommendations.map(item=>[item.row.id,item.reason]));
  const view=el('div',undefined,'choice-view-bar'),toggle=button(showAll?'추천만 보기':`전체 경로 보기 (${allOptions.length}개)`,()=>{showAll=!showAll;render();},'life-tool-button choice-view-toggle');toggle.setAttribute('aria-expanded',String(showAll));view.append(el('p',showAll?'설립 유형과 과정별 비용·조건을 비교해보세요.':recommendations.length?`현재 지원 가능한 추천 경로 ${recommendations.length}개`:'현재 바로 지원할 수 있는 경로가 없습니다.'),toggle);body.append(view);
  if(!showAll&&!recommendations.length)body.append(el('p','전체 경로에서 부족한 조건과 학비를 확인해보세요. 대학 진학 갈림길에서는 진학을 미루고 경험을 쌓을 수도 있습니다.','choice-empty'));
  const visible=showAll?options:recommendations.map(item=>item.row);
  const cards=el('div',undefined,'education-options');
  for(const row of visible){
   const card=el('article',undefined,'life-tool-detail');card.append(el('h3',displayLines(row.label||row.name).at(-1)));
   if(!showAll)card.append(el('p',reasonById.get(row.id),'choice-reason'));
   facts(card,[['연 등록금',formatMoney(row.annualTuitionWan)],['과정',`${row.durationMonths}개월`],...(mode==='school'?[['배움 보너스',`연 +${row.annualLearningBonus.toFixed(2)}`],...(row.annualBondBonus?[['관계 보너스',`연 +${row.annualBondBonus.toFixed(2)}`]]:[]),...(row.annualJoyBonus?[['만족 보너스',`연 +${row.annualJoyBonus.toFixed(2)}`]]:[])]:[]),['합격 가능성',`${(row.admissionChance*100).toFixed(1)}%`],['지원 기준',row.learningThreshold],['나의 배움',Math.round(s.learn)],...(row.academy?[['건강 기준',`${row.healthThreshold}/100`],['현재 건강',`${Math.round(s.health)}/100`],['재학 지원','학비·숙식 제공'],['졸업 후',`${row.branchLabel} 장교 경로`]]:[])]);
   const b=button(row.academy?'이 사관학교에 지원하기':mode==='university'?'이 대학 과정에 지원하기':'이 학교에 지원하기',event=>act(mode==='university'?onUniversity:onSchool,row.id,event.currentTarget),'life-tool-button life-tool-primary');b.disabled=!row.eligible;card.append(b);
   if(row.funding&&!row.funding.legacy)fundingFacts(card,row.funding);list(card,row.reasons||[],'education-notes life-tool-blocked');const course=disclosure('과정 정보');facts(course,[['설립 유형',row.ownershipLabel],...(row.locationLabel?[['지역',row.locationLabel]]:[]),...(row.fieldLabel?[['계열·전공',row.fieldLabel]]:[])]);card.append(course);cards.append(card);
  }
  body.append(cards);if(!options.length&&!Object.values(filters).some(value=>!value))body.append(el('p','이 조합으로 제공하는 과정이 없습니다. 설립 유형이나 전공을 바꿔주세요.'));
  if(mode==='university'&&s.pendingDecision==='education')body.append(button('대학 진학을 미루고 경험 쌓기',event=>act(onDefer,undefined,event.currentTarget),'life-tool-button'));
 }
 dialog.addEventListener('close',()=>onClose?.());dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 return{get isOpen(){return dialog.open;},open(which,options={}){if(options.all===true)showAll=true;const s=getState();which??=['school-primary','school-middle','school-high'].includes(s.pendingDecision)?'school':s.age<19||s.schoolJourney?.current?'overview':'university';mode=which==='university'&&(s.age<19||s.schoolJourney?.current)?'overview':which;heading.textContent=mode==='overview'?'학업 관리':'학교·대학 지원';clearActionError(status);onOpen?.();render();if(!dialog.open)dialog.showModal();heading.focus({preventScroll:true});},close(){if(dialog.open)dialog.close();}};
}
