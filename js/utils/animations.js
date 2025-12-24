// js/utils/animations.js

/**
 * Animate placing a number with a "pop" effect and particles.
 */
export function animatePlaceNumber(scene, r, c, value, left, top, cellSize) {
  const spr = scene.tileSprites[r][c];

  // 1. Text Pop-in
  spr.txt.setText(String(value));
  spr.txt.setScale(0);
  spr.txt.setAlpha(0);

  scene.tweens.add({
    targets: spr.txt,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    duration: 400,
    ease: 'Back.out(1.7)'
  });

  // 2. Tile Recoil
  scene.tweens.add({
    targets: spr.bg,
    scaleX: 1.1,
    scaleY: 0.9,
    duration: 100,
    yoyo: true,
    ease: 'Quad.out'
  });

  // 3. Particles
  createBurst(scene, spr.bg.x, spr.bg.y, 0x66d3ff);
}

/**
 * Animate placing a Black Tile.
 */
export function animatePlaceBlack(scene, r, c, isBlack, left, top, cellSize) {
  const spr = scene.tileSprites[r][c];

  if (isBlack) {
    spr.bg.setFillStyle(0xffffff); 
    
    scene.tweens.addCounter({
      from: 255, to: 0, duration: 300,
      onUpdate: (tween) => {
        const val = Math.floor(tween.getValue());
        const color = Phaser.Display.Color.GetColor(val, val, val);
        spr.bg.setFillStyle(color);
      },
      onComplete: () => spr.bg.setFillStyle(0x07070a)
    });

    spr.txt.setText('');

    const ring = scene.add.circle(spr.bg.x, spr.bg.y, 10);
    ring.setStrokeStyle(4, 0x000000);
    
    scene.tweens.add({
      targets: ring, scale: 3, alpha: 0, duration: 500, ease: 'Cubic.out',
      onComplete: () => ring.destroy()
    });

    scene.cameras.main.shake(100, 0.005);
  }
}

/**
 * FIX: Pulse effect that ensures only ONE tile blinks at a time.
 */
export function pulseTile(scene, r, c) {
  const spr = scene.tileSprites[r][c];

  // 1. Check if we are clicking the same tile that is already pulsing
  if (scene.currentSelection === spr.bg) {
    return; // It's already pulsing, do nothing
  }

  // 2. CLEANUP: Stop the *previous* tile from pulsing
  if (scene.currentSelectionTween) {
    scene.currentSelectionTween.stop(); // Stop the animation
    scene.currentSelectionTween = null;
  }
  
  if (scene.currentSelection) {
    scene.currentSelection.setScale(1); // Reset size instantly
    scene.currentSelection = null;
  }

  // 3. START: Pulse the new tile
  scene.currentSelection = spr.bg; // Track this tile as the active one

  scene.currentSelectionTween = scene.tweens.add({
    targets: spr.bg,
    scaleX: 1.05,
    scaleY: 1.05,
    duration: 300,
    yoyo: true,
    repeat: -1, // Infinite loop
    ease: 'Sine.inOut'
  });
}

/**
 * New Helper: Call this if you want to stop ALL pulsing (e.g. clicking outside board)
 */
export function stopPulse(scene) {
  if (scene.currentSelectionTween) {
    scene.currentSelectionTween.stop();
    scene.currentSelectionTween = null;
  }
  if (scene.currentSelection) {
    scene.currentSelection.setScale(1);
    scene.currentSelection = null;
  }
}

/**
 * Error flash.
 */
export function flashTile(scene, r, c, color = 0xff4444) {
  const spr = scene.tileSprites[r][c];
  // If we flash a tile, we temporarily pause the pulse logic if it's the selected one
  // but usually flashing happens on invalid moves, so we just animate color.
  
  const origColor = scene.board[r][c].isBlack ? 0x07070a : 0x22222a; 

  spr.bg.setFillStyle(color);
  scene.time.delayedCall(300, () => {
     // Restore original color
     spr.bg.setFillStyle(origColor);
  });

  scene.tweens.add({
    targets: [spr.bg, spr.txt],
    x: '+=5',
    duration: 50,
    yoyo: true,
    repeat: 3,
    ease: 'Bounce.inOut'
  });
}

/**
 * Helper: Particle burst.
 */
function createBurst(scene, x, y, tint) {
  for (let i = 0; i < 8; i++) {
    const p = scene.add.rectangle(x, y, 4, 4, tint);
    const angle = Phaser.Math.Between(0, 360);
    const speed = Phaser.Math.Between(30, 60);
    const rad = Phaser.Math.DegToRad(angle);
    
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(rad) * speed,
      y: y + Math.sin(rad) * speed,
      scale: 0,
      alpha: 0,
      angle: angle + 90,
      duration: Phaser.Math.Between(400, 600),
      ease: 'Quad.out',
      onComplete: () => p.destroy()
    });
  }
}