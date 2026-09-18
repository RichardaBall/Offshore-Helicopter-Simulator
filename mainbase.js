import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class MainBase {
    constructor(scene, onLoadedCallback) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Your exact locked spawn position for the helicopter
        this.explicitSpawnPosition = new THREE.Vector3(3.3690, 6.2360, 0.4548);

        // Locked configuration for green circular lights
        this.lightRadius = 8.60;
        this.lightOffsetX = -3.00;
        this.lightOffsetZ = -0.40;

        // Locked configuration for red square corner lights
        this.redSquareSize = 22.40;
        this.redOffsetX = -3.40;
        this.redOffsetZ = -0.60;

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

            // Build lighting using the finalized hardcoded positions
            this.setupBaseLighting();

            if (onLoadedCallback) {
                onLoadedCallback(this.explicitSpawnPosition.clone());
            }
        }, undefined, (error) => {
            console.error("mainbase.glb failed to load:", error);
        });
    }

    setupBaseLighting() {
        const baseLightsGroup = new THREE.Group();
        const surfaceY = this.helipadCenter.y;

        // --- 1. Green Circular Perimeter Lights ---
        const greenCenterX = this.helipadCenter.x + this.lightOffsetX;
        const greenCenterZ = this.helipadCenter.z + this.lightOffsetZ;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = greenCenterX + Math.cos(angle) * this.lightRadius;
            const z = greenCenterZ + Math.sin(angle) * this.lightRadius;
            const y = surfaceY + 0.2;

            const light = new THREE.PointLight(0x00ff00, 2.0, 12);
            light.position.set(x, y, z);
            baseLightsGroup.add(light);

            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            bulb.position.copy(light.position);
            baseLightsGroup.add(bulb);
        }

        // --- 2. Red Square Corner Lights ---
        const redCenterX = this.helipadCenter.x + this.redOffsetX;
        const redCenterZ = this.helipadCenter.z + this.redOffsetZ;
        const halfSize = this.redSquareSize / 2;

        const corners = [
            { x: redCenterX + halfSize, z: redCenterZ + halfSize }, // Top-Right
            { x: redCenterX - halfSize, z: redCenterZ + halfSize }, // Top-Left
            { x: redCenterX - halfSize, z: redCenterZ - halfSize }, // Bottom-Left
            { x: redCenterX + halfSize, z: redCenterZ - halfSize }  // Bottom-Right
        ];

        corners.forEach(corner => {
            const y = surfaceY + 0.2;

            const light = new THREE.PointLight(0xff0000, 2.0, 12);
            light.position.set(corner.x, y, corner.z);
            baseLightsGroup.add(light);

            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            bulb.position.set(corner.x, y, corner.z);
            baseLightsGroup.add(bulb);
        });

        // --- Floodlight ---
        const floodLight = new THREE.DirectionalLight(0xfffaed, 1.5);
        floodLight.position.set(greenCenterX + 15, surfaceY + 25, greenCenterZ + 15);
        baseLightsGroup.add(floodLight);

        this.group.add(baseLightsGroup);
    }
}