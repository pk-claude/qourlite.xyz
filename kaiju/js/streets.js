// Streets from baked Overture road centre lines: sidewalk ribbon + asphalt with lane markings.
import * as THREE from 'three';

// full carriageway width (m) per class index in data.roadClasses
const WIDTH = { motorway: 16, trunk: 16, primary: 18, secondary: 14, tertiary: 12, residential: 9, unclassified: 8, living_street: 7, service: 5, pedestrian: 7, unknown: 7 };
const MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary']);

function ribbon(pos, uv, line, w, y, major) {
  for (let k = 2; k + 1 < line.length; k += 2) {
    const ax = line[k - 2], az = line[k - 1], bx = line[k], bz = line[k + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    // extend each piece by half a width so consecutive pieces overlap at bends
    const ux = dx / L, uz = dz / L, e = w * 0.5;
    const sx = ax - ux * e, sz = az - uz * e, ex = bx + ux * e, ez = bz + uz * e;
    const nx = -uz * w / 2, nz = ux * w / 2;
    const u0 = 0, u1 = L + 2 * e;
    const q = [[sx + nx, sz + nz, u0, 1], [sx - nx, sz - nz, u0, -1], [ex - nx, ez - nz, u1, -1], [ex + nx, ez + nz, u1, 1]];
    for (const i of [0, 2, 1, 0, 3, 2]) {
      pos.push(q[i][0], y, q[i][1]);
      uv.push(q[i][2], q[i][3], w, major);
    }
  }
}

function material(color, markings) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide });
  if (!markings) return m;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoad; varying vec4 vRoad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = aRoad;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vRoad;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float across = vRoad.y * vRoad.z * 0.5;            // metres from centre
          float edge = vRoad.z * 0.5 - abs(across);           // metres from kerb
          float lane = abs(fract(across / 3.5 + 0.5) - 0.5) * 3.5;
          float dash = step(fract(vRoad.x / 9.0), 0.45);
          float aa = fwidth(across) + 0.02;
          float m = 0.0;
          m += (1.0 - smoothstep(0.08, 0.08 + aa, abs(edge - 0.6))) * 0.8;                   // edge lines
          m += (1.0 - smoothstep(0.07, 0.07 + aa, lane)) * dash * step(1.5, abs(across)) * 0.7; // lane dashes
          vec3 line = vec3(0.85, 0.84, 0.8);
          if (vRoad.w > 0.5) {
            float c = 1.0 - smoothstep(0.08, 0.08 + aa, abs(abs(across) - 0.18));
            m = max(m, c);
            line = mix(line, vec3(0.86, 0.7, 0.25), c);                                        // double centre line
          }
          diffuseColor.rgb = mix(diffuseColor.rgb, line, clamp(m, 0.0, 1.0) * 0.85);
        }`);
  };
  return m;
}

export function streets(scene, data) {
  if (!data.roads) return;
  const walk = [], walkUv = [], road = [], roadUv = [];
  for (const r of data.roads) {
    const cls = data.roadClasses[r[0]];
    const w = WIDTH[cls] || 7, major = MAJOR.has(cls) ? 1 : 0;
    const line = r.slice(1);
    // wider roads sit slightly higher so they cover narrower ones at junctions
    ribbon(walk, walkUv, line, w + 7, 0.08, 0);
    ribbon(road, roadUv, line, w, 0.12 + w * 0.0005, major);
  }
  for (const [pos, uv, color, mark] of [[walk, walkUv, 0x7d7a74, false], [road, roadUv, 0x2b2b2f, true]]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRoad', new THREE.Float32BufferAttribute(uv, 4));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const m = new THREE.Mesh(g, material(color, mark));
    m.receiveShadow = true;
    m.renderOrder = mark ? 1 : 0;
    scene.add(m);
  }
}
