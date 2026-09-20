import * as THREE from 'three';

export class HelipadDebrisSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlesCount = 600; // Increased for better visibility

        // --- CONFIGURE YOUR HELIPAD PLATFORM HEIGHT HERE ---
        this.padSurfaceY = 10.0; // Adjust to match your platform's exact Y elevation
        this.padRadius = 14.0;   // Radius matching platform bounds

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

        // Soft, clean canvas texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(210, 205, 195, 0.5)');
        gradient.addColorStop(0.5, 'rgba(190, 185, 175, 0.2)');
        gradient.addColorStop(1, 'rgba(170, 165, 155, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);

        this.material = new THREE.PointsMaterial({
            color: 0xe8e2d8,
            size: 3.0, // Clear, visible size
            map: texture,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            opacity: 0.38 // Balanced opacity so it's clearly visible without blocking the view
        });

        this.particleSystem = new THREE.Points(this.geometry, this.material);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);

        this.spawnIndex = 0;
    }

    // Checks if helicopter is hovering directly over the main base helipad platform
    isOverHelipad(heliPos) {
        const helipadCenter = new THREE.Vector3(0, this.padSurfaceY, 0); 

        const horizontalDist = Math.sqrt(
            Math.pow(heliPos.x - helipadCenter.x, 2) + 
            Math.pow(heliPos.z - helipadCenter.z, 2)
        );

        return horizontalDist <= this.padRadius && 
               heliPos.y >= (this.padSurfaceY - 1.0) && 
               heliPos.y <= (this.padSurfaceY + 10.0);
    }

    update(delta, helicopterPlayer) {
        if (!helicopterPlayer || !helicopterPlayer.model) {
            return;
        }

        // Active when rotors are spinning / engine is on
        const isEngineRunning = helicopterPlayer.isEngineOn !== undefined ? helicopterPlayer.isEngineOn : true;
        if (!isEngineRunning) return;

        const heliPos = new THREE.Vector3();
        helicopterPlayer.model.getWorldPosition(heliPos);

        const heightAbovePad = heliPos.y - this.padSurfaceY;

        const positions = this.geometry.attributes.position.array;

        // Update active particles
        for (let i = 0; i < this.particlesCount; i++) {
            const idx = i * 3;
            if (this.lifetimes[i] > 0) {
                positions[idx] += this.velocities[idx] * delta;
                positions[idx + 1] += this.velocities[idx + 1] * delta;
                positions[idx + 2] += this.velocities[idx + 2] * delta;

                // Air drag and settling gravity
                this.velocities[idx] *= 0.86;
                this.velocities[idx + 2] *= 0.86;
                this.velocities[idx + 1] -= 1.2 * delta; 

                this.lifetimes[i] -= delta;
                if (positions[idx + 1] <= this.padSurfaceY || this.lifetimes[i] <= 0) {
                    positions[idx + 1] = -5000;
                    this.lifetimes[i] = 0;
                }
            }
        }

        // Steady spawn rate when over the platform
        const overHelipad = this.isOverHelipad(heliPos);

        if (overHelipad && heightAbovePad >= -0.5 && heightAbovePad <= 8.0) {
            const hoverFactor = Math.max(0.3, 1.0 - (heightAbovePad / 8.0));
            const spawnCount = Math.floor(hoverFactor * 3); // Spawns a few particles each frame for a nice steady effect

            for (let s = 0; s < spawnCount; s++) {
                const i = this.spawnIndex;
                const idx = i * 3;

                const angle = Math.random() * Math.PI * 2;
                const radius = 1.0 + Math.random() * 6.0;

                positions[idx] = heliPos.x + Math.cos(angle) * radius;
                positions[idx + 1] = this.padSurfaceY + 0.05;
                positions[idx + 2] = heliPos.z + Math.sin(angle) * radius;

                const outwardSpeed = 1.5 + Math.random() * 2.5; 
                this.velocities[idx] = Math.cos(angle) * outwardSpeed;
                this.velocities[idx + 1] = 0.4 + Math.random() * 1.0; 
                this.velocities[idx + 2] = Math.sin(angle) * outwardSpeed;

                this.lifetimes[i] = 0.6 + Math.random() * 0.4;
                this.spawnIndex = (this.spawnIndex + 1) % this.particlesCount;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}