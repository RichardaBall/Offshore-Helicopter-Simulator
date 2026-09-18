/**
 * navIndicator.js
 * 3D Tactical NDB Bearing Indicator visible only when nav radio is powered ON and a valid frequency is tuned.
 */
import * as THREE from 'three';

export class NavIndicator {
    constructor(player, navRadioInstance, helicopterMesh, config = { x: -1.60, y: 3.95, z: 0.10, ringOD: 0.75, arrowLength: 0.6 }) {
        this.player = player;
        this.navRadio = navRadioInstance;
        this.helicopterMesh = helicopterMesh;

        this.offsetX = config.x !== undefined ? config.x : -1.60;
        this.offsetY = config.y !== undefined ? config.y : 3.95;
        this.offsetZ = config.z !== undefined ? config.z : 0.10;
        this.ringOD = config.ringOD !== undefined ? config.ringOD : 0.75;
        this.arrowLength = config.arrowLength !== undefined ? config.arrowLength : 0.6;

        this.pointerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffb703,
            emissive: 0xffd000,
            emissiveIntensity: 3.0,
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        this.createMesh();
        this.createTunerUI();
    }

    createMesh() {
        if (this.mesh && this.helicopterMesh) {
            this.helicopterMesh.remove(this.mesh);
        }

        this.mesh = new THREE.Group();

        this.pointerGroup = new THREE.Group();
        const outerRadius = Math.max(0.05, this.ringOD / 2);
        const tipWidth = Math.min(0.08, outerRadius * 0.4);
        const tipGeo = new THREE.ConeGeometry(tipWidth, tipWidth * 2.5, 12);
        tipGeo.rotateX(Math.PI / 2);
        const tipMesh = new THREE.Mesh(tipGeo, this.pointerMaterial);
        tipMesh.position.set(0, 0, this.arrowLength);
        this.pointerGroup.add(tipMesh);
        this.mesh.add(this.pointerGroup);

        this.mesh.position.set(this.offsetX, this.offsetY, this.offsetZ);
        this.mesh.visible = false;

        if (this.helicopterMesh) {
            this.helicopterMesh.add(this.mesh);
        }
    }

    rebuildGeometry() {
        if (this.mesh) {
            this.mesh.clear();
        }

        this.pointerGroup = new THREE.Group();
        const outerRadius = Math.max(0.05, this.ringOD / 2);
        const tipWidth = Math.min(0.08, outerRadius * 0.4);
        const tipGeo = new THREE.ConeGeometry(tipWidth, tipWidth * 2.5, 12);
        tipGeo.rotateX(Math.PI / 2);
        const tipMesh = new THREE.Mesh(tipGeo, this.pointerMaterial);
        tipMesh.position.set(0, 0, this.arrowLength);
        this.pointerGroup.add(tipMesh);
        this.mesh.add(this.pointerGroup);

        this.mesh.position.set(this.offsetX, this.offsetY, this.offsetZ);
    }

    createTunerUI() {
        const existing = document.getElementById('nav-tuner-panel');
        if (existing) existing.remove();

        this.tunerContainer = document.createElement('div');
        this.tunerContainer.id = 'nav-tuner-panel';
        this.tunerContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 240px;
            background: rgba(17, 18, 21, 0.92);
            border: 2px solid #ffb703;
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.8);
            font-family: 'Courier New', Courier, monospace;
            color: #d1d5db;
            padding: 12px;
            z-index: 10001;
            display: none;
            user-select: none;
            pointer-events: auto;
        `;

        this.tunerContainer.innerHTML = `
            <div style="font-size: 10px; font-weight: bold; color: #ffb703; margin-bottom: 8px; border-bottom: 1px solid #374151; padding-bottom: 4px; display: flex; justify-content: space-between;">
                <span>NAV INDICATOR TUNER</span>
                <span style="color: #9ca3af; font-size: 8px;">[Press I to Hide]</span>
            </div>
            <div style="font-size: 8px; margin-bottom: 6px; color: #9ca3af;">Adjust position & scale over rotor:</div>
            
