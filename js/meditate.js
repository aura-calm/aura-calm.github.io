/* Aura — meditate.js : meditation timer with singing-bowl interval bells + guided read-aloud scripts */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var elTime = $('medTime'), elState = $('medState'), elRing = $('medRingProg'), elStart = $('medStart'), elReset = $('medReset');
  var elBowl = $('medBowl'), elCustom = $('medCustom'), elInt = $('medInterval');
  if (!elTime) return;
  var CIRC = 603.19;
  var PROMPTS = ['Notice the breath, without fixing it.', 'Thoughts are weather. You are the sky.', 'Soften the jaw. Drop the shoulders.',
    'If you wander, simply come back. That’s the whole practice.', 'Nothing to do. Nowhere to be. Just this.', 'Feel the weight of your body, supported.',
    'Gently curious. Gently here.', 'Each exhale, a little more ease.'];

  var dur = (Aura.store.get('medMin', 10)) * 60, remain = dur, running = false, endAt = 0, tick = 0, lastBell = 0, lastPrompt = 0;

  function render() {
    elTime.textContent = Aura.fmt(remain);
    elRing.style.strokeDashoffset = (CIRC * (1 - Aura.clamp(remain / dur, 0, 1))).toFixed(2);
  }
  function markChips(min) {
    Aura.$$('.med-dur').forEach(function (b) {
      var on = parseFloat(b.getAttribute('data-min')) === min;
      b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  function setDur(min) {
    if (running) { Aura.toast('Finish (or reset) this sit first — one calm at a time.'); return; }
    min = Aura.clamp(Math.round(min), 1, 180);
    dur = remain = min * 60; lastBell = 0;
    Aura.store.set('medMin', min);
    markChips(min); render();
    elState.textContent = 'Sit comfortably';
  }
  function step() {
    remain = Math.max(0, (endAt - Date.now()) / 1000);
    var elapsed = dur - remain, iv = parseFloat(elInt.value) || 0;
    if (iv > 0) {
      var k = Math.floor(elapsed / (iv * 60));
      if (k > lastBell && remain > 4) { lastBell = k; A.bowl(293.66, 7, 0.13); Aura.vibrate(40); }
    }
    var pk = Math.floor(elapsed / 40);
    if (pk > lastPrompt) { lastPrompt = pk; elState.textContent = Aura.pick(PROMPTS); }
    render();
    if (remain <= 0) complete();
  }
  function start() {
    A.ensureOn();
    if (remain <= 0) remain = dur;
    endAt = Date.now() + remain * 1000;
    running = true;
    clearInterval(tick); tick = setInterval(step, 250);
    if (remain >= dur - 0.5) { A.bowl(196, 11, 0.22); lastBell = 0; lastPrompt = 0; elState.textContent = 'Arrive. Breathe. Be.'; }
    else elState.textContent = 'Welcome back';
    elStart.textContent = 'Pause';
    elStart.parentNode.parentNode.querySelector('.ring-wrap').classList.add('running');
    Aura.wake.on();
  }
  function pause() {
    running = false; clearInterval(tick);
    elStart.textContent = 'Resume';
    elState.textContent = 'Paused — the cushion will wait';
    document.querySelector('#view-meditate .ring-wrap').classList.remove('running');
    Aura.wake.off();
  }
  function complete() {
    running = false; clearInterval(tick);
    remain = 0; render();
    A.bowl(196, 10, 0.22);
    setTimeout(function () { A.bowl(196, 10, 0.2); }, 2600);
    setTimeout(function () { A.bowl(261.63, 12, 0.2); }, 5200);
    Aura.vibrate([60, 120, 60]);
    Aura.addStat('medMin', Math.round(dur / 6) / 10);
    elState.textContent = 'Complete. Welcome back, gently.';
    elStart.textContent = 'Again';
    document.querySelector('#view-meditate .ring-wrap').classList.remove('running');
    Aura.wake.off();
    Aura.toast('Meditation complete 🪷 You sat with yourself — that’s brave and slightly rare.', 4500);
    remain = dur;
    setTimeout(function () { if (!running) render(); }, 6000);
  }
  function reset() {
    running = false; clearInterval(tick);
    remain = dur; lastBell = 0; lastPrompt = 0;
    elStart.textContent = 'Begin'; elState.textContent = 'Sit comfortably';
    document.querySelector('#view-meditate .ring-wrap').classList.remove('running');
    Aura.wake.off();
    render();
  }

  Aura.$$('.med-dur').forEach(function (b) {
    b.addEventListener('click', function () { elCustom.value = ''; setDur(parseFloat(b.getAttribute('data-min'))); });
  });
  elCustom.addEventListener('change', function () {
    var v = parseFloat(elCustom.value);
    if (v > 0) setDur(v); else elCustom.value = '';
  });
  var savedIv = Aura.store.get('medInterval', null);
  if (savedIv != null) elInt.value = savedIv;
  elInt.addEventListener('change', function () { Aura.store.set('medInterval', elInt.value); });
  elStart.addEventListener('click', function () { if (running) pause(); else start(); });
  elReset.addEventListener('click', reset);
  elBowl.addEventListener('click', function () {
    A.ensureOn();
    A.bowl(Aura.pick([174.6, 196, 220, 261.63]), 10, 0.22);
    elBowl.classList.remove('is-active'); void elBowl.offsetWidth; elBowl.classList.add('is-active');
    setTimeout(function () { elBowl.classList.remove('is-active'); }, 1200);
  });
  var m0 = dur / 60; markChips(m0);
  if ([3, 5, 10, 15, 20].indexOf(m0) < 0) elCustom.value = m0;
  render();

  /* ================= Guided meditations ================= */
  var SCRIPTS = [
    { id: 'arrive', title: 'Two-minute arrival', emoji: '🌿', lines: [
      'Welcome. You made it here, and that is enough for now.',
      'Let your body settle into whatever is holding it — a chair, a bed, the floor.',
      'Take one slow breath in through the nose…',
      'and let it go, slowly, through the mouth.',
      'Notice three things you can hear right now. Near, far, and very far.',
      'Notice where your body touches something solid.',
      'There is nothing to fix in this moment. Nothing to achieve.',
      'One more breath. In… and out.',
      'When you are ready, carry a little of this stillness with you.'] },
    { id: 'body', title: 'Gentle body scan', emoji: '🫧', lines: [
      'Find a comfortable position, and let your eyes close or soften.',
      'Bring your attention to the top of your head. Just notice it.',
      'Let the forehead smooth out, as if someone ironed it with kindness.',
      'Soften the eyes, the cheeks, the jaw. Let the tongue rest.',
      'Notice your neck and shoulders. Let them drop, even a millimetre.',
      'Feel your arms, heavy and warm, all the way to the fingertips.',
      'Notice your chest rising and falling, all on its own.',
      'Let the belly be soft. No need to hold it in. Nobody is watching.',
      'Feel your hips, your legs, your knees, your feet.',
      'Imagine a slow wave of warmth moving from your head down to your toes.',
      'Your whole body, breathing. Your whole body, here.',
      'Rest in this for a few breaths. You are doing beautifully.'] },
    { id: 'kind', title: 'Loving-kindness', emoji: '💗', lines: [
      'Sit comfortably, and place a hand on your heart if that feels nice.',
      'Silently, say to yourself: May I be safe.',
      'May I be healthy.',
      'May I be at ease.',
      'Now picture someone who makes you smile. Offer them the same wish.',
      'May you be safe. May you be healthy. May you be at ease.',
      'Now picture someone neutral — the person who made your tea, perhaps.',
      'May you be safe. May you be healthy. May you be at ease.',
      'And finally, widen the circle to everyone, everywhere.',
      'May all beings be safe. May all beings be at ease.',
      'Notice any warmth in your chest. That is yours to keep.'] },
    { id: 'ground', title: '5-4-3-2-1 grounding', emoji: '🪨', lines: [
      'When the mind is racing, the senses can bring you home.',
      'Look around and gently name five things you can see.',
      'Now notice four things you can feel. Fabric, air, the weight of your hands.',
      'Listen for three things you can hear.',
      'Notice two things you can smell, or two scents you love.',
      'And one thing you can taste, or one thing you are grateful for.',
      'Take a slow breath. You are here, in this room, in this moment.',
      'Well done. That was your nervous system, being looked after.'] },
    { id: 'stream', title: 'Leaves on a stream', emoji: '🍂', lines: [
      'Imagine you are sitting beside a slow, gentle stream.',
      'Leaves float by on the water, one after another.',
      'Whenever a thought appears, place it on a leaf.',
      'Watch it drift away downstream. No need to push it.',
      'Worries, plans, to-do lists — all welcome on a leaf.',
      'If you get swept along with a thought, that is okay. Just come back to the bank.',
      'The stream keeps flowing. You keep sitting. Calm and unhurried.',
      'Take one more breath beside the water.',
      'Then slowly return, bringing the calm of the stream with you.'] }
  ];

  var elList = $('guidedList'), elText = $('guidedText'), elPlay = $('guidedPlay'), elStop = $('guidedStop'), elVoice = $('guidedVoice'), elRate = $('guidedRate');
  var cur = null, reading = false, li = 0, readTimer = 0, guard = 0, token = 0;

  elList.innerHTML = SCRIPTS.map(function (s) {
    return '<button class="chip guided-btn" type="button" role="radio" aria-checked="false" data-id="' + s.id + '">' + s.emoji + ' ' + Aura.esc(s.title) + '</button>';
  }).join('');
  function select(id) {
    stopRead(true);
    cur = SCRIPTS.filter(function (s) { return s.id === id; })[0] || null;
    Aura.$$('.guided-btn').forEach(function (b) {
      var on = b.getAttribute('data-id') === id;
      b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (!cur) return;
    elText.innerHTML = '<h4>' + cur.emoji + ' ' + Aura.esc(cur.title) + '</h4>' +
      cur.lines.map(function (l, i) { return '<p data-i="' + i + '">' + Aura.esc(l) + '</p>'; }).join('');
    elText.scrollTop = 0;
  }
  Aura.$$('.guided-btn').forEach(function (b) { b.addEventListener('click', function () { select(b.getAttribute('data-id')); }); });

  function voices() { try { return Aura.canSpeak ? window.speechSynthesis.getVoices() : []; } catch (e) { return []; } }
  function fillVoices() {
    var vs = voices();
    if (!vs.length) return;
    var saved = Aura.store.get('voice', '');
    var en = vs.filter(function (v) { return /^en/i.test(v.lang); }), other = vs.filter(function (v) { return !/^en/i.test(v.lang); });
    elVoice.innerHTML = '<option value="">Default voice</option>' + en.concat(other).slice(0, 60).map(function (v) {
      return '<option value="' + Aura.esc(v.name) + '"' + (v.name === saved ? ' selected' : '') + '>' + Aura.esc(v.name + ' (' + v.lang + ')') + '</option>';
    }).join('');
  }
  if (Aura.canSpeak) {
    fillVoices();
    try { window.speechSynthesis.addEventListener('voiceschanged', fillVoices); } catch (e) { window.speechSynthesis.onvoiceschanged = fillVoices; }
  } else {
    elVoice.disabled = true;
    elVoice.innerHTML = '<option>Read-aloud not supported here — we’ll highlight the text instead</option>';
  }
  elVoice.addEventListener('change', function () { Aura.store.set('voice', elVoice.value); });
  var savedRate = Aura.store.get('rate', null);
  if (savedRate) elRate.value = savedRate;
  Aura.paintRange(elRate);
  elRate.addEventListener('input', function () { Aura.paintRange(elRate); Aura.store.set('rate', elRate.value); });
  function pickVoice() {
    var n = elVoice.value; if (!n) return null;
    return voices().filter(function (v) { return v.name === n; })[0] || null;
  }

  function mark() {
    Aura.$$('p[data-i]', elText).forEach(function (p) {
      var i = +p.getAttribute('data-i');
      p.classList.toggle('is-reading', i === li); p.classList.toggle('done', i < li);
      if (i === li) {
        var top = p.offsetTop - elText.clientHeight / 2 + p.clientHeight / 2;
        elText.scrollTop = Math.max(0, top);
      }
    });
  }
  function advance(my) {
    if (!reading || my !== token) return;
    clearTimeout(guard); token++;
    var rate = parseFloat(elRate.value) || 0.85;
    readTimer = setTimeout(function () { li++; nextLine(); }, (1400 + Math.random() * 600) / rate);
  }
  function nextLine() {
    if (!reading || !cur) return;
    if (li >= cur.lines.length) { finishRead(); return; }
    mark();
    var text = cur.lines[li], my = token, rate = parseFloat(elRate.value) || 0.85;
    var words = text.split(/\s+/).length;
    if (Aura.canSpeak) {
      Aura.speak(text, { rate: rate, voice: pickVoice(), onend: function () { advance(my); } });
      guard = setTimeout(function () { advance(my); }, (words * 650 / rate) + 6000);
    } else {
      guard = setTimeout(function () { advance(my); }, (1800 + words * 430) / rate);
    }
  }
  function play() {
    if (!cur) { Aura.toast('Pick a meditation first — we can’t read your mind. Yet.'); return; }
    stopRead(true);
    reading = true; li = 0; token++;
    elPlay.textContent = 'Reading…'; elPlay.setAttribute('aria-pressed', 'true');
    if (!Aura.canSpeak) Aura.toast('Your browser can’t read aloud, so we’ll glow each line for you instead.');
    if (A.on()) A.bowl(220, 6, 0.1);
    Aura.wake.on();
    nextLine();
  }
  function stopRead(silent) {
    var was = reading;
    reading = false; token++;
    clearTimeout(readTimer); clearTimeout(guard);
    Aura.stopSpeak();
    elPlay.textContent = 'Read aloud'; elPlay.setAttribute('aria-pressed', 'false');
    if (was) Aura.wake.off();
    if (!silent) Aura.$$('p[data-i]', elText).forEach(function (p) { p.classList.remove('is-reading', 'done'); });
  }
  function finishRead() {
    stopRead(true);
    Aura.$$('p[data-i]', elText).forEach(function (p) { p.classList.remove('is-reading'); p.classList.add('done'); });
    if (A.on()) A.bowl(196, 9, 0.16);
    Aura.addStat('medMin', 2);
    Aura.toast('That’s the end. Take your time coming back — no rush, ever.');
  }
  elPlay.addEventListener('click', function () { if (reading) stopRead(); else play(); });
  elStop.addEventListener('click', function () { stopRead(); });

  Aura.meditate = { stopRead: stopRead };
  Aura.on('view', function (v) { if (v !== 'meditate' && reading) stopRead(); });
})();
