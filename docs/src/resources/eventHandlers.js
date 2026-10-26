// Keyboard + mobile tilt / touch steering

export let moveDirection = { left: 0, right: 0, forward: 0, back: 0 };

export function setupEventHandlers() {
  window.addEventListener("keydown", handleKeyDown, false);
  window.addEventListener("keyup", handleKeyUp, false);
}

function handleKeyDown(event) {
  let keyCode = event.keyCode;

  switch (keyCode) {
    case 87: //W: FORWARD
    case 38: //up arrow
      moveDirection.forward = 1;
      break;

    case 83: //S: BACK
    case 40: //down arrow
      moveDirection.back = 1;
      break;

    case 65: //A: LEFT
    case 37: //left arrow
      moveDirection.left = 1;
      break;

    case 68: //D: RIGHT
    case 39: //right arrow
      moveDirection.right = 1;
      break;
  }
}

function handleKeyUp(event) {
  let keyCode = event.keyCode;

  switch (keyCode) {
    case 87: //FORWARD
    case 38:
      moveDirection.forward = 0;
      break;

    case 83: //BACK
    case 40:
      moveDirection.back = 0;
      break;

    case 65: //LEFT
    case 37:
      moveDirection.left = 0;
      break;

    case 68: //RIGHT
    case 39:
      moveDirection.right = 0;
      break;
  }
}

export function isTouchscreenDevice() {
  let supportsTouch = false;
  if ("ontouchstart" in window)
    supportsTouch = true;
  else if (window.navigator.msPointerEnabled)
    supportsTouch = true;
  else if ("ontouchstart" in document.documentElement)
    supportsTouch = true;
  else if (navigator.maxTouchPoints > 0)
    supportsTouch = true;

  return supportsTouch;
}

export function touchEvent(coordinates) {
  const dead = 18;
  if (coordinates.x > dead) {
    moveDirection.right = 1;
    moveDirection.left = 0;
  } else if (coordinates.x < -dead) {
    moveDirection.left = 1;
    moveDirection.right = 0;
  } else {
    moveDirection.right = 0;
    moveDirection.left = 0;
  }

  if (coordinates.y > dead) {
    moveDirection.back = 1;
    moveDirection.forward = 0;
  } else if (coordinates.y < -dead) {
    moveDirection.forward = 1;
    moveDirection.back = 0;
  } else {
    moveDirection.forward = 0;
    moveDirection.back = 0;
  }
}

let tiltEnabled = false;
export let joystickActive = false;
let tiltPermissionAsked = false;
let lastOrientMs = 0;
let touchSteering = false;
let touchId = null;
let touchOrigin = null;
let motionBanner = null;

function setAxes(leftRight, forwardBack) {
  // leftRight > 0 → right, forwardBack > 0 → back (into scene)
  const lr = Math.max(-1, Math.min(1, leftRight));
  const fb = Math.max(-1, Math.min(1, forwardBack));
  moveDirection.right = lr > 0 ? lr : 0;
  moveDirection.left = lr < 0 ? -lr : 0;
  moveDirection.back = fb > 0 ? fb : 0;
  moveDirection.forward = fb < 0 ? -fb : 0;
}

function clearAxes() {
  moveDirection.forward = 0;
  moveDirection.back = 0;
  moveDirection.left = 0;
  moveDirection.right = 0;
}

function tiltAxis(value, dead, span) {
  const mag = Math.abs(value);
  if (mag <= dead) return 0;
  const signed = value < 0 ? -1 : 1;
  return signed * Math.min(1, (mag - dead) / span);
}

function applyTilt(leftRight, forwardBack) {
  // Soft deadzone so small natural hand shake doesn't drift,
  // but intentional ~8–15° tilts clearly roll the globe.
  const lr = tiltAxis(leftRight, 2.5, 16);
  const fb = tiltAxis(forwardBack, 2.5, 16);
  // Don't fight active finger steering
  if (touchSteering) return;
  setAxes(lr, fb);
}

function screenAngle() {
  if (typeof window.orientation === "number") return window.orientation;
  if (window.screen.orientation && typeof window.screen.orientation.angle === "number") {
    return window.screen.orientation.angle;
  }
  return 0;
}

export function needsTiltPermission() {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  );
}

