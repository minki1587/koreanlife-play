import {currentFamilyIncome} from './parent-careers.mjs?v=economy-ui-1';
const clone=x=>structuredClone(x),round=n=>Math.round((n+Number.EPSILON)*10000)/10000;
const nonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const VERSION='household-support-1';
const TOTAL_KEYS=['incomeWan','fixedPaidWan','livingWan','tuitionWan','allowanceWan','hobbyWan','protectionWan','debtRepaidWan'];

export function validateHouseholdRules(r){
  if(r?.version!==VERSION||r.kind!=='game_assumption'||!Number.isInteger(r.reserveMonths)||r.reserveMonths<0||r.reserveMonths>12||!Number.isInteger(r.commitmentMonths)||r.commitmentMonths<1||r.commitmentMonths>24||!nonnegative(r.incomeBudgetShare)||r.incomeBudgetShare>1||!nonnegative(r.otherMemberLivingWan)||!Number.isInteger(r.maximumStudentAge)||r.maximumStudentAge<19||r.maximumStudentAge>35||!Array.isArray(r.allowances)||!r.allowances.length||r.allowances[0].minimumAge!==0||r.allowances.some((a,i)=>!Number.isInteger(a.minimumAge)||a.minimumAge<0||!nonnegative(a.monthlyWan)||(i&&a.minimumAge<=r.allowances[i-1].minimumAge))||!r.childHobbyAges||Object.entries(r.childHobbyAges).some(([id,age])=>!/^hobby-[a-z0-9-]+$/.test(id)||!Number.isInteger(age)||age<6||age>19))throw new TypeError('가구 지원 규칙을 확인해 주세요.');
  return r;
}
export function createHouseholdFinance(s,rules){
  validateHouseholdRules(rules);const birth=s.profile?.birthFamily;if(!birth)throw new TypeError('출생 가족 기록이 필요합니다.');
  return {version:VERSION,familyFingerprint:birth.fingerprint,activatedAtMonth:s.totalMonths,lastProcessedMonth:s.totalMonths,rules:clone(rules),liquidAssetsWan:birth.household.liquidAssetsWan,housingAssetWan:birth.household.housingAssetWan,debtWan:birth.household.debtWan,lastMonth:null,totals:Object.fromEntries(TOTAL_KEYS.map(k=>[k,0]))};
}
export function validHouseholdFinance(s){try{
  const h=s?.householdFinance;if(h===undefined)return true;
  if(!h||h.version!==VERSION||h.familyFingerprint!==s.profile?.birthFamily?.fingerprint||!Number.isInteger(h.activatedAtMonth)||h.activatedAtMonth<0||h.activatedAtMonth>s.totalMonths||!Number.isInteger(h.lastProcessedMonth)||h.lastProcessedMonth<h.activatedAtMonth||h.lastProcessedMonth>s.totalMonths||!['liquidAssetsWan','housingAssetWan','debtWan'].every(k=>nonnegative(h[k]))||(s.familyEstate?h.housingAssetWan>s.profile.birthFamily.household.housingAssetWan:h.housingAssetWan!==s.profile.birthFamily.household.housingAssetWan)||h.debtWan>s.profile.birthFamily.household.debtWan)return false;
  validateHouseholdRules(h.rules);if(!h.totals||!TOTAL_KEYS.every(k=>nonnegative(h.totals[k])))return false;
  const m=h.lastMonth;if(m!==null){
    if(!m||m.atMonth!==h.lastProcessedMonth||typeof m.supportEligible!=='boolean'||!['openingWan','closingWan','incomeWan','fixedPaidWan','fixedShortfallWan','livingWan','tuitionWan','allowanceWan','hobbyWan','protectionWan','debtRepaidWan','reserveWan'].every(k=>nonnegative(m[k]))||m.closingWan!==h.liquidAssetsWan||Math.abs(round(m.openingWan+m.incomeWan-m.fixedPaidWan-m.livingWan-m.tuitionWan-m.allowanceWan-m.hobbyWan)-m.closingWan)>.0002)return false;
  }else if(h.lastProcessedMonth!==h.activatedAtMonth)return false;
  return true;
}catch{return false;}}

