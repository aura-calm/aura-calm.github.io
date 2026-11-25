/* Aura — night.js : procedural night sky — stars, milky way, aurora curtains, lake reflection, shooting stars */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var cv = $('nightCanvas'), stage = $('nightStage');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, D = 1, HZ = 0, cols = Aura.themeColors();
  var stars = [], milky = null, far = null, shore = null, aur = null, actx = null, aw = 0, ah = 0, stripG = null, stripP = null;
  var shooting = [], bursts = [], t = Math.random() * 100, nextShoot = 2.5, breathOn = false, breathT = 0, lastHalf = -1, acc = 0;
  var lineEl = $('nightLine');
  var LINES = ['Let the day put its shoes by the door.', 'Every star up there is ancient, and still shining. So are you.',
    'You don’t have to finish everything tonight.', 'Unclench your jaw. Yes, you. Lovely.', 'The night is a soft blanket for busy minds.',
    'Somewhere, an owl is very proud of you.', 'Thoughts can wait until morning. They’ll keep.', 'Breathe like the tide: in… and out…',
    'The sky has been doing this for billions of years. You can rest for eight hours.'];
  var WISHES = ['Wish granted ✨ (terms and conditions apply)', 'Wish received. Processing time: mysterious.', 'The universe has added this to its to-do list.',
    'Lovely wish. Keep it secret, keep it safe.', 'Caught one! That’s rarer than you think.'];
  var li = 0;

  function off(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function mixc(a, b, k) { return Aura.mix(a, b, k); }

  function buildStrips() {
    stripG = off(1, 128); stripP = off(1, 128);
    var g = stripG.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, Aura.rgba(cols.c2, 0)); gr.addColorStop(0.55, Aura.rgba(cols.c2, 0.35));
    gr.addColorStop(0.88, Aura.rgba(mixc(cols.c2, [255, 255, 255], 0.35), 1)); gr.addColorStop(1, Aura.rgba(cols.c2, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 1, 128);
    var p = stripP.getContext('2d'), pr = p.createLinearGradient(0, 0, 0, 128);
    pr.addColorStop(0, Aura.rgba(cols.c4, 0)); pr.addColorStop(0.45, Aura.rgba(cols.c3, 0.55)); pr.addColorStop(1, Aura.rgba(cols.c3, 0));
    p.fillStyle = pr; p.fillRect(0, 0, 1, 128);
  }
  function ridge(c, baseY, amp, seed, color, step) {
    c.beginPath(); c.moveTo(0, H);
    for (var x = 0; x <= W + step; x += step) {
      var u = x / W;
      var y = baseY - amp * (0.55 * Math.abs(Math.sin(u * 3.1 + seed)) + 0.3 * Math.abs(Math.sin(u * 7.7 + seed * 2.3)) + 0.15 * Math.sin(u * 19 + seed * 5));
      c.lineTo(x, y);
    }
    c.lineTo(W, H); c.closePath(); c.fillStyle = color; c.fill();
  }
  function pine(c, x, base, h) {
    c.beginPath(); c.moveTo(x, base - h);
    for (var i = 0; i < 4; i++) {
      var yy = base - h + (i + 1) * h / 4.3, w = h * (0.12 + i * 0.07);
      c.lineTo(x + w, yy); c.lineTo(x + w * 0.35, yy);
    }
    c.lineTo(x + h * 0.05, base); c.lineTo(x - h * 0.05, base);
    for (var j = 3; j >= 0; j--) {
      var y2 = base - h + (j + 1) * h / 4.3, w2 = h * (0.12 + j * 0.07);
      c.lineTo(x - w2 * 0.35, y2); c.lineTo(x - w2, y2);
    }
    c.closePath(); c.fill();
  }
  function build() {
    var f = Aura.fitCanvas(cv); W = f.w; H = f.h; D = f.d;
    HZ = H * 0.74;
    cols = Aura.themeColors();
    buildStrips();
    /* stars */
    var area = (W / D) * (H / D), dens = Aura.lowPower ? 2600 : 1300;
    var n = Math.min(Aura.lowPower ? 450 : 1100, Math.round(area / dens));
    stars = [];
    for (var i = 0; i < n; i++) {
      var big = Math.random() < 0.06;
      stars.push({ x: Math.random() * W, y: Math.pow(Math.random(), 1.25) * HZ * 0.98, r: (big ? Aura.rand(1.2, 2) : Aura.rand(0.4, 1.1)) * D,
        tw: Aura.rand(0.6, 2.6), ph: Math.random() * 6.28, b: Aura.rand(0.4, 1), c: Math.random() < 0.2 ? mixc([255, 255, 255], cols.c4, 0.35) : (Math.random() < 0.3 ? [200, 220, 255] : [255, 255, 255]), big: big });
    }
    /* milky way (pre-rendered) */
    milky = off(W / 2, H / 2);
    var m = milky.getContext('2d'), mw = milky.width, mh = milky.height;
    m.globalCompositeOperation = 'lighter';
    for (var k = 0; k < (Aura.lowPower ? 140 : 300); k++) {
      var u = Math.random(), bx = u * mw, by = mh * (0.15 + u * 0.55) + Aura.rand(-1, 1) * mh * 0.12 * (0.5 + Math.random());
      var rr = Aura.rand(10, 46) * (mw / 800 + 0.5), g = m.createRadialGradient(bx, by, 0, bx, by, rr);
      var cc = Math.random() < 0.5 ? cols.c3 : [150, 170, 255];
      g.addColorStop(0, Aura.rgba(cc, 0.05)); g.addColorStop(1, Aura.rgba(cc, 0));
      m.fillStyle = g; m.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
    }
    m.fillStyle = 'rgba(255,255,255,0.5)';
    for (var q = 0; q < (Aura.lowPower ? 600 : 1600); q++) {
      var u2 = Math.random(), x2 = u2 * mw, y2 = mh * (0.15 + u2 * 0.55) + (Math.random() + Math.random() - 1) * mh * 0.1;
      m.globalAlpha = Math.random() * 0.6; m.fillRect(x2, y2, 0.7, 0.7);
    }
    m.globalAlpha = 1;
    /* far mountains + lake */
    far = off(W, H);
    var fc = far.getContext('2d'), st = Math.max(2, Math.round(W / 220));
    var hg = fc.createLinearGradient(0, HZ - H * 0.2, 0, HZ);
    hg.addColorStop(0, Aura.rgba(cols.c3, 0)); hg.addColorStop(1, Aura.rgba(cols.c3, 0.18));
    fc.fillStyle = hg; fc.fillRect(0, HZ - H * 0.2, W, H * 0.2);
    ridge(fc, HZ, H * 0.13, 1.3, Aura.rgba(mixc([14, 18, 40], cols.c1, 0.4), 1), st);
    ridge(fc, HZ + 2, H * 0.08, 4.1, Aura.rgba(mixc([8, 10, 26], cols.c1, 0.25), 1), st);
    var lg = fc.createLinearGradient(0, HZ, 0, H);
    lg.addColorStop(0, Aura.rgba(mixc([10, 14, 34], cols.c1, 0.3), 1)); lg.addColorStop(1, 'rgb(2,3,10)');
    fc.fillStyle = lg; fc.fillRect(0, HZ, W, H - HZ);
    /* near shore with pines */
    shore = off(W, H);
    var sc = shore.getContext('2d');
    sc.fillStyle = 'rgb(2,3,8)';
    ridge(sc, H * 0.93, H * 0.05, 7.7, 'rgb(2,3,8)', st);
    var count = Math.round(W / (D * 26));
    for (var p = 0; p < count; p++) {
      var px = Math.random() * W, edgeBias = Math.min(px, W - px) / W;
      if (Math.random() < edgeBias * 1.6) continue;
      pine(sc, px, H * 0.94 + Math.random() * H * 0.03, H * Aura.rand(0.06, 0.16) * (1.2 - edgeBias));
    }
    /* aurora buffer */
    var as = Aura.lowPower ? 6 : 4;
    aw = Math.max(80, Math.round(W / as)); ah = Math.max(60, Math.round(H / as));
    aur = off(aw, ah); actx = aur.getContext('2d');
    drawFrame(0);
  }

  function drawAurora(time, inten) {
    var a = actx;
    a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1;
    a.clearRect(0, 0, aw, ah);
    a.globalCompositeOperation = 'lighter';
    var step = Math.max(1, Math.round(aw / (Aura.lowPower ? 110 : 190)));
    var bands = [{ y: 0.44, a: 1, k: 1, s: 0 }, { y: 0.3, a: 0.55, k: 1.6, s: 2.7 }];
    for (var bi = 0; bi < bands.length; bi++) {
      var B = bands[bi];
      for (var x = 0; x < aw; x += step) {
        var u = x / aw;
        var base = ah * (B.y + 0.07 * Math.sin(u * 5.1 * B.k + time * 0.13 + B.s) + 0.045 * Math.sin(u * 11.3 - time * 0.21 + B.s) + 0.025 * Math.sin(u * 23 + time * 0.5));
        var len = ah * (0.15 + 0.13 * (0.5 + 0.5 * Math.sin(u * 7.3 + time * 0.17 + Math.sin(u * 3 - time * 0.1) * 2))) * (bi ? 0.7 : 1);
        var ray = 0.5 + 0.5 * Math.sin(u * 64 * B.k + time * 0.9 + Math.sin(u * 9 + time * 0.3) * 4);
        var e = Math.sin(Math.PI * Aura.clamp(u * 1.1 - 0.05, 0, 1));
        var al = Math.max(0, (0.35 + 0.65 * ray) * e * inten * B.a * (0.55 + 0.45 * Math.sin(u * 2.3 + time * 0.07 + B.s)));
        if (al < 0.01) continue;
        a.globalAlpha = Math.min(1, al * 0.6);
        a.drawImage(stripG, x, base - len, step + 0.6, len * 1.15);
        a.globalAlpha = Math.min(1, al * 0.4);
        a.drawImage(stripP, x, base - len * 2, step + 0.6, len * 1.1);
      }
    }
    a.globalAlpha = 1;
  }

  function spawnShoot(x, y) {
    var ang = Aura.rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1), sp = Aura.rand(700, 1100) * D;
    shooting.push({ x: x != null ? x : Aura.rand(0.1, 0.9) * W, y: y != null ? y : Aura.rand(0.03, 0.35) * HZ,
      vx: Math.cos(ang) * sp * (ang > 0 ? -1 : 1), vy: Math.abs(Math.sin(ang)) * sp, life: 0, max: Aura.rand(0.7, 1.2) });
  }
  function burst(x, y) {
    for (var i = 0; i < 28; i++) {
      var a = Math.random() * 6.28, s = Aura.rand(40, 220) * D;
      bursts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: Aura.rand(0.6, 1.4), c: Aura.pick([cols.c2, cols.c4, [255, 255, 255]]) });
    }
  }

  function drawFrame(dt) {
    var c = ctx;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    var sky = c.createLinearGradient(0, 0, 0, HZ);
    sky.addColorStop(0, 'rgb(2,3,10)'); sky.addColorStop(0.6, Aura.rgba(mixc([6, 9, 26], cols.c1, 0.35), 1)); sky.addColorStop(1, Aura.rgba(mixc([16, 18, 48], cols.c3, 0.18), 1));
    c.fillStyle = sky; c.fillRect(0, 0, W, HZ + 2);
    c.globalCompositeOperation = 'lighter';
    if (milky) c.drawImage(milky, 0, 0, W, H);
    /* stars */
    var still = Aura.reduced;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], tw = still ? 0.85 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      c.globalAlpha = s.b * tw;
      c.fillStyle = Aura.rgba(s.c, 1);
      if (s.big) {
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.2832); c.fill();
        c.globalAlpha = s.b * tw * 0.25;
        c.fillRect(s.x - s.r * 4, s.y - 0.4 * D, s.r * 8, 0.8 * D); c.fillRect(s.x - 0.4 * D, s.y - s.r * 4, 0.8 * D, s.r * 8);
      } else c.fillRect(s.x, s.y, s.r, s.r);
    }
    c.globalAlpha = 1;
    /* aurora */
    var inten = 0.85;
    if (breathOn) { var bph = (breathT % 10.9) / 10.9; inten = 0.45 + 0.65 * (bph < 0.5 ? Aura.easeIO(bph * 2) : 1 - Aura.easeIO((bph - 0.5) * 2)); }
    drawAurora(t, inten);
    c.drawImage(aur, 0, 0, W, H);
    /* shooting stars */
    for (var j = shooting.length - 1; j >= 0; j--) {
      var sh = shooting[j];
      sh.life += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      if (sh.life > sh.max || sh.y > HZ) { shooting.splice(j, 1); continue; }
      var k = Math.sin(Math.PI * sh.life / sh.max), tx = sh.x - sh.vx * 0.16, ty = sh.y - sh.vy * 0.16;
      var g = c.createLinearGradient(sh.x, sh.y, tx, ty);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * k) + ')'); g.addColorStop(0.3, Aura.rgba(cols.c2, 0.5 * k)); g.addColorStop(1, Aura.rgba(cols.c3, 0));
      c.strokeStyle = g; c.lineWidth = 1.8 * D; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sh.x, sh.y); c.lineTo(tx, ty); c.stroke();
      c.fillStyle = 'rgba(255,255,255,' + k + ')'; c.beginPath(); c.arc(sh.x, sh.y, 1.8 * D, 0, 6.2832); c.fill();
    }
    /* landscape + lake reflection */
    c.globalCompositeOperation = 'source-over';
    if (far) c.drawImage(far, 0, 0);
    c.save();
    c.beginPath(); c.rect(0, HZ, W, H - HZ); c.clip();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3;
    c.translate(0, HZ); c.scale(1, -0.45); c.translate(0, -HZ);
    c.drawImage(aur, 0, 0, W, H);
    c.restore();
    c.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 7; r++) {
      var ry = HZ + (H - HZ) * (0.08 + r * 0.11) + Math.sin(t * 0.6 + r) * 2 * D;
      var rx = (W * 0.5) + Math.sin(t * 0.21 + r * 1.7) * W * 0.3;
      c.globalAlpha = 0.05 + 0.04 * Math.sin(t + r);
      c.fillStyle = Aura.rgba(cols.c2, 1);
      c.fillRect(rx - W * 0.12, ry, W * 0.24, 1 * D);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (shore) c.drawImage(shore, 0, 0);
    /* wish sparkles */
    if (bursts.length) {
      c.globalCompositeOperation = 'lighter';
      for (var b = bursts.length - 1; b >= 0; b--) {
        var p = bursts[b];
        p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * D * dt; p.vx *= 0.98;
        if (p.life > p.max) { bursts.splice(b, 1); continue; }
        c.globalAlpha = 1 - p.life / p.max; c.fillStyle = Aura.rgba(p.c, 1);
        c.beginPath(); c.arc(p.x, p.y, 1.6 * D, 0, 6.2832); c.fill();
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }

  function swapLine(text) {
    lineEl.classList.add('swap');
    setTimeout(function () { lineEl.textContent = text; lineEl.classList.remove('swap'); }, 650);
  }
  var lineT = 0;
  var loop = Aura.loop(function (dt) {
    acc += dt;
    var cap = Aura.reduced ? 1 / 10 : (Aura.lowPower ? 1 / 30 : 1 / 60);
    if (acc < cap * 0.9) return;
    var step = acc; acc = 0;
    if (!Aura.reduced) {
      t += step;
      nextShoot -= step;
      if (nextShoot <= 0) { spawnShoot(); nextShoot = Aura.rand(3, 9); }
    }
    if (breathOn) {
      breathT += step;
      var half = Math.floor(breathT / 5.45) % 2;
      if (half !== lastHalf) {
        lastHalf = half;
        swapLine(half === 0 ? 'Breathe in… let the aurora rise.' : 'Breathe out… let it settle.');
        if (A.on()) A.tone(half === 0 ? 220 : 330, 5.4, { to: half === 0 ? 330 : 196, attack: 2, gain: 0.05, rev: 0.6 });
        Aura.vibrate(half === 0 ? 35 : 20);
      }
    } else {
      lineT += step;
      if (lineT > 9) { lineT = 0; li = (li + 1) % LINES.length; swapLine(LINES[li]); }
    }
    drawFrame(step);
  });

  /* ---- interactions ---- */
  cv.addEventListener('pointerdown', function (e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * D, y = (e.clientY - r.top) * D;
    for (var i = 0; i < shooting.length; i++) {
      var s = shooting[i];
      if (Math.hypot(s.x - x, s.y - y) < 60 * D) {
        burst(s.x, s.y); shooting.splice(i, 1);
        Aura.toast(Aura.pick(WISHES));
        if (A.on()) A.sparkle();
        Aura.vibrate([20, 30, 20]);
        return;
      }
    }
    if (y < HZ) {
      spawnShoot(x, y); burst(x, y);
      if (A.on()) A.tone(Aura.rand(1200, 1800), 0.8, { to: 600, gain: 0.03, rev: 0.7 });
      if (Math.random() < 0.25) Aura.toast('You made a star fall. Show-off. 🌠');
    }
  });

  var sBtn = $('nightSound'), bBtn = $('nightBreath'), fBtn = $('nightFull'), mine = [];
  sBtn.addEventListener('click', function () {
    var S = Aura.soundscape;
    if (mine.length) {
      mine.forEach(function (id) { S.stop(id); }); mine = [];
      sBtn.textContent = 'Play night ambience'; sBtn.setAttribute('aria-pressed', 'false');
      return;
    }
    var want = { pad: 0.55, wind: 0.22, ocean: 0.12 };
    Object.keys(want).forEach(function (id) { if (!S.isOn(id) && S.start(id, want[id])) mine.push(id); });
    if (mine.length || S.isOn('pad')) { sBtn.textContent = 'Stop night ambience'; sBtn.setAttribute('aria-pressed', 'true'); Aura.toast('Night ambience on. The crickets are on strike, sorry.'); }
  });
  Aura.on('mix', function () {
    mine = mine.filter(function (id) { return Aura.soundscape.isOn(id); });
    if (!mine.length) { sBtn.textContent = 'Play night ambience'; sBtn.setAttribute('aria-pressed', 'false'); }
  });
  bBtn.addEventListener('click', function () {
    breathOn = !breathOn; breathT = 0; lastHalf = -1;
    bBtn.setAttribute('aria-pressed', breathOn ? 'true' : 'false');
    bBtn.classList.toggle('is-active', breathOn);
    bBtn.textContent = breathOn ? 'Stop breathing guide' : 'Breathe with the aurora';
    if (breathOn) Aura.wake.on(); else { Aura.wake.off(); swapLine(LINES[li]); }
  });
  function isFull() { return document.fullscreenElement === stage || document.webkitFullscreenElement === stage || stage.classList.contains('pseudo-full'); }
  function exitPseudo() { stage.classList.remove('pseudo-full'); document.body.style.overflow = ''; setTimeout(build, 60); }
  fBtn.addEventListener('click', function () {
    if (isFull()) {
      if (stage.classList.contains('pseudo-full')) exitPseudo();
      else if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) {
      try {
        var pr = req.call(stage);
        if (pr && pr.catch) pr.catch(function () { stage.classList.add('pseudo-full'); document.body.style.overflow = 'hidden'; setTimeout(build, 60); });
      } catch (e) { stage.classList.add('pseudo-full'); setTimeout(build, 60); }
    } else { stage.classList.add('pseudo-full'); document.body.style.overflow = 'hidden'; setTimeout(build, 60); }
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(build, 80); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stage.classList.contains('pseudo-full')) exitPseudo(); });

  var rt = 0, active = false;
  window.addEventListener('resize', function () { if (!active) return; clearTimeout(rt); rt = setTimeout(build, 150); });
  Aura.on('view', function (v) {
    active = v === 'night';
    if (active) { build(); loop.start(); }
    else {
      loop.stop();
      if (stage.classList.contains('pseudo-full')) exitPseudo();
      if (breathOn) bBtn.click();
    }
  });
  Aura.on('theme', function () { if (active) build(); });
  Aura.on('lowpower', function () { if (active) build(); });
})();
