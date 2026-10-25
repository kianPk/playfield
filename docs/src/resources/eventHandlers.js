// create keyboard control event listeners

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
    // iOS & android
    supportsTouch = true;
  else if (window.navigator.msPointerEnabled)
    // Win8
    supportsTouch = true;
  else if ("ontouchstart" in document.documentElement)
    // Controversial way to check touch support
    supportsTouch = true;

  return supportsTouch;
}

export function touchEvent(coordinates) {
  // Lower deadzone for smaller mobile joysticks
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
  return Promise.all(tasks).then((results) => results.some(Boolean));
}

function tiltAxis(value, dead, span) {
  const mag = Math.abs(value);
  if (mag <= dead) return 0;
  return Math.min(1, (mag - dead) / span);
}

function applyTilt(leftRight, forwardBack) {
  const dead = 3;
  const span = 22;
  const gx = tiltAxis(leftRight, dead, span);
  moveDirection.right = leftRight > 0 ? gx : 0;
  moveDirection.left = leftRight < 0 ? gx : 0;
  const bz = tiltAxis(forwardBack, dead, span);
  moveDirection.forward = forwardBack < 0 ? bz : 0;
  moveDirection.back = forwardBack > 0 ? bz : 0;
}

export function setupDeviceTilt() {
  if (tiltEnabled) return;
  tiltEnabled = true;

  const onOrient = (event) => {
    if (joystickActive) return;
    let beta = event.beta; // -180..180 front/back
    let gamma = event.gamma; // -90..90 left/right
    if (beta == null || gamma == null) return;

    // Normalize for screen orientation (portrait / landscape)
    const angle =
      (typeof window.orientation === "number"
        ? window.orientation
        : (window.screen.orientation && window.screen.orientation.angle) || 0) ||
      0;

    let lr = gamma;
    let fb = beta - 45; // upright phone ≈ 45–70°
    if (angle === 90) {
      lr = beta;
      fb = -gamma - 45;
    } else if (angle === -90 || angle === 270) {
      lr = -beta;
      fb = gamma - 45;
    } else if (angle === 180) {
      lr = -gamma;
      fb = -(beta - 45);
    }

    applyTilt(lr, fb);
  };

  const onMotion = (event) => {
    if (joystickActive) return;
    // Fallback when deviceorientation is blocked/unavailable
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    // Portrait: x = left/right, y = front/back (approx)
    applyTilt(-a.x * 6, -(a.y + 6) * 4);
  };

  window.addEventListener("deviceorientation", onOrient, true);
  window.addEventListener("deviceorientationabsolute", onOrient, true);
  window.addEventListener("devicemotion", onMotion, true);
}

/**
 * Enable tilt ASAP on Android; on iOS ask permission on first tap.
 */
export function enableMobileTilt() {
  if (!isTouchscreenDevice()) return;

  if (!needsTiltPermission()) {
    setupDeviceTilt();
    return;
  }

  // iOS: must request from a user gesture
  const ask = (ev) => {
    if (tiltPermissionAsked && tiltEnabled) return;
    tiltPermissionAsked = true;
    requestTiltPermission().then((ok) => {
      if (ok) setupDeviceTilt();
      // Even if permission UI was dismissed once, keep listening for a retry tap
      if (!ok) tiltPermissionAsked = false;
    });
  };

  window.addEventListener("touchend", ask, true);
  window.addEventListener("click", ask, true);

  // Also try immediately — some WebViews allow it without a prompt
  requestTiltPermission().then((ok) => {
    if (ok) setupDeviceTilt();
  });
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
    moveDirection.forward = 0;
    moveDirection.left = 0;
    moveDirection.right = 0;
    moveDirection.back = 0;
  }

  parent.appendChild(stick);
  return {
    getPosition: () => currentPos,
  };
}
