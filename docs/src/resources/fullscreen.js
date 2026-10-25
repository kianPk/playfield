/**
 * Immersive fullscreen — hide mobile browser chrome so the 3D scene
 * paints edge-to-edge on the phone.
 */

export function isPlayfieldFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isTouchMobile() {
  return (
    'ontouchstart' in window ||
    (window.navigator && window.navigator.msPointerEnabled) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

export function getViewportSize() {
  const vv = window.visualViewport;
  let w = window.innerWidth || document.documentElement.clientWidth || 1;
  let h = window.innerHeight || document.documentElement.clientHeight || 1;

  // Pin to the VISIBLE web area (between browser chrome) unless immersive
  if (vv && !isPlayfieldFullscreen() && !isStandaloneApp()) {
    w = Math.max(1, Math.floor(vv.width));
    h = Math.max(1, Math.floor(vv.height));
  }

  if ((isPlayfieldFullscreen() || isStandaloneApp()) && window.screen) {
    w = Math.max(w, window.screen.width || 0);
    h = Math.max(h, window.screen.height || 0);
  }

  return {
    w: Math.max(1, Math.floor(w)),
    h: Math.max(1, Math.floor(h)),
  };
}

/** Apply exact pixel size to html/body/container so nothing letterboxes. */
export function pinDomToViewport() {
  const { w, h } = getViewportSize();
  const vv = window.visualViewport;
  const top = vv && !isPlayfieldFullscreen() ? Math.floor(vv.offsetTop || 0) : 0;
  const left = vv && !isPlayfieldFullscreen() ? Math.floor(vv.offsetLeft || 0) : 0;

  const apply = (el) => {
    if (!el) return;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  };

  apply(document.getElementById('WEBGLcontainer'));
  const canvas = document.querySelector('#WEBGLcontainer canvas, canvas');
  if (canvas) {
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.top = top + 'px';
    canvas.style.left = left + 'px';
  }

  document.documentElement.style.height = h + 'px';
  document.body.style.height = h + 'px';
  document.body.style.width = w + 'px';

  return { w, h, top, left };
}

export function requestPlayfieldFullscreen() {
  if (isPlayfieldFullscreen() || isStandaloneApp()) return Promise.resolve(true);

  const candidates = [
    document.getElementById('WEBGLcontainer'),
    document.querySelector('canvas'),
    document.documentElement,
    document.body,
  ].filter(Boolean);

  const tryEl = (el) => {
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitRequestFullScreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (!req) return Promise.resolve(false);
    try {
      const result = req.call(el, { navigationUI: 'hide' });
      if (result && typeof result.then === 'function') {
        return result.then(() => true).catch(() => {
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
  };

  let chain = Promise.resolve(false);
  candidates.forEach((el) => {
    chain = chain.then((ok) => (ok ? true : tryEl(el)));
  });
  return chain;
}

/**
 * Show a full-bleed "tap for fullscreen" gate on phones (hides browser chrome).
 * On iOS Safari where Fullscreen API is blocked, show Add-to-Home-Screen help.
 */
export function showMobileFullscreenGate(onReady) {
  if (!isTouchMobile() || isStandaloneApp() || isPlayfieldFullscreen()) {
    if (onReady) onReady();
    return;
  }

  const existing = document.getElementById('fs-gate');
  if (existing) existing.remove();

  const gate = document.createElement('div');
  gate.id = 'fs-gate';
  gate.setAttribute('role', 'button');
  gate.innerHTML =
    '<div class="fs-gate-card">' +
    '<div class="fs-gate-title">تمام‌صفحه</div>' +
    '<div class="fs-gate-sub">برای پر شدن کامل صفحه گوشی ضربه بزن</div>' +
    '<div class="fs-gate-hint" id="fs-gate-hint" hidden></div>' +
    '</div>';
  document.body.appendChild(gate);

  const finish = (ok) => {
    gate.classList.add('fs-gate-out');
    setTimeout(() => {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
    }, 280);
    window.dispatchEvent(new Event('resize'));
    if (onReady) onReady();
    if (!ok) maybeShowIosInstallTip();
  };

  const activate = (ev) => {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    requestPlayfieldFullscreen().then((ok) => {
      finish(!!ok);
    });
  };

  gate.addEventListener('touchend', activate, { once: true, passive: false });
  gate.addEventListener('click', activate, { once: true });
}

function maybeShowIosInstallTip() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios || isStandaloneApp()) return;
  if (document.getElementById('ios-a2hs')) return;

  const tip = document.createElement('div');
  tip.id = 'ios-a2hs';
  tip.innerHTML =
    '<span>آیفون: Share → <b>Add to Home Screen</b> تا واقعاً تمام‌صفحه شود</span>' +
    '<button type="button" aria-label="بستن">×</button>';
  document.body.appendChild(tip);
  tip.querySelector('button').addEventListener('click', () => tip.remove());
}

/** Legacy hook used by enterWorld — opens the gate on phones. */
export function armFullscreenOnFirstGesture() {
  showMobileFullscreenGate();
}
