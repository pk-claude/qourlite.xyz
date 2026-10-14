// City: building tiles from baked Overture/OSM data, a height grid for collision,
// local damage, structural support (connected components + weak-neck check),
// and falling rigid bodies that crush what they land on.
import * as THREE from 'three';

const CELL = 2.5;        // collision grid resolution (m)
const SLOTS = 10;        // max tiles overlapping one grid cell
const MESH_CELL = 100;   // render batching (m)
const G = 12;

export function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

const PALETTE = [
  [0.86, 0.80, 0.68], [0.74, 0.72, 0.68], [0.70, 0.46, 0.36], [0.56, 0.62, 0.70],
  [0.90, 0.88, 0.84], [0.62, 0.55, 0.47], [0.46, 0.53, 0.62], [0.80, 0.70, 0.56],
];

export function buildingMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aInfo; attribute vec3 aOff;
        varying vec2 vInfo; varying vec3 vOP; varying vec3 vON;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vInfo = aInfo; vOP = position + aOff; vON = normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vInfo; varying vec3 vOP; varying vec3 vON;
        float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vInfo.x < 1.5 && abs(vON.y) < 0.5) {
          vec2 t = normalize(vec2(-vON.z, vON.x));
          float u = dot(vOP.xz, t);
          float sd = floor(vInfo.y * 997.0 + 0.5);
          float sp = 2.4 + fract(sd * 0.0731) * 1.8;
          vec2 c = vec2(u / sp, vOP.y / 3.6);
          vec2 f = fract(c);
          float w = step(0.18, f.x) * step(f.x, 0.82) * step(0.3, f.y) * step(f.y, 0.85) * step(4.0, vOP.y);
          w = mix(w, 0.3, smoothstep(0.2, 0.55, max(fwidth(c.x), fwidth(c.y))));
          float r = h21(floor(c) + sd * 0.137);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.07, 0.10), w * 0.7);
          diffuseColor.rgb *= 0.92 + 0.08 * step(0.5, fract(vOP.y / 3.6));
          float lit = w * step(0.66, r);
          totalEmissiveRadiance += lit * mix(vec3(1.0, 0.70, 0.36), vec3(0.75, 0.86, 1.0), step(0.86, r)) * (0.5 + 0.7 * fract(r * 13.0));
        }`);
  };
  return m;
}

// Non-indexed geometry accumulator.
export class Buf {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.o = []; }
  tri(a, b, c, nx, ny, nz, col, info, off) {
    // order the triangle so its face normal agrees with (nx,ny,nz)
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const d = (uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz;
    if (d < 0) { const t = b; b = c; c = t; }
    for (const v of [a, b, c]) {
      this.p.push(v[0] - off[0], v[1] - off[1], v[2] - off[2]);
      this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); this.i.push(info[0], info[1]); this.o.push(off[0], off[1], off[2]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.i, 2));
    g.setAttribute('aOff', new THREE.Float32BufferAttribute(this.o, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const ZERO = [0, 0, 0];

// Extruded footprint between y0 and y1.
const SCORCH = [0.045, 0.04, 0.036];

// Jagged shards on a broken floor plate (dir +1 = up from a stump, -1 = down from a hanging part).
function jag(buf, t, y, dir, off, seed) {
  const n = Math.min(28, 6 + Math.floor(t.area / 40));
  for (let k = 0; k < n; k++) {
    const hx = hash(seed + k * 7 + 1), hz = hash(seed + k * 7 + 2), hh = hash(seed + k * 7 + 3);
    const x = t.minx + hx * (t.maxx - t.minx), z = t.minz + hz * (t.maxz - t.minz);
    if (!pointInRing(x, z, t.rings[0])) continue;
    const s = 0.8 + hh * 1.8, s2 = s * 0.35, top = y + (1.2 + hh * 4.5) * dir;
    const c = hh < 0.3 ? [t.col[0] * 0.7, t.col[1] * 0.7, t.col[2] * 0.7] : SCORCH;
    const lo = [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]];
    const hi = [[x - s2, z - s2 * 0.5], [x + s2, z - s2], [x + s2 * 0.6, z + s2], [x - s2, z + s2]];
    for (let e = 0; e < 4; e++) {
      const f = (e + 1) % 4, mx = (lo[e][0] + lo[f][0]) / 2 - x, mz = (lo[e][1] + lo[f][1]) / 2 - z, L = Math.hypot(mx, mz) || 1;
      buf.tri([lo[e][0], y, lo[e][1]], [lo[f][0], y, lo[f][1]], [hi[f][0], top, hi[f][1]], mx / L, 0.3 * dir, mz / L, c, [2, 0], off);
      buf.tri([lo[e][0], y, lo[e][1]], [hi[f][0], top, hi[f][1]], [hi[e][0], top, hi[e][1]], mx / L, 0.3 * dir, mz / L, c, [2, 0], off);
    }
    buf.tri([hi[0][0], top, hi[0][1]], [hi[1][0], top, hi[1][1]], [hi[2][0], top, hi[2][1]], 0, dir, 0, c, [2, 0], off);
    buf.tri([hi[0][0], top, hi[0][1]], [hi[2][0], top, hi[2][1]], [hi[3][0], top, hi[3][1]], 0, dir, 0, c, [2, 0], off);
  }
}

// broken: bit 1 = top is a fracture, bit 2 = bottom is a fracture
export function prism(buf, t, y0, y1, info, off = ZERO, bottom = false, colorScale = 1, broken = 0) {
  const col = [t.col[0] * colorScale, t.col[1] * colorScale, t.col[2] * colorScale];
  for (const r of t.rings) {
    const n = r.length / 2;
    for (let k = 0; k < n; k++) {
      const ax = r[k * 2], az = r[k * 2 + 1], bx = r[((k + 1) % n) * 2], bz = r[((k + 1) % n) * 2 + 1];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
      const nx = dz / L, nz = -dx / L;
      buf.tri([ax, y0, az], [bx, y0, bz], [bx, y1, bz], nx, 0, nz, col, info, off);
      buf.tri([ax, y0, az], [bx, y1, bz], [ax, y1, az], nx, 0, nz, col, info, off);
    }
  }
  const roof = [col[0] * 0.62, col[1] * 0.62, col[2] * 0.64];
  const topCol = broken & 1 ? SCORCH : roof, botCol = broken & 2 ? SCORCH : roof;
  const topInfo = broken & 1 ? [2, 0] : info, botInfo = broken & 2 ? [2, 0] : info;
  const v = t.flat;
  for (let k = 0; k < t.tris.length; k += 3) {
    const a = t.tris[k] * 2, b = t.tris[k + 1] * 2, c = t.tris[k + 2] * 2;
    buf.tri([v[a], y1, v[a + 1]], [v[b], y1, v[b + 1]], [v[c], y1, v[c + 1]], 0, 1, 0, topCol, topInfo, off);
    if (bottom) buf.tri([v[a], y0, v[a + 1]], [v[b], y0, v[b + 1]], [v[c], y0, v[c + 1]], 0, -1, 0, botCol, botInfo, off);
  }
  if (broken & 1) jag(buf, t, y1, 1, off, t.id * 977 + Math.round(y1));
  if (broken & 2 && bottom) jag(buf, t, y0, -1, off, t.id * 977 + Math.round(y0) + 5);
}

function pointInRing(x, z, r) {
  let inside = false;
  for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
    const xi = r[i * 2], zi = r[i * 2 + 1], xj = r[j * 2], zj = r[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

export class City {
  constructor(scene, data, fx) {
    this.scene = scene; this.fx = fx; this.data = data;
    this.half = data.half;
    this.N = Math.ceil((2 * this.half) / CELL);
    this.hgt = new Float32Array(this.N * this.N);
    this.rub = new Float32Array(this.N * this.N);
    this.own = new Int16Array(this.N * this.N * SLOTS).fill(-1);
    this.material = buildingMaterial();
    this.bodies = [];
    this.groups = new Map();
    this.totalVolume = 0;
    this.destroyedVolume = 0;
    this.toppled = 0;
    this.onImpact = null; // (pos, strength) for camera shake / audio
    this.MC = Math.ceil((2 * this.half) / MESH_CELL);
    this.mcells = Array.from({ length: this.MC * this.MC }, () => ({ tiles: [], mesh: null, dirty: true }));

    this.tiles = data.tiles.map((d, id) => {
      const rings = [d.p, ...(d.o || [])];
      const contour = [], holes = [];
      for (let k = 0; k < d.p.length; k += 2) contour.push(new THREE.Vector2(d.p[k], d.p[k + 1]));
      for (const h of d.o || []) { const hh = []; for (let k = 0; k < h.length; k += 2) hh.push(new THREE.Vector2(h[k], h[k + 1])); holes.push(hh); }
      const tris = THREE.ShapeUtils.triangulateShape(contour, holes).flat();
      const flat = rings.flat();
      let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
      for (let k = 0; k < d.p.length; k += 2) { minx = Math.min(minx, d.p[k]); maxx = Math.max(maxx, d.p[k]); minz = Math.min(minz, d.p[k + 1]); maxz = Math.max(maxz, d.p[k + 1]); }
      let area = 0;
      for (let k = 0; k < tris.length; k += 3) {
        const a = tris[k] * 2, b = tris[k + 1] * 2, c = tris[k + 2] * 2;
        area += Math.abs((flat[b] - flat[a]) * (flat[c + 1] - flat[a + 1]) - (flat[c] - flat[a]) * (flat[b + 1] - flat[a + 1])) / 2;
      }
      const g = d.g !== undefined ? d.g : -(id + 1);
      const s = hash(g * 7919 + 13);
      const base = PALETTE[Math.floor(s * PALETTE.length)];
      const tall = d.h > 90;
      const glass = tall && hash(g * 31 + 7) < 0.55;
      const col = glass ? [0.5, 0.58, 0.66] : base;
      const t = {
        id, rings, flat, tris, minx, maxx, minz, maxz, area, g, name: d.n,
        cx: (minx + maxx) / 2, cz: (minz + maxz) / 2,
        segs: [[d.y0 || 0, d.h]], top: d.h, rubble: 0,
        col, seed: hash(g * 104729 + 1), cells: null, nbr: [],
      };
      this.totalVolume += area * (d.h - (d.y0 || 0));
      if (!this.groups.has(g)) this.groups.set(g, []);
      this.groups.get(g).push(t);
      const mi = this.mcellIndex(t.cx, t.cz);
      t.mcell = mi;
      this.mcells[mi].tiles.push(t);
      return t;
    });

    for (const t of this.tiles) this.rasterize(t);
    // lateral/vertical neighbours inside each physical building
    for (const list of this.groups.values()) {
      for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
        const A = list[a], B = list[b];
        if (A.minx <= B.maxx + 0.8 && B.minx <= A.maxx + 0.8 && A.minz <= B.maxz + 0.8 && B.minz <= A.maxz + 0.8) { A.nbr.push(B); B.nbr.push(A); }
      }
    }
    // parts whose data leaves them hanging in the air rest on the ground instead
    for (const t of this.tiles) {
      const s = t.segs[0];
      if (s[0] > 0.5 && !t.nbr.some((u) => u.segs[0][1] >= s[0] - 1.5 && u.segs[0][0] < s[0])) {
        this.totalVolume += t.area * s[0];
        s[0] = 0;
      }
    }
    for (const t of this.tiles) this.refreshTile(t);
    for (const mc of this.mcells) { mc.dirty = false; this.rebuildCell(mc); }
    // named tall buildings, tallest first
    const byName = new Map();
    this.landmarks = [];
    for (const t of this.tiles) {
      if (!t.name) continue;
      let L = byName.get(t.name);
      if (!L) { L = { name: t.name, tiles: [], vol0: 0, top: 0, down: false }; byName.set(t.name, L); this.landmarks.push(L); }
      L.tiles.push(t);
      L.vol0 += t.area * (t.segs[0][1] - t.segs[0][0]);
      L.top = Math.max(L.top, t.top);
    }
    this.landmarks.sort((a, b) => b.top - a.top);
  }

  mcellIndex(x, z) {
    const i = Math.min(this.MC - 1, Math.max(0, Math.floor((x + this.half) / MESH_CELL)));
    const j = Math.min(this.MC - 1, Math.max(0, Math.floor((z + this.half) / MESH_CELL)));
    return j * this.MC + i;
  }

  cell(x, z) {
    const i = Math.floor((x + this.half) / CELL), j = Math.floor((z + this.half) / CELL);
    if (i < 0 || j < 0 || i >= this.N || j >= this.N) return -1;
    return j * this.N + i;
  }

  rasterize(t) {
    const cells = [];
    const i0 = Math.max(0, Math.floor((t.minx + this.half) / CELL)), i1 = Math.min(this.N - 1, Math.floor((t.maxx + this.half) / CELL));
    const j0 = Math.max(0, Math.floor((t.minz + this.half) / CELL)), j1 = Math.min(this.N - 1, Math.floor((t.maxz + this.half) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -this.half + (i + 0.5) * CELL, z = -this.half + (j + 0.5) * CELL;
      if (!pointInRing(x, z, t.rings[0])) continue;
      let hole = false;
      for (let h = 1; h < t.rings.length; h++) if (pointInRing(x, z, t.rings[h])) { hole = true; break; }
      if (!hole) cells.push(j * this.N + i);
    }
    if (!cells.length) { const c = this.cell(t.cx, t.cz); if (c >= 0) cells.push(c); }
    t.cells = Int32Array.from(cells);
    for (const c of cells) {
      const o = c * SLOTS;
      for (let s = 0; s < SLOTS; s++) if (this.own[o + s] < 0) { this.own[o + s] = t.id; break; }
    }
  }

  heightAt(x, z) {
    const c = this.cell(x, z);
    if (c < 0) return 0;
    return Math.max(this.hgt[c], this.rub[c]);
  }

  // Top of solid structure only (no rubble).
  structureAt(x, z) {
    const c = this.cell(x, z);
    return c < 0 ? 0 : this.hgt[c];
  }

  addRubble(x, z, vol) {
    const c = this.cell(x, z);
    if (c >= 0) this.rub[c] = Math.min(this.rub[c] + vol / (CELL * CELL) * 0.35, 14);
  }

  refreshTile(t) {
    t.top = t.segs.length ? Math.max(...t.segs.map((s) => s[1])) : t.rubble;
    for (const c of t.cells) {
      let h = 0;
      const o = c * SLOTS;
      for (let s = 0; s < SLOTS; s++) {
        const id = this.own[o + s];
        if (id < 0) break;
        const u = this.tiles[id];
        // the grid reports the top of material connected to the ground column
        h = Math.max(h, u.top);
      }
      this.hgt[c] = h;
    }
    this.mcells[t.mcell].dirty = true;
  }

  rebuildCell(mc) {
    if (mc.mesh) { this.scene.remove(mc.mesh); mc.mesh.geometry.dispose(); mc.mesh = null; }
    const buf = new Buf();
    for (const t of mc.tiles) {
      for (const s of t.segs) prism(buf, t, s[0], s[1], [0, t.seed], ZERO, s[0] > 0.5, 1, (s[3] ? 1 : 0) | (s[2] ? 2 : 0));
      if (!t.segs.length && t.rubble > 0) prism(buf, t, 0, t.rubble, [2, t.seed], ZERO, false, 0.45);
    }
    if (!buf.p.length) return;
    mc.mesh = new THREE.Mesh(buf.geometry(), this.material);
    mc.mesh.castShadow = mc.mesh.receiveShadow = true;
    this.scene.add(mc.mesh);
  }

  // Remove the band [yb, yt] from a tile. Returns removed [a,b] intervals.
  cut(t, yb, yt) {
    const keep = [], removed = [];
    for (const s of t.segs) {
      const [a, b] = s;
      if (b <= yb || a >= yt) { keep.push(s); continue; }
      if (a < yb) keep.push([a, yb, s[2] || 0, 1]);
      if (b > yt) keep.push([yt, b, 1, s[3] || 0]);
      removed.push([Math.max(a, yb), Math.min(b, yt)]);
    }
    t.segs = keep.filter(([a, b]) => { if (b - a < 1.2) { removed.push([a, b]); return false; } return true; });
    if (removed.length && !t.segs.length) t.rubble = Math.min(t.top, 2 + t.seed * 4);
    return removed;
  }

  tileSampler(t, a, b) {
    return (out) => {
      for (let k = 0; k < 6; k++) {
        out.set(t.minx + Math.random() * (t.maxx - t.minx), a + Math.random() * (b - a), t.minz + Math.random() * (t.maxz - t.minz));
        if (pointInRing(out.x, out.z, t.rings[0])) break;
      }
      return out;
    };
  }

  // Spherical damage. dir = push direction (unit-ish), power scales debris speed.
  damage(c, r, dir, power = 1, crushAll = false) {
    const ids = new Set();
    const i0 = Math.floor((c.x - r + this.half) / CELL), i1 = Math.floor((c.x + r + this.half) / CELL);
    const j0 = Math.floor((c.z - r + this.half) / CELL), j1 = Math.floor((c.z + r + this.half) / CELL);
    for (let j = Math.max(0, j0); j <= Math.min(this.N - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.N - 1, i1); i++) {
      const o = (j * this.N + i) * SLOTS;
      for (let s = 0; s < SLOTS; s++) { const id = this.own[o + s]; if (id < 0) break; ids.add(id); }
    }
    const hitGroups = new Map();
    let vol = 0;
    const push = _w.copy(dir).multiplyScalar(18 * power);
    for (const id of ids) {
      const t = this.tiles[id];
      if (!t.segs.length) continue;
      const dx = Math.max(t.minx - c.x, 0, c.x - t.maxx), dz = Math.max(t.minz - c.z, 0, c.z - t.maxz);
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      const hh = Math.sqrt(r * r - d2);
      let yb = c.y - hh, yt = c.y + hh;
      if (crushAll || (yb < 6 && t.top < Math.max(28, yt + 6))) { yb = -1; yt = 1e9; }
      else if (t.top <= yt + 5) yt = 1e9;
      const removed = this.cut(t, yb, yt);
      if (!removed.length) continue;
      for (const [a, b] of removed) {
        const v = t.area * (b - a);
        vol += v;
        this.fx.shatter(this.tileSampler(t, a, b), v, t.col, ZERO, push, power);
      }
      if (!hitGroups.has(t.g)) hitGroups.set(t.g, { yb, yt });
      this.refreshTile(t);
    }
    this.destroyedVolume += vol;
    for (const [g, band] of hitGroups) this.resolve(g, band, dir);
    return vol;
  }

  // Structural check after damage: unsupported parts and weak necks fall.
  resolve(g, band, dir) {
    const tiles = this.groups.get(g);
    const nodes = [];
    for (const t of tiles) for (const s of t.segs) nodes.push({ t, s, comp: -1 });
    const adj = (A, B) => A.s[0] <= B.s[1] + 1.5 && B.s[0] <= A.s[1] + 1.5 && (A.t === B.t ? false : A.t.nbr.includes(B.t));
    const comps = [];
    for (const n of nodes) {
      if (n.comp >= 0) continue;
      const comp = []; n.comp = comps.length; const st = [n];
      while (st.length) {
        const a = st.pop(); comp.push(a);
        for (const b of nodes) if (b.comp < 0 && adj(a, b)) { b.comp = n.comp; st.push(b); }
      }
      comps.push(comp);
    }
    for (const comp of comps) {
      const grounded = comp.some((n) => n.s[0] < 0.5);
      if (!grounded) { this.fall(comp.map((n) => ({ t: n.t, a: n.s[0], b: n.s[1], bb: n.s[2] || 0, tb: n.s[3] || 0, n })), dir); continue; }
      if (band.yt > 1e8) continue;
      const level = (band.yb + band.yt) / 2;
      const above = new Set(), neck = new Set();
      for (const n of comp) {
        if (n.s[1] > band.yt + 1) above.add(n.t);
        if (n.s[0] <= level && n.s[1] >= level) neck.add(n.t);
      }
      let aA = 0, aN = 0;
      for (const t of above) aA += t.area;
      for (const t of neck) aN += t.area;
      if (aA > 0 && aN < 0.45 * aA) {
        const pieces = [];
        for (const n of comp) if (n.s[1] > band.yt) pieces.push({ t: n.t, a: Math.max(n.s[0], band.yt), b: n.s[1], bb: n.s[0] < band.yt ? 1 : n.s[2] || 0, tb: n.s[3] || 0, n });
        this.fall(pieces, dir);
      }
    }
  }

  // Detach pieces from their tiles and make one rigid falling body.
  fall(pieces, dir) {
    if (!pieces.length) return;
    let vol = 0; const piv = new THREE.Vector3();
    for (const p of pieces) {
      const v = p.t.area * (p.b - p.a); vol += v;
      piv.x += p.t.cx * v; piv.y += (p.a + p.b) / 2 * v; piv.z += p.t.cz * v;
      // detach from tile
      const s = p.n.s;
      if (s[0] >= p.a - 0.01) p.t.segs = p.t.segs.filter((x) => x !== s);
      else { s[1] = p.a; s[3] = 1; }
      this.refreshTile(p.t);
    }
    if (vol < 1) return;
    piv.divideScalar(vol);
    let minA = Infinity, maxB = 0;
    for (const p of pieces) { minA = Math.min(minA, p.a); maxB = Math.max(maxB, p.b); }
    const d = _v.set(dir.x, 0, dir.z);
    if (d.lengthSq() < 1e-4) d.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    d.normalize();
    const body = {
      pieces, pivot: piv.clone(), pos: piv.clone(), vel: new THREE.Vector3(d.x * 1.5, 0, d.z * 1.5),
      q: new THREE.Quaternion(), w: new THREE.Vector3(d.z, 0, -d.x).multiplyScalar(0.04 + Math.random() * 0.04),
      axis: new THREE.Vector3(d.z, 0, -d.x), cut: minA, built: -1, mesh: null, age: 0, lastHit: 0,
      height: maxB - minA, vol,
    };
    this.toppled++;
    this.buildBody(body);
    this.bodies.push(body);
  }

  buildBody(b) {
    if (b.mesh) { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); }
    const buf = new Buf();
    const off = [b.pivot.x, b.pivot.y, b.pivot.z];
    for (const p of b.pieces) {
      const a = Math.max(p.a, b.cut);
      if (p.b > a + 0.3) prism(buf, p.t, a, p.b, [0, p.t.seed], off, true, 1, (p.tb ? 1 : 0) | (p.bb || a > p.a ? 2 : 0));
    }
    b.mesh = new THREE.Mesh(buf.geometry(), this.material);
    b.mesh.castShadow = b.mesh.receiveShadow = true;
    b.mesh.position.copy(b.pos); b.mesh.quaternion.copy(b.q);
    this.scene.add(b.mesh);
    b.built = b.cut;
  }

  toWorld(b, x, y, z, out) {
    return out.set(x - b.pivot.x, y - b.pivot.y, z - b.pivot.z).applyQuaternion(b.q).add(b.pos);
  }

  bodySampler(b, p, a, c) {
    return (out) => this.toWorld(b, p.t.minx + Math.random() * (p.t.maxx - p.t.minx), a + Math.random() * (c - a), p.t.minz + Math.random() * (p.t.maxz - p.t.minz), out);
  }

  shatterBody(b, i) {
    for (const p of b.pieces) {
      const a = Math.max(p.a, b.cut);
      if (p.b <= a) continue;
      const v = p.t.area * (p.b - a);
      this.destroyedVolume += v;
      this.fx.shatter(this.bodySampler(b, p, a, p.b), v, p.t.col, b.vel, b.vel.clone().setY(0).multiplyScalar(0.3), 1);
    }
    this.fx.ring(b.pos.x, 0, b.pos.z, 30 + b.height * 0.2, 60);
    if (b.vol > 3e4 && Math.random() < 0.5) this.fx.ignite(b.pos.x, 0, b.pos.z, 1.5, 40);
    if (this.onImpact) this.onImpact(b.pos, Math.min(1, b.vol / 2e5));
    this.scene.remove(b.mesh); b.mesh.geometry.dispose();
    this.bodies.splice(i, 1);
  }

  updateBodies(dt) {
    const cp = new THREE.Vector3();
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      b.age += dt;
      b.vel.y -= G * dt;
      if (b.age < 4) b.w.addScaledVector(b.axis, 0.06 * dt);
      b.pos.addScaledVector(b.vel, dt);
      const wl = b.w.length();
      if (wl > 1e-6) { _q.setFromAxisAngle(_v.copy(b.w).divideScalar(wl), wl * dt); b.q.premultiply(_q); }
      // contact sampling: footprint bbox corners at the bottom and top of each piece
      let n = 0, ground = 0, pen = 0; cp.set(0, 0, 0);
      let topHit = false;
      const step = Math.max(1, Math.floor(b.pieces.length / 24));
      for (let k = 0; k < b.pieces.length; k += step) {
        const p = b.pieces[k];
        const a = Math.max(p.a, b.cut);
        if (p.b <= a) continue;
        for (const y of [a, p.b]) for (const [x, z] of [[p.t.minx, p.t.minz], [p.t.maxx, p.t.minz], [p.t.minx, p.t.maxz], [p.t.maxx, p.t.maxz]]) {
          this.toWorld(b, x, y, z, _w);
          const h = this.structureAt(_w.x, _w.z);
          const d = h - _w.y;
          if (d > 0) {
            n++; cp.add(_w); pen = Math.max(pen, d);
            if (h < 1) ground++;
            if (y === p.b && h < 1) topHit = true;
          }
        }
      }
      const tilt = _v.set(0, 1, 0).applyQuaternion(b.q).y;
      if (!b.split && b.height > 70 && (tilt < 0.94 || (n && b.age > 0.4))) { this.split(b, i); continue; }
      if (n) {
        cp.divideScalar(n);
        // crush: decelerate, eat our own bottom, and pancake whatever is below
        b.vel.multiplyScalar(Math.exp(-(ground ? 2.5 : 0.9) * dt));
        if (ground) b.pos.y += Math.min(pen, 6 * dt * 10) * 0.5;
        const rate = Math.max(6, -b.vel.y) * (ground ? 1.6 : 0.8);
        const oldCut = b.cut;
        b.cut += rate * dt;
        for (const p of b.pieces) {
          const a0 = Math.max(p.a, oldCut), a1 = Math.min(p.b, b.cut);
          if (a1 > a0) {
            const v = p.t.area * (a1 - a0);
            this.destroyedVolume += v;
            if (Math.random() < 0.6) this.fx.shatter(this.bodySampler(b, p, a0, a1), v, p.t.col, b.vel, _w.set(0, 0, 0), 1);
          }
        }
        if (b.age - b.lastHit > 0.15 && !ground) {
          b.lastHit = b.age;
          const r = Math.min(40, 8 + Math.sqrt(b.vol / Math.max(b.height, 1)) * 0.6);
          cp.y = Math.max(0, cp.y - 2);
          this.damage(cp, r, b.vel.clone().setY(0).normalize(), 0.6);
          if (this.onImpact) this.onImpact(cp, Math.min(0.6, b.vol / 4e5));
        }
        // billowing dust where the structure is being crushed
        if (Math.random() < 0.5) this.fx.ring(cp.x, ground ? 0 : cp.y, cp.z, 20 + Math.sqrt(b.vol) * 0.04, ground ? 6 : 3);
      }
      if (b.cut - b.built > 3) this.buildBody(b);
      else { b.mesh.position.copy(b.pos); b.mesh.quaternion.copy(b.q); }
      const remaining = b.pieces.some((p) => p.b > b.cut + 0.5);
      if (!remaining || topHit || tilt < 0.35 || b.age > 30 || b.pos.y < -100) this.shatterBody(b, i);
    }
  }

  // A tall falling section fractures into 2-3 stacked bodies that keep the parent's motion.
  split(b, i) {
    const lo0 = Math.max(b.cut, Math.min(...b.pieces.map((p) => p.a)));
    const hi0 = Math.max(...b.pieces.map((p) => p.b));
    const k = hi0 - lo0 > 200 ? 3 : 2;
    const levels = [];
    for (let j = 0; j <= k; j++) levels.push(lo0 + ((hi0 - lo0) * j) / k + (j && j < k ? (hash(b.pieces.length * 31 + j) - 0.5) * 12 : 0));
    this.scene.remove(b.mesh); b.mesh.geometry.dispose();
    this.bodies.splice(i, 1);
    const tmp = new THREE.Vector3(), rel = new THREE.Vector3();
    for (let j = 0; j < k; j++) {
      const lo = levels[j], hi = levels[j + 1];
      const pieces = [];
      for (const p of b.pieces) {
        const a = Math.max(p.a, lo, b.cut), c = Math.min(p.b, hi);
        if (c - a > 0.5) pieces.push({ t: p.t, a, b: c, bb: a > p.a ? 1 : p.bb, tb: c < p.b ? 1 : p.tb });
      }
      if (!pieces.length) continue;
      let vol = 0; const piv = new THREE.Vector3();
      for (const p of pieces) { const v = p.t.area * (p.b - p.a); vol += v; piv.x += p.t.cx * v; piv.y += (p.a + p.b) / 2 * v; piv.z += p.t.cz * v; }
      piv.divideScalar(vol);
      const pos = this.toWorld(b, piv.x, piv.y, piv.z, new THREE.Vector3());
      rel.subVectors(pos, b.pos);
      const vel = b.vel.clone().add(tmp.crossVectors(b.w, rel)).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
      const nb = {
        pieces, pivot: piv, pos, vel, q: b.q.clone(),
        w: b.w.clone().multiplyScalar(1 + j * 0.6 + Math.random() * 0.4).add(new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.05)),
        axis: b.axis, cut: Math.min(...pieces.map((p) => p.a)), built: -1, mesh: null, age: b.age, lastHit: b.age,
        height: hi - lo, vol, split: true,
      };
      this.buildBody(nb);
      this.bodies.push(nb);
      // fracture burst along the break plane
      if (j > 0) {
        let area = 0; for (const p of pieces) if (p.a <= lo + 0.6) area += p.t.area;
        const plane = pieces.filter((p) => p.a <= lo + 0.6);
        if (plane.length) {
          const p = plane[Math.floor(Math.random() * plane.length)];
          this.fx.shatter(this.bodySampler(b, p, lo - 2, lo + 2), area * 3, p.t.col, vel, rel.normalize().multiplyScalar(6), 1);
        }
      }
    }
  }

  // Landmarks whose remaining volume dropped below half since the last call.
  newlyFallen() {
    const out = [];
    for (const L of this.landmarks) {
      if (L.down) continue;
      let rem = 0;
      for (const t of L.tiles) for (const s of t.segs) rem += t.area * (s[1] - s[0]);
      if (rem < 0.5 * L.vol0) { L.down = true; out.push(L); }
    }
    return out;
  }

  update(dt) {
    this.updateBodies(dt);
    let n = 0;
    for (const mc of this.mcells) if (mc.dirty && n < 6) { mc.dirty = false; this.rebuildCell(mc); n++; }
  }

  destruction() { return this.destroyedVolume / this.totalVolume; }
}
