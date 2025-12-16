export function placeNumber(scene, r, c, v, left, top, size) {
  const spr = scene.tileSprites[r][c];
  spr.txt.setText(String(v));
  spr.txt.setScale(0.6);
  scene.tweens.add({
    targets: spr.txt, scaleX: 1, scaleY: 1, duration: 160, ease:'Back'
  });
}

export function placeBlack(scene, r, c, left, top, size) {
  const spr = scene.tileSprites[r][c];
  spr.bg.setFillStyle(0x0b0b0d);
  const p = scene.add.circle(spr.bg.x, spr.bg.y, 6, 0x222222, 0.8);
  scene.tweens.add({ targets: p, alpha: 0, scale: 2, duration: 360, onComplete: ()=>p.destroy() });
}

export function flashInvalid(scene) {
  scene.cameras.main.flash(220, 160, 20, 40);
}
