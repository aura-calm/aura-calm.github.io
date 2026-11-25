/* Aura — app.js : navigation, themes, sound toggle, micro-interactions, home, fx, easter egg */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var root = document.documentElement, body = document.body;
  var VIEWS = ['home', 'breathe', 'meditate', 'sounds', 'focus', 'journal', 'move', 'night', 'about'];
  if (Aura.lowPower) body.classList.add('reduce-fx');

  /* ================= FX overlay (sparkles + petals) ================= */
  var fxc = $('fx'), fctx = fxc.getContext('2d'), fparts = [], FW = 0, FH = 0, FD = 1;
  function fxFit() { var f = Aura.fitCanvas(fxc); FW = f.w; FH = f.h; FD = f.d; }
  var floop = Aura.loop(function (dt) {
    fctx.clearRect(0, 0, FW, FH);
    for (var i = fparts.length - 1; i >= 0; i--) {
      var p = fparts[i];
      p.life += dt;
      if (p.life > p.max) { fparts.splice(i, 1); continue; }
      var k = 1 - p.life / p.max;
      if (p.petal) {
        p.x += (p.vx + Math.sin(p.life * 2 + p.ph) * 40 * FD) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.scale(1, 0.45 + 0.35 * Math.sin(p.life * 3 + p.ph));
        fctx.globalAlpha = Math.min(1, k * 1.5) * 0.9;
        fctx.fillStyle = Aura.rgba(p.c, 1);
        fctx.beginPath(); fctx.ellipse ? fctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.2832) : fctx.arc(0, 0, p.s * 0.6, 0, 6.2832); fctx.fill();
        fctx.restore();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * FD * dt; p.vx *= 0.97;
        fctx.globalAlpha = k; fctx.fillStyle = Aura.rgba(p.c, 1);
        fctx.beginPath(); fctx.arc(p.x, p.y, p.s * k + 0.5, 0, 6.2832); fctx.fill();
      }
    }
    fctx.globalAlpha = 1;
    if (!fparts.length) { floop.stop(); fctx.clearRect(0, 0, FW, FH); }
  });
  Aura.fx = {
    burst: function (el, n) {
      if (Aura.reduced) return;
      fxFit();
      var r = el.getBoundingClientRect(), cx = (r.left + r.width / 2) * FD, cy = (r.top + r.height / 2) * FD, C = Aura.themeColors();
      for (var i = 0; i < (n || 26); i++) {
        var a = Math.random() * 6.28, s = Aura.rand(120, 420) * FD;
        fparts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160 * FD, life: 0, max: Aura.rand(0.6, 1.2), s: Aura.rand(1.5, 3.5) * FD, c: Aura.pick([C.c2, C.c3, C.c4]) });
      }
      floop.start();
    },
    petals: function () {
      if (Aura.reduced) return;
      fxFit();
      var C = Aura.themeColors();
      for (var i = 0; i < (Aura.lowPower ? 40 : 90); i++) {
        fparts.push({ petal: true, x: Math.random() * FW, y: -Math.random() * FH * 0.6, vx: Aura.rand(-30, 30) * FD, vy: Aura.rand(60, 150) * FD,
          rot: Math.random() * 6.28, vr: Aura.rand(-2, 2), s: Aura.rand(6, 13) * FD, ph: Math.random() * 6, life: 0, max: Aura.rand(6, 10),
          c: Aura.pick([C.c4, C.c2, C.c3, Aura.mix(C.c4, [255, 255, 255], 0.5)]) });
      }
      floop.start();
    }
  };

  /* ================= Navigation ================= */
  var current = null, veil = $('veil');
  function veilAt(x, y) {
    if (Aura.reduced || !veil) return;
    veil.style.setProperty('--vx', x + 'px'); veil.style.setProperty('--vy', y + 'px');
    veil.classList.remove('go'); void veil.offsetWidth; veil.classList.add('go');
  }
  function go(v, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(v) < 0) v = 'home';
    closeNav();
    if (v === current) return;
    var prev = current; current = v; Aura.currentView = v;
    var target = null;
    Aura.$$('.view').forEach(function (sec) {
      var on = sec.getAttribute('data-view') === v;
      if (on) { target = sec; sec.hidden = false; sec.classList.remove('is-active'); void sec.offsetWidth; sec.classList.add('is-active'); }
      else { sec.hidden = true; sec.classList.remove('is-active'); }
    });
    Aura.$$('.nav-btn, .dock-btn').forEach(function (b) {
      if (b.getAttribute('data-view') === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (!opts.fromHash) {
      try { history.pushState({ v: v }, '', '#' + v); } catch (e) { /* file:// or sandbox */ }
    }
    window.scrollTo(0, 0);
    Aura.emit('view', v);
    if (prev !== null && target && !opts.noFocus) {
      var h = target.querySelector('h1, h2');
      if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    }
  }
  Aura.go = go;
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.nav-btn, .dock-btn, [data-go]') : null;
    if (!b) return;
    var v = b.getAttribute('data-view') || b.getAttribute('data-go');
    if (!v) return;
    if (e.clientX || e.clientY) veilAt(e.clientX, e.clientY);
    else { var r = b.getBoundingClientRect(); veilAt(r.left + r.width / 2, r.top + r.height / 2); }
    go(v);
  });
  function fromHash() { var h = (location.hash || '').replace('#', ''); go(VIEWS.indexOf(h) >= 0 ? h : 'home', { fromHash: true }); }
  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', fromHash);

  /* mobile drawer */
  var menuBtn = $('menuBtn'), menuIcon = $('menuIcon'), scrim = $('scrim');
  function openNav() {
    body.classList.add('nav-open');
    menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu');
    menuIcon.setAttribute('href', '#i-close');
    var first = document.querySelector('.nav-btn[aria-current="page"]') || document.querySelector('.nav-btn');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 120);
  }
  function closeNav() {
    if (!body.classList.contains('nav-open')) return;
    body.classList.remove('nav-open');
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    menuIcon.setAttribute('href', '#i-menu');
  }
  menuBtn.addEventListener('click', function () { if (body.classList.contains('nav-open')) closeNav(); else openNav(); });
  scrim.addEventListener('click', closeNav);

  /* ================= Themes ================= */
  var THEME_JOKES = {
    aurora: 'Aurora: the northern lights, minus the frostbite.',
    ocean: 'Ocean: deep, blue and refreshingly salt-free.',
    forest: 'Forest: all the trees, none of the mosquitoes.',
    ember: 'Midnight Ember: cosy as a fireplace, zero chimney sweeping.',
    sunrise: 'Sunrise: a fresh start, available at any hour.'
  };
  var themeBtn = $('themeBtn'), themeMenu = $('themeMenu');
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  function setTheme(name, quiet) {
    if (!THEME_JOKES[name]) name = 'aurora';
    root.setAttribute('data-theme', name);
    Aura.store.set('theme', name);
    Aura.$$('.theme-opt').forEach(function (o) { o.setAttribute('aria-checked', o.getAttribute('data-theme') === name ? 'true' : 'false'); });
    var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (metaTheme && bg) metaTheme.setAttribute('content', bg);
    Aura.emit('theme', name);
    if (!quiet) { Aura.toast(THEME_JOKES[name]); if (A.on()) A.chime(); }
  }
  function openThemes() {
    themeMenu.hidden = false; themeBtn.setAttribute('aria-expanded', 'true');
    var cur = themeMenu.querySelector('[aria-checked="true"]') || themeMenu.querySelector('.theme-opt');
    if (cur) cur.focus();
  }
  function closeThemes(focusBtn) {
    if (themeMenu.hidden) return;
    themeMenu.hidden = true; themeBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) themeBtn.focus();
  }
  themeBtn.addEventListener('click', function () { if (themeMenu.hidden) openThemes(); else closeThemes(); });
  Aura.$$('.theme-opt').forEach(function (o) {
    o.addEventListener('click', function (e) {
      var r = o.getBoundingClientRect();
      veilAt(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      setTheme(o.getAttribute('data-theme'));
      closeThemes(true);
    });
  });
  themeMenu.addEventListener('keydown', function (e) {
    var opts = Aura.$$('.theme-opt'), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!themeMenu.hidden && !themeMenu.contains(e.target) && !themeBtn.contains(e.target)) closeThemes();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!themeMenu.hidden) closeThemes(true); if (body.classList.contains('nav-open')) { closeNav(); menuBtn.focus(); } }
  });

  /* ================= Sound toggle ================= */
  var sBtn = $('soundToggle'), sIcon = $('soundIcon');
  function soundUI(on) {
    sBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    sBtn.setAttribute('aria-label', on ? 'Sound is on. Mute all sound' : 'Sound is off. Turn sound on');
    sIcon.setAttribute('href', on ? '#i-vol-on' : '#i-vol-off');
  }
  sBtn.addEventListener('click', function () {
    if (!A.supported) { Aura.toast('Web Audio isn’t available in this browser — enjoy the visual calm.'); return; }
    var on = !A.enabled;
    A.setEnabled(on);
    Aura.toast(on ? 'Sound on 🔊 Everything you hear is synthesised live.' : 'Muted. The rain is still there, just very, very quietly.');
  });
  Aura.on('sound', soundUI);
  soundUI(A.enabled);

  /* ================= Micro-interactions ================= */
  var RIPPLE = '.btn, .chip, .tile, .icon-btn, .nav-btn, .dock-btn, .mix-toggle, .mood-btn, .theme-opt';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest ? e.target.closest(RIPPLE) : null;
    if (el) {
      if (!Aura.reduced) {
        var r = el.getBoundingClientRect(), sp = document.createElement('span');
        sp.className = 'ripple'; sp.style.left = (e.clientX - r.left) + 'px'; sp.style.top = (e.clientY - r.top) + 'px';
        el.appendChild(sp);
        setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 750);
      }
      if (A.enabled) A.click();
    }
    var g = e.target.closest ? e.target.closest('.glass') : null;
    if (g) {
      var gr = g.getBoundingClientRect();
      g.style.setProperty('--mx', (e.clientX - gr.left) + 'px'); g.style.setProperty('--my', (e.clientY - gr.top) + 'px');
      if (e.pointerType !== 'mouse') { g.classList.add('lit'); setTimeout(function () { g.classList.remove('lit'); }, 800); }
    }
  }, { passive: true });
  var lastG = null;
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var g = e.target.closest ? e.target.closest('.glass') : null;
    if (!g) return;
    if (g !== lastG) lastG = g;
    var r = g.getBoundingClientRect();
    g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  var topbar = $('topbar');
  function onScroll() { topbar.classList.toggle('scrolled', (window.scrollY || window.pageYOffset) > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  Aura.$$('input[type="range"]').forEach(function (r) { Aura.paintRange(r); });

  /* ================= Home ================= */
  var JOKES = [
    'Breathe in. Breathe out. You just did something today.',
    'Your to-do list called. We let it go to voicemail.',
    'Inhale the good stuff. Exhale the group chat.',
    'Fun fact: you’ve breathed about 20,000 times today without a single tutorial.',
    'Relax your shoulders. They’re not earrings.',
    'Hydrate, breathe, repeat. You’re basically a very complex houseplant.',
    'Calm is a skill. You’re in the right gym. No membership fees.',
    'Do less, but with more blanket.'
  ];
  var greet = $('greetTime'), joke = $('homeJoke'), ji = 0;
  function greeting() {
    var h = new Date().getHours();
    greet.textContent = h < 5 ? 'Still up? The stars approve 🌙' : h < 12 ? 'Good morning, lovely human ☀️' : h < 17 ? 'Good afternoon — time for a pause?' : h < 21 ? 'Good evening. Let the day soften.' : 'Winding down? The night sky is ready.';
  }
  greeting();
  setInterval(function () {
    if (current !== 'home' || document.hidden) return;
    ji = (ji + 1) % JOKES.length;
    joke.classList.add('swap');
    setTimeout(function () { joke.textContent = JOKES[ji]; joke.classList.remove('swap'); }, 600);
  }, 9000);
  if (Aura.dailyAffirmation) $('homeAffirm').textContent = Aura.dailyAffirmation();
  function homeStats() {
    var s = Aura.stats, J = Aura.journal || { moods: [], grat: [] };
    var mins = Math.round(((s.breathMin || 0) + (s.medMin || 0)) * 10) / 10;
    var items = [[s.breaths || 0, 'breath cycles'], [mins, 'mindful minutes'], [s.focus || 0, 'focus sessions'],
      [J.moods.length, 'check-ins'], [J.grat.length, 'gratitudes'], [Object.keys(s.days || {}).length, 'calm days']];
    $('homeStats').innerHTML = items.map(function (it) { return '<li><b>' + it[0] + '</b><span>' + it[1] + '</span></li>'; }).join('') ;
    if (!items.some(function (it) { return it[0] > 0; })) {
      $('homeStats').insertAdjacentHTML('afterend', '');
    }
  }
  homeStats();
  Aura.on('stats', homeStats);
  Aura.on('view', function (v) { if (v === 'home') { greeting(); homeStats(); } });

  /* ================= Easter egg: tap the logo 7× (or type “namaste”) ================= */
  var taps = 0, tapT = 0, brand = $('brand');
  function egg() {
    body.classList.remove('egg-on'); void body.offsetWidth; body.classList.add('egg-on');
    setTimeout(function () { body.classList.remove('egg-on'); }, 6500);
    Aura.fx.petals();
    if (Aura.bg) Aura.bg.pulse(1);
    if (A.on()) { A.om(); Aura.toast('🪷 You found the Cosmic Hum — 136.1 Hz. The universe says hi.', 6000); }
    else Aura.toast('🪷 You found the secret lotus shower! (Turn sound on and try again for the Cosmic Hum.)', 6000);
    Aura.vibrate([30, 50, 30, 50, 120]);
  }
  brand.addEventListener('click', function () {
    var now = Date.now();
    taps = (now - tapT < 1500) ? taps + 1 : 1; tapT = now;
    brand.classList.remove('wiggle'); void brand.offsetWidth; brand.classList.add('wiggle');
    setTimeout(function () { brand.classList.remove('wiggle'); }, 500);
    if (taps === 4) Aura.toast('Keep going… something is stirring ✨', 1500);
    if (taps >= 7) { taps = 0; egg(); return; }
    if (taps === 1) go('home');
  });
  var typed = '';
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || !e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-7);
    if (typed === 'namaste') { typed = ''; egg(); }
  });

  /* ================= Boot ================= */
  setTheme(Aura.store.get('theme', 'aurora'), true);
  fromHash();
  if (!Aura.store.get('visited', false)) {
    Aura.store.set('visited', true);
    setTimeout(function () { Aura.toast('Welcome to Aura 🌌 Sound stays off until you tap the speaker. Take your time.', 5000); }, 1400);
  }
  if (window.console && console.log) console.log('%cAura', 'font-size:20px;color:#7ef0d0', '— breathe, focus, sleep. Psst: type “namaste”.');
})();
