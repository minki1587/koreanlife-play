export const RECENT_EVENT_LIMIT=120;
export const MAX_LIFETIME_EVENTS=50000;

/** Keep the screen window small without discarding the saved lifetime. */
export function appendLifeEvent(s,event){
 if((s.timelineArchive?.events.length||0)+s.timeline.length>=MAX_LIFETIME_EVENTS)throw new RangeError('저장할 수 있는 기록 수를 초과했습니다. 현재 기록을 파일로 보관해 주세요.');
 if(!s.timelineArchive)s.timelineArchive={schemaVersion:1,activatedAtMonth:s.totalMonths,hasEarlierGaps:s.logSerial>s.timeline.length,events:[]};
 s.timeline.push(event);
 if(s.timeline.length>RECENT_EVENT_LIMIT)s.timelineArchive.events.push(...s.timeline.splice(0,s.timeline.length-RECENT_EVENT_LIMIT));
}
const validEvent=(h,s)=>h&&typeof h.id==='string'&&Number.isInteger(h.age)&&h.age>=0&&h.age<=s.age&&Number.isInteger(h.month)&&h.month>=0&&h.month<=11&&h.age*12+h.month<=s.totalMonths&&typeof h.type==='string'&&typeof h.title==='string'&&typeof h.text==='string'&&Array.isArray(h.changes)&&h.changes.every(x=>typeof x==='string');
export function validTimelineHistory(s){
 if(!Array.isArray(s.timeline)||s.timeline.length>RECENT_EVENT_LIMIT||!Number.isInteger(s.logSerial)||s.logSerial<s.timeline.length||!s.timeline.every(e=>validEvent(e,s)))return false;
 const a=s.timelineArchive;if(a===undefined)return true;
 if(!a||a.schemaVersion!==1||!Number.isInteger(a.activatedAtMonth)||a.activatedAtMonth<0||a.activatedAtMonth>s.totalMonths||typeof a.hasEarlierGaps!=='boolean'||!Array.isArray(a.events)||a.events.length+s.timeline.length>MAX_LIFETIME_EVENTS)return false;
 const events=[...a.events,...s.timeline];if(s.logSerial<events.length||!a.hasEarlierGaps&&s.logSerial!==events.length||!a.events.every(e=>validEvent(e,s)))return false;
 const ids=new Set();let previous=-1;
 for(const e of events){const at=e.age*12+e.month;if(ids.has(e.id)||at<previous)return false;ids.add(e.id);previous=at;}
 return true;
}

/** Restore only facts retained in an old save; never invent deleted monthly events. */
export function lifeHistoryEvents(s){
 const events=[...(s.timelineArchive?.events||[]),...(s.timeline||[])];
 for(const h of s.timelineArchive?.hasEarlierGaps===false?[]:s.history||[]){const title=h.choice||h.label||h.title;
  if(!events.some(e=>e.age===h.age&&(e.month||0)===(h.month||0)&&(e.type==='decision'&&e.title===title||h.automatic&&e.type==='military-path'&&e.title===title||h.eventId==='education'&&e.type==='school-admission'&&(JSON.stringify(e.changes)===JSON.stringify(h.changes)||title==='대학 진학을 다음 해에 준비한다'&&e.title==='다음 배움을 준비하기로 했다')||h.eventId==='first-job'&&e.type==='employment'&&(JSON.stringify(e.changes)===JSON.stringify(h.changes)||title==='취업을 준비하며 다음 달로'&&e.title==='취업 준비를 이어가기로 했다'))))events.push({id:`retained-${h.id||h.eventId}`,age:h.age,month:h.month||0,type:'decision',title,text:h.title||'',changes:[...(h.changes||[])],restoredFromSave:true});
 }
 if(!events.some(e=>e.type==='birth')&&s.profile){const place=s.profile.birthCity?.name||s.profile.birthRegion||s.profile.region;
  if(place)events.push({id:'retained-birth',age:0,month:0,type:'birth',title:`${place}에서 삶을 시작했다`,text:`${s.name||'이 삶'}의 출생 기록`,changes:['0세 0개월'],restoredFromSave:true});
 }
 const old=(s.legacyHistory||[]).map((e,i)=>({...e,id:`legacy-${i}`,month:0,type:'decision',title:e.choice||e.title,text:e.choice||'',changes:['이전 버전에서 남긴 선택']}));
 return [...old,...events].sort((a,b)=>a.age-b.age||(a.month||0)-(b.month||0));
}
