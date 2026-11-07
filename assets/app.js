/* Meshkat landing page — fills text from content/*.json, handles language, tabs and forms.
   You should not need to edit this file to change any wording: edit content/en.json, content/ar.json
   and content/settings.json instead. */
(function () {
  'use strict';

  var LANGS = ['en', 'ar'];
  var STORAGE_KEY = 'meshkat-lang';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  var state = { lang: 'en', content: {}, settings: {}, cache: {} };
  var root = document.documentElement;

  /* ---------- helpers ---------- */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function t(key) {
    var v = get(state.content, key);
    return typeof v === 'string' ? v : '';
  }
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function isSet(value) {
    return typeof value === 'string' && value.trim() !== '' && value.indexOf('PASTE_') !== 0;
  }
  function loadJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }
  function loadLang(lang) {
    if (state.cache[lang]) return Promise.resolve(state.cache[lang]);
    return loadJSON('content/' + lang + '.json').then(function (data) {
      state.cache[lang] = data;
      return data;
    });
  }

  /* ---------- language ---------- */
  function pickLanguage() {
    var fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(fromUrl) !== -1) return fromUrl;
    var saved = store(STORAGE_KEY);
    if (LANGS.indexOf(saved) !== -1) return saved;
    var browser = (navigator.language || '').toLowerCase();
    return browser.indexOf('ar') === 0 ? 'ar' : 'en';
  }

  function setLanguage(lang) {
    return loadLang(lang).then(function (content) {
      state.lang = lang;
      state.content = content;
      store(STORAGE_KEY, lang);
      // keep a shared ?lang= link in sync with the visitor's choice
      var url = new URL(location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
      }
      render();
    });
  }

  /* ---------- fill the page ---------- */
  function render() {
    root.lang = state.lang;
    root.dir = state.lang === 'ar' ? 'rtl' : 'ltr';

    document.title = t('meta.title');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));

    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.hasAttribute('data-busy')) return; // a button showing "Sending…"
      el.textContent = t(el.getAttribute('data-i18n')).replace('{year}', year);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });

    // dropdowns: values stay in English (for the sheet), labels follow the language
    document.querySelectorAll('select[data-options]').forEach(function (sel) {
      var current = sel.value;
      var options = get(state.content, sel.getAttribute('data-options')) || [];
      sel.innerHTML = '';
      var first = new Option(t('forms.choose'), '');
      first.disabled = true;
      sel.add(first);
      options.forEach(function (o) { sel.add(new Option(o.label, o.value)); });
      sel.value = current;
      if (sel.value !== current || !current) sel.value = '';
    });

    // checkbox groups
    document.querySelectorAll('[data-checks]').forEach(function (group) {
      var box = group.querySelector('.checks');
      var name = group.getAttribute('data-required-group');
      var checked = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (i) { return i.value; });
      var options = get(state.content, group.getAttribute('data-checks')) || [];
      box.innerHTML = '';
      options.forEach(function (o, i) {
        var id = group.id + '-' + i;
        var label = document.createElement('label');
        label.className = 'check';
        label.setAttribute('for', id);
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.name = name;
        input.value = o.value;
        input.checked = checked.indexOf(o.value) !== -1;
        var span = document.createElement('span');
        span.textContent = o.label;
        label.appendChild(input);
        label.appendChild(span);
        box.appendChild(label);
      });
    });

    // error messages already on screen switch language too
    document.querySelectorAll('.field-error[data-key]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-key'));
    });
    document.querySelectorAll('.form-status[data-key]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-key'));
    });
  }

  function applySettings() {
    var s = state.settings;

    document.querySelectorAll('[data-link="calendar"]').forEach(function (a) {
      if (isSet(s.calendarUrl)) {
        a.href = s.calendarUrl;
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        // No calendar link yet: send people to the company form instead of a dead link
        a.setAttribute('data-goto', 'company');
      }
    });

    document.querySelectorAll('[data-link="email"]').forEach(function (a) {
      if (isSet(s.contactEmail)) a.href = 'mailto:' + s.contactEmail;
      else a.hidden = true;
    });
    document.querySelectorAll('[data-link="linkedin"]').forEach(function (a) {
      if (isSet(s.linkedinUrl)) a.href = s.linkedinUrl;
      else a.hidden = true;
    });

    document.getElementById('proof').hidden = s.showProof !== true;
  }

  /* ---------- tabs ---------- */
  var tabs = {};
  function selectTab(type, focusTab) {
    ['company', 'talent'].forEach(function (k) {
      var on = k === type;
      tabs[k].tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tabs[k].tab.tabIndex = on ? 0 : -1;
      tabs[k].panel.hidden = !on;
    });
    if (focusTab) tabs[type].tab.focus();
  }

  function setupTabs() {
    ['company', 'talent'].forEach(function (k) {
      tabs[k] = { tab: document.getElementById('tab-' + k), panel: document.getElementById('panel-' + k) };
      tabs[k].tab.addEventListener('click', function () { selectTab(k); });
      tabs[k].tab.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) === -1) return;
        e.preventDefault();
        selectTab(k === 'company' ? 'talent' : 'company', true);
      });
    });

    // "Hire talent" / "Join the network" buttons open the right form
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-goto]');
      if (!link) return;
      e.preventDefault();
      var type = link.getAttribute('data-goto');
      selectTab(type);
      document.getElementById('forms').scrollIntoView();
      tabs[type].panel.focus({ preventScroll: true });
    });

    if (location.hash === '#join') selectTab('talent');
  }

  /* ---------- form validation ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function normalizeUrl(value) {
    var v = value.trim();
    if (!v) return v;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }
  function isValidUrl(value) {
    try {
      var u = new URL(normalizeUrl(value));
      return /^https?:$/.test(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname);
    } catch (e) { return false; }
  }

  function fieldOf(el) { return el.closest('.field'); }

  function showError(field, key) {
    var err = field.querySelector('.field-error');
    var controls = field.querySelectorAll('input, select, textarea');
    if (key) {
      field.classList.add('has-error');
      err.setAttribute('data-key', key);
      err.textContent = t(key);
    } else {
      field.classList.remove('has-error');
      err.removeAttribute('data-key');
      err.textContent = '';
    }
    controls.forEach(function (c) {
      if (key) {
        c.setAttribute('aria-invalid', 'true');
        c.setAttribute('aria-describedby', err.id);
      } else {
        c.removeAttribute('aria-invalid');
      }
    });
  }

  function checkControl(el) {
    var value = (el.value || '').trim();
    if (el.required && !value) return el.tagName === 'SELECT' ? 'errors.select' : 'errors.required';
    if (value && el.getAttribute('data-validate') === 'email' && !EMAIL_RE.test(value)) return 'errors.email';
    if (value && el.getAttribute('data-validate') === 'url' && !isValidUrl(value)) return 'errors.url';
    return '';
  }

  function checkGroup(group) {
    return group.querySelector('input:checked') ? '' : 'errors.checkbox';
  }

  function validateForm(form) {
    var firstBad = null;
    form.querySelectorAll('input:not([type="checkbox"]):not([name="website_url"]), select, textarea').forEach(function (el) {
      var key = checkControl(el);
      if (fieldOf(el).querySelector('.field-error')) showError(fieldOf(el), key);
      if (key && !firstBad) firstBad = el;
    });
    form.querySelectorAll('[data-required-group]').forEach(function (group) {
      var key = checkGroup(group);
      showError(group, key);
      if (key && !firstBad) firstBad = group.querySelector('input');
    });
    return firstBad;
  }

  function liveRecheck(form) {
    // once a field shows an error, clear it as soon as the visitor fixes it
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
    function recheck(e) {
      var el = e.target;
      var group = el.closest('[data-required-group]');
      if (group) {
        if (group.classList.contains('has-error')) showError(group, checkGroup(group));
        return;
      }
      var field = fieldOf(el);
      if (field && field.classList.contains('has-error')) showError(field, checkControl(el));
    }
    form.addEventListener('focusout', function (e) {
      var el = e.target;
      if (el.type === 'checkbox' || !el.value || !fieldOf(el) || !fieldOf(el).querySelector('.field-error')) return;
      showError(fieldOf(el), checkControl(el));
    });
  }

  /* ---------- form sending ---------- */
  function setStatus(form, key) {
    var el = form.querySelector('.form-status');
    if (key) { el.setAttribute('data-key', key); el.textContent = t(key); }
    else { el.removeAttribute('data-key'); el.textContent = ''; }
  }

  function showSuccess(form) {
    var success = form.parentNode.querySelector('.success');
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  function buildBody(form) {
    var body = new URLSearchParams();
    var multi = {};
    new FormData(form).forEach(function (value, name) {
      var v = String(value).trim();
      var el = form.querySelector('[name="' + name + '"]');
      if (el && el.getAttribute('data-validate') === 'url') v = normalizeUrl(v);
      if (el && el.type === 'checkbox') { (multi[name] = multi[name] || []).push(v); return; }
      body.append(name, v);
    });
    Object.keys(multi).forEach(function (k) { body.append(k, multi[k].join(', ')); });

    var params = new URLSearchParams(location.search);
    body.append('formType', form.getAttribute('data-form-type'));
    body.append('lang', state.lang);
    body.append('pageUrl', location.href);
    body.append('submittedAt', new Date().toISOString());
    UTM_KEYS.forEach(function (k) { body.append(k, params.get(k) || ''); });
    return body;
  }

  function setupForm(form) {
    liveRecheck(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus(form, '');

      var firstBad = validateForm(form);
      if (firstBad) {
        setStatus(form, 'forms.fixErrors');
        firstBad.focus();
        return;
      }

      // Honeypot: real people never see this field. If it's filled, pretend it worked.
      if (form.querySelector('[name="website_url"]').value) { showSuccess(form); return; }

      if (!isSet(state.settings.formEndpoint)) {
        setStatus(form, 'forms.errorNotConfigured');
        return;
      }

      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      button.setAttribute('data-busy', '');
      button.textContent = t('forms.sending');

      fetch(state.settings.formEndpoint, { method: 'POST', mode: 'no-cors', body: buildBody(form) })
        .then(function () { showSuccess(form); })
        .catch(function () { setStatus(form, 'forms.errorNetwork'); })
        .then(function () {
          button.disabled = false;
          button.removeAttribute('data-busy');
          button.textContent = t(button.getAttribute('data-label'));
        });
    });
  }

  /* ---------- start ---------- */
  function start() {
    setupTabs();
    document.querySelectorAll('form[data-form-type]').forEach(setupForm);
    document.getElementById('lang-switch').addEventListener('click', function () {
      setLanguage(state.lang === 'en' ? 'ar' : 'en').catch(function (err) {
        console.error('Meshkat: could not switch language.', err);
      });
    });

    Promise.all([loadJSON('content/settings.json'), setLanguage(pickLanguage())])
      .then(function (results) {
        state.settings = results[0] || {};
        applySettings();
      })
      .catch(function (err) {
        console.error('Meshkat: could not load page content.', err);
        document.getElementById('load-error').hidden = false;
      })
      .then(function () { root.classList.remove('is-loading'); });
  }

  start();
})();
