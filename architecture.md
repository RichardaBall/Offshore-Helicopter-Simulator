# Project Architecture & AI Guidelines

### Project Overview

A 3D offshore helicopter flight simulation game built using Three.js, WebGL, and modular ES JavaScript. The simulation features an AW189 helicopter operating around an offshore main base environment with dynamic weather systems, custom flight physics, procedural Web Audio sound synthesis, real-time HUD instrumentation, a 3D tactical NDB bearing indicator, a realistic aerial firefighting water/foam drop system, and an interactive bounding box collision system with a crash-free helipad zone.

### File Structure & Module Responsibilities

* **`architecture.md`**: Project documentation mapping file dependencies, system rules, and gameplay specifications.
* **`index.html`**: Main HTML entry point loading the Three.js canvas, HUD overlay elements, fuel test slider, fullscreen controls, and styles.
* **`main.js`**: Central application loop; handles scene orchestration, lighting, model loading, shadow positioning, camera tracking, and game state updates.
* **`sceneSetup.js`**: Initializes the Three.js core environment (`Scene`, `Camera`, `WebGLRenderer`, directional/ambient lighting, fog, and the dynamic ocean water plane).
* **`player.js`**: Controls `HelicopterPlayer` flight physics, mass calculations, rotor rotation, autorotation mechanics, landing gear drag, fuel consumption rates, strobe low-fuel warnings, engine state, and precise bounding box collision detection against structures while keeping the helipad crash-free.
* **`inputManager.js`**: Translates raw user input into flight movement vectors, prioritizing keyboard arrow keys, managing camera distance via mouse scroll, and detecting space bar input for water dispensing.
* **`waterSystem.js`**: Manages the aerial firefighting water/foam drop particle system; generates procedural soft radial canvas textures for aerated mist, handles volumetric particle blending, gravitational acceleration, and aerodynamic slipstream drag.
* **`SoundManager.js`**: Procedural Web Audio API sound generator for electrical clicks, fuel pump prime, landing gear servos, turbine pitch modulation, rotor blade slap ("whop-whop"), and cockpit rain audio.
* **`weather.js`**: Controls `WeatherSystem` (day/night celestial cycle, fog density, wind forces, drag/lift multipliers, and rain particle systems).
* **`navRadio.js`**: NDB Navigation Radio module rendering a compact bottom-right avionics tuning panel (`[N]`) tracking frequency tuning and signal lock to the 210 kHz main base.
* **`navIndicator.js`**: 3D tactical NDB bearing indicator module; attaches a transparent ring bezel and a neon-glowing amber pointer needle directly to the helicopter rotor hub to display relative bearing to the NDB target.
* **`kneeboard.js`**: Pilot Kneeboard module rendering a styled 4-page interactive kneeboard (`[K]`) featuring flight controls reference, pre-flight/flight checklists, fuel and passenger weight manifests with seating arrangement, and an aviation chart displaying Main Base NDB frequency at 210.0 kHz.
* **`windFarm.js`**: Wind Farm module spawning 3 wind turbines located to the North-East with independently rotating rotor blades, flashing red obstruction warning lights, and child-parented collision bounding boxes.
* **`mainbase.js`**: Main Base module loading the offshore platform model serving as the primary helipad, spawn point, NDB beacon target, and child-parented structure collision bounding box (maintaining a crash-free helipad landing zone).
* **`liferaft.js`**: Liferaft module managing emergency sea crash deployment and survival raft simulation upon water impacts.
* **`sirenSystem.js`**: Emergency beacon system managing industrial rotating red siren lights and dynamic spotlights on the main base during fire emergencies.
* **`utilities.js`**: Developer tool module (`DeveloperTool`) providing a UI panel (`[T]`) for toggling day/night time, weather conditions, and interactively placing/positioning/propagating collision bounding boxes across model types.

### Core Controls & Key Bindings

* **`[Q]`**: Toggle Electrical System (Battery)
* **`[F]`**: Toggle Fuel Pump
* **`[E]`**: Toggle Engine Ignition / Fuel Cutoff
* **`[G]`**: Toggle Landing Gear
* **`[L]`**: Toggle Landing Light
* **`[N]`**: Toggle NDB Navigation Radio Panel
* **`[K]`**: Toggle Pilot Kneeboard Display (and switch pages 1–4 when open)
* **`[T]`**: Toggle Developer Tool UI (Time of Day, Weather, and Bounding Box Placer Controls)
* **`Space Bar`**: Hold to continuously dispense aerial firefighting water/foam spray.
* **`Arrow Keys`**: Pitch / Roll / Turn movement
* **`Shift / Ctrl`**: Collective Up / Down (Altitude)
* **`Mouse Wheel`**: Adjust camera follow distance

### Key Gameplay & Simulation Features

* **Aircraft Model**: AW189 helicopter with animated rotor blades and aerodynamic properties.
* **Environment & Lighting**: Offshore main base platform equipped with helipad and structure lights set against dynamic ocean waves and day/night weather cycles, complemented by a North-East wind farm featuring 3 animated wind turbines with synchronized flashing red obstruction lights and emergency siren systems.
* **Flight Systems**: Modeled autorotation, landing gear drag penalties, dynamic fuel consumption based on mass and weather, and strobe lighting fuel warnings (<= 500 kg orange, <= 100 kg rapid flash red).
* **Firefighting Water Drop System**: High-density volumetric particle system (`waterSystem.js`) featuring procedural aerated white mist/foam textures, gravitational acceleration, and aerodynamic slipstream drag sweep matching real-world helicopter water bucket drops.
* **Collision System & Bounding Box Placer**: Interactive developer tool for positioning collision bounding boxes as child nodes of models (propagating across all model instances of the same type) with precise helicopter-structure collision checks that keep the helipad landing zone 100% crash-free.

### Assets

* **`helicopter.glb`**: Primary 3D AW189 helicopter model with rotor animation mixers.
* **`mainbase.glb`**: Offshore platform 3D model serving as the primary helipad, spawn point, and NDB beacon target.
* **`WTG.glb`**: 3D wind turbine model utilized by the wind farm module.