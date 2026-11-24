const targetUrl = new URL('./assets/targets.mind', import.meta.url).href;
const sealUrl = new URL('./assets/archive-seal-a17.png', import.meta.url).href;
const byId = (id) => document.getElementById(id);
const scanner = byId('scanner');
const camera = byId('camera');
const status = byId('status');
const finder = byId('finder');
const startButton = byId('start');
const closeButton = byId('close');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let engine;
let reveal;
let revealDuration;
let anchor;
let scannerActive = false;
let startup = null;
let running = false;
let seconds = 0;
let lastFrame = 0;
let seen = false;
let handingOff = false;

function showScanner() {
  scannerActive = true;
  seconds = 0;
  lastFrame = 0;
  seen = false;
  handingOff = false;
  finder.hidden = false;
  status.textContent = 'Starting camera…';
  if (!scanner.open) scanner.showModal();
  closeButton.focus();
}

function stopCamera() {
  if (!running) return;
  running = false;
  engine.renderer.setAnimationLoop(null);
  engine.stop();
  engine.controller.dispose();
  anchor.visible = false;
  anchor.group.visible = false;
}

function closeScanner() {
  stopCamera();
  scannerActive = false;
  if (scanner.open) scanner.close();
}

function finishReveal() {
  handingOff = true;
  const bounds = engine.renderer.domElement.getBoundingClientRect();
  const page = reveal.takePage(engine.camera, bounds);
  status.textContent = 'Page recovered.';
  scanner.dispatchEvent(new CustomEvent('folio:reveal', {
    detail: { ...page, closeScanner },
  }));
}

function render(now) {
  const tracked = anchor.group.visible && !handingOff && !byId('portrait-notice').open;
  if (tracked) {
    seconds += lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0;
    reveal.update(reducedMotion.matches ? revealDuration : seconds);
  }
  lastFrame = now;
  engine.renderer.render(engine.scene, engine.camera);
  if (tracked && (reducedMotion.matches || seconds >= revealDuration)) finishReveal();
}

async function loadScanner() {
  const [{ MindARThree }, effect, target] = await Promise.all([
    import('./vendor/mindar-image-three.prod.js'),
    import('./reveal.js?v=folio-flight'),
    fetch(targetUrl, { cache: 'force-cache' }),
  ]);
  if (!target.ok || (await target.arrayBuffer()).byteLength === 0) {
    throw new Error('The tracking file could not be loaded.');
  }
  reveal = await effect.loadReveal(sealUrl);
  revealDuration = effect.revealDuration;
  engine = new MindARThree({
    container: camera,
    imageTargetSrc: targetUrl,
    maxTrack: 1,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  });
  anchor = engine.addAnchor(0);
  anchor.group.add(reveal.group);
  anchor.onTargetFound = () => {
    if (handingOff) return;
    seen = true;
    finder.hidden = true;
    status.textContent = 'Seal found. Hold steady.';
  };
  anchor.onTargetLost = () => {
    if (handingOff) return;
    finder.hidden = false;
    status.textContent = seen
      ? 'Aim at the seal again to finish the reveal.'
      : 'Point your camera at the full A-17 seal.';
  };
}

async function startScan() {
  if (startup) return;
  showScanner();
  startButton.disabled = true;
  startup = (async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('No secure camera access.');
    if (!engine) await loadScanner();
    if (!scannerActive) return;
    reveal.update(0);
    await engine.start();
    running = true;
    if (!scannerActive) {
      stopCamera();
      return;
    }
    status.textContent = 'Point your camera at the full A-17 seal.';
    engine.renderer.setAnimationLoop(render);
  })();

  try {
    await startup;
  } catch (error) {
    console.warn('Unable to start the seal scanner', error);
    engine?.video?.srcObject?.getTracks().forEach((track) => track.stop());
    engine?.video?.remove();
    if (scannerActive) {
      finder.hidden = true;
      status.textContent = 'Camera unavailable. Check camera permissions in Safari or Chrome.';
    }
  } finally {
    startup = null;
    startButton.disabled = false;
  }
}

startButton.addEventListener('click', startScan);
closeButton.addEventListener('click', closeScanner);
scanner.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeScanner();
});
window.addEventListener('pagehide', closeScanner);
