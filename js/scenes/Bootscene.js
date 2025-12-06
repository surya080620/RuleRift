export default class BootScene extends Phaser.Scene {
    constructor() {
        super("BootScene");
    }

    preload() {
        console.log("Loading assets...");
    }

    create() {
        console.log("BootScene loaded!");
        this.add.text(200, 200, "RuleRift Booting...", { font: "32px Arial", fill: "#ffffff" });
    }
}
