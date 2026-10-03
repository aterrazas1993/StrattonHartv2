(function () {
  'use strict';
  var dialog = document.getElementById('sh-welcome');
  var video = document.getElementById('sh-welcome-video');
  var skip = document.getElementById('sh-welcome-skip');
  var key = 'sh-welcome-seen-v1';
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var seen = false;
  try { seen = sessionStorage.getItem(key) === '1'; } catch (e) {}

  // Do not download the video on repeat visits, deep links, or reduced-motion/data connections.
  if (!dialog || !video || !skip || !dialog.showModal || seen || motion.matches ||
      location.hash || (navigator.connection && navigator.connection.saveData)) return;

  var finished = false;
  var startTimer;
  var endTimer;
  var closeTimer;
  var previousFocus = document.activeElement;
  function removeOverlay() {
    clearTimeout(closeTimer);
    if (dialog.open) dialog.close();
    video.removeAttribute('src');
    video.load();
    document.documentElement.classList.remove('sh-welcome-open');
    if (document.activeElement === skip && previousFocus && previousFocus.focus) {
      previousFocus.focus({ preventScroll: true });
    }
  }
  function finish(immediate) {
    if (finished) {
      if (immediate === true) removeOverlay();
      return;
    }
    finished = true;
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    video.pause();
    if (motion.removeEventListener) motion.removeEventListener('change', onMotion);
    if (immediate === true || motion.matches) removeOverlay();
    else {
      dialog.classList.add('sh-welcome-leaving');
      closeTimer = setTimeout(removeOverlay, 350);
    }
  }
  function onMotion(event) { if (event.matches) finish(true); }
  function translate() {
    var spanish = document.documentElement.lang === 'es';
    skip.textContent = spanish ? 'Omitir intro →' : 'Skip intro →';
    dialog.setAttribute('aria-label', spanish ? 'Bienvenido a Stratton Hart' : 'Welcome to Stratton Hart');
  }
  translate();
  window.addEventListener('sh:langchange', translate);
  skip.addEventListener('click', function () { finish(); });
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); finish(); });
  dialog.addEventListener('close', function () { finish(true); });
  video.addEventListener('ended', function () { finish(); });
  video.addEventListener('error', function () { finish(true); });
  video.addEventListener('playing', function () { clearTimeout(startTimer); });
  window.addEventListener('pagehide', function () { finish(true); });
  if (motion.addEventListener) motion.addEventListener('change', onMotion);

  try {
    dialog.showModal();
    document.documentElement.classList.add('sh-welcome-open');
    skip.focus({ preventScroll: true });
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
    // Fail open on slow networks, stalled playback, and blocked autoplay.
    startTimer = setTimeout(function () { finish(true); }, 1500);
    endTimer = setTimeout(function () { finish(); }, 7500);
    video.muted = true;
    video.src = '/assets/stratton-hart-logo-stinger.mp4';
    var playback = video.play();
    if (playback && playback.catch) playback.catch(function () { finish(true); });
  } catch (e) { finish(true); }
})();
