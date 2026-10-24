//start link events
import * as THREE from 'three';
import { camera, renderer, scene } from './world';
import { cursorHoverObjects } from '../app';
import { isTouchscreenDevice } from './eventHandlers';

export const pickPosition = { x: 0, y: 0 };

let lookTarget = new THREE.Vector3();
let lookCurrent = null;

export function rotateCamera(ballPosition, deltaTime = 1 / 60) {
  var camPos = new THREE.Vector3(
    camera.position.x,
    camera.position.y,
    camera.position.z
  );

  var targetPos;
  const mobile = isTouchscreenDevice();
  // Frame-rate independent easing — smoother follow on phone + desktop
  const dt = Math.min(Math.max(deltaTime, 0.001), 0.05);
  const follow = mobile ? 1 - Math.exp(-3.2 * dt) : 1 - Math.exp(-2.4 * dt);
  const lookFollow = 1 - Math.exp(-4.0 * dt);

  // Phones: farther behind the globe, still centered
  if (mobile) {
    targetPos = new THREE.Vector3(
      ballPosition.position.x,
      ballPosition.position.y + 11,
      ballPosition.position.z + 26
    );
    camPos.lerp(targetPos, follow);
    camera.position.copy(camPos);
    lookTarget.set(
      ballPosition.position.x,
      ballPosition.position.y + 0.6,
      ballPosition.position.z
    );
    if (!lookCurrent) lookCurrent = lookTarget.clone();
    lookCurrent.lerp(lookTarget, lookFollow);
    camera.lookAt(lookCurrent);
    if (camera.fov !== 40) {
      camera.fov = 40;
      camera.updateProjectionMatrix();
    }
    return;
  }

  //1
  if (
    (ballPosition.position.x < 77 &&
      ballPosition.position.x > 42 &&
      ballPosition.position.z > -20 &&
      ballPosition.position.z < 40) ||
    (ballPosition.position.x < -2 && ballPosition.position.z < -28) ||
    (ballPosition.position.x < -25 &&
      ballPosition.position.x > -70 &&
      ballPosition.position.z > -10 &&
      ballPosition.position.z < 40)
  ) {
    targetPos = new THREE.Vector3(
      ballPosition.position.x,
      ballPosition.position.y + 50,
      ballPosition.position.z + 40
    );
  }

  //2
  else if (
    ballPosition.position.x > -3 &&
    ballPosition.position.x < 22 &&
    ballPosition.position.z > 31 &&
    ballPosition.position.z < 58
  ) {
    targetPos = new THREE.Vector3(
      ballPosition.position.x,
      ballPosition.position.y + 50,
      ballPosition.position.z + 40
    );
  }

  //3
  else if (ballPosition.position.z > 50) {
    targetPos = new THREE.Vector3(
      ballPosition.position.x,
      ballPosition.position.y + 10,
      ballPosition.position.z + 40
    );
  }

  // revert back to original angle
  else {
    targetPos = new THREE.Vector3(
      ballPosition.position.x,
      ballPosition.position.y + 30,
      ballPosition.position.z + 60
    );
  }

  camPos.lerp(targetPos, follow);
  camera.position.copy(camPos);
  lookTarget.copy(ballPosition.position);
  if (!lookCurrent) lookCurrent = lookTarget.clone();
  lookCurrent.lerp(lookTarget, lookFollow);
  camera.lookAt(lookCurrent);
}

export function getCanvasRelativePosition(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * renderer.domElement.width) / rect.width,
    y: ((event.clientY - rect.top) * renderer.domElement.height) / rect.height,
  };
}

export function launchClickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / renderer.domElement.width) * 2 - 1;
  pickPosition.y = (pos.y / renderer.domElement.height) * -2 + 1; // note we flip Y

  // cast a ray through the frustum
  const myRaycaster = new THREE.Raycaster();
  myRaycaster.setFromCamera(pickPosition, camera);
  // get the list of objects the ray intersected
  const intersectedObjects = myRaycaster.intersectObjects(scene.children);
  if (intersectedObjects.length) {
    // pick the first object. It's the closest one
    if (intersectedObjects[0].object.userData.URL)
      window.open(intersectedObjects[0].object.userData.URL);
    else {
      return;
    }
  }
}

export function launchHover(event) {
  event.preventDefault();
  var mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(cursorHoverObjects);

  if (intersects.length > 0) {
    document.getElementById('document-body').style.cursor = 'pointer';
  } else {
    document.getElementById('document-body').style.cursor = 'default';
  }
}
