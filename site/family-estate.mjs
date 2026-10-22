import {mortalitySnapshot,validMortality,annualDeathProbability} from './mortality.mjs?v=life-improvements-1';

const VERSION='family-estate-1',clone=x=>structuredClone(x),round=n=>Math.round((n+Number.EPSILON)*10000)/10000;
const nn=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const moneyKeys=['liquidWan','propertyWan','debtWan','personalCashWan'];
const units=n=>Math.round(n*10000),fromUnits=n=>n/10000;
const modelSeed=s=>`${s.seed}|family-mortality`;
function roll(s,id,month){let h=2166136261;for(const c of `parent-mortality|${s.seed}|${id}|${s.familyEstate.mortality.modelVersion}|${month}`)h=Math.imul(h^c.charCodeAt(0),16777619);h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;}
export const monthlyDeathProbability=q=>{if(!nn(q)||q>1)throw new TypeError('연간 사망확률을 확인해 주세요.');return q===1?1:-Math.expm1(Math.log1p(-q)/12);};
export function validateEstateRules(r){if(r?.version!==VERSION||r.kind!=='game_assumption'||!nn(r.funeralCostWan)||r.funeralCostWan>100000||r.ownership!=='equal-living-guardians'||r.distribution!=='equal-surviving-guardians-player-siblings'||r.propertySettlement!=='cash-at-book-value'||r.personalDebtTransfer!==false)throw new TypeError('장례·유산 정산 규칙을 확인해 주세요.');return r;}
export function createFamilyEstate(s,rules,table){
 validateEstateRules(rules);if(!s.familyLife||!s.householdFinance)throw new TypeError('가족의 현재 기록과 가구 계정이 필요합니다.');const alive=s.familyLife.guardians.filter(p=>p.status!=='deceased');if(!alive.length)throw new TypeError('새 유산 계정을 시작할 보호자가 없습니다.');
 return {version:VERSION,familyFingerprint:s.profile.birthFamily.fingerprint,activatedAtMonth:s.totalMonths,lastProcessedMonth:s.totalMonths,initialHousingAssetWan:s.householdFinance.housingAssetWan,rules:clone(rules),mortality:mortalitySnapshot(table,modelSeed(s)),ownerShares:Object.fromEntries(alive.map(p=>[p.id,1/alive.length])),batches:[],closed:false};
}
export function parentDeathCheck(s,p,atMonth){
 if(!s.familyEstate||p.status==='deceased')return null;const age=Math.floor(p.ageMonths/12),annualQx=annualDeathProbability(s.familyEstate.mortality,age),monthlyQx=monthlyDeathProbability(annualQx);
 return {atMonth,ageMonths:p.ageMonths,annualQx,monthlyQx,dies:roll(s,p.id,atMonth)<monthlyQx};
}
function sameDeathCheck(actual,expected){
 // log1p/expm1 may differ by a final bit between JavaScript runtimes. Only
 // the derived probability has tolerance; the draw, annual source and clock do not.
 if(!actual||!nn(actual.monthlyQx)||actual.monthlyQx>1||Math.abs(actual.monthlyQx-expected.monthlyQx)>1e-12)return false;
 return JSON.stringify({...actual,monthlyQx:expected.monthlyQx})===JSON.stringify(expected);
}
function split(total,weights){const entries=Object.entries(weights),result={},count=units(total);let used=0;for(const [i,[id,weight]]of entries.entries()){const part=i===entries.length-1?count-used:Math.floor(count*weight+1e-8);result[id]=fromUnits(part);used+=part;}return result;}
const sum=values=>round(values.reduce((a,b)=>a+b,0));
/** Pure settlement, including simultaneous deaths. All values are game book values in 10,000 KRW. */
export function calculateEstateBatch({atMonth,opening,ownerShares,deadIds,survivorIds,siblingIds,funeralCostWan}){
 const owners=Object.keys(ownerShares);if(!Number.isInteger(atMonth)||atMonth<1||!opening||!moneyKeys.every(k=>nn(opening[k])&&Number.isSafeInteger(units(opening[k])))||!owners.length||!Object.values(ownerShares).every(n=>nn(n)&&n>0)||Math.abs(sum(Object.values(ownerShares))-1)>.00001||!Array.isArray(deadIds)||!deadIds.length||new Set(deadIds).size!==deadIds.length||deadIds.some(id=>!owners.includes(id))||!Array.isArray(survivorIds)||new Set(survivorIds).size!==survivorIds.length||survivorIds.some(id=>!owners.includes(id))||owners.some(id=>deadIds.includes(id)===survivorIds.includes(id))||!Array.isArray(siblingIds)||new Set(siblingIds).size!==siblingIds.length||siblingIds.some(id=>owners.includes(id)||id==='player')||!nn(funeralCostWan))throw new TypeError('유산 정산 입력을 확인해 주세요.');
 const cash=split(opening.liquidWan,ownerShares),property=split(opening.propertyWan,ownerShares),debt=split(opening.debtWan,ownerShares),heirs=[...survivorIds,'player',...siblingIds],heirWeights=Object.fromEntries(heirs.map(id=>[id,1/heirs.length]));
 const closing={liquidWan:round(opening.liquidWan-sum(deadIds.map(id=>cash[id]))),propertyWan:round(opening.propertyWan-sum(deadIds.map(id=>property[id]))),debtWan:round(opening.debtWan-sum(deadIds.map(id=>debt[id]))),personalCashWan:opening.personalCashWan};
 const records=[];
 for(const id of deadIds){
  const grossWan=round(cash[id]+property[id]),estateFuneralWan=Math.min(grossWan,funeralCostWan),gap=round(funeralCostWan-estateFuneralWan),familyFuneralWan=Math.min(closing.liquidWan,gap);closing.liquidWan=round(closing.liquidWan-familyFuneralWan);
  const personalFuneralWan=Math.min(closing.personalCashWan,round(gap-familyFuneralWan));closing.personalCashWan=round(closing.personalCashWan-personalFuneralWan);
  const debtPaidWan=Math.min(debt[id],round(grossWan-estateFuneralWan)),unpaidEstateDebtWan=round(debt[id]-debtPaidWan),netWan=round(grossWan-estateFuneralWan-debtPaidWan),distribution=split(netWan,heirWeights),familyInheritanceWan=sum(survivorIds.map(id=>distribution[id]));
  closing.liquidWan=round(closing.liquidWan+familyInheritanceWan);closing.personalCashWan=round(closing.personalCashWan+distribution.player);
  records.push({guardianId:id,ownershipShare:ownerShares[id],liquidWan:cash[id],propertyWan:property[id],estateDebtWan:debt[id],grossWan,funeralCostWan,estateFuneralWan,familyFuneralWan,personalFuneralWan,unpaidFuneralWan:round(gap-familyFuneralWan-personalFuneralWan),debtPaidWan,unpaidEstateDebtWan,netWan,distribution,familyInheritanceWan,personalInheritanceWan:distribution.player,siblingInheritanceWan:sum(siblingIds.map(id=>distribution[id]))});
 }
 return {id:`estate-${atMonth}`,atMonth,opening:clone(opening),ownerShares:clone(ownerShares),deadIds:[...deadIds],survivorIds:[...survivorIds],siblingIds:[...siblingIds],funeralCostWan,records,closing};
}
export function settleFamilyDeaths(s,deadIds,atMonth){
 const e=s.familyEstate;if(!e)return null;if(e.lastProcessedMonth!==s.totalMonths||atMonth!==s.totalMonths+1)throw new Error('유산 정산 월이 일치하지 않습니다.');e.lastProcessedMonth=atMonth;if(!deadIds.length)return null;
 if(e.batches.some(b=>b.deadIds.some(id=>deadIds.includes(id))))throw new Error('이미 처리한 가족의 유산입니다.');
 const h=s.householdFinance,alive=s.familyLife.guardians.filter(p=>p.status!=='deceased').map(p=>p.id),batch=calculateEstateBatch({atMonth,opening:{liquidWan:h.liquidAssetsWan,propertyWan:h.housingAssetWan,debtWan:h.debtWan,personalCashWan:s.cash},ownerShares:e.ownerShares,deadIds,survivorIds:alive,siblingIds:s.profile.birthFamily.siblings.map(p=>p.id),funeralCostWan:e.rules.funeralCostWan});
 h.liquidAssetsWan=batch.closing.liquidWan;h.housingAssetWan=batch.closing.propertyWan;h.debtWan=batch.closing.debtWan;s.cash=batch.closing.personalCashWan;
 s.ledger.inheritance=round((s.ledger.inheritance||0)+sum(batch.records.map(r=>r.personalInheritanceWan)));s.ledger.funeral=round((s.ledger.funeral||0)+sum(batch.records.map(r=>r.personalFuneralWan)));
 e.batches.push(batch);e.ownerShares=Object.fromEntries(alive.map(id=>[id,1/alive.length]));e.closed=alive.length===0;
 return batch;
}
export function estateSummary(s){const e=s?.familyEstate;if(!e)return null;const records=e.batches.flatMap(b=>b.records);return {closed:e.closed,records:clone(records),batches:clone(e.batches),personalInheritanceWan:sum(records.map(r=>r.personalInheritanceWan)),personalFuneralWan:sum(records.map(r=>r.personalFuneralWan)),unpaidEstateDebtWan:sum(records.map(r=>r.unpaidEstateDebtWan)),unpaidFuneralWan:sum(records.map(r=>r.unpaidFuneralWan)),funeralCostWan:e.rules.funeralCostWan};}
export function validFamilyEstate(s){try{
 const e=s?.familyEstate;if(e===undefined)return !s?.familyLife?.guardians.some(p=>p.status==='deceased');if(!e||e.version!==VERSION||e.familyFingerprint!==s.profile?.birthFamily?.fingerprint||!s.familyLife||!s.householdFinance||!Number.isInteger(e.activatedAtMonth)||e.activatedAtMonth<0||e.activatedAtMonth>s.totalMonths||e.lastProcessedMonth!==s.totalMonths||!validMortality(e.mortality,modelSeed(s),Math.max(...s.familyLife.guardians.map(p=>Math.floor(p.ageMonths/12))))||e.mortality.lastAgeChecked!==-1)return false;validateEstateRules(e.rules);
 const alive=s.familyLife.guardians.filter(p=>p.status!=='deceased').map(p=>p.id),dead=s.familyLife.guardians.filter(p=>p.status==='deceased');if(e.closed!==(alive.length===0)||!e.ownerShares||Array.isArray(e.ownerShares)||Object.keys(e.ownerShares).length!==alive.length||alive.some(id=>e.ownerShares[id]!==1/alive.length)||!Array.isArray(e.batches)||e.batches.length>dead.length)return false;
 const processed=new Set();let priorMonth=e.activatedAtMonth;
 for(const b of e.batches){if(b.atMonth<=priorMonth||b.atMonth>s.totalMonths||b.funeralCostWan!==e.rules.funeralCostWan||JSON.stringify(b)!==JSON.stringify(calculateEstateBatch(b)))return false;priorMonth=b.atMonth;
  if(JSON.stringify(b.siblingIds)!==JSON.stringify(s.profile.birthFamily.siblings.map(p=>p.id)))return false;
  const expectedOwners=s.familyLife.guardians.filter(p=>!processed.has(p.id)).map(p=>p.id);if(Object.keys(b.ownerShares).length!==expectedOwners.length||expectedOwners.some(id=>b.ownerShares[id]!==1/expectedOwners.length))return false;
  for(const id of b.deadIds){const p=dead.find(p=>p.id===id);if(!p||processed.has(id)||p.death?.atMonth!==b.atMonth)return false;processed.add(id);}
  if(JSON.stringify(b.survivorIds)!==JSON.stringify(expectedOwners.filter(id=>!b.deadIds.includes(id))))return false;
 }
 if(processed.size!==dead.length||e.initialHousingAssetWan!==s.profile.birthFamily.household.housingAssetWan||s.householdFinance.housingAssetWan!==round(e.initialHousingAssetWan-sum(e.batches.flatMap(b=>b.records.map(r=>r.propertyWan)))))return false;
 for(const p of s.familyLife.guardians){if(p.status!=='deceased'&&Object.hasOwn(p,'death')||p.status==='deceased'&&p.lastChangeMonth!==p.death?.atMonth)return false;const c=p.lastMortalityCheck;if(s.totalMonths===e.activatedAtMonth){if(c!==null&&c!==undefined)return false;continue;}const checkMonth=p.status==='deceased'?p.death?.atMonth:s.totalMonths;
  if(!c||c.atMonth!==checkMonth||c.ageMonths!==p.ageMonths)return false;const expected=parentDeathCheck({...s,familyLife:null}, {...p,status:'retired'},checkMonth);if(!sameDeathCheck(c,expected)||c.dies!==(p.status==='deceased'))return false;
  if(p.status==='deceased'&&(!p.death||JSON.stringify(p.death)!==JSON.stringify(c)))return false;
 }
 const last=e.batches.at(-1);if(last?.atMonth===s.totalMonths&&s.householdFinance.lastMonth?.openingWan!==last.closing.liquidWan)return false;
 return true;
 }catch{return false;}}
