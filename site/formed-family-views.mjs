import {formedFamilySummary} from './formed-family.mjs?v=family-life-2';
import {formatMoney} from './spending.mjs?v=family-life-2';
import {appendUiFacts} from './ui-copy.mjs?v=family-life-2';

export const RELATIONSHIP_LABELS=Object.freeze({single:'아직 교제 중인 사람이 없음',dating:'교제 중',married:'결혼하여 함께 생활 중',separated:'관계를 정리함'});
export const PARENTING_LABELS=Object.freeze({balanced:'균형 있게 돌보기',learning:'배움 함께하기',active:'함께 몸 움직이기',connection:'대화와 관계 돌보기'});
const STAGES=Object.freeze({infant:'영아기',toddler:'유아기',preschool:'미취학',primary:'초등학교',elementary:'초등학교',middle:'중학교',high:'고등학교',adult:'성인'});
const WORK=Object.freeze({employed:'근로 중',working:'근로 중',unemployed:'일 준비 중',retired:'은퇴'});
const amount=value=>Number.isFinite(value)?formatMoney(value):'확인 전';
const age=person=>`${Number.isInteger(person?.age)?person.age:0}세 ${Number.isInteger(person?.month)?person.month:0}개월`;
const score=value=>Number.isFinite(value)?`${Math.round(value)}/100`:'확인 전';
function place(value){if(!value)return'미기록';if(typeof value==='string')return value;return[value.region,value.name].filter((text,index,list)=>text&&list.indexOf(text)===index).join(' ')||'미기록';}

/** The same read-only cards serve family information and the family action dialog. */
export function renderFormedFamilySummary(state,{document=globalThis.document,summary=state?formedFamilySummary(state):null,onChild}={}){
 const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
 const root=el('section',undefined,'formed-family-summary');root.append(el('h3','내가 이룬 가족'));
 const facts=(host,pairs)=>appendUiFacts(document,host,pairs,'formed-family-facts');
 if(!summary){root.append(el('p','아직 새로 이룬 가족 기록이 없습니다.'));return root;}
 facts(root,[['현재 관계',RELATIONSHIP_LABELS[summary.relationshipStatus]||'관계 기록 확인 중'],['자녀',`${summary.children?.length||0}명`]]);
 const spouse=summary.spouse;
 if(spouse){
  const person=el('section',undefined,'formed-family-card formed-spouse-card');person.append(el('h4',summary.married?'배우자':summary.relationshipStatus==='separated'?'이전 인연 기록':'교제하는 사람'));
  facts(person,[['이름',spouse.name],['나이',age(spouse)],['고향',place(spouse.hometown)],['학력',spouse.education?.label||'미기록'],['직업',spouse.occupation?.name||'근로 직업 없음'],['현재 상태',WORK[spouse.status]||spouse.status||'미기록'],['연 근로소득',amount(spouse.annualIncomeWan)]]);root.append(person);
 }
 const budget=summary.budget;
 if(budget&&state?.phase!=='ended'){const section=el('section',undefined,'formed-family-card formed-budget-card');section.append(el('h4','다음 달 양육비 예상'));facts(section,[['배우자 양육비 분담',amount(budget.spouseContributionWan)],['전체 자녀 양육비',amount(budget.totalChildCostWan)],['내 양육비 부담',amount(budget.personalShareWan)]]);root.append(section);}
 const plan=summary.plan;
 if(plan){const section=el('section',undefined,'formed-family-card formed-plan-card');section.append(el('h4',plan.kind==='adopt'?'입양 준비 중':'출생 준비 중'));facts(section,[['남은 준비 기간',`${plan.remainingMonths}개월`],['현재 계획',plan.kind==='adopt'?'입양':'출생'],['계획 변경',plan.cancellable?'취소 가능':'현재 취소 불가']]);root.append(section);}
 const children=el('section',undefined,'formed-children');children.append(el('h4','함께 자라는 아이들'));
 if(!summary.children?.length)children.append(el('p','아직 양육 중인 자녀가 없습니다.'));
 for(const child of summary.children||[]){
  const card=el('article',undefined,'formed-family-card formed-child-card');card.dataset.childId=child.id;card.append(el('h5',child.name));
  facts(card,[['나이',age(child)],['교육 단계',STAGES[child.educationStage]||child.educationStage||'교육 준비'],['건강',score(child.health)],['배움',score(child.learn)],['관계',score(child.bond)],['양육 방식',child.parentingStyleLabel||PARENTING_LABELS[child.parentingStyle]||child.parentingStyle||'균형 있게 돌보기']]);
  onChild?.(child,card);children.append(card);
 }root.append(children);
 const events=summary.events||[];
 if(events.length){const details=el('details',undefined,'formed-family-history');details.append(el('summary',`가족 이력 ${events.length}개`));const list=el('ol');
  for(const event of [...events].reverse()){const item=el('li');item.append(el('strong',event.title||event.label||'가족의 변화'));if(Number.isInteger(event.atMonth))item.append(el('span',`내 나이 ${Math.floor(event.atMonth/12)}세 ${event.atMonth%12}개월`));if(typeof event.text==='string'&&event.text)item.append(el('p',event.text));if(event.changes?.length){const changes=el('ul');for(const change of event.changes)if(typeof change==='string'&&change)changes.append(el('li',change));item.append(changes);}list.append(item);}details.append(list);root.append(details);
 }
 return root;
}

/** These amounts are next-month child-care estimates, not personal living support. */
export function renderFormedFamilyFinance(host,state,{document=host.ownerDocument||globalThis.document,summary=state?formedFamilySummary(state):null}={}){
 host.replaceChildren();host.hidden=state?.phase==='ended'||!summary||(!summary.married&&!summary.children?.length);if(host.hidden)return;
 const title=document.createElement('h3');title.textContent='다음 달 양육비 예상';host.append(title);
 const budget=summary.budget||{};
 appendUiFacts(document,host,[['전체 자녀 양육비',amount(budget.totalChildCostWan)],['배우자 양육비 분담',amount(budget.spouseContributionWan)],['내 양육비 부담',amount(budget.personalShareWan)]],'formed-family-facts');
}
