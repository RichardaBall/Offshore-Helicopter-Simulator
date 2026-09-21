import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WinchSystem } from './winch.js';

export class RescueMission {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        
        this.state = 'IDLE'; // IDLE, ACTIVE, ON_SCENE, WINCHING, HOISTED, RETURNING, COMPLETED
        this.raftMesh = null;
        this.fallbackMesh = null;
        this.raftPosition = new THREE.Vector3();
        this.flashingLight = null;
        this.flashTimer = 0;
        this.rescueFreq = 270.0;
        this.raftTemplate = null;
        this.isRaftLoading = false;
        this.usingFallback = false;
        
        // Initialize dedicated Winch System module
        this.winchSystem = new WinchSystem(scene);
        
        this.survivorAttached = false;
        
        this.pagerElement = null;
        this.freqDisplay = null;
        this.statusDisplay = null;
        this._initUI();
        
        // Pre-instantiate light in scene at startup to prevent Three.js shader recompilation spikes
        this.flashingLight = new THREE.PointLight(0xff0000, 0, 35);
        this.scene.add(this.flashingLight);

        // Pre-create fallback mesh in scene so geometry/materials compile on initialization
        this._initFallbackMesh();

        // Preload liferaft.glb in background and pre-add to scene graph
        this._preloadLiferaft();
        
