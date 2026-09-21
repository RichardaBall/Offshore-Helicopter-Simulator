import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const SurvivorState = {
    IDLE: 'IDLE',
    ON_RAFT: 'ON_RAFT',
    WINCHING: 'WINCHING',
    IN_CABIN: 'IN_CABIN',
    DISEMBARKING: 'DISEMBARKING',
    WAVING: 'WAVING',
    COMPLETED: 'COMPLETED'
};

export class Survivor {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.currentState = SurvivorState.IDLE;
        
        // Character physical parameters (scaled down 50%)
        this.targetHeight = 0.4375; // Target height scaled down 50% from 0.875
        this.fadeDuration = 0.3;   // Animation crossfade duration in seconds
        this.handOffset = 0.275;    // Vertical distance from winch hook scaled down 50% from 0.55

        // Position memory for lazy-loading support
        this.raftPosition = null;
        this.raftRotationY = 0;
    }

    /**
     * Loads character meshes and animation clips from individual GLB files in assets/character/.
     * @param {Object} files Object mapping clip names to GLB file URLs.
     */
    async loadModels(files = {
        wavinghelp: 'assets/character/wavinghelp.glb',
        raising: 'assets/character/raising.glb',
        wavingbye: 'assets/character/wavingbye.glb'
    }) {
        const loader = new GLTFLoader();

        const loadGLTF = (url) => {
            return new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });
        };

        try {
            // Load all three GLB files concurrently from assets/character/
            const [wavinghelpGltf, raisingGltf, wavingbyeGltf] = await Promise.all([
                loadGLTF(files.wavinghelp),
                loadGLTF(files.raising),
                loadGLTF(files.wavingbye)
            ]);

            // Base character mesh from wavinghelp.glb
            this.mesh = wavinghelpGltf.scene;

            // Compute bounding box to scale character height to 0.4375m
            const bbox = new THREE.Box3().setFromObject(this.mesh);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            if (size.y > 0) {
                const scale = this.targetHeight / size.y;
                this.mesh.scale.set(scale, scale, scale);
            }

            // Enable shadows for realistic lighting
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Initialize Three.js AnimationMixer on the character mesh
            this.mixer = new THREE.AnimationMixer(this.mesh);

            // Register animations from each loaded GLB file
            if (wavinghelpGltf.animations.length > 0) {
                this.actions['wavinghelp'] = this.mixer.clipAction(wavinghelpGltf.animations[0]);
            }
            if (raisingGltf.animations.length > 0) {
                this.actions['raising'] = this.mixer.clipAction(raisingGltf.animations[0]);
            }
            if (wavingbyeGltf.animations.length > 0) {
                this.actions['wavingbye'] = this.mixer.clipAction(wavingbyeGltf.animations[0]);
            }

            // Initially hide mesh until spawned on raft
            this.mesh.visible = false;
            this.scene.add(this.mesh);

            // If spawn requested before model finished loading, trigger spawn now
            if (this.currentState === SurvivorState.ON_RAFT && this.raftPosition) {
                this.spawnOnRaft(this.raftPosition, this.raftRotationY);
            }

            return true;
        } catch (error) {
            console.error('Error loading survivor character GLB models from assets/character/:', error);
            return false;
        }
    }

    /**
     * Plays target animation clip cleanly by stopping active animations.
     * @param {string} clipName Name of registered action ('wavinghelp', 'raising', 'wavingbye')
     * @param {boolean} loop Whether animation loops continuously
     */
    playAnimation(clipName, loop = true) {
        const nextAction = this.actions[clipName];
        if (!nextAction) return;

        if (this.currentAction === nextAction && nextAction.isRunning()) {
            return;
        }

        // Stop all active animation actions on mixer to cleanly switch clips
        if (this.mixer) {
            this.mixer.stopAllAction();
        }

        // Configure and play target animation clip immediately
        nextAction
            .reset()
            .setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .play();

        nextAction.clampWhenFinished = !loop;
        this.currentAction = nextAction;
    }

    // Step 1: Survivor appears on liferaft waving for help (wavinghelp.glb)
    spawnOnRaft(raftPosition, raftRotationY = 0) {
        this.raftPosition = raftPosition.clone();
        this.raftRotationY = raftRotationY;
        this.currentState = SurvivorState.ON_RAFT;

        if (!this.mesh) return;
        this.mesh.position.copy(raftPosition);
        this.mesh.rotation.set(0, raftRotationY, 0);
        this.mesh.visible = true;
        this.playAnimation('wavinghelp', true);
    }

    // Step 2: Hook hits raft — raft vanishes, survivor attaches to winch line raising (raising.glb)
    attachToWinch() {
        this.currentState = SurvivorState.WINCHING;
        if (!this.mesh) return;
        this.mesh.visible = true;
        this.playAnimation('raising', true);
    }

    // Step 3: Winch fully retracted — survivor vanishes inside cabin ("onboard")
    enterCabin() {
        this.currentState = SurvivorState.IN_CABIN;
        if (!this.mesh) return;
        this.mesh.visible = false;
    }

    // Step 4: Helicopter landed at main base with all systems off — survivor appears next to helicopter waving goodbye (wavingbye.glb)
    disembarkNextToHelicopter(helicopterPos, helicopterRotationY = 0, deckY = null) {
        this.currentState = SurvivorState.DISEMBARKING;
        if (!this.mesh) return;

        // Position survivor 3.0m to the right side of helicopter on helipad deck
        const offsetDistance = 3.0;
        const sideAngle = helicopterRotationY - Math.PI / 2;
        const offsetX = Math.sin(sideAngle) * offsetDistance;
        const offsetZ = Math.cos(sideAngle) * offsetDistance;

        const targetY = (deckY !== null && deckY !== undefined) ? deckY : helicopterPos.y;

        this.mesh.position.set(
            helicopterPos.x + offsetX,
            targetY,
            helicopterPos.z + offsetZ
        );

        // Turn survivor to face towards helicopter
        this.mesh.lookAt(helicopterPos.x, targetY, helicopterPos.z);
        this.mesh.visible = true;

        this.currentState = SurvivorState.WAVING;
        this.playAnimation('wavingbye', true);

        // Keep survivor visible and waving for 10 seconds, then complete mission
        setTimeout(() => {
            if (this.currentState === SurvivorState.WAVING) {
                if (this.mesh) this.mesh.visible = false;
                this.currentState = SurvivorState.COMPLETED;
            }
        }, 10000);
    }

    /**
     * Frame update loop called inside main game loop.
     * @param {number} deltaTime Time step in seconds
     * @param {THREE.Vector3} hookPosition Current world position of winch hook
     */
    update(deltaTime, hookPosition = null) {
        if (!this.mixer || !this.mesh || !this.mesh.visible) return;

        // Update skeletal animation keyframes
        this.mixer.update(deltaTime);

        switch (this.currentState) {
            case SurvivorState.WINCHING:
                if (hookPosition) {
                    // Match hook coordinate with hands offset
                    this.mesh.position.copy(hookPosition);
                    this.mesh.position.y -= this.handOffset;

                    // Ensure raising.glb animation is active while winch cable is being retracted
                    if (this.currentAction !== this.actions['raising']) {
                        this.playAnimation('raising', true);
                    }
                }
                break;
        }
    }
}