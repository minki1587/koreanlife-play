// Game assumption: living costs (basic living + housing) scale by where you live
// and by the lifestyle you choose. Not derived from regional price statistics.
export const LIVING_COST_RULES=Object.freeze({
 version:'living-cost-v1',
 kind:'game_assumption',
 reviewedAt:'2026-10-24',
 regionTiers:Object.freeze([
  Object.freeze({id:'seoul',label:'서울',factor:2.2,regions:Object.freeze(['서울'])}),
  Object.freeze({id:'capital',label:'수도권',factor:1.5,regions:Object.freeze(['경기','인천'])}),
  Object.freeze({id:'local',label:'지방',factor:1,regions:Object.freeze([])}),
 ]),
 lifestyles:Object.freeze([
  Object.freeze({id:'frugal',label:'검소',factor:.9,consumptionFactor:.25,joyPerMonth:-.05,description:'꼭 필요한 데만 씁니다. 생활비와 소득에 따른 지출이 함께 줄어 돈이 남지만, 만족이 조금씩 줄어요.'}),
  Object.freeze({id:'standard',label:'보통',factor:1,consumptionFactor:1,joyPerMonth:0,description:'무리하지 않고 평범하게 생활합니다.'}),
  Object.freeze({id:'comfortable',label:'여유',factor:1.4,consumptionFactor:1,joyPerMonth:.05,description:'외식·여가에 여유 있게 씁니다. 만족이 조금씩 올라요.'}),
  Object.freeze({id:'lavish',label:'풍족',factor:2,consumptionFactor:1,joyPerMonth:.1,description:'원하는 만큼 씁니다. 생활비가 크게 늘고 만족이 더 올라요.'}),
 ]),
 // Independent rent before the region factor; the old Seoul/Busan rents are replaced by the tier factor.
 independentHousingAnnualWan:480,
 note:'지역 배율(지방 1·수도권 1.5·서울 2.2)과 생활 수준 배율(검소 0.9·보통 1·여유 1.4·풍족 2), 검소일 때 소득에 따른 자동 지출을 4분의 1로 줄이는 규칙, 생활 수준에 따른 만족 변화는 게임 가정입니다. 실제 지역별 물가·소비 통계로 계산한 값이 아닙니다.',
});
const LEVELS=LIVING_COST_RULES.lifestyles.map(row=>row.id);
const FIELDS=['version','activatedAtMonth','updatedAtMonth','level'];
const month=value=>Number.isInteger(value)&&value>=0&&value<=1800;

export function regionTier(region){return LIVING_COST_RULES.regionTiers.find(tier=>tier.regions.includes(region))||LIVING_COST_RULES.regionTiers.at(-1);}
export function lifestyleRow(level){return LIVING_COST_RULES.lifestyles.find(row=>row.id===level)||null;}

/** Absence keeps every existing save on the old flat living costs. */
export function validLifestyle(s){try{
 const setting=s?.lifestyle;if(setting===undefined)return true;
 if(!setting||Array.isArray(setting)||Object.keys(setting).length!==FIELDS.length||!FIELDS.every(key=>Object.hasOwn(setting,key)))return false;
 return setting.version===1&&(setting.level===null||LEVELS.includes(setting.level))&&month(s.totalMonths)&&month(setting.activatedAtMonth)&&month(setting.updatedAtMonth)&&setting.activatedAtMonth<=setting.updatedAtMonth&&setting.updatedAtMonth<=s.totalMonths;
}catch{return false;}}

/** First activation: costs follow region from now on; the lifestyle is still unchosen. */
export function activateLifestyle(s){return{version:1,activatedAtMonth:s.totalMonths,updatedAtMonth:s.totalMonths,level:null};}

/** Returns the new setting. Never touches money. */
export function lifestylePolicy(s,level){
 if(!LEVELS.includes(level))throw new TypeError('생활 수준을 확인해 주세요.');
 if(!s?.lifestyle||!validLifestyle(s)||!month(s.totalMonths)||s.phase==='ended')throw new Error('진행 중인 유효한 기록에서 생활 수준을 정해 주세요.');
 return{...s.lifestyle,updatedAtMonth:s.totalMonths,level};
}

/** Region × lifestyle multiplier; 1 for saves without the rules. Military-provided living stays 0 upstream. */
export function livingCostFactor(s){
 if(!s?.lifestyle)return 1;
 return regionTier(s.residence?.region).factor*(lifestyleRow(s.lifestyle.level)?.factor??1);
}

/** Asked once: an adult with work income who has not chosen yet. The clock waits. */
export function lifestyleChoicePending(s){
 return!!s?.lifestyle&&s.lifestyle.level===null&&s.phase==='running'&&s.age>=19&&!s.service?.active&&(s.job?.income||0)>0;
}

/** Multiplier on the income-proportional automatic consumption; 1 without the rules. */
export function lifestyleConsumptionFactor(s){return s?.lifestyle?lifestyleRow(s.lifestyle.level)?.consumptionFactor??1:1;}

export function lifestyleMonthlyJoy(s){return s?.lifestyle?lifestyleRow(s.lifestyle.level)?.joyPerMonth??0:0;}

/** Shared copy for the choice dialog and the life-manager panel. */
export function lifestyleSummary(s,monthlyBaseWan){
 const tier=regionTier(s?.residence?.region),current=lifestyleRow(s?.lifestyle?.level);
 return{tier,current,options:LIVING_COST_RULES.lifestyles.map(row=>({...row,monthlyWan:Number.isFinite(monthlyBaseWan)?Math.round(monthlyBaseWan*tier.factor*row.factor):null}))};
}
