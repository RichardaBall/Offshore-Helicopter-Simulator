export class DeveloperTool {
    constructor(weatherSystem) {
        this.weatherSystem = weatherSystem;
        this.isVisible = false;
        this.container = null;

        this.initUI();
        this.initListeners();
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.id = 'developer-tool-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 280px;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(56, 189, 248, 0.4);
            border-radius: 8px;
            padding: 16px;
            color: #f8fafc;
            font-family: monospace;
            font-size: 13px;
            z-index: 10000;
            display: none;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            user-select: none;
        `;

        this.container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <span style="font-weight: bold; color: #38bdf8; letter-spacing: 1px;">DEVELOPER TOOL [T]</span>
                <button id="dev-tool-close" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; font-weight: bold;">&times;</button>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="display: block; color: #94a3b8; margin-bottom: 6px; font-size: 11px; text-transform: uppercase;">Time of Day</label>
                <div style="display: flex; gap: 8px;">
                    <button id="dev-btn-day" style="flex: 1; background: #0284c7; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Day</button>
                    <button id="dev-btn-night" style="flex: 1; background: #334155; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Night</button>
                </div>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="display: block; color: #94a3b8; margin-bottom: 6px; font-size: 11px; text-transform: uppercase;">Weather Condition</label>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <button id="dev-btn-fine" style="background: #0ea5e9; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; text-align: left; font-weight: bold;">☀️ Fine Weather</button>
                    <button id="dev-btn-rain" style="background: #334155; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; text-align: left; font-weight: bold;">🌧️ Rain</button>
                    <button id="dev-btn-storm" style="background: #334155; border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; text-align: left; font-weight: bold;">⚡ Storm</button>
                </div>
            </div>

            <div style="font-size: 10px; color: #64748b; text-align: center; margin-top: 8px;">
                Press [T] to toggle menu
            </div>
        `;

        document.body.appendChild(this.container);

        // Event listeners for UI controls
        document.getElementById('dev-tool-close').addEventListener('click', () => this.toggle());
        
        document.getElementById('dev-btn-day').addEventListener('click', () => {
            if (this.weatherSystem) {
                // Set dayNightTimer to 25% of cycle (Sun at peak noon)
                this.weatherSystem.dayNightTimer = 0.25 * this.weatherSystem.dayCycleDuration;
                this.updateActiveStates();
            }
        });

        document.getElementById('dev-btn-night').addEventListener('click', () => {
            if (this.weatherSystem) {
                // Set dayNightTimer to 75% of cycle (Sun at lowest midnight)
                this.weatherSystem.dayNightTimer = 0.75 * this.weatherSystem.dayCycleDuration;
                this.updateActiveStates();
            }
        });

        document.getElementById('dev-btn-fine').addEventListener('click', () => {
            if (this.weatherSystem) {
                this.weatherSystem.setWeather('fine');
                this.updateActiveStates();
            }
        });

        document.getElementById('dev-btn-rain').addEventListener('click', () => {
            if (this.weatherSystem) {
                this.weatherSystem.setWeather('rain');
                this.updateActiveStates();
            }
        });

        document.getElementById('dev-btn-storm').addEventListener('click', () => {
            if (this.weatherSystem) {
                this.weatherSystem.setWeather('storm');
                this.updateActiveStates();
            }
        });
    }

    initListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.code === 'KeyT' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
        if (this.isVisible) {
            this.updateActiveStates();
        }
    }

    updateActiveStates() {
        if (!this.weatherSystem) return;

        const cycleProgress = this.weatherSystem.dayNightTimer / this.weatherSystem.dayCycleDuration;
        const sunAngle = cycleProgress * Math.PI * 2;
        const sunY = Math.sin(sunAngle) * 400;
        const isDay = sunY >= -20;

        const btnDay = document.getElementById('dev-btn-day');
        const btnNight = document.getElementById('dev-btn-night');
        if (btnDay && btnNight) {
            btnDay.style.background = isDay ? '#0284c7' : '#334155';
            btnNight.style.background = !isDay ? '#0284c7' : '#334155';
        }

        const weather = this.weatherSystem.currentWeather;
        const btnFine = document.getElementById('dev-btn-fine');
        const btnRain = document.getElementById('dev-btn-rain');
        const btnStorm = document.getElementById('dev-btn-storm');

        if (btnFine) btnFine.style.background = weather === 'fine' ? '#0ea5e9' : '#334155';
        if (btnRain) btnRain.style.background = weather === 'rain' ? '#0ea5e9' : '#334155';
        if (btnStorm) btnStorm.style.background = weather === 'storm' ? '#0ea5e9' : '#334155';
    }
}