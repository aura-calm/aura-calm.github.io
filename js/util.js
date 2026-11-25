/* Aura — util.js : namespace, helpers, storage, device capability, events */
(function () {
  'use strict';
  var Aura = window.Aura = window.Aura || {};

  Aura.$ = function (s, r) { return (r || document).querySelector(s); };
  Aura.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  Aura.byId = function (id) { return document.getElementById(id); };

  /* ---- tiny event bus ---- */
  var L = {};
  Aura.on = function (n, f) { (L[n] = L[n] || []).push(f); };
  Aura.emit = function (n, d) {
    (L[n] || []).forEach(function (f) { try { f(d); } catch (e) { if (window.console) console.warn('[Aura]', n, e); } });
  };

  /* ---- motion + power ---- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  Aura.reduced = !!(mq && mq.matches);
  if (mq) {
    var onMq = function (e) { Aura.reduced = e.matches; Aura.emit('motion', e.matches); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
  var nav = navigator;
  var cores = nav.hardwareConcurrency || 4;
  var mem = nav.deviceMemory || 4;
  var saveData = !!(nav.connection && nav.connection.saveData);
  var ua = nav.userAgent || '';
  Aura.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (nav.maxTouchPoints > 1 && /Macintosh/.test(ua));
  Aura.lowPower = saveData || cores <= 2 || mem <= 2 || (Aura.isMobile && cores <= 4);
  Aura.setLowPower = function () {
    if (Aura.lowPower) return;
    Aura.lowPower = true;
    document.body.classList.add('reduce-fx');
    Aura.emit('lowpower');
  };
  /* quality multiplier for particle counts etc. */
  Aura.quality = function () { return Aura.reduced ? 0.3 : (Aura.lowPower ? 0.5 : 1); };
  Aura.dpr = function () { return Math.min(2, window.devicePixelRatio || 1); };

  /* ---- storage (namespaced, safe in private mode) ---- */
  Aura.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('aura:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('aura:' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem('aura:' + k); } catch (e) {} }
  };

  /* ---- toast ---- */
  var tt = 0;
  Aura.toast = function (msg, ms) {
    var el = Aura.byId('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(function () { el.classList.remove('show'); }, ms || 3200);
  };

  /* ---- maths ---- */
  Aura.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  Aura.lerp = function (a, b, t) { return a + (b - a) * t; };
  Aura.easeIO = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * Aura.clamp(t, 0, 1)); };
  Aura.rand = function (a, b) { return a + Math.random() * (b - a); };
  Aura.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  Aura.fmt = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = h ? String(m).padStart(2, '0') : String(m);
    return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  };
  Aura.today = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  Aura.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  /* ---- colours from CSS theme tokens ---- */
  Aura.hex2rgb = function (h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return [128, 128, 160];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  Aura.themeColors = function () {
    var cs = getComputedStyle(document.documentElement);
    var g = function (v) { return Aura.hex2rgb(cs.getPropertyValue(v)); };
    return { bg: g('--bg'), c1: g('--c1'), c2: g('--c2'), c3: g('--c3'), c4: g('--c4'), text: g('--text'),
      light: cs.getPropertyValue('--light').trim() === '1' };
  };
  Aura.rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  Aura.mix = function (a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; };

  /* ---- haptics (Android/Chrome; silently ignored elsewhere) ---- */
  Aura.canVibrate = typeof nav.vibrate === 'function';
  Aura.vibrate = function (p) { try { if (Aura.canVibrate) nav.vibrate(p); } catch (e) {} };

  /* ---- canvas sizing with capped DPR ---- */
  Aura.fitCanvas = function (cv, scale) {
    var r = cv.getBoundingClientRect();
    var d = Aura.dpr() * (scale || 1);
    var w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return { w: w, h: h, d: d, cw: r.width, ch: r.height };
  };

  /* ---- rAF loop helper (dt in seconds, clamped) ---- */
  Aura.loop = function (fn) {
    var id = 0, run = false, last = 0;
    function f(t) {
      if (!run) return;
      var dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016;
      last = t;
      try { fn(dt, t / 1000); } catch (e) { run = false; if (window.console) console.warn('[Aura loop]', e); return; }
      id = requestAnimationFrame(f);
    }
    return {
      start: function () { if (run) return; run = true; last = 0; id = requestAnimationFrame(f); },
      stop: function () { run = false; cancelAnimationFrame(id); },
      isRunning: function () { return run; }
    };
  };

  /* ---- wake lock (optional enhancement) ---- */
  Aura.wake = {
    lock: null, want: 0,
    on: function () {
      var self = this; self.want++;
      try {
        if (nav.wakeLock && !self.lock) {
          nav.wakeLock.request('screen').then(function (l) {
            self.lock = l;
            l.addEventListener('release', function () { self.lock = null; });
          }).catch(function () {});
        }
      } catch (e) {}
    },
    off: function () {
      this.want = Math.max(0, this.want - 1);
      if (this.want === 0 && this.lock) { try { this.lock.release(); } catch (e) {} this.lock = null; }
    }
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Aura.wake.want > 0 && !Aura.wake.lock) { Aura.wake.want--; Aura.wake.on(); }
    Aura.emit('visibility', !document.hidden);
  });

  /* ---- speech (Web Speech API, optional) ---- */
  Aura.canSpeak = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  Aura.speak = function (text, opts) {
    opts = opts || {};
    if (!Aura.canSpeak) return null;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate || 0.9; u.pitch = opts.pitch || 1; u.volume = 1;
      if (opts.voice) u.voice = opts.voice;
      if (opts.onend) { u.onend = opts.onend; u.onerror = opts.onend; }
      window.speechSynthesis.speak(u);
      return u;
    } catch (e) { return null; }
  };
  Aura.stopSpeak = function () { try { if (Aura.canSpeak) window.speechSynthesis.cancel(); } catch (e) {} };

  /* ---- stats ---- */
  Aura.stats = Aura.store.get('stats', null) || { breaths: 0, breathMin: 0, medMin: 0, focus: 0, days: {} };
  if (!Aura.stats.days) Aura.stats.days = {};
  Aura.addStat = function (k, v) {
    Aura.stats[k] = Math.round(((Aura.stats[k] || 0) + v) * 10) / 10;
    Aura.stats.days[Aura.today()] = 1;
    Aura.store.set('stats', Aura.stats);
    Aura.emit('stats');
  };

  /* range inputs: paint filled part (webkit) */
  Aura.paintRange = function (el) {
    var min = parseFloat(el.min) || 0, max = parseFloat(el.max) || 1;
    el.style.setProperty('--fill', ((parseFloat(el.value) - min) / (max - min) * 100) + '%');
  };
})();
