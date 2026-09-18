import * as THREE from 'three';

export class HelicopterPlayer {
    constructor(model, animations, mixer, soundManager = null) {
        this.model = model;
        this.mixer = mixer;
        this.soundManager = soundManager;
        this.actions = {};

        this.hasCrashedInSea = false;
        this.onSeaCrash = null;

        // Find and cache the top strobe light and its bulb mesh once (eliminates per-frame traverse lag)
        this.strobeLight = null;
        this.strobeOriginalColor = new THREE.Color(0xffffff);
        this.strobeBulbMesh = null;

        this.model.traverse((child) => {
            if (child.isPointLight && child.position.y > 3.0) {
                this.strobeLight = child;
                this.strobeOriginalColor = child.color.clone();
            }
        });

        if (this.strobeLight) {
            this.model.traverse((child) => {
                if (child.isMesh && child.position.distanceTo(this.strobeLight.position) < 0.1) {
                    this.strobeBulbMesh = child;
                }
            });
        }
        
        window.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.code === 'KeyW') {
                event.preventDefault();
            }

            if (event.code === 'KeyP') {
                console.log(
                    `%c [SPAWN COORDINATES FOUND] `, 
                    'background: #222; color: #bada55; padding: 4px; font-weight: bold;', 
                    `new THREE.Vector3(${this.model.position.x.toFixed(4)}, ${this.model.position.y.toFixed(4)}, ${this.model.position.z.toFixed(4)})`
                );
            }
        });
        
        if (animations && Array.isArray(animations)) {
            animations.forEach((clip) => {
                const action = this.mixer.clipAction(clip);
                this.actions[clip.name] = action;
            });
        }

        this.isElectricalOn = false; 
        this.qKeyWasPressed = false; 

        this.isFuelPumpOn = false;   
        this.fKeyWasPressed = false; 
        this.fuelStarvationTimer = 0.0; 

        this.isEngineRunning = false;
        this.enginePower = 0.0;       
        this.targetEnginePower = 0.0; 

        this.isGearUp = false; 

        // --- AW189 Specs & Limits ---
        this.dryWeightKg = 4600;       
        this.fuelKg = 1000;            
        this.maxFuelKg = 1000;
        this.passengerCount = 6;      
        this.passengerAvgKg = 85;     
        this.baselineMassKg = 6200; 

        // --- Fuel Burn Rate Configuration (5 minutes full to empty) ---
        this.maxFuelBurnRatePerSec = 1000.0 / 300.0; 

        // --- Real-world AW189 scaling (~145-150 kts max cruise = ~75 m/s) ---
        this.maxMoveSpeed = 75.0;       
        this.maxTaxiSpeed = 3.0;        
        this.maxTurnSpeed = 1.5;        
        this.maxTaxiTurnSpeed = 0.75;   
        this.maxAltitudeSpeed = 12.0;    

        this.currentMoveSpeed = 0.0;
        this.currentTurnSpeed = 0.0;
        this.currentAltitudeSpeed = 0.0;

        // Heights & Helipad Positioning
        this.helipadAltitude = 5.336;
        this.seaLevel = 0.0;
        this.landingHeightOffset = 0.9; 
        this.maxCeilingFeet = 400.0;

        this.wasOnGround = true;
    }

    getTotalMass() {
        return this.dryWeightKg + this.fuelKg + (this.passengerCount * this.passengerAvgKg);
    }

    getCurrentGroundLevel() {
        const helipadCenter = new THREE.Vector2(0.0, 0.0);
        const currentPos2D = new THREE.Vector2(this.model.position.x, this.model.position.z);
        const distanceFromHelipad = currentPos2D.distanceTo(helipadCenter);

        if (distanceFromHelipad < 12.0) {
            return this.helipadAltitude + this.landingHeightOffset;
        }
        return this.seaLevel;
    }

    toggleElectrical() {
        this.isElectricalOn = !this.isElectricalOn;
        if (this.soundManager) {
            this.soundManager.playBatterySwitchSound(this.isElectricalOn);
        }
        console.log(`AW189: Electrical System ${this.isElectricalOn ? 'ON' : 'OFF'}`);
    }

    toggleFuelPump() {
        this.isFuelPumpOn = !this.isFuelPumpOn;
        if (this.isFuelPumpOn && this.soundManager) {
            this.soundManager.playFuelPumpPrimeSound();
        }
        console.log(`AW189: Fuel Pump ${this.isFuelPumpOn ? 'ON' : 'OFF'}`);
        if (this.isFuelPumpOn) {
            this.fuelStarvationTimer = 0.0;
        }
    }

    toggleEngine() {
        if (!this.isElectricalOn && this.targetEnginePower === 0) {
            console.warn("AW189: Cannot start engines! Electrical system is OFF. Press 'Q'.");
            return;
        }

        if (this.fuelKg <= 0 && this.targetEnginePower === 0) {
            console.warn("AW189: Cannot start engines! Out of fuel.");
            return;
        }

        if (!this.isFuelPumpOn && this.targetEnginePower === 0) {
            console.warn("AW189: Cannot start engines! Fuel pump is OFF. Press 'F'.");
            return;
        }

        if (this.targetEnginePower > 0) {
            this.targetEnginePower = 0.0;
            this.isEngineRunning = false;
            if (this.soundManager) {
                this.soundManager.stopHelicopterEngine();
            }
            console.log("AW189: Engine fuel cutoff engaged.");
        } else {
            this.targetEnginePower = 1.0;
            this.isEngineRunning = true;
            this.fuelStarvationTimer = 0.0;
            if (this.soundManager) {
                this.soundManager.startHelicopterEngine();
            }
            console.log("AW189: Engines igniting. Spooling up...");
            
            for (let name in this.actions) {
                if (name.toLowerCase().includes('rotor') || name.toLowerCase().includes('armature') || name.includes('Арматура')) {
                    const action = this.actions[name];
                    if (!action.isRunning()) action.reset().play();
                }
            }
        }
    }

    toggleLandingGear() {
        if (!this.isElectricalOn) {
            console.warn("AW189: Landing gear unpowered! Turn on electrical system ('Q').");
            return;
        }

        let gearAction = null;
        for (let name in this.actions) {
            if (name.toLowerCase().includes('gear') || name.toLowerCase().includes('landing')) {
                gearAction = this.actions[name];
                break;
            }
        }

        if (!gearAction) return;

        gearAction.paused = false;
        gearAction.timeScale = this.isGearUp ? -1 : 1;
        gearAction.setLoop(THREE.LoopOnce, 1);
        gearAction.clampWhenFinished = true;
        gearAction.play();
        
        const willBeGearUp = !this.isGearUp;
        if (this.soundManager) {
            this.soundManager.playLandingGearSound(willBeGearUp);
        }

        this.isGearUp = willBeGearUp;
        console.log(`Landing Gear ${this.isGearUp ? 'Retracting' : 'Deploying'}`);
    }

    update(delta, keys, weatherData) {
        if (this.hasCrashedInSea) return;

        if (this.mixer) this.mixer.update(delta);

        if (keys && keys['KeyQ']) {
            if (!this.qKeyWasPressed) { this.toggleElectrical(); this.qKeyWasPressed = true; }
        } else { this.qKeyWasPressed = false; }

        if (keys && keys['KeyF']) {
            if (!this.fKeyWasPressed) { this.toggleFuelPump(); this.fKeyWasPressed = true; }
        } else { this.fKeyWasPressed = false; }

        // --- Fuel Starvation Check ---
        if (this.targetEnginePower > 0 && (!this.isFuelPumpOn || this.fuelKg <= 0)) {
            this.fuelStarvationTimer += delta;
            if (this.fuelStarvationTimer >= 5.0) { 
                this.targetEnginePower = 0.0;
                this.isEngineRunning = false;
                if (this.soundManager) {
                    this.soundManager.stopHelicopterEngine();
                }
                console.log("AW189: Engines spooling down due to fuel starvation / pump off.");
            }
        } else if (this.isFuelPumpOn && this.fuelKg > 0 && this.isEngineRunning) {
            this.fuelStarvationTimer = 0.0;
        }

        const activeGroundLevel = this.getCurrentGroundLevel();
        const isOnGround = this.model.position.y <= activeGroundLevel + 0.05;

        // --- Dynamic Fuel Consumption Logic ---
        if (this.enginePower > 0.01 && this.fuelKg > 0 && this.isFuelPumpOn) {
            const currentMass = this.getTotalMass();
            const massMultiplier = currentMass / this.baselineMassKg;

            let aeroDragMultiplier = 1.0;
            if (!this.isGearUp && !isOnGround) {
                aeroDragMultiplier += 1.0; 
            }

            if (weatherData && weatherData.wind && !isOnGround) {
                const windSpeedMagnitude = weatherData.wind.length();
                aeroDragMultiplier += (windSpeedMagnitude * 0.05);
            }

            if (weatherData && weatherData.effects) {
                aeroDragMultiplier *= weatherData.effects.dragMultiplier;
            }

            const frameBurn = this.maxFuelBurnRatePerSec * this.enginePower * massMultiplier * aeroDragMultiplier * delta;
            this.fuelKg = Math.max(0, this.fuelKg - frameBurn);

            if (this.fuelKg <= 0 && this.targetEnginePower > 0) {
                this.targetEnginePower = 0.0;
                this.isEngineRunning = false;
                if (this.soundManager) {
                    this.soundManager.stopHelicopterEngine();
                }
                console.log("AW189: Engines shutdown - Out of Fuel!");
            }
        }

        // --- Optimized Strobe Light Fuel Warning Indicator Logic (Zero Traverse Overhead) ---
        if (this.strobeLight) {
            if (!this.isElectricalOn) {
                this.strobeLight.intensity = 0;
                if (this.strobeBulbMesh) {
                    this.strobeBulbMesh.visible = false;
                }
            } else {
                const time = Date.now() * 0.001;
                let flashRate = 4.0;
                let targetColor = this.strobeOriginalColor;

                if (this.fuelKg <= 100.0) {
                    targetColor = new THREE.Color(0xe74c3c);
                    flashRate = 16.0;
                } else if (this.fuelKg <= 500.0) {
                    targetColor = new THREE.Color(0xe67e22);
                    flashRate = 8.0;
                }

                this.strobeLight.color.copy(targetColor);
                const isStrobeActive = (Math.floor(time * flashRate) % 2) === 0;
                this.strobeLight.intensity = isStrobeActive ? 8.0 : 0.0;

                if (this.strobeBulbMesh) {
                    if (this.strobeBulbMesh.material) {
                        this.strobeBulbMesh.material.color.copy(this.strobeLight.color);
                    }
                    this.strobeBulbMesh.visible = this.strobeLight.intensity > 0;
                }
            }
        }

        if (!this.wasOnGround && isOnGround) {
            this.currentMoveSpeed = 0.0;
            this.currentTurnSpeed = 0.0;
            this.currentAltitudeSpeed = 0.0;
        }

        if (this.enginePower !== this.targetEnginePower) {
            const rate = 0.035; 
            const diff = this.targetEnginePower - this.enginePower;
            this.enginePower += diff * Math.min(delta * rate * 10.0, 1.0);
            if (Math.abs(this.targetEnginePower - this.enginePower) < 0.001) {
                this.enginePower = this.targetEnginePower;
            }
        }

        if (this.soundManager && this.isEngineRunning) {
            this.soundManager.updateHelicopterAudio(this.enginePower, this.currentMoveSpeed);
        }

        for (let name in this.actions) {
            if (name.toLowerCase().includes('rotor') || name.toLowerCase().includes('armature') || name.includes('Арматура')) {
                const action = this.actions[name];
                if (isOnGround && this.targetEnginePower === 0 && this.enginePower <= 0.001) {
                    if (action.isRunning()) action.stop();
                } else {
                    const activeTimeScale = Math.max(this.enginePower * 1.2, 0.05);
                    action.timeScale = activeTimeScale;
                    if (activeTimeScale > 0 && !action.isRunning()) action.reset().play();
                }
            }
        }

        if (isOnGround && this.targetEnginePower === 0 && this.enginePower <= 0.001) {
            this.currentMoveSpeed = 0.0;
            this.currentTurnSpeed = 0.0;
            this.currentAltitudeSpeed = 0.0;
            this.model.position.y = activeGroundLevel;
            this.wasOnGround = isOnGround;
            return;
        }

        const currentMass = this.getTotalMass();
        const massFactor = this.baselineMassKg / currentMass; 

        let activeDragMultiplier = weatherData && weatherData.effects ? weatherData.effects.dragMultiplier : 1.0;
        
        if (!this.isGearUp && !isOnGround) {
            activeDragMultiplier += 1.0;
        }

        let activeLiftMultiplier = weatherData && weatherData.effects ? weatherData.effects.liftMultiplier : 1.0;

        let activeSpeedLimit = (isOnGround ? this.maxTaxiSpeed : this.maxMoveSpeed) * Math.max(this.enginePower, 0.2) / activeDragMultiplier;
        const activeTurnSpeed = (isOnGround ? this.maxTaxiTurnSpeed : this.maxTurnSpeed) * Math.min(massFactor, 1.2) * Math.max(this.enginePower, 0.2);

        let targetMove = 0;
        let targetTurn = 0;
        let targetAltitude = 0;

        if (keys['ArrowLeft']) targetTurn += activeTurnSpeed;
        if (keys['ArrowRight']) targetTurn -= activeTurnSpeed;

        if (this.enginePower >= 0.45) {
            if (keys['ArrowUp']) targetMove -= activeSpeedLimit;
            if (keys['ArrowDown']) targetMove += activeSpeedLimit;

            if (keys['ShiftLeft'] || keys['ShiftRight']) {
                targetAltitude += (this.maxAltitudeSpeed * this.enginePower * activeLiftMultiplier) * massFactor;
            }
            if (keys['ControlLeft'] || keys['ControlRight']) {
                targetAltitude -= (this.maxAltitudeSpeed * this.enginePower * activeLiftMultiplier) * massFactor;
            }
        } else if (!isOnGround) {
            if (this.model.position.y <= activeGroundLevel + 1.0 && this.enginePower < 0.01) {
                targetAltitude -= 3.0;
            } else {
                const sinkRate = 5.5 * massFactor;
                targetAltitude -= sinkRate;
                targetMove -= sinkRate * 4.0;
            }

            if (keys['ArrowUp']) targetMove -= activeSpeedLimit * 0.4;
            if (keys['ArrowDown']) targetMove += activeSpeedLimit * 0.4;
        } else {
            if (keys['ArrowUp']) targetMove -= activeSpeedLimit;
            if (keys['ArrowDown']) targetMove += activeSpeedLimit;
        }

        const translationAccelerationRate = (isOnGround ? 2.0 : 0.8) * massFactor * delta; 
        const turnAccelerationRate = 2.0 * delta;
        const altitudeAccelerationRate = 3.5 * massFactor * delta;

        this.currentMoveSpeed += (targetMove - this.currentMoveSpeed) * Math.min(translationAccelerationRate, 1.0);
        this.currentTurnSpeed += (targetTurn - this.currentTurnSpeed) * Math.min(turnAccelerationRate, 1.0);
        this.currentAltitudeSpeed += (targetAltitude - this.currentAltitudeSpeed) * Math.min(altitudeAccelerationRate, 1.0);

        if (Math.abs(this.currentMoveSpeed) > 0.001) {
            this.model.translateX(this.currentMoveSpeed * delta);
        }
        if (Math.abs(this.currentTurnSpeed) > 0.001) {
            this.model.rotation.y += this.currentTurnSpeed * delta;
        }

        if (weatherData && weatherData.wind && !isOnGround) {
            const windImpactFactor = (this.baselineMassKg / currentMass) * delta;
            this.model.position.x += weatherData.wind.x * windImpactFactor * 0.4;
            this.model.position.z += weatherData.wind.z * windImpactFactor * 0.4;
        }

        let newY = this.model.position.y + (this.currentAltitudeSpeed * delta);
        
        if (newY <= activeGroundLevel) {
            newY = activeGroundLevel;
            this.currentAltitudeSpeed = 0;

            // --- Sea Crash Check ---
            if (activeGroundLevel === this.seaLevel && !this.hasCrashedInSea) {
                this.hasCrashedInSea = true;
                if (this.onSeaCrash) {
                    this.onSeaCrash(this.model.position.clone());
                }
            }
        }

        const maxCeilingMeters = this.maxCeilingFeet / 3.28084;
        if (newY >= maxCeilingMeters) {
            newY = maxCeilingMeters;
            this.currentAltitudeSpeed = 0;
        }

        this.model.position.y = newY;
        this.wasOnGround = isOnGround;
    }
}