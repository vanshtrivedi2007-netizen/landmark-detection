import * as THREE from 'three';

export function generateContours(
  heightGrid: number[][],
  width: number,
  height: number,
  minElev: number,
  maxElev: number,
  numIntervals = 10,
  yOffset = 0.02
): THREE.LineSegments {
  const relief = maxElev - minElev;
  const interval = relief > 0 ? relief / numIntervals : 1;
  const levels: number[] = [];

  for (let l = minElev + interval; l < maxElev; l += interval) {
    levels.push(l);
  }

  const rows = heightGrid.length;
  const cols = heightGrid[0]?.length || 0;
  if (rows < 2 || cols < 2) {
    return new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
  }

  const cellW = width / (cols - 1);
  const cellH = height / (rows - 1);
  const halfW = width / 2;
  const halfH = height / 2;

  const points: number[] = [];

  for (const level of levels) {
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const v0 = heightGrid[r]![c]!;
        const v1 = heightGrid[r]![c + 1]!;
        const v2 = heightGrid[r + 1]![c + 1]!;
        const v3 = heightGrid[r + 1]![c]!;

        const b0 = v0 >= level ? 1 : 0;
        const b1 = v1 >= level ? 2 : 0;
        const b2 = v2 >= level ? 4 : 0;
        const b3 = v3 >= level ? 8 : 0;
        const caseIndex = b0 | b1 | b2 | b3;

        if (caseIndex === 0 || caseIndex === 15) continue;

        const x0 = c * cellW - halfW;
        const x1 = (c + 1) * cellW - halfW;
        const z0 = r * cellH - halfH;
        const z1 = (r + 1) * cellH - halfH;

        const interpolate = (valA: number, valB: number) => {
          if (Math.abs(valB - valA) < 1e-6) return 0.5;
          return (level - valA) / (valB - valA);
        };

        const topX = x0 + interpolate(v0, v1) * cellW;
        const rightZ = z0 + interpolate(v1, v2) * cellH;
        const bottomX = x0 + interpolate(v3, v2) * cellW;
        const leftZ = z0 + interpolate(v0, v3) * cellH;

        const addSeg = (ax: number, az: number, bx: number, bz: number) => {
          points.push(ax, level + yOffset, az);
          points.push(bx, level + yOffset, bz);
        };

        switch (caseIndex) {
          case 1:
          case 14:
            addSeg(x0, leftZ, topX, z0);
            break;
          case 2:
          case 13:
            addSeg(topX, z0, x1, rightZ);
            break;
          case 3:
          case 12:
            addSeg(x0, leftZ, x1, rightZ);
            break;
          case 4:
          case 11:
            addSeg(x1, rightZ, bottomX, z1);
            break;
          case 5:
            addSeg(x0, leftZ, topX, z0);
            addSeg(x1, rightZ, bottomX, z1);
            break;
          case 6:
          case 9:
            addSeg(topX, z0, bottomX, z1);
            break;
          case 7:
          case 8:
            addSeg(x0, leftZ, bottomX, z1);
            break;
          case 10:
            addSeg(topX, z0, x1, rightZ);
            addSeg(x0, leftZ, bottomX, z1);
            break;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x9ca3af, // --enc-neutral
    transparent: true,
    opacity: 0.65,
  });

  return new THREE.LineSegments(geometry, material);
}
