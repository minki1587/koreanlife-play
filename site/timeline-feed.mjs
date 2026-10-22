const ROUTINE=Object.freeze({important:false,kind:'routine',label:''});
const mark=(kind,label)=>({important:true,kind,label});

/** Presentation categories never rewrite or reclassify saved life/money records. */
export function timelineImportance(event={}){
 const type=String(event.type||''),title=String(event.title||event.choice||'');
 if(type==='ending')return mark('ending','삶의 마지막 기록');
 if(type==='family-death'||type==='spouse-death'||type==='formed-family'&&/세상을 떠|별세|사망/.test(title))return mark('loss','가족의 부고');
 if(['family-estate','formed-family-estate'].includes(type))return mark('estate','장례·상속');
 if(['life-injury','life-recovery','life-recovered','injury-care'].includes(type))return mark('health',type==='life-injury'?'부상':'치료·회복');
 if(['decision','choice'].includes(type))return mark('choice','갈림길');
 if(['employment','economic-hiring','economic-layoff','contract-ended','contract-ending','academy-commission'].includes(type))return mark('career',type==='economic-layoff'?'실직':'진로 변화');
 if(type==='family-career'&&/취업|이직|실직|은퇴|승진/.test(title))return mark('career','가족의 직업 변화');
 if(['school-admission','school-milestone'].includes(type)||type==='milestone'&&/학교|교실|배움|졸업/.test(title))return mark('education','학업 변화');
 if(['military-path','military-savings'].includes(type)||type==='milestone'&&/입대|전역|복무/.test(title))return mark('military','군복무');
 if(type==='formed-family'&&/결혼|가족으로 맞이|관계를 정리|교제를 시작/.test(title))return mark('family','가족 변화');
 if(type==='birth')return mark('birth','출생');
 return ROUTINE;
}

const eventId=(event,index)=>typeof event?.id==='string'&&event.id?event.id:`event-${event?.age||0}-${event?.month||0}-${event?.type||''}-${index}`;

/** Select references from a chronological source, retaining the oldest pinned record. */
export function selectTimelineWindow(events,{limit=Infinity,reverse=false,anchorId=null,oldestId=null}={}){
 const source=Array.isArray(events)?events:[],count=Number.isFinite(limit)?Math.max(0,Math.floor(limit)):source.length;
 let start=Math.max(0,source.length-count);
 for(const key of [anchorId,oldestId])if(key!==null){const index=source.findIndex((event,i)=>eventId(event,i)===key);if(index>=0)start=Math.min(start,index);}
 const result=source.slice(start);return reverse?result.reverse():result;
}

const lines=value=>Array.isArray(value)?value.filter(line=>typeof line==='string'):typeof value==='string'&&value?[value]:[];
function channelPart(value,channel){
 if(channel!=='all')return value?.[channel]||null;
 if(!value?.life&&!value?.money)return null;
 return{title:value.life?.title||value.money?.title,text:[...lines(value.life?.text),...lines(value.money?.text)],changes:[...lines(value.life?.changes),...lines(value.money?.changes)]};
}
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const rectangle=node=>{try{const r=node?.getBoundingClientRect?.();return r&&Number.isFinite(r.top)&&Number.isFinite(r.bottom)?r:null;}catch{return null;}};

