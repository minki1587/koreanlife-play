// Pick the Korean particle that matches the final sound of a word.
// Digits are read as Sino-Korean numbers (1 = 일, 3 = 삼 ...).
const DIGIT_FINAL = Object.freeze({0:21,1:8,2:0,3:16,4:0,5:0,6:1,7:8,8:8,9:0});
const PAIRS = Object.freeze({
  '이':['이','가'],'가':['이','가'],
  '은':['은','는'],'는':['은','는'],
  '을':['을','를'],'를':['을','를'],
  '과':['과','와'],'와':['과','와'],
  '이라는':['이라는','라는'],'라는':['이라는','라는'],
  '이에요':['이에요','예요'],'예요':['이에요','예요'],
});

/** Final consonant index (0 = none, 8 = ㄹ) of the last Hangul syllable or digit. */
export function finalConsonant(word){
  const text=String(word??'').replace(/[\s)\]}'"’”.,!?…·-]+$/u,'');
  const last=text.at(-1);
  if(last===undefined)return 0;
  if(/[0-9]/.test(last))return DIGIT_FINAL[last];
  const code=last.charCodeAt(0)-0xac00;
  return code>=0&&code<=11171?code%28:0;
}

/** Returns only the particle, e.g. particle('자료','을') === '를'. Unknown forms pass through. */
export function particle(word,form){
  const ending=finalConsonant(word);
  if(form==='으로'||form==='로')return ending&&ending!==8?'으로':'로';
  const pair=PAIRS[form];
  if(!pair)return form||'';
  return ending?pair[0]:pair[1];
}

/** Returns the word followed by its particle, e.g. withParticle('노도하','이라는') === '노도하라는'. */
export function withParticle(word,form){return `${word}${particle(word,form)}`;}
