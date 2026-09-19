import * as THREE from 'three';

export class SirenSystem {
    constructor(scene, oilRigGroup) {
        this.scene = scene;
        this.oilRigGroup = oilRigGroup;
        this.sirens = [];

        // Updated with your exported position and rotation coordinates
        this.currentPos = new THREE.Vector3(-6.50, 11.00, -15.00);
        this.currentRot = new THREE.Vector3(0, 0.26, 0);
        this.stepSize = 0.5;
        this.placerActive = false;

        this.initSiren(this.currentPos, this.currentRot);
        this.initPlacerControls();
    }

    initSiren(position, rotation) {
        this.sirenGroup = new THREE.Group();
        this.sirenGroup.position.copy(position);
        this.sirenGroup.rotation.set(rotation.x, rotation.y, rotation.z);

        // --- 1. Visual Representation: Base Cylinder & Glowing Bulb ---
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
        this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
        this.baseMesh.position.set(0, 0.4, 0);
        this.sirenGroup.add(this.baseMesh);

        // Emergency Red Point Light
        this.light = new THREE.PointLight(0xff0000, 0.0, 35);
        this.light.position.set(0, 1.2, 0);
        this.light.castShadow = false;
        this.sirenGroup.add(this.light);

        // Glowing Bulb Mesh
        const bulbGeo = new THREE.SphereGeometry(0.4, 16, 16);
        this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.bulb = new THREE.Mesh(bulbGeo, this.bulbMat);
        this.bulb.position.copy(this.light.position);
        this.sirenGroup.add(this.bulb);

        // Rotating Beacon Cone / Beam Effect for High Realism
        const coneGeo = new THREE.ConeGeometry(0.8, 2.5, 16, 1, true);
        coneGeo.translate(0, -1.2, 0);
        coneGeo.rotateX(Math.PI / 2);
        const coneMat = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.beaconCone = new THREE.Mesh(coneGeo, coneMat);
        this.beaconCone.position.copy(this.light.position);
        this.sirenGroup.add(this.beaconCone);

        // Attach to Oil Rig mainbase model if available, otherwise fallback to scene
        if (this.oilRigGroup) {
            this.oilRigGroup.add(this.sirenGroup);
        } else {
            this.scene.add(this.sirenGroup);
        }

        this.sirens.push({
            group: this.sirenGroup,
            light: this.light,
            bulb: this.bulb,
            cone: this.beaconCone
        });

        this.logConfiguration("INITIALIZED WITH SAVED COORDS");
    }

    // --- 2. Interactive Keyboard Placer ---
    initPlacerControls() {
        window.addEventListener('keydown', (e) => {
            // Toggle placement mode with [O]
            if (e.code === 'KeyO' || e.key === 'o' || e.key === 'O') {
                this.placerActive = !this.placerActive;
                console.log(`%c [SIREN PLACER] Mode Active: ${this.placerActive} `, 'background: #007acc; color: #fff; padding: 2px 6px; font-weight: bold;');
                return;
            }

            if (!this.placerActive) return;

            let modified = false;
            this.stepSize = e.shiftKey ? 0.1 : 0.5;

            // X-Axis (Left / Right): Arrow Keys or [J] / [L]
            if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.code === 'KeyJ' || e.key === 'j' || e.key === 'J') { 
                this.currentPos.x -= this.stepSize; modified = true; 
            }
            if (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.code === 'KeyL' || e.key === 'l' || e.key === 'L') { 
                this.currentPos.x += this.stepSize; modified = true; 
            }

            // Z-Axis (Forward / Backward): Arrow Keys or [U] / [K]
            if (e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.code === 'KeyU' || e.key === 'u' || e.key === 'U') { 
                this.currentPos.z -= this.stepSize; modified = true; 
            }
            if (e.code === 'ArrowDown' || e.key === 'ArrowDown' || e.code === 'KeyK' || e.key === 'k' || e.key === 'K') { 
                this.currentPos.z += this.stepSize; modified = true; 
            }

            // Y-Axis (Up / Down): [R] / [F]
            if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') { 
                this.currentPos.y += this.stepSize; modified = true; 
            }
            if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') { 
                this.currentPos.y -= this.stepSize; modified = true; 
            }

            // Rotation adjustments: [Z] / [X]
            if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') { 
                this.currentRot.y -= THREE.MathUtils.degToRad(15); modified = true; 
            }
            if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X') { 
                this.currentRot.y += THREE.MathUtils.degToRad(15); modified = true; 
            }

            if (modified) {
                e.preventDefault();
                if (this.sirenGroup) {
                    this.sirenGroup.position.copy(this.currentPos);
                    this.sirenGroup.rotation.set(this.currentRot.x, this.currentRot.y, this.currentRot.z);
                }
                // --- 3. Live Console Logging ---
                this.logConfiguration("UPDATED");
            }

            // --- 4. Export Functionality ---
            if (e.code === 'Enter' || e.code === 'KeyP' || e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
                this.exportConfiguration();
            }
        });

        console.log(`%c [SIREN PLACER] Loaded! Press [O] to toggle. Move: [J]/[L] (X), [U]/[K] (Z), [R]/[F] (Y). Rotate: [Z]/[X]. Shift for fine steps. [P] or [Enter] to export. `, 'background: #28a745; color: #fff; padding: 4px; font-weight: bold;');
    }

    logConfiguration(status) {
        console.log(
            `%c [SIREN CONFIG - ${status}] `, 
            'background: #333; color: #ffcc00; padding: 2px 4px; font-weight: bold;',
            `position: { x: ${this.currentPos.x.toFixed(2)}, y: ${this.currentPos.y.toFixed(2)}, z: ${this.currentPos.z.toFixed(2)} }, ` +
            `rotation: { x: ${this.currentRot.x.toFixed(2)}, y: ${this.currentRot.y.toFixed(2)}, z: ${this.currentRot.z.toFixed(2)} }`
        );
    }

    exportConfiguration() {
        console.log(`\n==================================================`);
        console.log(`%c [SIREN FINAL EXPORT CODE SNIPPET] `, 'background: #d9534f; color: #fff; padding: 4px; font-weight: bold;');
        console.log(`const sirenPosition = new THREE.Vector3(${this.currentPos.x.toFixed(2)}, ${this.currentPos.y.toFixed(2)}, ${this.currentPos.z.toFixed(2)});`);
        console.log(`const sirenRotation = new THREE.Euler(${this.currentRot.y.toFixed(2)});\n`);
        console.log(`==================================================\n`);
    }

    update(delta, windFarm) {
        const emergencyActive = windFarm && windFarm.activeFireIndex !== -1;

        this.sirens.forEach(siren => {
            if (emergencyActive || this.placerActive) {
                if (siren.cone) {
                    siren.cone.rotation.y += delta * 18.0;
                }

                const time = Date.now() * 0.009;
                const flash = Math.sin(time * 12.0) > 0 ? 1.0 : 0.15;
                siren.light.intensity = 12.0 * flash;
                siren.bulb.visible = true;
                if (siren.cone) siren.cone.visible = true;
            } else {
                siren.light.intensity = 0.0;
                siren.bulb.visible = false;
                if (siren.cone) siren.cone.visible = false;
            }
        });
    }
}