/** Keep one bounded DOM row per displayed event, and preserve the record being read. */
export function createTimelineFeed({document=globalThis.document,parts=event=>({life:{title:event.title,text:lines(event.text),changes:lines(event.changes)}}),renderFacts}={}){
 let feeds=new WeakMap();const active=new Set();
 const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 function visible(node){
  for(let parent=node;parent;parent=parent.parentElement)if(parent.hidden)return false;
  try{if(typeof node.getClientRects==='function')return node.getClientRects().length>0;}catch{}
  return true;
 }
 function scrollSubject(node){
  const view=document?.defaultView??globalThis.window,root=document?.scrollingElement||document?.documentElement;
  for(let parent=node.parentElement;parent&&parent!==document?.body&&parent!==document?.documentElement;parent=parent.parentElement){
   let style;try{style=view?.getComputedStyle?.(parent);}catch{}
   const overflow=style?.overflowY||style?.overflow;
   if(number(parent.clientHeight)>0&&number(parent.scrollHeight)>number(parent.clientHeight)+1&&(!overflow||/auto|scroll|overlay/.test(overflow)))return{kind:'element',target:parent};
  }
  return{kind:'window',target:view||root,root};
 }
 function scrollTop(subject){return subject.kind==='element'?number(subject.target?.scrollTop):number(subject.target?.scrollY??subject.target?.pageYOffset??subject.root?.scrollTop);}
 function viewport(subject){
  if(subject.kind==='element'){const r=rectangle(subject.target);if(!r)return null;const top=r.top+number(subject.target.clientTop);return{top,bottom:top+number(subject.target.clientHeight,r.bottom-r.top)};}
  const height=number(subject.target?.innerHeight,number(document?.documentElement?.clientHeight));return height>0?{top:0,bottom:height}:null;
 }
 function moveScroll(subject,top){
  const value=Math.max(0,top);
  if(subject.kind==='element'){if(subject.target)subject.target.scrollTop=value;return;}
  if(typeof subject.target?.scrollTo==='function'){try{subject.target.scrollTo({top:value,behavior:'instant'});return;}catch{}}
  if(subject.root)subject.root.scrollTop=value;
 }
 function capture(state,subject){
  const port=viewport(subject),ordered=state.order.map(key=>state.entries.get(key)?.node).filter(Boolean),first=rectangle(ordered[0]),last=rectangle(ordered.at(-1));
  const atLatest=!ordered.length||!port||!(state.options.reverse?first:last)||(state.options.reverse?first.top>=port.top-3:last.bottom<=port.bottom+3);
  let anchor=null;
  if(port)for(const row of ordered){const r=rectangle(row);if(r&&r.bottom>port.top&&r.top<port.bottom){anchor={id:row.dataset?.eventId,offset:r.top-port.top};break;}}
  return{subject,scroll:scrollTop(subject),atLatest,anchor};
 }
 function restoreReading(state,before,latest){
  const subject=scrollSubject(state.node),port=viewport(subject),anchor=before.anchor&&state.entries.get(before.anchor.id)?.node,r=rectangle(anchor);
  if(!latest&&port&&r)moveScroll(subject,scrollTop(subject)+r.top-port.top-before.anchor.offset);
  else if(latest&&subject.target===before.subject.target)moveScroll(subject,before.scroll);
  return subject;
 }
 function renderRow(state,event,key,part){
  const importance=timelineImportance(event),stamp=JSON.stringify([event.age,event.month,part,importance]);let entry=state.entries.get(key);
  if(entry?.stamp===stamp)return entry.node;
  if(!entry){entry={node:make('li'),stamp:null};state.entries.set(key,entry);}
  const row=entry.node,when=make('span',`${event.age}세${event.month?' '+event.month+'개월':''}`,'when'),body=make('div'),heading=make('div',undefined,'timeline-event-heading'),title=make('b',String(part.title||event.title||event.choice||'삶의 기록'));
  row.className=`timeline-event${['choice','decision'].includes(event.type)?' chosen':''}${importance.important?' timeline-event--important':''} timeline-event--${importance.kind}`;
  if(row.dataset){row.dataset.eventId=key;row.dataset.eventKind=importance.kind;}
  if(importance.important)heading.append(make('span',importance.label,'timeline-event-badge'));
  heading.append(title);body.append(heading);
  for(const text of lines(part.text))body.append(make('p',text));
  if(lines(part.changes).length){const list=make('ul',undefined,'event-facts');if(typeof renderFacts==='function')renderFacts(list,part.changes);else for(const text of lines(part.changes))list.append(make('li',text));body.append(list);}
  row.replaceChildren(when,body);entry.stamp=stamp;return row;
 }
 function reconcile(node,rows){
  if(typeof node.insertBefore==='function'){
   let cursor=node.firstChild;
   for(const row of rows){if(row===cursor)cursor=cursor.nextSibling;else node.insertBefore(row,cursor||null);}
   const keep=new Set(rows);for(const child of [...(node.childNodes||node.children||[])])if(!keep.has(child)){if(typeof child.remove==='function')child.remove();else node.removeChild?.(child);}
  }else node.replaceChildren(...rows);
 }
 function updateReminder(state){
  if(!state.reminder){const button=make('button','','secondary timeline-new-records');button.type='button';button.hidden=true;if(state.node.id)button.setAttribute?.('aria-controls',state.node.id);
   button.addEventListener?.('click',()=>{state.forceLatest=true;state.pinnedOldestId=null;state.seenNewestId=state.newestId;render(state.node,state.events,state.options);const subject=scrollSubject(state.node),port=viewport(subject),row=state.entries.get(state.options.reverse?state.order[0]:state.order.at(-1))?.node,r=rectangle(row);if(port&&r)moveScroll(subject,scrollTop(subject)+(state.options.reverse?r.top-port.top:r.bottom-port.bottom));state.atLatest=true;state.unseen=0;updateReminder(state);});
   if(typeof state.node.before==='function')state.node.before(button);else state.node.parentNode?.insertBefore?.(button,state.node);state.reminder=button;
  }
  state.reminder.hidden=state.unseen===0;state.reminder.textContent=state.unseen?`새로 추가된 기록 ${state.unseen}개 · 최신 기록 보기`:'';
 }
 function watchScroll(state,subject){
  if(!state.visibilityObserver){const Observer=document?.defaultView?.MutationObserver??globalThis.MutationObserver;
   if(typeof Observer==='function'&&state.node.parentElement){state.visibilityObserver=new Observer(()=>{
    if(state.rendering||!visible(state.node))return;
    if(state.pendingReading){restoreReading(state,state.pendingReading,state.pendingReading.atLatest);state.pendingReading=null;}
    state.lastReading=capture(state,scrollSubject(state.node));watchScroll(state,state.lastReading.subject);
   });state.visibilityObserver.observe(state.node.parentElement,{attributes:true,attributeFilter:['hidden','style','class','open']});}
  }
  if(state.scrollTarget===subject.target)return;
  state.scrollTarget?.removeEventListener?.('scroll',state.onScroll);state.scrollTarget=subject.target;
  state.onScroll=()=>{if(state.rendering||!visible(state.node))return;const reading=capture(state,scrollSubject(state.node));state.lastReading=reading;state.atLatest=reading.atLatest;if(reading.atLatest){state.seenNewestId=state.newestId;state.pinnedOldestId=null;state.unseen=0;updateReminder(state);}};
  state.scrollTarget?.addEventListener?.('scroll',state.onScroll,{passive:true});
 }
 function render(node,events,{reverse=false,channel='life',limit=Infinity}={}){
  let state=feeds.get(node);
  if(!state){state={node,entries:new Map(),order:[],options:{reverse,channel,limit},seenNewestId:null,newestId:null,pinnedOldestId:null,unseen:0,forceLatest:false,rendering:false};feeds.set(node,state);active.add(state);}
  const showing=visible(node),before=showing?(state.pendingReading||capture(state,scrollSubject(node))):(state.pendingReading||state.lastReading||capture(state,scrollSubject(node))),latest=state.forceLatest||before.atLatest;state.forceLatest=false;state.rendering=true;
  try{
   state.options={reverse,channel,limit};state.events=Array.isArray(events)?events:[];
   const eligible=[],partByEvent=new Map(),keyByEvent=new Map();
   for(const event of state.events){const part=channelPart(parts(event),channel);if(!part)continue;keyByEvent.set(event,eventId(event,eligible.length));partByEvent.set(event,part);eligible.push(event);}
   state.newestId=eligible.length?keyByEvent.get(eligible.at(-1)):null;
   if(latest){state.pinnedOldestId=null;state.seenNewestId=state.newestId;}
   else if(!state.pinnedOldestId&&state.order.length)state.pinnedOldestId=state.options.reverse?state.order.at(-1):state.order[0];
   const selected=selectTimelineWindow(eligible,{reverse,limit,anchorId:latest?null:before.anchor?.id,oldestId:state.pinnedOldestId});
   const rows=selected.map(event=>renderRow(state,event,keyByEvent.get(event),partByEvent.get(event))),keys=selected.map(event=>keyByEvent.get(event));
   const seen=eligible.findIndex(event=>keyByEvent.get(event)===state.seenNewestId);state.unseen=latest||seen<0?0:eligible.length-seen-1;
   if(seen<0)state.seenNewestId=state.newestId;
   reconcile(node,rows);state.order=keys;const keep=new Set(keys);for(const key of state.entries.keys())if(!keep.has(key))state.entries.delete(key);
   updateReminder(state);
   let subject=scrollSubject(node);
   if(showing){subject=restoreReading(state,before,latest);state.pendingReading=null;state.lastReading=capture(state,subject);}
   else state.pendingReading={...before,atLatest:latest};
   state.atLatest=latest;watchScroll(state,subject);
   return{shown:selected.length,total:eligible.length,unseen:state.unseen,atLatest:latest};
  }finally{state.rendering=false;}
 }
 function dispose(state){state.visibilityObserver?.disconnect?.();state.scrollTarget?.removeEventListener?.('scroll',state.onScroll);state.reminder?.remove?.();state.entries.clear();active.delete(state);feeds.delete(state.node);}
 return{render,reset(node){if(node){const state=feeds.get(node);if(state)dispose(state);}else{for(const state of [...active])dispose(state);feeds=new WeakMap();}}};
}
