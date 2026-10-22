import {appendLifeEvent} from './timeline-history.mjs?v=private-school-1';
import {pendingInjuryCare} from './injury-care.mjs?v=private-school-1';
// All prices/effects are fictional game settings. This module does no I/O.
export const EFFECT_LIMITS=Object.freeze({health:Object.freeze([-5,8]),learn:Object.freeze([0,8]),bond:Object.freeze([0,8]),joy:Object.freeze([-3,10]),skill:Object.freeze([0,.5])});
const KEYS=Object.keys(EFFECT_LIMITS),METRICS=KEYS.filter(k=>k!=='skill');
const finite=n=>typeof n==='number'&&Number.isFinite(n),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const money=n=>finite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER/100;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
// A 만원 amount needs four decimals to preserve an existing one-won balance.
const walletMoney=n=>Math.round((n+Number.EPSILON)*10000)/10000;
const idOk=id=>typeof id==='string'&&/^spend-\d{3}$/.test(id)&&Number(id.slice(6))>=1&&Number(id.slice(6))<=300;
const text=(s,max=100)=>typeof s==='string'&&s.trim()===s&&s.length>0&&Array.from(s).length<=max&&!/[\x00-\x1f\x7f]/.test(s);
const categoryOk=s=>typeof s==='string'&&/^[a-z][a-z-]{0,39}$/.test(s);
const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
function require(ok,message){if(!ok)throw new TypeError(message);}
function validEffects(fx){return plain(fx)&&Object.keys(fx).length===KEYS.length&&KEYS.every(k=>finite(fx[k])&&fx[k]>=EFFECT_LIMITS[k][0]&&fx[k]<=EFFECT_LIMITS[k][1]);}
function validateRow(row){
 require(plain(row)&&idOk(row.id)&&text(row.title,80)&&categoryOk(row.category),'소비 선택의 ID·제목·분류가 올바르지 않습니다.');
 require(money(row.costWan)&&Math.abs(row.costWan*10-Math.round(row.costWan*10))<1e-7,'게임 비용은 0 이상의 만원 단위 수치여야 합니다.');
 require(int(row.minAge,0,120)&&(row.costWan===0||row.minAge>=19),'유료 선택은 게임의 19세 전 보호자 지원 구간에서 사용할 수 없습니다.');
 require(int(row.cooldownMonths,1,1440)&&text(row.description,700)&&validEffects(row.effects),'소비 효과·설명·재선택 기간이 올바르지 않습니다.');
 if(Object.hasOwn(row,'asset'))require(plain(row.asset)&&['home','vehicle'].includes(row.asset.kind)&&row.asset.slot===row.category&&((row.asset.kind==='home'&&row.category==='housing-asset')||(row.asset.kind==='vehicle'&&row.category==='vehicle-asset'))&&row.costWan>0,'소유물의 종류·분류가 올바르지 않습니다.');
 if(['housing-asset','vehicle-asset'].includes(row.category))require(Object.hasOwn(row,'asset'),'주거·이동수단 구입에는 소유물 정보가 필요합니다.');
 return true;
}

