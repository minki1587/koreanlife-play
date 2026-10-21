const controllers = new WeakMap();
const WIDE_QUERY = '(min-width: 1024px)';

/** Native details layout only; preferences last for this document's lifetime. */
export function initResponsiveLayout(options = {}) {
  const document = options.document ?? globalThis.document;
  const details = document?.getElementById('profile-details');
  const root = document?.documentElement;
  if (!details || details.tagName?.toLowerCase() !== 'details' || !root?.dataset) return null;
  if (controllers.has(details)) return controllers.get(details);

  const preferences = {wide: null, stacked: null};
  let mode = null;
  let appliedOpen = Boolean(details.open);
  let media = null;
  try {
    const matchMedia = options.matchMedia ?? globalThis.matchMedia;
    if (typeof matchMedia === 'function') media = matchMedia.call(globalThis, WIDE_QUERY);
  } catch { /* An unavailable media API uses the native narrow layout. */ }

  function rememberUserChoice() {
    const open = Boolean(details.open);
    if (mode !== null && open !== appliedOpen) {
      preferences[mode] = open;
      appliedOpen = open;
    }
  }

  function applyMode(nextMode) {
    // A user's native toggle may already have changed .open while its event is
    // still queued. Attribute that choice to the old mode before switching.
    rememberUserChoice();
    mode = nextMode;
    root.dataset.layout = mode;
    appliedOpen = preferences[mode] ?? (mode === 'wide');
    if (Boolean(details.open) !== appliedOpen) details.open = appliedOpen;
  }

  details.addEventListener('toggle', rememberUserChoice);
  // Programmatic open/close events are asynchronous and can be coalesced.
  // Reading the current DOM against appliedOpen ignores those late events
  // without discarding a subsequent user's actual change.
  applyMode(media?.matches === true ? 'wide' : 'stacked');
  const onMediaChange = event => {
    const wide = typeof event?.matches === 'boolean' ? event.matches : media?.matches === true;
    applyMode(wide ? 'wide' : 'stacked');
  };
  if (typeof media?.addEventListener === 'function') media.addEventListener('change', onMediaChange);
  else if (typeof media?.addListener === 'function') media.addListener(onMediaChange);

  const controller = Object.freeze({
    get mode() { return mode; },
    get open() { return Boolean(details.open); },
  });
  controllers.set(details, controller);
  return controller;
}
