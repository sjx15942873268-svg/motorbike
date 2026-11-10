const target = new EventTarget();

export function on(name, fn) {
  target.addEventListener(name, (e) => fn(e.detail));
  return () => target.removeEventListener(name, fn);
}

export function emit(name, detail) {
  target.dispatchEvent(new CustomEvent(name, { detail }));
}

export const BUS_EVENTS = [
  'view:change', 'explode:change', 'cutaway:change', 'light:toggle', 'horn',
  'box:toggle', 'signal:tick', 'order:delivered', 'part:focus', 'tour:step',
  'audio:unlock', 'app:ready',
];
