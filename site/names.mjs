// Hand-written fictional name combinations. These are not population weights
// or a database of people; every permitted full-name combination is equiprobable.
const SURNAMES = Object.freeze('김 이 박 최 정 강 조 윤 장 임 한 오 서 신 권 황 안 송 류 홍 유 전 고 문 양 손 배 백 허 남 심 노 하 곽 성 차 주 우 구 민 진 지 엄 채 원 천 방 공 현 함'.split(' '));
const GIVEN_NAMES = Object.freeze('서준 서연 지우 민준 도윤 하준 예준 시우 지호 주원 수호 준우 현우 지훈 도현 건우 우진 선우 서진 유준 태윤 준서 연우 은우 시윤 정우 승우 승현 시후 지한 하율 민재 준혁 수빈 하린 지유 서아 하윤 지아 서윤 채원 수아 다은 예은 소율 유나 예린 아린 채은 윤서 지원 소윤 지민 시은 다인 나은 소연 은서 서현 민서 하은 윤아 다현 수현 세아 유진 가은 나연 보민 태린 예나 서하 해준 온유 나린 도하 이든 수민 은호 규민 재윤 가람 다온 하랑 한결 슬기 보라 소담 단아 혜원 은채 유하 다솜 산하 시온 지안 서율 도영 혜린 수연'.split(' '));
// Guard surname/name boundaries too. This filter applies to suggestions only;
// an explicitly entered name is preserved by resolveLifeName.
const BLOCKED_PARTS = Object.freeze(['씨발','시발','씨팔','시팔','좆','씹','병신','새끼','개새','개년','개놈','걸레','보지','자지','섹스','변태','염병','지랄','애미','애비','니미','호로','노예']);
const CANDIDATES = SURNAMES.flatMap(surname => GIVEN_NAMES.map(givenName => surname + givenName));
const NAME_POOL = Object.freeze(CANDIDATES.filter(name => !BLOCKED_PARTS.some(part => name.includes(part))));
const UINT32_RANGE = 0x100000000;
const MAX_ATTEMPTS = 128;

export const NAME_POOL_STATS = Object.freeze({
  surnameCount: SURNAMES.length,
  givenNameCount: GIVEN_NAMES.length,
  candidateCount: CANDIDATES.length,
  excludedCount: CANDIDATES.length - NAME_POOL.length,
  allowedCount: NAME_POOL.length,
});

function cryptoUint32() {
  const crypto = globalThis.crypto;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('한국 이름 생성에는 WebCrypto가 필요합니다.');
  }
  const word = new Uint32Array(1);
  crypto.getRandomValues(word);
  return word[0];
}

/** The optional injection returns one unsigned 32-bit integer per invocation. */
export function randomKoreanName(randomUint32 = cryptoUint32) {
  if (typeof randomUint32 !== 'function') throw new TypeError('randomUint32는 함수여야 합니다.');
  const limit = UINT32_RANGE - (UINT32_RANGE % NAME_POOL.length);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const value = randomUint32();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new TypeError('난수는 0부터 4294967295 사이의 정수여야 합니다.');
    }
    // The accepted interval contains an equal number of every pool index.
    // Rejection avoids modulo bias without falling back to Math.random.
    if (value < limit) return NAME_POOL[value % NAME_POOL.length];
  }
  throw new RangeError('유효한 이름 추첨 난수를 얻지 못했습니다.');
}

/** Pure: a blank input uses the already displayed suggestion without redrawing. */
export function resolveLifeName(input, fallbackName) {
  if (typeof input !== 'string') throw new TypeError('이름 입력은 문자열이어야 합니다.');
  const entered = input.trim().slice(0, 16);
  if (entered) return entered;
  if (typeof fallbackName !== 'string' || !fallbackName.trim()) {
    throw new TypeError('빈 이름에는 표시된 추천 이름이 필요합니다.');
  }
  // Match input[maxlength=16] and the engine's existing UTF-16 length contract.
  return fallbackName.trim().slice(0, 16);
}
