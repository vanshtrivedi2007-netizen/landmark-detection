import * as THREE from 'three';

function makeWireframeMesh(geometry: THREE.BufferGeometry): THREE.Group {
  const group = new THREE.Group();

  // Faint solid fill per doc 05 section 3.2
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xf3f4f6, // --bg-sunken
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, fillMat);
  group.add(mesh);

  // Sharp edge lines
  const edges = new THREE.EdgesGeometry(geometry, 25);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x111827, // --text-strong
    transparent: true,
    opacity: 0.55,
  });
  const lines = new THREE.LineSegments(edges, lineMat);
  group.add(lines);

  return group;
}

export function buildTajMahal(): THREE.Group {
  const model = new THREE.Group();

  // 1. Plinth (Square raised platform)
  const plinth = makeWireframeMesh(new THREE.BoxGeometry(16, 1.2, 16));
  plinth.position.y = 0.6;
  model.add(plinth);

  // 2. Central Tomb Block
  const tomb = makeWireframeMesh(new THREE.BoxGeometry(9, 7, 9));
  tomb.position.y = 1.2 + 3.5;
  model.add(tomb);

  // 3. Central Drum
  const drum = makeWireframeMesh(new THREE.CylinderGeometry(2.8, 2.8, 2.4, 24));
  drum.position.y = 1.2 + 7 + 1.2;
  model.add(drum);

  // 4. Central Onion Dome
  const dome = makeWireframeMesh(new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.7));
  dome.position.y = 1.2 + 7 + 2.4 + 1.2;
  dome.scale.set(1, 1.25, 1);
  model.add(dome);

  // 5. Four Corner Minarets
  const minaretOffsets = [
    [-6.8, -6.8],
    [6.8, -6.8],
    [-6.8, 6.8],
    [6.8, 6.8],
  ];

  for (const [mx, mz] of minaretOffsets) {
    const minaret = makeWireframeMesh(new THREE.CylinderGeometry(0.5, 0.75, 13, 16));
    minaret.position.set(mx, 1.2 + 6.5, mz);
    model.add(minaret);

    // Minaret domelet
    const cupola = makeWireframeMesh(new THREE.SphereGeometry(0.65, 12, 8));
    cupola.position.set(mx, 1.2 + 13 + 0.6, mz);
    model.add(cupola);
  }

  // 6. Corner Chhatris on tomb roof
  const chhatriOffsets = [
    [-3.2, -3.2],
    [3.2, -3.2],
    [-3.2, 3.2],
    [3.2, 3.2],
  ];
  for (const [cx, cz] of chhatriOffsets) {
    const chhatri = makeWireframeMesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 8));
    chhatri.position.set(cx, 1.2 + 7 + 0.8, cz);
    model.add(chhatri);
  }

  model.scale.set(0.6, 0.6, 0.6);
  return model;
}

export function buildRedFort(): THREE.Group {
  const model = new THREE.Group();

  // 1. Rampart curtain wall
  const wall = makeWireframeMesh(new THREE.BoxGeometry(22, 6, 8));
  wall.position.y = 3;
  model.add(wall);

  // 2. Lahori Gate Central Portal
  const portal = makeWireframeMesh(new THREE.BoxGeometry(6, 9, 9));
  portal.position.y = 4.5;
  model.add(portal);

  // 3. Flanking Octagonal Bastions
  const leftBastion = makeWireframeMesh(new THREE.CylinderGeometry(2, 2.3, 10, 8));
  leftBastion.position.set(-4.5, 5, 1.5);
  model.add(leftBastion);

  const rightBastion = makeWireframeMesh(new THREE.CylinderGeometry(2, 2.3, 10, 8));
  rightBastion.position.set(4.5, 5, 1.5);
  model.add(rightBastion);

  // 4. Roofline Chhatris
  const chhatriOffsets = [-8, -4.5, 0, 4.5, 8];
  for (const cx of chhatriOffsets) {
    const chhatri = makeWireframeMesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 6));
    chhatri.position.set(cx, 10.5, 1.5);
    model.add(chhatri);
  }

  model.scale.set(0.55, 0.55, 0.55);
  return model;
}

