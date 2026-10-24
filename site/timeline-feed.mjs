import {timelineImportance,groupHistoryEvents,historyGroupLabel,historyEventMatches,isRoutineHistoryEvent} from './history-digest.mjs?v=review-20261024';
export {timelineImportance,latestImportantEvents,focusedImportantEvents} from './history-digest.mjs?v=review-20261024';

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
  if(port)for(const row of ordered){
   const group=state.groups.get(row.dataset?.eventId),members=group?.details.open?group.events.map(event=>state.rawEntries.get(state.keyByEvent.get(event))?.node).filter(Boolean):[];
   for(const candidate of [...members,row]){const r=rectangle(candidate);if(r&&r.bottom>port.top&&r.top<port.bottom){anchor={id:candidate.dataset?.eventId,raw:candidate!==row,offset:r.top-port.top};break;}}
   if(anchor)break;
  }
  return{subject,scroll:scrollTop(subject),atLatest,anchor};
 }
 function restoreReading(state,before,latest){
  const subject=scrollSubject(state.node),port=viewport(subject),anchor=before.anchor&&(before.anchor.raw?state.rawEntries:state.entries).get(before.anchor.id)?.node,r=rectangle(anchor);
  if(!latest&&port&&r)moveScroll(subject,scrollTop(subject)+r.top-port.top-before.anchor.offset);
  else if(latest&&subject.target===before.subject.target)moveScroll(subject,before.scroll);
  return subject;
 }
 function renderRow(state,event,key,part,{insideGroup=false}={}){
  const importance=timelineImportance(event),compactWorld=state.options.groupRoutine&&importance.kind==='world',compactRoutine=state.options.groupRoutine&&!insideGroup&&isRoutineHistoryEvent(event),stamp=JSON.stringify([event.age,event.month,part,importance,compactWorld,compactRoutine]);let entry=state.rawEntries.get(key);
  if(entry?.stamp===stamp)return entry.node;
  if(entry?.details){if(entry.details.open)state.detailExpanded.add(key);else state.detailExpanded.delete(key);}
  if(!entry){entry={node:make('li'),stamp:null};state.rawEntries.set(key,entry);}
  const row=entry.node,when=make('span',`${event.age}세${event.month?' '+event.month+'개월':''}`,'when'),body=make('div'),heading=make('div',undefined,'timeline-event-heading'),title=make('b',String(part.title||event.title||event.choice||'삶의 기록'));
  row.className=`timeline-event${['choice','decision'].includes(event.type)?' chosen':''}${importance.important?' timeline-event--important':''} timeline-event--${importance.kind}`;
  if(row.dataset){row.dataset.eventId=key;row.dataset.eventKind=importance.kind;}
  if(importance.important)heading.append(make('span',importance.label,'timeline-event-badge'));
  heading.append(title);body.append(heading);
  const texts=lines(part.text);let detailTexts=texts;
  if(compactWorld){
   const first=texts[0]||'',match=first.match(/^.*?[.!?](?=\s|$)/u),lead=match?.[0]||first,rest=first.slice(lead.length).trim();
   if(lead)body.append(make('p',lead));detailTexts=[...(rest?[rest]:[]),...texts.slice(1)];
  }
  let content=body;entry.details=null;
  if((compactWorld||compactRoutine)&&(detailTexts.length||lines(part.changes).length)){
   const details=make('details',undefined,'timeline-record-details'),summary=make('summary',compactWorld?'영향 자세히':'원문 보기');details.open=state.detailExpanded.has(key);details.append(summary);body.append(details);content=details;entry.details=details;
   details.addEventListener?.('toggle',()=>{if(details.open)state.detailExpanded.add(key);else state.detailExpanded.delete(key);});
  }
  for(const text of compactWorld||compactRoutine?detailTexts:texts)content.append(make('p',text));
  if(lines(part.changes).length){const list=make('ul',undefined,'event-facts');if(typeof renderFacts==='function')renderFacts(list,part.changes);else for(const text of lines(part.changes))list.append(make('li',text));content.append(list);}
  row.replaceChildren(when,body);entry.stamp=stamp;return row;
 }
 function renderGroup(state,group,key,partByEvent,keyByEvent){
  let entry=state.groups.get(key);
  if(entry){if(entry.details.open)state.expanded.add(key);else state.expanded.delete(key);}
  if(!entry){
   const node=make('li',undefined,'timeline-routine-group'),details=make('details'),summary=make('summary'),label=make('b'),range=make('span',undefined,'timeline-group-range'),list=make('ol',undefined,'timeline-group-records');
   summary.append(label,range);details.append(summary,list);node.append(details);if(node.dataset){node.dataset.eventId=key;node.dataset.eventKind='routine-group';}
   entry={node,details,label,range,list,events:[]};state.groups.set(key,entry);
   details.addEventListener?.('toggle',()=>{if(details.open)state.expanded.add(key);else state.expanded.delete(key);});
  }
  entry.details.open=state.expanded.has(key);entry.events=group.events;entry.label.textContent=historyGroupLabel(group);
  const when=event=>`${event.age}세${event.month?' '+event.month+'개월':''}`;
  entry.range.textContent=`${when(group.events[0])} – ${when(group.events.at(-1))} · 원문 보기`;
  const members=state.options.reverse?[...group.events].reverse():group.events;
  reconcile(entry.list,members.map(event=>renderRow(state,event,keyByEvent.get(event),partByEvent.get(event),{insideGroup:true})));
  return entry.node;
 }
 function updateFilter(state){
  if(!state.options.groupRoutine){if(state.filterControl)state.filterControl.hidden=true;return;}
  if(!state.filterControl){
   const control=make('label',undefined,'timeline-filter'),caption=make('span','기록 보기'),select=make('select');
   select.setAttribute?.('aria-label',state.options.channel==='money'?'돈의 기록 필터':'삶의 기록 필터');
   for(const[value,title]of [['all','전체'],['important','중요한 변화'],['routine','일상 기록']]){const option=make('option',title);option.value=value;select.append(option);}
   select.addEventListener?.('change',()=>{state.filter=select.value;state.forceLatest=true;state.pinnedOldestId=null;render(state.node,state.events,{...state.options,filter:state.filter});});
   control.append(caption,select);if(typeof state.node.before==='function')state.node.before(control);else state.node.parentNode?.insertBefore?.(control,state.node);state.filterControl=control;state.filterSelect=select;
  }
  state.filterControl.hidden=false;state.filterSelect.value=state.filter;
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
 function render(node,events,options={}){
  const{reverse=false,channel='life',limit=Infinity,groupRoutine=false}=options;
  let state=feeds.get(node);
  if(!state){state={node,entries:new Map(),rawEntries:new Map(),groups:new Map(),expanded:new Set(),detailExpanded:new Set(),filter:'all',keyByEvent:new Map(),order:[],options:{reverse,channel,limit,groupRoutine},seenNewestId:null,newestId:null,pinnedOldestId:null,unseen:0,forceLatest:false,rendering:false};feeds.set(node,state);active.add(state);}
  if(Object.hasOwn(options,'filter'))state.filter=['all','important','routine'].includes(options.filter)?options.filter:'all';
  const showing=visible(node),before=showing?(state.pendingReading||capture(state,scrollSubject(node))):(state.pendingReading||state.lastReading||capture(state,scrollSubject(node))),latest=state.forceLatest||before.atLatest;state.forceLatest=false;state.rendering=true;
  try{
   state.options={reverse,channel,limit,groupRoutine};state.events=Array.isArray(events)?events:[];
   const eligible=[],partByEvent=new Map(),keyByEvent=new Map();
   for(const [index,event]of state.events.entries()){const part=channelPart(parts(event),channel);if(!part||groupRoutine&&!historyEventMatches(event,state.filter))continue;keyByEvent.set(event,eventId(event,index));partByEvent.set(event,part);eligible.push(event);}
   state.keyByEvent=keyByEvent;
   state.newestId=eligible.length?keyByEvent.get(eligible.at(-1)):null;
   if(latest){state.pinnedOldestId=null;state.seenNewestId=state.newestId;}
   else if(!state.pinnedOldestId&&state.order.length)state.pinnedOldestId=state.options.reverse?state.order.at(-1):state.order[0];
   const selected=selectTimelineWindow(eligible,{reverse,limit,anchorId:latest?null:before.anchor?.id,oldestId:state.pinnedOldestId});
   const chronological=reverse?[...selected].reverse():selected,groups=groupRoutine?groupHistoryEvents(chronological):chronological.map(event=>({kind:'event',event,events:[event]}));
   if(reverse)groups.reverse();
   const keys=[],rows=[];state.entries.clear();
   for(const group of groups){const key=keyByEvent.get(group.events[0]),row=group.kind==='routine-group'?renderGroup(state,group,key,partByEvent,keyByEvent):renderRow(state,group.event,key,partByEvent.get(group.event));keys.push(key);rows.push(row);state.entries.set(key,group.kind==='routine-group'?state.groups.get(key):state.rawEntries.get(key));}
   const seen=eligible.findIndex(event=>keyByEvent.get(event)===state.seenNewestId);state.unseen=latest||seen<0?0:eligible.length-seen-1;
   if(seen<0)state.seenNewestId=state.newestId;
   reconcile(node,rows);state.order=keys;const keep=new Set(selected.map(event=>keyByEvent.get(event))),groupKeys=new Set(groups.filter(group=>group.kind==='routine-group').map(group=>keyByEvent.get(group.events[0])));for(const key of state.rawEntries.keys())if(!keep.has(key))state.rawEntries.delete(key);for(const key of state.groups.keys())if(!groupKeys.has(key))state.groups.delete(key);
   updateFilter(state);
   updateReminder(state);
   let subject=scrollSubject(node);
   if(showing){subject=restoreReading(state,before,latest);state.pendingReading=null;state.lastReading=capture(state,subject);}
   else state.pendingReading={...before,atLatest:latest};
   state.atLatest=latest;watchScroll(state,subject);
   return{shown:selected.length,total:eligible.length,renderedRows:rows.length,filter:state.filter,unseen:state.unseen,atLatest:latest};
  }finally{state.rendering=false;}
 }
 function dispose(state){state.visibilityObserver?.disconnect?.();state.scrollTarget?.removeEventListener?.('scroll',state.onScroll);state.reminder?.remove?.();state.filterControl?.remove?.();state.entries.clear();state.rawEntries.clear();state.groups.clear();state.expanded.clear();state.detailExpanded.clear();active.delete(state);feeds.delete(state.node);}
 return{render,reset(node){if(node){const state=feeds.get(node);if(state)dispose(state);}else{for(const state of [...active])dispose(state);feeds=new WeakMap();}}};
}
