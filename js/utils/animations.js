export function animatePlaceNumber(scene, r, c, value, left, top, cellSize){
  const spr = scene.tileSprites[r][c];
  spr.txt.setText(String(value));
  spr.txt.setScale(0.3);
  scene.tweens.add({ targets: spr.txt, scaleX:1, scaleY:1, duration:200, ease:'Back' });
  scene.tweens.add({ targets: spr.bg, scaleX: 0.98, scaleY:0.98, duration:120, yoyo:true });
}

export function animatePlaceBlack(scene, r, c, isBlack, left, top, cellSize){
  const spr = scene.tileSprites[r][c];
  if (isBlack){
    spr.bg.setFillStyle(0x07070a);
    spr.txt.setText('');
    const p = scene.add.circle(spr.bg.x, spr.bg.y, 10, 0x111111, 0.9);
    scene.tweens.add({ targets: p, alpha:0, scale:2, duration:420, onComplete: ()=>p.destroy() });
  }
}

export function pulseTile(scene, r, c){ const spr = scene.tileSprites[r][c]; scene.tweens.add({ targets: spr.bg, scaleX:1.02, scaleY:1.02, duration:160, yoyo:true }); }

export function flashTile(scene, r, c, color=0xff4444){ const spr = scene.tileSprites[r][c]; const orig = spr.bg.fillColor; spr.bg.setFillStyle(color); scene.time.delayedCall(220, ()=> spr.bg.setFillStyle(orig)); }
