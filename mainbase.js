import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class MainBase {
    constructor(scene, onLoadedCallback) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Your exact locked spawn position for the helicopter
        this.explicitSpawnPosition = new THREE.Vector3(3.3690, 6.2360, 0.4548);
        this.helipadCenter = new THREE.Vector3(this.explicitSpawnPosition.x, 5.336, this.explicitSpawnPosition.z);

        this.loadBase(onLoadedCallback);
    }

    loadBase(onLoadedCallback) {
        const loader = new GLTFLoader();
        loader.load('mainbase.glb', (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            this.group.add(model);

            model.updateMatrixWorld(true);

            if (onLoadedCallback) {
                onLoadedCallback(this.explicitSpawnPosition.clone());
            }
        }, undefined, (error) => {
            console.error("mainbase.glb failed to load:", error);
        });
    }
}