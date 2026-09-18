import * as THREE from 'three';

export class WeatherSystem {
    constructor() {
        this.currentWeather = 'fine'; // 'fine', 'rain', 'storm'
        this.transitionTimer = 0.0;
        this.targetDuration = 60.0;

        // Day / Night Cycle Variables (5 Minutes Total Cycle)
        this.dayNightTimer = 0.0;
        this.dayCycleDuration = 300.0; // 5 minutes
        this.sunAngle = 0.0;

        // Secondary Light Source: Moon
        this.moonLight = null;

        // Wind vectors
        this.windVector = new THREE.Vector3(0, 0, 0);
        this.targetWind = new THREE.Vector3(0, 0, 0);

        // Rain particle system setup
        this.particleCount = 5000;
        this.rainParticles = null;
        this.rainGeo = null;
        this.rainMat = null;
        this.rainSpeeds = [];

        this.baseSunIntensity = 1.2;

        this.setupRainSystem();
    }

    setupRainSystem() {
        this.rainGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 6);
        this.rainSpeeds = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * 140;
            const y = Math.random() * 70;
            const z = (Math.random() - 0.5) * 140;
            const dropLength = 1.2 + Math.random() * 0.8;

            positions[i * 6] = x;
            positions[i * 6 + 1] = y;
            positions[i * 6 + 2] = z;

            positions[i * 6 + 3] = x;
            positions[i * 6 + 4] = y - dropLength;
            positions[i * 6 + 5] = z;

