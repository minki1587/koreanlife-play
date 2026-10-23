const ROUTINE=Object.freeze({important:false,kind:'routine',label:''});
const mark=(kind,label)=>({important:true,kind,label});
export const FAMILY_CAREER_SUBTYPES=Object.freeze(['job-hire','job-loss','job-change','retirement','job-search','wage-rise']);
const IMPORTANT_FAMILY_CAREERS=new Set(['job-hire','job-loss','job-change','retirement','legacy-promotion']);

/** New records carry a stable subtype. Only older records without that field
 * use the known legacy title endings; source text is never rewritten. */
export function familyCareerSubtype(event={}){
 if(event.type!=='family-career')return null;
 if(Object.hasOwn(event,'subtype'))return FAMILY_CAREER_SUBTYPES.includes(event.subtype)?event.subtype:null;
 const title=String(event.title||event.choice||'').trim();
 const legacy=[['job-loss',/실직해 구직을 시작했다[.!]?$/u],['job-hire',/(?:취업했다|취업을 시작했다|일을 시작했다)[.!]?$/u],['job-change',/이직했다[.!]?$/u],['retirement',/은퇴했다[.!]?$/u],['job-search',/구직을 시작했다[.!]?$/u],['wage-rise',/경력 임금이 올랐다[.!]?$/u],['legacy-promotion',/승진했다[.!]?$/u]];
 return legacy.find(([,pattern])=>pattern.test(title))?.[0]||null;
}

/** View-only classification: persisted records, dates and IDs are never rewritten. */
export function timelineImportance(event={}){
 const type=String(event.type||''),title=String(event.title||event.choice||'');
 if(type==='child-inheritance')return mark('family','자녀의 재산');
 if(type==='family-medical-support'||type==='medical-loan')return mark('health','치료비 마련');
 if(type==='service-review')return mark('military','복무 재검토');
 if(type==='later-life')return mark('choice','노년의 일상');
 if(type==='ending')return mark('ending','삶의 마지막 기록');
 if(type==='family-death'||type==='spouse-death'||type==='formed-family'&&/세상을 떠|별세|사망/.test(title))return mark('loss','가족의 부고');
 if(['family-estate','formed-family-estate'].includes(type))return mark('estate','장례·상속');
 if(['life-injury','life-recovery','life-recovered','injury-care'].includes(type))return mark('health',type==='life-injury'?'부상':'치료·회복');
 if(['decision','choice'].includes(type))return mark('choice','갈림길');
 if(['employment','economic-hiring','economic-layoff','contract-ended','contract-ending','academy-commission','career-training','career-move'].includes(type))return mark('career',type==='economic-layoff'?'실직':'진로 변화');
 if(type==='family-career'&&IMPORTANT_FAMILY_CAREERS.has(familyCareerSubtype(event)))return mark('career','가족의 직업 변화');
 if(['school-admission','school-milestone','household-school'].includes(type)||type==='milestone'&&/학교|교실|배움|졸업|학업/.test(title))return mark('education','학업 변화');
 if(['military-path','military-savings'].includes(type)||type==='milestone'&&/입대|전역|복무/.test(title))return mark('military','군복무');
 if(type==='formed-family'&&/결혼|가족으로 맞이|관계를 정리|교제를 시작|출산|태어|입양|독립/.test(title))return mark('family','가족 변화');
 if(type==='hobby'&&/멈|중단/.test(title))return mark('activity','활동 중단');
 if(type==='market-news'||type==='economic-impact')return mark('world','정세 변화');
 if(type==='birth')return mark('birth','출생');
 return ROUTINE;
}

/** Newest important source references, for a small overview; no history copies or totals. */
export function latestImportantEvents(events,{limit=3,parts,channel='all'}={}){
 const source=Array.isArray(events)?events:[],count=Number.isFinite(limit)?Math.min(3,Math.max(0,Math.floor(limit))):3,result=[];
 for(let index=source.length-1;index>=0&&result.length<count;index--){
  const event=source[index];if(!timelineImportance(event).important)continue;
  if(typeof parts==='function'){const value=parts(event);if(channel==='all'?!value?.life&&!value?.money:!value?.[channel])continue;}
  result.push(event);
 }
 return result;
}

