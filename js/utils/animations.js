export function animatePlaceNumber(scene, r, c, value, left, top, cellSize) {
  const x = left + c*cellSize + cellSize/2;
  const y = top + r*cellSize + cellSize/2;
  // find text object if exists
  try {
    const spr = scene.tileSprites[r][c];
    spr.txt.setText(String(value));
    spr.txt.setScale(0.6);
    scene.tweens.add({
      targets: spr.txt,
      scaleX: 1.05, scaleY: 1.05, duration: 180, yoyo: true
    });
  } catch(e){}
}

export function animateInvalid(scene, r, c, left, top, cellSize) {
  try {
    const spr = scene.tileSprites[r][c];
    scene.tweens.add({
      targets: spr.bg,
      scaleX: 0.96, scaleY: 0.96, duration: 100, yoyo: true
    });
    scene.cameras.main.shake(100, 0.002);
  } catch(e){}
}

export function animatePlaceBlack(scene, r, c, left, top, cellSize) {
  try {
    const spr = scene.tileSprites[r][c];
    spr.bg.setFillStyle(0x0b0b0d);
    const p = scene.add.circle(spr.x, spr.y, 6, 0x333333, 0.6);
    scene.tweens.add({ targets:p, scale:2, alpha:0, duration:400, onComplete: ()=> p.destroy()});
  } catch(e){}
}
