import { describe, it, expect } from 'vitest';
import { SeededNoise } from './terrain/noise.js';
import { generateContours } from './terrain/contours.js';
import { computeSlopeVertexColors } from './terrain/slope.js';
import { buildTerrainScene } from './terrain/heightfield.js';
import { buildLandmarkSilhouette, LANDMARK_MODELS } from './landmarks/index.js';
import { QualityManager } from './quality.js';
import * as THREE from 'three';

describe('Three.js 3D Subsystem', () => {
  describe('SeededNoise', () => {
    it('produces deterministic output for the same seed', () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(42);
      expect(n1.sample2D(1.23, 2.71)).toBe(n2.sample2D(1.23, 2.71));
      expect(n1.fbm2D(10, 20)).toBe(n2.fbm2D(10, 20));
    });

    it('produces different output for different seeds', () => {
      const n1 = new SeededNoise(42);
      const n2 = new SeededNoise(999);
      expect(n1.sample2D(1.23, 2.71)).not.toBe(n2.sample2D(1.23, 2.71));
    });
  });

  describe('Marching Squares Contours', () => {
    it('generates line segments for a synthetic height grid', () => {
      const grid = [
        [0, 1, 2],
        [1, 2, 3],
        [2, 3, 4],
      ];
      const contours = generateContours(grid, 10, 10, 0, 4, 4);
      expect(contours).toBeInstanceOf(THREE.LineSegments);
      expect(contours.geometry.getAttribute('position')).toBeDefined();
    });
  });

  describe('Slope Classification', () => {
    it('classifies flat vs tilted geometry slopes correctly', () => {
      const geom = new THREE.PlaneGeometry(10, 10, 2, 2);
      geom.rotateX(-Math.PI / 2);
      geom.computeVertexNormals();

      const { stats } = computeSlopeVertexColors(geom);
      // Perfectly flat plane should have 100% gentle slope (< 10 deg)
      expect(stats.gentlePct).toBe(100);
      expect(stats.moderatePct).toBe(0);
      expect(stats.steepPct).toBe(0);
    });
  });

  describe('Heightfield Scene Builder', () => {
    it('constructs terrain mesh, contours, footprint, and valid stats', () => {
      const terrain = buildTerrainScene('taj-mahal', [160, 175], 300, 32);
      expect(terrain.terrainMesh).toBeInstanceOf(THREE.Mesh);
      expect(terrain.contoursLine).toBeInstanceOf(THREE.LineSegments);
      expect(terrain.footprintMesh).toBeInstanceOf(THREE.LineSegments);

      expect(terrain.stats.minElevation).toBe(160);
      expect(terrain.stats.maxElevation).toBe(175);
      expect(terrain.stats.relief).toBe(15);
      expect(typeof terrain.stats.slope.gentlePct).toBe('number');
    });

    it('toggles layer visibility cleanly', () => {
      const terrain = buildTerrainScene('taj-mahal', [160, 175], 300, 32);
      terrain.setOverlayVisibility('contours', false);
      expect(terrain.contoursLine.visible).toBe(false);

      terrain.setOverlayVisibility('footprint', false);
      expect(terrain.footprintMesh.visible).toBe(false);

      terrain.setOverlayVisibility('slope', true);
      expect((terrain.terrainMesh.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
    });
  });

  describe('Landmark Silhouettes', () => {
    const slugs = ['taj-mahal', 'red-fort', 'qutub-minar', 'india-gate', 'hawa-mahal'];

    for (const slug of slugs) {
      it(`builds valid 3D model for ${slug}`, () => {
        const model = buildLandmarkSilhouette(slug);
        expect(model).toBeInstanceOf(THREE.Group);
        expect(model.children.length).toBeGreaterThan(0);
      });
    }

    it('covers all 5 seed catalogue landmarks in registry', () => {
      expect(Object.keys(LANDMARK_MODELS)).toEqual(
        expect.arrayContaining(['taj-mahal', 'red-fort', 'qutub-minar', 'india-gate', 'hawa-mahal'])
      );
    });
  });

  describe('Quality Manager', () => {
    it('initializes with standard tier', () => {
      const qm = new QualityManager();
      expect(qm.getConfig().tier).toBe('standard');
      expect(qm.getConfig().terrainSegments).toBe(128);
    });

    it('drops tier if average frame time exceeds 22ms over 120 frames', () => {
      const qm = new QualityManager();
      let now = 1000;
      // Simulate 120 slow frames of 30ms (> 22ms)
      for (let i = 0; i < 125; i++) {
        now += 30;
        qm.recordFrame(now);
      }
      expect(qm.getConfig().tier).toBe('low');
    });
  });
});
