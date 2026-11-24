import * as THREE from 'three';

export const revealDuration = 1.45;
const pageWidth = .58;
const pageHeight = .725;

function makePageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ink = canvas.getContext('2d');
  ink.fillStyle = '#efdfad';
  ink.fillRect(0, 0, 512, 640);
  ink.strokeStyle = '#9c7041';
  ink.lineWidth = 4;
  ink.strokeRect(22, 22, 468, 596);
  ink.fillStyle = '#38251a';
  ink.textAlign = 'center';
  ink.font = '28px Georgia';
  ink.fillText('A R C H I V E   A - 1 7', 256, 114);
  ink.font = '58px Georgia';
  ink.fillText('The night', 256, 235);
  ink.fillText('inventory', 256, 305);
  ink.strokeStyle = '#655139';
  for (let y = 380; y <= 520; y += 35) {
    ink.beginPath();
    ink.moveTo(93, y);
    ink.lineTo(y === 520 ? 304 : 419, y);
    ink.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function loadReveal(sealUrl) {
  const seal = await new THREE.TextureLoader().loadAsync(sealUrl);
  seal.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const well = new THREE.Mesh(
    new THREE.PlaneGeometry(.985, .985),
    new THREE.MeshBasicMaterial({ color: 0x221a13 })
  );
  group.add(well);

  const hinge = new THREE.Group();
  hinge.position.set(-.5, 0, .012);
  group.add(hinge);
  const cover = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: seal, side: THREE.DoubleSide })
  );
  cover.position.x = .5;
  hinge.add(cover);

  const pageTexture = makePageTexture();
  const page = new THREE.Mesh(
    new THREE.PlaneGeometry(pageWidth, pageHeight),
    new THREE.MeshBasicMaterial({ map: pageTexture, side: THREE.DoubleSide, toneMapped: false })
  );
  group.add(page);

  const smooth = (t) => {
    const x = THREE.MathUtils.clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };

  return {
    group,
    takePage(camera, bounds) {
      page.updateWorldMatrix(true, false);
      // Keep the four projected corners so the screen-space page starts at the tracked pose.
      const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => {
        const point = new THREE.Vector3(x * pageWidth / 2, y * pageHeight / 2, 0);
        point.applyMatrix4(page.matrixWorld).project(camera);
        return [
          bounds.left + (point.x + 1) * bounds.width / 2,
          bounds.top + (1 - point.y) * bounds.height / 2,
        ];
      });
      page.visible = false;
      return { artwork: pageTexture.image, corners };
    },
    update(seconds) {
      const opening = smooth((seconds - .22) / .92);
      const lift = smooth((seconds - .58) / .87);
      hinge.rotation.y = -1.65 * opening;
      cover.material.color.setScalar(1.0 - .3 * Math.sin(Math.PI * smooth(seconds / .65)));
      page.visible = seconds > .62;
      page.position.set(.10, -.07 + .16 * lift, .025 + .23 * lift);
      page.rotation.set(-.19 * (1 - lift), .22 * (1 - lift), -.09);
      page.scale.setScalar(.67 + .33 * lift);
    },
  };
}
