(function () {
  'use strict';
  // Match the site's mobile layout, including touch phones in landscape.
  if (window.matchMedia('(max-width: 900px), (hover: none) and (pointer: coarse)').matches) return;
  var dialog = document.getElementById('sh-welcome');
  var video = document.getElementById('sh-welcome-video');
  var skip = document.getElementById('sh-welcome-skip');
  var play = document.getElementById('sh-welcome-play');
  var key = 'sh-welcome-seen-v2';
  var replay = /[?&]intro=1(?:&|$)/.test(location.search || '');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var seen = false;
  try { seen = sessionStorage.getItem(key) === '1'; } catch (e) {}

  // Do not download the video on repeat visits, deep links, or reduced-motion/data connections.
  if (!dialog || !video || !skip || !dialog.showModal || (seen && !replay) || motion.matches ||
      location.hash || (navigator.connection && navigator.connection.saveData)) return;

  var finished = false;
  function remember() { try { sessionStorage.setItem(key, '1'); } catch (e) {} }
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
    if (play) play.textContent = spanish ? 'Reproducir intro' : 'Play intro';
    skip.textContent = spanish ? 'Omitir intro →' : 'Skip intro →';
    dialog.setAttribute('aria-label', spanish ? 'Bienvenido a Stratton Hart' : 'Welcome to Stratton Hart');
  }
  translate();
  window.addEventListener('sh:langchange', translate);
  skip.addEventListener('click', function () { remember(); finish(); });
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); remember(); finish(); });
  dialog.addEventListener('close', function () { finish(true); });
  video.addEventListener('ended', function () { remember(); finish(); });
  video.addEventListener('error', function () { finish(true); });
  video.addEventListener('playing', function () {
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    if (play) play.hidden = true;
    endTimer = setTimeout(function () { finish(); }, 7500);
  });
  window.addEventListener('pagehide', function () { finish(true); });
  if (motion.addEventListener) motion.addEventListener('change', onMotion);

  function offerPlayback() {
    if (finished) return;
    clearTimeout(startTimer);
    if (!play) { finish(true); return; }
    play.hidden = false;
    // Keep Skip available; release the page even if the visitor takes no action.
    startTimer = setTimeout(function () { finish(true); }, 15000);
  }
  function startPlayback() {
    if (finished) return;
    clearTimeout(startTimer);
    if (play) play.hidden = true;
    startTimer = setTimeout(function () { finish(true); }, 8000);
    try {
      var playback = video.play();
      if (playback && playback.catch) playback.catch(offerPlayback);
    } catch (e) { offerPlayback(); }
  }
  if (play) play.addEventListener('click', startPlayback);
  try {
    dialog.showModal();
    document.documentElement.classList.add('sh-welcome-open');
    skip.focus({ preventScroll: true });
    video.poster = '/assets/welcome-poster.jpg';
    video.muted = true;
    video.src = '/assets/stratton-hart-logo-stinger.mp4';
    startPlayback();
  } catch (e) { finish(true); }
})();
