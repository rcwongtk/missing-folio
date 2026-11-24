const get = (id) => document.getElementById(id);
const key = 'missing-folio.game.v1';
const initial = { introduced: false, sticker: false, hint: false, folio: false, atPark: false, mara: false };

function load() {
  try {
    const saved = { ...initial, ...JSON.parse(localStorage.getItem(key)) };
    // Earlier versions let players file the page before entering the park.
    if (saved.folio) saved.atPark = true;
    return saved;
  } catch {
    return { ...initial };
  }
}

const state = load();
const journal = get('journal');
const conversation = get('conversation');
const stage = get('game-stage');
const sceneImage = get('scene-image');
const blackout = get('scene-blackout');
const dialogueCard = get('dialogue-card');
const itemReveal = get('item-reveal');
const dialogueNext = get('dialogue-next');
const rewardDone = get('reward-done');
const backgroundControls = [
  document.querySelector('.game-actions'),
  get('library-hotspots'),
  get('mara-hotspot'),
];
const recovered = get('recovered');
const folioLanding = get('folio-landing');
const filePage = get('file-page');
const restart = get('restart');
const barracksClue = 'Walk past the ghost of the barracks to the water’s edge, where two currents, one from the west and one from the south, become one.';
const narrator = {
  name: 'The Narrator',
  shots: [
    {
      source: './assets/library-archive-daylight.webp',
      alt: 'Pixel-art archival bookshelves at Calgary Central Library',
      line: 'We came to Calgary Central Library to research the city’s history for a school project. We start in the archives, where the old city records line the shelves.',
    },
    {
      source: './assets/archive-pull-ledger-daylight.webp',
      alt: 'From the player’s perspective, a hand pulls a red ledger from the middle row of archival books',
      line: 'A burgundy ledger catches our eye among the matching volumes. We slide it off the shelf and carry it to a reading table.',
    },
    {
      source: './assets/archive-open-ledger-daylight.webp',
      alt: 'Two hands open the red ledger to a torn page and a handwritten clue',
      line: 'A page has been torn out. Beside the torn edge is a mysterious hand-drawn symbol, with a note underneath: “Where the two rivers meet.” What could it mean?',
      showsClue: true,
    },
  ],
};
const characters = {
  helper: {
    name: 'Leah Chen',
    role: 'Library helper',
    first: ['Here for the history project?', 'Take one of these library stickers. I keep a few by the desk for students.'],
    repeat: 'See Daniel over there with the green book? He’s a historian. He comes in most weeks to look through the old city records.',
    flag: 'sticker',
    notice: 'Calgary Public Library sticker added to inventory.',
  },
  historian: {
    name: 'Daniel Lau',
    role: 'Historian',
    first: ['“Where the two rivers meet”? Ah, there’s an old saying about the confluence.', barracksClue],
    repeat: barracksClue,
    flag: 'hint',
    notice: 'Daniel’s saying added to your notes.',
  },
  mara: {
    name: 'Mara Vale',
    role: 'Local resident',
    first: ['My grandma used to draw that same mark.', 'See how one branch stops short? She always said that was where you were supposed to turn.'],
    repeat: 'Check the little branch in the margin. That’s the part my grandma told me to remember.',
    flag: 'mara',
    notice: 'Mara’s clue added to your notes.',
  },
};

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // The demo remains playable if browser storage is restricted.
  }
  render();
}

function render() {
  const narrating = activePerson === narrator;
  const park = state.atPark && !narrating;
  const shot = narrating ? narrator.shots[lineIndex] : null;
  const source = shot?.source ?? (park ? './assets/confluence-daylight.webp' : './assets/library-atrium-daylight.webp');
  if (sceneImage.getAttribute('src') !== source) sceneImage.src = source;
  sceneImage.alt = shot?.alt ?? (park ? 'Pixel-art Confluence park with Mara Vale on a bench' : 'Pixel-art Calgary Central Library atrium');
  get('archive-clue').hidden = !shot?.showsClue;
  stage.classList.toggle('park', park);
  get('scene-title').textContent = park ? 'The Confluence' : 'Calgary Central Library';
  get('scene-district').textContent = narrating ? 'Archives' : park ? 'Bow and Elbow rivers' : 'East Village';
  get('library-hotspots').hidden = park || narrating || !state.introduced;
  get('mara-hotspot').hidden = !park;
  get('start').hidden = park || narrating || !state.introduced;
  get('objective').textContent = park
    ? state.mara ? 'Follow the short branch' : 'Show Mara the page'
    : 'Follow the mark';
  get('lead').textContent = park
    ? state.mara
      ? 'Mara remembers the short branch drawn in the margin. Her clue is saved in the Journal.'
      : 'Mara Vale is sitting by the path. Ask whether she recognizes the mark from the recovered page.'
    : state.hint
      ? 'Two currents, one from the west and one from the south.'
      : '“Where the two rivers meet.”';
  get('park-location').hidden = !park;
  const current = park ? get('park-location') : get('library-location');
  const other = park ? get('library-location') : get('park-location');
  current.setAttribute('aria-current', 'location');
  other.removeAttribute('aria-current');
  const pages = Number(state.introduced) + Number(state.folio);
  get('page-count').textContent = pages;
  get('item-count').textContent = Number(state.sticker);
  get('journal-count').textContent = pages + Number(state.sticker);
}

