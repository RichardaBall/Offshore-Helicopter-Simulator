import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class LiferaftManager {
    constructor(scene) {
        this.scene = scene;
        this.liferaftGroup = null;
        this.isDeployed = false;
        this.splashRing = null;
        this.splashTimer = 0;
        this.timeElapsed = 0;
        this.loader = new GLTFLoader();
    }

    createProceduralLiferaft(parentGroup) {
        const tubeGeo = new THREE.TorusGeometry(1.5, 0.35, 16, 32);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.4 });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.y = 0.2;
        parentGroup.add(tube);

        const floorGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.1;
        parentGroup.add(floor);

        const canopyGeo = new THREE.ConeGeometry(1.3, 1.0, 16, 1, true);
        const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.5, side: THREE.DoubleSide });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = 0.7;
        canopy.rotation.y = Math.PI / 4;
        parentGroup.add(canopy);
    }

    deploy(position) {
        if (this.isDeployed) return;
        this.isDeployed = true;

        this.liferaftGroup = new THREE.Group();
        this.liferaftGroup.position.set(position.x, 0.1, position.z);
        this.scene.add(this.liferaftGroup);

        this.loader.load(
            'liferaft.glb',
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(1.0, 1.0, 1.0);
                this.liferaftGroup.add(model);
                console.log("AW189: Liferaft GLB loaded successfully.");
            },
            undefined,
            (error) => {
                console.warn("AW189: liferaft.glb missing. Using procedural fallback.");
                this.createProceduralLiferaft(this.liferaftGroup);
            }
        );

        const splashGeo = new THREE.RingGeometry(0.1, 0.5, 32);
        const splashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.splashRing = new THREE.Mesh(splashGeo, splashMat);
        this.splashRing.rotation.x = -Math.PI / 2;
        this.splashRing.position.set(position.x, 0.2, position.z);
        this.scene.add(this.splashRing);

        this.splashTimer = 1.5;
        this.timeElapsed = 0;
        console.log("AW189: Liferaft deployed at sea position.");
    }

    update(delta) {
        if (!this.isDeployed) return;
        this.timeElapsed += delta;

        if (this.splashRing && this.splashTimer > 0) {
            this.splashTimer -= delta;
            const scale = 1.0 + (1.5 - this.splashTimer) * 8.0;
            this.splashRing.scale.set(scale, scale, scale);
            if (this.splashRing.material) {
                this.splashRing.material.opacity = Math.max(0, this.splashTimer / 1.5);
            }
            if (this.splashTimer <= 0) {
                this.scene.remove(this.splashRing);
                this.splashRing.geometry.dispose();
                this.splashRing.material.dispose();
                this.splashRing = null;
            }
        }

        if (this.liferaftGroup) {
            const bobTime = this.timeElapsed * 2.0;
            this.liferaftGroup.position.y = 0.1 + Math.sin(bobTime) * 0.15;
            this.liferaftGroup.rotation.z = Math.sin(bobTime * 0.7) * 0.05;
            this.liferaftGroup.rotation.x = Math.cos(bobTime * 0.5) * 0.05;
        }
    }
}