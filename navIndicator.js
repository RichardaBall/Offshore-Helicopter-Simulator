/**
 * navIndicator.js
 * 3D Tactical NDB Bearing Indicator.
 * - Parented directly to the helicopter rotor hub axis.
 * - Transparent ring bezel with a vibrant neon-glowing amber pointer needle.
 */
import * as THREE from 'three';

export class NavIndicator {
    constructor(player, targetPosition, navRadioInstance, scene, helicopterMesh, config = { x: -1.6, y: 3.95, z: 0.16, ringOD: 0.49, arrowLength: 0.64 }) {
        this.player = player;
        this.targetPosition = targetPosition;
        this.navRadio = navRadioInstance;
        this.scene = scene;
        this.helicopterMesh = helicopterMesh;

        // Position offsets
        this.offsetX = config.x;
        this.offsetY = config.y;
        this.offsetZ = config.z;

        // Dimensions
        this.ringOD = config.ringOD !== undefined ? config.ringOD : 0.49;
        this.arrowLength = config.arrowLength !== undefined ? config.arrowLength : 0.64;

        // Transparent material for the ring bezel
        this.ringMaterial = new THREE.MeshStandardMaterial({
            color: 0xffb703,
            emissive: 0xffb703,
            emissiveIntensity: 0.4,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0
        });

        // High-intensity neon glowing material for the pointer needle
        this.pointerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffb703,
            emissive: 0xffd000,
            emissiveIntensity: 2.2, // Boosted for a bright neon glow effect
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        this.createMesh();
    }

    createMesh() {
        if (this.mesh) {
            if (this.helicopterMesh) this.helicopterMesh.remove(this.mesh);
            else if (this.scene) this.scene.remove(this.mesh);
        }

        this.mesh = new THREE.Group();

        // 1. Static Transparent Halo Ring
        const outerRadius = Math.max(0.1, this.ringOD / 2);
        const innerRadius = Math.max(0.05, outerRadius - 0.10);
        const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32);
        ringGeo.rotateX(-Math.PI / 2);
        this.ringMesh = new THREE.Mesh(ringGeo, this.ringMaterial);
        this.mesh.add(this.ringMesh);

        // 2. Rotating Pointer Group
        this.pointerGroup = new THREE.Group();
        const tipWidth = Math.min(0.1, outerRadius * 0.4);
        const tipGeo = new THREE.ConeGeometry(tipWidth, tipWidth * 2.5, 12);
        tipGeo.rotateX(Math.PI / 2);
        const tipMesh = new THREE.Mesh(tipGeo, this.pointerMaterial);
        tipMesh.position.set(0, 0, this.arrowLength);
        this.pointerGroup.add(tipMesh);
        this.mesh.add(this.pointerGroup);

        // Set local position
        this.mesh.position.set(this.offsetX, this.offsetY, this.offsetZ);
        this.mesh.visible = false;

        // Attach as a child of the helicopter mesh
        if (this.helicopterMesh) {
            this.helicopterMesh.add(this.mesh);
        } else if (this.scene) {
            this.scene.add(this.mesh);
        }
    }

    update(camera, helicopterMesh) {
        try {
            const targetHeli = helicopterMesh || this.helicopterMesh;
            if (!this.player || !targetHeli || !this.targetPosition || !this.mesh) return;

            const isPowered = this.navRadio ? Boolean(this.navRadio.powered) : true;
            const isTuned = this.navRadio ? (Math.abs(this.navRadio.activeFrequency - this.navRadio.targetFrequency) < 0.1) : true;
            const shouldShow = isPowered && isTuned;

            this.mesh.visible = shouldShow;
            if (!shouldShow) return;

            targetHeli.updateMatrixWorld(true);
            const q = new THREE.Quaternion();
            targetHeli.getWorldQuaternion(q);

            const worldPos = this.mesh.getWorldPosition(new THREE.Vector3());

            // 1. Calculate world angle from indicator to oil rig target
            const dx = this.targetPosition.x - worldPos.x;
            const dz = this.targetPosition.z - worldPos.z;
            const targetWorldAngle = Math.atan2(dx, dz);

            // 2. Extract helicopter world heading (yaw)
            const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
            const heliHeading = euler.y;

            // 3. Rotate the pointer subgroup locally
            if (this.pointerGroup) {
                this.pointerGroup.rotation.y = targetWorldAngle - heliHeading;
            }
        } catch (err) {
            console.warn('NavIndicator update error:', err);
        }
    }
}