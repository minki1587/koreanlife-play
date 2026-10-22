import {careerModelFieldViews} from './career-model-views.mjs?v=ux-design-1';
import {displayCopy,displayLines,appendUiFacts} from './ui-copy.mjs?v=ux-design-1';
const PAGE_SIZE = 20;
const FIELD_DEFINITIONS = Object.freeze([
  ['occupation', '직업명'], ['education', '학력·훈련'], ['salary', '임금'],
  ['regionRestriction', '지역 제한'], ['ageRestriction', '연령 제한'],
  ['sexRestriction', '성별 제한'], ['workAbilities', '업무 능력'],
  ['qualifications', '자격증'], ['occupationalRisks', '업무상 위험'],
]);
const clean = value => typeof value === 'string' ? value.trim() : '';
const normalize = value => clean(value).normalize('NFKC').toLocaleLowerCase('ko-KR');
const numberText = value => new Intl.NumberFormat('ko-KR', {maximumFractionDigits:2}).format(value);
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const reasonText = value => typeof value === 'string' ? clean(value) : value && typeof value === 'object' ? Object.values(value).map(reasonText).filter(Boolean).join(' ') : '';
const groupOf = row => clean(row?.occupation?.classification?.middleGroupName) || '분류 미기록';

export function validateCareerCatalog(catalog) {
  if (!Array.isArray(catalog?.occupations) || !Array.isArray(catalog?.sources)) {
    throw new TypeError('직업 자료에는 occupations와 sources 배열이 필요합니다.');
  }
  const ids = new Set();
  for (const row of catalog.occupations) {
    if (!clean(row?.id) || !clean(row?.occupation?.name) || ids.has(row.id)) {
      throw new TypeError('직업 이름·고유 ID 또는 중복을 확인해 주세요.');
    }
    ids.add(row.id);
  }
  return catalog;
}

/** Search retains source order and never changes records or game state. */
export function searchOccupations(occupations, query = '', middleGroup = '') {
  if (!Array.isArray(occupations)) throw new TypeError('직업 배열이 필요합니다.');
  const tokens = normalize(query).split(/\s+/u).filter(Boolean);
  return occupations.filter(row => {
    if (middleGroup && groupOf(row) !== middleGroup) return false;
    const c = row?.occupation?.classification;
    const codes = c?.codes && typeof c.codes === 'object' ? Object.values(c.codes) : [c?.codes];
    const haystack = normalize([row?.occupation?.name, row?.id, groupOf(row), c?.system, ...codes].filter(v => typeof v === 'string').join(' '));
    return tokens.every(token => haystack.includes(token));
  });
}

export function formatCareerNumber(value, unit = '') {
  return numeric(value) ? `${numberText(value)}${clean(unit) ? ' ' + clean(unit) : ''}` : '미확인';
}

/** Text-only fallback for approved structured values, never HTML or a gate. */
function dataText(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string') return clean(value);
  if (typeof value === 'number') return numeric(value) ? numberText(value) : '';
  if (Array.isArray(value)) return value.map(v => dataText(v, depth + 1)).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    const labels = {name:'명칭', title:'항목', label:'항목', description:'설명', text:'안내',
      requirement:'조건', required:'필수 요건', level:'수준', value:'원값', note:'참고',
      items:'항목', legalBasis:'법적 근거', trainingText:'훈련 안내'};
    return Object.entries(value).filter(([key]) => Object.hasOwn(labels, key))
      .map(([key, item]) => {const text = dataText(item, depth + 1); return text ? `${labels[key]}: ${text}` : '';})
      .filter(Boolean).join(' · ');
  }
  return '';
}

function sourceIds(evidence, value) {
  const ids = [evidence?.sourceId, value?.sourceId];
  return [...new Set(ids.flat().filter(id => typeof id === 'string' && id))];
}

