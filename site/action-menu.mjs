import {effectiveHobbyAge} from './household-finance.mjs?v=refinements-2';
import {FORMED_FAMILY_RULES} from './formed-family.mjs?v=refinements-2';

/** Discoverability only. The engine remains the authority for every action. */
export function lifeActionMenu(state,data={}){
 const age=state?.age??0;
 const minimum=(rows,getAge,fallback)=>Math.min(...(rows||[]).map(getAge).filter(Number.isFinite),fallback);
 const spendAge=minimum(data.spendingCatalog?.choices,row=>row.minAge,120);
 const hobbyAge=minimum(data.hobbyCatalog?.hobbies,row=>effectiveHobbyAge(state,row),120);
 return [
  ['education-manage','학업 관리',6,Boolean(state?.schoolJourney||state?.schooling||state?.academy)&&age>=6],
  ['family-open','가족 정보',0,true],
  ['hobbies-open','취미활동',hobbyAge,age>=hobbyAge],
  ['spending-open','돈쓰기',spendAge,age>=spendAge],
  ['employment-open','취업·이직',16,age>=16||Boolean(state?.job?.occupationId)],
  ['training-open','자격·능력 훈련',16,age>=16],
  ['formed-family-open','결혼·자녀',FORMED_FAMILY_RULES.minimumAge,age>=FORMED_FAMILY_RULES.minimumAge||Boolean(state?.formedFamily?.spouse)]
 ].map(([id,label,from,available])=>({id,label,from,available,priority:age<16?['education-manage','family-open','hobbies-open'].includes(id):id==='employment-open'}));
}

export function renderActionMenu(document,state,data){
 const rows=lifeActionMenu(state,data),future=document.getElementById('future-actions-list');
 future?.replaceChildren();
 for(const row of rows){const button=document.getElementById(row.id);if(button){button.hidden=!row.available;button.dataset.suggested=String(row.priority);}
  if(!row.available&&future){const li=document.createElement('li');li.textContent=`${row.label} · ${row.from}세부터`;future.append(li);}}
 const box=document.getElementById('future-actions');if(box)box.hidden=rows.every(row=>row.available);
 const hint=document.getElementById('life-actions-hint');if(hint)hint.textContent=rows.filter(row=>row.available&&row.priority).map(row=>row.label).join(' · ')||'가족 · 취미 · 일';
 return rows;
}
