/**
 * winchSystem.js
 * Standalone winch cable system managing cable deployment from the helicopter down to sea level.
 * Controlled via the [X] key.
 */
import * as THREE from 'three';

export class WinchSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Winch state properties
        this.isLowering = false;
        this.winchLength = 0.0;     // Current extension length in meters
        this.maxLength = 50.0;      // Maximum winch cable length
        this.winchSpeed = 12.0;     // Meters per second lowering/raising speed
        this.targetLength = 0.0;

        // Visual Meshes
        this.cableMesh = null;
        this.hookMesh = null;

        this.initMeshes();
        this.initInputListener();
    }

    initMeshes() {
        // Create winch cable mesh (thin vertical cylinder)
        const cableGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
        cableGeo.translate(0, -0.5, 0); // Pivot at the top (helicopter belly)
        const cableMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        this.cableMesh = new THREE.Mesh(cableGeo, cableMat);
        this.cableMesh.visible = false;
        this.scene.add(this.cableMesh);

        // Create winch hook / rescue device at the cable end
        const hookGeo = new THREE.SphereGeometry(0.2, 12, 12);
        const hookMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
        this.hookMesh = new THREE.Mesh(hookGeo, hookMat);
        this.hookMesh.visible = false;
        this.scene.add(this.hookMesh);
    }

    initInputListener() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X') {
                this.toggleWinch();
            }
        });
    }

    toggleWinch() {
        // Toggle target extension: if retracted or raising, lower to sea level; if lowered, raise back up
        if (this.targetLength <= 0.5) {
            this.targetLength = -1; // Flag to indicate lowering to sea level dynamically
            console.log("Winch: Lowering cable to sea level...");
        } else {
            this.targetLength = 0.0;
            console.log("Winch: Raising cable to helicopter...");
        }
    }

    update(helicopterPosition, delta) {
        if (!helicopterPosition) return;

        // Determine sea-level target length based on helicopter altitude above water (y = 0)
        const heliY = helicopterPosition.y;
        const distanceToSea = Math.max(0.0, heliY - 0.0);

        if (this.targetLength !== 0.0) {
            // Lowering mode: target is distance to sea level
            const desiredLength = Math.min(this.maxLength, distanceToSea);
            if (this.winchLength < desiredLength) {
                this.winchLength += this.winchSpeed * delta;
                if (this.winchLength > desiredLength) this.winchLength = desiredLength;
            }
        } else {
            // Raising mode: retract back to 0
            if (this.winchLength > 0.0) {
                this.winchLength -= this.winchSpeed * delta;
                if (this.winchLength < 0.0) this.winchLength = 0.0;
            }
        }

        // Update mesh visibility and transformations
        if (this.winchLength > 0.1) {
            this.cableMesh.visible = true;
            this.hookMesh.visible = true;

            // Position at helicopter belly (slightly below pivot)
            const topPos = helicopterPosition.clone().add(new THREE.Vector3(0, -0.6, 0));
            const bottomPos = topPos.clone().add(new THREE.Vector3(0, -this.winchLength, 0));
            const midPos = topPos.clone().add(bottomPos).multiplyScalar(0.5);

            // Scale and orient cable cylinder
            this.cableMesh.position.copy(midPos);
            this.cableMesh.scale.set(1, Math.max(0.1, this.winchLength), 1);
            this.cableMesh.lookAt(bottomPos);

            // Position hook at cable end
            this.hookMesh.position.copy(bottomPos);
        } else {
            this.cableMesh.visible = false;
            this.hookMesh.visible = false;
        }
    }
}