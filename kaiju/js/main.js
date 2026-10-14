import * as THREE from 'three';
import { City, Buf, prism, buildingMaterial, hash } from './city.js';
import { FX } from './fx.js';
import { Monster, MONSTERS } from './monster.js';
import { streets } from './streets.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const CITIES = {
  newyork: { name: 'New York', area: 'Midtown Manhattan', start: [0, 600], sun: [-0.55, 0.32, -0.25], grid: 0.51, fill: [30, 160] },
  tokyo: { name: 'Tokyo', area: 'Shinjuku', start: [100, 600], sun: [0.6, 0.3, -0.3], grid: 0.2, fill: [12, 70] },
  moscow: { name: 'Moscow', area: 'Moscow City', start: [0, 600], sun: [-0.4, 0.28, 0.5], grid: -0.3, fill: [12, 60] },
};

export const MODES = {
  timed: { name: '3-minute rampage', blurb: 'Topple as much as you can. Landmarks are targets.', seconds: 180 },
  free: { name: 'Free play', blurb: 'No clock. Wreck at leisure.', seconds: 0 },
};

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

function sky(scene, sunDir) {
  const geo = new THREE.SphereGeometry(6000, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun;
      void main(){
        float h = max(vD.y, 0.0);
        vec3 zen = vec3(0.11, 0.16, 0.30), hor = vec3(0.86, 0.56, 0.38), low = vec3(0.52, 0.40, 0.36);
        vec3 c = mix(hor, zen, pow(h, 0.55));
        c = mix(low, c, smoothstep(-0.05, 0.02, vD.y));
        float s = max(dot(vD, uSun), 0.0);
        c += vec3(1.0, 0.62, 0.32) * pow(s, 12.0) * 0.6 + vec3(1.0, 0.85, 0.6) * pow(s, 900.0) * 3.0;
        // authored in display space; the composer expects linear
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = -1;
  scene.add(mesh);
  return mesh;
}

// Static background blocks beyond the playable data square, so the city reaches the horizon.
function filler(scene, half, cfg) {
  const buf = new Buf(), R = 2800, P = 70, ca = Math.cos(cfg.grid), sa = Math.sin(cfg.grid);
  let n = 0;
  for (let gx = -R; gx <= R; gx += P) for (let gz = -R; gz <= R; gz += P) {
    for (let k = 0; k < 2; k++) {
      const s1 = hash(n++ * 7 + 3), s2 = hash(n * 13 + 5), s3 = hash(n * 17 + 11);
      const w = 22 + s1 * 20, d = 18 + s2 * 22;
      const lx = gx + (k ? P * 0.5 : 0) + 6, lz = gz + 6;
      const cx = (lx + w / 2) * ca - (lz + d / 2) * sa, cz = (lx + w / 2) * sa + (lz + d / 2) * ca;
      const r = Math.max(Math.abs(cx), Math.abs(cz));
      if (r < half + 30 || Math.hypot(cx, cz) > R) continue;
      const fall = Math.max(0.15, 1 - (r - half) / 2200);
      const h = cfg.fill[0] + (cfg.fill[1] - cfg.fill[0]) * Math.pow(s3, 2.2) * fall;
      const pts = [[lx, lz], [lx + w, lz], [lx + w, lz + d], [lx, lz + d]].map(([x, z]) => [x * ca - z * sa, x * sa + z * ca]);
      const flat = pts.flat();
      const col = [[0.80, 0.74, 0.64], [0.66, 0.66, 0.66], [0.62, 0.44, 0.36], [0.52, 0.58, 0.66]][Math.floor(s2 * 4)];
      prism(buf, { rings: [flat], flat, tris: [0, 1, 2, 0, 2, 3], col }, 0, h, [0, s1]);
    }
  }
  const m = new THREE.Mesh(buf.geometry(), buildingMaterial());
  m.receiveShadow = true;
  scene.add(m);
}

class Audio {
  constructor() { this.ctx = null; }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
      this.noise = b;
    } catch (e) { this.ctx = null; }
  }
  rumble(strength, dist) {
    if (!this.ctx) return;
    const g = Math.min(1, strength * 600 / (dist + 300));
    if (g < 0.03) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.6 + Math.random() * 0.3;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180 + strength * 300;
    const gain = this.ctx.createGain(); const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(g, t + 0.03); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2 + strength * 1.5);
    src.connect(f).connect(gain).connect(this.ctx.destination); src.start(); src.stop(t + 3);
  }
}

