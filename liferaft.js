import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

export class LiferaftManager {
    constructor(scene, loadingManager = null) {
        this.scene = scene;
        this.raftGroup = new THREE.Group();
        this.isDeployed = false;
        this.raftGroup.visible = false;
        this.scene.add(this.raftGroup);

        // Create Restart Button DOM Element positioned at the top center with transparent background
        this.restartBtn = document.createElement('button');
        this.restartBtn.id = 'restart-flight-btn';
        this.restartBtn.innerHTML = 'RESTART FLIGHT';
        this.restartBtn.style.cssText = `
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(17, 24, 39, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 12px 28px;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-radius: 4px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            transition: background 0.2s, transform 0.2s, border-color 0.2s;
            display: none;
        `;

        this.restartBtn.addEventListener('mouseenter', () => {
            this.restartBtn.style.background = 'rgba(31, 41, 55, 0.7)';
            this.restartBtn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            this.restartBtn.style.transform = 'translateX(-50%) scale(1.05)';
        });

        this.restartBtn.addEventListener('mouseleave', () => {
            this.restartBtn.style.background = 'rgba(17, 24, 39, 0.5)';
            this.restartBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.restartBtn.style.transform = 'translateX(-50%) scale(1.0)';
        });

        this.restartBtn.addEventListener('click', () => {
            location.reload();
        });

        document.body.appendChild(this.restartBtn);

        // Load the custom liferaft.glb model using loadingManager for preloading
        const loader = new GLTFLoader(loadingManager);
        loader.load(
            './liferaft.glb',
            (gltf) => {
                const model = gltf.scene;
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
        
        // Show the restart flight button on screen
        if (this.restartBtn) {
            this.restartBtn.style.display = 'block';
        }

        console.log("Custom liferaft deployed successfully at:", crashPosition);
    }

    showRestart() {
        if (this.restartBtn) {
            this.restartBtn.style.display = 'block';
        }
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