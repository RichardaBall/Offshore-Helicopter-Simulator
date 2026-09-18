import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class WindFarm {
    constructor(scene) {
        this.scene = scene;
        this.turbines = [];

        const loader = new GLTFLoader();
        loader.load('WTG.glb', (gltf) => {
            const baseModel = gltf.scene;

            // Fixed position to the North-East (~1-minute flight time from the oil rig)
            const startPos = new THREE.Vector3(320, -0.95, -200);
            const spacing = 120; // 120 units between each turbine in the row

            for (let i = 0; i < 3; i++) {
                const turbineGroup = baseModel.clone(true);

                // Position each turbine in a clean row along the X axis
                const xPos = startPos.x + (i * spacing);
                turbineGroup.position.set(xPos, startPos.y, startPos.z);
                turbineGroup.scale.set(0.5, 0.5, 0.5);
                turbineGroup.rotation.y = 0; // All facing the same direction

                this.scene.add(turbineGroup);

                // Find the rotor mesh
                let rotorMesh = null;
                const meshes = [];

                turbineGroup.traverse((child) => {
                    if (child.isMesh) {
                        meshes.push(child);
                        const name = child.name.toLowerCase();
                        if (
                            name.includes('rotor') || 
                            name.includes('blade') || 
                            name.includes('fan') || 
                            name.includes('propeller') ||
                            name.includes('spin')
                        ) {
                            rotorMesh = child;
                        }
                    }
                });

                // Fallback matching if keywords aren't present
                if (!rotorMesh && meshes.length > 1) {
                    rotorMesh = meshes[1];
                } else if (!rotorMesh && meshes.length === 1) {
                    rotorMesh = meshes[0];
                }

                // Randomize initial rotor angle so they start out of sync
                if (rotorMesh) {
                    rotorMesh.rotation.z = Math.random() * Math.PI * 2;
                }

                // Add flashing red obstruction light on top of the tower
                const lightGroup = new THREE.Group();
                const light = new THREE.PointLight(0xff0000, 3.0, 15);
                light.position.set(0, 85, 0); 
                lightGroup.add(light);

                const bulbGeo = new THREE.SphereGeometry(0.5, 8, 8);
                const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.copy(light.position);
                lightGroup.add(bulb);

                turbineGroup.add(lightGroup);

                this.turbines.push({
                    group: turbineGroup,
                    rotor: rotorMesh,
                    light: light,
                    bulb: bulb,
                    rotationSpeed: 1.2 + (i * 0.2) + Math.random() * 0.4, // Unique speed per turbine
                    timeOffset: i * 2.5 + Math.random() * 5 // Staggered flash timing
                });
            }

            console.log("Successfully spawned 3 wind turbines.");

        }, undefined, (error) => {
            console.error("WTG model failed to load for wind farm:", error);
        });
    }

    update(delta) {
        this.turbines.forEach((turbine) => {
            // Rotate each rotor independently
            if (turbine.rotor) {
                turbine.rotor.rotation.z += delta * turbine.rotationSpeed;
            }

            // Flash each warning light independently out of sync
            if (turbine.light && turbine.bulb) {
                turbine.timeOffset += delta;
                const cycle = turbine.timeOffset % 1.0;
                const isOn = cycle < 0.4;
                turbine.light.intensity = isOn ? 4.0 : 0.0;
                turbine.bulb.visible = isOn;
            }
        });
    }
}