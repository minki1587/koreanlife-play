/** Presentation only: source records, probabilities and eligibility stay untouched. */
const clauses=value=>String(value??'').split(/\s+·\s+(?![^()]*\))|\n+/u);
function cleanClause(value){
 const disclaimer=sentence=>
  /출생지역은[^.。]*가구 배경과 초기 여유자금은 가상 설정이다/u.test(sentence)||
  /실제[^.。]*(?:아닙니다|아니다|아님|아니며|뜻하지 않|나타내지 않|예측하지 않|예측하지 않는다|판정하지 않|재현하지 않|부여하지 않|대체하지 않|포함하지 않|결과가 아니다|자동 발급되지 않|자동 취득하지 않)/u.test(sentence)||
  /실제 (?:공고|채용)[^.。]*아닌/u.test(sentence)||
  /(?:실측|전국[^.。]*평균)[^.。]*(?:아님|아니|않)/u.test(sentence)||
  /(?:임금·생활비·점수·사건|합격식·입학 연령·비용·학습 효과)[^.。]*(?:가상 규칙|게임 설정)/u.test(sentence)||
  /(?:게임 (?:설정|가정|규칙)|가상 (?:규칙|연령 규칙))[^.。]*(?:입니다|이다|이며|이므로)/u.test(sentence)||
  /(?:생명표|연령대별[^.。]*확률)[^.。]*(?:환산한 가상 결과|월 확률로 환산)/u.test(sentence)||
  /(?:질병|사망 원인)[^.。]*(?:판정하지 않|추정하지 않)/u.test(sentence)||
  /가상[^.。]*(?:결과입니다|사건이다|연령 규칙이다)/u.test(sentence)||
  /배움 점수와 고정 난수에 따른 (?:가상 )?입학 결과다/u.test(sentence)||
  /(?:월별(?:로)?\s*처리한\s*\d+개월|월별|연간)[^.。]*(?:예산|정산)[^.。]*(?:정리|요약|보고)/u.test(sentence)||
  /^\s*(?:가구|가족)\s*소득\s*예산\s*(?:즉시\s*)?반영[.]?\s*$/u.test(sentence)||
  /^\s*부동산 지분은 평가액으로 현금 정산합니다[.]?\s*$/u.test(sentence)||
  /시간을 건너뛰지 않고[^.。]*다음 월부터[^.。]*반영/u.test(sentence)||
  /^\s*게임 학위·직업준비 증표·5축 능력·공고 근무지역을 확인한 가상 채용이다[.]?\s*$/u.test(sentence)||
  /졸업해도 면허는 자동 취득하지 않는다/u.test(sentence)||
  /^\s*복무 경로는 대상이라는 가정으로 선택한다[.]?\s*$/u.test(sentence);
 const raw=String(value??'').replace(/복무 경로는 대상이라는 가정으로 선택한다[.]?/gu,'')
  .replace(/(?:가구|가족)\s*소득\s*예산\s*(?:즉시\s*)?반영[.,]?\s*/gu,'')
  .replace(/(?:[,·]\s*)?실제 자격 판정 없음[.]?/gu,'')
  .replace(/대상이라는 가정,?\s*/gu,'');
 return raw.split(/(?<=[.!?。])\s+(?=[가-힣A-Z‘“])/u).filter(sentence=>!disclaimer(sentence)).join(' ')
  .replace(/(?:실제 (?:학교의 선발 결과|개인의 합격확률|학력·국가자격·면허|면허 취득|면허 발급|법정 학력 판정)[^.。\n]*[.。]?)/gu,'')
  .replace(/(?:게임 (?:추정|설정|가정|규칙|공고 배치)|직종 모형|실제 면허 아님|법정 학력 판정 아님)/gu,'')
  .replace(/게임에서\s*(?=\d)/gu,'')
  .replace(/게임 난이도(?:\(비교값\))?/gu,'지원 기준')
  .replace(/게임 문턱/gu,'지원 기준')
  .replace(/게임 직업준비 증표|게임 준비 증표/gu,'직업준비 증표')
  .replace(/게임 학위/gu,'학위')
  .replace(/게임 과정/gu,'과정')
  .replace(/게임(?=수업료|학비)/gu,'')
  .replace(/게임 근무 설정/gu,'근무형태 미기록')
  .replace(/\((?:가상|게임 추정|게임 설정)\)/gu,'')
  .replace(/가상 공고 근무지역/gu,'채용 근무지역')
  .replace(/가상의? /gu,'')
  .replace(/주택 게임 가치/gu,'주택 평가액')
  .replace(/현재 게임 조건/gu,'현재 조건')
  .replace(/게임 차입/gu,'차입')
  .replace(/게임 상한/gu,'상한')
  .replace(/게임 /gu,'')
  .replace(/부모 연 근로소득/gu,'부모 연 소득')
  .replace(/\s*·\s*(?=·|$)/gu,'')
  .replace(/^\s*·\s*/u,'')
  .replace(/\s{2,}/gu,' ').trim();
}

export function displayCopy(value){
 return clauses(value).map(cleanClause).filter(Boolean).join(' · ');
}

export function displayLines(value){
 const values=Array.isArray(value)?value:[value];
 return values.flatMap(clauses).map(cleanClause).filter(Boolean).flatMap(line=>{
  const shared=line.match(/^((?:건강|만족|배움|관계|기술)(?:\s*·\s*(?:건강|만족|배움|관계|기술))+)\s*([+−-]\d+(?:\.\d+)?(?:점)?(?:\s*\/\s*월)?)$/u);
  return shared?shared[1].split(/\s*·\s*/u).map(stat=>`${stat} ${shared[2]}`):[line];
 });
}

export function appendUiFacts(document,host,pairs,className='ui-facts'){
 const dl=document.createElement('dl');dl.className=className;
 for(const [label,value]of pairs){
  const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
  dt.textContent=displayCopy(label);const lines=displayLines(value);
  if(lines.length>1){const list=document.createElement('ul');for(const text of lines){const li=document.createElement('li');li.textContent=text;list.append(li);}dd.append(list);}
  else dd.textContent=lines[0]||'—';
  row.append(dt,dd);dl.append(row);
 }
 host.append(dl);return dl;
}

/** Completed attempts close immediately; failed validation keeps its actionable form. */
export function completeModalAction(dialog,status,callback,argument,fallback='조건을 확인해주세요.'){
 try{callback(argument);status.textContent='';dialog.close();return true;}
 catch(error){status.textContent=displayCopy(error?.message||fallback);return false;}
}