        // Automatically trigger initial distress rescue mission after a random time between 2 and 5 minutes (120,000 to 300,000 ms)
        const initialDelay = 120000 + Math.random() * 180000;
        setTimeout(() => {
            this.startMission();
        }, initialDelay);
    }

    _initFallbackMesh() {
        const geo = new THREE.CylinderGeometry(2, 2, 0.8, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff5500 });
        this.fallbackMesh = new THREE.Mesh(geo, mat);
        this.fallbackMesh.position.set(0, -9999, 0);
        this.fallbackMesh.visible = false;
        this.scene.add(this.fallbackMesh);
    }

    _preloadLiferaft() {
        this.isRaftLoading = true;
        const loader = new GLTFLoader(this.loadingManager);
        loader.load('liferaft.glb', (gltf) => {
            this.raftTemplate = gltf.scene;
            this.raftTemplate.scale.set(2.0, 2.0, 2.0);
            this.raftTemplate.position.set(0, -9999, 0);
            this.raftTemplate.visible = false;
            
            // Pre-add to scene graph so shaders & GPU texture buffers warm up at startup
            this.scene.add(this.raftTemplate);
            this.isRaftLoading = false;

            // Upgrade seamlessly if mission started with fallback mesh
            if (this.state === 'ACTIVE' && this.usingFallback) {
                this._upgradeToGltfRaft();
            }
        }, undefined, (err) => {
            this.isRaftLoading = false;
            console.warn("Failed to preload liferaft.glb, will use fallback mesh:", err);
        });
    }

    _initUI() {
        const div = document.createElement('div');
        div.id = 'rescue-pager-panel';
        div.style.cssText = `
            position: fixed;
            bottom: 175px;
            right: 20px;
            width: 170px;
            background: linear-gradient(135deg, #282a2d, #191a1c);
            border: 2px solid #3a3d42;
            border-radius: 5px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08);
            font-family: 'Courier New', Courier, monospace;
            color: #d1d5db;
            padding: 10px;
            z-index: 10000;
            display: none;
            user-select: none;
            pointer-events: auto;
        `;

        div.innerHTML = `
            <div style="position: absolute; top: 4px; left: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; top: 4px; right: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; bottom: 4px; left: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; bottom: 4px; right: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 2px;">
                <div style="font-size: 8px; font-weight: bold; color: #ff3333; letter-spacing: 1px;">PAGER [SOS]</div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 7px; color: #888;">SOS</span>
                    <div id="pager-led" style="width: 7px; height: 7px; background-color: #ff3333; border-radius: 50%; box-shadow: 0 0 5px #ff3333; border: 1px solid #500;"></div>
                </div>
            </div>

            <div style="background: #111215; border: 1px inset #2a2d32; border-radius: 3px; padding: 8px; text-align: center;">
                <div style="font-size: 7px; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 2px;">DISTRESS CALL</div>
                <div id="pager-freq" style="font-size: 15px; font-weight: bold; color: #ff3333; text-shadow: 0 0 6px rgba(255,51,51,0.6); letter-spacing: 1px;">---.- kHz</div>
            </div>

            <div style="margin-top: 8px; font-size: 7px; color: #9ca3af; text-align: center; line-height: 1.3;">
                <div id="pager-status">SEARCHING...</div>
            </div>
        `;
        document.body.appendChild(div);
        this.pagerElement = div;
        this.freqDisplay = div.querySelector('#pager-freq');
        this.statusDisplay = div.querySelector('#pager-status');

        ['wheel', 'mousedown', 'mouseup', 'click', 'pointerdown'].forEach(eventType => {
            div.addEventListener(eventType, (e) => e.stopPropagation());
        });
    }

    startMission() {
        if (this.state !== 'IDLE') return;
        
        this.survivorAttached = false;
        this.usingFallback = false;
        
        // Pick random frequency between 200.0 and 400.0 (steps of 10) excluding WTG/Mainbase frequencies (210, 240, 290, 350)
        const excluded = [210, 240, 290, 350];
        const possible = [];
        for (let f = 200; f <= 400; f += 10) {
            if (!excluded.includes(f)) {
                possible.push(f);
            }
        }
        this.rescueFreq = possible[Math.floor(Math.random() * possible.length)];
        
        // Pick a random distress location at sea (800m to 1500m away from origin)
        const angle = Math.random() * Math.PI * 2;
        const distance = 900 + Math.random() * 600;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        this.raftPosition.set(x, 0, z);
        
        this.state = 'ACTIVE';

        // Register distress frequency in NavRadio stations
        if (window.navRadio) {
            window.navRadio.stations[this.rescueFreq] = {
                name: `SOS (${this.rescueFreq} kHz)`,
                position: this.raftPosition
            };
        }

        if (this.pagerElement && this.freqDisplay && this.statusDisplay) {
            this.freqDisplay.textContent = `${this.rescueFreq.toFixed(1)} kHz`;
            this.statusDisplay.textContent = `NAV TO RAFT`;
            this.pagerElement.style.display = 'block';
        }

        // Position light at mission target without creating new light object
        if (this.flashingLight) {
            this.flashingLight.position.set(this.raftPosition.x, 1.8, this.raftPosition.z);
        }

        // Activate pre-loaded mesh directly by updating position and visibility
        if (this.raftTemplate) {
            this.raftMesh = this.raftTemplate;
            this.raftMesh.position.copy(this.raftPosition);
            this.raftMesh.visible = true;
        } else {
            this.usingFallback = true;
            this.raftMesh = this.fallbackMesh;
            this.raftMesh.position.copy(this.raftPosition);
            this.raftMesh.visible = true;
        }
    }

    _upgradeToGltfRaft() {
        if (!this.raftTemplate || !this.usingFallback) return;
        if (this.fallbackMesh) {
            this.fallbackMesh.visible = false;
        }
        this.usingFallback = false;
        this.raftMesh = this.raftTemplate;
        this.raftMesh.position.copy(this.raftPosition);
        this.raftMesh.visible = true;
    }

    toggleWinch(helicopterPlayer) {
        if (this.state === 'IDLE' || this.state === 'COMPLETED') return;
        this.winchSystem.toggleWinch(helicopterPlayer);
        
        if (this.winchSystem.winchState === 'DOWN' && this.statusDisplay) {
            this.statusDisplay.textContent = `HOOK DOWN. PRESS [X]`;
        }
    }

    update(delta, helicopterPlayer, mainBase) {
        if (this.state === 'IDLE' || this.state === 'COMPLETED') return;
        
        // Flash red beacon light on liferaft
        if (this.flashingLight && !this.survivorAttached) {
            this.flashTimer += delta * 7;
            this.flashingLight.intensity = Math.sin(this.flashTimer) > 0 ? 10.0 : 0.5;
        } else if (this.flashingLight) {
            this.flashingLight.intensity = 0;
        }
        
        if (!helicopterPlayer || !helicopterPlayer.model) return;
        
        const heliPos = helicopterPlayer.model.position;
        const distToRaft = heliPos.distanceTo(this.raftPosition);
        
        // Mission state transitions
        if (this.state === 'ACTIVE' && distToRaft < 150) {
            this.state = 'ON_SCENE';
            if (this.statusDisplay) {
                this.statusDisplay.textContent = `SIGHTED. HOVER & [X]`;
            }
        }
        
        // Update dedicated Winch System
        this.winchSystem.update(delta, helicopterPlayer);
        
        // Handle winch state notifications & survivor hook check
        const hookPos = this.winchSystem.getHookPosition();
        
        // Check survivor pickup when winch hook is down near liferaft
        if (this.winchSystem.winchState === 'DOWN' && !this.survivorAttached && this.raftMesh && this.raftMesh.visible) {
            const distHookToRaft = hookPos.distanceTo(this.raftPosition);
            if (distHookToRaft < 4.5) {
                this.survivorAttached = true;
                if (this.statusDisplay) {
                    this.statusDisplay.textContent = `HOOKED! RETRACT WINCH`;
                }
                // Instantly hide liferaft upon winch contact without mutating scene graph
                if (this.raftMesh) {
                    this.raftMesh.visible = false;
                    this.raftMesh = null;
                }
                if (this.flashingLight) {
                    this.flashingLight.intensity = 0;
                }
            }
        }
        
        // Check when winch is fully raised back up with the survivor attached
        if (this.survivorAttached && this.winchSystem.winchHeight <= 0 && (this.winchSystem.winchState === 'UP' || this.winchSystem.winchState === 'RAISING')) {
            this.state = 'COMPLETED';
            if (this.statusDisplay) {
                this.statusDisplay.textContent = `SURVIVOR RESCUED!`;
            }
            
            // Unregister rescue frequency from navRadio
            if (window.navRadio && window.navRadio.stations[this.rescueFreq]) {
                delete window.navRadio.stations[this.rescueFreq];
            }

            // Hide pager instantly
            if (this.pagerElement) {
                this.pagerElement.style.display = 'none';
            }

            if (this.flashingLight) {
                this.flashingLight.intensity = 0;
            }

            // Start a random timer between 2 and 5 minutes (120,000 to 300,000 ms) until the next random rescue mission
            const randomDelay = 120000 + Math.random() * 180000;
            setTimeout(() => {
                this.state = 'IDLE';
                this.startMission();
            }, randomDelay);
        }
    }
}