// Stand-in monsters built from primitives. Replace build*() with a loaded GLB
// (ComfyUI pipeline) later; the rig contract is the named pivots used in pose().
import * as THREE from 'three';

const _v = new THREE.Vector3(), _d = new THREE.Vector3();

function mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts }); }

function blob(parent, mat, r, pos, rot) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat);
  m.scale.set(r[0], r[1], r[2]);
  m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function limb(parent, mat, radius, length, pos) {
  // pivot at the top, limb hangs along -y
  const pivot = new THREE.Group();
  pivot.position.set(pos[0], pos[1], pos[2]);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 16), mat);
  m.position.y = -length / 2;
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

function spike(parent, mat, h, r, pos, tilt = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mat);
  m.scale.z = 0.35;
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.x = tilt;
  m.castShadow = true;
  parent.add(m);
  return m;
}

export const MONSTERS = {
  rhagon: {
    name: 'Rhagon', blurb: 'Armored sea reptile. Plasma breath, tail sweep.',
    height: 150, scale: 1.45, speed: 18, run: 34,
    attacks: { swipe: 'Claw swipe', stomp: 'Stomp', special: 'Tail sweep', beam: 'Plasma breath' },
  },
  kragmor: {
    name: 'Kragmor', blurb: 'Colossal ape. Faster, ground pound, leaps.',
    height: 115, scale: 1.5, speed: 22, run: 40,
    attacks: { swipe: 'Haymaker', stomp: 'Ground pound', special: 'Charge', beam: 'Leap' },
  },
};

function buildRhagon() {
  const skin = mat(0x3c4a3a), belly = mat(0x6d6a52), plate = mat(0xd8d2c0, { emissive: 0x2a8cff, emissiveIntensity: 0 });
  const eye = mat(0xffa030, { emissive: 0xff7a10, emissiveIntensity: 2 });
  const R = {};
  R.root = new THREE.Group();
  R.hips = new THREE.Group(); R.hips.position.y = 46; R.root.add(R.hips);
  blob(R.hips, skin, [15, 14, 16], [0, 0, 0]);
  R.torso = new THREE.Group(); R.torso.rotation.x = 0.3; R.hips.add(R.torso);
  blob(R.torso, skin, [15, 24, 14], [0, 22, 2]);
  blob(R.torso, belly, [11, 19, 6], [0, 20, 10]);
  R.neck = new THREE.Group(); R.neck.position.set(0, 42, 4); R.torso.add(R.neck);
  blob(R.neck, skin, [8, 11, 8], [0, 6, 2], [0.4, 0, 0]);
  R.head = new THREE.Group(); R.head.position.set(0, 14, 6); R.head.rotation.x = -0.3; R.neck.add(R.head);
  blob(R.head, skin, [7, 6.5, 11], [0, 1, 4]);
  blob(R.head, skin, [5, 3.5, 7], [0, 1.5, 12]);
  R.jaw = new THREE.Group(); R.jaw.position.set(0, -2, 0); R.head.add(R.jaw);
  blob(R.jaw, belly, [5, 2.2, 10], [0, -1, 8]);
  blob(R.head, eye, [1.4, 1.1, 1.4], [4.2, 3, 9]);
  blob(R.head, eye, [1.4, 1.1, 1.4], [-4.2, 3, 9]);
  R.mouth = new THREE.Object3D(); R.mouth.position.set(0, 0, 18); R.head.add(R.mouth);
  for (const s of [1, -1]) {
    const sh = limb(R.torso, skin, 4.5, 14, [s * 14, 32, 8]); sh.rotation.set(-0.9, 0, s * 0.25);
    const fo = limb(sh, skin, 3.8, 12, [0, -19, 0]); fo.rotation.x = -0.9;
    const hand = new THREE.Object3D(); hand.position.y = -17; fo.add(hand);
    for (const k of [-1, 0, 1]) spike(hand, plate, 6, 1.4, [k * 2.2, -2, 1], Math.PI);
    R[s > 0 ? 'armL' : 'armR'] = sh; R[s > 0 ? 'foreL' : 'foreR'] = fo; R[s > 0 ? 'handL' : 'handR'] = hand;
    const th = limb(R.hips, skin, 8, 16, [s * 11, -2, 0]);
    const kn = limb(th, skin, 6.5, 14, [0, -22, 0]);
    const ft = new THREE.Group(); ft.position.y = -21; kn.add(ft);
    blob(ft, skin, [7, 3.2, 11], [0, -1.5, 4]);
    for (const k of [-1, 0, 1]) spike(ft, plate, 4, 1.2, [k * 3.5, -2, 14], Math.PI / 2);
    R[s > 0 ? 'legL' : 'legR'] = th; R[s > 0 ? 'kneeL' : 'kneeR'] = kn; R[s > 0 ? 'footL' : 'footR'] = ft;
  }
  // dorsal plates
  R.plates = [];
  for (let k = 0; k < 7; k++) R.plates.push(spike(R.torso, plate, 9 + 5 * Math.sin((k / 6) * Math.PI), 4.5, [0, 6 + k * 6.5, -12 + k * 0.6], -0.35));
  // tail chain
  R.tail = [];
  let parent = R.hips, z = -12, r = 11;
  for (let k = 0; k < 11; k++) {
    const seg = new THREE.Group(); seg.position.set(0, k ? 0 : -2, k ? -8.5 : z); parent.add(seg);
    blob(seg, skin, [r, r * 0.9, 6.5], [0, 0, -4]);
    if (k % 2 === 0) R.plates.push(spike(seg, plate, r * 0.8 + 2, r * 0.35 + 1, [0, r * 0.9, -4], -0.5));
    R.tail.push(seg); parent = seg; r *= 0.84;
  }
  R.tailTip = new THREE.Object3D(); R.tailTip.position.z = -8; parent.add(R.tailTip);
  R.plateMat = plate;
  return R;
}

