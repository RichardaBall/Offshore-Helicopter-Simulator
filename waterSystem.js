import * as THREE from 'three';

export class WaterSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlesCount = 4000; // High particle density for a thick, voluminous cloud
        
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

        // Create a soft, volumetric radial texture simulating aerated water mist/foam
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        gradient.addColorStop(0.4, 'rgba(235, 245, 255, 0.5)'); // Crisp white-blue aerated water tint
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);

        // Volumetric blending for dense, overlapping water/mist plumes
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 14.0, // Large, soft particles that blend into a solid cloud mass
            map: texture,
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false,
            opacity: 0.55
        });

        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);
        
        this.spawnIndex = 0;
    }

    update(delta, helicopterPlayer, isDispensing) {
        if (!helicopterPlayer || !helicopterPlayer.model) return;

        const helicopterMesh = helicopterPlayer.model;
        const positions = this.particleGeometry.attributes.position.array;
        
        const heliWorldPos = new THREE.Vector3();
        helicopterMesh.getWorldPosition(heliWorldPos);

        // Spawn point centered under the helicopter belly
        const spawnCenter = heliWorldPos.clone().add(new THREE.Vector3(0, -1.8, 0));

        // Extract helicopter forward/velocity direction to simulate aerodynamic slipstream drag trailing backward
        const heliForward = new THREE.Vector3(0, 0, -1).applyQuaternion(helicopterMesh.quaternion);

        // Update active particles (simulating gravity, air resistance, and aerodynamic stripping)
        for (let i = 0; i < this.particlesCount; i++) {
            const idx = i * 3;

            if (this.lifetimes[i] > 0) {
                positions[idx] += this.velocities[idx] * delta;
                positions[idx + 1] += this.velocities[idx + 1] * delta;
                positions[idx + 2] += this.velocities[idx + 2] * delta;

                // Aerodynamic drag slowing down forward/sideways momentum and causing billowing expansion
                this.velocities[idx] *= 0.94;
                this.velocities[idx + 2] *= 0.94;
                
                // Gravity pulling the spray downward, compounded by air resistance
                this.velocities[idx + 1] -= 9.8 * delta * 0.7; 
                this.lifetimes[i] -= delta;

                // Ground or sea level collision boundary reset (y <= -2.0)
                if (positions[idx + 1] <= -2.0 || this.lifetimes[i] <= 0) {
                    positions[idx + 1] = -5000;
                    this.lifetimes[i] = 0;
                }
            }
        }

        // Continuously dump water while spacebar is held and water tank has supply > 0
        let actuallyDispensing = false;
        if (isDispensing && helicopterPlayer.waterTankKg > 0) {
            const dischargeRate = 400.0; // kg per second dispensed
            const dropAmount = dischargeRate * delta;
            helicopterPlayer.waterTankKg = Math.max(0, helicopterPlayer.waterTankKg - dropAmount);

            actuallyDispensing = true;
            const spawnBatch = 45; // High emission density matching a major water release tank
            for (let b = 0; b < spawnBatch; b++) {
                const i = this.spawnIndex;
                const idx = i * 3;

                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.6;

                positions[idx] = spawnCenter.x + Math.cos(angle) * radius;
                positions[idx + 1] = spawnCenter.y;
                positions[idx + 2] = spawnCenter.z + Math.sin(angle) * radius;

                // Heavy downward blast combined with reverse aerodynamic slipstream vector
                this.velocities[idx] = (Math.random() - 0.5) * 3.0 - (heliForward.x * 6.0);
                this.velocities[idx + 1] = -12.0 - Math.random() * 6.0; 
                this.velocities[idx + 2] = (Math.random() - 0.5) * 3.0 - (heliForward.z * 6.0);

                this.lifetimes[i] = 4.0; 

                this.spawnIndex = (this.spawnIndex + 1) % this.particlesCount;
            }
        }

        this.particleGeometry.attributes.position.needsUpdate = true;
        return actuallyDispensing;
    }
}