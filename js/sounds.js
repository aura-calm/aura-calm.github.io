/* Aura — sounds.js : mixer UI, presets, binaural toggle, sleep timer with fade-out */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, S = Aura.soundscape, $ = Aura.byId;
  var mixer = $('mixer');
  if (!mixer || !S) return;

  var state = Aura.store.get('mix', {});
  S.defs.forEach(function (d) { if (!state[d.id]) state[d.id] = { vol: 0.6 }; });
  function save() { Aura.store.set('mix', state); }

  mixer.innerHTML = S.defs.map(function (d) {
    return '<div class="mix-card glass" data-id="' + d.id + '">' +
      '<button class="mix-toggle" type="button" aria-pressed="false" aria-label="' + Aura.esc(d.name) + ' — off. Tap to play">' +
      '<span class="mix-emoji" aria-hidden="true">' + d.emoji + '</span>' +
      '<span class="mix-txt"><span class="mix-name">' + Aura.esc(d.name) + '</span><span class="mix-tip">' + Aura.esc(d.tip) + '</span></span>' +
      '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>' +
      '<input class="mix-vol" type="range" min="0" max="1" step="0.01" value="' + state[d.id].vol + '" aria-label="' + Aura.esc(d.name) + ' volume">' +
      '</div>';
  }).join('');

  function refresh() {
    Aura.$$('.mix-card', mixer).forEach(function (card) {
      var id = card.getAttribute('data-id'), on = S.isOn(id), btn = card.querySelector('.mix-toggle');
      var name = card.querySelector('.mix-name').textContent;
      card.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', name + (on ? ' — playing. Tap to stop' : ' — off. Tap to play'));
    });
    Aura.$$('.preset-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-preset') === activePreset ? 'true' : 'false'); });
  }
  var activePreset = '';

  mixer.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.mix-toggle') : null;
    if (!btn) return;
    var id = btn.parentNode.getAttribute('data-id');
    activePreset = '';
    if (S.isOn(id)) S.stop(id);
    else S.start(id, state[id].vol);
    refresh();
  });
  mixer.addEventListener('input', function (e) {
    if (!e.target.classList.contains('mix-vol')) return;
    var id = e.target.parentNode.getAttribute('data-id'), v = parseFloat(e.target.value);
    state[id].vol = v; Aura.paintRange(e.target);
    if (S.isOn(id)) S.level(id, v);
    save();
  });
  /* releasing a slider of a silent channel starts it — friendly shortcut */
  mixer.addEventListener('change', function (e) {
    if (!e.target.classList.contains('mix-vol')) return;
    var id = e.target.parentNode.getAttribute('data-id');
    if (!S.isOn(id) && parseFloat(e.target.value) > 0.02) { S.start(id, state[id].vol); refresh(); }
  });
  Aura.$$('.mix-vol', mixer).forEach(Aura.paintRange);

  var PRESETS = {
    storm: { rain: 0.85, wind: 0.45, brown: 0.3 },
    beach: { ocean: 0.85, wind: 0.22, birds: 0.18 },
    campfire: { fire: 0.85, wind: 0.2, birds: 0.1 },
    forest: { birds: 0.7, wind: 0.3, rain: 0.12 },
    deep: { brown: 0.65, pink: 0.18, rain: 0.2 },
    cosmos: { pad: 0.75, wind: 0.2, ocean: 0.15 }
  };
  var PRESET_JOKES = {
    storm: 'Cosy storm engaged. Blanket not included (yet).',
    beach: 'Beach at dusk. Sunscreen optional, for once.',
    campfire: 'Campfire lit. Marshmallows are imaginary but delicious.',
    forest: 'Morning forest. The birds are procedurally generated and very proud of it.',
    deep: 'Deep focus mode. Your inbox can wait. It always says it can’t. It can.',
    cosmos: 'Cosmos. You are now officially floating.'
  };
  Aura.$$('.preset-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = PRESETS[b.getAttribute('data-preset')];
      if (!p || !A.ensureOn()) return;
      S.stopAll(true);
      Object.keys(p).forEach(function (id) {
        state[id].vol = p[id];
        var r = mixer.querySelector('.mix-card[data-id="' + id + '"] .mix-vol');
        if (r) { r.value = p[id]; Aura.paintRange(r); }
        setTimeout(function () { S.start(id, p[id]); refresh(); }, 50);
      });
      activePreset = b.getAttribute('data-preset');
      save(); refresh();
      Aura.toast(PRESET_JOKES[activePreset]);
    });
  });
  $('mixStop').addEventListener('click', function () {
    var had = S.count();
    S.stopAll(true); activePreset = ''; refresh();
    Aura.toast(had ? 'Silence. Golden, as advertised.' : 'Already silent. Very zen of you.');
  });

  var mv = $('masterVol');
  mv.value = Aura.store.get('masterVol', 0.8);
  Aura.paintRange(mv);
  mv.addEventListener('input', function () {
    var v = parseFloat(mv.value);
    Aura.paintRange(mv); Aura.store.set('masterVol', v);
    if (A.ctx) A.buses.ambient.gain.setTargetAtTime(v, A.ctx.currentTime, 0.08);
  });

  /* ---- binaural ---- */
  var bt = $('binauralToggle'), bb = $('binauralBeat'), warn = $('binauralWarn');
  bt.addEventListener('change', function () {
    if (bt.checked) {
      warn.classList.add('alert');
      setTimeout(function () { warn.classList.remove('alert'); }, 2400);
      if (!S.start('binaural', 0.6, { beat: parseFloat(bb.value) })) { bt.checked = false; return; }
      Aura.toast('🎧 Headphones on? Binaural beats need one tone per ear.');
    } else S.stop('binaural');
  });
  bb.addEventListener('change', function () { S.setBeat(parseFloat(bb.value)); });

  /* ---- sleep timer with gentle fade ---- */
  var sleepEnd = 0, sleepTick = 0, fading = false, elStatus = $('sleepStatus'), elCancel = $('sleepCancel');
  var FADE = 60;
  function busesTo(v, secs) {
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    ['ambient', 'music'].forEach(function (n) {
      var g = A.buses[n].gain;
      g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.linearRampToValueAtTime(v, t + secs);
    });
  }
  function restoreBuses() {
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    A.buses.ambient.gain.cancelScheduledValues(t); A.buses.ambient.gain.setValueAtTime(parseFloat(mv.value), t);
    A.buses.music.gain.cancelScheduledValues(t); A.buses.music.gain.setValueAtTime(0.9, t);
  }
  function sleepStep() {
    var left = (sleepEnd - Date.now()) / 1000;
    if (left <= FADE && !fading) { fading = true; busesTo(0.0001, Math.max(1, left)); }
    if (left <= 0) {
      clearInterval(sleepTick); sleepTick = 0; sleepEnd = 0; fading = false;
      S.stopAll(); if (Aura.lofi) Aura.lofi.stop(); if (Aura.meditate) Aura.meditate.stopRead();
      bt.checked = false; activePreset = ''; refresh();
      setTimeout(restoreBuses, 3000);
      elStatus.textContent = 'Goodnight 🌙 Everything faded out softly.';
      elCancel.hidden = true;
      Aura.$$('.sleep-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      Aura.wake.off();
      Aura.emit('sleepdone');
      return;
    }
    elStatus.textContent = (fading ? 'Fading out… ' : 'Sounds fade out in ') + Aura.fmt(left);
  }
  Aura.$$('.sleep-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var min = parseFloat(b.getAttribute('data-min'));
      if (fading) restoreBuses();
      fading = false;
      sleepEnd = Date.now() + min * 60000;
      clearInterval(sleepTick); sleepTick = setInterval(sleepStep, 1000); sleepStep();
      elCancel.hidden = false;
      Aura.$$('.sleep-btn').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      Aura.toast(S.count() || (Aura.lofi && Aura.lofi.on) ? 'Sleep timer set. Sweet dreams in advance. 🌙' : 'Timer set — now pick a sound to drift off to.');
    });
  });
  elCancel.addEventListener('click', function () {
    clearInterval(sleepTick); sleepTick = 0; sleepEnd = 0;
    if (fading) restoreBuses();
    fading = false;
    elCancel.hidden = true;
    elStatus.textContent = 'Timer cancelled. Stay up as long as you like (but maybe not too long).';
    Aura.$$('.sleep-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  });

  Aura.on('mix', refresh);
  refresh();
})();
