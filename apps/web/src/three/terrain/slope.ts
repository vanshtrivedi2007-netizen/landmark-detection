import * as THREE from 'three';

export interface SlopeStats {
  gentlePct: number;
  moderatePct: number;
  steepPct: number;
}

export function computeSlopeVertexColors(
  geometry: THREE.BufferGeometry,
  thresholds: [number, number] = [10, 25]
): { colors: Float32Array; stats: SlopeStats } {
  geometry.computeVertexNormals();
  const normalAttr = geometry.getAttribute('normal');
  const count = normalAttr.count;

  const colors = new Float32Array(count * 3);

  // Data-encoding palette rgb
  const cGentle = new THREE.Color('#4F7A64'); // --enc-ok
  const cModerate = new THREE.Color('#B08A3E'); // --enc-caution
  const cSteep = new THREE.Color('#A4543A'); // --enc-elevated

  const up = new THREE.Vector3(0, 1, 0);
  const norm = new THREE.Vector3();

  let gentleCount = 0;
  let moderateCount = 0;
  let steepCount = 0;

  const [t1, t2] = thresholds;

  for (let i = 0; i < count; i++) {
    norm.fromBufferAttribute(normalAttr, i);
    // Angle in degrees between normal and vertical Up
    const dot = Math.max(-1, Math.min(1, norm.dot(up)));
    const angleDeg = Math.acos(dot) * (180 / Math.PI);

    let chosen = cGentle;
    if (angleDeg > t2) {
      chosen = cSteep;
      steepCount++;
    } else if (angleDeg > t1) {
      chosen = cModerate;
      moderateCount++;
    } else {
      gentleCount++;
    }

    colors[i * 3] = chosen.r;
    colors[i * 3 + 1] = chosen.g;
    colors[i * 3 + 2] = chosen.b;
  }

  const total = count || 1;
  const stats: SlopeStats = {
    gentlePct: Math.round((gentleCount / total) * 100),
    moderatePct: Math.round((moderateCount / total) * 100),
    steepPct: Math.round((steepCount / total) * 100),
  };

  return { colors, stats };
}
