import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

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
    constructor(scene, loadingManager = null) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.mesh = null;
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.currentState = SurvivorState.IDLE;
        
        // Character physical parameters scaled up by 25% (1.75m * 1.25 = ~2.1875m base target height)
        this.targetHeight = 1.75 * 1.25;  
        this.fadeDuration = 2.5;   // Opacity fade-out duration in seconds
        this.fadeTimer = 0;
        this.isFading = false;
        this.handOffset = 0.55 * 1.25;    // Scaled vertical distance from winch hook

        // Position memory for lazy-loading support
        this.raftPosition = null;
        this.raftRotationY = 0;
        this.pendingDisembarkPos = null;
        this.pendingHeliRotY = 0;
        this.pendingDeckY = null;
        this.pendingAutoFade = true;
    }

    /**
     * Loads character meshes and animation clips from individual GLB files in the main game folder.
     * @param {Object} files Object mapping clip names to GLB file URLs.
     */
    async loadModels(files = {
        wavinghelp: 'wavinghelp.glb',
        raising: 'raising.glb',
        wavingbye: 'wavingbye.glb'
    }) {
        const loader = this.loadingManager ? new GLTFLoader(this.loadingManager) : new GLTFLoader();

        // Initialize and configure DRACOLoader for compressed GLB meshes
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        const loadGLTF = (url) => {
            return new Promise((resolve) => {
                loader.load(
                    url,
                    (gltf) => resolve(gltf),
                    undefined,
                    (error) => {
                        console.warn(`[Survivor] Primary path '${url}' failed, attempting fallback path './${url}'...`, error);
                        loader.load(
                            `./${url}`,
                            (gltf) => resolve(gltf),
                            undefined,
                            (err2) => {
                                console.warn(`[Survivor] Could not load model at '${url}' or './${url}'.`, err2);
                                resolve(null);
                            }
                        );
                    }
                );
            });
        };

        try {
            console.log('[Survivor] Loading survivor character GLB models from main game folder...');
            const [wavinghelpGltf, raisingGltf, wavingbyeGltf] = await Promise.all([
                loadGLTF(files.wavinghelp),
                loadGLTF(files.raising),
                loadGLTF(files.wavingbye)
            ]);

            const baseGltf = wavinghelpGltf || raisingGltf || wavingbyeGltf;
            if (!baseGltf) {
                console.error('[Survivor] All character GLB model paths failed to load.');
                return false;
            }

            // Base character mesh from available GLTF
            this.mesh = baseGltf.scene;

            // Force world matrix calculation on skinned mesh before bounding box measurement
            this.mesh.updateMatrixWorld(true);
            const bbox = new THREE.Box3().setFromObject(this.mesh);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            if (size.y > 0.05 && size.y < 100) {
                const scale = (this.targetHeight / size.y);
                this.mesh.scale.set(scale, scale, scale);
            } else {
                // Safe default scale if bounding box size is non-standard (scaled up by 25%)
                this.mesh.scale.set(1.25, 1.25, 1.25);
            }

            // Enable shadows and transparent material blending for smooth fade-outs
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(m => {
                                const cloned = m.clone();
                                cloned.transparent = true;
                                cloned.opacity = 1.0;
                                cloned.needsUpdate = true;
                                return cloned;
                            });
                        } else {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                            child.material.opacity = 1.0;
                            child.material.needsUpdate = true;
                        }
                    }
                }
            });

            // Initialize Three.js AnimationMixer on the character mesh
            this.mixer = new THREE.AnimationMixer(this.mesh);

            // Register animations from each loaded GLB file
            if (wavinghelpGltf && wavinghelpGltf.animations.length > 0) {
                this.actions['wavinghelp'] = this.mixer.clipAction(wavinghelpGltf.animations[0]);
            }
            if (raisingGltf && raisingGltf.animations.length > 0) {
                this.actions['raising'] = this.mixer.clipAction(raisingGltf.animations[0]);
            }
            if (wavingbyeGltf && wavingbyeGltf.animations.length > 0) {
                this.actions['wavingbye'] = this.mixer.clipAction(wavingbyeGltf.animations[0]);
            }

            // Fallback for missing clips
            const fallbackClip = this.actions['wavinghelp'] || this.actions['raising'] || this.actions['wavingbye'];
            if (!this.actions['wavinghelp']) this.actions['wavinghelp'] = fallbackClip;
            if (!this.actions['raising']) this.actions['raising'] = fallbackClip;
            if (!this.actions['wavingbye']) this.actions['wavingbye'] = fallbackClip;

            // Initially hide mesh until spawned on raft or disembarked
            this.mesh.visible = false;
            this.scene.add(this.mesh);

            console.log('[Survivor] Character GLB models successfully loaded, scaled up by 25%, and added to scene.');

            // If spawn requested before model finished loading, trigger spawn now
            if (this.currentState === SurvivorState.ON_RAFT && this.raftPosition) {
                this.spawnOnRaft(this.raftPosition, this.raftRotationY);
            } else if (this.currentState === SurvivorState.DISEMBARKING || this.currentState === SurvivorState.WAVING) {
                this.disembarkNextToHelicopter(this.pendingDisembarkPos, this.pendingHeliRotY, this.pendingDeckY, this.pendingAutoFade);
            }

            return true;
        } catch (error) {
            console.error('[Survivor] Error loading survivor character GLB models:', error);
            return false;
        }
    }

    /**
     * Sets opacity across all sub-materials on the survivor mesh.
     * @param {number} val Opacity value (0.0 to 1.0)
     */
    setOpacity(val) {
        if (!this.mesh) return;
        this.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                        mat.transparent = true;
                        mat.opacity = val;
                        mat.needsUpdate = true;
                    });
                } else {
                    child.material.transparent = true;
                    child.material.opacity = val;
                    child.material.needsUpdate = true;
                }
            }
        });
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
        this.isFading = false;
        this.fadeTimer = 0;
        this.setOpacity(1.0);

        if (!this.mesh) return;
        // Position survivor so feet rest on top of liferaft floor
        this.mesh.position.set(raftPosition.x, raftPosition.y + 0.25, raftPosition.z);
        this.mesh.rotation.set(0, raftRotationY, 0);
        this.mesh.visible = true;
        this.playAnimation('wavinghelp', true);
    }

    // Step 2: Hook hits raft — raft vanishes, survivor attaches to winch line raising (raising.glb)
    attachToWinch() {
        this.currentState = SurvivorState.WINCHING;
        this.isFading = false;
        this.fadeTimer = 0;
        this.setOpacity(1.0);

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

    // Step 4: Helicopter landed at main base with all systems off — survivor appears at calibrated coordinates waving goodbye (wavingbye.glb)
    disembarkNextToHelicopter(posOrHeliPos = { x: 5.869, y: 6.236, z: 1.4548 }, helicopterRotationY = 0, deckY = null, autoFade = true) {
        this.currentState = SurvivorState.DISEMBARKING;
        this.pendingDisembarkPos = posOrHeliPos;
        this.pendingHeliRotY = helicopterRotationY;
        this.pendingDeckY = deckY;
        this.pendingAutoFade = autoFade;

        if (!this.mesh) return;

        this.setOpacity(1.0);
        this.isFading = false;
        this.fadeTimer = 0;

        if (posOrHeliPos && typeof posOrHeliPos === 'object' && ('x' in posOrHeliPos) && ('z' in posOrHeliPos) && !posOrHeliPos.isVector3) {
            const x = posOrHeliPos.x !== undefined ? posOrHeliPos.x : 5.869;
            const y = posOrHeliPos.y !== undefined ? posOrHeliPos.y : 6.236;
            const z = posOrHeliPos.z !== undefined ? posOrHeliPos.z : 1.4548;
            const rotY = posOrHeliPos.rotationY !== undefined ? posOrHeliPos.rotationY : (Math.PI / 2);

            this.mesh.position.set(x, y, z);
            this.mesh.rotation.set(0, rotY, 0);
        } else if (posOrHeliPos && posOrHeliPos.isVector3) {
            // Position survivor 3.0m to the right side of helicopter on helipad deck
            const offsetDistance = 3.0;
            const sideAngle = helicopterRotationY - Math.PI / 2;
            const offsetX = Math.sin(sideAngle) * offsetDistance;
            const offsetZ = Math.cos(sideAngle) * offsetDistance;

            const targetY = (deckY !== null && deckY !== undefined) ? deckY : posOrHeliPos.y;

            this.mesh.position.set(
                posOrHeliPos.x + offsetX,
                targetY,
                posOrHeliPos.z + offsetZ
            );

            // Turn survivor to face towards helicopter
            this.mesh.lookAt(posOrHeliPos.x, targetY, posOrHeliPos.z);
        } else {
            this.mesh.position.set(5.869, 6.236, 1.4548);
            this.mesh.rotation.set(0, Math.PI / 2, 0);
        }

        this.mesh.visible = true;

        this.currentState = SurvivorState.WAVING;
        this.playAnimation('wavingbye', true);

        if (autoFade) {
            // Wave for 7.5 seconds, then initiate a 2.5 second smooth fade-out (total 10s)
            setTimeout(() => {
                if (this.currentState === SurvivorState.WAVING) {
                    this.isFading = true;
                    this.fadeTimer = 0;
                }
            }, 7500);
        }
    }

    /**
     * Frame update loop called inside main game loop.
     * @param {number} deltaTime Time step in seconds
     * @param {THREE.Vector3} hookPosition Current world position of winch hook
     */
    update(deltaTime, hookPosition = null) {
        if (!this.mixer || !this.mesh) return;

        // Update skeletal animation keyframes if mesh is visible
        if (this.mesh.visible) {
            this.mixer.update(deltaTime);
        }

        // Handle disembarkation opacity fade-out
        if (this.isFading && this.mesh.visible) {
            this.fadeTimer += deltaTime;
            const alpha = Math.max(0, 1.0 - (this.fadeTimer / this.fadeDuration));
            this.setOpacity(alpha);

            if (alpha <= 0) {
                this.isFading = false;
                this.mesh.visible = false;
                this.currentState = SurvivorState.COMPLETED;
            }
        }

        switch (this.currentState) {
            case SurvivorState.WINCHING:
                if (hookPosition && this.mesh.visible) {
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