/* Aura — breath.js : guided breathing with a living orb + particle field, haptics and tones */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio;
  var cv = Aura.byId('breathCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var stage = Aura.byId('orbStage'), elPhase = Aura.byId('breathPhase'), elCount = Aura.byId('breathCount');
  var elDesc = Aura.byId('breathDesc'), elDur = Aura.byId('breathDuration'), elTones = Aura.byId('breathTones');
  var elHap = Aura.byId('breathHaptics'), elStart = Aura.byId('breathStart'), elStats = Aura.byId('breathStats'), hapNote = Aura.byId('hapticsNote');

  var P = {
    box: { desc: 'Four counts in, hold, out, hold. Square breaths for round feelings — a steady favourite of calm people everywhere.',
      steps: [['in', 4, 'Breathe in'], ['hold', 4, 'Hold gently'], ['out', 4, 'Breathe out'], ['hold2', 4, 'Rest, empty']] },
    '478': { desc: 'In for 4, hold for 7, out slowly for 8. A classic wind-down rhythm. If 7 feels long, go a little shorter — no one is grading you.',
      steps: [['in', 4, 'Breathe in through the nose'], ['hold', 7, 'Hold softly'], ['out', 8, 'Whoosh out slowly']] },
    coherent: { desc: 'About 5.5 breaths a minute — roughly 5.5 seconds in, 5.5 out. Smooth as a slow tide. No holding, no drama.',
      steps: [['in', 5.45, 'Breathe in'], ['out', 5.45, 'Breathe out']] },
    sigh: { desc: 'A double inhale through the nose, then a long, slow exhale through the mouth. Basically your body’s built-in “phew”.',
      steps: [['in', 2.2, 'Inhale through the nose'], ['in2', 1.1, 'Sip in a little more'], ['out', 6, 'Long, slow exhale']] }
  };
  var DONE = [
    'Session complete. Your nervous system sends its regards. 💌',
    'Done! That was some world-class breathing. The judges are weeping.',
    'Lovely. You just gave your brain a tiny spa day.',
    'Complete. Somewhere, a stressed-out cell just relaxed its shoulders.'
  ];

  var pat = Aura.store.get('breathPattern', 'box');
  if (!P[pat]) pat = 'box';
  var running = false, idx = 0, pT = 0, level = 0.2, from = 0.2, to = 0.2, sessionT = 0, sessionLen = 180, lastCount = -1;
  var rings = [], parts = [], W = 0, H = 0, D = 1, cols = Aura.themeColors(), t = 0, flow = 0, flowT = 0;

  function newPart(d) {
    return { a: Math.random() * Math.PI * 2, d: d, sp: Aura.rand(0.03, 0.16) * (Math.random() < 0.5 ? -1 : 1), v: Aura.rand(0.12, 0.34),
      s: Aura.rand(0.6, 2.1), c: Math.floor(Math.random() * 3), tw: Math.random() * 6.28 };
  }
  function initParts() {
    var n = Math.round(230 * Aura.quality());
    parts = [];
    for (var i = 0; i < n; i++) parts.push(newPart(Math.random()));
  }
  function resize() { var f = Aura.fitCanvas(cv); W = f.w; H = f.h; D = f.d; }

  function step() { var s = P[pat].steps[idx]; return { type: s[0], dur: s[1], label: s[2] }; }
  function targetFor(type) {
    if (type === 'in') return pat === 'sigh' ? 0.78 : 1;
    if (type === 'in2') return 1;
    if (type === 'out') return 0;
    return level;
  }
  function setText(label, type) {
    elPhase.classList.add('swap');
    setTimeout(function () {
      elPhase.textContent = label;
      elPhase.classList.toggle('in', type === 'in' || type === 'in2');
      elPhase.classList.remove('swap');
    }, 180);
  }
  function cue(type, dur) {
    if (elHap.checked) {
      if (type === 'in') Aura.vibrate(45);
      else if (type === 'in2') Aura.vibrate(20);
      else if (type === 'out') Aura.vibrate([20, 40, 20]);
      else Aura.vibrate(12);
    }
    if (elTones.checked && A.on()) {
      if (type === 'in') { A.tone(220, dur, { to: 330, attack: dur * 0.45, gain: 0.07, rev: 0.5 }); A.tone(330, dur, { to: 495, attack: dur * 0.5, gain: 0.022, rev: 0.5 }); }
      else if (type === 'in2') A.tone(330, dur, { to: 392, attack: dur * 0.4, gain: 0.05, rev: 0.5 });
      else if (type === 'out') { A.tone(330, dur, { to: 196, attack: dur * 0.22, gain: 0.065, rev: 0.5 }); A.tone(495, dur * 0.8, { to: 294, attack: dur * 0.2, gain: 0.018, rev: 0.5 }); }
      else A.tone(659.25, 1.8, { gain: 0.028, rev: 0.7 });
    }
  }
  function enter() {
    var s = step();
    from = level; to = targetFor(s.type); pT = 0; lastCount = -1;
    flowT = (s.type === 'in' || s.type === 'in2') ? -1 : (s.type === 'out' ? 1 : 0);
    setText(s.label, s.type);
    cue(s.type, s.dur);
    rings.push({ r: 0, a: 0.55 });
    if (Aura.bg) Aura.bg.pulse(0.3);
  }
  function updStats() {
    var s = Aura.stats;
    elStats.textContent = s.breaths ? (s.breaths + ' breath cycles · ' + (s.breathMin || 0) + ' mindful minutes so far. Look at you.') :
      'No breaths logged yet. (You’ve been breathing anyway. Overachiever.)';
  }
  function start() {
    if (elTones.checked) A.ensureOn();
    running = true; idx = 0; sessionT = 0;
    sessionLen = parseFloat(elDur.value) * 60;
    elStart.textContent = 'Stop';
    elStart.setAttribute('aria-pressed', 'true');
    stage.classList.add('running');
    Aura.wake.on();
    enter();
  }
  function stop(msg) {
    if (!running) return;
    running = false; flowT = 0; from = level;
    if (sessionT > 20) Aura.addStat('breathMin', Math.round(sessionT / 6) / 10);
    elStart.textContent = 'Begin';
    elStart.setAttribute('aria-pressed', 'false');
    stage.classList.remove('running');
    Aura.wake.off();
    setText(msg || 'Ready when you are', 'idle');
    elCount.textContent = '·';
    updStats();
  }
  function finish() {
    stop('Beautifully done ✨');
    if (A.on()) A.bowl(262, 7, 0.14);
    Aura.vibrate([30, 60, 30, 60, 60]);
    Aura.toast(Aura.pick(DONE), 4200);
  }

  function update(dt) {
    t += dt;
    if (running) {
      sessionT += dt; pT += dt;
      var s = step();
      level = from + (to - from) * Aura.easeIO(pT / s.dur);
      var cnt = Math.max(1, Math.ceil(s.dur - pT));
      if (cnt !== lastCount) { lastCount = cnt; elCount.textContent = cnt; }
      if (pT >= s.dur) {
        idx++;
        if (idx >= P[pat].steps.length) {
          idx = 0; Aura.addStat('breaths', 1);
          if (sessionT >= sessionLen) { finish(); return; }
        }
        enter();
      }
    } else {
      var idle = 0.22 + 0.07 * Math.sin(t * 0.75);
      level += (idle - level) * Math.min(1, dt * 1.5);
      flowT = 0.15 * Math.sin(t * 0.75 + 1.57) * -1;
    }
    flow += (flowT - flow) * Math.min(1, dt * 3);
  }

  function blob(c, cx, cy, r, amp) {
    var n = 72;
    c.beginPath();
    for (var i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2;
      var k = 1 + amp * (0.03 * Math.sin(3 * a + t * 0.9) + 0.022 * Math.sin(5 * a - t * 1.3) + 0.014 * Math.sin(7 * a + t * 0.7 + level * 3));
      var x = cx + Math.cos(a) * r * k, y = cy + Math.sin(a) * r * k;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }

  function draw() {
    var c = ctx, rg = Aura.rgba, C = cols, lightT = C.light;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2, base = Math.min(W, H) / 2;
    var orbR = base * (0.29 + 0.25 * level);
    var add = lightT ? 'source-over' : 'lighter';
    var pal = [C.c2, C.c3, C.c4];

    /* ambient halo */
    var g = c.createRadialGradient(cx, cy, orbR * 0.6, cx, cy, base);
    g.addColorStop(0, rg(C.c3, lightT ? 0.22 : 0.32));
    g.addColorStop(0.55, rg(C.c2, 0.08 + level * 0.06));
    g.addColorStop(1, rg(C.c2, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    /* particle field */
    c.globalCompositeOperation = add;
    var outer = base * 0.97, span = outer - orbR * 1.04;
    var spd = running ? 1 : 0.6;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.d += flow * p.v * 0.016 * 60 * 0.012 * spd * (running ? 1.6 : 1);
      if (p.d < 0) { parts[i] = p = newPart(1); }
      else if (p.d > 1) { parts[i] = p = newPart(0); }
      p.a += p.sp * 0.016 * (1 + Math.abs(flow) * 0.8);
      var dist = orbR * 1.04 + p.d * span;
      var x = cx + Math.cos(p.a) * dist, y = cy + Math.sin(p.a) * dist;
      var al = Math.sin(Math.PI * p.d) * (0.45 + 0.55 * Math.sin(t * 2 + p.tw));
      if (al <= 0.02) continue;
      var col = pal[p.c];
      if (Math.abs(flow) > 0.3 && !Aura.reduced) {
        var len = (6 + p.v * 26) * D * Math.abs(flow);
        c.strokeStyle = rg(col, al * 0.6); c.lineWidth = p.s * D * 0.8;
        c.beginPath(); c.moveTo(x, y);
        c.lineTo(x + Math.cos(p.a) * len * (flow > 0 ? -1 : 1), y + Math.sin(p.a) * len * (flow > 0 ? -1 : 1));
        c.stroke();
      }
      c.fillStyle = rg(col, al);
      c.beginPath(); c.arc(x, y, p.s * D, 0, 6.2832); c.fill();
    }

    /* ripple rings on phase changes */
    for (var j = rings.length - 1; j >= 0; j--) {
      var rr = rings[j];
      rr.r += 0.016 * base * 0.45; rr.a *= 0.975;
      if (rr.a < 0.02) { rings.splice(j, 1); continue; }
      c.strokeStyle = rg(C.c2, rr.a); c.lineWidth = 1.5 * D;
      c.beginPath(); c.arc(cx, cy, orbR + rr.r, 0, 6.2832); c.stroke();
    }

    /* outer glow */
    g = c.createRadialGradient(cx, cy, orbR * 0.85, cx, cy, orbR * 1.7);
    g.addColorStop(0, rg(C.c2, 0.38 + level * 0.15)); g.addColorStop(1, rg(C.c3, 0));
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, orbR * 1.7, 0, 6.2832); c.fill();

    /* orb body */
    c.globalCompositeOperation = 'source-over';
    var amp = Aura.reduced ? 0.3 : 1;
    blob(c, cx, cy, orbR, amp);
    g = c.createRadialGradient(cx - orbR * 0.35, cy - orbR * 0.4, orbR * 0.05, cx, cy, orbR * 1.05);
    g.addColorStop(0, rg(Aura.mix(C.c4, [255, 255, 255], 0.55), 0.96));
    g.addColorStop(0.35, rg(C.c3, 0.92));
    g.addColorStop(0.78, rg(Aura.mix(C.c3, C.bg, 0.45), 0.94));
    g.addColorStop(1, rg(C.c2, 0.9));
    c.fillStyle = g; c.fill();

    /* inner liquid swirl */
    c.save();
    blob(c, cx, cy, orbR * 0.985, amp); c.clip();
    c.globalCompositeOperation = add;
    for (var k = 0; k < 3; k++) {
      var ang = t * 0.28 * (k + 1) * (k % 2 ? -1 : 1) + k * 2.1;
      var sx = cx + Math.cos(ang) * orbR * 0.48, sy = cy + Math.sin(ang * 1.3) * orbR * 0.42;
      var sg = c.createRadialGradient(sx, sy, 0, sx, sy, orbR * 0.85);
      sg.addColorStop(0, rg(pal[k], lightT ? 0.28 : 0.42)); sg.addColorStop(1, rg(pal[k], 0));
      c.fillStyle = sg; c.fillRect(cx - orbR, cy - orbR, orbR * 2, orbR * 2);
    }
    c.restore();

    /* specular highlight */
    c.save();
    c.translate(cx - orbR * 0.33, cy - orbR * 0.42); c.rotate(-0.6); c.scale(1, 0.58);
    g = c.createRadialGradient(0, 0, 0, 0, 0, orbR * 0.36);
    g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, orbR * 0.36, 0, 6.2832); c.fill();
    c.restore();

    /* rim light */
    blob(c, cx, cy, orbR, amp);
    c.strokeStyle = 'rgba(255,255,255,' + (0.18 + level * 0.15) + ')'; c.lineWidth = 1.4 * D; c.stroke();

    /* phase progress arc */
    var ar = base * 0.955;
    c.strokeStyle = rg(C.text, 0.08); c.lineWidth = 2 * D;
    c.beginPath(); c.arc(cx, cy, ar, 0, 6.2832); c.stroke();
    if (running) {
      var s = step(), pr = Aura.clamp(pT / s.dur, 0, 1), a0 = -Math.PI / 2, a1 = a0 + pr * Math.PI * 2;
      c.strokeStyle = rg(C.c2, 0.9); c.lineWidth = 3 * D; c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, ar, a0, a1); c.stroke();
      c.fillStyle = rg(C.c4, 1);
      c.beginPath(); c.arc(cx + Math.cos(a1) * ar, cy + Math.sin(a1) * ar, 4.5 * D, 0, 6.2832); c.fill();
    }
  }

  var loop = Aura.loop(function (dt) { update(dt); draw(); });

  /* ---- UI wiring ---- */
  function setPattern(p) {
    if (!P[p]) return;
    if (running) stop('Pattern changed — tap Begin');
    pat = p; Aura.store.set('breathPattern', p);
    Aura.$$('.pattern-btn').forEach(function (b) {
      var on = b.getAttribute('data-pattern') === p;
      b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    elDesc.textContent = P[p].desc;
  }
  Aura.$$('.pattern-btn').forEach(function (b) {
    b.addEventListener('click', function () { setPattern(b.getAttribute('data-pattern')); });
  });
  elStart.addEventListener('click', function () { if (running) stop('Paused. Breathe however you like.'); else start(); });
  stage.addEventListener('click', function () { if (running) stop('Paused. Breathe however you like.'); else start(); });
  elTones.checked = !!Aura.store.get('breathTones', false);
  elTones.addEventListener('change', function () {
    Aura.store.set('breathTones', elTones.checked);
    if (elTones.checked) A.ensureOn();
  });
  if (!Aura.canVibrate) {
    elHap.checked = false; elHap.disabled = true;
    hapNote.textContent = '(not supported on this device — iPhones keep their buzz to themselves)';
  } else {
    elHap.checked = Aura.store.get('breathHaptics', true) !== false;
    elHap.addEventListener('change', function () { Aura.store.set('breathHaptics', elHap.checked); if (elHap.checked) Aura.vibrate(30); });
  }
  var savedDur = Aura.store.get('breathDur', null);
  if (savedDur) elDur.value = savedDur;
  elDur.addEventListener('change', function () { Aura.store.set('breathDur', elDur.value); });

  setPattern(pat);
  initParts();
  updStats();

  Aura.on('view', function (v) {
    if (v === 'breathe') { resize(); loop.start(); }
    else { if (running) stop('Paused while you wandered off'); loop.stop(); }
  });
  Aura.on('theme', function () { cols = Aura.themeColors(); });
  Aura.on('lowpower', initParts);
  Aura.on('motion', initParts);
  Aura.on('stats', function () { if (!running) updStats(); });
  window.addEventListener('resize', function () { if (loop.isRunning()) resize(); });
  Aura.breath = { isRunning: function () { return running; } };
})();
