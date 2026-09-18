import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class LightPlacer {
    constructor(scene, camera, renderer, targetModel, modelName = 'Target Model') {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.targetModel = targetModel;
        this.modelName = modelName;

        this.placedLights = [];
        this.colors = ['green', 'red', 'white'];
        this.colorIndex = 0;
        this.currentColor = this.colors[this.colorIndex];

        this.currentLight = null;
        this.currentMarker = null;
        this.transformControls = null;

        this.setupTransformControls();
        this.setupUI();
        this.initListeners();
    }

    setupTransformControls() {
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.size = 1.0;
        this.scene.add(this.transformControls);
    }

    setupUI() {
        const div = document.createElement('div');
        div.id = 'light-placer-hud';
        div.style.position = 'fixed';
        div.style.top = '10px';
        div.style.left = '10px';
        div.style.background = 'rgba(0, 0, 0, 0.85)';
        div.style.color = '#fff';
        div.style.padding = '14px';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '13px';
        div.style.zIndex = '1000';
        div.style.borderRadius = '6px';
        div.style.border = '1px solid #444';
        div.innerHTML = `
            <b>${this.modelName} Light Placer (Gizmo Mode)</b><br>
            Active Color: <span id="lp-color" style="color: #00ff00; font-weight: bold;">GREEN</span><br>
            Status: <span id="lp-status" style="color: #ffaa00;">Ready to Spawn</span><br>
            Saved Lights: <span id="lp-count">0</span><br>
            <hr style="border: 0; border-top: 1px solid #555; margin: 8px 0;">
            <b>[C]</b> Cycle Color (Green / Red / White)<br>
            <b>[B]</b> Spawn New Light<br>
            <b>[Enter]</b> Lock & Save Current Light<br>
            <b>[Z]</b> Undo / Cancel Current<br>
            <b>[P]</b> Print Coordinates (Console)
        `;
        document.body.appendChild(div);
        this.hudColorEl = document.getElementById('lp-color');
        this.hudStatusEl = document.getElementById('lp-status');
        this.hudCountEl = document.getElementById('lp-count');
    }

    initListeners() {
        this.boundOnKeyDown = (e) => this.onKeyDown(e);
        window.addEventListener('keydown', this.boundOnKeyDown);
    }

    onKeyDown(e) {
        if (e.key.toLowerCase() === 'c') {
            this.colorIndex = (this.colorIndex + 1) % this.colors.length;
            this.currentColor = this.colors[this.colorIndex];
            
            if (this.currentColor === 'green') {
                this.hudColorEl.innerText = 'GREEN';
                this.hudColorEl.style.color = '#00ff00';
            } else if (this.currentColor === 'red') {
                this.hudColorEl.innerText = 'RED';
                this.hudColorEl.style.color = '#ff0000';
            } else if (this.currentColor === 'white') {
                this.hudColorEl.innerText = 'WHITE';
                this.hudColorEl.style.color = '#ffffff';
            }
        } else if (e.code === 'KeyB') {
            this.spawnLight();
        } else if (e.code === 'Enter') {
            this.confirmLight();
        } else if (e.key.toLowerCase() === 'z') {
            this.undoLast();
        } else if (e.key.toLowerCase() === 'p') {
            this.printCoordinates();
        }
    }

    spawnLight() {
        if (this.currentLight) {
            alert("Please lock/save the current light first by pressing [Enter]!");
            return;
        }

        let colorHex = 0x00ff00;
        if (this.currentColor === 'red') colorHex = 0xff0000;
        if (this.currentColor === 'white') colorHex = 0xffffff;

        const geometry = new THREE.SphereGeometry(0.35, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: colorHex });
        this.currentMarker = new THREE.Mesh(geometry, material);
        
        // Start near model origin/center
        this.currentMarker.position.set(0, 5, 0);

        this.currentLight = new THREE.PointLight(colorHex, 2.0, 10);
        this.currentMarker.add(this.currentLight);

        // Parent directly to the target model so it stays attached permanently!
        this.targetModel.add(this.currentMarker);

        // Attach coordinate gizmo arrows
        this.transformControls.attach(this.currentMarker);

        this.hudStatusEl.innerText = `Editing (${this.currentColor.toUpperCase()}) - Drag Arrows`;
        this.hudStatusEl.style.color = '#00ff00';
        console.log(`Spawned new ${this.currentColor} light. Use gizmo arrows to position, then press [Enter] to lock.`);
    }

    confirmLight() {
        if (!this.currentLight || !this.currentMarker) {
            alert("No active light to lock! Press [B] to spawn one first.");
            return;
        }

        // Detach gizmo
        this.transformControls.detach();

        const localPos = this.currentMarker.position.clone();

        const record = {
            color: this.currentColor,
            position: {
                x: Number(localPos.x.toFixed(3)),
                y: Number(localPos.y.toFixed(3)),
                z: Number(localPos.z.toFixed(3))
            },
            mesh: this.currentMarker,
            light: this.currentLight
        };

        this.placedLights.push(record);

        // Clear current pointers so a new one can be spawned
        this.currentLight = null;
        this.currentMarker = null;

        this.hudStatusEl.innerText = 'Saved! Press [B] for next';
        this.hudStatusEl.style.color = '#ffaa00';
        this.hudCountEl.innerText = this.placedLights.length;

        console.log("Light locked and saved in model-local space:", record.position);
    }

    undoLast() {
        if (this.currentLight) {
            // Cancel current active light being edited
            this.transformControls.detach();
            this.targetModel.remove(this.currentMarker);
            this.currentMarker.geometry.dispose();
            this.currentMarker.material.dispose();
            this.currentLight = null;
            this.currentMarker = null;
            this.hudStatusEl.innerText = 'Cancelled current light';
            this.hudStatusEl.style.color = '#ffaa00';
            console.log("Cancelled active light editing.");
            return;
        }

        if (this.placedLights.length > 0) {
            const last = this.placedLights.pop();
            this.targetModel.remove(last.mesh);
            last.mesh.geometry.dispose();
            last.mesh.material.dispose();
            this.hudCountEl.innerText = this.placedLights.length;
            this.hudStatusEl.innerText = 'Undone last saved light';
            console.log("Undone last saved light.");
        }
    }

    printCoordinates() {
        console.log(`=== ${this.modelName.toUpperCase()} LIGHTS COORDINATES (LOCAL JSON) ===`);
        console.log(JSON.stringify(this.placedLights.map(l => ({ color: l.color, position: l.position })), null, 2));
        alert("Coordinates successfully printed to your browser console (F12)! Copy and paste them back here.");
    }

    dispose() {
        window.removeEventListener('keydown', this.boundOnKeyDown);
        if (this.transformControls) {
            this.transformControls.dispose();
            this.scene.remove(this.transformControls);
        }
        const hud = document.getElementById('light-placer-hud');
        if (hud) hud.remove();
    }
}