export function careerFieldViews(row) {
  return FIELD_DEFINITIONS.map(([key, label]) => {
    const value = row?.[key], evidence = row?.evidence?.[key];
    const lines = [], notes = [];
    let summary = '', fieldLabel = label;
    if (key === 'occupation') summary = clean(value?.name);
    else if (key === 'salary') {
      const salary = value && typeof value === 'object' ? value : {};
      const annual = ['year','annual','yearly','연간'].includes(salary.period);
      const monthly = ['month','monthly','월간'].includes(salary.period);
      const baseUnit = (clean(salary.unit) || '단위 미확인').replace(/\/(?:년|연|year|월|month)$/iu,'');
      const unit = baseUnit + (annual ? '/년' : monthly ? '/월' : '');
      fieldLabel = annual ? '연간 임금' : monthly ? '월간 임금' : '임금 (산정기간 미확인)';
      for (const [property, name] of [['average','평균'],['median','중앙값'],['lowerQuartile','하위 25% 경계값'],['upperQuartile','상위 25% 경계값']]) {
        lines.push(`${name}: ${formatCareerNumber(salary[property], unit)}`);
      }
      summary = numeric(salary.average) ? `평균 ${formatCareerNumber(salary.average, unit)}` : '평균 임금 미확인';
      if (!annual && !monthly) notes.push('원본에서 임금의 산정기간을 확인하지 못했습니다. 연봉이나 월급으로 단정하지 않습니다.');
      if (clean(salary.referenceDate)) notes.push(`임금 자료 공개 스냅샷: ${salary.referenceDate} · 실제 조사연도는 별도 확인`);
      notes.push('평균과 중앙값은 서로 다른 통계량입니다. 확인한 값만 구분하여 표시합니다.');
    } else if (key === 'education' && value && typeof value === 'object' && !Array.isArray(value)) {
      summary = dataText(value.trainingText ?? value.training) || dataText(value.required) || '필수 학력·훈련 요건 미확인';
      lines.push(`법적으로 필수인 학력: ${dataText(value.required) || '미확인'}`);
      const distribution = value.attainmentDistribution;
      if (distribution && typeof distribution === 'object') {
        const values = Array.isArray(distribution.values) ? distribution.values : [];
        for (const entry of values) {
          if (clean(entry?.label)) lines.push(`${entry.label}: ${formatCareerNumber(entry.value)}`);
        }
        if (values.length) notes.push(`재직자 학력분포 원값 · 단위 ${clean(distribution.unit) || '미확인'} · 조사연도 ${clean(distribution.surveyYear) || '미확인'}`);
        if (clean(distribution.sourceSnapshotDate)) notes.push(`자료 스냅샷: ${distribution.sourceSnapshotDate}`);
      }
      if (clean(value.note)) notes.push(value.note);
      notes.push('재직자 학력분포나 일반적인 준비 안내를 법적 취업 요건으로 해석하지 않습니다.');
    } else summary = dataText(value);
    if (clean(value?.verifiedAsOf)) notes.push(`법령 확인일: ${value.verifiedAsOf}. 실제 법령 시행일과 개인별 충족 여부는 출처에서 별도로 확인해 주세요.`);
    const missingReason = reasonText(evidence?.missingReason);
    return {key, label:fieldLabel, summary:summary || '미확인', lines, notes,
      missingReason:missingReason || (!summary ? '이 항목을 확인할 수 있는 검증 자료를 확보하지 못했습니다.' : ''),
      sourceIds:sourceIds(evidence, value)};
  });
}

