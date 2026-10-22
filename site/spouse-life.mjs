import {mortalitySnapshot,validMortality,annualDeathProbability} from './mortality.mjs?v=focused-play-2';

const clone=x=>structuredClone(x),q=n=>Math.round((n+Number.EPSILON)*10000)/10000;
export const SPOUSE_LIFE_RULES=Object.freeze({version:'spouse-life-v1',kind:'game_assumption',maximumAgeMonths:1440,monthlyOwnLivingWan:75,monthlyOwnHousingWan:40,discretionaryFraction:.6,annualDebtInterest:.035,funeralCostWan:1000,inheritance:'equal-married-player-and-children',unpaidEstateDebtTransfers:false});
const modelSeed=seed=>`${seed}|formed-spouse-mortality`;
function roll(seed,serial,model,month){let h=2166136261;for(const c of `spouse-mortality|${seed}|${serial}|${model}|${month}`)h=Math.imul(h^c.charCodeAt(0),16777619);h+=0x6D2B79F5;let n=Math.imul(h^h>>>15,1|h);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;}
export function validSpouseLifeHeader(life,seed,totalMonths){return!!life&&life.version===SPOUSE_LIFE_RULES.version&&Number.isInteger(life.activatedAtMonth)&&life.activatedAtMonth>=0&&life.activatedAtMonth<=totalMonths&&JSON.stringify(life.rules)===JSON.stringify(SPOUSE_LIFE_RULES)&&validMortality(life.mortality,modelSeed(seed),150)&&life.mortality.lastAgeChecked===-1&&Array.isArray(life.accounts)&&life.accounts.length<=1801&&Array.isArray(life.estates)&&life.estates.length<=life.accounts.length;}
export function newSpouseLife(seed,atMonth,table){return{version:SPOUSE_LIFE_RULES.version,activatedAtMonth:atMonth,rules:clone(SPOUSE_LIFE_RULES),mortality:mortalitySnapshot(table,modelSeed(seed)),accounts:[],estates:[],childTrusts:{}};}
export function startSpouseAccount(f,atMonth){
 const life=f.spouseLife,p=f.spouse;if(!life||!p||!['dating','married'].includes(f.relationshipStatus))return;
 if(!life.accounts.some(a=>a.partnerSerial===p.snapshot.serial))life.accounts.push({partnerSerial:p.snapshot.serial,name:p.name,openedAtMonth:atMonth,lastProcessedMonth:atMonth,assetsWan:0,debtWan:0,totals:{incomeWan:0,ownCostsWan:0,discretionaryWan:0,childContributionWan:0,interestWan:0},lastMonth:null,death:null});
 exposeSpouseAccount(f);
}
export function exposeSpouseAccount(f){const a=f.spouseLife?.accounts.find(a=>a.partnerSerial===f.spouse?.snapshot.serial);if(!a)return;f.spouse.personalAssetsWan=a.assetsWan;f.spouse.personalDebtWan=a.debtWan;if(a.death){f.spouse.status='deceased';f.spouse.annualIncomeWan=0;f.spouse.ageMonths=a.death.ageMonths;f.spouse.death=clone(a.death);}}
export function spouseDeathCheck(f,seed,atMonth){
 const p=f.spouse,l=f.spouseLife,a=l?.accounts.find(a=>a.partnerSerial===p?.snapshot.serial);if(!p||!a||a.death||!['dating','married'].includes(f.relationshipStatus))return null;
 // A fixed decimal model avoids final-bit log1p/expm1 differences between JS
 // runtimes. The source annual probability, draw, clock and money remain exact.
 const annualQx=annualDeathProbability(l.mortality,Math.floor(p.ageMonths/12)),monthlyQx=annualQx===1?1:Number((-Math.expm1(Math.log1p(-annualQx)/12)).toFixed(12)),cap=p.ageMonths>=l.rules.maximumAgeMonths;
 return{atMonth,ageMonths:p.ageMonths,annualQx,monthlyQx,dies:cap||roll(seed,a.partnerSerial,l.mortality.modelVersion,atMonth)<monthlyQx,cause:cap?'age-cap':'age-mortality'};
}
function split(total,ids){const units=Math.round(total*10000),each=Math.floor(units/ids.length);return Object.fromEntries(ids.map((id,i)=>[id,(each+(i===ids.length-1?units-each*ids.length:0))/10000]));}
export function settleSpouseDeath(f,check,cashAvailableWan){
 if(!check?.dies)return null;const life=f.spouseLife,p=f.spouse,a=life.accounts.find(a=>a.partnerSerial===p.snapshot.serial);if(a.death)return null;
 const married=f.relationshipStatus==='married',openingAssetsWan=a.assetsWan,openingDebtWan=a.debtWan,funeralCostWan=life.rules.funeralCostWan,estateFuneralWan=Math.min(openingAssetsWan,funeralCostWan),remaining=q(openingAssetsWan-estateFuneralWan),debtPaidWan=Math.min(remaining,openingDebtWan),netEstateWan=q(remaining-debtPaidWan),heirs=[...(married?['player']:[]),...f.children.map(c=>c.id)],distribution=heirs.length?split(netEstateWan,heirs):{},personalFuneralWan=married?q(funeralCostWan-estateFuneralWan):0,personalInheritanceWan=distribution.player||0;
 const record={atMonth:check.atMonth,partnerSerial:a.partnerSerial,partnerName:a.name,marriedAtDeath:married,openingAssetsWan,openingDebtWan,funeralCostWan,estateFuneralWan,unpaidFuneralWan:married?0:q(funeralCostWan-estateFuneralWan),personalFuneralWan,borrowedFuneralWan:q(Math.max(0,personalFuneralWan-cashAvailableWan)),debtPaidWan,unpaidEstateDebtWan:q(openingDebtWan-debtPaidWan),netEstateWan,distribution,unclaimedEstateWan:heirs.length?0:netEstateWan,personalInheritanceWan,childInheritanceWan:q(Object.entries(distribution).reduce((n,[id,v])=>n+(id==='player'?0:v),0))};
 a.death=clone(check);a.lastProcessedMonth=check.atMonth;a.assetsWan=0;a.debtWan=0;life.estates.push(record);for(const child of f.children)life.childTrusts[child.id]=q((life.childTrusts[child.id]||0)+(distribution[child.id]||0));f.relationshipStatus=married?'widowed':'bereaved';exposeSpouseAccount(f);return record;
}
export function accrueSpouseMonth(f,atMonth,childContributionWan){
 const life=f.spouseLife,p=f.spouse,a=life?.accounts.find(a=>a.partnerSerial===p?.snapshot.serial);if(!a||a.death||!['dating','married'].includes(f.relationshipStatus))return null;
 const incomeWan=q(p.annualIncomeWan/12),ownCostsWan=q(life.rules.monthlyOwnLivingWan+life.rules.monthlyOwnHousingWan),discretionaryWan=q(Math.max(0,incomeWan-ownCostsWan)*life.rules.discretionaryFraction),interestWan=q(a.debtWan*life.rules.annualDebtInterest/12),openingAssetsWan=a.assetsWan,openingDebtWan=a.debtWan,surplus=q(incomeWan-ownCostsWan-discretionaryWan-childContributionWan-interestWan);let debtPaidWan=0;
 if(surplus>=0){debtPaidWan=Math.min(a.debtWan,surplus);a.debtWan=q(a.debtWan-debtPaidWan);a.assetsWan=q(a.assetsWan+surplus-debtPaidWan);}else{const expense=-surplus,paid=Math.min(a.assetsWan,expense);a.assetsWan=q(a.assetsWan-paid);a.debtWan=q(a.debtWan+expense-paid);}
 a.lastProcessedMonth=atMonth;a.lastMonth={atMonth,openingAssetsWan,openingDebtWan,incomeWan,ownCostsWan,discretionaryWan,childContributionWan,interestWan,debtPaidWan,closingAssetsWan:a.assetsWan,closingDebtWan:a.debtWan};for(const key of Object.keys(a.totals))a.totals[key]=q(a.totals[key]+a.lastMonth[key]);exposeSpouseAccount(f);return a.lastMonth;
}
export function spouseEstateSummary(f){const l=f?.spouseLife;if(!l)return null;return{activatedAtMonth:l.activatedAtMonth,funeralCostWan:l.rules.funeralCostWan,records:clone(l.estates),accounts:clone(l.accounts),childTrusts:clone(l.childTrusts),personalInheritanceWan:q(l.estates.reduce((n,e)=>n+e.personalInheritanceWan,0)),personalFuneralWan:q(l.estates.reduce((n,e)=>n+e.personalFuneralWan,0)),unpaidEstateDebtWan:q(l.estates.reduce((n,e)=>n+e.unpaidEstateDebtWan,0))};}