            this.rainSpeeds[i] = 50.0 + Math.random() * 30.0;
        }

        this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.rainMat = new THREE.LineBasicMaterial({
            color: 0xcceeff,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            linewidth: 1,
        });

        this.rainParticles = new THREE.LineSegments(this.rainGeo, this.rainMat);
        this.rainParticles.visible = false;
    }

    setupMoonLight(scene) {
        if (!this.moonLight && scene) {
            this.moonLight = new THREE.DirectionalLight(0x335588, 0.0);
            scene.add(this.moonLight);
        }
    }

    getWeatherEffects() {
        switch (this.currentWeather) {
            case 'rain':
                return {
                    visibility: 'moderate',
                    dragMultiplier: 1.08,
                    liftMultiplier: 0.97,
                    fogDensity: 0.003,
                    dayFogColor: 0x778899,
                    nightFogColor: 0x020408,
                    sunIntensity: 0.7,
                    sunColor: 0x99aabb,
                };
            case 'storm':
                return {
                    visibility: 'clearer_storm',
                    dragMultiplier: 1.15,
                    liftMultiplier: 0.92,
                    fogDensity: 0.005,
                    dayFogColor: 0x334455,
                    nightFogColor: 0x010204,
                    sunIntensity: 0.4,
                    sunColor: 0x667788,
                };
            case 'fine':
            default:
                return {
                    visibility: 'good',
                    dragMultiplier: 1.0,
                    liftMultiplier: 1.0,
                    fogDensity: 0.0012,
                    dayFogColor: 0xcce0ff,
                    nightFogColor: 0x030611,
                    sunIntensity: 1.2,
                    sunColor: 0xffffeb,
                };
        }
    }

    update(delta, scene, cameraPos, sunLight, ambientLight) {
        if (!scene) return { weatherType: this.currentWeather, wind: this.windVector, effects: this.getWeatherEffects(), isNight: false };

        this.setupMoonLight(scene);

        // --- Day / Night Celestial Calculations ---
        this.dayNightTimer = (this.dayNightTimer + delta) % this.dayCycleDuration;
        const cycleProgress = this.dayNightTimer / this.dayCycleDuration;
        this.sunAngle = cycleProgress * Math.PI * 2;

        const orbitRadius = 400;
        const sunX = Math.cos(this.sunAngle) * orbitRadius;
        const sunY = Math.sin(this.sunAngle) * orbitRadius;
        const sunZ = Math.sin(this.sunAngle * 0.5) * 150;

        if (sunLight && sunLight.position) {
            sunLight.position.set(sunX, sunY, sunZ);
        }

        if (this.moonLight && this.moonLight.position) {
            this.moonLight.position.set(-sunX, -sunY, -sunZ);
        }

        const daylightFactor = THREE.MathUtils.clamp((sunY + 20) / 100, 0.0, 1.0);
        const nightFactor = 1.0 - daylightFactor;

        // --- Weather State Roll ---
        this.transitionTimer += delta;
        if (this.transitionTimer >= this.targetDuration) {
            this.transitionTimer = 0.0;
            this.targetDuration = 45.0 + Math.random() * 60.0;
            this.rollNewWeather();
        }

        const effects = this.getWeatherEffects();

        this.windVector.lerp(this.targetWind, Math.min(delta * 0.2, 1.0));

        const targetFogHex = new THREE.Color(effects.dayFogColor).lerp(
            new THREE.Color(effects.nightFogColor),
            nightFactor
        );

        // Update Scene Fog & Background
        if (scene.fog && scene.fog.color) {
            scene.fog.color.lerp(targetFogHex, Math.min(delta * 0.5, 1.0));
            if (scene.fog.isFogExp2) {
                scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, effects.fogDensity, Math.min(delta * 0.5, 1.0));
            }
        }

        if (scene.background && scene.background.isColor) {
            scene.background.lerp(targetFogHex, Math.min(delta * 0.5, 1.0));
        } else if (scene) {
            scene.background = targetFogHex.clone();
        }

        // Sunlight Updates
        if (sunLight && sunLight.color) {
            const targetSunColor = new THREE.Color(effects.sunColor);
            sunLight.color.lerp(targetSunColor, Math.min(delta * 0.5, 1.0));
            sunLight.intensity = effects.sunIntensity * daylightFactor;
        }

        // Moonlight Updates
        if (this.moonLight) {
            const moonBaseIntensity = 0.12;
            this.moonLight.intensity = moonBaseIntensity * nightFactor * (this.currentWeather === 'storm' ? 0.2 : 1.0);
        }

        // Ambient Light Updates
        if (ambientLight && ambientLight.color) {
            const dayAmbient = new THREE.Color(0x888888);
            const nightAmbient = new THREE.Color(0x02040a);
            const targetAmbient = dayAmbient.clone().lerp(nightAmbient, nightFactor);
            ambientLight.color.lerp(targetAmbient, Math.min(delta * 0.5, 1.0));
            ambientLight.intensity = THREE.MathUtils.lerp(1.2, 0.08, nightFactor);
        }

        // Rain Animation Updates
        if (this.rainParticles && this.rainParticles.visible && cameraPos) {
            this.rainParticles.position.set(cameraPos.x, cameraPos.y, cameraPos.z);

            const positions = this.rainGeo.attributes.position.array;
            const isStorm = this.currentWeather === 'storm';
            const windX = this.windVector.x * 0.08;
            const windZ = this.windVector.z * 0.08;

            for (let i = 0; i < this.particleCount; i++) {
                const speed = this.rainSpeeds[i] * (isStorm ? 1.4 : 1.0) * delta;
                const dropLength = isStorm ? 1.8 : 1.4;

                let topY = positions[i * 6 + 1] - speed;
                let botY = topY - dropLength;

                if (topY < -25) {
                    topY = 45;
                    botY = topY - dropLength;
                    positions[i * 6] = (Math.random() - 0.5) * 140;
                    positions[i * 6 + 2] = (Math.random() - 0.5) * 140;
                }

                positions[i * 6 + 3] = positions[i * 6] - windX;
                positions[i * 6 + 5] = positions[i * 6 + 2] - windZ;

                positions[i * 6 + 1] = topY;
                positions[i * 6 + 4] = botY;
            }

            this.rainGeo.attributes.position.needsUpdate = true;
        }

        return {
            weatherType: this.currentWeather,
            wind: this.windVector,
            effects: effects,
            isNight: nightFactor > 0.5,
        };
    }

    rollNewWeather() {
        const rand = Math.random();
        if (rand < 0.35) {
            this.setWeather('fine');
        } else if (rand < 0.75) {
            this.setWeather('rain');
        } else {
            this.setWeather('storm');
        }
    }

    setWeather(type) {
        this.currentWeather = type;
        if (type === 'fine') {
            this.targetWind.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
            if (this.rainMat) this.rainMat.opacity = 0.0;
            if (this.rainParticles) this.rainParticles.visible = false;
        } else if (type === 'rain') {
            this.targetWind.set((Math.random() - 0.5) * 3.5, 0, (Math.random() - 0.5) * 3.5);
            if (this.rainMat) {
                this.rainMat.color.setHex(0xaaccff);
                this.rainMat.opacity = 0.5;
            }
            if (this.rainParticles) this.rainParticles.visible = true;
        } else if (type === 'storm') {
            this.targetWind.set((Math.random() - 0.5) * 6.0, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 6.0);
            if (this.rainMat) {
                this.rainMat.color.setHex(0xcceeff);
                this.rainMat.opacity = 0.50;
            }
            if (this.rainParticles) this.rainParticles.visible = true;
        }
    }
}