export class Game {
  constructor(canvas, cityData, cityId, monsterType, mode = 'timed') {
    this.canvas = canvas;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.info.autoReset = false;
    const S = this.scene = new THREE.Scene();
    const cfg = CITIES[cityId];
    const sunDir = new THREE.Vector3(...cfg.sun).normalize();
    S.fog = new THREE.FogExp2(0x8a6a62, 0.00055);
    sky(S, sunDir);
    this.camera = new THREE.PerspectiveCamera(55, 1, 2, 9000);
    S.add(new THREE.HemisphereLight(0x9fb2d0, 0x6a5444, 1.6));
    const sun = this.sun = new THREE.DirectionalLight(0xffc69a, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -380; sc.right = sc.top = 380; sc.near = 10; sc.far = 2400;
    sun.shadow.bias = -0.0012; sun.shadow.normalBias = 3;
    this.sunDir = sunDir;
    S.add(sun); S.add(sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);
    // sidewalk apron under the city
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(cityData.half * 2, cityData.half * 2), new THREE.MeshStandardMaterial({ color: 0x5c5a57, roughness: 0.9 }));
    apron.rotation.x = -Math.PI / 2; apron.position.y = 0.05; apron.receiveShadow = true; S.add(apron);
    streets(S, cityData);

    filler(S, cityData.half, cfg);
    this.fx = new FX(S);
    this.city = new City(S, cityData, this.fx);
    this.fx.city = this.city;
    this.monster = new Monster(S, monsterType, this.city, this.fx);
    this.monster.pos.set(cfg.start[0], 0, Math.min(cfg.start[1], cityData.half - 60));
    this.monster.heading = Math.PI;
    this.audio = new Audio();
    this.shake = 0;
    const impact = (p, s) => {
      const d = p.distanceTo(this.camera.position);
      this.shake = Math.min(3, this.shake + s * 2.5 * 400 / (d + 200));
      this.audio.rumble(s, d);
    };
    this.city.onImpact = impact; this.monster.onImpact = impact;
    this.monster.onStep = (p) => { const d = p.distanceTo(this.camera.position); this.shake = Math.min(3, this.shake + 0.25 * 300 / (d + 200)); this.audio.rumble(0.12, d); };

    // glow on lit windows, fire and the beam
    this.composer = new EffectComposer(R);
    this.composer.addPass(new RenderPass(S, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.45, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.cam = { yaw: 0, pitch: 0.32, dist: 340 };
    this.keys = new Set();
    this.bindInput();
    this.resize(); addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.fpsT = 0; this.fpsN = 0; this.fps = 0;
    this.hud = { name: `${cfg.name} - ${cfg.area}`, monster: MONSTERS[monsterType] };
    $('hud-city').textContent = this.hud.name;
    $('hud-monster').textContent = MONSTERS[monsterType].name;
    const at = MONSTERS[monsterType].attacks;
    $('hud-keys').innerHTML = `<b>WASD</b> move &nbsp; <b>Shift</b> run &nbsp; <b>Mouse</b> look &nbsp; <b>Click</b> ${at.swipe} &nbsp; <b>Space</b> ${at.stomp} &nbsp; <b>E</b> ${at.special} &nbsp; <b>F</b> (hold) ${at.beam}`;
    // game layer
    this.cityId = cityId; this.monsterType = monsterType; this.mode = mode;
    this.timeLeft = MODES[mode].seconds;
    this.targets = this.city.landmarks.slice(0, 10);
    this.fallen = [];
    $('hud-timer-row').classList.toggle('hidden', !this.timeLeft);
    this.updateHud();
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const sc = h * this.renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.fx.dust.mat.uniforms.uScale.value = sc; this.fx.fire.mat.uniforms.uScale.value = sc;
  }

  bindInput() {
    const c = this.canvas;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.audio.init();
      if (k === ' ') { this.monster.start('stomp'); e.preventDefault(); }
      if (k === 'e') this.monster.start('special');
      if (k === 'f') this.monster.start('beam');
    });
    addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (k === 'f') this.monster.release('beam');
    });
    addEventListener('blur', () => { this.keys.clear(); this.monster.release('beam'); });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (document.pointerLockElement !== c && e.button === 0) { c.requestPointerLock?.(); return; }
      if (e.button === 0) this.monster.start('swipe');
      if (e.button === 2) this.dragging = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 2) this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === c || this.dragging) {
        this.cam.yaw -= e.movementX * 0.0035;
        this.cam.pitch = Math.max(-0.1, Math.min(1.35, this.cam.pitch + e.movementY * 0.0028));
      }
    });
    c.addEventListener('wheel', (e) => { this.cam.dist = Math.max(110, Math.min(700, this.cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });
  }

  updateCamera(dt) {
    const m = this.monster, cam = this.camera, c = this.cam;
    const H = m.def.height;
    const target = new THREE.Vector3(m.pos.x, m.pos.y + H * 0.8, m.pos.z);
    const off = new THREE.Vector3(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)).multiplyScalar(c.dist);
    const p = target.clone().add(off);
    p.y = Math.max(p.y, this.city.structureAt(p.x, p.z) + 15, 8);
    if (this.shake > 0.01) {
      p.x += (Math.random() - 0.5) * this.shake * 3; p.y += (Math.random() - 0.5) * this.shake * 3; p.z += (Math.random() - 0.5) * this.shake * 3;
      this.shake *= Math.exp(-4 * dt);
    }
    if (this.fixedCam) { p.copy(this.fixedCam.pos); target.copy(this.fixedCam.look); }
    cam.position.copy(p);
    cam.lookAt(target);
    // beam aims where the camera looks, slightly lowered
    const aim = new THREE.Vector3(); cam.getWorldDirection(aim);
    aim.y -= 0.12; m.aim.copy(aim.normalize());
    // shadows follow the monster
    this.sun.target.position.copy(m.pos);
    this.sun.position.copy(m.pos).addScaledVector(this.sunDir, 1200);
  }

  step(dt) {
    const k = this.keys;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const str = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const yaw = this.cam.yaw;
    // camera looks along -offset; forward on ground = (-sin yaw, -cos yaw)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const move = { x: fx * fwd - fz * str, z: fz * fwd + fx * str };
    const camDir = new THREE.Vector3(fx, 0, fz);
    this.monster.update(dt, move, k.has('shift'), camDir);
    this.city.update(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const real = this.clock.getDelta(), dt = Math.min(real, 1 / 20);
    this.step(dt);
    this.renderer.info.reset();
    this.composer.render();
    this.fpsN++; this.fpsT += real;
    if (this.timeLeft) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (!this.timeLeft) this.finish();
    }
    if (this.fpsT > 0.5) {
      this.fps = this.fpsN / this.fpsT; this.fpsN = 0; this.fpsT = 0;
      this.updateHud();
    }
  }

  updateHud() {
    for (const L of this.city.newlyFallen()) {
      this.fallen.push(L);
      this.toast(`${L.name} destroyed`);
    }
    const left = this.targets.filter((L) => !L.down);
    $('hud-destroy').textContent = (this.city.destruction() * 100).toFixed(1) + '%';
    $('hud-toppled').textContent = this.city.toppled;
    $('hud-landmarks').textContent = `${this.targets.length - left.length}/${this.targets.length}`;
    $('hud-target').textContent = left.length ? left[0].name : 'all down';
    const t = Math.ceil(this.timeLeft);
    $('hud-timer').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('hud-fps').textContent = params.has('debug') ? `${this.fps.toFixed(0)} fps | ${this.renderer.info.render.calls} calls | ${this.fx.n} chunks` : '';
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  finish() {
    this.updateHud();
    this.running = false;
    document.exitPointerLock?.();
    this.monster.release('beam');
    const pct = this.city.destruction() * 100;
    const key = `kaiju-best-${this.cityId}-${this.monsterType}`;
    let best = 0;
    try { best = parseFloat(localStorage.getItem(key)) || 0; if (pct > best) localStorage.setItem(key, String(pct)); } catch (e) { /* storage blocked */ }
    $('end-stats').innerHTML = `<div><b>${pct.toFixed(1)}%</b> of the city destroyed</div>
      <div><b>${this.city.toppled}</b> sections toppled</div>
      <div><b>${this.fallen.length}</b> landmarks destroyed</div>
      <div class="best">${pct > best ? 'New best for this city and monster' : `Best: ${best.toFixed(1)}%`}</div>`;
    $('end-list').textContent = this.fallen.map((L) => L.name).join(' | ');
    $('end').classList.remove('hidden');
    // keep the scene visible behind the panel
    this.composer.render();
  }
}

