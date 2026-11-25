/* Aura — soundscape.js : generative ambient channels, all synthesised with Web Audio */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio;

  function src(type) {
    var s = A.ctx.createBufferSource();
    s.buffer = A.noise(type); s.loop = true;
    s.start(0, Math.random() * 2.5);
    return s;
  }
  function filt(type, f, q) {
    var b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
    if (q != null) b.Q.value = q;
    return b;
  }
  function gain(v) { var g = A.ctx.createGain(); g.gain.value = v; return g; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); }
  function lfo(rate, depth, target) {
    var o = A.ctx.createOscillator(), g = gain(depth);
    o.frequency.value = rate; o.connect(g); g.connect(target); o.start();
    return o;
  }
  /* random-interval scheduler bound to a handle */
  function every(h, fn, minMs, maxMs) {
    function tick() {
      if (!h.alive) return;
      try { fn(); } catch (e) {}
      h.timers.push(setTimeout(tick, Aura.rand(minMs, maxMs)));
      if (h.timers.length > 40) h.timers.splice(0, 20);
    }
    h.timers.push(setTimeout(tick, Aura.rand(minMs, maxMs)));
  }

  /* ---- one-shots ---- */
  function drop(out) {
    var c = A.ctx, t = c.currentTime + Math.random() * 0.08;
    var o = c.createOscillator(), g = c.createGain(), f = Aura.rand(1700, 5200);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.035);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Aura.rand(0.015, 0.06), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.07);
  }
  function crackle(out, big) {
    var c = A.ctx, t = c.currentTime + Math.random() * 0.05;
    var s = c.createBufferSource(); s.buffer = A.noise('white');
    var f = filt(big ? 'bandpass' : 'highpass', big ? Aura.rand(500, 900) : Aura.rand(1400, 4200), big ? 1.2 : null);
    var g = c.createGain(), d = big ? Aura.rand(0.02, 0.05) : Aura.rand(0.003, 0.018), v = big ? Aura.rand(0.3, 0.6) : Aura.rand(0.06, 0.32);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    chain(s, f, g, out); s.start(t, Math.random() * 2); s.stop(t + d + 0.02);
  }
  function chirp(out) {
    var c = A.ctx, t0 = c.currentTime + 0.02, t = t0;
    var pan = A.panner(Aura.rand(-0.85, 0.85)); pan.connect(out);
    var kind = Math.floor(Math.random() * 3), base = Aura.rand(2200, 4300);
    var notes = kind === 0 ? 2 + Math.floor(Math.random() * 4) : (kind === 1 ? 1 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 5));
    for (var i = 0; i < notes; i++) {
      var o = c.createOscillator(), g = c.createGain();
      var d = kind === 2 ? 0.045 : Aura.rand(0.07, 0.15);
      var f1 = base * Aura.rand(0.9, 1.1), f2 = kind === 1 ? f1 * 0.6 : f1 * Aura.rand(1.12, 1.45);
      o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d * 0.7);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Aura.rand(0.08, 0.2), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(pan); o.start(t); o.stop(t + d + 0.03);
      t += d + (kind === 2 ? 0.018 : Aura.rand(0.04, 0.12));
    }
    setTimeout(function () { try { pan.disconnect(); } catch (e) {} }, (t - t0) * 1000 + 600);
  }

  /* ---- channel generators: fn(out) -> handle {src:[], timers:[], alive} ---- */
  var G = {
    rain: function (out, h) {
      var s = src('pink'), hp = filt('highpass', 380), lp = filt('lowpass', 7000), g = gain(0.9);
      chain(s, hp, lp, g, out);
      var s2 = src('white'), bp = filt('bandpass', 2600, 0.6), g2 = gain(0.12);
      chain(s2, bp, g2, out);
      var s3 = src('brown'), lp3 = filt('lowpass', 220), g3 = gain(0.35);
      chain(s3, lp3, g3, out);
      h.src.push(s, s2, s3);
      var rate = Aura.lowPower ? 140 : 80;
      h.timers.push(setInterval(function () {
        var n = Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) drop(out);
      }, rate));
    },
    ocean: function (out, h) {
      var c = A.ctx;
      var s = src('brown'), lp = filt('lowpass', 520, 0.5), g = gain(0.5);
      chain(s, lp, g, out);
      var s2 = src('pink'), hp = filt('highpass', 900), lp2 = filt('lowpass', 5200), g2 = gain(0.12);
      chain(s2, hp, lp2, g2, out);
      var sw = c.createOscillator(); sw.frequency.value = 0.085;
      var d1 = gain(0.42), d2 = gain(0.1), d3 = gain(360);
      sw.connect(d1); d1.connect(g.gain); sw.connect(d2); d2.connect(g2.gain); sw.connect(d3); d3.connect(lp.frequency);
      sw.start();
      var sw2 = lfo(0.031, 0.12, g.gain);
      h.src.push(s, s2, sw, sw2);
    },
    wind: function (out, h) {
      var c = A.ctx;
      var s = src('pink'), bp = filt('bandpass', 600, 0.9), g = gain(0.6);
      chain(s, bp, g, out);
      var s2 = src('white'), bp2 = filt('bandpass', 800, 14), g2 = gain(0.05);
      chain(s2, bp2, g2, out);
      h.src.push(s, s2);
      var walk = function () {
        var t = c.currentTime;
        bp.frequency.setTargetAtTime(Aura.rand(250, 1150), t, 1.6);
        g.gain.setTargetAtTime(Aura.rand(0.35, 1), t, 1.4);
        bp2.frequency.setTargetAtTime(Aura.rand(480, 1200), t, 2);
        g2.gain.setTargetAtTime(Math.random() * 0.09, t, 1.5);
      };
      walk(); h.timers.push(setInterval(walk, 2300));
    },
    birds: function (out, h) {
      var s = src('pink'), hp = filt('highpass', 2600), g = gain(0.035);
      chain(s, hp, g, out);
      var l = lfo(0.07, 0.02, g.gain);
      h.src.push(s, l);
      every(h, function () { chirp(out); if (Math.random() < 0.3) setTimeout(function () { if (h.alive) chirp(out); }, 350); }, 700, 3200);
    },
    fire: function (out, h) {
      var s = src('brown'), lp = filt('lowpass', 320), g = gain(0.75);
      chain(s, lp, g, out);
      var l = lfo(0.23, 0.18, g.gain);
      var s2 = src('pink'), bp = filt('bandpass', 1200, 0.7), g2 = gain(0.04);
      chain(s2, bp, g2, out);
      h.src.push(s, l, s2);
      h.timers.push(setInterval(function () {
        if (Math.random() < 0.38) crackle(out);
        if (Math.random() < 0.04) { for (var i = 0; i < 3 + Math.random() * 4; i++) crackle(out); }
        if (Math.random() < 0.012) crackle(out, true);
      }, Aura.lowPower ? 70 : 45));
    },
    pad: function (out, h) {
      var c = A.ctx;
      var lp = filt('lowpass', 900, 0.7); lp.connect(out);
      var l = lfo(0.045, 420, lp.frequency);
      var chords = [[45, 52, 57, 64], [41, 48, 53, 60], [43, 50, 55, 62], [40, 47, 52, 59]], ci = 0, voices = [];
      for (var i = 0; i < 4; i++) for (var k = 0; k < 2; k++) {
        var o = c.createOscillator(); o.type = k ? 'triangle' : 'sawtooth'; o.detune.value = k ? 7 : -7;
        var vg = gain(k ? 0.05 : 0.03); o.connect(vg); vg.connect(lp); o.start();
        voices.push({ o: o, i: i });
      }
      var set = function (first) {
        var ch = chords[ci++ % chords.length], t = c.currentTime;
        voices.forEach(function (v) {
          var f = A.mtof(ch[v.i]);
          if (first) v.o.frequency.setValueAtTime(f, t); else v.o.frequency.setTargetAtTime(f, t, 1.8);
        });
      };
      set(true); h.timers.push(setInterval(set, 9000));
      h.src.push(l); voices.forEach(function (v) { h.src.push(v.o); });
    },
    brown: function (out, h) { var s = src('brown'), g = gain(0.9); chain(s, g, out); h.src.push(s); },
    pink: function (out, h) { var s = src('pink'), g = gain(0.8); chain(s, g, out); h.src.push(s); },
    white: function (out, h) { var s = src('white'), lp = filt('lowpass', 9000), g = gain(0.45); chain(s, lp, g, out); h.src.push(s); },
    binaural: function (out, h, opts) {
      var c = A.ctx, base = 180, beat = (opts && opts.beat) || 6;
      var l = c.createOscillator(), r = c.createOscillator();
      l.frequency.value = base; r.frequency.value = base + beat;
      var m = c.createChannelMerger(2), gl = gain(0.35), gr = gain(0.35);
      l.connect(gl); r.connect(gr); gl.connect(m, 0, 0); gr.connect(m, 0, 1); m.connect(out);
      l.start(); r.start();
      h.src.push(l, r);
      h.setBeat = function (b) { r.frequency.setTargetAtTime(base + b, c.currentTime, 0.6); };
    }
  };

  var SCALE = { rain: 0.7, ocean: 0.95, wind: 1.5, birds: 0.6, fire: 0.85, pad: 0.9, brown: 0.6, pink: 0.4, white: 0.22, binaural: 0.5 };

  var S = Aura.soundscape = {
    defs: [
      { id: 'rain', name: 'Rain', emoji: '🌧️', tip: 'On a tin roof you never have to fix' },
      { id: 'ocean', name: 'Ocean', emoji: '🌊', tip: 'Slow waves, zero sand in your shoes' },
      { id: 'wind', name: 'Wind', emoji: '🍃', tip: 'Wandering breezes, no hair damage' },
      { id: 'birds', name: 'Forest birds', emoji: '🐦', tip: 'Chirps by tiny procedural birds' },
      { id: 'fire', name: 'Fire crackle', emoji: '🔥', tip: 'Cosy, and no smoke alarm' },
      { id: 'pad', name: 'Cosmic pad', emoji: '✨', tip: 'Slow chords drifting through space' },
      { id: 'brown', name: 'Brown noise', emoji: '🟤', tip: 'Deep & rumbly — a hug for ears' },
      { id: 'pink', name: 'Pink noise', emoji: '🩷', tip: 'Balanced, like a waterfall' },
      { id: 'white', name: 'White noise', emoji: '⚪', tip: 'Crisp hush for busy brains' }
    ],
    active: {},
    isOn: function (id) { return !!S.active[id]; },
    count: function () { return Object.keys(S.active).filter(function (k) { return k !== 'binaural'; }).length; },
    start: function (id, level, opts) {
      if (!G[id]) return false;
      if (!A.ensureOn()) return false;
      if (S.active[id]) { S.level(id, level); return true; }
      var c = A.ctx, g = c.createGain();
      g.gain.value = 0.0001; g.connect(A.buses.ambient);
      var h = { src: [], timers: [], alive: true, gain: g };
      try { G[id](g, h, opts); } catch (e) { if (window.console) console.warn('[Aura sound]', id, e); }
      S.active[id] = h;
      g.gain.setTargetAtTime(Math.max(0.0001, (level == null ? 0.6 : level) * SCALE[id]), c.currentTime, 0.7);
      Aura.emit('mix', id);
      return true;
    },
    level: function (id, v) {
      var h = S.active[id];
      if (h && A.ctx) h.gain.gain.setTargetAtTime(Math.max(0.0001, v * SCALE[id]), A.ctx.currentTime, 0.15);
    },
    stop: function (id) {
      var h = S.active[id];
      if (!h) return;
      delete S.active[id];
      h.alive = false;
      h.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
      var c = A.ctx, t = c.currentTime;
      h.gain.gain.cancelScheduledValues(t);
      h.gain.gain.setValueAtTime(Math.max(0.0001, h.gain.gain.value), t);
      h.gain.gain.setTargetAtTime(0.0001, t, 0.4);
      setTimeout(function () {
        h.src.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} });
        try { h.gain.disconnect(); } catch (e) {}
      }, 2600);
      Aura.emit('mix', id);
    },
    stopAll: function (keepBinaural) {
      Object.keys(S.active).forEach(function (id) { if (!(keepBinaural && id === 'binaural')) S.stop(id); });
    },
    setBeat: function (b) { var h = S.active.binaural; if (h && h.setBeat) h.setBeat(b); }
  };
})();
