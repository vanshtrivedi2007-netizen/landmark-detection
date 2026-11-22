import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { qualityManager } from './quality.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  container: HTMLElement;
  initialCameraPos: THREE.Vector3;
  initialTarget: THREE.Vector3;
  requestRender: () => void;
  resize: () => void;
  dispose: () => void;
}

export function createScene(container: HTMLElement): SceneContext | null {
  // Test WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) {
    return null;
  }

  const quality = qualityManager.getConfig();

  // 1. Renderer
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: quality.antialias,
    powerPreference: 'default',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  // 2. Scene & Camera
  const scene = new THREE.Scene();
  const aspect = container.clientWidth / (container.clientHeight || 1);
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
  const initialCameraPos = new THREE.Vector3(28, 22, 28);
  const initialTarget = new THREE.Vector3(0, 2, 0);
  camera.position.copy(initialCameraPos);

  // 3. OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(initialTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // No looking from below ground
  controls.minDistance = 6;
  controls.maxDistance = 120;
  controls.update();

  // 4. Lighting per doc 05 section 2
  // Soft hemisphere light (sky #FFFFFF, ground #E5E7EB, intensity 0.9)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe5e7eb, 0.9);
  scene.add(hemiLight);

  // Directional light with low-angle for relief (intensity 0.7)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(20, 28, 20);
  scene.add(dirLight);

  let renderRequested = false;
  const requestRender = () => {
    renderRequested = true;
  };

  controls.addEventListener('change', () => {
    requestRender();
  });

  // 5. ResizeObserver
  const resize = () => {
    if (!container || !renderer.domElement) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    requestRender();
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(container);

  // 6. Dispose cleanup
  const dispose = () => {
    resizeObserver.disconnect();
    controls.dispose();

    // Clean scene objects
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      } else if ((obj as THREE.LineSegments).isLineSegments) {
        const line = obj as THREE.LineSegments;
        if (line.geometry) line.geometry.dispose();
        if (Array.isArray(line.material)) {
          line.material.forEach((m) => m.dispose());
        } else if (line.material) {
          line.material.dispose();
        }
      }
    });

    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    container,
    initialCameraPos,
    initialTarget,
    requestRender,
    resize,
    dispose,
  };
}
