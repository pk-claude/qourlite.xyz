// Debris chunks, settled rubble and dust/fire particles.
import * as THREE from 'three';

const G = 12;
const MAX_ACTIVE = 3000;
const MAX_RUBBLE = 30000;
const MAX_DUST = 8000;
const MAX_FIRES = 24;
const MAX_FIRE = 1500;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

function particleMaterial(additive) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 800 }, uLight: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; attribute vec3 aCol;
      varying float vA; varying vec3 vC;
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * uScale / -mv.z, 512.0);
        vA = aAlpha; vC = aCol;
      }`,
    fragmentShader: `
      varying float vA; varying vec3 vC; uniform vec3 uLight;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d) * 4.0;
        if (r > 1.0) discard;
        gl_FragColor = vec4(pow(vC * uLight, vec3(2.2)), vA * (1.0 - r) * (1.0 - r));
      }`,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

class Particles {
  constructor(scene, max, additive) {
    this.max = max; this.next = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max).fill(1e9);
    this.col = new Float32Array(max * 3);
    this.rise = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = particleMaterial(additive);
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, size, grow, life, alpha, r, g, b, rise = 0) {
    const i = this.next; this.next = (i + 1) % this.max;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.col.set([r, g, b], i * 3);
    this.size[i] = size; this.grow[i] = grow; this.life[i] = life; this.age[i] = 0; this.a0[i] = alpha; this.rise[i] = rise;
  }
  update(dt) {
    const k = Math.exp(-1.2 * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= this.life[i]) { this.alpha[i] = 0; continue; }
      const a = (this.age[i] += dt) / this.life[i];
      const j = i * 3;
      this.vel[j] *= k; this.vel[j + 1] = this.vel[j + 1] * k + this.rise[i] * dt; this.vel[j + 2] *= k;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] = Math.max(0, this.pos[j + 1] + this.vel[j + 1] * dt); this.pos[j + 2] += this.vel[j + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      this.alpha[i] = this.a0[i] * Math.min(1, a * 8) * (1 - a);
    }
    const at = this.geo.attributes;
    at.position.needsUpdate = at.aSize.needsUpdate = at.aAlpha.needsUpdate = at.aCol.needsUpdate = true;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.city = null;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
    this.active = new THREE.InstancedMesh(box, mat, MAX_ACTIVE);
    this.rubble = new THREE.InstancedMesh(box, mat, MAX_RUBBLE);
    for (const m of [this.active, this.rubble]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      m.count = 0;
      m.setColorAt(0, _c.setRGB(1, 1, 1));
      scene.add(m);
    }
    this.rubble.count = MAX_RUBBLE;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < MAX_RUBBLE; i++) this.rubble.setMatrixAt(i, _m);
    this.rubbleNext = 0;
    // dynamic chunk state
    this.n = 0;
    this.P = new Float32Array(MAX_ACTIVE * 3);
    this.V = new Float32Array(MAX_ACTIVE * 3);
    this.R = new Float32Array(MAX_ACTIVE * 3);
    this.W = new Float32Array(MAX_ACTIVE * 3);
    this.S = new Float32Array(MAX_ACTIVE * 3);
    this.C = new Float32Array(MAX_ACTIVE * 3);
    this.rest = new Float32Array(MAX_ACTIVE);
    this.dust = new Particles(scene, MAX_DUST, false);
    this.fire = new Particles(scene, MAX_FIRE, true);
    this.budget = 0;
    this.dustColor = [0.62, 0.58, 0.52];
    this.fires = [];
  }

  // Spawn one chunk. Oldest active chunk is settled into rubble when the pool is full.
  chunk(x, y, z, vx, vy, vz, sx, sy, sz, r, g, b) {
    if (this.n >= MAX_ACTIVE) this.settle(0);
    const i = this.n++, j = i * 3;
    this.P.set([x, y, z], j); this.V.set([vx, vy, vz], j);
    this.R.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], j);
    this.W.set([(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4], j);
    this.S.set([sx, sy, sz], j); this.C.set([r, g, b], j);
    this.rest[i] = 0;
    this.active.setColorAt(i, _c.setRGB(r, g, b));
    this.active.instanceColor.needsUpdate = true;
  }

  settle(i) {
    const j = i * 3;
    const k = this.rubbleNext; this.rubbleNext = (k + 1) % MAX_RUBBLE;
    _e.set(this.R[j], this.R[j + 1], this.R[j + 2]);
    _m.compose(_p.set(this.P[j], this.P[j + 1], this.P[j + 2]), _q.setFromEuler(_e), _s.set(this.S[j], this.S[j + 1], this.S[j + 2]));
    this.rubble.setMatrixAt(k, _m);
    this.rubble.setColorAt(k, _c.setRGB(this.C[j], this.C[j + 1], this.C[j + 2]));
    this.rubble.instanceMatrix.needsUpdate = true;
    this.rubble.instanceColor.needsUpdate = true;
    if (this.city) this.city.addRubble(this.P[j], this.P[j + 2], this.S[j] * this.S[j + 1] * this.S[j + 2]);
    // swap-remove
    const last = --this.n, l = last * 3;
    if (i !== last) {
      for (const A of [this.P, this.V, this.R, this.W, this.S, this.C]) { A[j] = A[l]; A[j + 1] = A[l + 1]; A[j + 2] = A[l + 2]; }
      this.rest[i] = this.rest[last];
      this.active.setColorAt(i, _c.setRGB(this.C[j], this.C[j + 1], this.C[j + 2]));
    }
  }

  // Break a solid volume into chunks + dust. sample() returns a world point inside it.
  // vol in m^3, vel = base velocity, push = outward velocity from the impact.
  shatter(sample, vol, color, base, push, power = 1) {
    if (vol <= 0) return;
    const want = Math.min(80, Math.max(3, vol / 600));
    const count = Math.max(2, Math.min(want, 220 - this.budget));
    this.budget += count;
    const size = Math.min(10, Math.max(1.4, Math.cbrt(vol / count) * 0.55));
    for (let k = 0; k < count; k++) {
      const p = sample(_p);
      const v = 0.85 + Math.random() * 0.3;
      const kind = Math.random();
      let sx = size * (0.5 + Math.random()), sy = size * (0.4 + Math.random() * 0.8), sz = size * (0.5 + Math.random());
      let c = color, dark = Math.random() < 0.25 ? 0.45 : 1;
      if (kind < 0.25) { sy *= 0.25; sx *= 1.5; sz *= 1.5; }                  // floor slab
      else if (kind < 0.4) { sx *= 0.25; sz *= 0.25; sy *= 2.2; dark = 0.5; }  // column / beam
      else if (kind < 0.5) { sx *= 0.35; sy *= 0.35; sz *= 0.35; c = [0.55, 0.68, 0.78]; dark = 1; } // glass
      this.chunk(p.x, p.y, p.z,
        base.x + push.x * (0.3 + Math.random()) * power + (Math.random() - 0.5) * 6,
        base.y + push.y * Math.random() * power + Math.random() * 5,
        base.z + push.z * (0.3 + Math.random()) * power + (Math.random() - 0.5) * 6,
        sx, sy, sz, c[0] * v * dark, c[1] * v * dark, c[2] * v * dark);
    }
    const puffs = Math.min(70, 4 + vol / 1200);
    const dc = this.dustColor;
    const big = Math.cbrt(vol);
    for (let k = 0; k < puffs; k++) {
      const p = sample(_p);
      const s = 12 + big * (0.5 + Math.random() * 0.6);
      const t = 0.85 + Math.random() * 0.25;
      this.dust.emit(p.x, p.y, p.z,
        base.x * 0.3 + push.x * 0.4 + (Math.random() - 0.5) * 16, base.y * 0.2 + (Math.random() - 0.3) * 6, base.z * 0.3 + push.z * 0.4 + (Math.random() - 0.5) * 16,
        s, s * 0.7, 10 + Math.random() * 12, 0.6, dc[0] * t, dc[1] * t, dc[2] * t, -1.2);
    }
  }

  // Ground-hugging dust ring (stomps, collapses hitting the street).
  ring(x, y, z, radius, n = 40) {
    const dc = this.dustColor;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = radius * (0.8 + Math.random() * 0.8);
      this.dust.emit(x + Math.cos(a) * radius * 0.3, y + 2, z + Math.sin(a) * radius * 0.3,
        Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp, 14 + radius * 0.3 + Math.random() * 10, 10 + radius * 0.25, 7 + Math.random() * 6, 0.38, dc[0], dc[1], dc[2], -0.4);
    }
  }

  flame(x, y, z, scale = 1) {
    for (let k = 0; k < 3; k++) {
      const hot = Math.random();
      this.fire.emit(x + (Math.random() - 0.5) * 8 * scale, y + Math.random() * 4, z + (Math.random() - 0.5) * 8 * scale,
        (Math.random() - 0.5) * 10, 8 + Math.random() * 14, (Math.random() - 0.5) * 10,
        (8 + Math.random() * 10) * scale, 6, 0.6 + Math.random() * 0.8, 0.9, 1.0, 0.45 + hot * 0.4, 0.12 + hot * 0.2, 6);
    }
    if (Math.random() < 0.5) this.dust.emit(x, y + 6, z, (Math.random() - 0.5) * 4, 10, (Math.random() - 0.5) * 4, 14 * scale, 14, 5, 0.5, 0.12, 0.11, 0.1, 3);
  }

  // A burning spot: flames plus a smoke column for `life` seconds. Nearby fires merge.
  ignite(x, y, z, scale = 1, life = 30) {
    for (const f of this.fires) {
      if ((f.x - x) ** 2 + (f.z - z) ** 2 < 400 && Math.abs(f.y - y) < 30) { f.life = Math.max(f.life, life); f.scale = Math.min(2.5, f.scale + 0.1); return; }
    }
    if (this.fires.length >= MAX_FIRES) this.fires.shift();
    this.fires.push({ x, y, z, scale, life, acc: 0 });
  }

  updateFires(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.life -= dt;
      if (f.life <= 0) { this.fires.splice(i, 1); continue; }
      // fire drops with the structure it sits on
      if (this.city) f.y = Math.min(f.y, this.city.heightAt(f.x, f.z) + 1);
      f.acc += dt;
      const fade = Math.min(1, f.life / 8);
      while (f.acc > 0.12) {
        f.acc -= 0.12;
        if (Math.random() < fade) this.flame(f.x, f.y, f.z, f.scale * 0.8);
        const g = 0.3 + Math.random() * 0.12, sm = (14 + Math.random() * 10) * f.scale;
        this.dust.emit(f.x + (Math.random() - 0.5) * 8, f.y + 8, f.z + (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 3 + 3, 9 + Math.random() * 6, (Math.random() - 0.5) * 3 + 1.5,
          sm, sm * 1.1, 12 + Math.random() * 6, 0.32 * fade, g, g * 0.96, g * 0.92, 1.5);
      }
    }
  }

  update(dt) {
    this.budget = Math.max(0, this.budget - 600 * dt);
    this.updateFires(dt);
    const city = this.city;
    for (let i = this.n - 1; i >= 0; i--) {
      const j = i * 3;
      this.V[j + 1] -= G * dt;
      let x = this.P[j] + this.V[j] * dt, y = this.P[j + 1] + this.V[j + 1] * dt, z = this.P[j + 2] + this.V[j + 2] * dt;
      const s4 = this.S[j + 1] * 0.4;
      const fl = (city ? city.heightAt(x, z) : 0) + s4;
      if (y < fl) {
        const flOld = (city ? city.heightAt(this.P[j], this.P[j + 2]) : 0) + s4;
        if (fl - this.P[j + 1] > 3 && this.P[j + 1] >= flOld - 0.5) {
          // hit a facade from the side: bounce back, keep falling
          x = this.P[j]; z = this.P[j + 2]; this.V[j] *= -0.3; this.V[j + 2] *= -0.3; y = Math.max(y, flOld);
        } else {
          y = fl; this.V[j + 1] = Math.abs(this.V[j + 1]) * 0.2; this.V[j] *= 0.55; this.V[j + 2] *= 0.55;
          this.W[j] *= 0.5; this.W[j + 1] *= 0.5; this.W[j + 2] *= 0.5;
          if (this.V[j] ** 2 + this.V[j + 1] ** 2 + this.V[j + 2] ** 2 < 4) this.rest[i] += dt;
        }
      }
      this.P[j] = x; this.P[j + 1] = y; this.P[j + 2] = z;
      this.R[j] += this.W[j] * dt; this.R[j + 1] += this.W[j + 1] * dt; this.R[j + 2] += this.W[j + 2] * dt;
      if (this.rest[i] > 0.6 || y < -50) { this.settle(i); continue; }
    }
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      _e.set(this.R[j], this.R[j + 1], this.R[j + 2]);
      _m.compose(_p.set(this.P[j], this.P[j + 1], this.P[j + 2]), _q.setFromEuler(_e), _s.set(this.S[j], this.S[j + 1], this.S[j + 2]));
      this.active.setMatrixAt(i, _m);
    }
    this.active.count = this.n;
    this.active.instanceMatrix.needsUpdate = true;
    if (this.n) this.active.instanceColor.needsUpdate = true;
    this.dust.update(dt);
    this.fire.update(dt);
  }
}