function chooseSection(section) {
  document.querySelectorAll('[data-section]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.section === section));
  });
  get('journal-pages').hidden = section !== 'pages';
  get('journal-inventory').hidden = section !== 'inventory';
  get('journal-body').scrollTop = 0;
}

function openJournal(section = 'pages') {
  get('journal-pages').innerHTML = [
    state.folio ? '<article class="journal-entry"><p class="eyebrow">A-17 · Recovered page</p><h3>The night inventory</h3><p>A page was cut from the ledger. Look for the river branch that ends abruptly.</p><button id="reread" class="text-button">Read the full page</button></article>' : '',
    state.introduced ? '<article class="journal-entry"><p class="eyebrow">Archive notes</p><h3>The mark in the margin</h3><p>A key over an open book. Below it, someone wrote “Where the two rivers meet.”</p></article>' : '<p>Discovered pages will appear here.</p>',
    state.hint ? `<article class="journal-entry"><h3>Daniel’s saying</h3><p>“${barracksClue}”</p></article>` : '',
    state.mara ? '<article class="journal-entry"><h3>Mara’s clue</h3><p>Her grandmother remembered where the short branch ends. That’s where you turn.</p></article>' : '',
  ].join('');
  get('journal-inventory').innerHTML = state.sticker
    ? '<article class="journal-entry item"><img class="sticker-art" src="./assets/library-sticker.webp" alt="" width="96" height="96"><div><h3>Calgary Public Library Sticker</h3><p>A souvenir from Leah at the library.</p></div></article>'
    : '<p>Your inventory is empty.</p>';
  journal.showModal();
  chooseSection(section);
  get('reread')?.addEventListener('click', () => {
    get('page-state').textContent = 'Discovered page · A-17';
    folioLanding.hidden = true;
    recovered.classList.remove('folio-landed');
    recovered.showModal();
  });
}

let activePerson;
let lines;
let lineIndex;
let conversationTrigger;
let introTransitioning = false;

function talk(trigger) {
  const id = trigger.dataset.person;
  activePerson = characters[id];
  conversationTrigger = trigger;
  const { first, repeat, flag } = activePerson;
  lines = state[flag] ? [repeat] : first;
  lineIndex = 0;
  stage.dataset.speaker = id;
  showDialogue();
}

function startIntroduction() {
  activePerson = narrator;
  lines = narrator.shots.map((shot) => shot.line);
  lineIndex = 0;
  render();
  showDialogue();
  preloadNextIntroShot();
}

function preloadNextIntroShot() {
  const nextShot = narrator.shots[lineIndex + 1];
  if (!nextShot) return;

  const image = new Image();
  image.fetchPriority = 'low';
  image.src = nextShot.source;
}

function showDialogue() {
  const { name, role } = activePerson;
  get('speaker').textContent = name;
  get('speaker-role').textContent = role ?? '';
  get('speaker-role').hidden = !role;
  get('speech').textContent = lines[lineIndex];
  dialogueCard.hidden = false;
  itemReveal.hidden = true;
  conversation.setAttribute('aria-labelledby', 'speaker');
  conversation.setAttribute('aria-describedby', 'speech');
  conversation.hidden = false;
  backgroundControls.forEach((element) => { element.inert = true; });
  dialogueNext.focus({ preventScroll: true });
}

async function fadeIntroScene(updateScene) {
  if (reducedMotion.matches) {
    updateScene();
    return;
  }

  introTransitioning = true;
  let fade;
  try {
    blackout.hidden = false;
    await blackout.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-in' }).finished;
    updateScene();
    await sceneImage.decode().catch(() => {});
    fade = blackout.animate([
      { opacity: 1 },
      { opacity: 1, offset: .22 },
      { opacity: 0 },
    ], { duration: 560, fill: 'forwards' });
    await fade.finished;
  } finally {
    blackout.hidden = true;
    fade?.cancel();
    introTransitioning = false;
  }
}

async function finishIntroduction() {
  const replay = state.introduced;
  await fadeIntroScene(() => {
    conversation.hidden = true;
    activePerson = null;
    state.introduced = true;
    save();
  });

  backgroundControls.forEach((element) => { element.inert = false; });
  (replay ? get('journal-open') : get('library-hotspots').querySelector('button')).focus({ preventScroll: true });
}

