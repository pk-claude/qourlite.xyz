// REPLY ALL -- the stage: a WebGL backdrop (Winter Fest: forest green, string lights, pines, falling snow, soft spotlights) and one particle layer
// (confetti, sparks, coins, shredded redaction strips, pyro fountains). The audience screen drives both through
// window.STAGE and window.FX. If WebGL is missing the backdrop falls back to a CSS gradient and the game carries on.
(function () {
  'use strict';
  var CALM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- backdrop
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision mediump float;',
    'uniform vec2 R;uniform float T;uniform vec3 CA;uniform vec3 CB;uniform vec3 CK;uniform float SW;uniform float DIM;uniform float AL;uniform float FL;uniform vec3 FC;uniform float PARTY;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}',
    // one cone of light from (ox, top) aimed at angle a; soft edges, fades with distance, broken up by haze
    'float beam(vec2 uv,float ox,float a,float w){vec2 o=vec2(ox,1.08);vec2 d=vec2(sin(a),-cos(a));vec2 q=uv-o;float along=dot(q,d);if(along<0.)return 0.;',
    '  float across=abs(q.x*d.y-q.y*d.x);float wid=.012+along*w;float b=smoothstep(wid,wid*.15,across);return b*exp(-along*.75)*(.55+.45*smoothstep(0.,.25,along));}',
    // a strand of string lights swagged across the top: wire sag between hooks every 1/m of the width, a bulb every 1/(m*k)
    'float sag(float x,float y0,float m,float dep){float f=fract(x*m)*2.-1.;return y0-dep*(1.-f*f);}',
    'vec3 strand(vec2 p,float asp,float y0,float m,float dep,float k,float seed,float tw){vec3 c=vec3(0.);float x=p.x/asp;',
    '  float wire=smoothstep(.0028,.0008,abs(p.y-sag(x,y0,m,dep)));c+=vec3(.02,.03,.02)*wire;',
    '  for(int j=-1;j<=1;j++){float i=floor(x*m*k)+float(j);float bx=(i+.5)/(m*k);vec2 b=vec2(bx*asp,sag(bx,y0,m,dep)-.012);float r=h(vec2(i,seed));',
    '    vec3 bc=r<.6?vec3(1.,.72,.36):r<.8?vec3(1.,.45,.12):r<.92?vec3(1.,.93,.8):vec3(.55,1.,.6);float on=.65+.35*sin(T*(1.2+r*2.5)*(1.+tw)+r*40.);',
    '    float d=length(p-b);c+=bc*on*(smoothstep(.007,.003,d)*1.4+exp(-d*d*1400.)*.55+exp(-d*d*90.)*.05);}',
    '  return c;}',
    // a pine silhouette: stacked sawtooth tiers, with a few warm lights tucked in
    'vec3 pine(vec2 p,float cx,float w,float ht,inout float m){float y=p.y;if(y>ht||y<0.)return vec3(0.);float k=y/ht;float tier=fract(k*5.);',
    '  float hw=w*(1.-k)*(.72+.28*(1.-tier));float inside=smoothstep(.004,-.004,abs(p.x-cx)-hw);m=max(m,inside);',
    '  vec2 g=floor(p*42.);float r=h(g+cx*7.);float d=length(fract(p*42.)-.5);float lit=step(.9,r)*inside*smoothstep(.32,.1,d)*(.6+.4*sin(T*2.+r*30.));return vec3(1.,.72,.36)*lit*1.6+vec3(.03,.09,.05)*inside*tier;}',
    'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);float t=T*SW;',
    // base: deep forest green, a warm glow of the room at the horizon
    '  vec3 col=mix(vec3(.006,.03,.018),vec3(.02,.085,.05),pow(uv.y,1.2));',
    '  col+=vec3(.20,.10,.03)*exp(-pow((uv.y-.30)*3.,2.))*.5;',
    // bokeh: big soft out-of-focus lights far behind
    '  for(int i=0;i<3;i++){vec2 g=p*vec2(5.+float(i)*3.)+vec2(float(i)*7.3,t*.02*float(i+1));vec2 c=floor(g);vec2 f=fract(g)-.5;float r=h(c+float(i));',
    '    vec2 o=vec2(h(c+3.1),h(c+5.7))-.5;float d=length(f-o*.6);float b=smoothstep(.22,.16,d)*step(.62,r)*(.5+.5*sin(t*.6+r*20.));',
    '    col+=mix(vec3(1.,.62,.25),CK,.35)*b*.05*(1.-DIM*.8)*smoothstep(.15,.6,uv.y);}',
    // haze and the spotlights from the truss, softer than a show floor
    '  float hz=fbm(p*2.2+vec2(t*.05,-t*.03));float sp=1.+PARTY*2.4;vec3 L=vec3(0.);',
    '  L+=CA*beam(p,asp*.14,.38*sin(t*.27*sp)+.16,.28);L+=CK*beam(p,asp*.38,.30*sin(t*.21*sp+1.7),.22);',
    '  L+=CK*beam(p,asp*.62,.30*sin(t*.25*sp+4.2),.22);L+=CB*beam(p,asp*.86,.38*sin(t*.29*sp+2.6)-.16,.28);',
    '  col+=L*(.14+.5*hz)*(1.-DIM*.85);',
    // string lights: three swagged strands across the top
    '  vec3 S=strand(p,asp,.995,3.,.06,7.,1.,PARTY)+strand(p,asp,.955,4.,.045,6.,2.,PARTY)*.85+strand(p,asp,.915,2.5,.05,9.,3.,PARTY)*.7;col+=S*(1.-DIM*.6);',
    // pines at both edges, dark against the glow
    '  float m=0.;vec3 tl=pine(p,asp*.035,.09,.62,m)+pine(p,asp*.11,.07,.44,m)+pine(p,asp*.965,.09,.62,m)+pine(p,asp*.89,.07,.44,m);',
    '  col=mix(col,vec3(.004,.022,.012),m*.92)+tl*(1.-DIM*.5);',
    // snow on the ground
    '  float drift=.07+.018*sin(p.x*7.)+.01*sin(p.x*19.+1.);float sn=smoothstep(drift+.006,drift-.006,uv.y);col=mix(col,vec3(.9,.94,.97)*(.78+.14*n(p*40.))-vec3(.25,.2,.1)*(drift-uv.y)*3.,sn*.92);col+=vec3(1.,.9,.75)*exp(-pow((uv.y-drift)*260.,2.))*.25;',
    // falling snow: three layers, near flakes bigger and faster
    '  for(int i=0;i<3;i++){float fi=float(i);float sc=7.+fi*7.;vec2 q=p*sc+vec2(sin(T*.25+fi)*.6+T*.05*fi,T*(.35+fi*.22));vec2 c=floor(q);vec2 f=fract(q)-.5;',
    '    float r=h(c+fi*13.);vec2 o=vec2(h(c+1.3),h(c+7.1))-.5;o.x+=sin(T*1.3+r*20.)*.15;float d=length(f-o*.7);float sz=.06-.012*fi;',
    '    col+=vec3(.95,.97,1.)*smoothstep(sz,sz*.3,d)*step(.45,r)*(.55-fi*.12);}',
    // alert: rotating red beacons sweep the room
    '  if(AL>0.){float a1=atan(uv.y-.98,uv.x-.08)-T*3.2;float a2=atan(uv.y-.98,uv.x-.92)+T*3.2;',
    '    float b1=pow(max(0.,cos(a1)),18.),b2=pow(max(0.,cos(a2)),18.);col=mix(col,col*.35,AL*.6);col+=vec3(1.,.08,.06)*(b1+b2)*.55*AL*(.6+.6*hz);',
    '    col+=vec3(.6,.02,.02)*AL*(.18+.12*sin(T*7.))*smoothstep(.0,.6,1.-abs(uv.x-.5)*1.2);}',
    // a camera flash / strobe that the screen can fire
    '  col+=FC*FL*(.55+.45*smoothstep(1.,.0,length(uv-vec2(.5,.55))));',
    // vignette and grain
    '  float v=smoothstep(1.25,.35,length((uv-vec2(.5,.48))*vec2(1.05,1.25)));col*=mix(.4,1.,v);',
    '  col+=(h(gl_FragCoord.xy+fract(T)*100.)-.5)*.018;',
    '  gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  var cvs, gl, prog, U = {}, t0 = performance.now(), raf = 0, scale = .5;
  // current and target values; everything eases so scene changes never pop
  var cur = {ca: [1, .48, .1], cb: [.75, .89, 1], ck: [1, .8, .45], sw: 1, dim: 0, al: 0, party: 0};
  var tgt = JSON.parse(JSON.stringify(cur));
  var flash = 0, flashC = [1, 1, 1];

  function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function initGL() {
    cvs = document.getElementById('stagebg'); if (!cvs) return false;
    try { gl = cvs.getContext('webgl', {antialias: false, depth: false, alpha: false, powerPreference: 'high-performance'}); } catch (e) { gl = null; }
    if (!gl) return false;
    try {
      prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { console.warn('stage shader', e); gl = null; return false; }
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['R', 'T', 'CA', 'CB', 'CK', 'SW', 'DIM', 'AL', 'FL', 'FC', 'PARTY'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    cvs.addEventListener('webglcontextlost', function (e) { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; document.body.classList.add('nogl'); });
    return true;
  }
  function size() {
    if (!cvs) return; var w = Math.max(2, Math.round(cvs.clientWidth * scale)), hgt = Math.max(2, Math.round(cvs.clientHeight * scale));
    if (cvs.width !== w || cvs.height !== hgt) { cvs.width = w; cvs.height = hgt; if (gl) gl.viewport(0, 0, w, hgt); }
  }
  var lastF = performance.now(), slow = 0, win = 0, wn = 0, bad = 0, lite = false, lastDraw = 0;
  function ease(a, b, k) { return a + (b - a) * k; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(.1, (now - lastF) / 1000);
    // a slow machine renders the backdrop at a lower resolution instead of dropping the whole show's frame rate
    if (dt > .028) { if (++slow > 40 && scale > .3) { scale = Math.max(.3, scale - .1); slow = 0; size(); } } else slow = Math.max(0, slow - 1);
    // Still under 20 frames a second for two 2-second windows in a row (even at the lowest resolution): the backdrop drops to
    // four redraws a second, so the board, the effects and the timers stay smooth. A hidden tab's long gaps do not count.
    if (now - lastF < 1000) { win += now - lastF; wn++; } if (win > 2000) { bad = wn / win * 1000 < 20 ? bad + 1 : 0; if (bad >= 2 && !lite) { lite = true; document.body.classList.add('lite'); } win = 0; wn = 0; }
    var k = 1 - Math.exp(-dt * 2.2);
    ['ca', 'cb', 'ck'].forEach(function (c) { for (var i = 0; i < 3; i++) cur[c][i] = ease(cur[c][i], tgt[c][i], k); });
    ['sw', 'dim', 'al', 'party'].forEach(function (c) { cur[c] = ease(cur[c], tgt[c], c === 'al' ? 1 - Math.exp(-dt * 6) : k); });
    flash *= Math.exp(-dt * 5.5); lastF = now;
    if (lite && now - lastDraw < 250) return; lastDraw = now;
    size();
    var T = CALM ? 4 : (now - t0) / 1000;
    gl.uniform2f(U.R, cvs.width, cvs.height); gl.uniform1f(U.T, T);
    gl.uniform3fv(U.CA, cur.ca); gl.uniform3fv(U.CB, cur.cb); gl.uniform3fv(U.CK, cur.ck);
    gl.uniform1f(U.SW, CALM ? 0 : cur.sw); gl.uniform1f(U.DIM, cur.dim); gl.uniform1f(U.AL, cur.al); gl.uniform1f(U.PARTY, CALM ? 0 : cur.party);
    gl.uniform1f(U.FL, flash); gl.uniform3fv(U.FC, flashC);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  var hex = function (s) { s = s.replace('#', ''); return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255]; };
  window.STAGE = {
    // look: {a, b, k: hex colors of the left, right and key lights; speed; dim 0..1; alert 0..1; party 0..1}
    look: function (o) {
      if (o.a) tgt.ca = hex(o.a); if (o.b) tgt.cb = hex(o.b); if (o.k) tgt.ck = hex(o.k);
      if (o.speed !== undefined) tgt.sw = o.speed; if (o.dim !== undefined) tgt.dim = o.dim; if (o.alert !== undefined) tgt.al = o.alert; if (o.party !== undefined) tgt.party = o.party;
    },
    flash: function (c, amt) { if (CALM) amt = Math.min(amt || 1, .25); flashC = hex(c || '#ffffff'); flash = Math.min(1.6, flash + (amt || 1)); },
    ok: false
  };
  function start() { if (initGL()) { STAGE.ok = true; size(); raf = requestAnimationFrame(frame); } else document.body.classList.add('nogl'); }

  // ---------------------------------------------------------------- particles
  var pc, px, parts = [], praf = 0, W = 0, H = 0, dpr = 1;
  function psize() { dpr = Math.min(2, window.devicePixelRatio || 1); W = pc.clientWidth; H = pc.clientHeight; pc.width = Math.round(W * dpr); pc.height = Math.round(H * dpr); }
  function pstart() { if (!praf && pc) { lastP = performance.now(); praf = requestAnimationFrame(ptick); } }
  var lastP = 0;
  function ptick(now) {
    var dt = Math.min(.05, (now - lastP) / 1000); lastP = now;
    if (pc.width !== Math.round(pc.clientWidth * dpr)) psize();
    px.setTransform(dpr, 0, 0, dpr, 0, 0); px.clearRect(0, 0, W, H);
    var keep = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; p.age += dt;
      if (p.delay > 0) { p.delay -= dt; keep.push(p); continue; }
      if (p.path) {   // coins arc to a target and report back when they land
        var k = Math.min(1, p.age / p.life), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        p.x = p.sx + (p.tx - p.sx) * e; p.y = p.sy + (p.ty - p.sy) * e - Math.sin(Math.PI * k) * p.arc; p.rot += dt * p.vr;
        if (k >= 1) { if (p.done) p.done(); continue; }
      } else {
        p.vy += (p.g || 0) * dt; p.vx *= Math.pow(p.drag || 1, dt * 60); p.vy *= Math.pow(p.drag || 1, dt * 60); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.flutter) p.vx += Math.sin(p.age * 6 + p.ph) * p.flutter * dt;
        if (p.age > p.life || p.y > H + 80) continue;
      }
      draw(p); keep.push(p);
    }
    parts = keep;
    praf = parts.length ? requestAnimationFrame(ptick) : 0;
    if (!praf) px.clearRect(0, 0, W, H);
  }
  function draw(p) {
    var a = p.life ? Math.max(0, Math.min(1, (p.life - p.age) / (p.fade || .35))) : 1;
    px.save(); px.globalAlpha = a; px.translate(p.x, p.y); px.rotate(p.rot);
    if (p.kind === 'conf') { var sx = Math.cos(p.age * p.spin + p.ph); px.scale(1, sx); px.fillStyle = Math.abs(sx) < .3 ? p.c2 : p.c; px.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
    else if (p.kind === 'spark') { px.globalCompositeOperation = 'lighter'; var sp = Math.min(6, Math.hypot(p.vx, p.vy) * .006 + 1); px.rotate(Math.atan2(p.vy, p.vx) - p.rot); px.fillStyle = p.c; px.shadowColor = p.c; px.shadowBlur = p.r * 3; px.fillRect(-p.r * sp, -p.r / 2, p.r * sp * 2, p.r); }
    else if (p.kind === 'strip') { px.fillStyle = p.c; px.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); px.fillStyle = 'rgba(255,255,255,.06)'; px.fillRect(-p.w / 2, -p.h / 2, p.w * .3, p.h); }
    else if (p.kind === 'coin') { var sc = Math.cos(p.rot * 2); px.scale(Math.max(.15, Math.abs(sc)), 1); var g = px.createLinearGradient(-p.r, -p.r, p.r, p.r); g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#ffc93c'); g.addColorStop(1, '#b8740f'); px.fillStyle = g; px.beginPath(); px.arc(0, 0, p.r, 0, 6.283); px.fill(); px.strokeStyle = 'rgba(120,70,0,.6)'; px.lineWidth = p.r * .14; px.stroke(); px.fillStyle = 'rgba(120,70,0,.55)'; px.font = '900 ' + Math.round(p.r * 1.2) + 'px Arial'; px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillText('$', 0, p.r * .08); }
    else if (p.kind === 'env') { px.fillStyle = '#f6f1e6'; px.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); px.strokeStyle = '#0b0b10'; px.lineWidth = Math.max(1, p.w * .06); px.beginPath(); px.moveTo(-p.w / 2, -p.h / 2); px.lineTo(0, p.h * .1); px.lineTo(p.w / 2, -p.h / 2); px.stroke(); }
    px.restore();
  }
  var PAL = ['#ffc93c', '#f96302', '#a9dcff', '#f6f1e6', '#4fae7a', '#ffe9a6'];
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  window.FX = {
    // confetti from the top edge, or a cannon blast from a point
    confetti: function (n, pal, from) {
      if (CALM) n = Math.min(n, 40); pal = pal || PAL; var s = Math.max(W, 800) / 1920;
      for (var i = 0; i < n; i++) {
        var c = pal[i % pal.length], p = {kind: 'conf', c: c, c2: shade(c), w: rnd(10, 18) * s, h: rnd(6, 10) * s, rot: rnd(0, 6.28), vr: rnd(-6, 6), spin: rnd(6, 14), ph: rnd(0, 6), age: 0, life: rnd(4, 7), fade: 1, g: 260 * s, drag: .985, flutter: 220 * s, delay: from ? 0 : rnd(0, .9)};
        if (from) { var a = rnd(-Math.PI * .85, -Math.PI * .15) + (from.dir || 0), v = rnd(700, 1500) * s; p.x = from.x; p.y = from.y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; }
        else { p.x = rnd(-20, W + 20); p.y = rnd(-120, -10); p.vx = rnd(-60, 60) * s; p.vy = rnd(80, 260) * s; }
        parts.push(p);
      }
      pstart();
    },
    // a burst of glowing sparks from a rectangle
    sparks: function (r, n, col, power) {
      if (CALM) return; var s = Math.max(W, 800) / 1920; power = power || 1;
      for (var i = 0; i < n; i++) { var a = rnd(0, 6.283), v = rnd(250, 900) * s * power; parts.push({kind: 'spark', c: Array.isArray(col) ? col[i % col.length] : col, r: rnd(2, 4.5) * s, x: r.left + rnd(0, r.width), y: r.top + rnd(0, r.height), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * s, g: 900 * s, drag: .93, rot: 0, vr: 0, age: 0, life: rnd(.5, 1.1), fade: .4}); }
      pstart();
    },
    // pyro: a fountain of gold sparks rising from a point for a while
    fountain: function (x, y, secs, col) {
      if (CALM) return; var s = Math.max(W, 800) / 1920, n = Math.round(secs * 90);
      for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + rnd(-.22, .22), v = rnd(900, 1500) * s; parts.push({kind: 'spark', c: col || (i % 3 ? '#ffd76a' : '#fff6d8'), r: rnd(2, 4) * s, x: x + rnd(-6, 6) * s, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1500 * s, drag: .985, rot: 0, vr: 0, age: 0, life: rnd(.8, 1.4), fade: .5, delay: i / 90}); }
      pstart();
    },
    // the redaction bar on a tile goes through the shredder: it splits into strips that tumble away
    shred: function (r, col) {
      var n = CALM ? 0 : Math.max(10, Math.round(r.width / 20)), w = r.width / n;
      for (var i = 0; i < n; i++) parts.push({kind: 'strip', c: col || '#14141b', w: w * .8, h: r.height * rnd(.55, 1), x: r.left + w * (i + .5), y: r.top + r.height / 2, vx: rnd(-60, 60), vy: rnd(60, 260), g: 3400, drag: .99, rot: 0, vr: rnd(-4, 4), age: 0, life: .75, fade: .35, delay: (i % 2) * .03 + Math.abs(i - n / 2) * .006});
      pstart();
    },
    // gold coins arc from one rectangle to another; onLand runs as each coin arrives
    coins: function (from, to, n, onLand) {
      var s = Math.max(W, 800) / 1920;
      if (CALM) { if (onLand) setTimeout(function () { onLand(n - 1, true); }, 300); return; }
      for (var i = 0; i < n; i++) (function (i) {
        parts.push({kind: 'coin', path: true, r: rnd(14, 22) * s, sx: from.left + rnd(.2, .8) * from.width, sy: from.top + from.height * .5, tx: to.left + rnd(.25, .75) * to.width, ty: to.top + to.height * .5, arc: rnd(120, 300) * s, rot: rnd(0, 6), vr: rnd(8, 14), age: 0, life: rnd(.75, .95), delay: i * .07, done: onLand ? function () { onLand(i, i === n - 1); } : null});
      })(i);
      pstart();
    },
    // envelopes flying (survey answers landing, title storm debris)
    envs: function (from, to, n) {
      if (CALM) return; var s = Math.max(W, 800) / 1920;
      for (var i = 0; i < n; i++) parts.push({kind: 'env', path: true, w: rnd(34, 46) * s, h: rnd(24, 30) * s, sx: from.left + rnd(0, from.width), sy: from.top + rnd(0, from.height), tx: to.left + rnd(.2, .8) * to.width, ty: to.top + rnd(.2, .6) * to.height, arc: rnd(80, 200) * s, rot: rnd(-1, 1), vr: rnd(-3, 3), age: 0, life: rnd(.7, .9), delay: i * .12});
      pstart();
    },
    clear: function () { parts = []; }
  };
  function shade(c) { var v = hex(c); return 'rgb(' + v.map(function (x) { return Math.round(x * 255 * .62); }).join(',') + ')'; }

  function boot() {
    pc = document.getElementById('fx'); px = pc.getContext('2d'); psize(); window.addEventListener('resize', psize); if (parts.length) pstart();   // effects asked for while the page was still loading
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
