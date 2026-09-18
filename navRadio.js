/**
 * navRadio.js
 * NDB Navigation Radio Module for Helicopter Flight Simulator.
 * Compact, half-size single-frequency avionics panel with animated tuning knob.
 * Hidden by default, toggled with [N].
 */

export class NavRadio {
    constructor(player, targetObjectOrPosition) {
        this.player = player;
        this.targetPosition = targetObjectOrPosition;
        
        this.powered = true;
        this.activeFrequency = 210; // Default tuned to Oil Rig NDB frequency (210 kHz)
        this.targetFrequency = 210; // Oil Rig NDB frequency

        this.knobAngle = 0; // Rotation angle for tuning knob animation

        // Cache last applied states to prevent DOM thrashing
        this._lastFreqText = '';
        this._lastPowered = null;
        this._lastStatusText = '';
        
        this.createElement();
        this.setupEventListeners();
    }

    createElement() {
        const existingPanel = document.getElementById('nav-radio-panel');
        if (existingPanel) existingPanel.remove();

        const existingHudGauge = document.getElementById('nav-hud-gauge');
        if (existingHudGauge) existingHudGauge.remove();

        const existingCompass = document.getElementById('nav-compass-bar');
        if (existingCompass) existingCompass.remove();

        const existingRing = document.getElementById('nav-hud-ring');
        if (existingRing) existingRing.remove();

        // Radio Control Panel (Bottom Right) - Compact half-size avionics unit
        this.container = document.createElement('div');
        this.container.id = 'nav-radio-panel';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
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
            display: none; /* Hidden by default on game start */
            user-select: none;
            pointer-events: auto;
        `;

        this.container.innerHTML = `
            <!-- Corner Screws & Panel Header -->
            <div style="position: absolute; top: 4px; left: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; top: 4px; right: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; bottom: 4px; left: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>
            <div style="position: absolute; bottom: 4px; right: 6px; font-size: 7px; color: #555; font-weight: bold;">⊗</div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 2px;">
                <div style="font-size: 8px; font-weight: bold; color: #9ca3af; letter-spacing: 1px;">ADF [N]</div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="font-size: 7px; color: #888;">PWR</span>
                    <div id="nav-power-led" style="width: 7px; height: 7px; background-color: #ff3333; border-radius: 50%; box-shadow: 0 0 5px #ff3333; border: 1px solid #500;"></div>
                </div>
            </div>

            <!-- Main Display & Control Deck -->
            <div style="background: #111215; border: 1px inset #2a2d32; border-radius: 3px; padding: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 7px; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 2px;">ACTIVE kHz</div>
                    <div id="nav-freq-display" style="font-size: 16px; font-weight: bold; color: #ffb703; text-shadow: 0 0 6px rgba(255,183,3,0.6); letter-spacing: 1px;">210.0</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 7px; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 2px;">STAT</div>
                    <div id="nav-status-display" style="font-size: 8px; font-weight: bold; color: #22d3ee;">LOCKED</div>
                </div>
            </div>

            <!-- Bottom Section: Tuning Knob & Status Info -->
            <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
                <div style="font-size: 7px; color: #9ca3af; line-height: 1.3;">
                    <div>SCROLL TO TUNE</div>
                    <div style="font-size: 6px; color: #6b7280;">190 - 460 kHz</div>
                </div>
                <!-- Animated Rotary Knob Graphic -->
                <div id="nav-tuning-knob" title="Scroll to tune frequency" style="width: 30px; height: 30px; background: radial-gradient(circle at 35% 35%, #4b5563, #1f2937); border-radius: 50%; border: 1.5px solid #374151; box-shadow: 0 3px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: transform 0.15s ease-out; transform: rotate(0deg);">
                    <div style="width: 3px; height: 10px; background: #9ca3af; position: absolute; top: 3px; border-radius: 1.5px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        // References
        this.freqDisplay = this.container.querySelector('#nav-freq-display');
        this.statusDisplay = this.container.querySelector('#nav-status-display');
        this.powerLed = this.container.querySelector('#nav-power-led');
        this.tuningKnob = this.container.querySelector('#nav-tuning-knob');
    }

    setupEventListeners() {
        if (!window.__navRadioKeyBound) {
            window.__navRadioKeyBound = true;
            window.addEventListener('keydown', (e) => {
                if (e.code === 'KeyN' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    const panel = document.getElementById('nav-radio-panel');
                    if (panel) {
                        const isVisible = panel.style.display === 'block';
                        panel.style.display = isVisible ? 'none' : 'block';
                    }
                }
            });
        }

        const stopEvents = ['wheel', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
        stopEvents.forEach(eventType => {
            this.container.addEventListener(eventType, (e) => {
                e.stopPropagation();
            }, { passive: true });
        });

        // Scroll listener to adjust frequency and animate the knob rotation
        this.container.addEventListener('wheel', (e) => {
            e.stopPropagation();
            if (e.deltaY < 0) {
                this.activeFrequency = Math.min(460, this.activeFrequency + 10);
                this.knobAngle += 20;
            } else {
                this.activeFrequency = Math.max(190, this.activeFrequency - 10);
                this.knobAngle -= 20;
            }

            if (this.tuningKnob) {
                this.tuningKnob.style.transform = `rotate(${this.knobAngle}deg)`;
            }

            this.updateDisplay();
        });
    }

    updateDisplay() {
        const freqText = `${this.activeFrequency.toFixed(1)}`;
        if (this._lastFreqText !== freqText) {
            this.freqDisplay.textContent = freqText;
            this._lastFreqText = freqText;
        }

        const isTuned = (this.activeFrequency === this.targetFrequency);
        let statusText = (isTuned && this.powered) ? 'LOCKED' : (this.powered ? 'NO SIG' : 'OFF');
        let statusColor = (isTuned && this.powered) ? '#22d3ee' : (this.powered ? '#f59e0b' : '#ef4444');

        if (this._lastStatusText !== statusText) {
            this.statusDisplay.textContent = statusText;
            this.statusDisplay.style.color = statusColor;
            this._lastStatusText = statusText;
        }

        if (this._lastPowered !== this.powered) {
            if (this.powered) {
                this.powerLed.style.backgroundColor = '#ff3333';
                this.powerLed.style.boxShadow = '0 0 5px #ff3333';
            } else {
                this.powerLed.style.backgroundColor = '#441111';
                this.powerLed.style.boxShadow = 'none';
            }
            this._lastPowered = this.powered;
        }
    }

    update(camera, helicopterMesh) {
        try {
            if (this.player && typeof this.player.isElectricalOn !== 'undefined') {
                this.powered = Boolean(this.player.isElectricalOn);
            } else {
                this.powered = true;
            }

            this.updateDisplay();
        } catch (err) {
            console.warn('NavRadio update error:', err);
        }
    }
}