function buildKragmor() {
  const fur = mat(0x3a2d24), hide = mat(0x6a5446), dark = mat(0x1d1612);
  const eye = mat(0xffd27a, { emissive: 0xff9b2a, emissiveIntensity: 1.6 });
  const R = {};
  R.root = new THREE.Group();
  R.hips = new THREE.Group(); R.hips.position.y = 30; R.root.add(R.hips);
  blob(R.hips, fur, [14, 11, 11], [0, 0, 0]);
  R.torso = new THREE.Group(); R.torso.rotation.x = 0.75; R.hips.add(R.torso);
  blob(R.torso, fur, [20, 22, 16], [0, 22, 0]);
  blob(R.torso, hide, [13, 13, 6], [0, 24, 11]);
  blob(R.torso, fur, [12, 9, 10], [0, 40, -2]);
  R.neck = new THREE.Group(); R.neck.position.set(0, 42, 8); R.torso.add(R.neck);
  R.head = new THREE.Group(); R.head.position.set(0, 2, 2); R.head.rotation.x = -0.65; R.neck.add(R.head);
  blob(R.head, fur, [8.5, 9, 8], [0, 3, 0]);
  blob(R.head, hide, [6.5, 5.5, 5], [0, 0, 6]);
  blob(R.head, dark, [8, 2, 4], [0, 6.5, 5]);
  blob(R.head, eye, [1.2, 1, 1], [3, 4.5, 7.5]);
  blob(R.head, eye, [1.2, 1, 1], [-3, 4.5, 7.5]);
  R.jaw = new THREE.Group(); R.jaw.position.set(0, -3, 3); R.head.add(R.jaw);
  blob(R.jaw, hide, [5.5, 2.5, 4.5], [0, -1, 2]);
  R.mouth = new THREE.Object3D(); R.mouth.position.set(0, 0, 10); R.head.add(R.mouth);
  for (const s of [1, -1]) {
    const sh = limb(R.torso, fur, 7, 26, [s * 21, 34, 2]); sh.rotation.set(-1.6, 0, s * 0.15);
    const fo = limb(sh, fur, 6, 22, [0, -33, 0]); fo.rotation.x = 0.4;
    const hand = new THREE.Object3D(); hand.position.y = -30; fo.add(hand);
    blob(hand, hide, [7, 5, 8], [0, 0, 0]);
    R[s > 0 ? 'armL' : 'armR'] = sh; R[s > 0 ? 'foreL' : 'foreR'] = fo; R[s > 0 ? 'handL' : 'handR'] = hand;
    const th = limb(R.hips, fur, 8, 10, [s * 10, -2, 0]);
    const kn = limb(th, fur, 6.5, 8, [0, -15, 0]);
    const ft = new THREE.Group(); ft.position.y = -13; kn.add(ft);
    blob(ft, hide, [6, 3, 10], [0, -1.5, 4]);
    R[s > 0 ? 'legL' : 'legR'] = th; R[s > 0 ? 'kneeL' : 'kneeR'] = kn; R[s > 0 ? 'footL' : 'footR'] = ft;
  }
  R.tail = []; R.plates = [];
  return R;
}

