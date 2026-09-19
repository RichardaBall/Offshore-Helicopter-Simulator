export class Kneeboard {
    constructor() {
        this.visible = true; // Open by default at the start of the game
        this.playerRef = null;
        this.navRadioRef = null;
        this.currentPage = 0;
        this.totalPages = 4;
        this.createElement();
        this.initListeners();
    }

    createElement() {
        this.container = document.createElement('div');
        this.container.id = 'pilot-kneeboard';
        this.container.style.cssText = `
            position: absolute;
            bottom: 30px;
            left: 30px;
            width: 270px;
            background: #d8d0b0;
            border: 4px solid #4a4532;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.08);
            font-family: 'Courier New', Courier, monospace;
            color: #222;
            padding: 12px 15px 12px 15px;
            display: block;
            z-index: 1000;
            user-select: none;
            pointer-events: auto;
        `;

        // Metallic binder clip at the top
        const clip = document.createElement('div');
        clip.style.cssText = `
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            width: 70px;
            height: 15px;
            background: linear-gradient(to bottom, #a0a0a0, #505050);
            border: 1px solid #333;
            border-radius: 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        `;
        this.container.appendChild(clip);

        // Header title
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            font-size: 13px;
            border-bottom: 2px dashed #6b634b;
            padding-bottom: 5px;
            margin-bottom: 8px;
            text-align: center;
            letter-spacing: 1px;
            color: #1a1a1a;
        `;
        header.innerText = 'PILOT KNEEBOARD // AW189';
        this.container.appendChild(header);

        // Pages container
        this.pagesWrapper = document.createElement('div');
        this.pagesWrapper.style.cssText = `
            position: relative;
            min-height: 290px;
            overflow: hidden;
        `;

        // Page 1: Controls Reference
        this.page1El = document.createElement('div');
        this.page1El.style.cssText = this.getPageStyle(0);
        this.page1El.innerHTML = `
            <div style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 11px; margin-bottom: 6px; color: #3a3525; letter-spacing: 0.5px;">CONTROLS</div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">1. SYSTEMS</div>
                <div style="display: flex; justify-content: space-between;"><span>Battery Switch:</span><strong>[Q]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Fuel Pump Prime:</span><strong>[F]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Engine Ignition:</span><strong>[E]</strong></div>
            </div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">2. FLIGHT CONTROLS</div>
                <div style="display: flex; justify-content: space-between;"><span>Pitch / Roll / Yaw:</span><strong>Arrow Keys</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Collective Up/Dn:</span><strong>Shift/Ctrl</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Camera Zoom:</span><strong>Mouse Wheel</strong></div>
            </div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">3. LIGHTING & GEAR</div>
                <div style="display: flex; justify-content: space-between;"><span>Landing Gear:</span><strong>[G]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Landing Light:</span><strong>[L]</strong></div>
            </div>

            <div style="font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">4. FIREFIGHTING & UI</div>
                <div style="display: flex; justify-content: space-between;"><span>Water Spray:</span><strong>Hold [Space]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>Toggle Kneeboard:</span><strong>[K]</strong></div>
            </div>
        `;

        // Page 2: Flight Checklist
        this.page2El = document.createElement('div');
        this.page2El.style.cssText = this.getPageStyle(1);
        this.page2El.innerHTML = `
            <div style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 11px; margin-bottom: 6px; color: #3a3525; letter-spacing: 0.5px;">CHECKLIST</div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">1. STARTUP</div>
                <div style="display: flex; justify-content: space-between;"><span>• Battery Switch:</span><strong>ON [Q]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>• Fuel Pump Prime:</span><strong>ON [F]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>• Engine Starter:</span><strong>ON [E]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>• Nav Radio Tuned:</span><strong>VERIFY [N]</strong></div>
            </div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">2. AFTER TAKEOFF</div>
                <div style="display: flex; justify-content: space-between;"><span>• Landing Gear:</span><strong>UP [G]</strong></div>
            </div>

            <div style="margin-bottom: 6px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">3. BEFORE LANDING</div>
                <div style="display: flex; justify-content: space-between;"><span>• Landing Gear:</span><strong>DOWN [G]</strong></div>
            </div>

            <div style="font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">4. SHUTDOWN</div>
                <div style="display: flex; justify-content: space-between;"><span>• Fuel Pump:</span><strong>OFF [F]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>• Engine Cutoff:</span><strong>OFF [E]</strong></div>
                <div style="display: flex; justify-content: space-between;"><span>• Battery Switch:</span><strong>OFF [Q]</strong></div>
            </div>
        `;

        // Page 3: Fuel & Water Tank Manifest
        this.page3El = document.createElement('div');
        this.page3El.style.cssText = this.getPageStyle(2);
        this.page3El.innerHTML = `
            <div style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 11px; margin-bottom: 6px; color: #3a3525; letter-spacing: 0.5px;">MANIFEST</div>

            <div style="margin-bottom: 8px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">REFUEL MANIFEST</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Fuel Load:</span><span><strong id="kb-fuel-val">1000</strong> kg</span>
                </div>
                <input type="range" id="kb-fuel-slider" min="0" max="1500" value="1000" step="10" style="width: 100%; accent-color: #4a4532; cursor: pointer;">
            </div>

            <div style="margin-bottom: 8px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">WATER TANK MANIFEST (Max 1500 kg)</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span>Water Load:</span><span><strong id="kb-water-val">1000</strong> kg</span>
                </div>
                <input type="range" id="kb-water-slider" min="0" max="1500" value="1000" step="10" style="width: 100%; accent-color: #2675b4; cursor: pointer;">
            </div>

            <div style="margin-bottom: 8px; font-size: 10px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">WATER TANK STATUS</div>
                <div style="background: #c9bf9b; border: 2px solid #4a4532; border-radius: 4px; padding: 6px; text-align: center;">
                    <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px; color: #1c4e80;">[ FIREFIGHTING TANK ]</div>
                    <div style="width: 100%; background: #b0a682; height: 16px; border: 1px solid #4a4532; border-radius: 3px; overflow: hidden; position: relative;">
                        <div id="kb-water-bar" style="width: 66.6%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0284c7); transition: width 0.1s ease-out;"></div>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                            <span id="kb-water-pct">67</span>%
                        </div>
                    </div>
                </div>
            </div>

            <div style="font-size: 10px; font-weight: bold; border-top: 1px dashed #6b634b; padding-top: 4px; display: flex; justify-content: space-between;">
                <span>Total Gross Mass:</span><span><strong id="kb-total-mass">6600</strong> kg</span>
            </div>
        `;

        // Page 4: Aviation Chart & Nav Frequencies (Rig Alpha + All Wind Farm NDBs)
        this.page4El = document.createElement('div');
        this.page4El.style.cssText = this.getPageStyle(3);
        this.page4El.innerHTML = `
            <div style="font-weight: bold; text-align: center; text-decoration: underline; font-size: 11px; margin-bottom: 5px; color: #3a3525; letter-spacing: 0.5px;">AVIATION CHART</div>

            <div style="position: relative; background: #cebfa0; border: 2px solid #4a4532; border-radius: 4px; padding: 3px; text-align: center; height: 105px; box-sizing: border-box; margin-bottom: 5px;">
                <!-- Grid & Map SVG -->
                <svg width="100%" height="100%" viewBox="0 0 200 100" style="display: block;">
                    <!-- Grid Lines -->
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#b8a882" stroke-dasharray="2,2" stroke-width="1"/>
                    <line x1="100" y1="0" x2="100" y2="100" stroke="#a3936e" stroke-width="1.5"/>
                    <line x1="150" y1="0" x2="150" y2="100" stroke="#b8a882" stroke-dasharray="2,2" stroke-width="1"/>
                    
                    <line x1="0" y1="25" x2="200" y2="25" stroke="#b8a882" stroke-dasharray="2,2" stroke-width="1"/>
                    <line x1="0" y1="50" x2="200" y2="50" stroke="#a3936e" stroke-width="1.5"/>
                    <line x1="0" y1="75" x2="200" y2="75" stroke="#b8a882" stroke-dasharray="2,2" stroke-width="1"/>

                    <!-- Compass / North Arrow -->
                    <g transform="translate(180, 15)">
                        <polygon points="0,-8 3,5 0,2 -3,5" fill="#4a4532"/>
                        <text x="0" y="-10" font-size="6" font-weight="bold" fill="#4a4532" text-anchor="middle">N</text>
                    </g>

                    <!-- Oil Rig Alpha Marker (Center) -->
                    <g transform="translate(100, 50)">
                        <circle cx="0" cy="0" r="7" fill="none" stroke="#8b0000" stroke-width="1.5" stroke-dasharray="3,2"/>
                        <rect x="-3" y="-3" width="6" height="6" fill="#4a4532" rx="1"/>
                        <text x="0" y="-10" font-size="6" font-weight="bold" fill="#8b0000" text-anchor="middle">RIG ALPHA</text>
                    </g>

                    <!-- Wind Farm Markers (Circular Layout) -->
                    <g transform="translate(145, 30)">
                        <circle cx="0" cy="0" r="4" fill="#c05000"/>
                        <text x="0" y="8" font-size="4.5" font-weight="bold" fill="#c05000" text-anchor="middle">WTG 1</text>
                    </g>
                    <g transform="translate(120, 20)">
                        <circle cx="0" cy="0" r="4" fill="#c05000"/>
                        <text x="0" y="8" font-size="4.5" font-weight="bold" fill="#c05000" text-anchor="middle">WTG 2</text>
                    </g>
                    <g transform="translate(160, 55)">
                        <circle cx="0" cy="0" r="4" fill="#c05000"/>
                        <text x="0" y="8" font-size="4.5" font-weight="bold" fill="#c05000" text-anchor="middle">WTG 3</text>
                    </g>
                </svg>
            </div>

            <div style="font-size: 8.5px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px; color: #3a3525;">NAV & OBSTRUCTION HAZARDS</div>
                <div style="background: #c9bf9b; border: 1px solid #4a4532; border-radius: 3px; padding: 4px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #b5ac8c; padding-bottom: 2px; margin-bottom: 2px;">
                        <span><strong>RIG ALPHA (RGA):</strong></span>
                        <span><strong>210.0 kHz</strong></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #b5ac8c; padding-bottom: 2px; margin-bottom: 2px;">
                        <span><strong>WTG #1 HAZARD:</strong></span>
                        <span><strong>350.0 kHz</strong></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #b5ac8c; padding-bottom: 2px; margin-bottom: 2px;">
                        <span><strong>WTG #2 HAZARD:</strong></span>
                        <span><strong>240.0 kHz</strong></span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>WTG #3 HAZARD:</strong></span>
                        <span><strong>290.0 kHz</strong></span>
                    </div>
                </div>
            </div>
        `;

        this.pagesWrapper.appendChild(this.page1El);
        this.pagesWrapper.appendChild(this.page2El);
        this.pagesWrapper.appendChild(this.page3El);
        this.pagesWrapper.appendChild(this.page4El);
        this.container.appendChild(this.pagesWrapper);

        // Bottom Tab Bar
        const tabFooter = document.createElement('div');
        tabFooter.style.cssText = `
            display: flex;
            gap: 3px;
            border-top: 2px dashed #6b634b;
            padding-top: 6px;
            margin-top: 6px;
        `;

        this.tab1Btn = document.createElement('button');
        this.tab1Btn.innerText = 'CONTROLS';
        this.tab1Btn.style.cssText = this.getTabStyle(true);
        this.tab1Btn.addEventListener('click', () => this.switchPage(0));

        this.tab2Btn = document.createElement('button');
        this.tab2Btn.innerText = 'CHECKLIST';
        this.tab2Btn.style.cssText = this.getTabStyle(false);
        this.tab2Btn.addEventListener('click', () => this.switchPage(1));

        this.tab3Btn = document.createElement('button');
        this.tab3Btn.innerText = 'MANIFEST';
        this.tab3Btn.style.cssText = this.getTabStyle(false);
        this.tab3Btn.addEventListener('click', () => this.switchPage(2));

        this.tab4Btn = document.createElement('button');
        this.tab4Btn.innerText = 'CHART';
        this.tab4Btn.style.cssText = this.getTabStyle(false);
        this.tab4Btn.addEventListener('click', () => this.switchPage(3));

        tabFooter.appendChild(this.tab1Btn);
        tabFooter.appendChild(this.tab2Btn);
        tabFooter.appendChild(this.tab3Btn);
        tabFooter.appendChild(this.tab4Btn);
        this.container.appendChild(tabFooter);

        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            input[type=range]:disabled { opacity: 0.5; cursor: not-allowed !important; }
        `;
        document.head.appendChild(styleTag);

        document.body.appendChild(this.container);

        // Slider listeners
        const fuelSlider = this.container.querySelector('#kb-fuel-slider');
        if (fuelSlider) {
            fuelSlider.addEventListener('input', (e) => {
                if (this.playerRef && this.isConfigAllowed(this.playerRef)) {
                    const val = parseFloat(e.target.value);
                    this.playerRef.fuelKg = val;
                    const valEl = document.getElementById('kb-fuel-val');
                    if (valEl) valEl.innerText = val;
                    this.updateManifestDisplay();
                }
            });
        }

        const waterSlider = this.container.querySelector('#kb-water-slider');
        if (waterSlider) {
            waterSlider.addEventListener('input', (e) => {
                if (this.playerRef && this.isConfigAllowed(this.playerRef)) {
                    const val = parseFloat(e.target.value);
                    this.playerRef.waterTankKg = val;
                    const waterValEl = document.getElementById('kb-water-val');
                    if (waterValEl) waterValEl.innerText = val;
                    this.updateWaterBarVisuals(val);
                    this.updateManifestDisplay();
                }
            });
        }
    }

    getPageStyle(index) {
        const isDefault = index === 0;
        return `
            position: absolute;
            width: 100%;
            transition: transform 0.35s ease-in-out, opacity 0.35s ease-in-out;
            opacity: ${isDefault ? '1' : '0'};
            transform: translateX(${index * 100}%);
        `;
    }

    getTabStyle(active) {
        return `
            flex: 1;
            background: ${active ? '#4a4532' : '#b8b090'};
            color: ${active ? '#d8d0b0' : '#4a4532'};
            border: 1px solid #4a4532;
            padding: 5px 1px;
            font-family: inherit;
            font-size: 8px;
            font-weight: bold;
            border-radius: 3px;
            cursor: pointer;
            text-align: center;
            transition: background 0.2s, color 0.2s;
        `;
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyK') {
                this.toggle();
            } else if (this.visible) {
                if (e.code === 'Digit1') this.switchPage(0);
                else if (e.code === 'Digit2') this.switchPage(1);
                else if (e.code === 'Digit3') this.switchPage(2);
                else if (e.code === 'Digit4') this.switchPage(3);
            }
        });
    }

    switchPage(pageIndex) {
        if (pageIndex === this.currentPage) return;
        this.currentPage = pageIndex;

        const tabs = [this.tab1Btn, this.tab2Btn, this.tab3Btn, this.tab4Btn];
        const pages = [this.page1El, this.page2El, this.page3El, this.page4El];

        tabs.forEach((tab, idx) => {
            tab.style.cssText = this.getTabStyle(idx === this.currentPage);
        });

        pages.forEach((page, idx) => {
            const diff = idx - this.currentPage;
            page.style.transform = `translateX(${diff * 100}%)`;
            page.style.opacity = (diff === 0) ? '1' : '0';
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
    }

    isConfigAllowed(player) {
        if (!player) return true;
        
        const qOff = !player.batteryOn && !player.isElectricalOn && !player.powerOn && !player.isBatteryOn;
        const fOff = !player.fuelPumpOn && !player.isFuelPumpOn && !player.fuelPump;
        const eOff = !player.engineRunning && !player.isEngineRunning && !player.engineOn && !player.isEngineOn && !player.isStarterOn && !player.starterOn && !player.ignitionOn;
        
        return qOff && fOff && eOff;
    }

    updateWaterBarVisuals(waterKg) {
        const maxWater = 1500;
        const pct = Math.max(0, Math.min(100, Math.round((waterKg / maxWater) * 100)));
        const waterBar = document.getElementById('kb-water-bar');
        const waterPct = document.getElementById('kb-water-pct');
        if (waterBar) waterBar.style.width = `${pct}%`;
        if (waterPct) waterPct.innerText = pct;
    }

    updateManifestDisplay() {
        const fuelSlider = document.getElementById('kb-fuel-slider');
        const waterSlider = document.getElementById('kb-water-slider');
        const fuelVal = fuelSlider ? parseFloat(fuelSlider.value) : 1000;
        const waterVal = waterSlider ? parseFloat(waterSlider.value) : 1000;

        const totalMassEl = document.getElementById('kb-total-mass');
        if (totalMassEl) {
            const emptyWeight = 4600;
            const total = emptyWeight + fuelVal + waterVal;
            totalMassEl.innerText = total;
        }
    }

    update(player, weatherData, navRadio) {
        this.playerRef = player;
        if (!this.visible) return;

        if (player) {
            const allowed = this.isConfigAllowed(player);
            const fuelSlider = document.getElementById('kb-fuel-slider');
            const waterSlider = document.getElementById('kb-water-slider');

            if (fuelSlider) fuelSlider.disabled = !allowed;
            if (waterSlider) waterSlider.disabled = !allowed;

            if (allowed && fuelSlider && document.activeElement !== fuelSlider && player.fuelKg !== undefined) {
                fuelSlider.value = player.fuelKg;
                const fuelVal = document.getElementById('kb-fuel-val');
                if (fuelVal) fuelVal.innerText = Math.round(player.fuelKg);
            }

            if (allowed && waterSlider && document.activeElement !== waterSlider && player.waterTankKg !== undefined) {
                waterSlider.value = player.waterTankKg;
                const waterVal = document.getElementById('kb-water-val');
                if (waterVal) waterVal.innerText = Math.round(player.waterTankKg);
                this.updateWaterBarVisuals(player.waterTankKg);
            }

            this.updateManifestDisplay();
        }
    }
}