import {regionTier} from './living-costs.mjs?v=home-20261024';

// Game assumptions for renting on jeonse and owning a home. Not market statistics.
export const HOME_RULES=Object.freeze({
 version:'home-v1',
 kind:'game_assumption',
 reviewedAt:'2026-10-24',
 basePriceWan:Object.freeze({local:Object.freeze({small:20000,large:35000}),capital:Object.freeze({small:40000,large:70000}),seoul:Object.freeze({small:70000,large:120000})}),
 jeonseRatio:.6,
 minDownPaymentRate:.3,
 purchaseCostRate:.01,
 saleCostRate:.005,
 mortgageAnnualRate:.04,
 mortgageTermMonths:360,
 maintenanceMonthlyWan:Object.freeze({small:15,large:25}),
 propertyTaxAnnualRate:.0015,
 largeJoyPerMonth:.05,
 offerAges:Object.freeze([35,45]),
 note:'집값(지방 작은 집 2억~서울 넓은 집 12억), 전세 보증금 60%, 계약금 최소 30%·취득 비용 1%·매도 비용 0.5%, 주택담보대출 연 4%·30년, 관리비·보유세, 넓은 집의 만족 효과는 게임 가정입니다. 실제 시세·대출 조건이 아닙니다.',
});
const SIZES=['small','large'],TENURES=['jeonse','owned'];
const SIZE_LABEL={small:'작은 집',large:'넓은 집'},TENURE_LABEL={jeonse:'전세',owned:'자가'};
const q=n=>Math.round(n*10000)/10000;
const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;
const money=value=>Number.isFinite(value)&&value>=0;
const plain=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const HOME_KEYS=['version','activatedAtMonth','updatedAtMonth','offeredAtMonth','current'];
const CURRENT_KEYS=['tenure','region','size','priceWan','startedMonth','priceIndexAtStart','mortgage'];
const MORTGAGE_KEYS=['principalWan','balanceWan','monthlyPaymentWan','annualRate','termMonths','startedMonth'];

export function activateHome(s){return{version:1,activatedAtMonth:s.totalMonths,updatedAtMonth:s.totalMonths,offeredAtMonth:null,current:null};}

/** Absence keeps every existing save without homes. */
export function validHome(s){try{
 const h=s?.home;if(h===undefined)return true;
 if(!plain(h,HOME_KEYS)||h.version!==1||!month(s.totalMonths)||!month(h.activatedAtMonth)||!month(h.updatedAtMonth)||h.activatedAtMonth>h.updatedAtMonth||h.updatedAtMonth>s.totalMonths)return false;
 if(h.offeredAtMonth!==null&&(!month(h.offeredAtMonth)||h.offeredAtMonth>s.totalMonths))return false;
 const c=h.current;if(c===null)return true;
 if(!plain(c,CURRENT_KEYS)||!TENURES.includes(c.tenure)||!SIZES.includes(c.size)||typeof c.region!=='string'||!c.region||!money(c.priceWan)||c.priceWan<=0||!month(c.startedMonth)||c.startedMonth>s.totalMonths||!(c.priceIndexAtStart>0))return false;
 const m=c.mortgage;if(m===null)return true;
 return c.tenure==='owned'&&plain(m,MORTGAGE_KEYS)&&money(m.principalWan)&&money(m.balanceWan)&&m.balanceWan<=m.principalWan+1e-6&&money(m.monthlyPaymentWan)&&m.annualRate>=0&&Number.isInteger(m.termMonths)&&m.termMonths>0&&month(m.startedMonth);
}catch{return false;}}

export function propertyIndex(s){const value=s?.market?.prices?.property;return Number.isFinite(value)&&value>0?value:1;}
export function homePriceWan(s,region,size){return q(HOME_RULES.basePriceWan[regionTier(region).id][size]*propertyIndex(s));}

/** Equal monthly payment of principal and interest. */
export function mortgagePaymentWan(principalWan,annualRate,termMonths){
 if(!(principalWan>0))return 0;const r=annualRate/12;return q(r===0?principalWan/termMonths:principalWan*r/(1-(1+r)**-termMonths));
}

