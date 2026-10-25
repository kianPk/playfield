/**
 * Immersive fullscreen for the playfield — hides mobile browser chrome
 * so the 3D canvas can fill the whole phone screen.
 */

export function isPlayfieldFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function getViewportSize() {
  // Prefer the largest available box so the canvas covers the phone,
  // including areas that sit under collapsed browser chrome.
  const vv = window.visualViewport;
  let w = window.innerWidth || document.documentElement.clientWidth || 1;
  let h = window.innerHeight || document.documentElement.clientHeight || 1;

  if (vv) {
    w = Math.max(w, Math.floor(vv.width));
    h = Math.max(h, Math.floor(vv.height));
  }

  if (isPlayfieldFullscreen() && window.screen) {
    w = Math.max(w, window.screen.width || 0);
    h = Math.max(h, window.screen.height || 0);
  }

  // iOS Safari: when chrome collapses, layout viewport grows — use that
  const lvh = window.innerHeight;
  h = Math.max(h, lvh);

  return {
    w: Math.max(1, Math.floor(w)),
    h: Math.max(1, Math.floor(h)),
  };
}

export function requestPlayfieldFullscreen() {
  if (isPlayfieldFullscreen()) return Promise.resolve(true);

  const el = document.getElementById('WEBGLcontainer') || document.documentElement;
  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;

  if (!req) return Promise.resolve(false);

  try {
    const opts = { navigationUI: 'hide' };
    const result = req.call(el, opts);
    if (result && typeof result.then === 'function') {
      return result.then(() => true).catch(() => {
        // Retry without options (older WebKit)
        try {
          const r2 = req.call(el);
          return Promise.resolve(r2).then(() => true).catch(() => false);
        } catch (e) {
          return false;
        }
      });
    }
    return Promise.resolve(true);
  } catch (e) {
    return Promise.resolve(false);
  }
}

let armed = false;

/** Enter fullscreen on the first user gesture (required by browsers). */
export function armFullscreenOnFirstGesture() {
  if (armed) return;
  armed = true;

  const go = () => {
    requestPlayfieldFullscreen().finally(() => {
      // Nudge iOS Safari to collapse the URL bar when possible
      try {
        window.scrollTo(0, 1);
      } catch (e) {}
      window.dispatchEvent(new Event('resize'));
    });
    window.removeEventListener('touchend', go, true);
    window.removeEventListener('click', go, true);
  };

  window.addEventListener('touchend', go, true);
  window.addEventListener('click', go, true);
}
