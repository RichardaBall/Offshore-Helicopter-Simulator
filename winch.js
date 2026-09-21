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

    toggleWinch(helicopterPlayer) {
        if (!helicopterPlayer || !helicopterPlayer.model) return;
        
        // Prevent winch operation if landing gear is extended (isGearUp is false)
        if (!helicopterPlayer.isGearUp) {
            console.warn("Winch System: Cannot operate winch while landing gear is extended.");
            return;
        }

        if (this.winchState === 'UP' || this.winchState === 'RAISING') {
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

        // If landing gear is extended (!isGearUp), automatically retract winch if it is deployed or lowering
        if (!helicopterPlayer.isGearUp) {
            if (this.winchState === 'LOWERING' || this.winchState === 'DOWN') {
                this.winchState = 'RAISING';
                console.log("Winch System: Landing gear extended, automatically retracting winch...");
            }
        }

        const heliPos = helicopterPlayer.model.position;
        const mountOffset = new THREE.Vector3(this.offsetX, this.offsetY, this.offsetZ);
        mountOffset.applyQuaternion(helicopterPlayer.model.quaternion);
        const heliBottomPos = heliPos.clone().add(mountOffset);
        
        const targetSeaLevel = 0;
        const maxExtension = Math.max(5.0, heliPos.y - targetSeaLevel);

        if (this.winchState === 'LOWERING') {
            this.winchHeight += delta * 12;
            if (this.winchHeight >= maxExtension) {
                this.winchHeight = maxExtension;
                this.winchState = 'DOWN';
            }
        } else if (this.winchState === 'RAISING') {
            this.winchHeight -= delta * 12;
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