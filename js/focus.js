/* Aura — focus.js : Pomodoro timer + lo-fi controls + audio visualiser */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var elTime = $('focusTime'), elMode = $('focusMode'), elRing = $('focusRingProg'), elStart = $('focusStart');
  if (!elTime) return;
  var elSkip = $('focusSkip'), elReset = $('focusReset'), elWork = $('focusWork'), elBreak = $('focusBreak'), elLong = $('focusLong');
  var elTask = $('focusTask'), elDots = $('focusDots'), elCount = $('focusCount'), elLofi = $('focusLofi'), elLV = $('lofiVol'), elNow = $('lofiNow');
  var wrap = document.querySelector('#view-focus .ring-wrap');
  var CIRC = 603.19, baseTitle = document.title;
  var cfg = Aura.store.get('focusCfg', { work: 25, brk: 5, long: 15 });
  elWork.value = cfg.work; elBreak.value = cfg.brk; elLong.value = cfg.long;
  elTask.value = Aura.store.get('focusTask', '');

  var mode = 'work', cycle = 0, running = false, endAt = 0, remain = cfg.work * 60, total = remain, tick = 0;
  var LABEL = { work: 'Focus', brk: 'Short break', long: 'Long break' };
  var BREAK_TIPS = ['Stand up, roll your shoulders, look at something far away.', 'Drink some water. Your brain is 75% water and 25% tabs.',
    'Do a physiological sigh: two sips in, one long breath out.', 'Look out of a window. Wave at a cloud.', 'Stretch your wrists. They type so you don’t have to.'];

  function minsFor(m) { return m === 'work' ? cfg.work : (m === 'brk' ? cfg.brk : cfg.long); }
  function dots() {
    var h = '';
    for (var i = 0; i < 4; i++) h += '<i class="' + (i < cycle % 4 || (cycle > 0 && cycle % 4 === 0 && mode === 'long') ? 'on' : '') + '"></i>';
    elDots.innerHTML = h;
    elDots.setAttribute('aria-label', (cycle % 4 === 0 && mode === 'long' ? 4 : cycle % 4) + ' of 4 focus sessions this cycle');
  }
  function render() {
    elTime.textContent = Aura.fmt(remain);
    elMode.textContent = LABEL[mode] + (running ? '' : ' · ready');
    elRing.style.strokeDashoffset = (CIRC * (1 - Aura.clamp(remain / total, 0, 1))).toFixed(2);
    wrap.classList.toggle('break', mode !== 'work');
    document.title = running ? Aura.fmt(remain) + ' · ' + LABEL[mode] + ' — Aura' : baseTitle;
  }
  function countText() {
    var n = Aura.stats.focus || 0;
    elCount.textContent = n === 0 ? '0 focus sessions completed. The day is young.' :
      n + ' focus session' + (n === 1 ? '' : 's') + ' completed all-time. ' + (n >= 10 ? 'Absolute legend.' : 'Lovely momentum.');
  }
  function setMode(m) {
    mode = m; remain = total = minsFor(m) * 60;
    running = false; clearInterval(tick);
    elStart.textContent = 'Start';
    wrap.classList.remove('running');
    dots(); render();
  }
  function step() {
    remain = Math.max(0, (endAt - Date.now()) / 1000);
    render();
    if (remain <= 0) done();
  }
  function start() {
    A.unlock();
    endAt = Date.now() + remain * 1000;
    running = true; clearInterval(tick); tick = setInterval(step, 250);
    elStart.textContent = 'Pause'; wrap.classList.add('running');
    if (A.on()) A.chime();
    Aura.wake.on();
    render();
  }
  function pause() {
    running = false; clearInterval(tick);
    elStart.textContent = 'Resume'; wrap.classList.remove('running');
    Aura.wake.off();
    render();
  }
  function done() {
    running = false; clearInterval(tick); Aura.wake.off();
    if (A.on()) { A.bowl(261.63, 6, 0.16); setTimeout(function () { A.bowl(329.63, 6, 0.12); }, 700); }
    Aura.vibrate([80, 80, 80]);
    if (mode === 'work') {
      cycle++; Aura.addStat('focus', 1); countText();
      var task = elTask.value.trim();
      Aura.toast((task ? '“' + task + '” got some love. ' : 'Focus session done! ') + 'Break time — ' + Aura.pick(BREAK_TIPS), 5200);
      setMode(cycle % 4 === 0 ? 'long' : 'brk');
    } else {
      Aura.toast('Break over. Gently back to it — you’ve got this. 🌱', 4000);
      setMode('work');
    }
  }
  elStart.addEventListener('click', function () { if (running) pause(); else start(); });
  elSkip.addEventListener('click', function () {
    if (mode === 'work') { setMode((cycle + 1) % 4 === 0 ? 'long' : 'brk'); cycle++; dots(); Aura.toast('Skipped ahead to a break. We won’t tell.'); }
    else { setMode('work'); Aura.toast('Break skipped. Brave. Slightly suspicious.'); }
  });
  elReset.addEventListener('click', function () { cycle = 0; setMode('work'); Aura.wake.off(); });
  [elWork, elBreak, elLong].forEach(function (el) {
    el.addEventListener('change', function () {
      cfg = { work: Aura.clamp(parseInt(elWork.value, 10) || 25, 1, 120), brk: Aura.clamp(parseInt(elBreak.value, 10) || 5, 1, 60), long: Aura.clamp(parseInt(elLong.value, 10) || 15, 1, 90) };
      elWork.value = cfg.work; elBreak.value = cfg.brk; elLong.value = cfg.long;
      Aura.store.set('focusCfg', cfg);
      if (!running) setMode(mode);
    });
  });
  elTask.addEventListener('input', function () { Aura.store.set('focusTask', elTask.value); });

  /* ---- lo-fi ---- */
  var L = Aura.lofi;
  elLV.value = L.vol; Aura.paintRange(elLV);
  elLV.addEventListener('input', function () { Aura.paintRange(elLV); L.setVol(parseFloat(elLV.value)); });
  elLofi.addEventListener('change', function () {
    if (elLofi.checked) { if (!L.start()) elLofi.checked = false; }
    else L.stop();
  });
  Aura.on('lofi', function (on) {
    elLofi.checked = on;
    elNow.textContent = on ? 'Now playing: ' + L.title : 'The band is on a tea break. (The band is maths.)';
  });

  /* ---- visualiser ---- */
  var cv = $('lofiViz'), cx = cv.getContext('2d'), W = 0, H = 0, D = 1, cols = Aura.themeColors(), data = null, t = 0;
  function resize() { var f = Aura.fitCanvas(cv); W = f.w; H = f.h; D = f.d; }
  var loop = Aura.loop(function (dt) {
    t += dt;
    cx.clearRect(0, 0, W, H);
    var n = 32, bw = W / n, an = L.on ? L.analyser : null;
    if (an) { if (!data || data.length !== an.frequencyBinCount) data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data); }
    L.beatPulse *= Math.pow(0.05, dt);
    for (var i = 0; i < n; i++) {
      var v = an ? data[Math.min(data.length - 1, Math.floor(i * data.length / n * 0.8))] / 255 : 0.08 + 0.06 * Math.sin(t * 1.4 + i * 0.45);
      var h = Math.max(2 * D, v * H * 0.85);
      var x = i * bw + bw * 0.2, w = bw * 0.6, y = H - h;
      var g = cx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, Aura.rgba(cols.c4, 0.95)); g.addColorStop(0.5, Aura.rgba(cols.c3, 0.8)); g.addColorStop(1, Aura.rgba(cols.c2, 0.3));
      cx.fillStyle = g;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(x, y, w, h, Math.min(w / 2, 6 * D)); else cx.rect(x, y, w, h);
      cx.fill();
    }
    if (L.beatPulse > 0.02) {
      cx.fillStyle = Aura.rgba(cols.c2, L.beatPulse * 0.12);
      cx.fillRect(0, 0, W, H);
    }
  });
  Aura.on('view', function (v) { if (v === 'focus') { resize(); if (!Aura.reduced) loop.start(); else loop.stop(); } else loop.stop(); });
  Aura.on('theme', function () { cols = Aura.themeColors(); });
  window.addEventListener('resize', function () { if (loop.isRunning()) resize(); });

  setMode('work'); countText();
  Aura.on('stats', countText);
})();