function closeConversation() {
  conversation.hidden = true;
  delete stage.dataset.speaker;
  backgroundControls.forEach((element) => { element.inert = false; });
  conversationTrigger.focus({ preventScroll: true });
}

function finishConversation() {
  const { flag, notice } = activePerson;
  if (state[flag]) {
    closeConversation();
    return;
  }

  state[flag] = true;
  save();
  get('announcement').textContent = notice;
  if (flag === 'sticker') {
    dialogueCard.hidden = true;
    itemReveal.hidden = false;
    conversation.setAttribute('aria-labelledby', 'reward-title');
    conversation.setAttribute('aria-describedby', 'reward-note');
    rewardDone.focus({ preventScroll: true });
  } else {
    closeConversation();
  }
}

dialogueNext.addEventListener('click', () => {
  if (introTransitioning) return;
  if (activePerson === narrator) {
    if (lineIndex === lines.length - 1) {
      finishIntroduction();
      return;
    }

    fadeIntroScene(() => {
      get('speech').textContent = lines[++lineIndex];
      render();
      preloadNextIntroShot();
    });
  } else if (lineIndex < lines.length - 1) {
    get('speech').textContent = lines[++lineIndex];
  } else {
    finishConversation();
  }
});

conversation.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (activePerson === narrator) return;
    if (itemReveal.hidden && lineIndex === lines.length - 1) finishConversation();
    else closeConversation();
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    (itemReveal.hidden ? dialogueNext : rewardDone).focus();
  }
});

rewardDone.addEventListener('click', closeConversation);
document.querySelectorAll('[data-person]').forEach((button) => {
  button.addEventListener('click', () => talk(button));
});
document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => chooseSection(button.dataset.section)));
get('map-open').addEventListener('click', () => get('map').showModal());
get('journal-open').addEventListener('click', () => openJournal());
get('intro-open').addEventListener('click', () => {
  journal.close();
  startIntroduction();
});
// Map the rectangular canvas onto the four projected corners, including perspective.
function pagePose([[x0, y0], [x1, y1], [x2, y2], [x3, y3]], width, height) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  if (!Number.isFinite(det) || Math.abs(det) < 1) return null;

  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  return `matrix3d(${[
    (x1 - x0 + g * x1) / width, (y1 - y0 + g * y1) / width, 0, g / width,
    (x3 - x0 + h * x3) / height, (y3 - y0 + h * y3) / height, 0, h / height,
    0, 0, 1, 0,
    x0, y0, 0, 1,
  ].join(',')})`;
}

get('scanner').addEventListener('folio:reveal', async (event) => {
  const { artwork, corners, closeScanner } = event.detail;
  if (state.atPark) {
    closeScanner();
    return;
  }

  state.folio = true;
  state.atPark = true;
  save();
  get('announcement').textContent = 'You arrived at The Confluence. The night inventory was added to your Journal.';
  get('page-state').textContent = 'Item obtained · A-17';

  const startPose = reducedMotion.matches ? null : pagePose(corners, artwork.width, artwork.height);
  folioLanding.hidden = false;
  if (startPose) {
    recovered.classList.add('is-receiving');
    artwork.classList.add('folio-flight');
    recovered.append(artwork);
    filePage.disabled = true;
    recovered.showModal();

    const { left, top, right, bottom, width, height } = folioLanding.getBoundingClientRect();
    const endPose = pagePose([[left, top], [right, top], [right, bottom], [left, bottom]], artwork.width, artwork.height);
    if (endPose) {
      const peakWidth = Math.min(Math.max(width * 1.9, 128), 200);
      const peakHeight = peakWidth * artwork.height / artwork.width;
      const x = left + (width - peakWidth) / 2;
      const y = Math.max(12, top + (height - peakHeight) / 2 - 12);
      const peakPose = pagePose([[x, y], [x + peakWidth, y], [x + peakWidth, y + peakHeight], [x, y + peakHeight]], artwork.width, artwork.height);
      const flight = artwork.animate([
        { transform: startPose, easing: 'cubic-bezier(.2,.62,.28,1)' },
        { transform: peakPose, offset: .72, easing: 'ease-in-out' },
        { transform: endPose },
      ], { duration: 700, fill: 'both' });
      await flight.finished.catch(() => {});
      flight.cancel();
    }
    artwork.classList.remove('folio-flight');
  }

  folioLanding.replaceChildren(artwork);
  recovered.classList.remove('is-receiving');
  recovered.classList.toggle('folio-landed', Boolean(startPose));
  filePage.disabled = false;
  closeScanner();
  if (!recovered.open) recovered.showModal();
  filePage.focus({ preventScroll: true });
});
filePage.addEventListener('click', () => recovered.close());
recovered.addEventListener('cancel', (event) => {
  if (filePage.disabled) event.preventDefault();
});
recovered.addEventListener('close', () => {
  if (!journal.open) {
    get('journal-open').focus({ preventScroll: true });
    openJournal();
  }
});
get('restart-open').addEventListener('click', () => restart.showModal());
get('restart-confirm').addEventListener('click', () => {
  restart.close();
  journal.close();
  Object.assign(state, initial);
  save();
  startIntroduction();
});
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const activationForm = get('activation-form');
const activationCode = get('activation-code');
const activationError = get('activation-error');
const enterGame = get('enter-game');
const joinMystery = get('join-mystery');
const codeAvailability = get('code-availability');
const portraitNotice = get('portrait-notice');
const titleScreen = get('title-screen');
const titleLoop = get('title-loop');
const landscapeViewport = matchMedia('(orientation: landscape)');
const touchDevice = matchMedia('(pointer: coarse)');
const screenOrientation = screen.orientation;

