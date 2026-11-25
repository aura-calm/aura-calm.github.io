/* Aura — audio.js : Web Audio engine (unlock, buses, reverb, noise, tones, singing bowls) */
(function () {
  'use strict';
  var Aura = window.Aura;
  var A = Aura.audio = { ctx: null, enabled: !!Aura.store.get('sound', false), buses: {}, supported: !!(window.AudioContext || window.webkitAudioContext) };

  function impulse(c, dur, decay) {
    var rate = c.sampleRate, len = Math.floor(rate * dur), b = c.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function create() {
    if (A.ctx) return A.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { A.ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { A.ctx = new AC(); } catch (e2) { return null; } }
    var c = A.ctx;
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.35;
    comp.connect(c.destination);
    A.master = c.createGain();
    A.master.gain.value = A.enabled ? 1 : 0;
    A.master.connect(comp);
    ['sfx', 'ambient', 'music', 'voice'].forEach(function (n) {
      var g = c.createGain(); g.gain.value = 1; g.connect(A.master); A.buses[n] = g;
    });
    A.buses.ambient.gain.value = Aura.store.get('masterVol', 0.8);
    A.buses.music.gain.value = 0.9;
    try {
      A.reverb = c.createConvolver();
      A.reverb.buffer = impulse(c, Aura.lowPower ? 2.2 : 3.4, 2.4);
      var rg = c.createGain(); rg.gain.value = 0.55;
      A.reverb.connect(rg); rg.connect(A.master);
    } catch (e) { A.reverb = A.master; }
    if (c.addEventListener) c.addEventListener('statechange', function () { Aura.emit('audiostate', c.state); });
    return c;
  }
  A.create = create;

  /* iOS / Chrome autoplay unlock: resume + play one silent sample on a gesture */
  A.unlock = function () {
    var c = create();
    if (!c) return;
    if (c.state === 'suspended' || c.state === 'interrupted') { try { c.resume(); } catch (e) {} }
    if (!A._unlocked) {
      try {
        var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) {}
      A._unlocked = true;
    }
  };
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) {
    window.addEventListener(ev, A.unlock, { passive: true, capture: true });
  });

  A.setEnabled = function (on, quiet) {
    A.enabled = !!on;
    Aura.store.set('sound', A.enabled);
    var c = create();
    if (c) {
      A.unlock();
      var t = c.currentTime;
      A.master.gain.cancelScheduledValues(t);
      A.master.gain.setValueAtTime(A.master.gain.value, t);
      A.master.gain.linearRampToValueAtTime(A.enabled ? 1 : 0, t + 0.35);
    }
    Aura.emit('sound', A.enabled);
    if (A.enabled && !quiet) A.chime();
  };
  /* used by features that are explicitly audio (mixer, lo-fi …): turn sound on if needed */
  A.ensureOn = function () {
    if (!A.supported) { Aura.toast('Your browser does not support Web Audio — the silence is very authentic though.'); return false; }
    if (!A.enabled) { A.setEnabled(true, true); Aura.toast('Sound on 🔊 — tap the speaker icon any time to mute.'); }
    A.unlock();
    return !!A.ctx;
  };
  A.on = function () { if (!A.enabled) return false; return !!create(); };
  A.now = function () { return A.ctx ? A.ctx.currentTime : 0; };

  /* ---- noise buffers (cached, loop-safe) ---- */
  A._nb = {};
  A.noise = function (type) {
    var c = A.ctx;
    if (A._nb[type]) return A._nb[type];
    var len = Math.floor(c.sampleRate * (Aura.lowPower ? 3 : 4)), b = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, i, w;
      for (i = 0; i < len; i++) {
        w = Math.random() * 2 - 1;
        if (type === 'white') d[i] = w * 0.5;
        else if (type === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      if (type === 'brown') { /* remove drift so the loop seam doesn't click */
        var drift = d[len - 1] - d[0];
        for (i = 0; i < len; i++) d[i] -= drift * (i / len);
      }
      /* short crossfade at seam */
      var xf = 512;
      for (i = 0; i < xf; i++) { var k = i / xf; d[len - xf + i] = d[len - xf + i] * (1 - k) + d[i] * k; }
    }
    A._nb[type] = b;
    return b;
  };

  /* ---- simple enveloped tone ---- */
  A.tone = function (freq, dur, o) {
    o = o || {};
    if (!A.on()) return;
    var c = A.ctx, t = c.currentTime + (o.when || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    var a = Math.min(o.attack || 0.01, dur * 0.8), peak = o.gain || 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.bus || A.buses.sfx);
    if (o.rev && A.reverb) { var r = c.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(A.reverb); }
    osc.start(t); osc.stop(t + dur + 0.05);
  };

  /* micro UI tick */
  A.click = function () { A.tone(1650, 0.06, { to: 1150, gain: 0.025 }); };
  /* gentle two-note chime */
  A.chime = function (up) {
    var n = up === false ? [784, 523.25] : [523.25, 784];
    A.tone(n[0], 1.4, { gain: 0.07, rev: 0.6, attack: 0.01 });
    A.tone(n[1], 1.8, { gain: 0.06, rev: 0.6, when: 0.12, attack: 0.01 });
  };
  A.sparkle = function () {
    [1318.5, 1568, 1975.5, 2637].forEach(function (f, i) { A.tone(f, 0.9, { gain: 0.035, rev: 0.8, when: i * 0.07 }); });
  };

  /* ---- singing bowl: inharmonic partials with beating pairs + strike ---- */
  A.bowl = function (f, dur, gain) {
    if (!A.on()) return;
    var c = A.ctx, t = c.currentTime + 0.02;
    f = f || 196; dur = dur || 10; gain = gain || 0.22;
    var out = c.createGain(); out.gain.value = gain; out.connect(A.buses.sfx);
    if (A.reverb) { var rv = c.createGain(); rv.gain.value = 0.7; out.connect(rv); rv.connect(A.reverb); }
    var parts = [[1, 1], [2.71, 0.5], [5.15, 0.24], [8.43, 0.11], [12.1, 0.05]];
    parts.forEach(function (p, i) {
      [-1, 1].forEach(function (s) {
        var o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f * p[0] + s * (0.35 + i * 0.3);
        var d = dur / (1 + i * 0.55);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p[1] * 0.5, t + 0.012 + i * 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.1);
      });
    });
    try {
      var n = c.createBufferSource(); n.buffer = A.noise('white');
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 4; bp.Q.value = 2;
      var ng = c.createGain(); ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(t + 0.12);
    } catch (e) {}
    setTimeout(function () { try { out.disconnect(); } catch (e) {} }, (dur + 1) * 1000);
  };

  /* Om-like hum for the easter egg (136.1 Hz, "Om" frequency) */
  A.om = function () {
    if (!A.on()) return;
    var c = A.ctx, t = c.currentTime;
    var out = c.createGain(); out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.18, t + 1.5); out.gain.setValueAtTime(0.18, t + 4.5);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 8);
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1400, t + 3); lp.frequency.linearRampToValueAtTime(300, t + 7.5);
    lp.connect(out); out.connect(A.buses.sfx);
    if (A.reverb) { var r = c.createGain(); r.gain.value = 0.6; out.connect(r); r.connect(A.reverb); }
    [1, 2, 3, 4, 6].forEach(function (h, i) {
      var o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = 136.1 * h + (i % 2 ? 0.4 : -0.3);
      var g = c.createGain(); g.gain.value = 0.5 / (i + 1);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + 8.2);
    });
  };

  A.mtof = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  A.panner = function (v) {
    var c = A.ctx;
    if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = v; return p; }
    return c.createGain();
  };
})();
