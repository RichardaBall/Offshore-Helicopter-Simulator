export class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.masterGain = null;

        // Engine & Rotor Synth Nodes
        this.noiseNode = null;
        this.filterNode = null;
        
        // Turbine Whine Nodes
        this.turbineOsc = null;
        this.turbineGain = null;

        // Rotor Blade Slap (Whop-Whop) Nodes
        this.rotorLfo = null;
        this.rotorLfoGain = null;

        // Master Engine Gain for Smooth Spool Up/Down
        this.engineGain = null;
        this.rotorModGain = null;

        this.isPlaying = false;

        // --- Rain Sound Nodes ---
        this.rainNoiseNode = null;
        this.rainFilterNode = null;
        this.rainGainNode = null;
        this.isRainSoundPlaying = false;

        // --- Auto-Unlock Audio Context on First User Interaction ---
        const unlockAudio = () => {
            this.ensureContextRunning();
            if (this.audioCtx && this.audioCtx.state === 'running') {
                window.removeEventListener('pointerdown', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
                console.log("Web Audio Context successfully unlocked.");
            }
        };
        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
    }

    init() {
        if (this.audioCtx) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
    }

    ensureContextRunning() {
        if (!this.audioCtx) this.init();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // Synthesizes a crisp electrical breaker switch click sound
    playBatterySwitchSound(isOn) {
        this.ensureContextRunning();

        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(isOn ? 1200 : 800, now);
        osc.frequency.exponentialRampToValueAtTime(isOn ? 400 : 200, now + 0.04);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.04);

        const snapOsc = this.audioCtx.createOscillator();
        const snapGain = this.audioCtx.createGain();

        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(2400, now);
        snapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

        snapGain.gain.setValueAtTime(0.3, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        snapOsc.connect(snapGain);
        snapGain.connect(this.masterGain);

        snapOsc.start(now);
        snapOsc.stop(now + 0.02);
    }

    // Synthesizes high-pressure fuel pump motor spooling & priming sound
    playFuelPumpPrimeSound() {
        this.ensureContextRunning();

        const now = this.audioCtx.currentTime;
        const duration = 1.2;

        const pumpOsc = this.audioCtx.createOscillator();
        const pumpGain = this.audioCtx.createGain();

        pumpOsc.type = 'sawtooth';
        pumpOsc.frequency.setValueAtTime(120, now);
        pumpOsc.frequency.exponentialRampToValueAtTime(650, now + 0.4);
        pumpOsc.frequency.setValueAtTime(650, now + 0.4);
        pumpOsc.frequency.linearRampToValueAtTime(600, now + duration);

        pumpGain.gain.setValueAtTime(0.01, now);
        pumpGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        pumpGain.gain.setValueAtTime(0.2, now + duration - 0.2);
        pumpGain.gain.linearRampToValueAtTime(0.001, now + duration);

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(3.0, now);

        pumpOsc.connect(filter);
        filter.connect(pumpGain);
        pumpGain.connect(this.masterGain);

        pumpOsc.start(now);
        pumpOsc.stop(now + duration);

        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(300, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.5);

        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
        noiseGain.gain.setValueAtTime(0.12, now + duration - 0.2);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);
    }

    // Synthesizes hydraulic landing gear motor movement and locking thud
    playLandingGearSound(isRetracting) {
        this.ensureContextRunning();

        const now = this.audioCtx.currentTime;
        const duration = 1.8;

        const motorOsc = this.audioCtx.createOscillator();
        const motorGain = this.audioCtx.createGain();

        motorOsc.type = 'sawtooth';
        const startFreq = isRetracting ? 120 : 180;
        const endFreq = isRetracting ? 180 : 120;

        motorOsc.frequency.setValueAtTime(startFreq, now);
        motorOsc.frequency.linearRampToValueAtTime(endFreq, now + duration);

        motorGain.gain.setValueAtTime(0.01, now);
        motorGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
        motorGain.gain.setValueAtTime(0.15, now + duration - 0.2);
        motorGain.gain.linearRampToValueAtTime(0.001, now + duration);

        const motorFilter = this.audioCtx.createBiquadFilter();
        motorFilter.type = 'lowpass';
        motorFilter.frequency.setValueAtTime(350, now);

        motorOsc.connect(motorFilter);
        motorFilter.connect(motorGain);
        motorGain.connect(this.masterGain);

        motorOsc.start(now);
        motorOsc.stop(now + duration);

        const lockTime = now + duration - 0.1;
        const lockOsc = this.audioCtx.createOscillator();
        const lockGain = this.audioCtx.createGain();

        lockOsc.type = 'triangle';
        lockOsc.frequency.setValueAtTime(80, lockTime);
        lockOsc.frequency.exponentialRampToValueAtTime(20, lockTime + 0.15);

        lockGain.gain.setValueAtTime(0.5, lockTime);
        lockGain.gain.exponentialRampToValueAtTime(0.001, lockTime + 0.15);

        lockOsc.connect(lockGain);
        lockGain.connect(this.masterGain);

        lockOsc.start(lockTime);
        lockOsc.stop(lockTime + 0.15);
    }

    // Starts realistic cockpit turbine spool-up and main rotor blade slap
    startHelicopterEngine() {
        this.ensureContextRunning();
        if (this.isPlaying) return;

        const now = this.audioCtx.currentTime;

        // 1. Noise buffer for engine combustion & fuselage vibration rumble
        const bufferSize = this.audioCtx.sampleRate * 2;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.noiseNode = this.audioCtx.createBufferSource();
        this.noiseNode.buffer = buffer;
        this.noiseNode.loop = true;

        this.filterNode = this.audioCtx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(80, now);

        // 2. High-frequency Turbine Whine Oscillator
        this.turbineOsc = this.audioCtx.createOscillator();
        this.turbineOsc.type = 'sine';
        this.turbineOsc.frequency.setValueAtTime(400, now);

        this.turbineGain = this.audioCtx.createGain();
        this.turbineGain.gain.setValueAtTime(0.00625, now); // Halved again from 0.0125 to 0.00625

        this.turbineOsc.connect(this.turbineGain);

        // 3. Main Rotor Blade Slap LFO (creates the characteristic cabin 'whop-whop' pressure pulse)
        this.rotorLfo = this.audioCtx.createOscillator();
        this.rotorLfo.type = 'triangle';
        this.rotorLfo.frequency.setValueAtTime(4.5, now); // ~4.5 Hz blade pass frequency

        this.rotorLfoGain = this.audioCtx.createGain();
        this.rotorLfoGain.gain.setValueAtTime(0.12, now);

        this.rotorLfo.connect(this.rotorLfoGain);

        // Dedicated modulation gain node for rotor pulsation
        this.rotorModGain = this.audioCtx.createGain();
        this.rotorModGain.gain.setValueAtTime(1.0, now);
        this.rotorLfoGain.connect(this.rotorModGain.gain);

        // 4. Master Engine Gain Node for Spooling
        this.engineGain = this.audioCtx.createGain();
        this.engineGain.gain.setValueAtTime(0.001, now);
        this.engineGain.gain.exponentialRampToValueAtTime(0.45, now + 3.5); // Spool up duration

        // Routing connections
        this.noiseNode.connect(this.filterNode);
        this.filterNode.connect(this.engineGain);
        this.turbineGain.connect(this.engineGain);
        
        this.engineGain.connect(this.rotorModGain);
        this.rotorModGain.connect(this.masterGain);

        this.noiseNode.start(now);
        this.turbineOsc.start(now);
        this.rotorLfo.start(now);

        this.isPlaying = true;
    }

    // Graceful engine spool down and shutdown
    stopHelicopterEngine() {
        if (!this.isPlaying || !this.audioCtx) return;

        const now = this.audioCtx.currentTime;

        if (this.engineGain) {
            this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
            this.engineGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0); // Spool down duration
        }

        if (this.turbineOsc) {
            this.turbineOsc.frequency.setTargetAtTime(100, now, 1.5);
        }

        if (this.rotorLfo) {
            this.rotorLfo.frequency.setTargetAtTime(0.5, now, 1.5);
        }

        setTimeout(() => {
            if (this.noiseNode) {
                this.noiseNode.stop();
                this.noiseNode.disconnect();
            }
            if (this.turbineOsc) {
                this.turbineOsc.stop();
                this.turbineOsc.disconnect();
            }
            if (this.rotorLfo) {
                this.rotorLfo.stop();
                this.rotorLfo.disconnect();
            }
            this.isPlaying = false;
        }, 3000);
    }

    // Modulates pitch, turbine whine, and rotor blade slap frequency based on engine power and airspeed
    updateHelicopterAudio(enginePower, moveSpeed) {
        if (!this.isPlaying || !this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        
        const speedFactor = Math.abs(moveSpeed) / 75.0;

        const targetTurbineFreq = THREEMathClamp(400 + (enginePower * 1400) + (speedFactor * 400), 300, 2400);
        const targetFilterFreq = THREEMathClamp(80 + (enginePower * 320) + (speedFactor * 150), 80, 500);
        const targetRotorFreq = THREEMathClamp(3.5 + (enginePower * 2.0) + (speedFactor * 0.8), 3.0, 6.2);

        this.turbineOsc.frequency.setTargetAtTime(targetTurbineFreq, now, 0.1);
        this.filterNode.frequency.setTargetAtTime(targetFilterFreq, now, 0.1);
        this.rotorLfo.frequency.setTargetAtTime(targetRotorFreq, now, 0.1);
    }

    // --- Cockpit Rain Audio ---
    startRainSound() {
        if (this.isRainSoundPlaying || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;

        const bufferSize = this.audioCtx.sampleRate * 2;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this.rainNoiseNode = this.audioCtx.createBufferSource();
        this.rainNoiseNode.buffer = buffer;
        this.rainNoiseNode.loop = true;

        this.rainFilterNode = this.audioCtx.createBiquadFilter();
        this.rainFilterNode.type = 'bandpass';
        this.rainFilterNode.frequency.setValueAtTime(1400, now);
        this.rainFilterNode.Q.setValueAtTime(1.2, now);

        this.rainGainNode = this.audioCtx.createGain();
        this.rainGainNode.gain.setValueAtTime(0.001, now);
        this.rainGainNode.gain.linearRampToValueAtTime(0.04, now + 1.0); // Halved again from 0.08 to 0.04

        this.rainNoiseNode.connect(this.rainFilterNode);
        this.rainFilterNode.connect(this.rainGainNode);
        this.rainGainNode.connect(this.masterGain);

        this.rainNoiseNode.start(now);
        this.isRainSoundPlaying = true;
    }

    stopRainSound() {
        if (!this.isRainSoundPlaying || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;

        if (this.rainGainNode) {
            this.rainGainNode.gain.setValueAtTime(this.rainGainNode.gain.value, now);
            this.rainGainNode.gain.linearRampToValueAtTime(0.001, now + 1.0);
        }

        setTimeout(() => {
            if (this.rainNoiseNode) {
                this.rainNoiseNode.stop();
                this.rainNoiseNode.disconnect();
                this.rainNoiseNode = null;
            }
            if (this.rainFilterNode) {
                this.rainFilterNode.disconnect();
                this.rainFilterNode = null;
            }
            if (this.rainGainNode) {
                this.rainGainNode.disconnect();
                this.rainGainNode = null;
            }
            this.isRainSoundPlaying = false;
        }, 1000);
    }

    updateRainAudio(weatherData) {
        if (!this.audioCtx) return;
        const isRaining = weatherData && (weatherData.weatherType === 'rain' || weatherData.weatherType === 'storm');

        if (isRaining && !this.isRainSoundPlaying) {
            this.startRainSound();
        } else if (!isRaining && this.isRainSoundPlaying) {
            this.stopRainSound();
        }
    }
}

function THREEMathClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}