// ---- menu ----
let pick = { city: params.get('city') || 'newyork', monster: params.get('monster') || 'rhagon', mode: params.get('mode') || 'timed' };

function cards(el, items, key) {
  el.innerHTML = '';
  for (const [id, it] of Object.entries(items)) {
    const b = document.createElement('button');
    b.className = 'card' + (pick[key] === id ? ' on' : '');
    b.innerHTML = `<span class="t">${it.name}</span><span class="s">${it.blurb || it.area}</span>`;
    b.onclick = () => { pick[key] = id; cards(el, items, key); };
    el.appendChild(b);
  }
}

async function start() {
  $('menu').classList.add('hidden');
  $('loading').classList.remove('hidden');
  const data = await (await fetch(`data/${pick.city}.json`)).json();
  $('loading').classList.add('hidden');
  $('hud').classList.remove('hidden');
  window.GAME = new Game($('c'), data, pick.city, pick.monster, pick.mode);
  $('attrib').textContent = 'Buildings: ' + data.source;
}

cards($('pick-monster'), MONSTERS, 'monster');
cards($('pick-city'), CITIES, 'city');
cards($('pick-mode'), MODES, 'mode');
const go = (extra) => { location.search = new URLSearchParams({ city: pick.city, monster: pick.monster, mode: pick.mode, ...extra }).toString(); };
$('again').onclick = () => go({ auto: 1 });
$('to-menu').onclick = () => go({});
$('go').onclick = start;
if (params.has('auto')) start();
