import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class LiferaftManager {
    constructor(scene) {
        this.scene = scene;
        this.raftMesh = null;
        this.isDeployed = false;

        // Create a simple life raft model (orange circular ring with a grey center floor)
        const raftGroup = new THREE.Group();

        const ringGeo = new THREE.TorusGeometry(2.5, 0.4, 12, 24);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.4 }); // High-visibility orange
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.1;
        raftGroup.add(ring);

        const floorGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 24);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.05;
        raftGroup.add(floor);

        this.raftMesh = raftGroup;
        this.raftMesh.visible = false;
        this.scene.add(this.raftMesh);
    }

    deploy(crashPosition) {
        if (this.isDeployed) return;
        this.isDeployed = true;

        // Position the life raft right at the sea crash coordinates (floating on water level y = 0.0)
        this.raftMesh.position.set(crashPosition.x, 0.0, crashPosition.z);
        this.raftMesh.visible = true;
        
        console.log("Liferaft deployed successfully at:", crashPosition);
    }

    update(delta) {
        if (!this.isDeployed || !this.raftMesh) return;

        // Add a gentle bobbing motion on the water waves
        const time = Date.now() * 0.002;
        this.raftMesh.position.y = Math.sin(time) * 0.15;
        this.raftMesh.rotation.z = Math.cos(time * 0.7) * 0.03;
        this.raftMesh.rotation.x = Math.sin(time * 0.5) * 0.03;
    }
}