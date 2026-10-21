export const TEXT_SIZE = Object.freeze({
  storageKey: 'koreanlife-text-size-v1',
  defaultPercent: 100,
  minPercent: 75,
  maxPercent: 150,
  stepPercent: 5,
});

/** Only the supported 5% levels are restored; corrupt storage uses 100%. */
export function parseTextSize(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d{2,3}$/.test(value))) {
    return TEXT_SIZE.defaultPercent;
  }
  const percent = Number(value);
  return Number.isInteger(percent) && percent >= TEXT_SIZE.minPercent &&
    percent <= TEXT_SIZE.maxPercent && percent % TEXT_SIZE.stepPercent === 0
    ? percent : TEXT_SIZE.defaultPercent;
}

/** direction is one button press: -1 decreases and +1 increases by 5%. */
export function moveTextSize(value, direction) {
  if (direction !== -1 && direction !== 1) throw new TypeError('글씨 크기 방향은 -1 또는 1이어야 합니다.');
  return Math.max(TEXT_SIZE.minPercent, Math.min(TEXT_SIZE.maxPercent,
    parseTextSize(value) + direction * TEXT_SIZE.stepPercent));
}

const controllers = new WeakMap();

/** Creates controls in #text-size-controls; no changes to game saves or timers. */
export function initTextSize(options = {}) {
  const document = options.document ?? globalThis.document;
  const host = document?.getElementById('text-size-controls');
  if (!host || !document.documentElement?.style) return null;
  if (controllers.has(host)) return controllers.get(host);
  let storage;
  try {
    storage = Object.prototype.hasOwnProperty.call(options, 'storage')
      ? options.storage : globalThis.localStorage;
  } catch { /* A denied storage getter still allows in-memory controls. */ }
  let percent = TEXT_SIZE.defaultPercent;
  try { percent = parseTextSize(storage?.getItem(TEXT_SIZE.storageKey)); } catch {}

  const decrease = document.createElement('button');
  const value = document.createElement('output');
  const increase = document.createElement('button');
  decrease.type = increase.type = 'button';
  decrease.className = increase.className = 'text-size-button';
  decrease.textContent = '−';
  increase.textContent = '+';
  decrease.setAttribute('aria-label', '글씨 크기 5% 줄이기');
  increase.setAttribute('aria-label', '글씨 크기 5% 키우기');
  value.className = 'text-size-value';
  value.setAttribute('role', 'status');
  value.setAttribute('aria-live', 'polite');
  value.setAttribute('aria-atomic', 'true');
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', '글씨 크기');
  host.replaceChildren(decrease, value, increase);

  function render() {
    document.documentElement.style.setProperty('--user-text-scale', String(percent / 100));
    value.textContent = `${percent}%`;
    value.setAttribute('aria-label', `글씨 크기 ${percent}%`);
    decrease.disabled = percent === TEXT_SIZE.minPercent;
    increase.disabled = percent === TEXT_SIZE.maxPercent;
    host.dataset.textSize = String(percent);
  }
  function move(direction) {
    const next = moveTextSize(percent, direction);
    if (next === percent) return;
    percent = next;
    render();
    try { storage?.setItem(TEXT_SIZE.storageKey, String(percent)); } catch {}
  }
  decrease.addEventListener('click', () => move(-1));
  increase.addEventListener('click', () => move(1));
  const controller = Object.freeze({get percent() { return percent; }});
  controllers.set(host, controller);
  render();
  return controller;
}
