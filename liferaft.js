import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

export class LiferaftManager {
    constructor(scene) {
        this.scene = scene;
        this.raftGroup = new THREE.Group();
        this.isDeployed = false;
        this.raftGroup.visible = false;
        this.scene.add(this.raftGroup);

        // Load the custom liferaft.glb model
        const loader = new GLTFLoader();
        loader.load(
            './liferaft.glb', // Adjust path if your assets folder is structured differently
            (gltf) => {
                const model = gltf.scene;
                // Optional: Adjust scale or centering if needed
                model.scale.set(1, 1, 1);
                this.raftGroup.add(model);
                console.log("liferaft.glb loaded successfully.");
            },
            (xhr) => {
                // Loading progress optional
            },
            (error) => {
                console.error("An error occurred while loading liferaft.glb:", error);
            }
        );
    }

    deploy(crashPosition) {
        if (this.isDeployed) return;
        this.isDeployed = true;

        // Position the life raft model at the sea crash coordinates (floating on water level y = 0.0)
        this.raftGroup.position.set(crashPosition.x, 0.0, crashPosition.z);
        this.raftGroup.visible = true;
        
        console.log("Custom liferaft deployed successfully at:", crashPosition);
    }

    update(delta) {
        if (!this.isDeployed || !this.raftGroup) return;

        // Add a gentle bobbing motion on the water waves
        const time = Date.now() * 0.002;
        this.raftGroup.position.y = Math.sin(time) * 0.15;
        this.raftGroup.rotation.z = Math.cos(time * 0.7) * 0.03;
        this.raftGroup.rotation.x = Math.sin(time * 0.5) * 0.03;
    }
}