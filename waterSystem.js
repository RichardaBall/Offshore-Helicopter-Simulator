import * as THREE from 'three';

export class WaterSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlesCount = 4000; 
        this.splashCount = 2500;    

        // --- Falling Shower Stream Setup ---
        this.particleGeometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particlesCount * 3);
        this.velocities = new Float32Array(this.particlesCount * 3);
        this.lifetimes = new Float32Array(this.particlesCount);
        this.sizes = new Float32Array(this.particlesCount);

        for (let i = 0; i < this.particlesCount; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = -5000; 
            this.positions[i * 3 + 2] = 0;
            this.lifetimes[i] = 0;
            this.sizes[i] = 1.0;
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        // --- Surface Impact Splash Setup ---
        this.splashGeometry = new THREE.BufferGeometry();
        this.splashPositions = new Float32Array(this.splashCount * 3);
        this.splashVelocities = new Float32Array(this.splashCount * 3);
        this.splashLifetimes = new Float32Array(this.splashCount);

        for (let i = 0; i < this.splashCount; i++) {
            this.splashPositions[i * 3] = 0;
            this.splashPositions[i * 3 + 1] = -5000;
            this.splashPositions[i * 3 + 2] = 0;
            this.splashLifetimes[i] = 0;
        }

        this.splashGeometry.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));

        // Soft feathered radial texture matching the rotor wash style
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(240, 248, 255, 0.65)');
        gradient.addColorStop(0.4, 'rgba(200, 230, 250, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);

        // Shower droplet material (finer, sparser, individual droplets)
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 5.5,
            map: texture,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            opacity: 0.45
        });

        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);

        // Surface splash mist material
        this.splashMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 6.0,
            map: texture,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            opacity: 0.5
        });

        this.splashSystem = new THREE.Points(this.splashGeometry, this.splashMaterial);
        this.splashSystem.frustumCulled = false;
        this.scene.add(this.splashSystem);
        
        this.spawnIndex = 0;
        this.splashSpawnIndex = 0;
    }

    // Triggers scattered surface splashes when shower drops hit the water
    triggerSplash(x, z, count = 1) {
        const waterLevel = -2.0;
        const splashPos = this.splashGeometry.attributes.position.array;

        for (let s = 0; s < count; s++) {
            const i = this.splashSpawnIndex;
            const idx = i * 3;

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 3.5;

            splashPos[idx] = x + Math.cos(angle) * radius;
            splashPos[idx + 1] = waterLevel + 0.1;
            splashPos[idx + 2] = z + Math.sin(angle) * radius;

            const outwardSpeed = 3.0 + Math.random() * 6.0;
            this.splashVelocities[idx] = Math.cos(angle) * outwardSpeed;
            this.splashVelocities[idx + 1] = 1.2 + Math.random() * 2.5; 
            this.splashVelocities[idx + 2] = Math.sin(angle) * outwardSpeed;

            this.splashLifetimes[i] = 0.8 + Math.random() * 0.6;
            this.splashSpawnIndex = (this.splashSpawnIndex + 1) % this.splashCount;
        }
    }

    update(delta, helicopterPlayer, isDispensing) {
        if (!helicopterPlayer || !helicopterPlayer.model) return false;

        const helicopterMesh = helicopterPlayer.model;
        const positions = this.particleGeometry.attributes.position.array;
        const splashPos = this.splashGeometry.attributes.position.array;
        
        const heliWorldPos = new THREE.Vector3();
        helicopterMesh.getWorldPosition(heliWorldPos);

        const spawnCenter = heliWorldPos.clone().add(new THREE.Vector3(0, -1.8, 0));
        const heliForward = new THREE.Vector3(0, 0, -1).applyQuaternion(helicopterMesh.quaternion);
        const waterLevel = -2.0; 

        // --- Update Falling Shower Particles ---
        for (let i = 0; i < this.particlesCount; i++) {
            const idx = i * 3;

            if (this.lifetimes[i] > 0) {
                positions[idx] += this.velocities[idx] * delta;
                positions[idx + 1] += this.velocities[idx + 1] * delta;
                positions[idx + 2] += this.velocities[idx + 2] * delta;

                // Air resistance / slight drift
                this.velocities[idx] *= 0.95;
                this.velocities[idx + 2] *= 0.95;
                this.velocities[idx + 1] -= 9.0 * delta; 
                this.lifetimes[i] -= delta;

                if (positions[idx + 1] <= waterLevel || this.lifetimes[i] <= 0) {
                    if (positions[idx + 1] <= waterLevel) {
                        this.triggerSplash(positions[idx], positions[idx + 2], 1);
                    }
                    positions[idx + 1] = -5000;
                    this.lifetimes[i] = 0;
                }
            }
        }

        // --- Update Surface Splash Particles ---
        for (let i = 0; i < this.splashCount; i++) {
            const idx = i * 3;
            if (this.splashLifetimes[i] > 0) {
                splashPos[idx] += this.splashVelocities[idx] * delta;
                splashPos[idx + 1] += this.splashVelocities[idx + 1] * delta;
                splashPos[idx + 2] += this.splashVelocities[idx + 2] * delta;

                this.splashVelocities[idx] *= 0.90;
                this.splashVelocities[idx + 2] *= 0.90;
                this.splashVelocities[idx + 1] -= 4.0 * delta; 

                this.splashLifetimes[i] -= delta;
                if (splashPos[idx + 1] <= waterLevel || this.splashLifetimes[i] <= 0) {
                    splashPos[idx + 1] = -5000;
                    this.splashLifetimes[i] = 0;
                }
            }
        }

        // --- Handle Water Tank Discharge (Shower Style) ---
        let actuallyDispensing = false;
        if (isDispensing && helicopterPlayer.waterTankKg > 0) {
            const dischargeRate = 300.0; // Slightly lighter flow rate
            const dropAmount = dischargeRate * delta;
            helicopterPlayer.waterTankKg = Math.max(0, helicopterPlayer.waterTankKg - dropAmount);

            actuallyDispensing = true;
            
            // Reduced spawn count per frame (sparse shower pattern instead of dense hose)
            const spawnBatch = 16; 
            for (let b = 0; b < spawnBatch; b++) {
                const i = this.spawnIndex;
                const idx = i * 3;

                // Wider showerhead spread ring pattern under the belly
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.4 + Math.random() * 1.8;

                positions[idx] = spawnCenter.x + Math.cos(angle) * radius;
                positions[idx + 1] = spawnCenter.y;
                positions[idx + 2] = spawnCenter.z + Math.sin(angle) * radius;

                // Gentle vertical drop with minor randomized spray angle
                const scatter = 1.5;
                this.velocities[idx] = (Math.random() - 0.5) * scatter - (heliForward.x * 4.0);
                this.velocities[idx + 1] = -9.0 - Math.random() * 4.0; 
                this.velocities[idx + 2] = (Math.random() - 0.5) * scatter - (heliForward.z * 4.0);

                this.lifetimes[i] = 3.0; 

                this.spawnIndex = (this.spawnIndex + 1) % this.particlesCount;
            }
        }

        this.particleGeometry.attributes.position.needsUpdate = true;
        this.splashGeometry.attributes.position.needsUpdate = true;
        return actuallyDispensing;
    }
}