/** Information browsing only. onSelect reports a viewed record, never employment. */
export function createCareerBrowser({catalog, onOpen, onClose, onSelect} = {}) {
  validateCareerCatalog(catalog);
  const document = globalThis.document;
  if (!document?.body) throw new TypeError('직업 탐색을 표시할 문서가 필요합니다.');
  if (document.getElementById('career-info')) throw new Error('직업 탐색 팝업은 한 번만 생성해 주세요.');
  const make = (tag, className = '', text = '') => {
    const node = document.createElement(tag); node.className = className;
    if (text) node.textContent = displayCopy(text);
    return node;
  };
  const button = (className, text) => {const b = make('button',className,text);b.type='button';return b;};
  const dialog = make('dialog','career-dialog'); dialog.id = 'career-info'; dialog.setAttribute('aria-labelledby','career-title');
  const header = make('div','career-header'), title = make('h2','','직업 찾아보기'); title.id='career-title';title.tabIndex=-1;
  const x = button('career-close','×');x.setAttribute('aria-label','직업 탐색 닫기');header.append(title,x);
  const intro = make('p','career-intro','직업별 학력·임금·근무조건을 찾아봅니다.');
  const controls = make('div','career-search-controls');
  const searchLabel = make('label','','직업명·분류명·코드 검색'), search = make('input');
  search.id='career-search';search.type='search';search.autocomplete='off';search.placeholder='예: 개발, 간호, 채굴';searchLabel.htmlFor=search.id;
  const groupLabel = make('label','','직업 분류'), group = make('select');group.id='career-group';groupLabel.htmlFor=group.id;
  const all = make('option','','모든 분류');all.value='';group.append(all);
  for (const name of [...new Set(catalog.occupations.map(groupOf))].sort((a,b) => a.localeCompare(b,'ko-KR'))) {
    const option = make('option','',name);option.value=name;group.append(option);
  }
  const searchBox = make('div'), groupBox = make('div');searchBox.append(searchLabel,search);groupBox.append(groupLabel,group);controls.append(searchBox,groupBox);
  const body = make('div','career-body'), listPane = make('section','career-list-pane');listPane.setAttribute('aria-label','직업 검색 결과');
  const count = make('div','career-result-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
  const list = make('ul','career-results'), more = button('career-more','20개 더 보기');
  listPane.append(count,list,more);
  const detail = make('section','career-detail');detail.setAttribute('aria-label','선택한 직업 정보');
  body.append(listPane,detail);dialog.append(header,intro,controls,body);document.body.append(dialog);
  const rows = new Map(catalog.occupations.map(row => [row.id,row]));
  let limit = PAGE_SIZE, selectedId = null, reportedOpen = false;

  function renderResults() {
    const found = searchOccupations(catalog.occupations,search.value,group.value);
    list.replaceChildren();
    const visible = found.slice(0,limit);
    if (!visible.some(row => row.id === selectedId)) selectedId = visible[0]?.id ?? null;
    count.replaceChildren();appendUiFacts(document,count,[['검색 결과',`${found.length.toLocaleString('ko-KR')}개 직업`],['표시 중',`${visible.length.toLocaleString('ko-KR')}개`]],'career-summary-facts');
    for (const row of visible) {
      const item = make('li'), choose = button('career-result','');
      choose.setAttribute('aria-pressed',String(row.id===selectedId));
      choose.append(make('strong','',row.occupation.name),make('span','',groupOf(row)));
      choose.addEventListener('click',() => select(row.id,true));item.append(choose);list.append(item);
    }
    if (!found.length) list.append(make('li','career-empty','일치하는 직업이 없습니다. 검색어나 분류를 바꿔 주세요.'));
    more.hidden=visible.length>=found.length;
    return rows.get(selectedId) ?? null;
  }

  function renderDetail(row, focus = false) {
    detail.replaceChildren();
    if (!row) {detail.append(make('h3','','직업 정보'),make('p','career-empty','목록에서 직업을 고르면 자세한 정보를 보여줍니다.'));return;}
    const back = button('career-back','검색으로 돌아가기 ↑');back.addEventListener('click',() => search.focus());
    const heading = make('h3','career-occupation-title',row.occupation.name);heading.tabIndex=-1;
    const c = row.occupation.classification || {};
    detail.append(back,heading);appendUiFacts(document,detail,[['직업 분류',groupOf(row)],['분류 코드 체계',clean(c.system)],['분류 기준',clean(c.referenceDate)||'미확인']],'career-summary-facts');
    const fields = make('dl','career-fields');
    for (const view of careerFieldViews(row)) {
      const field = make('div','career-field'), label = make('dt','',view.label), value = make('dd');
      const summary=make('ul','career-value-list');for(const line of displayLines(view.summary))summary.append(make('li','career-value',line));value.append(summary);
      if (view.lines.length) {const lines=make('ul','career-values');for(const text of view.lines) lines.append(make('li','',text));value.append(lines);}
      field.append(label,value);fields.append(field);
    }
    const modelViews=careerModelFieldViews(row);
    if(modelViews.length){
      const section=make('section','career-model-section');
      section.append(make('h4','','직업 특성'));
      const modelFields=make('dl','career-fields');
      for(const view of modelViews){
        const field=make('div','career-field'),label=make('dt','',view.label),value=make('dd');
        const summary=make('ul','career-value-list');for(const line of displayLines(view.summary))summary.append(make('li','career-value',line));value.append(summary);
        if(view.lines.length){const list=make('ul','career-values');for(const line of view.lines)list.append(make('li','',line));value.append(list);}
        field.append(label,value);modelFields.append(field);
      }
      section.append(modelFields);detail.append(section,make('h4','','자격·임금 정보'));
    }
    detail.append(fields);
    if (focus) heading.focus();
  }

  function select(id, focus = false) {
    const row = rows.get(id);if(!row)return false;
    let found = searchOccupations(catalog.occupations,search.value,group.value);
    let index = found.findIndex(item => item.id === id);
    if (index < 0) {
      search.value='';group.value='';
      found=searchOccupations(catalog.occupations);
      index=found.findIndex(item => item.id === id);
    }
    limit=Math.max(limit,Math.ceil((index+1)/PAGE_SIZE)*PAGE_SIZE);
    selectedId=id;renderResults();renderDetail(row,focus);
    if(typeof onSelect==='function')onSelect(row);
    return true;
  }
  function refresh() {limit=PAGE_SIZE;renderDetail(renderResults());}
  search.addEventListener('input',refresh);group.addEventListener('change',refresh);
  more.addEventListener('click',() => {limit+=PAGE_SIZE;renderDetail(renderResults());});
  x.addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => {
    if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',() => {if(!reportedOpen)return;reportedOpen=false;if(typeof onClose==='function')onClose();});
  renderDetail(renderResults());
  return Object.freeze({
    dialog,
    get isOpen(){return dialog.open;},
    get selectedId(){return selectedId;},
    open(occupationId) {
      if(!dialog.open){dialog.showModal();reportedOpen=true;if(typeof onOpen==='function')onOpen();}
      if(typeof occupationId==='string'&&select(occupationId,true))return true;
      search.focus();return occupationId===undefined;
    },
    close(){if(dialog.open)dialog.close();},
  });
}