/** n is the existing game amount in 만원; round to one decimal, sign once. */
export function formatMoney(n){
 if(!finite(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER/10)throw new TypeError('표시할 금액이 올바르지 않습니다.');
 const tenths=Math.round((Math.abs(n)+Number.EPSILON)*10),negative=n<0&&tenths>0?'-':'',eok=Math.floor(tenths/100000),wan=(tenths%100000)/10;
 const show=value=>value.toLocaleString('ko-KR',{minimumFractionDigits:0,maximumFractionDigits:1});
 return eok?`${negative}${show(eok)}억${wan?` ${show(wan)}만원`:'원'}`:`${negative}${show(wan)}만원`;
}

/** Keep the source catalog/save IDs intact; new actions are one-month activities. */
export function spendingActivity(row){
 validateRow(row);
 if(!row.asset)return{...row,description:row.description.replace(/가상으로\s*/gu,'').replace(/가상의?\s*/gu,'')};
 const title=row.title.replace(/\s*구입$/u,'')+' 한 달 '+(row.asset.kind==='home'?'살아보기':'이용하기');
 const costWan=round(Math.max(1,row.costWan*(row.asset.kind==='home'?.003:.01)));
 return{...row,title,costWan,description:row.asset.kind==='home'?'한 달 동안 다른 주거 공간에서 생활해본다. 이번 달 이용비와 수치 변화를 한 번 반영하며, 현재 주소나 소유 자산은 바뀌지 않는다.':'한 달 동안 이동수단을 이용해본다. 이번 달 이용비와 수치 변화를 한 번 반영하며, 소유 자산은 추가되지 않는다.'};
}

/** Fail closed on count/schema drift, duplicate choices or non-game prices. */
export function validateCatalog(catalog){
 require(plain(catalog)&&catalog.schemaVersion===1&&catalog.priceBasis==='fictional-game-setting'&&text(catalog.priceNote,500),'명시적인 게임 설정 카탈로그가 필요합니다.');
 require(catalog.moneyUnit==='만원'&&catalog.actionsPerMonth===1&&catalog.paidMinimumAge===19,'소비 비용·월별 횟수·보호자 지원 규칙이 다릅니다.');
 require(plain(catalog.effectRanges)&&KEYS.every(k=>Array.isArray(catalog.effectRanges[k])&&catalog.effectRanges[k].length===2&&catalog.effectRanges[k].every((n,i)=>n===EFFECT_LIMITS[k][i])),'표시한 효과 범위가 게임 규칙과 다릅니다.');
 require(Array.isArray(catalog.categories)&&catalog.categories.length===20&&Array.isArray(catalog.choices)&&catalog.choices.length===300,'카테고리20개·선택300개가 정확히 필요합니다.');
 const categories=new Map();
 for(const c of catalog.categories){require(plain(c)&&categoryOk(c.id)&&text(c.title,60)&&!categories.has(c.id),'소비 카테고리가 누락되거나 중복되었습니다.');categories.set(c.id,0);}
 const ids=new Set(),titles=new Set();
 for(const row of catalog.choices){validateRow(row);require(!ids.has(row.id)&&!titles.has(row.title.normalize('NFC'))&&categories.has(row.category),'소비 선택의 ID·제목이 중복되거나 카테고리가 없습니다.');ids.add(row.id);titles.add(row.title.normalize('NFC'));categories.set(row.category,categories.get(row.category)+1);}
 require([...categories.values()].every(n=>n===15),'모든 카테고리에 서로 다른 선택15개가 필요합니다.');
 require(Array.from({length:300},(_,i)=>`spend-${String(i+1).padStart(3,'0')}`).every(id=>ids.has(id)),'소비 ID는 spend-001부터 spend-300까지 빠짐없이 필요합니다.');
 return true;
}

/** Optional save namespace: old saves without spending remain valid. */
export function validSpendingState(state){try{
 if(!state||!int(state.totalMonths,0,1440))return false;
 if(!Object.hasOwn(state,'spending'))return true;
 const s=state.spending;
 if(!plain(s)||s.version!==1||!int(s.lastActionMonth,-1,state.totalMonths)||!money(s.totalSpentWan)||!plain(s.lastById)||!Array.isArray(s.ownedAssets)||s.ownedAssets.length>30||!Array.isArray(s.history)||s.history.length>100)return false;
 const last=Object.entries(s.lastById);
 if(last.length>300||!last.every(([id,month])=>idOk(id)&&int(month,0,s.lastActionMonth))||new Set(last.map(([,m])=>m)).size!==last.length)return false;
 if(s.lastActionMonth===-1)return last.length===0&&s.totalSpentWan===0&&s.ownedAssets.length===0&&s.history.length===0;
 if(!s.history.length||Math.max(...last.map(([,m])=>m))!==s.lastActionMonth||s.history.at(-1).month!==s.lastActionMonth)return false;
 let previous=-1,total=0;const latest=new Map();
 for(const h of s.history){
  if(!plain(h)||!idOk(h.id)||!text(h.title,80)||!categoryOk(h.category)||!int(h.month,0,state.totalMonths)||h.month<=previous||!money(h.costWan)||!validEffects(h.effects)||(h.costWan>0&&h.month<228))return false;
  previous=h.month;total+=h.costWan;latest.set(h.id,h.month);
 }
 if(round(total)>round(s.totalSpentWan)||[...latest].some(([id,month])=>s.lastById[id]!==month))return false;
 const owned=new Set();let assetCosts=0;
 for(const a of s.ownedAssets){
  if(!plain(a)||!idOk(a.id)||owned.has(a.id)||!text(a.title,80)||!['home','vehicle'].includes(a.kind)||a.category!==(a.kind==='home'?'housing-asset':'vehicle-asset')||a.slot!==a.category||!int(a.purchasedMonth,228,state.totalMonths)||!int(s.lastById[a.id],a.purchasedMonth,state.totalMonths)||!money(a.purchaseCostWan)||a.purchaseCostWan<=0)return false;
  owned.add(a.id);assetCosts+=a.purchaseCostWan;
 }
 return round(assetCosts)<=round(s.totalSpentWan);
}catch{return false;}}

function ready(state){return !!state&&int(state.totalMonths,0,1440)&&state.age===Math.floor(state.totalMonths/12)&&state.month===state.totalMonths%12&&['running','decision','ended'].includes(state.phase)&&money(state.cash)&&money(state.debt)&&METRICS.every(k=>finite(state[k])&&state[k]>=0&&state[k]<=100)&&finite(state.skill)&&state.skill>=0&&Array.isArray(state.timeline)&&state.timeline.length<=120&&int(state.logSerial,state.timeline.length,Number.MAX_SAFE_INTEGER)&&plain(state.ledger)&&money(state.ledger.expenses)&&validSpendingState(state);}
const blank=()=>({version:1,lastActionMonth:-1,lastById:{},totalSpentWan:0,ownedAssets:[],history:[]});

/** No mutation. Availability reasons are user-facing Korean strings. */
export function spendingStatus(state,row){
 const activity=spendingActivity(row);
 const reasons=[],current=int(state?.totalMonths,0,1440)?state.totalMonths:0,s=state?.spending||blank();
 if(!ready(state))return{eligible:false,reasons:['저장한 생활 기록을 확인해주세요.'],remainingMonths:0,costWan:activity.costWan,cashAvailable:money(state?.cash)?state.cash:0};
 if(pendingInjuryCare(state))reasons.push('부상 대응을 먼저 선택해 주세요.');
 if(state.phase!=='running')reasons.push(state.phase==='ended'?'마친 삶에서는 소비할 수 없습니다.':'기다리는 갈림길을 먼저 결정해주세요.');
 if(state.age<row.minAge)reasons.push(`${row.minAge}세부터 선택할 수 있습니다.`);
 if(row.costWan>0&&state.age<19)reasons.push('19세 전 보호자 지원 예산은 유료 소비에 사용할 수 없습니다.');
 if(state.cash<activity.costWan)reasons.push('보유 현금이 부족합니다. 이 선택은 자동으로 빚을 내지 않습니다.');
 const last=Object.hasOwn(s.lastById,row.id)?s.lastById[row.id]:null,remaining=Math.max(0,last===null?0:last+row.cooldownMonths-current),monthly=s.lastActionMonth===current;
 if(monthly)reasons.push('이번 달에는 이미 생활 선택을 사용했습니다. 다음 달에 다시 선택해주세요.');
 if(remaining>0)reasons.push(`이 선택은 ${remaining}개월 뒤에 다시 할 수 있습니다.`);
 return{eligible:reasons.length===0,reasons,remainingMonths:Math.max(remaining,monthly?1:0),costWan:activity.costWan,cashAvailable:state.cash};
}

function sameRow(a,b){return ['id','title','category','costWan','minAge','cooldownMonths','description'].every(k=>a[k]===b[k])&&KEYS.every(k=>a.effects[k]===b.effects[k])&&Boolean(a.asset)===Boolean(b.asset)&&(!a.asset||(a.asset.kind===b.asset.kind&&a.asset.slot===b.asset.slot));}

/** Clone, charge existing cash only, record one action; never advance the clock. */
export function spend(original,row,catalog){
 validateRow(row);
 if(catalog!==undefined){validateCatalog(catalog);const approved=catalog.choices.find(r=>r.id===row.id);require(approved&&sameRow(row,approved),'승인한 카탈로그와 다른 소비 선택입니다.');}
 const status=spendingStatus(original,row);
 if(!status.eligible)throw new Error(status.reasons.join(' '));
 const activity=spendingActivity(row),next=structuredClone(original),s=next.spending?next.spending:blank(),effects={};
 next.spending=s;
 next.cash=walletMoney(next.cash-activity.costWan);
 if(next.cash<0)throw new Error('보유 현금 범위 안에서만 선택할 수 있습니다.');
 next.ledger.expenses=walletMoney(next.ledger.expenses+activity.costWan);
 for(const key of KEYS){const before=next[key];next[key]=key==='skill'?Math.max(before,Math.min(100,before+row.effects[key])):Math.max(0,Math.min(100,before+row.effects[key]));effects[key]=round(next[key]-before);}
 s.lastActionMonth=next.totalMonths;s.lastById[row.id]=next.totalMonths;s.totalSpentWan=round(s.totalSpentWan+activity.costWan);
 const history={id:row.id,title:activity.title,category:row.category,month:next.totalMonths,costWan:activity.costWan,effects};
 s.history.push(history);if(s.history.length>100)s.history.splice(0,s.history.length-100);
 const labels={health:'건강',learn:'배움',bond:'관계',joy:'만족',skill:'숙련'},changes=[`현금 지출 ${formatMoney(activity.costWan)}`,...KEYS.filter(k=>effects[k]!==0).map(k=>`${labels[k]} ${effects[k]>0?'+':''}${effects[k]}`)];
 appendLifeEvent(next,{id:`spending-${next.totalMonths}-${next.logSerial}`,age:next.age,month:next.month,type:'spending',title:activity.title,text:activity.description,changes});next.logSerial++;
 require(validSpendingState(next),'소비 기록의 저장 정합성을 확인할 수 없습니다.');
 return next;
}
