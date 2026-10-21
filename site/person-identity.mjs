/** Fictional identity, stable across reloads and independent of names or job eligibility. */
export function protagonistGender(life) {
  if (['남성','여성'].includes(life?.profile?.gender)) return life.profile.gender;
  if (!life?.seed) return '미기록';
  let hash = 2166136261;
  for (const c of `protagonist-gender-1|${life.seed}`) hash = Math.imul(hash ^ c.charCodeAt(0),16777619);
  return hash >>> 0 & 1 ? '여성' : '남성';
}
