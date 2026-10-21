import {displayCopy,displayLines} from './ui-copy.mjs?v=audit-fixes-1';

const MONEY=/수입|소득|연봉|임금|급여|월급|지원금|용돈|지출|비용|예산|생활비|등록금|학비|이자|부채|차입|상환|현금|순자산|상속|장례비|납입|적금|원금|만기|매칭|[\d,.]+\s*(?:만|억)?원/;
const FINANCIAL_TYPES=new Set(['family-allowance','family-estate','military-savings','military-pay']);
export function timelineParts(event){
  const title=displayCopy(event.title||event.choice||'삶의 기록');
  const facts=(event.changes||[]).flatMap(displayLines);
  const moneyFacts=facts.filter(text=>MONEY.test(text));
  const lifeFacts=facts.filter(text=>!MONEY.test(text));
  const sentences=String(event.text||'').split(/(?<=[.!?])\s+/).map(displayCopy).filter(Boolean);
  const moneyText=sentences.filter(text=>MONEY.test(text));
  const lifeText=sentences.filter(text=>!MONEY.test(text));
  const onlyMoney=FINANCIAL_TYPES.has(event.type)||event.type==='family-career'&&/임금|연봉|소득/.test(title)||MONEY.test(title)&&lifeText.length===0&&lifeFacts.length===0;
  const hasMoney=onlyMoney||moneyFacts.length>0||moneyText.length>0;
  return {
    life:onlyMoney?null:{title,text:lifeText,changes:lifeFacts},
    money:hasMoney?{title,text:moneyText,changes:moneyFacts}:null,
  };
}
