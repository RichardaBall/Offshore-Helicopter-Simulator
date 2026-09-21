import * as THREE from 'three';

export class WinchSystem {
    constructor(scene) {
        this.scene = scene;
        
        this.winchState = 'UP'; // UP, LOWERING, DOWN, RAISING
        this.winchHeight = 0; // 0 = retracted at heli belly, max = distance to sea level
        this.winchHookMesh = null;
        this.winchCableLine = null;
        
        // Winch mounting offset position relative to helicopter center (calibrated)
        this.offsetX = -2.4;
        this.offsetY = 2.8;
        this.offsetZ = -1.55;

        // Maximum allowable flight speed for winch operation (25.0 m/s (~48 kts) for storm maneuvering)
        this.maxOperatingSpeed = 25.0;

        // Cable lowering/raising speed (reduced back to 12.0 m/s)
        this.cableSpeed = 12.0;
        
        this._initWinchMeshes();
    }

    _initWinchMeshes() {
        // Create Winch Hook (Yellow Ball) - halved radius (0.15)
        const hookGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const hookMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.3, roughness: 0.4 });
        this.winchHookMesh = new THREE.Mesh(hookGeo, hookMat);
        this.winchHookMesh.visible = false;
        this.winchHookMesh.frustumCulled = false;
        this.scene.add(this.winchHookMesh);
        
        // Create Winch Cable Line (Black Wire Rope)
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x111111 });
        this.winchCableLine = new THREE.Line(lineGeo, lineMat);
        this.winchCableLine.visible = false;
        this.winchCableLine.frustumCulled = false;
        this.scene.add(this.winchCableLine);
    }

    setOffset(x, y, z) {
        this.offsetX = x;
        this.offsetY = y;
        this.offsetZ = z;
    }

    getHelicopterSpeed(helicopterPlayer) {
        if (!helicopterPlayer) return 0;
        const move = helicopterPlayer.currentMoveSpeed || 0;
        const strafe = helicopterPlayer.currentStrafeSpeed || 0;
        const altitude = helicopterPlayer.currentAltitudeSpeed || 0;
        return Math.hypot(move, strafe, altitude);
    }

    toggleWinch(helicopterPlayer) {
        if (!helicopterPlayer || !helicopterPlayer.model) return;
        
        // Prevent winch operation if helicopter has crashed or landing gear is extended
        if (helicopterPlayer.hasCrashedInSea || helicopterPlayer.isPermanentlyDamaged || !helicopterPlayer.model.visible) {
            return;
        }

        // Prevent winch operation if landing gear is extended (isGearUp is false)
        if (!helicopterPlayer.isGearUp) {
            console.warn("Winch System: Cannot operate winch while landing gear is extended.");
            return;
        }

        const currentSpeed = this.getHelicopterSpeed(helicopterPlayer);

        if (this.winchState === 'UP' || this.winchState === 'RAISING') {
            // Prevent lowering winch if flight speed is above maximum operating speed threshold
            if (currentSpeed > this.maxOperatingSpeed) {
                console.warn(`Winch System: Cannot lower winch - aircraft speed (${currentSpeed.toFixed(1)} m/s) exceeds maximum winch operating speed (${this.maxOperatingSpeed.toFixed(1)} m/s).`);
                return;
            }
            this.winchState = 'LOWERING';
            this.winchHookMesh.visible = true;
            this.winchCableLine.visible = true;
            console.log("Winch System: Lowering rescue winch...");
        } else if (this.winchState === 'DOWN' || this.winchState === 'LOWERING') {
            this.winchState = 'RAISING';
            console.log("Winch System: Raising rescue winch...");
        }
    }

    getHookPosition() {
        return this.winchHookMesh ? this.winchHookMesh.position : new THREE.Vector3();
    }

    update(delta, helicopterPlayer) {
        if (!helicopterPlayer || !helicopterPlayer.model) return;

        // If helicopter has crashed or model is hidden, immediately reset and hide winch line and hook
        if (helicopterPlayer.hasCrashedInSea || helicopterPlayer.isPermanentlyDamaged || !helicopterPlayer.model.visible) {
            this.winchState = 'UP';
            this.winchHeight = 0;
            if (this.winchHookMesh) this.winchHookMesh.visible = false;
            if (this.winchCableLine) this.winchCableLine.visible = false;
            return;
        }

        const currentSpeed = this.getHelicopterSpeed(helicopterPlayer);

        // If landing gear is extended (!isGearUp), automatically retract winch if it is deployed or lowering
        if (!helicopterPlayer.isGearUp) {
            if (this.winchState === 'LOWERING' || this.winchState === 'DOWN') {
                this.winchState = 'RAISING';
                console.log("Winch System: Landing gear extended, automatically retracting winch...");
            }
        }

        // If helicopter speed exceeds operating speed limit, automatically retract winch if lowering or deployed
        if (currentSpeed > this.maxOperatingSpeed) {
            if (this.winchState === 'LOWERING' || this.winchState === 'DOWN') {
                this.winchState = 'RAISING';
                console.log(`Winch System: Airspeed (${currentSpeed.toFixed(1)} m/s) exceeded operating threshold (${this.maxOperatingSpeed.toFixed(1)} m/s), automatically retracting winch...`);
            }
        }

        const heliPos = helicopterPlayer.model.position;
        const mountOffset = new THREE.Vector3(this.offsetX, this.offsetY, this.offsetZ);
        mountOffset.applyQuaternion(helicopterPlayer.model.quaternion);
        const heliBottomPos = heliPos.clone().add(mountOffset);
        
        const targetSeaLevel = 0;
        const maxExtension = Math.max(5.0, heliPos.y - targetSeaLevel);

        if (this.winchState === 'LOWERING') {
            this.winchHeight += delta * this.cableSpeed;
            if (this.winchHeight >= maxExtension) {
                this.winchHeight = maxExtension;
                this.winchState = 'DOWN';
            }
        } else if (this.winchState === 'RAISING') {
            this.winchHeight -= delta * this.cableSpeed;
            if (this.winchHeight <= 0) {
                this.winchHeight = 0;
                this.winchState = 'UP';
                this.winchHookMesh.visible = false;
                this.winchCableLine.visible = false;
            }
        }

        // Position winch hook and cable line
        const hookPos = heliBottomPos.clone().add(new THREE.Vector3(0, -this.winchHeight, 0));
        if (this.winchHookMesh && this.winchCableLine) {
            this.winchHookMesh.position.copy(hookPos);
            
            const positions = this.winchCableLine.geometry.attributes.position.array;
            positions[0] = heliBottomPos.x;
            positions[1] = heliBottomPos.y;
            positions[2] = heliBottomPos.z;
            positions[3] = hookPos.x;
            positions[4] = hookPos.y;
            positions[5] = hookPos.z;
            this.winchCableLine.geometry.attributes.position.needsUpdate = true;
            this.winchCableLine.geometry.computeBoundingSphere();
        }
    }
}