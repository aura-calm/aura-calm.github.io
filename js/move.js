/* Aura — move.js : affirmations + stretch routines with an SVG-animated figure */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var AFF = [
    'You are allowed to go slowly.', 'You are doing better than your inner critic thinks.', 'Rest is productive. Ask any cat.',
    'You don’t have to earn a break.', 'Small steps still move you forward.', 'Your worth is not measured in emails answered.',
    'It’s okay to be a work in progress. So is every masterpiece.', 'You have survived every hard day so far. That’s a perfect record.',
    'Breathe in courage. Breathe out “I’ll figure it out.”', 'You are a whole person, not a to-do list.', 'Today, gentle is enough.',
    'You can be soft and strong at the same time.', 'Not every thought deserves a reply.', 'You are allowed to take up space.',
    'Progress, not perfection. Also, snacks.', 'Your feelings are visitors. Let them come and go.', 'You are someone’s reason to smile.',
    'You can begin again, as many times as you need.', 'Kindness counts — especially towards yourself.', 'You bring something no one else can.',
    'It’s okay to say no. It’s a complete sentence.', 'You are learning, and that is beautiful.', 'The sky doesn’t rush the sunrise. Neither should you.',
    'You deserve the same patience you give others.', 'Your pace is the right pace.', 'You are enough, exactly as you are, right now.',
    'Even the moon has phases. Shine when you’re ready.', 'You’ve got this. And if you don’t, you’ve got help.', 'One breath at a time is a perfectly good plan.',
    'Be proud of the quiet victories.'
  ];
  Aura.affirmations = AFF;
  function dayIndex() { var d = new Date(), s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 864e5); }
  Aura.dailyAffirmation = function () { return AFF[dayIndex() % AFF.length]; };

  var elA = $('affirmText');
  if (elA) {
    var ai = dayIndex() % AFF.length;
    elA.textContent = AFF[ai];
    $('affirmNext').addEventListener('click', function () {
      var n = ai; while (n === ai) n = Math.floor(Math.random() * AFF.length);
      ai = n;
      elA.classList.add('swap');
      setTimeout(function () { elA.textContent = AFF[ai]; elA.classList.remove('swap'); }, 320);
      if (A.on()) A.tone(Aura.pick([523.25, 587.33, 659.25, 783.99]), 1.1, { gain: 0.04, rev: 0.6 });
    });
    $('affirmSpeak').addEventListener('click', function () {
      if (!Aura.canSpeak) { Aura.toast('Your browser can’t speak — so read it to yourself, warmly. It works even better.'); return; }
      Aura.stopSpeak();
      Aura.speak(elA.textContent, { rate: 0.9, pitch: 1.05 });
    });
  }

  /* ---------- stick figure rig ---------- */
  var svg = $('figure');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
  var shadow = mk('ellipse', { 'class': 'shadow', cx: 100, cy: 246, rx: 46, ry: 7 });
  var limbs = {};
  ['legL1', 'legL2', 'legR1', 'legR2', 'torso', 'hips', 'shoulders', 'armL1', 'armL2', 'armR1', 'armR2', 'neck'].forEach(function (n) {
    limbs[n] = mk('line', { 'class': 'limb' });
  });
  var head = mk('circle', { 'class': 'head', r: 15 });
  var sparks = [];
  for (var s = 0; s < 6; s++) sparks.push(mk('circle', { 'class': 'spark', r: 1.6, cx: 100, cy: 100, opacity: 0 }));

  var BASE = { t: 0, hd: 0, aL1: -12, aL2: -6, aR1: 12, aR2: 6, lL1: -5, lL2: -3, lR1: 5, lR2: 3, sh: 0, dy: 0 };
  function pose(o) { var p = {}; for (var k in BASE) p[k] = (o && o[k] != null) ? o[k] : BASE[k]; return p; }
  var POSES = {
    stand: pose({}),
    reach: pose({ aL1: -172, aL2: -178, aR1: 172, aR2: 178 }),
    sideL: pose({ t: -16, hd: -6, aR1: 200, aR2: 212, aL1: -22, aL2: -14 }),
    sideR: pose({ t: 16, hd: 6, aL1: -200, aL2: -212, aR1: 22, aR2: 14 }),
    shrug: pose({ sh: -9, aL1: -16, aR1: 16 }),
    neckL: pose({ hd: -26 }),
    neckR: pose({ hd: 26 }),
    open: pose({ aL1: -100, aL2: -125, aR1: 100, aR2: 125, hd: 0 }),
    fold: pose({ t: 105, hd: 15, aL1: 8, aL2: 2, aR1: -2, aR2: -6, lL1: -3, lR1: 3 }),
    squat: pose({ dy: 22, lL1: -42, lL2: 8, lR1: 42, lR2: -8, aL1: -82, aL2: -86, aR1: 82, aR2: 86 }),
    twistL: pose({ aL1: -95, aL2: -100, aR1: -35, aR2: -70, hd: -10 }),
    twistR: pose({ aR1: 95, aR2: 100, aL1: 35, aL2: 70, hd: 10 }),
    warrior: pose({ dy: 10, lL1: -32, lL2: -20, lR1: 38, lR2: 24, aL1: -90, aL2: -90, aR1: 90, aR2: 90 }),
    tree: pose({ lR1: 62, lR2: -62, aL1: -186, aL2: -200, aR1: 186, aR2: 200 }),
    wide: pose({ lL1: -18, lL2: -16, lR1: 18, lR2: 16, aL1: -60, aL2: -50, aR1: 60, aR2: 50 })
  };
  var ROUTINES = {
    desk: { name: 'Desk reset', intro: 'Six gentle moves, about three minutes. Your chair will miss you.', steps: [
      { n: 'Neck tilts', tip: 'Ear towards shoulder, slowly side to side. No need to touch it — it’s not a race.', d: 30, p: ['neckL', 'neckR'], per: 4 },
      { n: 'Shoulder shrugs', tip: 'Lift shoulders to your ears on the inhale, drop them on the exhale. Ahh.', d: 25, p: ['stand', 'shrug'], per: 2.5 },
      { n: 'Side stretch', tip: 'Reach one arm over your head and lean gently. Switch sides with each breath.', d: 30, p: ['sideL', 'sideR'], per: 5 },
      { n: 'Chest opener', tip: 'Open your arms wide like you’re greeting an old friend.', d: 25, p: ['stand', 'open'], per: 4 },
      { n: 'Gentle twist', tip: 'Rotate softly from the waist, arms swinging loose.', d: 30, p: ['twistL', 'twistR'], per: 3.5 },
      { n: 'Big reach', tip: 'Arms all the way up — tall as a sunflower — then float them down.', d: 25, p: ['stand', 'reach'], per: 4.5 }] },
    morning: { name: 'Morning wake', intro: 'Wake the body kindly. About three and a half minutes.', steps: [
      { n: 'Sunrise reach', tip: 'Inhale arms up, exhale arms down. Good morning, ceiling.', d: 30, p: ['stand', 'reach'], per: 4 },
      { n: 'Side bends', tip: 'Lean like a willow in a soft breeze.', d: 30, p: ['sideL', 'sideR'], per: 4.5 },
      { n: 'Easy squats', tip: 'Sit back into an invisible chair, only as low as feels good.', d: 30, p: ['stand', 'squat'], per: 3.5 },
      { n: 'Warrior pose', tip: 'Strong legs, long arms. You are the hero of this morning.', d: 30, p: ['wide', 'warrior'], per: 5 },
      { n: 'Tree balance', tip: 'Foot to calf or ankle — never the knee. Wobbling is part of it.', d: 30, p: ['stand', 'tree'], per: 6 },
      { n: 'Forward fold', tip: 'Soft knees, hang heavy, let the head be loose.', d: 30, p: ['stand', 'fold'], per: 6 }] },
    bedtime: { name: 'Bedtime unwind', intro: 'Slow, soft moves to tell your body the day is done.', steps: [
      { n: 'Slow neck release', tip: 'Let the head drift side to side, heavy and slow.', d: 30, p: ['neckL', 'neckR'], per: 6 },
      { n: 'Heart opener', tip: 'Open the chest with a long exhale. Let the day slide off your shoulders.', d: 30, p: ['stand', 'open'], per: 6 },
      { n: 'Ragdoll fold', tip: 'Fold forward, knees soft, sway a little like seaweed.', d: 35, p: ['stand', 'fold'], per: 7 },
      { n: 'Lazy twist', tip: 'Gentle rotation, arms floppy. Maximum noodle.', d: 30, p: ['twistL', 'twistR'], per: 5 },
      { n: 'Moon reach', tip: 'One last slow reach for the moon, then let your arms float down.', d: 30, p: ['stand', 'reach'], per: 7 }] }
  };

  var cur = 'desk', running = false, si = 0, stT = 0, total = 0, elapsed = 0, ph = 0, from = POSES.stand, toP = POSES.stand, idleT = 0;
  var elName = $('stretchName'), elTip = $('stretchTip'), elProg = $('stretchProg'), elTime = $('stretchTime'), elStart = $('stretchStart');

  var rad = Math.PI / 180;
  function dir(a, len) { return [Math.sin(a * rad) * len, Math.cos(a * rad) * len]; }
  function setL(l, a, b) { l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1)); l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1)); }
  function render(p, breath) {
    var hip = [100, 150 + p.dy];
    var tr = p.t * rad;
    var up = [Math.sin(tr), -Math.cos(tr)], perp = [Math.cos(tr), Math.sin(tr)];
    var neck = [hip[0] + up[0] * 58, hip[1] + up[1] * 58];
    var chest = 1 + breath * 0.04;
    var sL = [neck[0] - perp[0] * 16 * chest + up[0] * -4, neck[1] - perp[1] * 16 * chest - up[1] * 4 + p.sh];
    var sR = [neck[0] + perp[0] * 16 * chest + up[0] * -4, neck[1] + perp[1] * 16 * chest - up[1] * 4 + p.sh];
    var ha = (p.t + p.hd) * rad;
    var hc = [neck[0] + Math.sin(ha) * 21, neck[1] - Math.cos(ha) * 21 + p.sh * 0.3];
    var hL = [hip[0] - 9, hip[1]], hR = [hip[0] + 9, hip[1]];
    var eL = dir(p.aL1, 30), eR = dir(p.aR1, 30);
    var elL = [sL[0] + eL[0], sL[1] + eL[1]], elR = [sR[0] + eR[0], sR[1] + eR[1]];
    var wL = dir(p.aL2, 28), wR = dir(p.aR2, 28);
    var kL = dir(p.lL1, 46), kR = dir(p.lR1, 46);
    var knL = [hL[0] + kL[0], hL[1] + kL[1]], knR = [hR[0] + kR[0], hR[1] + kR[1]];
    var fL = dir(p.lL2, 46), fR = dir(p.lR2, 46);
    setL(limbs.torso, hip, neck); setL(limbs.hips, hL, hR); setL(limbs.shoulders, sL, sR);
    setL(limbs.neck, neck, [neck[0] + (hc[0] - neck[0]) * 0.4, neck[1] + (hc[1] - neck[1]) * 0.4]);
    setL(limbs.armL1, sL, elL); setL(limbs.armL2, elL, [elL[0] + wL[0], elL[1] + wL[1]]);
    setL(limbs.armR1, sR, elR); setL(limbs.armR2, elR, [elR[0] + wR[0], elR[1] + wR[1]]);
    setL(limbs.legL1, hL, knL); setL(limbs.legL2, knL, [knL[0] + fL[0], knL[1] + fL[1]]);
    setL(limbs.legR1, hR, knR); setL(limbs.legR2, knR, [knR[0] + fR[0], knR[1] + fR[1]]);
    head.setAttribute('cx', hc[0].toFixed(1)); head.setAttribute('cy', hc[1].toFixed(1));
    shadow.setAttribute('rx', (40 + breath * 4 + Math.abs(p.lR1 - p.lL1) * 0.3).toFixed(1));
  }
  function blend(a, b, k) { var o = {}; for (var key in a) o[key] = a[key] + (b[key] - a[key]) * k; return o; }

  function show() {
    var r = ROUTINES[cur];
    if (!running) { elName.textContent = r.name; elTip.textContent = r.intro; elTime.textContent = 'Ready · about ' + Math.round(r.steps.reduce(function (a, s) { return a + s.d; }, 0) / 60 * 10) / 10 + ' min'; elProg.style.width = '0%'; }
  }
  function enterStep() {
    var s = ROUTINES[cur].steps[si];
    elName.textContent = (si + 1) + '. ' + s.n; elTip.textContent = s.tip;
    stT = 0; ph = 0;
    if (A.on()) A.tone(659.25, 1.2, { gain: 0.04, rev: 0.6 });
    Aura.vibrate(25);
  }
  function startR() {
    running = true; si = 0; elapsed = 0;
    total = ROUTINES[cur].steps.reduce(function (a, s) { return a + s.d; }, 0);
    elStart.textContent = 'Restart';
    Aura.wake.on();
    enterStep();
  }
  function stopR(msg) {
    if (!running) return;
    running = false; Aura.wake.off();
    elStart.textContent = 'Start routine';
    elTime.textContent = msg || 'Stopped. Any movement counts.';
  }
  function doneR() {
    stopR('Complete! Your body says thank you (in its own creaky language).');
    elName.textContent = ROUTINES[cur].name + ' ✓';
    elProg.style.width = '100%';
    if (A.on()) A.sparkle();
    Aura.addStat('breathMin', Math.round(total / 6) / 10);
    Aura.toast('Routine complete 🌸 You moved. That’s the whole victory.');
  }

  var tAll = 0;
  var loop = Aura.loop(function (dt) {
    tAll += dt;
    var breath = 0.5 + 0.5 * Math.sin(tAll * 1.1);
    if (running) {
      stT += dt; elapsed += dt;
      var s = ROUTINES[cur].steps[si];
      var per = s.per, k = (stT % (per * 2)) / per;
      var a = POSES[s.p[0]], b = POSES[s.p[1]];
      var e = k < 1 ? Aura.easeIO(k) : 1 - Aura.easeIO(k - 1);
      if (stT < 1) { render(blend(blend(from, a, Aura.easeIO(stT)), blend(a, b, e), Aura.easeIO(stT)), breath); }
      else render(blend(a, b, e), breath);
      elProg.style.width = (elapsed / total * 100).toFixed(1) + '%';
      elTime.textContent = Aura.fmt(s.d - stT) + ' left in this move · ' + Aura.fmt(total - elapsed) + ' total';
      if (stT >= s.d) {
        from = blend(a, b, e);
        si++;
        if (si >= ROUTINES[cur].steps.length) { toP = from; doneR(); idleT = 0; return; }
        enterStep();
      }
    } else {
      idleT += dt;
      var target = blend(toP, POSES.stand, Aura.easeIO(Math.min(1, idleT / 1.2)));
      target.aL1 += Math.sin(tAll * 0.9) * 3; target.aR1 -= Math.sin(tAll * 0.9) * 3;
      render(target, breath);
    }
    for (var i = 0; i < sparks.length; i++) {
      var sp = sparks[i], ang = tAll * 0.5 + i * 1.05, rr = 72 + Math.sin(tAll + i) * 8;
      sp.setAttribute('cx', (100 + Math.cos(ang) * rr).toFixed(1));
      sp.setAttribute('cy', (128 + Math.sin(ang) * rr * 0.9).toFixed(1));
      sp.setAttribute('opacity', (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(tAll * 2 + i))).toFixed(2));
    }
  });

  Aura.$$('.routine-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (running) { toP = POSES.stand; stopR('Switched routine.'); }
      cur = b.getAttribute('data-routine');
      Aura.$$('.routine-btn').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
      show();
    });
  });
  elStart.addEventListener('click', function () { from = POSES.stand; startR(); });
  $('stretchStop').addEventListener('click', function () { toP = POSES.stand; idleT = 0; stopR(); });

  render(POSES.stand, 0.5);
  show();
  Aura.on('view', function (v) {
    if (v === 'move') loop.start();
    else { if (running) stopR('Paused while you were away.'); loop.stop(); }
  });
})();