export function buildQutubMinar(): THREE.Group {
  const model = new THREE.Group();

  // 5 storeys with decreasing diameter
  const storeys = [
    { bottomR: 3.5, topR: 3.0, height: 7, yBase: 0 },
    { bottomR: 2.9, topR: 2.4, height: 5.5, yBase: 7 },
    { bottomR: 2.3, topR: 1.8, height: 4.5, yBase: 12.5 },
    { bottomR: 1.7, topR: 1.3, height: 3.5, yBase: 17 },
    { bottomR: 1.2, topR: 0.9, height: 3.0, yBase: 20.5 },
  ];

  for (const st of storeys) {
    const shaft = makeWireframeMesh(new THREE.CylinderGeometry(st.topR, st.bottomR, st.height, 24));
    shaft.position.y = st.yBase + st.height / 2;
    model.add(shaft);

    // Projecting Balcony at the top of each storey
    const balcony = makeWireframeMesh(new THREE.CylinderGeometry(st.topR + 0.4, st.topR + 0.1, 0.5, 24));
    balcony.position.y = st.yBase + st.height;
    model.add(balcony);
  }

  // Finial
  const finial = makeWireframeMesh(new THREE.SphereGeometry(0.8, 12, 8));
  finial.position.y = 24;
  model.add(finial);

  model.scale.set(0.5, 0.5, 0.5);
  return model;
}

export function buildIndiaGate(): THREE.Group {
  const model = new THREE.Group();

  // 1. Base plinth
  const plinth = makeWireframeMesh(new THREE.BoxGeometry(14, 1.5, 9));
  plinth.position.y = 0.75;
  model.add(plinth);

  // 2. Left Pylon
  const leftPylon = makeWireframeMesh(new THREE.BoxGeometry(3.5, 11, 8));
  leftPylon.position.set(-3.75, 1.5 + 5.5, 0);
  model.add(leftPylon);

  // 3. Right Pylon
  const rightPylon = makeWireframeMesh(new THREE.BoxGeometry(3.5, 11, 8));
  rightPylon.position.set(3.75, 1.5 + 5.5, 0);
  model.add(rightPylon);

  // 4. Central Archway Lintel
  const lintel = makeWireframeMesh(new THREE.BoxGeometry(11, 3, 8));
  lintel.position.set(0, 1.5 + 11 + 1.5, 0);
  model.add(lintel);

  // 5. Stepped Attic Structure
  const atticLower = makeWireframeMesh(new THREE.BoxGeometry(12, 2.5, 7.5));
  atticLower.position.set(0, 1.5 + 14 + 1.25, 0);
  model.add(atticLower);

  const atticUpper = makeWireframeMesh(new THREE.BoxGeometry(9, 1.8, 6));
  atticUpper.position.set(0, 1.5 + 16.5 + 0.9, 0);
  model.add(atticUpper);

  // 6. Low decorative bowl / dome on roof
  const bowl = makeWireframeMesh(new THREE.CylinderGeometry(2.5, 2.0, 0.8, 16));
  bowl.position.set(0, 1.5 + 18.3 + 0.4, 0);
  model.add(bowl);

  model.scale.set(0.55, 0.55, 0.55);
  return model;
}

export function buildHawaMahal(): THREE.Group {
  const model = new THREE.Group();

  // Stepped 5-tier pyramidal facade
  const tiers = [
    { width: 18, height: 3.5, depth: 3, y: 1.75 },
    { width: 15, height: 3.5, depth: 2.6, y: 3.5 + 1.75 },
    { width: 12, height: 3.2, depth: 2.2, y: 7 + 1.6 },
    { width: 9, height: 3.0, depth: 1.8, y: 10.2 + 1.5 },
    { width: 5.5, height: 2.5, depth: 1.5, y: 13.2 + 1.25 },
  ];

  for (const tier of tiers) {
    const block = makeWireframeMesh(new THREE.BoxGeometry(tier.width, tier.height, tier.depth));
    block.position.set(0, tier.y, 0);
    model.add(block);

    // Front protruding bay windows (jharokhas)
    const bays = Math.floor(tier.width / 2.2);
    for (let i = 0; i < bays; i++) {
      const bx = (i - (bays - 1) / 2) * 2.2;
      const jharokha = makeWireframeMesh(new THREE.BoxGeometry(1.2, tier.height * 0.7, 0.8));
      jharokha.position.set(bx, tier.y, tier.depth / 2 + 0.4);
      model.add(jharokha);
    }
  }

  // Top decorative crest
  const crest = makeWireframeMesh(new THREE.CylinderGeometry(0.8, 1.2, 1.0, 8));
  crest.position.set(0, 16.2, 0);
  model.add(crest);

  model.scale.set(0.55, 0.55, 0.55);
  return model;
}

export const LANDMARK_MODELS: Record<string, () => THREE.Group> = {
  'taj-mahal': buildTajMahal,
  'red-fort': buildRedFort,
  'qutub-minar': buildQutubMinar,
  'india-gate': buildIndiaGate,
  'hawa-mahal': buildHawaMahal,
};

export function buildLandmarkSilhouette(slug: string): THREE.Group {
  const builder = LANDMARK_MODELS[slug] || buildTajMahal;
  return builder();
}
