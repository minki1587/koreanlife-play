import {randomKoreanName} from './names.mjs?v=continuity-1';
import {employmentRequirements} from './employment.mjs?v=continuity-1';
import {careerModelSnapshot,careerModelIncome} from './career-economy.mjs?v=continuity-1';

const VERSION='birth-family-1',round=n=>Math.round(n*100)/100;
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const text=s=>typeof s==='string'&&s.length>0&&s.length<=250;
const caches=new WeakMap();
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function rngFor(seed){let h=hash('birth-family|'+seed);return()=>{h+=0x6D2B79F5;let n=Math.imul(h^h>>>15,1|h);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
function signature(f,seed){const {fingerprint,...body}=f;return `family-${hash(String(seed)+'|'+JSON.stringify(body)).toString(16).padStart(8,'0')}`;}
const verified=(v,key)=>v&&String(v.status||'').startsWith('verified')&&Array.isArray(v.sourceURLs)&&v.sourceURLs.length&&v[key]!==undefined;
const location=c=>({id:c.id,region:c.region,name:c.name,sourceRegion:c.sourceRegion||c.region});

export function validateFamilyRules(r){
  if(r?.version!==VERSION||r.kind!=='game_assumption'||!Array.isArray(r.familyTypes)||!r.familyTypes.length||!Array.isArray(r.education)||!r.education.length)throw new TypeError('출생 가족 설정을 확인해 주세요.');
  const ids=new Set();
  for(const t of r.familyTypes){if(!text(t.id)||ids.has(t.id)||!text(t.label)||!Array.isArray(t.roles)||t.roles.length<1||t.roles.length>2||!t.roles.every(text)||!positive(t.weight)||!t.weight)throw new TypeError('가족 구성 설정이 올바르지 않습니다.');ids.add(t.id);}
  for(const key of ['parentAge','grandparentAge','relativeAge'])if(!Array.isArray(r[key])||r[key].length!==2||!r[key].every(Number.isInteger)||r[key][0]<25||r[key][1]>90||r[key][0]>r[key][1])throw new TypeError('보호자 나이 설정이 올바르지 않습니다.');
  if(!Array.isArray(r.siblingCount)||!r.siblingCount.length||r.siblingCount.some(n=>!Number.isInteger(n)||n<0||n>4)||!Array.isArray(r.incomeScales)||!r.incomeScales.length||r.incomeScales.some(n=>!positive(n)||n===0))throw new TypeError('가족 수입·형제 설정이 올바르지 않습니다.');
  for(const key of ['hometownLocalChance','employedChance','livingBudgetShare'])if(!positive(r[key])||r[key]>1)throw new TypeError('가족 조합 비중이 올바르지 않습니다.');
  for(const e of r.education)if(!Number.isInteger(e.level)||e.level<3||e.level>6||!text(e.label)||!Number.isInteger(e.entryAge)||e.entryAge<18)throw new TypeError('보호자 학력 설정이 올바르지 않습니다.');
  if(!Array.isArray(r.housing)||!r.housing.length||r.housing.some(h=>!['monthly','jeonse','owned'].includes(h.id)||!text(h.label)||!['minDeposit','maxDeposit','minMonthly','maxMonthly'].every(k=>positive(h[k]))||h.minDeposit>h.maxDeposit||h.minMonthly>h.maxMonthly)||!Array.isArray(r.homeTypes)||!r.homeTypes.length||!r.homeTypes.every(text)||!Array.isArray(r.styles)||!r.styles.length||!r.styles.every(text))throw new TypeError('가족 주거 설정이 올바르지 않습니다.');
  return r;
}
function context(data){
  if(caches.has(data))return caches.get(data);
  const rules=validateFamilyRules(data.familyRules);
  if(!Array.isArray(data.birthCities)||!data.birthCities.length||!Array.isArray(data.occupations)||!data.occupations.length)throw new TypeError('출생 가족의 지역·직업 자료가 없습니다.');
  const cities=[...data.birthCities].sort((a,b)=>a.id.localeCompare(b.id)),jobs=[...data.occupations].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>({row,requirements:employmentRequirements(row),model:careerModelSnapshot(row)}));
  if(jobs.some(j=>!j.model))throw new TypeError('부모 직업의 임금 모형을 확인해 주세요.');
  const value={rules,cities,jobs};caches.set(data,value);return value;
}

export function generateBirthFamily(seed,birthCity,data){
  const {rules:r,cities,jobs}=context(data);
  const city=cities.find(c=>c.id===birthCity?.id);
  if(!city||city.region!==birthCity.region||city.name!==birthCity.name)throw new TypeError('가족의 출생지역이 일치하지 않습니다.');
  const rng=rngFor(String(seed)),pick=list=>list[Math.floor(rng()*list.length)],int=(lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
  let ticket=rng()*r.familyTypes.reduce((n,t)=>n+t.weight,0),type=r.familyTypes.at(-1);
  for(const t of r.familyTypes){ticket-=t.weight;if(ticket<0){type=t;break;}}
  const names=new Set(),name=()=>{for(let i=0;i<128;i++){const n=randomKoreanName(()=>Math.floor(rng()*4294967296));if(!names.has(n)){names.add(n);return n;}}throw new Error('가족 이름을 생성하지 못했습니다.');};
  const siblingCount=pick(r.siblingCount),siblings=Array.from({length:siblingCount},(_,i)=>({id:`sibling-${i+1}`,name:name(),ageAtBirth:int(1,9)}));
  siblings.sort((a,b)=>b.ageAtBirth-a.ageAtBirth||a.id.localeCompare(b.id));
  const guardians=type.roles.map((role,i)=>{
    const ages=type.id==='grandparents'?r.grandparentAge:type.id==='relative'?r.relativeAge:r.parentAge;
    const age=int(...ages),education=pick(r.education.filter(e=>e.entryAge<=age-1));
    const hometown=location(rng()<r.hometownLocalChance?city:pick(cities));
    const employed=rng()<r.employedChance,status=employed?'취업':type.id==='grandparents'?'은퇴·돌봄':pick(['육아·가사','구직 중']);
    let occupation=null;
    if(employed){
      const candidates=jobs.filter(({row,requirements:q})=>{
        const a=row.ageRestriction,s=row.sexRestriction;
        return q.educationLevel<=education.level&&(!verified(a,'minAge')||age>=a.minAge)&&(!verified(a,'maxAge')||age<=a.maxAge)&&!verified(s,'allowedSexes');
      });
      if(!candidates.length)throw new TypeError('보호자 조건에 맞는 직업이 없습니다.');
      const {row,requirements:q,model}=pick(candidates),months=int(0,(age-education.entryAge)*12),scale=pick(r.incomeScales),workRegion=q.requiredRegions.includes(city.region)?city.region:pick(q.requiredRegions);
      const workplaces=cities.filter(c=>c.region===workRegion);if(!workplaces.length)throw new TypeError('부모의 근무지역을 찾을 수 없습니다.');
      const workplace=location(workRegion===city.region?city:pick(workplaces));
      occupation={id:row.id,name:row.occupation.name,educationMinimum:q.educationLevel,experienceMonths:months,annualIncomeWan:careerModelIncome(model,months,scale),incomeScale:scale,incomeKind:'경력별 임금 모형을 참고한 게임 추정',employmentType:model.employmentTypes[0]||'게임 근무 설정',weeklyHours:model.weeklyHours,shift:model.shiftLikelihood==='high'?'교대·야간 일정':model.shiftLikelihood==='medium'?'일정 조정 근무':'주간 중심 근무',workplace,workArrangement:workRegion===city.region?'거주지역 근무':'다른 지역 근무·별도 숙소 이용',requiredRegions:[...q.requiredRegions],qualification:q.qualificationRequired?'게임 직업준비 증표 보유 · 실제 면허 아님':'확인된 게임 준비 증표 조건 없음',modelVersion:model.modelVersion,sourceIds:[...model.sourceIds]};
    }
    return{id:`guardian-${i+1}`,role,name:name(),ageAtBirth:age,hometown,residence:location(city),education:{level:education.level,label:education.label,entryAge:education.entryAge},activity:status,occupation,parentingStyle:pick(r.styles)};
  });
  const members=1+guardians.length+siblings.length,annualIncomeWan=round(guardians.reduce((n,g)=>n+(g.occupation?.annualIncomeWan||0),0)),housingRule=pick(r.housing);
  const propertyWan=int(housingRule.minDeposit,housingRule.maxDeposit),housingDebtWan=round(propertyWan*pick([0,.25,.5])),liquidAssetsWan=int(500,20000),housingMonthlyWan=int(housingRule.minMonthly,housingRule.maxMonthly);
  const repaymentWan=round(housingDebtWan/240),basicLivingWan=members*35,essentialMonthlyWan=round(housingMonthlyWan+repaymentWan+basicLivingWan),incomeBudgetWan=round(annualIncomeWan/12*r.livingBudgetShare),careSupportWan=round(Math.max(0,essentialMonthlyWan-incomeBudgetWan)),monthlyBudgetWan=round(incomeBudgetWan+careSupportWan);
  const household={members,annualIncomeWan,incomeBudgetWan,careSupportWan,monthlyBudgetWan,essentialMonthlyWan,basicLivingWan,repaymentWan,childSupportWan:round(Math.max(0,monthlyBudgetWan-essentialMonthlyWan)*.25),liquidAssetsWan,housingAssetWan:propertyWan,debtWan:housingDebtWan,netAssetsWan:round(liquidAssetsWan+propertyWan-housingDebtWan),housing:{id:housingRule.id,tenure:housingRule.label,homeType:pick(r.homeTypes),address:location(city),monthlyWan:housingMonthlyWan,assetKind:housingRule.id==='owned'?'주택 게임 가치':'임차 보증금'},carePlan:guardians.some(g=>!g.occupation)?'함께 사는 보호자가 중심이 되어 돌봄':'근무가 겹칠 때 가상의 공동 돌봄 일정 이용'};
  const family={version:VERSION,kind:'game_assumption',birthCityId:city.id,familyType:type.id,label:type.label,birthOrder:siblings.length+1,guardians,siblings,household};
  family.fingerprint=signature(family,seed);
  if(!validBirthFamily(family,seed,city.id))throw new Error('생성된 가족 정보를 확인하지 못했습니다.');
  return family;
}

const validLocation=l=>l&&['id','region','name','sourceRegion'].every(k=>text(l[k]));
export function validBirthFamily(f,seed,cityId){try{
  if(f?.version!==VERSION||f.kind!=='game_assumption'||f.birthCityId!==cityId||!text(f.familyType)||!text(f.label)||f.fingerprint!==signature(f,seed))return false;
  if(!Array.isArray(f.guardians)||f.guardians.length<1||f.guardians.length>2||!Array.isArray(f.siblings)||f.siblings.length>4||f.birthOrder!==f.siblings.length+1)return false;
  const people=[...f.guardians,...f.siblings];if(new Set(people.map(p=>p.id)).size!==people.length||!people.every(p=>text(p.id)&&text(p.name)&&Number.isInteger(p.ageAtBirth)))return false;
  for(const g of f.guardians){
    if(!text(g.role)||g.ageAtBirth<25||g.ageAtBirth>90||!validLocation(g.hometown)||!validLocation(g.residence)||g.residence.id!==cityId||!text(g.activity)||!text(g.parentingStyle)||!g.education||!Number.isInteger(g.education.level)||g.education.level<3||g.education.level>6||!text(g.education.label)||!Number.isInteger(g.education.entryAge)||g.education.entryAge<18||g.education.entryAge>=g.ageAtBirth)return false;
    const o=g.occupation;
    if((g.activity==='취업')!==!!o)return false;
    if(o&&(!/^know-\d{6}$/.test(o.id)||!text(o.name)||!Number.isInteger(o.educationMinimum)||g.education.level<o.educationMinimum||!Number.isInteger(o.experienceMonths)||o.experienceMonths<0||o.experienceMonths>(g.ageAtBirth-g.education.entryAge)*12||!positive(o.annualIncomeWan)||!positive(o.incomeScale)||!text(o.incomeKind)||!text(o.employmentType)||!text(o.shift)||!validLocation(o.workplace)||!Array.isArray(o.requiredRegions)||!o.requiredRegions.includes(o.workplace.region)||!text(o.qualification)||!text(o.modelVersion)||!Array.isArray(o.sourceIds)||!o.sourceIds.every(text)||(o.weeklyHours!==null&&(!positive(o.weeklyHours)||o.weeklyHours>168))))return false;
  }
  if(f.siblings.some(s=>s.ageAtBirth<1||s.ageAtBirth>15||f.guardians.some(g=>g.ageAtBirth-s.ageAtBirth<18)))return false;
  const h=f.household;if(!h||h.members!==people.length+1||!['annualIncomeWan','incomeBudgetWan','careSupportWan','monthlyBudgetWan','essentialMonthlyWan','basicLivingWan','repaymentWan','childSupportWan','liquidAssetsWan','housingAssetWan','debtWan','netAssetsWan'].every(k=>positive(h[k]))||!h.housing||!['monthly','jeonse','owned'].includes(h.housing.id)||!['tenure','homeType','assetKind'].every(k=>text(h.housing[k]))||!validLocation(h.housing.address)||h.housing.address.id!==cityId||!positive(h.housing.monthlyWan)||!text(h.carePlan))return false;
  return h.annualIncomeWan===round(f.guardians.reduce((n,g)=>n+(g.occupation?.annualIncomeWan||0),0))&&h.monthlyBudgetWan===round(h.incomeBudgetWan+h.careSupportWan)&&h.essentialMonthlyWan===round(h.housing.monthlyWan+h.repaymentWan+h.basicLivingWan)&&h.monthlyBudgetWan>=h.essentialMonthlyWan&&h.netAssetsWan===round(h.liquidAssetsWan+h.housingAssetWan-h.debtWan)&&h.debtWan<=h.housingAssetWan;
}catch{return false;}}

export function familySummary(f){return `${f.label} ${f.household.members}인 가구에서 ${f.birthOrder===1?'첫째':f.birthOrder===2?'둘째':f.birthOrder===3?'셋째':`${f.birthOrder}번째 아이`}로 태어납니다. ${f.household.housing.tenure} ${f.household.housing.homeType}에서 함께 생활합니다.`;}
