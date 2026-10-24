import {PARENTING_MODES} from './formed-family.mjs?v=birth-speed-20261024';
import {pendingInjuryCare} from './injury-care.mjs?v=birth-speed-20261024';
import {formatMoney} from './spending.mjs?v=birth-speed-20261024';

// An overlay on the immutable spouse-estate grant ledger. Player cash is separate.
export const CHILD_INHERITANCE_RULES=Object.freeze({schemaVersion:1,adultAgeMonths:228,educationCostWan:PARENTING_MODES.learning.extraWan,educationLearnGain:PARENTING_MODES.learning.learn});
const clone=value=>structuredClone(value),q=value=>Math.round((value+Number.EPSILON)*10000)/10000;
const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const keys=(value,expected)=>!!value&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));
const children=s=>s?.formedFamily?.children||[];
const childAgeAt=(s,child,atMonth)=>child.ageMonths-(s.totalMonths-atMonth);
function grantsAt(s,childId,atMonth){return q((s.formedFamily?.spouseLife?.estates||[]).filter(entry=>entry.atMonth<=atMonth).reduce((sum,entry)=>sum+(entry.distribution?.[childId]||0),0));}
function account(s,childId,entries=s.childInheritance?.entries||[],atMonth=s.totalMonths){
 const rows=entries.filter(entry=>entry.childId===childId&&entry.atMonth<=atMonth),educationPaidWan=q(rows.filter(entry=>entry.type==='education').reduce((sum,entry)=>sum+entry.amountWan,0)),handedOverWan=q(rows.filter(entry=>entry.type==='handover').reduce((sum,entry)=>sum+entry.amountWan,0)),grantedWan=grantsAt(s,childId,atMonth);
 return{childId,grantedWan,availableWan:q(grantedWan-educationPaidWan-handedOverWan),educationPaidWan,handedOverWan,adultAccountWan:handedOverWan,learnBonus:q(rows.reduce((sum,entry)=>sum+entry.learnGain,0))};
}
function event(s,child,type,value){return{type:'child-inheritance',atMonth:s.totalMonths,title:type==='education'?`${child.name}님의 추가 교육비를 보관금에서 지원했다`:`${child.name}님의 상속 보관금을 성년 자녀계정으로 인계했다`,text:'',changes:type==='education'?[`추가 교육비 ${formatMoney(value)}`,`자녀 배움 +${CHILD_INHERITANCE_RULES.educationLearnGain}`,'내 소지금 변동 없음']:[`자녀계정 인계 ${formatMoney(value)}`,'내 소지금 변동 없음']};}
export function createChildInheritance(s){
 if(!month(s?.totalMonths))throw new TypeError('자녀 상속 보관금의 관리 시점을 확인해 주세요.');
 return{schemaVersion:1,activatedAtMonth:s.totalMonths,lastProcessedMonth:s.totalMonths,entries:[]};
}
export function enableChildInheritance(s){
 if(s.phase==='ended')return{childInheritance:s.childInheritance?clone(s.childInheritance):undefined,events:[]};
 const childInheritance=s.childInheritance?clone(s.childInheritance):createChildInheritance(s);
 return progressChildInheritance({...s,childInheritance});
}
/** Call after family/grant progression with the already advanced current clock. */
export function progressChildInheritance(s){
 if(s.childInheritance===undefined)return null;
 if(!validChildInheritance(s))throw new TypeError('자녀 상속 보관금의 사용 기록을 확인해 주세요.');
 const next=clone(s.childInheritance),events=[];
 next.lastProcessedMonth=s.totalMonths;
 for(const child of children(s)){
  const balance=account(s,child.id,next.entries);
  if(child.ageMonths<CHILD_INHERITANCE_RULES.adultAgeMonths||balance.availableWan<=0)continue;
  next.entries.push({type:'handover',childId:child.id,atMonth:s.totalMonths,amountWan:balance.availableWan,learnGain:0});
  events.push(event(s,child,'handover',balance.availableWan));
 }
 return{childInheritance:next,events};
}
export function childInheritanceAssessment(s,childId){
 const child=children(s).find(value=>value.id===childId),reasons=[],valid=validChildInheritance(s),balance=child?account(s,childId):null;
 if(!s?.childInheritance||!valid)reasons.push('자녀 상속 보관금 관리를 먼저 준비해 주세요.');
 if(s?.phase!=='running'||pendingInjuryCare(s))reasons.push('현재 갈림길과 부상 대응을 먼저 마쳐 주세요.');
 if(!child)reasons.push('현재 가족의 자녀를 선택해 주세요.');
 else{
  if(child.ageMonths>=CHILD_INHERITANCE_RULES.adultAgeMonths)reasons.push('19세부터는 자녀계정으로 인계한 기록을 확인할 수 있습니다.');
  if((balance?.availableWan||0)<CHILD_INHERITANCE_RULES.educationCostWan)reasons.push('자녀 명의 상속 보관금이 20만원 이상 필요합니다.');
  if(Math.min(100,child.learn+(balance?.learnBonus||0))>=100)reasons.push('자녀 배움이 이미 상한에 도달했습니다.');
  if(s.childInheritance?.entries.some(entry=>entry.type==='education'&&entry.childId===childId&&entry.atMonth===s.totalMonths))reasons.push('이 자녀의 이번 달 추가 교육비를 이미 지원했습니다.');
 }
 return{eligible:reasons.length===0,reasons,childId,costWan:CHILD_INHERITANCE_RULES.educationCostWan,learnGain:CHILD_INHERITANCE_RULES.educationLearnGain,account:balance};
}
export function childInheritanceAction(s,childId){
 const assessment=childInheritanceAssessment(s,childId);if(!assessment.eligible)throw new Error(assessment.reasons.join(' '));
 const child=children(s).find(value=>value.id===childId),next=clone(s.childInheritance);
 next.entries.push({type:'education',childId,atMonth:s.totalMonths,amountWan:assessment.costWan,learnGain:assessment.learnGain});
 return{childInheritance:next,events:[event(s,child,'education',assessment.costWan)]};
}
export function childInheritanceSummary(s){
 if(s?.childInheritance!==undefined&&!validChildInheritance(s))return null;
 const rows=children(s).map(child=>({...account(s,child.id),name:child.name,ageMonths:child.ageMonths}));
 return{active:!!s?.childInheritance,children:rows,totals:{grantedWan:q(rows.reduce((sum,row)=>sum+row.grantedWan,0)),availableWan:q(rows.reduce((sum,row)=>sum+row.availableWan,0)),educationPaidWan:q(rows.reduce((sum,row)=>sum+row.educationPaidWan,0)),handedOverWan:q(rows.reduce((sum,row)=>sum+row.handedOverWan,0))}};
}
/** Shared family views gain effective child scores without changing replay state. */
export function withChildInheritanceSummary(s,summary){
 if(!summary)return summary;
 const next=clone(summary),inheritance=childInheritanceSummary(s);if(!inheritance?.active)return next;
 for(const child of next.children||[]){const balance=inheritance.children.find(row=>row.childId===child.id),base=children(s).find(row=>row.id===child.id);if(!balance||!base)continue;child.inheritance=clone(balance);child.learn=Math.min(100,q(base.learn+balance.learnBonus));}
 if(next.estate){next.estate.childTrustGrantLedger=clone(next.estate.childTrusts);next.estate.childTrusts=Object.fromEntries(inheritance.children.map(row=>[row.childId,row.availableWan]));}
 next.childInheritance=inheritance;return next;
}
export function validChildInheritance(s){
 const value=s?.childInheritance;if(value===undefined)return true;
 if(!keys(value,['schemaVersion','activatedAtMonth','lastProcessedMonth','entries'])||value.schemaVersion!==1||!month(value.activatedAtMonth)||value.activatedAtMonth>s.totalMonths||!month(value.lastProcessedMonth)||value.lastProcessedMonth<value.activatedAtMonth||value.lastProcessedMonth>s.totalMonths||!Array.isArray(value.entries)||value.entries.length>2048)return false;
 if(s.formedFamily&&!Array.isArray(s.formedFamily.children)||children(s).some(child=>!/^child-[123]$/.test(child?.id)||!month(child.joinedAtMonth)||!month(child.ageMonths)||!amount(child.learn))||!Array.isArray(s.formedFamily?.spouseLife?.estates||[]))return false;
 const used={},educated=new Set();let previousMonth=value.activatedAtMonth;
 for(const entry of value.entries){
  if(!keys(entry,['type','childId','atMonth','amountWan','learnGain'])||!['education','handover'].includes(entry.type)||!/^child-[123]$/.test(entry.childId)||!month(entry.atMonth)||entry.atMonth<value.activatedAtMonth||entry.atMonth<previousMonth||entry.atMonth>s.totalMonths||!amount(entry.amountWan)||entry.amountWan<=0||!amount(entry.learnGain))return false;
  const child=children(s).find(row=>row.id===entry.childId);if(!child||entry.atMonth<child.joinedAtMonth)return false;
  const age=childAgeAt(s,child,entry.atMonth),grants=grantsAt(s,entry.childId,entry.atMonth),already=used[entry.childId]||0,balance=q(grants-already);
  if(age<0||balance+1e-8<entry.amountWan)return false;
  if(entry.type==='education'){
   const key=`${entry.childId}|${entry.atMonth}`;if(age>=CHILD_INHERITANCE_RULES.adultAgeMonths||entry.amountWan!==CHILD_INHERITANCE_RULES.educationCostWan||entry.learnGain!==CHILD_INHERITANCE_RULES.educationLearnGain||educated.has(key))return false;educated.add(key);
  }else if(age<CHILD_INHERITANCE_RULES.adultAgeMonths||entry.learnGain!==0||Math.abs(entry.amountWan-balance)>1e-8)return false;
  used[entry.childId]=q(already+entry.amountWan);previousMonth=entry.atMonth;
 }
 // The source's cumulative trust grants remain untouched and must agree with estates.
 const trusts=s.formedFamily?.spouseLife?.childTrusts||{};
 for(const [id,total]of Object.entries(trusts))if(!children(s).some(child=>child.id===id)||!amount(total)||Math.abs(grantsAt(s,id,s.totalMonths)-total)>1e-8)return false;
 for(const child of children(s))if(!amount(grantsAt(s,child.id,s.totalMonths))||Math.abs(grantsAt(s,child.id,s.totalMonths)-(trusts[child.id]||0))>1e-8)return false;
 return true;
}
