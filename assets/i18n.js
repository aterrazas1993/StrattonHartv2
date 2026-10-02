/*
 * English / Spanish toggle for strattonhart.com.
 *
 * English is the text in the HTML. Spanish lives next to it on the same element:
 *   <p data-i18n data-es="Hola">Hello</p>                     -> swaps the element's contents
 *   <input data-i18n data-es-placeholder="Tu nombre" ...>      -> swaps an attribute
 * Any element with [data-lang-toggle] switches language when clicked.
 * The choice is remembered in localStorage and can be forced with ?lang=es or ?lang=en.
 *
 * To add or change a translation, edit the data-es attribute on that element.
 * Text set from JavaScript should go through window.shT('English', 'Español').
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sh-lang';
  var ATTR_PREFIX = 'data-es-';
  var applied = 'en';
  var originals = new WeakMap();

  function remember(el) {
    var saved = originals.get(el);
    if (!saved) {
      saved = { html: null, attrs: {} };
      originals.set(el, saved);
    }
    return saved;
  }

  function translatedAttrs(el) {
    var names = [];
    for (var i = 0; i < el.attributes.length; i++) {
      var name = el.attributes[i].name;
      if (name.indexOf(ATTR_PREFIX) === 0) names.push(name.slice(ATTR_PREFIX.length));
    }
    return names;
  }

  function toSpanish(el) {
    var saved = remember(el);
    if (el.hasAttribute('data-es')) {
      saved.html = el.innerHTML;
      el.innerHTML = el.getAttribute('data-es');
    }
    translatedAttrs(el).forEach(function (name) {
      saved.attrs[name] = el.getAttribute(name);
      el.setAttribute(name, el.getAttribute(ATTR_PREFIX + name));
    });
  }

  function toEnglish(el) {
    var saved = originals.get(el);
    if (!saved) return;
    if (saved.html !== null) el.innerHTML = saved.html;
    Object.keys(saved.attrs).forEach(function (name) {
      if (saved.attrs[name] === null) el.removeAttribute(name);
      else el.setAttribute(name, saved.attrs[name]);
    });
  }

  function setLanguage(lang) {
    lang = lang === 'es' ? 'es' : 'en';
    if (lang !== applied) {
      var els = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < els.length; i++) {
        if (lang === 'es') toSpanish(els[i]);
        else toEnglish(els[i]);
      }
      applied = lang;
    }
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode: choice just isn't saved */ }
    window.dispatchEvent(new CustomEvent('sh:langchange', { detail: { lang: lang } }));
  }

  function initialLanguage() {
    var fromUrl = /[?&]lang=(en|es)\b/.exec(window.location.search);
    if (fromUrl) return fromUrl[1];
    try { return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; }
  }

  // Pick the right string for text that scripts write into the page.
  window.shT = function (english, spanish) {
    return applied === 'es' ? spanish : english;
  };
  window.shLang = function () { return applied; };
  window.shSetLang = setLanguage;

  document.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('[data-lang-toggle]') : null;
    if (!button) return;
    setLanguage(applied === 'es' ? 'en' : 'es');
  });

  if (initialLanguage() === 'es') setLanguage('es');
  // The page <head> hides the body for returning Spanish visitors until this point.
  document.documentElement.classList.remove('lang-loading');
})();