// Action timing: [windup, strike, recover] seconds.
const ACTIONS = {
  swipe: [0.28, 0.14, 0.35],
  stomp: [0.45, 0.12, 0.45],
  special: [0.25, 0.8, 0.3],
  beam: [0.45, 1e9, 0.3],
};

export class Monster {
  constructor(scene, type, city, fx) {
    this.type = type; this.def = MONSTERS[type]; this.city = city; this.fx = fx;
    this.R = type === 'rhagon' ? buildRhagon() : buildKragmor();
    this.root = this.R.root;
    this.root.scale.setScalar(this.def.scale);
    scene.add(this.root);
    this.pos = new THREE.Vector3(); this.heading = 0; this.speed = 0; this.vy = 0; this.air = false;
    this.phase = 0; this.action = null; this.t = 0;
    this.lastBulldoze = 0; this.lastStep = 0; this.prevStep = 0;
    this.beamOn = false; this.aim = new THREE.Vector3(0, 0, 1);
    this.onImpact = null; this.onStep = null;
    // beam visual
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 1, 12, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beam.visible = false; scene.add(this.beam);
    this.beamCore = new THREE.Mesh(this.beam.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.beamCore.scale.set(0.4, 0.4, 1); this.beam.add(this.beamCore);
    this.beamLight = new THREE.PointLight(0x7fc4ff, 0, 400, 1.5); scene.add(this.beamLight);
    this.root.updateMatrixWorld(true);
  }

  forward(out = _d) { return out.set(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  world(node, out) { return node.getWorldPosition(out); }

  start(name) {
    if (this.action) return;
    this.action = { name, t: 0, hit: false, held: name === 'beam' };
  }

  release(name) { if (this.action && this.action.name === name) this.action.held = false; }

  // move: {x,z} desired direction in world (unit or zero), run flag, aimYaw for beam
  update(dt, move, run, aimDir) {
    const def = this.def;
    this.t += dt;
    const a = this.action;
    let busy = a && a.name !== 'beam';
    // movement
    const want = Math.hypot(move.x, move.z) > 0.1 && !(a && (a.name === 'stomp' || a.name === 'special' && this.type === 'rhagon'));
    const target = want ? (run ? def.run : def.speed) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
    if (want) {
      const h = Math.atan2(move.x, move.z);
      let d = h - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 3);
    }
    if (a && a.name === 'beam' && aimDir) {
      const h = Math.atan2(aimDir.x, aimDir.z);
      let d = h - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 4);
      this.speed *= 0.9;
    }
    const f = this.forward();
    let sp = this.speed;
    // ape charge
    if (a && a.name === 'special' && this.type === 'kragmor' && a.t > ACTIONS.special[0]) sp = def.run * 1.6;
    // ape leap
    if (a && a.name === 'beam' && this.type === 'kragmor') sp = def.run * 1.2;
    // blocked by tall structures: slow down while smashing through
    const ahead = this.city.structureAt(this.pos.x + f.x * 20, this.pos.z + f.z * 20);
    if (ahead > 8) sp *= 0.55;
    this.pos.addScaledVector(f, sp * dt);
    const lim = this.city.half - 40;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));
    // vertical (leap)
    if (this.air) {
      this.vy -= 30 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) { this.pos.y = 0; this.air = false; this.land(); }
    }
    // smash through buildings while moving
    if (sp > 3 && this.t - this.lastBulldoze > 0.22) {
      this.lastBulldoze = this.t;
      const s = def.height / 105;
      if (this.city.structureAt(this.pos.x + f.x * 18 * s, this.pos.z + f.z * 18 * s) > 3) {
        _v.copy(this.pos).addScaledVector(f, 18 * s); _v.y = this.pos.y + 34 * s;
        this.city.damage(_v, 22 * s, f, 0.5 + sp / 40);
      }
    }
    this.phase += dt * (sp / def.speed) * 3.2;
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.heading;
    this.pose(dt, sp);
    this.root.updateMatrixWorld(true);
    this.footsteps(sp);
    if (a) this.runAction(dt);
  }

  footsteps(sp) {
    if (sp < 2 || this.air) return;
    const s = Math.sin(this.phase);
    if (Math.sign(s) !== Math.sign(this.prevStep)) {
      const foot = s > 0 ? this.R.footR : this.R.footL;
      this.world(foot, _v); _v.y = 0;
      this.city.damage(_v, this.def.height * 0.09, this.forward(new THREE.Vector3()), 0.3);
      this.fx.ring(_v.x, 0, _v.z, 8, 6);
      if (this.onStep) this.onStep(_v);
    }
    this.prevStep = s;
  }

  runAction(dt) {
    const a = this.action, [w, s, r] = ACTIONS[a.name];
    a.t += dt;
    const f = this.forward(new THREE.Vector3());
    const H = this.def.height;
    if (a.name === 'swipe' && !a.hit && a.t > w) {
      a.hit = true;
      this.world(this.R.handL, _v);
      _v.addScaledVector(f, H * 0.25);
      const side = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(-0.7).add(f).normalize();
      this.city.damage(_v, H * 0.22, side, 1.4);
      if (this.onImpact) this.onImpact(_v, 0.4);
    }
    if (a.name === 'stomp' && !a.hit && a.t > w) {
      a.hit = true;
      this.world(this.type === 'rhagon' ? this.R.footR : this.R.handL, _v);
      if (this.type === 'kragmor') _v.addScaledVector(f, 6);
      _v.y = 0;
      const rad = H * (this.type === 'rhagon' ? 0.34 : 0.48);
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2, d = new THREE.Vector3(Math.cos(ang), 0.3, Math.sin(ang));
        this.city.damage(new THREE.Vector3(_v.x + d.x * rad * 0.6, 0, _v.z + d.z * rad * 0.6), rad * 0.55, d, 0.9);
      }
      this.city.damage(_v, rad * 0.6, f, 1.0, true);
      this.fx.ring(_v.x, 0, _v.z, rad * 1.4, 70);
      if (this.onImpact) this.onImpact(_v, 1);
    }
    if (a.name === 'special') {
      if (this.type === 'rhagon' && a.t > w && a.t < w + s) {
        // spin with tail out
        this.heading += (Math.PI * 2 / s) * dt;
        if (!a.last || a.t - a.last > 0.05) {
          a.last = a.t;
          this.world(this.R.tail[7], _v); _v.y = Math.max(_v.y, 14);
          const tan = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
          this.city.damage(_v, 24, tan, 1.6);
          this.world(this.R.tail[4], _v); _v.y = Math.max(_v.y, 18);
          this.city.damage(_v, 20, tan, 1.2);
        }
      }
      if (this.type === 'kragmor' && a.t > w && a.t < w + s && (!a.last || a.t - a.last > 0.08)) {
        a.last = a.t;
        _v.copy(this.pos).addScaledVector(f, 26); _v.y = 30;
        this.city.damage(_v, 30, f, 1.8);
      }
    }
    if (a.name === 'beam') {
      if (this.type === 'kragmor') {
        if (!a.hit) { a.hit = true; this.air = true; this.vy = 42; }
        if (!this.air) { this.action = null; }
        return;
      }
      const charge = Math.min(1, a.t / w);
      this.R.plateMat.emissiveIntensity = charge * 2.5;
      if (a.t > w && a.held) this.fireBeam();
      else this.beamOff();
      if (!a.held) {
        a.rt = (a.rt || 0) + dt;
        this.R.plateMat.emissiveIntensity = Math.max(0, 2.5 * (1 - a.rt / r));
        if (a.rt > r) { this.action = null; this.R.plateMat.emissiveIntensity = 0; }
      }
      return;
    }
    if (a.t > w + s + r) this.action = null;
  }

  land() {
    const H = this.def.height;
    _v.copy(this.pos);
    this.city.damage(_v, H * 0.5, this.forward(new THREE.Vector3()), 1.2, true);
    this.fx.ring(_v.x, 0, _v.z, H * 1.2, 80);
    if (this.onImpact) this.onImpact(_v, 1);
  }

  fireBeam() {
    const o = this.world(this.R.mouth, new THREE.Vector3());
    const dir = this.aim.clone().normalize();
    let hit = null, len = 900;
    const p = new THREE.Vector3();
    for (let d = 10; d < 900; d += 4) {
      p.copy(o).addScaledVector(dir, d);
      if (p.y <= 0 || p.y < this.city.heightAt(p.x, p.z)) { hit = p.clone(); len = d; break; }
    }
    this.beam.visible = true;
    this.beam.position.copy(o);
    this.beam.lookAt(p.copy(o).add(dir));
    const flick = 0.85 + Math.random() * 0.3;
    this.beam.scale.set(flick, flick, len);
    this.beamLight.position.copy(hit || o.clone().addScaledVector(dir, 200));
    this.beamLight.intensity = 6e4;
    if (hit) {
      this.fx.flame(hit.x, hit.y, hit.z, 1.2);
      if (!this.lastBeamHit || this.t - this.lastBeamHit > 0.07) {
        this.lastBeamHit = this.t;
        this.city.damage(hit, 13, dir, 1.3);
        this.fx.ignite(hit.x, hit.y, hit.z, 1, 30);
        if (this.onImpact) this.onImpact(hit, 0.15);
      }
    }
  }

  beamOff() { this.beam.visible = false; this.beamLight.intensity = 0; }

  pose(dt, sp) {
    const R = this.R, ph = this.phase, k = Math.min(1, sp / this.def.speed), t = this.t;
    const a = this.action;
    const ape = this.type === 'kragmor';
    const sw = Math.sin(ph), cw = Math.cos(ph);
    // legs: forward swing bends the knee, the planted leg stays straight
    R.legL.rotation.x = sw * 0.55 * k; R.legR.rotation.x = -sw * 0.55 * k;
    R.kneeL.rotation.x = Math.max(0, cw) * 0.8 * k; R.kneeR.rotation.x = Math.max(0, -cw) * 0.8 * k;
    R.hips.position.y = (ape ? 30 : 46) - Math.abs(cw) * 1.8 * k;
    R.hips.rotation.z = sw * 0.05 * k;
    R.torso.rotation.y = -sw * 0.08 * k;
    const lean = ape ? 0.75 : 0.3;
    R.torso.rotation.x = lean + k * 0.08;
    if (ape) {
      R.armL.rotation.x = -1.6 - sw * 0.5 * k; R.armR.rotation.x = -1.6 + sw * 0.5 * k;
      R.foreL.rotation.x = 0.4; R.foreR.rotation.x = 0.4;
    } else {
      R.armL.rotation.x = -0.9 - sw * 0.15 * k; R.armR.rotation.x = -0.9 + sw * 0.15 * k;
      R.foreL.rotation.x = -0.9; R.foreR.rotation.x = -0.9;
    }
    R.armL.rotation.y = 0; R.armR.rotation.y = 0;
    R.jaw.rotation.x = 0.05 + Math.max(0, Math.sin(t * 0.7)) * 0.05;
    R.neck.rotation.x = 0; R.head.rotation.y = 0;
    R.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 1.3 - i * 0.45) * 0.07 + sw * 0.05 * k; s.rotation.x = 0.06; });
    if (!a) return;
    const [w, s] = ACTIONS[a.name];
    const e = a.t < w ? a.t / w : Math.max(0, 1 - (a.t - w) / (s + 0.25));
    if (a.name === 'swipe') {
      if (a.t < w) { R.armL.rotation.x = -0.9 - e * 1.6; R.armL.rotation.y = e * 0.9; R.torso.rotation.y = e * 0.35; }
      else { const q = Math.min(1, (a.t - w) / s); R.armL.rotation.x = -2.5 + q * 1.4; R.armL.rotation.y = 0.9 - q * 1.8; R.torso.rotation.y = 0.35 - q * 0.7; R.foreL.rotation.x = -0.3; }
    }
    if (a.name === 'stomp') {
      if (ape) { R.armL.rotation.x = R.armR.rotation.x = -1.6 - (a.t < w ? e * 1.6 : (1 - Math.min(1, (a.t - w) / s)) * 1.6); R.torso.rotation.x = lean - (a.t < w ? e * 0.5 : 0); }
      else { R.legR.rotation.x = a.t < w ? -e * 0.9 : -(1 - Math.min(1, (a.t - w) / s)) * 0.9; R.kneeR.rotation.x = a.t < w ? e * 1.1 : 0; R.hips.position.y += a.t < w ? e * 3 : 0; }
    }
    if (a.name === 'beam' && !ape) {
      const c = Math.min(1, a.t / w);
      R.torso.rotation.x = lean - c * 0.25; R.neck.rotation.x = c * 0.2; R.jaw.rotation.x = 0.05 + c * 0.55;
    }
    if (a.name === 'beam' && ape) { R.armL.rotation.x = R.armR.rotation.x = -2.8; R.legL.rotation.x = R.legR.rotation.x = -0.6; R.kneeL.rotation.x = R.kneeR.rotation.x = 1.2; }
    if (a.name === 'special' && ape && a.t > w) { R.torso.rotation.x = 1.1; R.armL.rotation.x = R.armR.rotation.x = -2.6; }
    if (a.name === 'special' && !ape) R.tail.forEach((sg) => { sg.rotation.y *= 0.2; sg.rotation.x = -0.03; });
  }
}
