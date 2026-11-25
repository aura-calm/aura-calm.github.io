/* Aura — bg.js : slow fluid "aurora" background. WebGL fragment shader with Canvas2D fallback. */
(function () {
  'use strict';
  var Aura = window.Aura;
  var cv = Aura.byId('bg');
  if (!cv) return;

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform vec2 m;uniform float pulse;',
    'uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform vec3 c4;uniform float lt;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
    ' return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/r;',
    ' vec2 p=(uv-0.5)*vec2(r.x/r.y,1.0)*1.8+m*0.18;',
    ' float T=t*0.035;',
    ' vec2 q=vec2(fbm(p+vec2(0.0,T)),fbm(p+vec2(5.2,1.3)-T));',
    ' vec2 w=vec2(fbm(p+2.0*q+vec2(1.7,9.2)+T*1.3),fbm(p+2.0*q+vec2(8.3,2.8)-T*0.9));',
    ' float f=fbm(p+2.2*w);',
    ' vec3 col=mix(c1,c2,clamp(f*f*1.8,0.0,1.0));',
    ' col=mix(col,c3,clamp(q.x*q.x*1.5,0.0,1.0)*0.6);',
    ' col=mix(col,c4,smoothstep(0.55,0.95,w.y)*0.45);',
    ' float yy=uv.y-0.7-0.08*sin(uv.x*3.0+T*6.0+q.x*2.5);',
    ' float rib=exp(-yy*yy*26.0)*(0.35+0.65*fbm(vec2(uv.x*7.0+T*5.0,T*2.0)));',
    ' col+=mix(c2,c3,uv.x)*rib*(0.32+pulse*0.25);',
    ' float v=smoothstep(1.3,0.2,length((uv-0.5)*vec2(1.0,1.25)));',
    ' vec3 dark=c0+col*(0.16+0.5*f)*v*(1.0+pulse*0.25);',
    ' vec3 light=mix(col,vec3(1.0),0.5)*(0.92+0.12*f);',
    ' col=mix(dark,light,lt);',
    ' col+=(h(gl_FragCoord.xy+fract(t))-0.5)*0.022;',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  var gl = null, prog = null, U = {}, ctx2d = null, mode = 'none';
  var cols = Aura.themeColors();
  var scale = Aura.lowPower ? 0.25 : 0.42;
  var maxPx = Aura.lowPower ? 140000 : 520000;
  var mouse = [0, 0], mouseT = [0, 0];
  var pulse = 0, pulseT = 0;
  var time = Math.random() * 200, acc = 0;

  function initGL() {
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }) ||
        cv.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn('[Aura bg] shader', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return false;
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['r', 't', 'm', 'pulse', 'c0', 'c1', 'c2', 'c3', 'c4', 'lt'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fallback(); }, false);
    return true;
  }
  function fallback() {
    var n = cv.cloneNode(false);
    cv.parentNode.replaceChild(n, cv);
    cv = n; gl = null;
    ctx2d = cv.getContext('2d');
    mode = ctx2d ? '2d' : 'none';
    resize();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight, d = Math.min(1.5, Aura.dpr()) * (mode === '2d' ? 0.12 : scale);
    var pw = Math.max(64, Math.round(w * d)), ph = Math.max(64, Math.round(h * d));
    var px = pw * ph;
    if (px > maxPx) { var k = Math.sqrt(maxPx / px); pw = Math.round(pw * k); ph = Math.round(ph * k); }
    cv.width = pw; cv.height = ph;
    if (gl) gl.viewport(0, 0, pw, ph);
    if (Aura.reduced) draw();
  }

  function setColors() {
    cols = Aura.themeColors();
    if (!gl) return;
    ['c1', 'c2', 'c3', 'c4'].forEach(function (k) { var c = cols[k]; gl.uniform3f(U[k], c[0] / 255, c[1] / 255, c[2] / 255); });
    var b = cols.bg; gl.uniform3f(U.c0, b[0] / 255, b[1] / 255, b[2] / 255);
    gl.uniform1f(U.lt, cols.light ? 1 : 0);
  }

  /* 2D fallback: soft drifting light blobs on a tiny canvas, upscaled by CSS */
  function draw2d() {
    var c = ctx2d, w = cv.width, h = cv.height, T = time * 0.05;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = Aura.rgba(cols.bg, 1); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = cols.light ? 'source-over' : 'lighter';
    var blobs = [[cols.c2, 0.3, 0.3, 0.55], [cols.c3, 0.7, 0.4, 0.6], [cols.c4, 0.5, 0.75, 0.45], [cols.c1, 0.2, 0.8, 0.7]];
    blobs.forEach(function (b, i) {
      var x = (b[1] + 0.22 * Math.sin(T * (0.7 + i * 0.13) + i * 2) + mouse[0] * 0.05) * w;
      var y = (b[2] + 0.18 * Math.cos(T * (0.5 + i * 0.11) + i) - mouse[1] * 0.05) * h;
      var r = b[3] * Math.max(w, h);
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, Aura.rgba(b[0], cols.light ? 0.55 : 0.28 + pulse * 0.1));
      g.addColorStop(1, Aura.rgba(b[0], 0));
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
  }

  function draw() {
    if (mode === 'gl' && gl) {
      gl.uniform2f(U.r, cv.width, cv.height);
      gl.uniform1f(U.t, time % 2000);
      gl.uniform2f(U.m, mouse[0], mouse[1]);
      gl.uniform1f(U.pulse, pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (mode === '2d') draw2d();
  }

  /* adaptive performance: if frames are slow, lower resolution, then flag low power */
  var slow = 0, frames = 0, degraded = 0;
  var loop = Aura.loop(function (dt) {
    frames++;
    if (dt > 0.05) slow++;
    if (frames >= 120) {
      if (slow > 50 && !document.hidden) {
        degraded++;
        scale *= 0.7; maxPx *= 0.6; resize();
        if (degraded >= 2) Aura.setLowPower();
      }
      frames = 0; slow = 0;
    }
    acc += dt;
    var fpsCap = Aura.lowPower ? 1 / 24 : 1 / 40;
    if (acc < fpsCap) return;
    var step = acc; acc = 0;
    time += step;
    mouse[0] += (mouseT[0] - mouse[0]) * Math.min(1, step * 1.5);
    mouse[1] += (mouseT[1] - mouse[1]) * Math.min(1, step * 1.5);
    pulse += (pulseT - pulse) * Math.min(1, step * 2.5);
    pulseT *= Math.pow(0.4, step);
    draw();
  });

  function track(e) {
    mouseT[0] = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseT[1] = -(e.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener('pointermove', track, { passive: true });
  window.addEventListener('pointerdown', function (e) { track(e); pulseT = Math.min(1, pulseT + 0.35); }, { passive: true });

  Aura.bg = {
    pulse: function (v) { pulseT = Math.max(pulseT, v == null ? 0.6 : v); },
    setColors: function () { setColors(); if (Aura.reduced || !loop.isRunning()) draw(); }
  };

  function startStop() {
    if (Aura.reduced) { loop.stop(); draw(); return; }
    if (document.hidden) loop.stop(); else loop.start();
  }

  if (initGL()) mode = 'gl';
  else { /* getContext('webgl') may have claimed the canvas; start fresh for 2D */ fallback(); }
  resize(); setColors(); draw();
  startStop();

  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  Aura.on('theme', function () { Aura.bg.setColors(); });
  Aura.on('visibility', startStop);
  Aura.on('motion', startStop);
  Aura.on('lowpower', function () { scale = Math.min(scale, 0.25); maxPx = Math.min(maxPx, 140000); resize(); });
})();
