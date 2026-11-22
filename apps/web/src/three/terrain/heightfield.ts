import * as THREE from 'three';
import { SeededNoise } from './noise.js';
import { generateContours } from './contours.js';
import { computeSlopeVertexColors, SlopeStats } from './slope.js';

export interface TerrainSceneData {
  terrainMesh: THREE.Mesh;
  contoursLine: THREE.LineSegments;
  footprintMesh: THREE.LineSegments;
  stats: {
    minElevation: number;
    maxElevation: number;
    relief: number;
    slope: SlopeStats;
  };
  setOverlayVisibility: (layer: 'contours' | 'slope' | 'footprint', visible: boolean) => void;
}

export function buildTerrainScene(
  landmarkSlug: string,
  elevationRange: [number, number] = [160, 170],
  footprintRadiusM = 300,
  segments = 128
): TerrainSceneData {
  const seed = landmarkSlug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100);
  const noise = new SeededNoise(seed);

  const planeSize = 40; // World unit coordinate span
  const geom = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
  geom.rotateX(-Math.PI / 2); // Orient horizontal on X-Z plane

  const posAttr = geom.getAttribute('position');
  const count = posAttr.count;

  const minElev = elevationRange[0];
  const maxElev = elevationRange[1];
  const relief = maxElev - minElev;

  const gridRows = segments + 1;
  const gridCols = segments + 1;
  const heightGrid: number[][] = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Normalize coordinates for noise
    const nx = (x / planeSize) * 2;
    const nz = (z / planeSize) * 2;

    // Fractional Brownian Motion
    const rawVal = noise.fbm2D(nx + 10, nz + 10, 4, 0.45);
    // Center elevation tapering
    const distFromCenter = Math.sqrt(x * x + z * z) / (planeSize / 2);
    const centerTaper = Math.max(0, 1 - distFromCenter * 0.4);

    const worldY = rawVal * Math.max(1.2, relief * 0.3) * centerTaper;
    posAttr.setY(i, worldY);

    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    if (row < gridRows && col < gridCols) {
      heightGrid[row]![col] = worldY;
    }
  }

  geom.computeVertexNormals();

  // 1. Matte Clay Base Terrain
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9e4dc, // Matte architectural clay
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  });

  const terrainMesh = new THREE.Mesh(geom, baseMaterial);

  // 2. Slope Overlay
  const { colors: slopeColors, stats: slopeStats } = computeSlopeVertexColors(geom);
  geom.setAttribute('color', new THREE.BufferAttribute(slopeColors, 3));

  // 3. Contours
  const contoursLine = generateContours(heightGrid, planeSize, planeSize, 0, Math.max(1.2, relief * 0.3), 8, 0.02);

  // 4. Footprint Line
  const fpRadius = Math.min(10, Math.max(3, (footprintRadiusM / 100) * 1.5));
  const fpGeom = new THREE.BufferGeometry();
  const fpPoints: number[] = [];
  const fpSegments = 32;
  for (let j = 0; j <= fpSegments; j++) {
    const angle = (j / fpSegments) * Math.PI * 2;
    const fx = Math.cos(angle) * fpRadius;
    const fz = Math.sin(angle) * fpRadius;
    fpPoints.push(fx, 0.05, fz);
  }
  fpGeom.setAttribute('position', new THREE.Float32BufferAttribute(fpPoints, 3));
  const fpMaterial = new THREE.LineBasicMaterial({
    color: 0x1f3a5f, // --accent
    linewidth: 2,
  });
  const footprintMesh = new THREE.LineSegments(fpGeom, fpMaterial);

  // Default layer visibility states
  contoursLine.visible = true;
  footprintMesh.visible = true;
  let slopeVisible = false;

  const setOverlayVisibility = (layer: 'contours' | 'slope' | 'footprint', visible: boolean) => {
    if (layer === 'contours') {
      contoursLine.visible = visible;
    } else if (layer === 'footprint') {
      footprintMesh.visible = visible;
    } else if (layer === 'slope') {
      slopeVisible = visible;
      baseMaterial.vertexColors = slopeVisible;
      baseMaterial.needsUpdate = true;
    }
  };

  return {
    terrainMesh,
    contoursLine,
    footprintMesh,
    stats: {
      minElevation: minElev,
      maxElevation: maxElev,
      relief,
      slope: slopeStats,
    },
    setOverlayVisibility,
  };
}