/** Personal milestones get overview space before broad news; the archive stays complete. */
export function focusedImportantEvents(events,{state,limit=3,parts,channel='all'}={}){
 const source=Array.isArray(events)?events:[],count=Number.isFinite(limit)?Math.min(3,Math.max(0,Math.floor(limit))):3,personal=[],world=[];
 const hasWork=['재직','계약직','시간제','프리랜서','자영업'].includes(state?.job?.status),hasIncome=Number(state?.salary||state?.job?.income||0)>0,hasInvestment=Object.values(state?.market?.holdings||{}).some(holding=>Number(holding?.units)>0);
 const youngUnexposed=Number.isFinite(state?.age)&&state.age<16&&!hasWork&&!hasIncome&&!hasInvestment;
 for(let index=source.length-1;index>=0;index--){
  const event=source[index],importance=timelineImportance(event);if(!importance.important)continue;
  if(typeof parts==='function'){const value=parts(event);if(channel==='all'?!value?.life&&!value?.money:!value?.[channel])continue;}
  if(importance.kind==='world'){if(!(youngUnexposed&&event.type==='economic-impact'))world.push({event,index});}
  else personal.push({event,index});
 }
 const chosen=personal.slice(0,count);if(chosen.length<count&&world.length)chosen.push(world[0]);
 return chosen.sort((a,b)=>b.index-a.index).map(row=>row.event);
}

const GROUPS=Object.freeze({
 'monthly-finance':'정기 수입·지출 기록','family-allowance':'용돈 기록',
 'market-valuation':'투자 평가 기록','hobby':'정기 취미 활동',
 'military-pay':'군 급여 기록','formed-family-finance':'양육비 기록',
 'annual':'생일과 일상 기록',
});
export function isRoutineHistoryEvent(event){return !timelineImportance(event).important&&Object.hasOwn(GROUPS,event?.type);}
const atMonth=event=>Number.isInteger(event?.age)&&event.age>=0&&Number.isInteger(event?.month??0)&&Number(event.month||0)>=0&&Number(event.month||0)<12?event.age*12+Number(event.month||0):null;
const single=event=>({kind:'event',event,events:[event]});

/**
 * Group only known routine kinds inside a short calendar interval. Important or
 * unrecognised records are boundaries; explicit choices/trades never disappear
 * into an automatic monthly summary. Descriptor IDs are not persisted or added.
 */
export function groupHistoryEvents(events,{maxMonths=3}={}){
 const source=Array.isArray(events)?events:[],period=Number.isInteger(maxMonths)&&maxMonths>0?maxMonths:3,result=[];
 let block=[],bucket=null;
 function flush(){
  const byKind=new Map(),order=[];
  for(const event of block){const category=event.type;let group=byKind.get(category);if(!group){group={kind:'routine-group',category,label:GROUPS[category],events:[]};byKind.set(category,group);order.push(group);}group.events.push(event);}
  for(const group of order){if(group.events.length<2){result.push(single(group.events[0]));continue;}group.startMonth=atMonth(group.events[0]);group.endMonth=atMonth(group.events.at(-1));group.months=new Set(group.events.map(atMonth)).size;result.push(group);}
  block=[];bucket=null;
 }
 for(const event of source){
  const month=atMonth(event),key=month===null?null:Math.floor(month/period);
  if(timelineImportance(event).important||!GROUPS[event?.type]||key===null){flush();result.push(single(event));continue;}
  if(bucket!==null&&bucket!==key)flush();bucket=key;block.push(event);
 }
 flush();return result;
}

export function historyGroupLabel(group){
 if(group?.kind!=='routine-group')return '';
 const count=group.events.length,months=group.months;
 return `${group.label} · ${months>1?`${months}개월 · `:''}${count}건`;
}

export function historyEventMatches(event,filter='all'){
 const importance=timelineImportance(event);
 return filter==='important'?importance.important:filter==='routine'?!importance.important:true;
}
