import {initScrollHints} from './scroll-hints.mjs?v=ux-design-1';
const controllers = new WeakMap();
const WIDE_QUERY = '(min-width: 1024px)';

/** Per-layout disclosure preferences last for this document's lifetime. */
export function initResponsiveLayout(options = {}) {
  const document = options.document ?? globalThis.document;
  initScrollHints(document);
  const resume=document?.getElementById('resume'),start=document?.getElementById('start');
  if(resume&&start){
    const updateStart=()=>{const available=!resume.hidden;resume.classList.toggle('primary',available);resume.classList.toggle('secondary',!available);start.classList.toggle('primary',!available);start.classList.toggle('secondary',available);start.closest?.('.start-box')?.setAttribute('data-has-save',String(available));};
    updateStart();if(typeof MutationObserver==='function')new MutationObserver(updateStart).observe(resume,{attributes:true,attributeFilter:['hidden']});
  }
  const details = document?.getElementById('profile-details');
  const button = document?.getElementById('profile-details-toggle');
  const content = document?.getElementById('profile-details-content');
  const root = document?.documentElement;
  const native = details?.tagName?.toLowerCase() === 'details';
  if (!details || (!native && (!button || !content)) || !root?.dataset) return null;
  if (controllers.has(details)) return controllers.get(details);

  const preferences = {wide: null, stacked: null};
  const actions = document.getElementById('life-actions');
  const actionPreferences = {wide:null,stacked:null};
  let appliedActions = Boolean(actions?.open);
  let mode = null;
  const isOpen = () => native ? Boolean(details.open) : !content.hidden;
  function setOpen(open) {
    if (native) details.open = open;
    else {content.hidden = !open;button.setAttribute('aria-expanded',String(open));}
  }
  let appliedOpen = isOpen();
  let media = null;
  try {
    const matchMedia = options.matchMedia ?? globalThis.matchMedia;
    if (typeof matchMedia === 'function') media = matchMedia.call(globalThis, WIDE_QUERY);
  } catch { /* An unavailable media API uses the native narrow layout. */ }

  function rememberUserChoice() {
    const open = isOpen();
    if (mode !== null && open !== appliedOpen) {
      preferences[mode] = open;
      appliedOpen = open;
    }
  }

  function applyMode(nextMode) {
    // A user's native toggle may already have changed .open while its event is
    // still queued. Attribute that choice to the old mode before switching.
    rememberUserChoice();
    if(actions && mode!==null && actions.open!==appliedActions) actionPreferences[mode]=actions.open;
    mode = nextMode;
    root.dataset.layout = mode;
    appliedOpen = preferences[mode] ?? (mode === 'wide');
    setOpen(appliedOpen);
    if(actions){appliedActions=actionPreferences[mode]??(mode==='wide');actions.open=appliedActions;}
  }

  actions?.addEventListener('toggle',()=>{if(mode!==null && actions.open!==appliedActions){actionPreferences[mode]=actions.open;appliedActions=actions.open;}});

  if(native) details.addEventListener('toggle', rememberUserChoice);
  else button.addEventListener('click',()=>{setOpen(!isOpen());rememberUserChoice();});
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
    get open() { return isOpen(); },
  });
  controllers.set(details, controller);
  return controller;
}