export function requestTiltPermission() {
  const tasks = [];
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    tasks.push(
      DeviceOrientationEvent.requestPermission()
        .then((state) => state === "granted")
        .catch(() => false)
    );
  }
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    tasks.push(
      DeviceMotionEvent.requestPermission()
        .then((state) => state === "granted")
        .catch(() => false)
    );
  }
  if (!tasks.length) return Promise.resolve(true);
  // Require ALL available permissions when possible; accept any grant as usable
  return Promise.all(tasks).then((results) => results.some(Boolean));
}

function hideMotionBanner() {
  if (motionBanner && motionBanner.parentNode) {
    motionBanner.parentNode.removeChild(motionBanner);
  }
  motionBanner = null;
}

function showMotionBanner(onEnable) {
  if (motionBanner || !document.body) return;
  const el = document.createElement("button");
  el.type = "button";
  el.id = "tilt-enable-btn";
  el.setAttribute("aria-label", "Enable motion controls");
  el.innerHTML =
    "<strong>Enable tilt</strong><span>Tap once — then tilt the phone to roll the earth. You can also drag with your finger.</span>";
  el.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onEnable();
    },
    true
  );
  document.body.appendChild(el);
  motionBanner = el;
}

export function setupDeviceTilt() {
  if (tiltEnabled) return;
  tiltEnabled = true;
  hideMotionBanner();

  const onOrient = (event) => {
    if (joystickActive || touchSteering) return;
    const beta = event.beta; // -180..180 front/back
    const gamma = event.gamma; // -90..90 left/right
    if (beta == null || gamma == null || Number.isNaN(beta) || Number.isNaN(gamma)) {
      return;
    }
    lastOrientMs = Date.now();

    const angle = screenAngle();
    let lr = gamma;
    let fb = beta - 55; // natural upright hold ≈ 50–70°
    if (angle === 90) {
      lr = beta;
      fb = -gamma - 55;
    } else if (angle === -90 || angle === 270) {
      lr = -beta;
      fb = gamma - 55;
    } else if (angle === 180) {
      lr = -gamma;
      fb = -(beta - 55);
    }

    applyTilt(lr, fb);
  };

  const onMotion = (event) => {
    if (joystickActive || touchSteering) return;
    // Prefer deviceorientation when it is actively delivering samples
    if (Date.now() - lastOrientMs < 400) return;

    const g = event.accelerationIncludingGravity;
    if (!g || g.x == null || g.y == null) return;

    // Gravity vector tilt (portrait): x = roll, z = pitch.
    // Fall back to y-offset pitch when z is unavailable (some WebViews).
    const angle = screenAngle();
    let gx = g.x;
    let gz = g.z != null ? g.z : -(g.y + 9.8);

    if (angle === 90) {
      gx = g.y;
      gz = -(g.x != null ? g.x : 0);
    } else if (angle === -90 || angle === 270) {
      gx = -(g.y != null ? g.y : 0);
      gz = g.x;
    } else if (angle === 180) {
      gx = -(g.x != null ? g.x : 0);
      gz = -(g.z != null ? g.z : 0);
    }

    // Map m/s² → degrees-ish range used by applyTilt
    applyTilt(gx * 9, gz * 9);
  };

  window.addEventListener("deviceorientation", onOrient, { capture: true, passive: true });
  window.addEventListener("deviceorientationabsolute", onOrient, {
    capture: true,
    passive: true,
  });
  window.addEventListener("devicemotion", onMotion, { capture: true, passive: true });
}

/**
 * Finger-drag steering (no on-screen joystick). Always works even when
 * sensors are blocked — drag anywhere on empty canvas to roll the earth.
 */