/** Choices in the current region: jeonse small, jeonse large, owned small, owned large. */
export function homeOptions(s){
 const region=s?.residence?.region,cash=s?.cash||0,rows=[];
 for(const tenure of TENURES)for(const size of SIZES){
  const price=homePriceWan(s,region,size);
  if(tenure==='jeonse'){const deposit=q(price*HOME_RULES.jeonseRatio);rows.push({tenure,size,priceWan:deposit,cashNeededWan:deposit,maxLoanWan:0,minLoanWan:0,affordable:cash+1e-9>=deposit});}
  else{const maxLoan=q(price*(1-HOME_RULES.minDownPaymentRate)),cost=q(price*HOME_RULES.purchaseCostRate),need=q(price-maxLoan+cost);rows.push({tenure,size,priceWan:price,cashNeededWan:need,maxLoanWan:maxLoan,minLoanWan:0,affordable:cash+1e-9>=need});}
 }
 return rows;
}

/** What the player can pick: each jeonse, and each purchase both without a loan and with the 70% loan. */
export function homePurchaseChoices(s){
 const cash=s?.cash||0,rows=[];
 for(const row of homeOptions(s)){
  const name=`${row.tenure==='jeonse'?'전세':'구매'} · ${SIZE_LABEL[row.size]}`;
  if(row.tenure==='jeonse'){rows.push({tenure:row.tenure,size:row.size,loanWan:0,label:name,priceWan:row.priceWan,cashNeededWan:row.cashNeededWan,monthlyPaymentWan:0,affordable:row.affordable});continue;}
  const outright=q(row.priceWan*(1+HOME_RULES.purchaseCostRate));
  rows.push({tenure:row.tenure,size:row.size,loanWan:0,label:`${name} · 대출 없이`,priceWan:row.priceWan,cashNeededWan:outright,monthlyPaymentWan:0,affordable:cash+1e-9>=outright});
  rows.push({tenure:row.tenure,size:row.size,loanWan:row.maxLoanWan,label:`${name} · 대출 70%`,priceWan:row.priceWan,cashNeededWan:row.cashNeededWan,monthlyPaymentWan:mortgagePaymentWan(row.maxLoanWan,HOME_RULES.mortgageAnnualRate,HOME_RULES.mortgageTermMonths),affordable:row.affordable});
 }
 return rows;
}

/** Owned value follows the property index since purchase; a jeonse deposit is returned in full. */
export function homeValueWan(s){
 const c=s?.home?.current;if(!c)return 0;
 return c.tenure==='jeonse'?c.priceWan:q(c.priceWan*propertyIndex(s)/c.priceIndexAtStart);
}
export function mortgageBalanceWan(s){return s?.home?.current?.mortgage?.balanceWan||0;}
/** Home value minus the mortgage; 0 without a home. */
export function homeEquityWan(s){return q(homeValueWan(s)-mortgageBalanceWan(s));}
/** Personal debt plus the mortgage, as shown in the money overview. */
export function totalDebtWan(s){return q((s?.debt||0)+mortgageBalanceWan(s));}

/** Maintenance (and property tax when owned) per month; replaces rent while in a home. */
export function homeMonthlyHousingWan(s){
 const c=s?.home?.current;if(!c)return 0;
 const maintenance=HOME_RULES.maintenanceMonthlyWan[c.size]*regionTier(c.region).factor;
 return q(maintenance+(c.tenure==='owned'?homeValueWan(s)*HOME_RULES.propertyTaxAnnualRate/12:0));
}

/** Asked once at 35-45 when the cheapest jeonse in the current region is affordable. */
export function homeOfferPending(s){
 const h=s?.home,[from,to]=HOME_RULES.offerAges;
 if(!h||h.current||h.offeredAtMonth!==null||s.phase!=='running'||s.service?.active||!(s.age>=from&&s.age<=to))return false;
 return homeOptions(s)[0].affordable;
}

/** One-line notice for move screens while a home is held, or null. */
export function homeMoveNotice(s){const c=s?.home?.current;return c?(c.tenure==='owned'?'지금 사는 집을 팔고 이사합니다.':'전세 보증금을 돌려받고 이사합니다.'):null;}

export function homeLabel(current){return current?`${current.region} ${SIZE_LABEL[current.size]} · ${TENURE_LABEL[current.tenure]}`:'';}
