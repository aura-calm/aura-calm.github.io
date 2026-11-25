/* Aura — lofi.js : generative lo-fi hip-hop (chords, bass, drums, vinyl, tape wow) */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio;
  var PROGS = [
    [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],
    [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 48, 52, 55]],
    [[52, 55, 59, 62], [57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 66]],
    [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]]
  ];
  var N1 = ['Cozy', 'Sleepy', 'Rainy', 'Velvet', 'Midnight', 'Soft', 'Mellow', 'Gentle', 'Hazy', 'Unbothered', 'Snoozy', 'Warm'];
  var N2 = ['Spreadsheet', 'Cat Nap', 'Tea Steam', 'Library', 'Window Seat', 'Pillow Fort', 'Sunday Socks', 'Notebook', 'Houseplant', 'Moon Snack', 'Inbox Zero', 'Blanket'];
  var KEYS = ['A minor', 'D minor', 'E minor', 'C major', 'F major'];

  var L = Aura.lofi = { on: false, vol: Aura.store.get('lofiVol', 0.6), analyser: null, title: '', beatPulse: 0 };
  var prog, step = 0, next = 0, timer = 0, bus, lp, wow, wowG, vinyl, nodes = [];

  function env(g, t, a, peak, dec, sus, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dec);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
  }
  function keys(n, t, dur, v) {
    var c = A.ctx, f = A.mtof(n);
    var o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain();
    o1.type = 'triangle'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.002;
    if (wowG) { wowG.connect(o1.detune); wowG.connect(o2.detune); }
    env(g, t, 0.015, v, 0.7, 0.4, t + dur);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.008); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o1.connect(g); o2.connect(g2); g.connect(lp); g2.connect(lp);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + 0.7);
  }
  function bass(n, t, dur) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = A.mtof(n);
    env(g, t, 0.02, 0.28, 0.3, 0.6, t + dur);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(n, t, dur) {
    var c = A.ctx, o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), g = c.createGain(), f = A.mtof(n);
    o.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.value = f * 0.6;
    m.connect(mg); mg.connect(o.frequency);
    if (wowG) wowG.connect(o.detune);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(lp);
    if (A.reverb) { var r = c.createGain(); r.gain.value = 0.4; g.connect(r); r.connect(A.reverb); }
    o.start(t); m.start(t); o.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }
  function kick(t) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.45);
    L.beatPulse = 1;
  }
  function noiseHit(t, type, f, q, v, d) {
    var c = A.ctx, s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise('white'); b.type = type; b.frequency.value = f; if (q) b.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(b); b.connect(g); g.connect(lp); s.start(t, Math.random() * 2); s.stop(t + d + 0.02);
  }
  function snare(t) {
    noiseHit(t, 'bandpass', 1900, 0.7, 0.16, 0.18);
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 185; g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, v) { noiseHit(t, 'highpass', 7200, null, v, 0.035); }
  function pop(t) { noiseHit(t, 'highpass', 3000, null, Aura.rand(0.03, 0.09), 0.006); }

  function play(s, bar, t, spb) {
    var ch = prog[bar];
    if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.45)) kick(t);
    if (s === 4 || s === 12) snare(t);
    if (s % 2 === 0 && Math.random() < 0.88) hat(t, s % 4 === 0 ? 0.045 : 0.025);
    if (s === 15 && Math.random() < 0.3) hat(t, 0.02);
    if (s === 0) {
      ch.forEach(function (n, i) { keys(n, t + i * 0.02, spb * 15, 0.06); });
      bass(ch[0] - 24, t, spb * 6);
    }
    if (s === 8) bass(ch[0] - 24 + (Math.random() < 0.5 ? 7 : 0), t, spb * 5);
    if (s % 2 === 0 && Math.random() < 0.17) {
      var sc = [0, 3, 5, 7, 10], n = ch[0] + 12 + sc[Math.floor(Math.random() * 5)] + (Math.random() < 0.3 ? 12 : 0);
      bell(n, t, spb * 4);
    }
    if (Math.random() < 0.06) pop(t + Math.random() * spb);
  }
  function sched() {
    var c = A.ctx;
    if (!c || !L.on) return;
    var spb = 60 / L.bpm / 4;
    if (next < c.currentTime - 0.5) next = c.currentTime + 0.05; /* recover after tab throttling */
    while (next < c.currentTime + 0.2) {
      var s = step % 16, bar = Math.floor(step / 16) % 4;
      var sw = (s % 2) ? spb * 0.18 : 0;
      try { play(s, bar, next + sw, spb); } catch (e) {}
      next += spb; step++;
      if (step % 64 === 0 && Math.random() < 0.35) prog = Aura.pick(PROGS);
    }
  }

  L.start = function () {
    if (L.on) return true;
    if (!A.ensureOn()) return false;
    var c = A.ctx;
    bus = c.createGain(); bus.gain.value = 0.0001; bus.gain.setTargetAtTime(Math.max(0.0001, L.vol * 0.9), c.currentTime, 0.5);
    lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 0.5;
    L.analyser = c.createAnalyser(); L.analyser.fftSize = 128; L.analyser.smoothingTimeConstant = 0.8;
    lp.connect(bus); bus.connect(L.analyser); L.analyser.connect(A.buses.music);
    wow = c.createOscillator(); wow.frequency.value = 0.55; wowG = c.createGain(); wowG.gain.value = 8; wow.connect(wowG); wow.start();
    vinyl = c.createBufferSource(); vinyl.buffer = A.noise('pink'); vinyl.loop = true;
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
    var vg = c.createGain(); vg.gain.value = 0.022;
    vinyl.connect(hp); hp.connect(vg); vg.connect(bus); vinyl.start();
    nodes = [wow, vinyl];
    prog = Aura.pick(PROGS); L.bpm = 68 + Math.floor(Math.random() * 12);
    step = 0; next = c.currentTime + 0.15;
    timer = setInterval(sched, 25);
    L.on = true;
    L.title = '“' + Aura.pick(N1) + ' ' + Aura.pick(N2) + '” · ' + L.bpm + ' bpm · ' + Aura.pick(KEYS);
    Aura.emit('lofi', true);
    return true;
  };
  L.stop = function () {
    if (!L.on) return;
    L.on = false;
    clearInterval(timer);
    var c = A.ctx, b = bus, ns = nodes, an = L.analyser;
    if (c && b) { b.gain.cancelScheduledValues(c.currentTime); b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), c.currentTime); b.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); }
    setTimeout(function () {
      ns.forEach(function (n) { try { n.stop(); } catch (e) {} });
      try { b.disconnect(); } catch (e) {}
      try { an.disconnect(); } catch (e) {}
    }, 1800);
    wowG = null;
    Aura.emit('lofi', false);
  };
  L.setVol = function (v) {
    L.vol = v; Aura.store.set('lofiVol', v);
    if (L.on && bus && A.ctx) bus.gain.setTargetAtTime(Math.max(0.0001, v * 0.9), A.ctx.currentTime, 0.1);
  };
})();