export function enableTouchSteer() {
  if (!isTouchscreenDevice()) return;

  const maxRadius = 72;

  const onStart = (ev) => {
    if (touchId != null) return;
    const t = ev.changedTouches ? ev.changedTouches[0] : ev;
    // Ignore multi-finger pinches
    if (ev.touches && ev.touches.length > 1) return;
    touchId = t.identifier != null ? t.identifier : "mouse";
    touchOrigin = { x: t.clientX, y: t.clientY };
    touchSteering = false; // become active after small movement
  };

  const onMove = (ev) => {
    if (touchId == null || !touchOrigin) return;
    let t = null;
    if (ev.changedTouches) {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === touchId) {
          t = ev.changedTouches[i];
          break;
        }
      }
    } else if (touchId === "mouse") {
      t = ev;
    }
    if (!t) return;

    const dx = t.clientX - touchOrigin.x;
    const dy = t.clientY - touchOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12 && !touchSteering) return;

    touchSteering = true;
    // Keep origin so drag feels absolute from press point
    const clamped = Math.min(dist, maxRadius);
    const nx = (dx / (dist || 1)) * clamped;
    const ny = (dy / (dist || 1)) * clamped;
    setAxes(nx / maxRadius, ny / maxRadius);
    // Prevent page scroll while steering
    if (ev.cancelable) ev.preventDefault();
  };

  const onEnd = (ev) => {
    if (touchId == null) return;
    let ended = false;
    if (ev.changedTouches) {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === touchId) ended = true;
      }
    } else if (touchId === "mouse") {
      ended = true;
    }
    if (!ended) return;
    touchId = null;
    touchOrigin = null;
    if (touchSteering) {
      touchSteering = false;
      clearAxes();
    }
  };

  window.addEventListener("touchstart", onStart, { capture: true, passive: true });
  window.addEventListener("touchmove", onMove, { capture: true, passive: false });
  window.addEventListener("touchend", onEnd, { capture: true, passive: true });
  window.addEventListener("touchcancel", onEnd, { capture: true, passive: true });
}

/**
 * Enable tilt ASAP on Android; on iOS ask permission via banner + first tap.
 * Always also enables finger-drag steering as a reliable fallback.
 */
export function enableMobileTilt() {
  if (!isTouchscreenDevice()) return;

  enableTouchSteer();

  const arm = () => {
    requestTiltPermission().then((ok) => {
      if (ok) {
        setupDeviceTilt();
        hideMotionBanner();
      } else {
        tiltPermissionAsked = false;
        showMotionBanner(() => {
          tiltPermissionAsked = true;
          requestTiltPermission().then((granted) => {
            if (granted) setupDeviceTilt();
            else {
              tiltPermissionAsked = false;
              // Still hide after an intentional tap — touch-drag works
              hideMotionBanner();
            }
          });
        });
      }
    });
  };

  if (!needsTiltPermission()) {
    setupDeviceTilt();
    // Some Android Chrome builds still need a gesture before events flow
    const kick = () => {
      setupDeviceTilt();
      window.removeEventListener("touchend", kick, true);
      window.removeEventListener("click", kick, true);
    };
    window.addEventListener("touchend", kick, true);
    window.addEventListener("click", kick, true);
    return;
  }

  // iOS / permission-gated browsers: visible CTA + gesture listeners
  showMotionBanner(() => {
    tiltPermissionAsked = true;
    arm();
  });

  const ask = () => {
    if (tiltEnabled) return;
    tiltPermissionAsked = true;
    arm();
  };
  window.addEventListener("touchend", ask, true);
  window.addEventListener("click", ask, true);
}

export function createJoystick(parent) {
  const maxDiff = 62;
  const stick = document.createElement("div");
  stick.setAttribute("id", "joystick");

  stick.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  stick.addEventListener("touchstart", handleMouseDown);
  document.addEventListener("touchmove", handleMouseMove);
  document.addEventListener("touchend", handleMouseUp);

  let dragStart = null;
  let currentPos = { x: 0, y: 0 };

  function handleMouseDown(event) {
    event.preventDefault();
    stick.style.transition = "0s";
    joystickActive = true;

    if (event.changedTouches) {
      dragStart = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };

      return;
    }
    dragStart = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleMouseMove(event) {
    if (dragStart === null) return;

    if (event.changedTouches) {
      event.clientX = event.changedTouches[0].clientX;
      event.clientY = event.changedTouches[0].clientY;
    }

    const xDiff = event.clientX - dragStart.x;
    const yDiff = event.clientY - dragStart.y;
    const angle = Math.atan2(yDiff, xDiff);
    const distance = Math.min(maxDiff, Math.hypot(xDiff, yDiff));
    const xNew = distance * Math.cos(angle);
    const yNew = distance * Math.sin(angle);
    stick.style.transform = `translate3d(${xNew}px, ${yNew}px, 0px)`;
    currentPos = { x: xNew, y: yNew };
    touchEvent(currentPos);
  }

  function handleMouseUp(event) {
    if (dragStart === null) return;
    stick.style.transition = ".2s";
    stick.style.transform = `translate3d(0px, 0px, 0px)`;
    dragStart = null;
    currentPos = { x: 0, y: 0 };
    joystickActive = false;
    clearAxes();
  }

  parent.appendChild(stick);
  return {
    getPosition: () => currentPos,
  };
}
