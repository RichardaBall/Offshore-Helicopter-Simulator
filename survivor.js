import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

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
    constructor(scene, loadingManager = null, renderer = null) {
        this.scene = scene;
        this.loadingManager = loadingManager;
        this.renderer = renderer;
        
        // Separate meshes, mixers, and actions for each distinct GLB model file
        this.meshes = {
            wavinghelp: null,
            raising: null,
            wavingbye: null
        };
        this.mixers = {
            wavinghelp: null,
            raising: null,
            wavingbye: null
        };
        this.actions = {
            wavinghelp: null,
            raising: null,
            wavingbye: null
        };

        this.mesh = null;
        this.mixer = null;
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
     * @param {THREE.WebGLRenderer} renderer Optional WebGLRenderer for KTX2 texture support detection.
     */
    async loadModels(files = {
        wavinghelp: 'wavinghelp.glb',
        raising: 'raising.glb',
        wavingbye: 'wavingbye.glb'
    }, renderer = null) {
        const loader = this.loadingManager ? new GLTFLoader(this.loadingManager) : new GLTFLoader();

        // Initialize and configure DRACOLoader for compressed GLB meshes
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        // Initialize and configure KTX2Loader for compressed KTX2 / Basis Universal textures
        const ktx2Loader = new KTX2Loader(this.loadingManager);
        ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
        const activeRenderer = renderer || this.renderer || window.renderer;
        if (activeRenderer) {
            ktx2Loader.detectSupport(activeRenderer);
        }
        loader.setKTX2Loader(ktx2Loader);

        const loadGLTF = (url) => {
            return new Promise((resolve) => {
                if (!url || typeof url !== 'string') {
                    console.warn(`[Survivor] Skipped loading invalid or undefined GLTF URL:`, url);
                    resolve(null);
                    return;
                }
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
            
            const fileMap = {
                wavinghelp: 'wavinghelp.glb',
                raising: 'raising.glb',
                wavingbye: 'wavingbye.glb',
                ...(files || {})
            };

            const [wavinghelpGltf, raisingGltf, wavingbyeGltf] = await Promise.all([
                loadGLTF(fileMap.wavinghelp),
                loadGLTF(fileMap.raising),
                loadGLTF(fileMap.wavingbye)
            ]);

            if (!wavinghelpGltf && !raisingGltf && !wavingbyeGltf) {
                console.error('[Survivor] All character GLB model paths failed to load.');
                return false;
            }

            const processGltf = (gltf, key, isWavingHelp = false) => {
                if (!gltf) return null;
                const mesh = gltf.scene;

                // Force world matrix calculation on skinned mesh before bounding box measurement
                mesh.updateMatrixWorld(true);
                const bbox = new THREE.Box3().setFromObject(mesh);
                const size = new THREE.Vector3();
                bbox.getSize(size);

                if (size.y > 0.05 && size.y < 100) {
                    const scale = (this.targetHeight / size.y);
                    mesh.scale.set(scale, scale, scale);
                } else {
                    // Safe default scale if bounding box size is non-standard (scaled up by 25%)
                    mesh.scale.set(1.25, 1.25, 1.25);
                }

                // If this is wavinghelp, scale it up an additional 50% as requested
                if (isWavingHelp) {
                    mesh.scale.multiplyScalar(1.5);
                }

                // Enable shadows and transparent material blending for smooth fade-outs
                mesh.traverse((child) => {
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
                const mixer = new THREE.AnimationMixer(mesh);
                let action = null;
                if (gltf.animations && gltf.animations.length > 0) {
                    action = mixer.clipAction(gltf.animations[0]);
                }

                mesh.visible = false;
                this.scene.add(mesh);

                this.meshes[key] = mesh;
                this.mixers[key] = mixer;
                this.actions[key] = action;
                return mesh;
            };

            processGltf(wavinghelpGltf, 'wavinghelp', true);
            processGltf(raisingGltf, 'raising', false);
            processGltf(wavingbyeGltf, 'wavingbye', false);

            // Fallbacks for any missing model files
            const fallbackMesh = this.meshes['wavinghelp'] || this.meshes['raising'] || this.meshes['wavingbye'];
            const fallbackMixer = this.mixers['wavinghelp'] || this.mixers['raising'] || this.mixers['wavingbye'];
            const fallbackAction = this.actions['wavinghelp'] || this.actions['raising'] || this.actions['wavingbye'];

            if (!this.meshes['wavinghelp']) { this.meshes['wavinghelp'] = fallbackMesh; this.mixers['wavinghelp'] = fallbackMixer; this.actions['wavinghelp'] = fallbackAction; }
            if (!this.meshes['raising']) { this.meshes['raising'] = fallbackMesh; this.mixers['raising'] = fallbackMixer; this.actions['raising'] = fallbackAction; }
            if (!this.meshes['wavingbye']) { this.meshes['wavingbye'] = fallbackMesh; this.mixers['wavingbye'] = fallbackMixer; this.actions['wavingbye'] = fallbackAction; }

            console.log('[Survivor] Character GLB models successfully loaded, scaled, and added to scene.');

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
     * Sets opacity across all sub-materials on all loaded survivor meshes.
     * @param {number} val Opacity value (0.0 to 1.0)
     */
    setOpacity(val) {
        Object.values(this.meshes).forEach(mesh => {
            if (!mesh) return;
            mesh.traverse((child) => {
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
        });
    }

    /**
     * Activates the specified model key, hiding all others and playing its animation.
     * @param {string} key 'wavinghelp', 'raising', or 'wavingbye'
     * @param {boolean} loop Whether animation loops continuously
     */
    setActiveModel(key, loop = true) {
        Object.keys(this.meshes).forEach(k => {
            if (this.meshes[k]) {
                this.meshes[k].visible = false;
            }
        });

        this.mesh = this.meshes[key];
        this.mixer = this.mixers[key];
        const nextAction = this.actions[key];

        if (this.mesh) {
            this.mesh.visible = true;
        }

        if (nextAction && this.mixer) {
            this.mixer.stopAllAction();
            nextAction
                .reset()
                .setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)
                .setEffectiveTimeScale(1)
                .setEffectiveWeight(1)
                .play();

            nextAction.clampWhenFinished = !loop;
            this.currentAction = nextAction;
        } else {
            this.currentAction = null;
        }
    }

    // Step 1: Survivor appears standing at the opening/door of the liferaft waving for help (wavinghelp.glb)
    spawnOnRaft(raftPosition, raftRotationY = 0) {
        this.raftPosition = raftPosition.clone();
        this.raftRotationY = raftRotationY;
        this.currentState = SurvivorState.ON_RAFT;
        this.isFading = false;
        this.fadeTimer = 0;
        this.setOpacity(1.0);

        this.setActiveModel('wavinghelp', true);
        if (!this.mesh) return;

        // Position survivor standing precisely in the raft door opening by offsetting in the opposite direction (raftRotationY + Math.PI)
        const forwardOffset = 0.85;
        const offset = new THREE.Vector3(0, 0.0, forwardOffset);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), raftRotationY + Math.PI);

        this.mesh.position.copy(raftPosition).add(offset);
        this.mesh.rotation.set(0, raftRotationY + Math.PI, 0);
        this.mesh.visible = true;
    }

    // Step 2: Hook hits raft — raft vanishes, survivor attaches to winch line raising (raising.glb)
    attachToWinch() {
        this.currentState = SurvivorState.WINCHING;
        this.isFading = false;
        this.fadeTimer = 0;
        this.setOpacity(1.0);

        this.setActiveModel('raising', true);
        if (!this.mesh) return;
        this.mesh.visible = true;
    }

    // Step 3: Winch fully retracted — survivor vanishes inside cabin ("onboard")
    enterCabin() {
        this.currentState = SurvivorState.IN_CABIN;
        Object.values(this.meshes).forEach(m => {
            if (m) m.visible = false;
        });
    }

    // Step 4: Helicopter landed at main base with all systems off — survivor appears at calibrated coordinates waving goodbye (wavingbye.glb)
    disembarkNextToHelicopter(posOrHeliPos = { x: 5.869, y: 6.236, z: 1.4548 }, helicopterRotationY = 0, deckY = null, autoFade = true) {
        this.currentState = SurvivorState.DISEMBARKING;
        this.pendingDisembarkPos = posOrHeliPos;
        this.pendingHeliRotY = helicopterRotationY;
        this.pendingDeckY = deckY;
        this.pendingAutoFade = autoFade;

        this.setOpacity(1.0);
        this.isFading = false;
        this.fadeTimer = 0;

        this.setActiveModel('wavingbye', true);
        if (!this.mesh) return;

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
        // Update all animation mixers
        Object.values(this.mixers).forEach(mixer => {
            if (mixer) {
                mixer.update(deltaTime);
            }
        });

        // Handle disembarkation opacity fade-out
        if (this.isFading && this.mesh && this.mesh.visible) {
            this.fadeTimer += deltaTime;
            const alpha = Math.max(0, 1.0 - (this.fadeTimer / this.fadeDuration));
            this.setOpacity(alpha);

            if (alpha <= 0) {
                this.isFading = false;
                Object.values(this.meshes).forEach(m => { if (m) m.visible = false; });
                this.currentState = SurvivorState.COMPLETED;
            }
        }

        switch (this.currentState) {
            case SurvivorState.WINCHING:
                if (hookPosition && this.mesh && this.mesh.visible) {
                    // Match hook coordinate with hands offset
                    this.mesh.position.copy(hookPosition);
                    this.mesh.position.y -= this.handOffset;
                }
                break;
        }
    }
}