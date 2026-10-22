import {protagonistGender} from './person-identity.mjs?v=focused-play-1';
// Pure presentation model. It never changes life state, money or probabilities.
// Biomes are representative art directions, not official settlement statistics.
const AGE_STAGES = [
  [3, 'baby', '아기'], [6, 'toddler', '유아'], [13, 'child', '어린이'],
  [19, 'teen', '청소년'], [35, 'young', '청년'], [60, 'adult', '성인'],
  [Infinity, 'senior', '시니어'],
];
const WORKING = new Set(['재직', '계약직', '시간제', '프리랜서', '자영업']);
const METROPOLITAN = new Set(['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종']);
// Selected, clearly named coastal destinations get a coastal art backdrop.
// This is intentionally not an exhaustive classification of coastal districts.
const COASTAL = new Set([
  '부산|부산광역시', '인천|인천광역시', '울산|울산광역시',
  '강원|강릉시', '강원|동해시', '강원|속초시', '강원|삼척시', '강원|양양군',
  '전남|목포시', '전남|여수시', '전남|신안군', '전남|완도군', '전남|진도군',
  '경남|통영시', '경남|거제시', '경남|남해군',
  '경북|포항시', '경북|울릉군', '충남|태안군',
  '제주|제주시', '제주|서귀포시',
]);
const BIOME_LABELS = {metropolitan:'도시 풍경', coastal:'바닷가 풍경', regional:'지역 도시 풍경', rural:'들녘 풍경'};
const ROLE_LABELS = {school:'배움', office:'일과 업무', field:'현장과 기술', shop:'상점과 서비스', military:'복무', rest:'일상과 휴식'};
const text = value => typeof value === 'string' ? value : '';

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return hash >>> 0;
}

function housingKind(label) {
  if (label === '보호자 집' || label === '가족·지인과 동거') return 'family';
  if (label === '기숙사') return 'dorm';
  if (label.includes('월세')) return 'rent';
  return 'other';
}

function educationState(state) {
  if (state.schooling?.status === 'enrolled') return state.service?.active === true ? 'leave' : 'enrolled';
  if (state.schooling?.status === 'graduated') return 'graduated';
  const education = text(state.education);
  if (education.includes('휴학')) return 'leave';
  if (/초등학교 재학|중학교 재학|일반계 고교 경로|직업계 고교 경로|고교 · 창작 활동/.test(education)) return 'school';
  return 'none';
}

function activeRole(state, study) {
  // A student on military leave keeps education history but uses military props.
  if (state.service?.active === true) return {key:'military', reason:'service.active'};
  if (['cadet','officer'].includes(state.academy?.status)) return {key:'military', reason:`academy.${state.academy.status}`};
  if (study === 'enrolled' || study === 'school') return {key:'school', reason:study === 'enrolled' ? 'schooling.enrolled' : 'education.current-school'};
  const status = text(state.job?.status);
  if (WORKING.has(status)) {
    const title = text(state.job?.title);
    if (/기술|설비|현장|전기공/.test(title)) return {key:'field', reason:'working.technical-title'};
    if (/상점|매장|판매|식당|카페/.test(title)) return {key:'shop', reason:'working.retail-title'};
    // Project contracts and generic part-time work do not imply retail work.
    return {key:'office', reason:/사무|운영|프로젝트/.test(title) ? 'working.office-title' : 'working.generic-props'};
  }
  return {key:'rest', reason:state.retired === true ? 'retired.not-working' : 'not-working'};
}

/**
 * Stable render descriptor from the engine's actual fields.
 * Age artwork and activity props are separate layers. Character gender follows
 * the same saved/stable identity shown by the game; names never determine art.
 * An unknown current city stays unknown: birth city and province capitals are
 * never substituted for residence.city. No map or population data is changed.
 */
export function deriveLifeScene(state, data = {}) {
  if (!state || !Number.isInteger(state.age) || state.age < 0) throw new TypeError('장면에는 유효한 현재 나이가 필요합니다.');
  const age = state.age;
  const characterGender = protagonistGender(state)==='여성'?'female':'male';
  const [, ageStage, ageLabel] = AGE_STAGES.find(([limit]) => age < limit);
  const region = text(state.residence?.region);
  const city = text(state.residence?.city);
  const housingLabel = text(state.residence?.housing) || '주거 미기록';
  const housing = housingKind(housingLabel);
  const match = Array.isArray(data.birthCities)
    ? data.birthCities.find(row => row?.region === region && row?.name === city)
    : undefined;
  const cityId = typeof match?.id === 'string' ? match.id : null;
  const locationIdentity = cityId || JSON.stringify([region, city]);
  const cityVariant = stableHash(locationIdentity);
  const knownCity = Boolean(cityId);
  let biome;
  if (COASTAL.has(`${region}|${city}`)) biome = 'coastal';
  else if (METROPOLITAN.has(region)) biome = 'metropolitan';
  else if (knownCity && city.endsWith('군')) biome = 'rural';
  else biome = 'regional';
  const study = educationState(state);
  const activity = activeRole(state, study);
  const role = activity.key;
  const jobLabel = text(state.job?.title) || '활동 미기록';
  const employmentLabel = text(state.job?.status) || '상태 미기록';
  const educationLabel = text(state.education);
  const residenceLabel = [region, city].filter(Boolean).join(' · ') || '거주지 미기록';
  const serviceActive = state.service?.active === true;
  const academyActive = ['cadet','officer'].includes(state.academy?.status);
  const serviceBranch = text(state.service?.branch) || (academyActive ? ({army:'육군',navy:'해군',airforce:'공군'})[state.academy?.branch] || '' : '');
  const jobIdentity = JSON.stringify([jobLabel, employmentLabel, state.retired === true, serviceActive, serviceBranch, study,...(academyActive?[state.academy.status]:[])]);
  const roleLabel = serviceActive ? `${serviceBranch || '군'} 복무 중` : academyActive ? jobLabel : ROLE_LABELS[role];
  // This includes location identity even when two places share one biome or a
  // renderer chooses the same bounded atlas variant from cityVariant.
  const sceneKey = [characterGender, ageStage, role, biome, housing, locationIdentity, housingLabel, jobIdentity].map(encodeURIComponent).join(':');
  return {
    schemaVersion:1,
    sceneKey,
    label:`${age}세 ${ageLabel} · ${roleLabel} · ${residenceLabel} · ${housingLabel}`,
    age, ageStage, ageLabel, characterAge:ageStage, characterGender,
    role, roleLabel, roleReason:activity.reason,
    jobLabel, employmentLabel, educationLabel, educationState:study,
    retired:state.retired === true,
    serviceActive, serviceBranch,
    region, city, cityId, knownCity,
    sourceRegion:knownCity ? text(match.sourceRegion) : null,
    residenceLabel, housing, housingLabel,
    biome, biomeLabel:BIOME_LABELS[biome],
    biomeNote:'시군구·주거 정보를 바탕으로 고른 대표 연출 배경이며 실제 동네의 경관·밀도 통계가 아닙니다.',
    cityVariant,
    jobVariant:stableHash(jobIdentity),
    layers:{background:biome, housing, character:ageStage, activity:role, props:role},
  };
}
