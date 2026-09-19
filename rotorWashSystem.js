import * as THREE from 'three';

export class RotorWashSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlesCount = 4000;

        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particlesCount * 3);
        this.velocities = new Float32Array(this.particlesCount * 3);
        this.lifetimes = new Float32Array(this.particlesCount);

        for (let i = 0; i < this.particlesCount; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = -5000;
            this.positions[i * 3 + 2] = 0;
            this.lifetimes[i] = 0;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        // Soft feathered radial texture for mist/spray drops
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(240, 248, 255, 0.7)');
        gradient.addColorStop(0.4, 'rgba(200, 230, 250, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);

        this.material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 6.0,
            map: texture,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            opacity: 0.55
        });

        this.particleSystem = new THREE.Points(this.geometry, this.material);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);

        this.spawnIndex = 0;
    }

    // Helper to check if helicopter is currently over the oil rig helipad structure
    isOverHelipad(heliPos) {
        // Update these coordinates/radius to match your exact rig/helipad position from sceneSetup.js
        const helipadCenter = new THREE.Vector3(0, 0, 0); // Adjust if your rig/helipad is offset
        const helipadRadius = 14.0; // Approximate radius of the pad platform

        // Ignore Y axis for horizontal distance check
        const horizontalDist = Math.sqrt(
            Math.pow(heliPos.x - helipadCenter.x, 2) + 
            Math.pow(heliPos.z - helipadCenter.z, 2)
        );

        // If close to helipad center and above sea level, consider it over the platform
        return horizontalDist <= helipadRadius && heliPos.y > -2.0;
    }

    update(delta, helicopterPlayer) {
        if (!helicopterPlayer || !helicopterPlayer.model) {
            return;
        }

        const heliPos = new THREE.Vector3();
        helicopterPlayer.model.getWorldPosition(heliPos);

        const waterLevel = -2.0; // Ocean water plane Y position
        const heightAboveWater = heliPos.y - waterLevel;

        const positions = this.geometry.attributes.position.array;

        // Update active particles
        for (let i = 0; i < this.particlesCount; i++) {
            const idx = i * 3;
            if (this.lifetimes[i] > 0) {
                positions[idx] += this.velocities[idx] * delta;
                positions[idx + 1] += this.velocities[idx + 1] * delta;
                positions[idx + 2] += this.velocities[idx + 2] * delta;

                // Drag and gravity
                this.velocities[idx] *= 0.92;
                this.velocities[idx + 2] *= 0.92;
                this.velocities[idx + 1] -= 5.5 * delta; 

                this.lifetimes[i] -= delta;
                if (positions[idx + 1] <= waterLevel || this.lifetimes[i] <= 0) {
                    positions[idx + 1] = -5000;
                    this.lifetimes[i] = 0;
                }
            }
        }

        // Suppress rotor wash entirely if over the helipad platform or too high
        const overHelipad = this.isOverHelipad(heliPos);

        if (!overHelipad && heightAboveWater > 0 && heightAboveWater <= 25.0) {
            const intensity = Math.max(0, (25.0 - heightAboveWater) / 25.0);
            const spawnCount = Math.floor(intensity * 15); 

            for (let s = 0; s < spawnCount; s++) {
                const i = this.spawnIndex;
                const idx = i * 3;

                // Tighter radius matching AW189 rotor diameter (~16m diameter = ~8m radius max)
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.5 + Math.random() * 7.5;

                positions[idx] = heliPos.x + Math.cos(angle) * radius;
                positions[idx + 1] = waterLevel + 0.1;
                positions[idx + 2] = heliPos.z + Math.sin(angle) * radius;

                const outwardSpeed = 4.0 + Math.random() * 7.0;
                this.velocities[idx] = Math.cos(angle) * outwardSpeed;
                this.velocities[idx + 1] = 1.2 + Math.random() * 3.0;
                this.velocities[idx + 2] = Math.sin(angle) * outwardSpeed;

                this.lifetimes[i] = 1.0 + Math.random() * 0.6;
                this.spawnIndex = (this.spawnIndex + 1) % this.particlesCount;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}