const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require('node:path').join(__dirname, '../assets/welcome-intro.js'), 'utf8');
function boot(options = {}) {
  const timers = new Map(); let nextTimer = 0;
  const events = () => ({ handlers: {}, addEventListener(k, f) { (this.handlers[k] ||= []).push(f); }, removeEventListener(k, f) { this.handlers[k] = (this.handlers[k] || []).filter(x => x !== f); }, emit(k, e = {}) { for (const f of this.handlers[k] || []) f(e); } });
  const classes = () => ({ values: new Set(), add(k) { this.values.add(k); }, remove(k) { this.values.delete(k); } });
  const body = { focus() { document.activeElement = body; } };
  const document = { activeElement: body, documentElement: { lang: options.lang || 'en', classList: classes() } };
  const skip = { ...events(), focus() { document.activeElement = skip; } };
  const play = { ...events(), hidden: true };
  const dialog = { ...events(), open: false, classList: classes(), attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, showModal() { this.open = true; }, close() { this.open = false; this.emit('close'); } };
  const video = { ...events(), plays: 0, loads: 0, play() { this.plays++; return options.reject ? Promise.reject(new Error('blocked')) : Promise.resolve(); }, pause() { this.paused = true; }, load() { this.loads++; }, removeAttribute(k) { delete this[k]; } };
  const motion = { ...events(), matches: !!options.reduced };
  const window = { ...events(), matchMedia() { return motion; } };
  let stored = options.seen ? '1' : null;
  const sessionStorage = { getItem() { if (options.noStorage) throw Error(); return stored; }, setItem(k, v) { if (options.noStorage) throw Error(); stored = v; } };
  document.getElementById = k => ({ 'sh-welcome': dialog, 'sh-welcome-video': video, 'sh-welcome-skip': skip, 'sh-welcome-play': play })[k];
  if (options.unsupported) delete dialog.showModal;
  vm.runInNewContext(code, { window, document, sessionStorage, location: { hash: options.hash || '', search: options.replay ? '?intro=1' : '' }, navigator: { connection: { saveData: !!options.saveData } }, setTimeout(f, ms) { timers.set(++nextTimer, { f, ms }); return nextTimer; }, clearTimeout(id) { timers.delete(id); } });
  return { dialog, video, skip, play, motion, document, window, timers, stored: () => stored, advance(ms) { for (const [id, t] of [...timers]) if (t.ms === ms) { timers.delete(id); t.f(); } } };
}
function closed(app) { assert.equal(app.dialog.open, false); assert.equal(app.document.documentElement.classList.values.has('sh-welcome-open'), false); assert.equal(app.video.src, undefined); }
test('first visit plays the supplied video muted without prematurely recording the visit', () => { const a = boot(); assert.equal(a.dialog.open, true); assert.equal(a.video.muted, true); assert.equal(a.video.src, '/assets/stratton-hart-logo-stinger.mp4'); assert.equal(a.stored(), null); });
for (const options of [{ seen: true }, { reduced: true }, { saveData: true }, { hash: '#pricing' }, { unsupported: true }]) test('bypasses intro without downloading: ' + JSON.stringify(options), () => { const a = boot(options); closed(a); assert.equal(a.video.plays, 0); });
test('ended fades to the site, then releases the video', () => { const a = boot(); a.video.emit('playing'); a.video.emit('ended'); assert.equal(a.dialog.open, true); assert.equal(a.dialog.classList.values.has('sh-welcome-leaving'), true); assert.ok(a.video.src); a.advance(350); closed(a); });
test('skip dismisses and restores scrolling', () => { const a = boot(); a.skip.emit('click'); a.advance(350); closed(a); });
test('Escape dismisses', () => { const a = boot(); let prevented = false; a.dialog.emit('cancel', { preventDefault() { prevented = true; } }); assert.equal(prevented, true); a.advance(350); closed(a); });
test('blocked autoplay offers a manual play button, then fails open if ignored', async () => { const a = boot({ reject: true }); await Promise.resolve(); assert.equal(a.dialog.open, true); assert.equal(a.play.hidden, false); assert.equal(a.stored(), null); a.advance(15000); closed(a); });
test('media error fails open', () => { const a = boot(); a.video.emit('error'); closed(a); });
test('slow startup fails open after eight seconds', () => { const a = boot(); a.advance(8000); closed(a); });
test('stalled playback never blocks access indefinitely', () => { const a = boot(); a.video.emit('playing'); a.advance(8000); assert.equal(a.dialog.open, true); a.advance(7500); a.advance(350); closed(a); });
test('storage restrictions do not break the page', () => { const a = boot({ noStorage: true }); a.skip.emit('click'); a.advance(350); closed(a); });
test('Spanish visitor gets translated controls', () => { const a = boot({ lang: 'es' }); assert.match(a.skip.textContent, /Omitir/); assert.match(a.dialog.attrs['aria-label'], /Bienvenido/); });
test('enabling reduced motion closes immediately', () => { const a = boot(); a.motion.matches = true; a.motion.emit('change', { matches: true }); closed(a); });
test('leaving page closes overlay before browser back restoration', () => { const a = boot(); a.window.emit('pagehide'); closed(a); });

test('completed intro records the visit', () => { const a = boot(); a.video.emit('ended'); assert.equal(a.stored(), '1'); });
test('Skip records the visit', () => { const a = boot(); a.skip.emit('click'); assert.equal(a.stored(), '1'); });
test('media failure does not suppress a retry', () => { const a = boot(); a.video.emit('error'); assert.equal(a.stored(), null); });
test('explicit replay bypasses the seen flag', () => { const a = boot({ seen: true, replay: true }); assert.equal(a.dialog.open, true); });
test('replay still respects reduced motion', () => { const a = boot({ seen: true, replay: true, reduced: true }); closed(a); });
test('manual Play retries playback', async () => { const a = boot({ reject: true }); await Promise.resolve(); a.play.emit('click'); assert.equal(a.video.plays, 2); await Promise.resolve(); a.video.emit('playing'); assert.equal(a.play.hidden, true); a.advance(15000); assert.equal(a.dialog.open, true); });
