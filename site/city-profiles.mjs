// Display-only facts: never feed these current names into the 2025 birth lottery.
export function cityProfileIndex(catalog,cities){
  if(catalog?.version!=='city-profiles-1'||!Array.isArray(catalog.cities)||catalog.cities.length!==cities.length)throw new Error('city profiles');
  const sources=new Set(catalog.sources?.map(s=>s.id)),index=new Map();
  for(const row of catalog.cities){
    if(index.has(row.id)||typeof row.summary!=='string'||!row.summary.trim()||row.summary.length>110||!Array.isArray(row.currentAreas)||row.currentAreas.some(s=>typeof s!=='string'||!s.trim())||!Array.isArray(row.sourceIds)||!row.sourceIds.length||row.sourceIds.some(id=>!sources.has(id)))throw new Error('city profile entry');
    index.set(row.id,Object.freeze({...row,currentAreas:Object.freeze([...row.currentAreas])}));
  }
  if(cities.some(c=>!index.has(c.id)))throw new Error('city profile coverage');
  return index;
}
export function currentAreaCaption(profile){
  return profile?.currentAreas?.length?`(현재: ${profile.currentAreas.join(' · ')})`:'';
}
