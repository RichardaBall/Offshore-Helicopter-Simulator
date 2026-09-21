import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WinchSystem } from './winch.js';

export class RescueMission {
    constructor(scene, loadingManager) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        
        this.state = 'IDLE'; // IDLE, ACTIVE, ON_SCENE, WINCHING, HOISTED, RETURNING, COMPLETED
        this.raftMesh = null;
        this.raftPosition = new THREE.Vector3();
        this.flashingLight = null;
        this.flashTimer = 0;
        
        // Initialize dedicated Winch System module
        this.winchSystem = new WinchSystem(scene);
        
        this.survivorAttached = false;
        
        this.notificationElement = null;
        this._initUI();
        
        // Automatically trigger a distress rescue mission after 15 seconds of flight
        setTimeout(() => {
            this.startMission();
        }, 15000);
    }

    _initUI() {
        const div = document.createElement('div');
        div.id = 'rescue-mission-hud';
        div.style.position = 'absolute';
        div.style.top = '20px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.background = 'rgba(0, 0, 0, 0.85)';
        div.style.border = '2px solid #00ff00';
        div.style.color = '#00ff00';
        div.style.padding = '12px 24px';
        div.style.fontFamily = 'monospace';
        div.style.fontSize = '14px';
        div.style.textAlign = 'center';
        div.style.zIndex = '1000';
        div.style.display = 'none';
        div.style.pointerEvents = 'none';
        div.style.borderRadius = '4px';
        div.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.4)';
        document.body.appendChild(div);
        this.notificationElement = div;
    }

    startMission() {
        if (this.state !== 'IDLE') return;
        
        // Pick a random distress location at sea (800m to 1500m away from origin)
        const angle = Math.random() * Math.PI * 2;
        const distance = 900 + Math.random() * 600;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        this.raftPosition.set(x, 0, z);
        
        this.state = 'ACTIVE';
        this._showNotification(`🚨 DISTRESS CALL: Vessel sinking at [${Math.round(x)}, ${Math.round(z)}]. Navigate to liferaft.`);
        
        // Load liferaft.glb
        const loader = new GLTFLoader(this.loadingManager);
        loader.load('liferaft.glb', (gltf) => {
            this.raftMesh = gltf.scene;
            this.raftMesh.position.copy(this.raftPosition);
            this.raftMesh.scale.set(2.0, 2.0, 2.0);
            this.scene.add(this.raftMesh);
            
            // Add flashing red rescue beacon light on top of the raft
            this.flashingLight = new THREE.PointLight(0xff0000, 6.0, 35);
            this.flashingLight.position.set(0, 1.8, 0);
            this.raftMesh.add(this.flashingLight);
        }, undefined, (err) => {
            console.warn("Failed to load liferaft.glb for rescue mission, creating fallback mesh:", err);
            const geo = new THREE.CylinderGeometry(2, 2, 0.8, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff5500 });
            this.raftMesh = new THREE.Mesh(geo, mat);
            this.raftMesh.position.copy(this.raftPosition);
            this.scene.add(this.raftMesh);
            
            this.flashingLight = new THREE.PointLight(0xff0000, 6.0, 35);
            this.flashingLight.position.set(0, 1.0, 0);
            this.raftMesh.add(this.flashingLight);
        });
    }

    toggleWinch(helicopterPlayer) {
        if (this.state === 'IDLE' || this.state === 'COMPLETED') return;
        this.winchSystem.toggleWinch(helicopterPlayer);
        
        if (this.winchSystem.winchState === 'DOWN') {
            this._showNotification(`🪝 WINCH AT SEA LEVEL. Position hook over liferaft and press [X] to hoist survivor.`);
        }
    }

    _showNotification(text) {
        if (!this.notificationElement) return;
        this.notificationElement.textContent = text;
        this.notificationElement.style.display = 'block';
    }

    update(delta, helicopterPlayer, mainBase) {
        if (this.state === 'IDLE' || this.state === 'COMPLETED') return;
        
        // Flash red beacon light on liferaft
        if (this.flashingLight) {
            this.flashTimer += delta * 7;
            this.flashingLight.intensity = Math.sin(this.flashTimer) > 0 ? 10.0 : 0.5;
        }
        
        if (!helicopterPlayer || !helicopterPlayer.model) return;
        
        const heliPos = helicopterPlayer.model.position;
        const distToRaft = heliPos.distanceTo(this.raftPosition);
        
        // Mission state transitions
        if (this.state === 'ACTIVE' && distToRaft < 150) {
            this.state = 'ON_SCENE';
            this._showNotification(`🎯 ON SCENE: Liferaft sighted with flashing red beacon. Hover over raft and press [X] to deploy winch.`);
        }
        
        // Update dedicated Winch System
        this.winchSystem.update(delta, helicopterPlayer);
        
        // Handle winch state notifications & survivor hook check
        const hookPos = this.winchSystem.getHookPosition();
        
        if (this.winchSystem.winchState === 'RAISING' && this.winchSystem.winchHeight <= 0 && this.survivorAttached) {
            this.state = 'RETURNING';
            this._showNotification(`✅ SURVIVOR ABOARD! Transport survivor back to Main Base helipad.`);
            if (this.raftMesh) {
                this.scene.remove(this.raftMesh);
                this.raftMesh = null;
            }
        }
        
        // Check survivor pickup when winch hook is down near liferaft
        if (this.winchSystem.winchState === 'DOWN' && !this.survivorAttached && this.raftMesh) {
            const distHookToRaft = hookPos.distanceTo(this.raftPosition);
            if (distHookToRaft < 4.5) {
                this.survivorAttached = true;
                this._showNotification(`🤝 Survivor hooked! Press [X] to raise winch into helicopter.`);
            }
        }
        
        // Check return to Main Base helipad
        if (this.state === 'RETURNING' && mainBase && mainBase.helipadPosition) {
            const distToBase = heliPos.distanceTo(mainBase.helipadPosition);
            const altitudeAbovePad = heliPos.y - mainBase.helipadPosition.y;
            if (distToBase < 15.0 && altitudeAbovePad < 6.0 && helicopterPlayer.isGrounded) {
                this.state = 'COMPLETED';
                this._showNotification(`🏆 MISSION ACCOMPLISHED: Survivor safely delivered to Main Base! Outstanding airmanship, Captain.`);
                setTimeout(() => {
                    if (this.notificationElement) {
                        this.notificationElement.style.display = 'none';
                    }
                }, 12000);
            }
        }
    }
}