export const hasHouseholdSupport=s=>!!s?.householdFinance&&!!s?.profile?.birthFamily;
export function familySupportEligible(s,{university=false}={}){
  if(!hasHouseholdSupport(s)||s.service?.active||s.familyEstate?.closed)return false;
  return s.age<19||(s.age<=s.householdFinance.rules.maximumStudentAge&&(university||s.schooling?.status==='enrolled'));
}
export function effectiveHobbyAge(s,row){return hasHouseholdSupport(s)?s.householdFinance.rules.childHobbyAges[row.id]??row.minAge:row.minAge;}
const familyBase=s=>s.profile.birthFamily.household;
const allowanceFor=s=>s.householdFinance.rules.allowances.filter(a=>a.minimumAge<=s.age).at(-1).monthlyWan;
export function personalLivingWan(s,{university=false}={}){
  const living=s.age<7?40:s.age<19?60:s.retired?70:75;
  if(s.age<19)return living;
  const housing=university?30:s.residence?.housing==='기숙사'?30:s.residence?.housing==='보호자 집'||s.residence?.housing==='가족·지인과 동거'?15:s.residence?.region==='서울'?70:s.residence?.region==='부산'?50:40;
  return living+housing;
}
function baseline(s,living){
  const h=s.householdFinance,b=familyBase(s),r=h.rules,income=round(currentFamilyIncome(s)/12*r.incomeBudgetShare),home=s.familyEstate?.closed?0:round(b.housing.monthlyWan+(b.members-1-(s.familyEstate?s.familyLife.guardians.filter(p=>p.status==='deceased').length:0))*r.otherMemberLivingWan),repayment=Math.min(h.debtWan,b.repaymentWan),fixed=round(home+repayment),reserve=round((fixed+living)*r.reserveMonths);
  return {income,home,repayment,fixed,reserve};
}
export function monthlyFamilyCapacity(s,{living=personalLivingWan(s),university=false}={}){
  if(!familySupportEligible(s,{university}))return 0;
  const b=baseline(s,living),h=s.householdFinance,n=h.rules.commitmentMonths;
  return round(Math.max(0,b.income-b.fixed-living+Math.max(0,h.liquidAssetsWan-b.reserve)/n));
}
export function activeHobbyCost(s,catalog){
  if(!s.hobbies?.active)return 0;const rows=Array.isArray(catalog)?catalog:catalog?.hobbies;
  if(!Array.isArray(rows))return 0;let cost=0;
  for(const id of s.hobbies.selectedIds){const row=rows.find(r=>r.id===id);if(!row||s.age<effectiveHobbyAge(s,row))return 0;cost+=row.monthlyCostWan;}
  return round(cost);
}

export function educationFunding(s,annualTuitionWan,{university=false,hobbyCostWan=0}={}){
  if(!hasHouseholdSupport(s))return {eligible:true,monthlyTuitionWan:annualTuitionWan/12,familyMonthlyWan:0,personalMonthlyWan:0,reasons:[],legacy:true};
  const fee=round(annualTuitionWan/12),n=s.householdFinance.rules.commitmentMonths,living=personalLivingWan(s,{university}),b=baseline(s,living),parentLiving=familySupportEligible(s,{university})?Math.max(0,b.income+Math.max(0,s.householdFinance.liquidAssetsWan-b.reserve)/n-b.fixed):0,livingGap=Math.max(0,living-parentLiving),capacity=Math.max(0,monthlyFamilyCapacity(s,{university,living})-hobbyCostWan),personal=round(Math.max(0,s.cash/n-livingGap)),family=round(Math.min(fee,capacity)),own=round(Math.max(0,fee-family));
  const eligible=fee===0||capacity+personal+1e-7>=fee;
  return {eligible,legacy:false,monthlyTuitionWan:fee,familyMonthlyWan:family,personalMonthlyWan:own,commitmentMonths:n,reasons:eligible?[]:[`학비 예산 부족: 월 ${fee.toFixed(2)}만원 필요 · 가구 월 지원 여력 ${capacity.toFixed(2)}만원 + 내 현금 ${s.cash.toFixed(2)}만원을 ${n}개월로 나눈 범위에서 지원 가능합니다.`]};
}
export function hobbyFunding(s,costWan){
  if(!hasHouseholdSupport(s))return {eligible:s.cash+1e-9>=costWan,familyMonthlyWan:0,personalMonthlyWan:costWan,reason:s.cash+1e-9>=costWan?'':'보유 현금이 월 취미비보다 적습니다.'};
  const tuition=s.service?.active||s.schooling?.fundingPaused?0:s.schooling?.status==='enrolled'?s.schooling.annualTuitionWan/12:s.schoolJourney?.current?.annualTuitionWan/12||0,income=s.service?.active?0:s.salary/12,living=personalLivingWan(s),other=(s.age>=19?income*(1-s.saving)*.35:0)+(s.care?.remainingMonths>0?s.care.annualCost/12:0)+s.debt*.035/12;
  const plan=settleHouseholdMonth(s,{livingWan:living,tuitionWan:tuition,hobbyWan:costWan,personalIncomeWan:income,otherPersonalCostWan:other}),family=plan.finance.lastMonth.hobbyWan,own=round(costWan-family),projected=s.cash+income+plan.supportWan-living-other-(plan.tuitionFunded?tuition:0),eligible=projected+1e-7>=costWan;
  return {eligible,familyMonthlyWan:round(family),personalMonthlyWan:own,reason:eligible?'':`가구 취미 지원 여력 ${round(family)}만원과 내 현금 ${s.cash}만원으로 월 ${costWan}만원을 마련할 수 없습니다.`};
}