function updateTitleLoop() {
  if (titleScreen.hidden || portraitNotice.open || reducedMotion.matches || document.hidden) {
    titleLoop.pause();
    return;
  }

  if (!titleLoop.hasAttribute('src')) titleLoop.src = titleLoop.dataset.src;
  titleLoop.play().catch(() => titleLoop.classList.remove('is-playing'));
}

titleLoop.addEventListener('playing', () => titleLoop.classList.add('is-playing'));
titleLoop.addEventListener('error', () => titleLoop.classList.remove('is-playing'));
reducedMotion.addEventListener('change', updateTitleLoop);
document.addEventListener('visibilitychange', updateTitleLoop);

function updateOrientation() {
  // A phone keyboard can resize the viewport without rotating the device.
  const landscape = touchDevice.matches && screenOrientation?.type
    ? screenOrientation.type.startsWith('landscape')
    : landscapeViewport.matches;
  if (landscape === portraitNotice.open) return;

  document.documentElement.classList.toggle('portrait-required', landscape);
  if (landscape) portraitNotice.showModal();
  else portraitNotice.close();
  updateTitleLoop();
}

portraitNotice.addEventListener('cancel', (event) => event.preventDefault());
screenOrientation?.addEventListener('change', updateOrientation);
landscapeViewport.addEventListener('change', updateOrientation);
updateOrientation();
updateTitleLoop();

joinMystery.addEventListener('click', () => {
  activationForm.hidden = false;
  joinMystery.setAttribute('aria-expanded', 'true');
  joinMystery.hidden = true;
  // Keep the whole card in view before the player summons the phone keyboard.
  get('activation-close').focus({ preventScroll: true });
});

get('activation-close').addEventListener('click', () => {
  if (enterGame.disabled) return;
  activationForm.hidden = true;
  joinMystery.hidden = false;
  joinMystery.setAttribute('aria-expanded', 'false');
  activationError.textContent = '';
  activationCode.removeAttribute('aria-invalid');
  codeAvailability.textContent = '';
  joinMystery.focus({ preventScroll: true });
});

get('code-help').addEventListener('click', () => {
  codeAvailability.textContent = 'Activation codes aren’t on sale yet.';
});

activationCode.addEventListener('input', () => {
  activationCode.removeAttribute('aria-invalid');
  activationError.textContent = '';
});

activationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (enterGame.disabled) return;

  const code = activationCode.value.trim();
  if (code !== '12345') {
    activationCode.setAttribute('aria-invalid', 'true');
    activationError.textContent = code ? 'That code is incorrect.' : 'Enter your activation code.';
    activationCode.focus();
    return;
  }

  enterGame.disabled = true;
  activationCode.blur();
  const transition = get('title-transition');
  const field = get('field');
  const shouldFade = !reducedMotion.matches;
  if (shouldFade) {
    transition.hidden = false;
    await transition.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-in' }).finished;
  }

  titleScreen.hidden = true;
  updateTitleLoop();
  document.documentElement.classList.remove('title-screen-open');
  field.hidden = false;
  if (state.introduced) render();
  else startIntroduction();

  if (shouldFade) {
    await sceneImage.decode().catch(() => {});
    const fade = transition.animate([
      { opacity: 1 },
      { opacity: 1, offset: .15 },
      { opacity: 0 },
    ], { duration: 600, fill: 'forwards' });
    await fade.finished;
    transition.hidden = true;
    fade.cancel();
  }

  field.inert = false;
  (state.introduced ? get('scene-title') : dialogueNext).focus({ preventScroll: true });
});
enterGame.disabled = false;
joinMystery.disabled = false;
