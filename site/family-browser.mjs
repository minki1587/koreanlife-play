import {renderEstateDetails} from './estate-views.mjs?v=focused-play-2';
import {currentParents} from './parent-careers.mjs?v=focused-play-2';
import {householdSummary} from './household-finance.mjs?v=focused-play-2';
import {householdFacts} from './household-views.mjs?v=focused-play-2';
import {formatMoney} from './spending.mjs?v=focused-play-2';
import {displayCopy,appendUiFacts} from './ui-copy.mjs?v=focused-play-2';
import {renderFormedFamilySummary} from './formed-family-views.mjs?v=focused-play-2';
const money=n=>formatMoney(n);
export function familyLocationLabel(place,profiles){
 const original=place.sourceRegion===place.name?place.name:`${place.sourceRegion} ${place.name}`;
 const current=profiles?.get(place.id)?.currentAreas||[];
 return current.length?`${original} (현재: ${current.join(' · ')})`:original;
}
export function createFamilyBrowser({profiles,getState=()=>null,onOpen=()=>{},onClose=()=>{},document=globalThis.document}={}){
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=displayCopy(value);return n;};
 const dialog=el('dialog','family-dialog');dialog.id='family-dialog';dialog.setAttribute('aria-labelledby','family-title');
 const top=el('div','family-dialog-top'),heading=el('h2','','가족의 현재와 시작');heading.id='family-title';heading.tabIndex=-1;
 const close=el('button','family-close','×');close.type='button';close.setAttribute('aria-label','가족 정보 닫기');
 const body=el('div','family-dialog-body');top.append(heading,close);dialog.append(top,body);document.body.append(dialog);
 let opener=null;
 const facts=(host,pairs)=>appendUiFacts(document,host,pairs,'family-facts');
 const card=(title,pairs)=>{const section=el('section','family-section');section.append(el('h3','',title));facts(section,pairs);return section;};
 function render(f){
  body.replaceChildren();
  const state=getState();if(state)body.append(renderFormedFamilySummary(state,{document}));
  if(!f){body.append(el('p','family-empty','이전 삶에는 출생 가족 정보가 저장되지 않았습니다. 새 삶부터 가족 배경을 확인할 수 있습니다.'));return;}
  const sameFamily=state?.profile?.birthFamily?.fingerprint===f.fingerprint;
  if(sameFamily&&state.familyLife){
   const current=el('section','family-current');current.id='family-current';current.append(el('h3','','현재 부모·보호자'));facts(current,[['내 나이',`${state.age}세 ${state.month}개월`]]);
   const people=el('div','family-people');
   for(const p of currentParents(state))people.append(card(`${p.role} ${p.name}`,[[p.status==='deceased'?'사망 당시 나이':'현재 나이',`${p.age}세 ${p.month}개월`],['현재 상태',p.statusLabel],['현재 직업',p.occupation?.name||'근로 직업 없음'],['연 근로소득',money(p.annualIncomeWan)],['월 근로소득',money(p.annualIncomeWan/12)],['학력',p.education.label],...(p.death?[['사망 시점',`내 나이 ${Math.floor(p.death.atMonth/12)}세 ${p.death.atMonth%12}개월`],['연간 사망확률',`${(p.death.annualQx*100).toLocaleString('ko-KR',{maximumFractionDigits:3})}%`]]:[]),...(p.occupation?[['직무 경력',`${Math.floor(p.occupation.experienceMonths/12)}년 ${p.occupation.experienceMonths%12}개월`],['근무형태',p.occupation.employmentType],['근무지',familyLocationLabel(p.occupation.workplace,profiles)]]:[])]));
   current.append(people,el('h3','','최근 가족의 변화'));const events=state.familyLife.events.slice(-10).reverse();
   if(events.length){const list=el('ul','family-career-history');for(const e of events){const item=el('li');item.append(el('strong','',e.title));facts(item,[['시점',`${Math.floor(e.atMonth/12)}세 ${e.atMonth%12}개월`],['연 근로소득',money(e.annualIncomeWan)]]);list.append(item);}current.append(list);}else current.append(el('p','family-note','아직 부모의 고용 변화가 없습니다.'));
   body.append(current);const estate=renderEstateDetails(state,{document});if(estate)body.append(estate);
  }
  const live=sameFamily?householdSummary(state):null;
  if(live)body.append(card('현재 가구 지원 계정',householdFacts(state)));
  body.append(el('p','family-kicker','출생 당시의 가족 기록'));
  const people=el('div','family-people');
  for(const g of f.guardians){
   const pairs=[['출생 당시 나이',`${g.ageAtBirth}세`],['직업·상태',g.occupation?g.occupation.name:g.activity],['고향',familyLocationLabel(g.hometown,profiles)],['학력',g.education.label],['연 소득',money(g.occupation?.annualIncomeWan||0)]];
   if(g.occupation){const o=g.occupation;pairs.push(['직무 경력',`${Math.floor(o.experienceMonths/12)}년 ${o.experienceMonths%12}개월`],['근무형태',o.employmentType],['근무 일정',o.shift],['근무시간',o.weeklyHours===null?'미설정':`주 ${o.weeklyHours}시간`],['근무지',familyLocationLabel(o.workplace,profiles)],['생활 일정',o.workArrangement],['자격 준비',o.qualification]);}
   pairs.push(['함께 사는 곳',familyLocationLabel(g.residence,profiles)],['가족을 대하는 방식',g.parentingStyle+' 보호자']);people.append(card(`${g.role} ${g.name}`,pairs));
  }
  body.append(people);const h=f.household;
  body.append(card('함께 사는 가족',[['가구 인원',`${h.members}명`],['보호자',`${f.guardians.length}명`],['형제자매 수',`${f.siblings.length}명`],['나의 출생 순서',`${f.birthOrder}번째 아이`],['형제자매',f.siblings.length?f.siblings.map(s=>`${s.name} (출생 당시 ${s.ageAtBirth}세)`):'없음'],['돌봄',h.carePlan]]));
  body.append(card('첫 주거 환경',[['주소',familyLocationLabel(h.housing.address,profiles)],['점유 형태',h.housing.tenure],['주거 형태',h.housing.homeType],[h.housing.assetKind,money(h.housingAssetWan)],['월 주거비',money(h.housing.monthlyWan)]]));
  body.append(card('출생 당시 가구 경제',[['보호자 연 소득 합계',money(h.annualIncomeWan)],['월 소득 기반 생활예산',money(h.incomeBudgetWan)],['월 기본 지출·상환',money(h.essentialMonthlyWan)],['가구 금융자산',money(h.liquidAssetsWan)],['가구 부채',money(h.debtWan)],['가구 순자산',money(h.netAssetsWan)]]));
 }
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{onClose();if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});});
 return{get isOpen(){return dialog.open;},open(f){opener=document.activeElement;render(f);if(!dialog.open){onOpen();dialog.showModal();}dialog.scrollTop=0;heading.focus({preventScroll:true});},close(){if(dialog.open)dialog.close();}};
}
export function renderFamilyPreview(host,f,{profiles,onOpen,document=host.ownerDocument}){
 host.replaceChildren();host.className='birth-family';
 const button=document.createElement('button');button.className='secondary family-details-button';button.textContent='가족 정보 ↗';button.id='birth-family-open';button.type='button';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',()=>onOpen(f));host.append(button);
}
