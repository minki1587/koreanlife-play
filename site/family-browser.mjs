import {householdSummary} from './household-finance.mjs';
import {householdFacts} from './household-views.mjs';
import {formatMoney} from './spending.mjs';
import {familySummary} from './birth-family.mjs';

const money=n=>formatMoney(n);
export function familyLocationLabel(place,profiles){
  const original=place.sourceRegion===place.name?place.name:`${place.sourceRegion} ${place.name}`;
  const current=profiles?.get(place.id)?.currentAreas||[];
  return current.length?`${original} (현재: ${current.join(' · ')})`:original;
}

export function createFamilyBrowser({profiles,getState=()=>null,onOpen=()=>{},onClose=()=>{},document=globalThis.document}={}){
  const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
  const dialog=el('dialog','family-dialog');dialog.id='family-dialog';dialog.setAttribute('aria-labelledby','family-title');
  const top=el('div','family-dialog-top'),heading=el('h2','', '태어난 집의 이야기');heading.id='family-title';heading.tabIndex=-1;
  const close=el('button','family-close','×');close.type='button';close.setAttribute('aria-label','가족 정보 닫기');
  const body=el('div','family-dialog-body');top.append(heading,close);dialog.append(top,body);document.body.append(dialog);
  let opener=null;
  const pair=(list,label,value)=>{const group=el('div','family-fact'),dt=el('dt','',label),dd=el('dd','',value);group.append(dt,dd);list.append(group);};
  const card=(title,pairs)=>{const section=el('section','family-section'),h=el('h3','',title),dl=el('dl','family-facts');for(const [label,value]of pairs)pair(dl,label,value);section.append(h,dl);return section;};
  function render(f){
    body.replaceChildren();
    if(!f){body.append(el('p','family-empty','이전 삶에는 출생 가족 정보가 저장되지 않았습니다. 새 삶부터 가족 배경을 확인할 수 있습니다.'));return;}
    const state=getState(),live=state?.profile?.birthFamily?.fingerprint===f.fingerprint?householdSummary(state):null;if(live){body.append(card('현재 가구 지원 계정',householdFacts(state)));body.append(el('p','family-note','가구 금융자산은 실제 지원 때 줄고 소득 예산의 잔액은 남습니다. 주택·보증금은 현금화하지 않습니다. 지원 정산은 미성년 기간과 만 28세 이하 대학 재학·학비 준비 기간에 적용하며, 복무 중에는 멈춥니다.'));}
    const tag=el('p','family-kicker','출생 당시의 가족 기록'),summary=el('p','family-summary',familySummary(f));body.append(tag,summary);
    const people=el('div','family-people');
    for(const g of f.guardians){
      const section=el('section','guardian-card'),title=el('h3','guardian-title',`${g.role} · ${g.name}`),meta=el('p','guardian-meta',`출생 당시 ${g.ageAtBirth}세`),dl=el('dl','family-facts');
      pair(dl,'직업·상태',g.occupation?g.occupation.name:g.activity);
      pair(dl,'고향',familyLocationLabel(g.hometown,profiles));
      pair(dl,'학력',g.education.label);
      pair(dl,'연 소득 · 게임 추정',money(g.occupation?.annualIncomeWan||0));
      if(g.occupation){const o=g.occupation;
        pair(dl,'직무 경력',`${Math.floor(o.experienceMonths/12)}년 ${o.experienceMonths%12}개월`);
        pair(dl,'근무형태',`${o.employmentType} · ${o.shift}`);
        pair(dl,'근무시간 참고',o.weeklyHours===null?'미설정':`주 ${o.weeklyHours}시간 · 직종 모형`);
        pair(dl,'근무지',familyLocationLabel(o.workplace,profiles));pair(dl,'생활 일정',o.workArrangement);pair(dl,'자격 준비',o.qualification);
      }
      pair(dl,'함께 사는 곳',familyLocationLabel(g.residence,profiles));pair(dl,'가족을 대하는 방식',g.parentingStyle+' 보호자');
      section.append(title,meta,dl);people.append(section);
    }
    body.append(people);
    const h=f.household;
    body.append(card('함께 사는 가족',[
      ['가구 구성',`${h.members}명 · 보호자 ${f.guardians.length}명 · 형제자매 ${f.siblings.length}명 · 나`],
      ['나의 출생 순서',`${f.birthOrder}번째 아이`],
      ['형제자매',f.siblings.length?f.siblings.map(s=>`${s.name} · 출생 당시 ${s.ageAtBirth}세`).join(' / '):'없음'],
      ['돌봄',h.carePlan]
    ]));
    body.append(card('첫 주거 환경',[
      ['주소',familyLocationLabel(h.housing.address,profiles)],['주거 형태',`${h.housing.tenure} · ${h.housing.homeType}`],
      [h.housing.assetKind,money(h.housingAssetWan)],['월 주거비 · 게임 설정',money(h.housing.monthlyWan)]
    ]));
    body.append(card('출생 당시 가구 경제 · 참고 기록',[
      ['보호자 연 소득 합계',money(h.annualIncomeWan)],['월 소득 기반 생활예산',money(h.incomeBudgetWan)],

      ['월 기본 지출·상환',money(h.essentialMonthlyWan)],
      ['가구 금융자산',money(h.liquidAssetsWan)],['가구 부채',money(h.debtWan)],['가구 순자산',money(h.netAssetsWan)]
    ]));
    body.append(el('p','family-note','출생 기록과 현재 지원 계정은 별도입니다. 가구 자산은 내 소지금에 합산하지 않으며, 실제 지원할 때만 가구에서 출금하고 개인 장부에 반영합니다. 조합·지원·금액의 게임 가정은 서비스 안내에서 확인할 수 있습니다.'));
  }
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{onClose();if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});});
  return{get isOpen(){return dialog.open;},open(f){opener=document.activeElement;render(f);if(!dialog.open){onOpen();dialog.showModal();}dialog.scrollTop=0;heading.focus({preventScroll:true});},close(){if(dialog.open)dialog.close();}};
}

export function renderFamilyPreview(host,f,{profiles,onOpen,document=host.ownerDocument}){
  host.replaceChildren();host.className='birth-family';
  const make=(tag,cls,value)=>{const n=document.createElement(tag);n.className=cls;n.textContent=value;return n;};
  host.append(make('h2','', '함께 시작하는 사람들'),make('p','family-summary',familySummary(f)));
  const people=make('div','family-preview-people','');
  for(const g of f.guardians){const row=make('div','family-preview-person','');row.append(make('strong','',`${g.role} · ${g.name}`),make('span','',g.occupation?`${g.occupation.name} · 추정 연 ${formatMoney(g.occupation.annualIncomeWan)}`:`${g.activity} · 근로소득 없음`));people.append(row);}
  const button=make('button','secondary family-details-button','가족 자세히 보기 ↗');button.id='birth-family-open';button.type='button';button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',()=>onOpen(f));host.append(people,button);
}
