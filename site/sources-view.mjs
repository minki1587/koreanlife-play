import {LIVING_COST_RULES} from './living-costs.mjs?v=news-20261024';
import {HOME_RULES} from './home-ownership.mjs?v=news-20261024';

// Sources are collected here instead of being shown inside the game screens.
const item=row=>{
 if(!row||typeof row!=='object')return null;
 const title=row.title||row.id;if(!title)return null;
 const url=typeof row.url==='string'&&/^https?:\/\//.test(row.url)?row.url:typeof row.tableUrl==='string'&&/^https?:\/\//.test(row.tableUrl)?row.tableUrl:null;
 return{title:String(title),publisher:row.publisher?String(row.publisher):'',url,note:String(row.note||row.summary||row.basis||row.licenseLabel||'')};
};
const unique=rows=>{const seen=new Set();return rows.filter(row=>{if(!row)return false;const key=row.url||row.title;if(seen.has(key))return false;seen.add(key);return true;});};
const list=value=>Array.isArray(value)?value:[];

/** Groups of {title, items:[{title,publisher,url,note}]}; empty groups are dropped. */
export function collectSourceGroups({data={},catalog=null,mapManifest=null,profileCatalog=null}={}){
 const groups=[
  {title:'출생지 추첨 · 학비 · 병역',items:list(data.sources).map(item)},
  {title:'출생지 지도',items:mapManifest?.attribution?[{title:'시군구 경계 지도',publisher:'통계청 SGIS · vuski/admdongkor',url:typeof mapManifest.licenseUrl==='string'?mapManifest.licenseUrl:null,note:String(mapManifest.attribution)}]:[]},
  {title:'도시 소개',items:list(profileCatalog?.sources).map(item)},
  {title:'사망 확률',items:[item(data.mortality?.source)]},
  {title:'직업',items:[...list(catalog?.sources),...list(catalog?.modelSources)].map(item)},
  {title:'학교 과정',items:list(data.educationOptions?.sources).map(item)},
  {title:'경제 · 시장 상황',items:[...list(data.economicRules?.sources),...list(data.marketScenarios?.sources)].map(item)},
  {title:'취미 활동',items:list(data.hobbyCatalog?.sources).map(item)},
 ].map(group=>({...group,items:unique(group.items)})).filter(group=>group.items.length);
 const assumptions=[
  ['생활비 · 생활 수준',LIVING_COST_RULES.note],
  ['내 집 마련',HOME_RULES.note],
  ['돈쓰기 활동',data.spendingCatalog?.priceNote],
  ['경제 규칙',data.economicRules?.note],
  ['국내외 정세',data.marketScenarios?.note],
  ['출생 가족',data.familyRules?.note],
  ['가구 지원',data.householdRules?.note],
  ['부모의 삶',data.parentRules?.note],
  ['가족 유산',data.estateRules?.note],
 ].filter(([,note])=>typeof note==='string'&&note).map(([title,note])=>({title,publisher:'게임 가정',url:null,note}));
 if(assumptions.length)groups.push({title:'게임 가정 (실제 통계가 아닌 설정)',items:assumptions});
 return groups;
}

/** Renders the groups into host using safe text nodes and external links. */
export function renderSourceGroups(host,groups,{document=globalThis.document}={}){
 host.replaceChildren();
 if(!groups.length){const p=document.createElement('p');p.textContent='자료를 불러오는 중이에요. 잠시 후 다시 열어 주세요.';host.append(p);return;}
 for(const group of groups){
  const section=document.createElement('section'),heading=document.createElement('h3'),ul=document.createElement('ul');
  section.className='source-group';heading.textContent=group.title;ul.className='source-list';
  for(const row of group.items){
   const li=document.createElement('li'),title=row.url?document.createElement('a'):document.createElement('strong');
   title.textContent=row.title;if(row.url){title.href=row.url;title.target='_blank';title.rel='noopener noreferrer';}
   li.append(title);
   if(row.publisher){const by=document.createElement('span');by.className='source-publisher';by.textContent=` · ${row.publisher}`;li.append(by);}
   if(row.note){const note=document.createElement('p');note.className='small';note.textContent=row.note;li.append(note);}
   ul.append(li);
  }
  section.append(heading,ul);host.append(section);
 }
}
