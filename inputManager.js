export class InputManager {
    constructor() {
        this.keys = {};
        this.cameraDistance = 60;
        this.landingLightOn = false;

        window.addEventListener('keydown', (e) => {
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyF', 'KeyE', 'KeyG', 'KeyL'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;

            if (e.code === 'KeyL') {
                this.landingLightOn = !this.landingLightOn;
                console.log("Landing Light: " + (this.landingLightOn ? "ON" : "OFF"));
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('wheel', (e) => {
            this.cameraDistance += e.deltaY * 0.05;
            this.cameraDistance = Math.max(10, Math.min(60, this.cameraDistance));
        });
    }
}