/** One settlement per next month. Family transfers will enter the personal ledger once. */
export function settleHouseholdMonth(s,{livingWan,tuitionWan,hobbyWan,personalIncomeWan=0,otherPersonalCostWan=0}={}){
  const h=clone(s.householdFinance),atMonth=s.totalMonths+1;
  if(h.lastProcessedMonth>=atMonth)throw new Error('이미 정산한 가구 지원 월입니다.');
  const eligible=familySupportEligible(s),opening=h.liquidAssetsWan,b=baseline(s,livingWan),m={atMonth,supportEligible:eligible,openingWan:opening,closingWan:opening,incomeWan:0,fixedPaidWan:0,fixedShortfallWan:0,livingWan:0,tuitionWan:0,allowanceWan:0,hobbyWan:0,protectionWan:0,debtRepaidWan:0,reserveWan:b.reserve};
  let pool=opening,own=Math.max(0,s.cash+personalIncomeWan-otherPersonalCostWan),tuitionFunded=true;
  if(eligible||s.familyLife){
    m.incomeWan=b.income;pool=round(pool+b.income);
    const homePaid=Math.min(pool,b.home);pool=round(pool-homePaid);m.fixedPaidWan=homePaid;m.fixedShortfallWan=round(b.home-homePaid);
    m.livingWan=eligible?Math.min(pool,livingWan):0;pool=round(pool-m.livingWan);
    m.debtRepaidWan=Math.min(pool,b.repayment);pool=round(pool-m.debtRepaidWan);h.debtWan=round(h.debtWan-m.debtRepaidWan);m.fixedPaidWan=round(m.fixedPaidWan+m.debtRepaidWan);m.fixedShortfallWan=round(m.fixedShortfallWan+b.repayment-m.debtRepaidWan);
  }
  const ownLiving=Math.min(own,Math.max(0,livingWan-m.livingWan));own=round(own-ownLiving);
  if(s.age<19)m.protectionWan=round(Math.max(0,livingWan-m.livingWan-ownLiving));
  const discretionary=()=>eligible?Math.max(0,round(pool-b.reserve)):0;
  const candidateTuition=Math.min(discretionary(),tuitionWan);
  if(tuitionWan>candidateTuition+own+1e-7)tuitionFunded=false;
  else{m.tuitionWan=round(candidateTuition);pool=round(pool-m.tuitionWan);own=round(own-(tuitionWan-m.tuitionWan));}
  if(eligible){m.allowanceWan=round(Math.min(discretionary(),allowanceFor(s)));pool=round(pool-m.allowanceWan);own=round(own+m.allowanceWan);}
  const hobbyCandidate=Math.min(discretionary(),hobbyWan);
  if(hobbyWan<=hobbyCandidate+own+1e-7){m.hobbyWan=round(hobbyCandidate);pool=round(pool-m.hobbyWan);}
  m.closingWan=round(pool);h.liquidAssetsWan=m.closingWan;h.lastProcessedMonth=atMonth;h.lastMonth=m;
  for(const k of TOTAL_KEYS)h.totals[k]=round(h.totals[k]+m[k]);
  return {finance:h,tuitionFunded,supportWan:round(m.livingWan+m.tuitionWan+m.allowanceWan+m.hobbyWan+m.protectionWan)};
}

export function householdSummary(s){
  if(!hasHouseholdSupport(s))return null;
  const h=s.householdFinance,b=familyBase(s),m=h.lastMonth;
  return {eligible:familySupportEligible(s),parentsActive:!!s.familyLife,currentAnnualIncomeWan:currentFamilyIncome(s),liquidAssetsWan:h.liquidAssetsWan,housingAssetWan:h.housingAssetWan,debtWan:h.debtWan,netAssetsWan:round(h.liquidAssetsWan+h.housingAssetWan-h.debtWan),monthlyIncomeWan:round(currentFamilyIncome(s)/12*h.rules.incomeBudgetShare),monthlyHousingWan:s.familyEstate?.closed?0:b.housing.monthlyWan,familyMonthlyCapacityWan:monthlyFamilyCapacity(s),lastMonth:m,totals:clone(h.totals),activatedAtMonth:h.activatedAtMonth};
}
