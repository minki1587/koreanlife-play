import {displayCopy,displayLines} from './ui-copy.mjs?v=living-costs-20261024';
import {timelinePresentation} from './timeline-copy.mjs?v=living-costs-20261024';
export {timelineContextKey,timelineFamilyCopy,timelinePresentation} from './timeline-copy.mjs?v=living-costs-20261024';

const MONEY=/수입|소득|연봉|임금|급여|월급|지원금|용돈|지출|비용|예산|생활비|양육비|등록금|학비|이자|부채|차입|상환|현금|순자산|상속|장례비|납입|적금|원금|만기|매칭|[\d,.]+\s*(?:만|억)?원/;
const FINANCIAL_TYPES=new Set(['monthly-finance','family-allowance','family-estate','military-savings','military-pay','formed-family-finance','formed-family-estate','family-medical-support','medical-loan','child-inheritance']);
const MARKET_FINANCIAL_TYPES=new Set(['market-valuation','investment-trade']);
const ECONOMIC_LIFE_TYPES=new Set(['market-news','economic-impact','economic-layoff','economic-hiring']);
export function timelineParts(original,state){
  const event=timelinePresentation(original,state);
  const title=displayCopy(event.title||event.choice||'삶의 기록');
  // Monthly income, bills and transfers already have their own entries. Keep
  // the birthday's everyday scene, without duplicating a yearly budget report.
  if(event.type==='annual')return{life:{title,text:String(event.text||'').split(/(?<=[.!?])\s+/).map(displayCopy).filter(Boolean).slice(0,1),changes:[]},money:null};
  const facts=(event.changes||[]).flatMap(displayLines);
  const sentences=String(event.text||'').split(/(?<=[.!?])\s+/).map(displayCopy).filter(Boolean);
  // Economic news describes the world. Portfolio movements and transactions
  // have explicit financial event types, including quantity/percentage facts.
  if(ECONOMIC_LIFE_TYPES.has(event.type))return{life:{title,text:sentences,changes:facts},money:null};
  if(MARKET_FINANCIAL_TYPES.has(event.type))return{life:null,money:{title,text:sentences,changes:facts}};
  // Keep the reason for paused paid activities beside the child-care costs.
  if(event.type==='formed-family-finance')return{life:null,money:{title,text:sentences,changes:facts}};
  const moneyFacts=facts.filter(text=>MONEY.test(text));
  const lifeFacts=facts.filter(text=>!MONEY.test(text));
  const moneyText=sentences.filter(text=>MONEY.test(text));
  const lifeText=sentences.filter(text=>!MONEY.test(text));
  const onlyMoney=FINANCIAL_TYPES.has(event.type)||event.type==='family-career'&&/임금|연봉|소득/.test(title)||MONEY.test(title)&&lifeText.length===0&&lifeFacts.length===0;
  const hasMoney=onlyMoney||moneyFacts.length>0||moneyText.length>0;
  return {
    life:onlyMoney?null:{title,text:lifeText,changes:lifeFacts},
    money:hasMoney?{title,text:moneyText,changes:moneyFacts}:null,
  };
}