            <div style="margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 8px;"><label>X Offset:</label><span id="val-x">${this.offsetX.toFixed(2)}</span></div>
                <input type="range" id="slider-x" min="-3" max="3" step="0.05" value="${this.offsetX}" style="width: 100%; cursor: pointer;">
            </div>
            <div style="margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 8px;"><label>Y Height:</label><span id="val-y">${this.offsetY.toFixed(2)}</span></div>
                <input type="range" id="slider-y" min="2" max="7" step="0.05" value="${this.offsetY}" style="width: 100%; cursor: pointer;">
            </div>
            <div style="margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 8px;"><label>Z Offset:</label><span id="val-z">${this.offsetZ.toFixed(2)}</span></div>
                <input type="range" id="slider-z" min="-3" max="3" step="0.05" value="${this.offsetZ}" style="width: 100%; cursor: pointer;">
            </div>
            <div style="margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 8px;"><label>Ring Size (OD):</label><span id="val-ring">${this.ringOD.toFixed(2)}</span></div>
                <input type="range" id="slider-ring" min="0.1" max="2.0" step="0.05" value="${this.ringOD}" style="width: 100%; cursor: pointer;">
            </div>
            <div style="margin-bottom: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 8px;"><label>Arrow Length (Radius):</label><span id="val-arrow">${this.arrowLength.toFixed(2)}</span></div>
                <input type="range" id="slider-arrow" min="0.05" max="2.0" step="0.05" value="${this.arrowLength}" style="width: 100%; cursor: pointer;">
            </div>
        `;
        document.body.appendChild(this.tunerContainer);

        const bindSlider = (id, valId, property, needsRebuild = false) => {
            const slider = this.tunerContainer.querySelector(`#slider-${id}`);
            const span = this.tunerContainer.querySelector(`#val-${valId}`);
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this[property] = val;
                span.textContent = val.toFixed(2);
                if (needsRebuild) {
                    this.rebuildGeometry();
                } else {
                    this.mesh.position.set(this.offsetX, this.offsetY, this.offsetZ);
                }
                console.log(`NavIndicator Config: { x: ${this.offsetX.toFixed(2)}, y: ${this.offsetY.toFixed(2)}, z: ${this.offsetZ.toFixed(2)}, ringOD: ${this.ringOD.toFixed(2)}, arrowLength: ${this.arrowLength.toFixed(2)} }`);
            });
        };

        bindSlider('x', 'x', 'offsetX', false);
        bindSlider('y', 'y', 'offsetY', false);
        bindSlider('z', 'z', 'offsetZ', false);
        bindSlider('ring', 'ring', 'ringOD', true);
        bindSlider('arrow', 'arrow', 'arrowLength', true);

        if (!window.__navTunerKeyBound) {
            window.__navTunerKeyBound = true;
            window.addEventListener('keydown', (e) => {
                if (e.code === 'KeyI' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    const panel = document.getElementById('nav-tuner-panel');
                    if (panel) {
                        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
                    }
                }
            });
        }

        ['mousedown', 'mouseup', 'click', 'pointerdown', 'wheel'].forEach(evt => {
            this.tunerContainer.addEventListener(evt, (e) => e.stopPropagation());
        });
    }

    update() {
        if (!this.player || !this.helicopterMesh || !this.mesh || !this.navRadio) return;

        // Check power state, tuned state, and target position
        const isPowered = typeof this.navRadio.isPowered === 'function' ? this.navRadio.isPowered() : (this.navRadio.powered === true);
        const isTuned = typeof this.navRadio.isTuned === 'function' ? this.navRadio.isTuned() : true;
        const targetPos = typeof this.navRadio.getTargetPosition === 'function' ? this.navRadio.getTargetPosition() : null;

        const shouldShow = isPowered && isTuned && targetPos !== null;
        this.mesh.visible = shouldShow;
        if (!shouldShow) return;

        this.helicopterMesh.updateMatrixWorld(true);
        const worldPos = this.mesh.getWorldPosition(new THREE.Vector3());

        const dx = targetPos.x - worldPos.x;
        const dz = targetPos.z - worldPos.z;
        const targetWorldAngle = Math.atan2(dx, dz);

        const q = new THREE.Quaternion();
        this.helicopterMesh.getWorldQuaternion(q);
        const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        const heliHeading = euler.y;

        if (this.pointerGroup) {
            this.pointerGroup.rotation.y = targetWorldAngle - heliHeading;
        }
    }
}