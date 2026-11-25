/* Aura — journal.js : mood check-ins, gentle SVG chart, gratitude jar, export / import */
(function () {
  'use strict';
  var Aura = window.Aura, A = Aura.audio, $ = Aura.byId;
  var chart = $('moodChart');
  if (!chart) return;
  var NS = 'http://www.w3.org/2000/svg';
  var MOOD = { 1: ['⛈️', 'Stormy'], 2: ['🌧️', 'Drizzly'], 3: ['⛅', 'Okay'], 4: ['🌤️', 'Sunny'], 5: ['🌈', 'Radiant'] };
  var REPLY = {
    1: 'Thank you for being honest. Storms pass — and you don’t have to weather this one alone. 💙',
    2: 'Drizzly days count too. Maybe a warm drink and a slow breath?',
    3: 'Okay is a perfectly respectable weather report.',
    4: 'Sunny! Lovely. Bottle some of that for later.',
    5: 'Radiant! Please share your secret. Or at least your snacks.'
  };
  var J = Aura.journal = {
    moods: Aura.store.get('moods', []),
    grat: Aura.store.get('grat', [])
  };
  if (!Array.isArray(J.moods)) J.moods = [];
  if (!Array.isArray(J.grat)) J.grat = [];
  function save() { Aura.store.set('moods', J.moods); Aura.store.set('grat', J.grat); Aura.emit('stats'); }

  /* ---- mood picker ---- */
  var sel = 0, elNote = $('moodNote');
  Aura.$$('.mood-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      sel = +b.getAttribute('data-mood');
      Aura.$$('.mood-btn').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      if (A.on()) A.tone(392 + sel * 60, 0.5, { gain: 0.04, rev: 0.4 });
    });
  });
  $('moodSave').addEventListener('click', function () {
    if (!sel) { Aura.toast('Pick a weather first — even “Okay” is a valid forecast.'); return; }
    J.moods.push({ t: Date.now(), m: sel, n: elNote.value.trim().slice(0, 400) });
    if (J.moods.length > 2000) J.moods.splice(0, J.moods.length - 2000);
    save();
    Aura.toast(REPLY[sel], 4200);
    if (A.on()) A.chime();
    if (sel <= 2) setTimeout(function () { Aura.toast('If things feel heavy: India Tele-MANAS 14416 · findahelpline.com — you deserve support.', 6000); }, 4400);
    sel = 0; elNote.value = '';
    Aura.$$('.mood-btn').forEach(function (x) { x.setAttribute('aria-checked', 'false'); });
    drawChart();
  });

  /* ---- chart ---- */
  function el(tag, attrs, txt) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function drawChart() {
    while (chart.firstChild) chart.removeChild(chart.firstChild);
    var Wd = 320, Ht = 170, pl = 26, pr = 10, pt = 14, pb = 26, days = 14;
    var iw = Wd - pl - pr, ih = Ht - pt - pb;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var buckets = [];
    for (var i = days - 1; i >= 0; i--) { var d = new Date(now); d.setDate(now.getDate() - i); buckets.push({ key: Aura.today(d), d: d, sum: 0, n: 0 }); }
    var map = {}; buckets.forEach(function (b) { map[b.key] = b; });
    J.moods.forEach(function (m) { var k = Aura.today(new Date(m.t)); if (map[k]) { map[k].sum += m.m; map[k].n++; } });
    for (var y = 1; y <= 5; y++) {
      var yy = pt + ih - (y - 1) / 4 * ih;
      chart.appendChild(el('line', { x1: pl, x2: Wd - pr, y1: yy, y2: yy, 'class': 'axis', 'stroke-dasharray': y === 3 ? '0' : '2 4' }));
      chart.appendChild(el('text', { x: 4, y: yy + 4, 'class': 'lbl' }, MOOD[y][0]));
    }
    buckets.forEach(function (b, i) {
      if (i % 2 === 0 || i === days - 1) {
        var x = pl + i / (days - 1) * iw;
        chart.appendChild(el('text', { x: x, y: Ht - 8, 'class': 'lbl', 'text-anchor': 'middle' }, i === days - 1 ? 'Today' : b.d.toLocaleDateString(undefined, { weekday: 'narrow' }) + b.d.getDate()));
      }
    });
    var pts = [];
    buckets.forEach(function (b, i) {
      if (b.n) pts.push({ x: pl + i / (days - 1) * iw, y: pt + ih - ((b.sum / b.n) - 1) / 4 * ih, v: b.sum / b.n, b: b });
    });
    if (!pts.length) {
      chart.appendChild(el('text', { x: Wd / 2, y: Ht / 2 - 4, 'text-anchor': 'middle', 'class': 'emptytxt' }, 'No check-ins yet. The chart is patiently doodling.'));
      var doodle = 'M' + pl + ' ' + (pt + ih * 0.7);
      for (var q = 1; q <= 8; q++) doodle += ' Q' + (pl + (q - 0.5) * iw / 8) + ' ' + (pt + ih * (q % 2 ? 0.55 : 0.85)) + ' ' + (pl + q * iw / 8) + ' ' + (pt + ih * 0.7);
      chart.appendChild(el('path', { d: doodle, 'class': 'line', opacity: '.35' }));
    } else {
      var dpath = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
      for (var j = 1; j < pts.length; j++) {
        var p0 = pts[j - 2] || pts[j - 1], p1 = pts[j - 1], p2 = pts[j], p3 = pts[j + 1] || p2;
        var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        dpath += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
      }
      var base = pt + ih;
      if (pts.length > 1) chart.appendChild(el('path', { d: dpath + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + base + ' L' + pts[0].x.toFixed(1) + ' ' + base + ' Z', 'class': 'area' }));
      chart.appendChild(el('path', { d: dpath, 'class': 'line' }));
      pts.forEach(function (p, k) {
        var c = el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4.2, 'class': 'dot', style: 'animation-delay:' + (0.3 + k * 0.08) + 's' });
        c.appendChild(el('title', {}, p.b.d.toLocaleDateString() + ': ' + MOOD[Math.round(p.v)][1] + ' (' + p.b.n + ' check-in' + (p.b.n > 1 ? 's' : '') + ')'));
        chart.appendChild(c);
      });
    }
    statsText();
  }
  function streak() {
    var set = {}; J.moods.forEach(function (m) { set[Aura.today(new Date(m.t))] = 1; });
    var d = new Date(), n = 0;
    if (!set[Aura.today(d)]) d.setDate(d.getDate() - 1);
    while (set[Aura.today(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function statsText() {
    var s = $('moodStats');
    if (!J.moods.length) { s.textContent = 'Your first check-in will appear here like a tiny sunrise.'; return; }
    var recent = J.moods.slice(-30), avg = recent.reduce(function (a, m) { return a + m.m; }, 0) / recent.length;
    var st = streak();
    s.textContent = J.moods.length + ' check-ins · recent average: ' + MOOD[Math.round(avg)][1].toLowerCase() + ' ' + MOOD[Math.round(avg)][0] +
      (st > 1 ? ' · ' + st + '-day streak (no pressure, we’re not that kind of app)' : '');
  }
  J.streak = streak;

  /* ---- gratitude jar ---- */
  var list = $('gratList'), empty = $('gratEmpty'), form = $('gratForm'), input = $('gratInput');
  function renderGrat(animateFirst) {
    empty.hidden = J.grat.length > 0;
    list.innerHTML = J.grat.slice().reverse().slice(0, 60).map(function (g, i) {
      var d = new Date(g.t);
      return '<li' + (i === 0 && animateFirst ? '' : ' style="animation:none"') + '><span class="g-txt">' + Aura.esc(g.x) +
        '<time datetime="' + d.toISOString() + '">' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</time></span>' +
        '<button class="grat-del" type="button" data-t="' + g.t + '" aria-label="Remove this gratitude"><svg class="ic"><use href="#i-close"/></svg></button></li>';
    }).join('');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) { Aura.toast('Even “coffee” counts. Especially coffee.'); input.focus(); return; }
    J.grat.push({ t: Date.now(), x: v.slice(0, 160) });
    if (J.grat.length > 1000) J.grat.splice(0, J.grat.length - 1000);
    save(); input.value = ''; renderGrat(true);
    if (A.on()) A.sparkle();
    if (Aura.fx) Aura.fx.burst(input);
    Aura.toast(Aura.pick(['Into the jar it goes ✨', 'Noted with gratitude 🫙', 'The jar is glowing a little brighter.', 'Lovely. Future-you will enjoy reading that.']));
  });
  list.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.grat-del') : null;
    if (!b) return;
    var t = +b.getAttribute('data-t');
    J.grat = J.grat.filter(function (g) { return g.t !== t; });
    save(); renderGrat(false);
  });

  /* ---- export / import / clear ---- */
  $('exportBtn').addEventListener('click', function () {
    var data = { app: 'aura', version: 1, exported: new Date().toISOString(), moods: J.moods, grat: J.grat, stats: Aura.stats };
    try {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'aura-journal-' + Aura.today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      Aura.toast('Exported! Your feelings, now in convenient JSON form.');
    } catch (err) { Aura.toast('Export failed — your browser is being shy.'); }
  });
  var file = $('importFile');
  $('importBtn').addEventListener('click', function () { file.click(); });
  file.addEventListener('change', function () {
    var f = file.files && file.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || d.app !== 'aura' || !Array.isArray(d.moods) || !Array.isArray(d.grat)) throw new Error('bad');
        var seenM = {}, seenG = {};
        J.moods.forEach(function (m) { seenM[m.t] = 1; }); J.grat.forEach(function (g) { seenG[g.t] = 1; });
        d.moods.forEach(function (m) { if (m && typeof m.t === 'number' && m.m >= 1 && m.m <= 5 && !seenM[m.t]) J.moods.push({ t: m.t, m: Math.round(m.m), n: String(m.n || '').slice(0, 400) }); });
        d.grat.forEach(function (g) { if (g && typeof g.t === 'number' && g.x && !seenG[g.t]) J.grat.push({ t: g.t, x: String(g.x).slice(0, 160) }); });
        J.moods.sort(function (a, b) { return a.t - b.t; }); J.grat.sort(function (a, b) { return a.t - b.t; });
        save(); drawChart(); renderGrat(false);
        Aura.toast('Imported and merged. Welcome back, past-you. 👋');
      } catch (err) { Aura.toast('That file doesn’t look like an Aura export. Nice try, mysterious file.'); }
      file.value = '';
    };
    r.readAsText(f);
  });
  $('clearData').addEventListener('click', function () {
    if (!J.moods.length && !J.grat.length) { Aura.toast('Nothing to clear. Pristine. Minimalist. Iconic.'); return; }
    if (!window.confirm('Clear all check-ins and gratitude entries from this device? (Export first if you want a copy.)')) return;
    J.moods = []; J.grat = []; save(); drawChart(); renderGrat(false);
    Aura.toast('Cleared. A fresh page — very poetic.');
  });

  drawChart(); renderGrat(false);
  Aura.on('view', function (v) { if (v === 'journal') drawChart(); });
})();
