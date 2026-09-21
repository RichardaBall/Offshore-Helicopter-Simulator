\# Project Architecture \& AI Guidelines



\### Project Overview



A 3D offshore helicopter flight simulation game built using Three.js, WebGL, and modular ES JavaScript. The simulation features an AW189 helicopter operating around an offshore main base environment with dynamic weather systems, custom flight physics, procedural Web Audio sound synthesis, real-time HUD instrumentation, a 3D tactical NDB bearing indicator, and a realistic aerial firefighting water/foam drop system.



\### File Structure \& Module Responsibilities



\* \*\*`architecture.md`\*\*: Project documentation mapping file dependencies, system rules, and gameplay specifications.

\* \*\*`index.html`\*\*: Main HTML entry point loading the Three.js canvas, HUD overlay elements, fuel test slider, fullscreen controls, and styles.

\* \*\*`main.js`\*\*: Central application loop; handles scene orchestration, lighting, model loading, shadow positioning, camera tracking, and game state updates.

\* \*\*`sceneSetup.js`\*\*: Initializes the Three.js core environment (`Scene`, `Camera`, `WebGLRenderer`, directional/ambient lighting, fog, and the dynamic ocean water plane).

\* \*\*`player.js`\*\*: Controls `HelicopterPlayer` flight physics, mass calculations, rotor rotation, autorotation mechanics, landing gear drag, fuel consumption rates, strobe low-fuel warnings, and engine state.

\* \*\*`inputManager.js`\*\*: Translates raw user input into flight movement vectors, prioritizing keyboard arrow keys, managing camera distance via mouse scroll, and detecting space bar input for water dispensing.

\* \*\*`waterSystem.js`\*\*: Manages the aerial firefighting water/foam drop particle system; generates procedural soft radial canvas textures for aerated mist, handles volumetric particle blending, gravitational acceleration, and aerodynamic slipstream drag.

\* \*\*`SoundManager.js`\*\*: Procedural Web Audio API sound generator for electrical clicks, fuel pump prime, landing gear servos, turbine pitch modulation, rotor blade slap ("whop-whop"), and cockpit rain audio.

\* \*\*`weather.js`\*\*: Controls `WeatherSystem` (day/night celestial cycle, fog density, wind forces, drag/lift multipliers, and rain particle systems).

\* \*\*`navRadio.js`\*\*: NDB Navigation Radio module rendering a compact bottom-right avionics tuning panel (`\[N]`) tracking frequency tuning and signal lock to the 210 kHz main base.

\* \*\*`navIndicator.js`\*\*: 3D tactical NDB bearing indicator module; attaches a transparent ring bezel and a neon-glowing amber pointer needle directly to the helicopter rotor hub to display relative bearing to the NDB target.

\* \*\*`kneeboard.js`\*\*: Pilot Kneeboard module rendering a styled 4-page interactive kneeboard (`\[K]`) featuring flight controls reference, pre-flight/flight checklists, fuel and passenger weight manifests with seating arrangement, and an aviation chart displaying Main Base NDB frequency at 210.0 kHz.

\* \*\*`windFarm.js`\*\*: Wind Farm module spawning 3 wind turbines located to the North-East with independently rotating rotor blades and flashing red obstruction warning lights.

\* \*\*`mainbase.js`\*\*: Main Base module loading the offshore platform model serving as the primary helipad, spawn point, and NDB beacon target.

\* \*\*`liferaft.js`\*\*: Liferaft module managing emergency sea crash deployment and survival raft simulation upon water impacts.

\* \*\*`sirenSystem.js`\*\*: Emergency beacon system managing industrial rotating red siren lights and dynamic spotlights on the main base during fire emergencies.

\* \*\*`utilities.js`\*\*: Developer tool module (`DeveloperTool`) providing a UI panel (`\[T]`) for toggling day/night time, weather conditions, free camera mode, and a Winch Position Calibrator panel with live X,Y,Z offset sliders.

\* \*\*`winch.js`\*\*: Dedicated rescue winch system module managing cable physics, hook deployment/retrieval states, and real-time helicopter mounting offset transformations.

\* \*\*`rescueMission.js`\*\*: Rescue mission module managing emergency distress calls, liferaft spawning with flashing beacons, survivor hoisting, and return to main base.



\### Core Controls \& Key Bindings



\* \*\*`\[Q]`\*\*: Toggle Electrical System (Battery)

\* \*\*`\[F]`\*\*: Toggle Fuel Pump

\* \*\*`\[E]`\*\*: Toggle Engine Ignition / Fuel Cutoff

\* \*\*`\[G]`\*\*: Toggle Landing Gear

\* \*\*`\[L]`\*\*: Toggle Landing Light

\* \*\*`\[N]`\*\*: Toggle NDB Navigation Radio Panel

\* \*\*`\[K]`\*\*: Toggle Pilot Kneeboard Display (and switch pages 1–4 when open)

\* \*\*`\[T]`\*\*: Toggle Developer Tool UI (Time of Day, Weather, and Winch Calibration Controls)

\* \*\*`\[X]`\*\*: Deploy / Retract Rescue Winch

\* \*\*`Space Bar`\*\*: Hold to continuously dispense aerial firefighting water/foam spray.

\* \*\*`Arrow Keys`\*\*: Pitch / Roll / Turn movement

\* \*\*`Shift / Ctrl`\*\*: Collective Up / Down (Altitude)

\* \*\*`Mouse Wheel`\*\*: Adjust camera follow distance



\### Key Gameplay \& Simulation Features



\* \*\*Aircraft Model\*\*: AW189 helicopter with animated rotor blades and aerodynamic properties.

\* \*\*Environment \& Lighting\*\*: Offshore main base platform equipped with helipad and structure lights set against dynamic ocean waves and day/night weather cycles, complemented by a North-East wind farm featuring 3 animated wind turbines with synchronized flashing red obstruction lights and emergency siren systems.

\* \*\*Flight Systems\*\*: Modeled autorotation, landing gear drag penalties, dynamic fuel consumption based on mass and weather, and strobe lighting fuel warnings (<= 500 kg orange, <= 100 kg rapid flash red).

\* \*\*Firefighting Water Drop System\*\*: High-density volumetric particle system (`waterSystem.js`) featuring procedural aerated white mist/foam textures, gravitational acceleration, and aerodynamic slipstream drag sweep matching real-world helicopter water bucket drops.

\* \*\*Instrumentation \& Navigation\*\*: Real-time HUD, NDB avionics tuning panel, 3D cockpit-attached bearing indicator needle pointing toward the main base beacon, an interactive 4-page pilot kneeboard, and a rescue winch system with live developer position calibration.



\### Assets



\* \*\*`helicopter.glb`\*\*: Primary 3D AW189 helicopter model with rotor animation mixers.

\* \*\*`mainbase.glb`\*\*: Offshore platform 3D model serving as the primary helipad, spawn point, and NDB beacon target.

\* \*\*`WTG.glb`\*\*: 3D wind turbine model utilized by the wind farm module.

\* \*\*`liferaft.glb`\*\*: 3D liferaft model utilized by the rescue mission and liferaft manager modules.



\---



\### Strict AI Coding Rules



1\. \*\*Full File Outputs Only\*\*: ALWAYS provide complete, ready-to-use updated code files. NEVER use placeholders, truncation, or partial snippets like `// ... rest of code stays the same ...`.

2\. \*\*Strict Modular Isolation\*\*: Keep features in separate modules. Do NOT mix new, unrelated functionality into existing modules. If a requested feature does not cleanly fit into an existing file, instruct me to create a NEW module file and provide that code separately alongside minimal imports.

3\. \*\*Preserve Existing Features\*\*: Do NOT remove or refactor unmentioned game objects, lights, controls, shadow mechanics, or camera lerp systems unless explicitly instructed.

4\. \*\*Maintain Code Cleanliness\*\*: Keep code well-organized, clean, and commented to prevent codebase degradation over time.

5\. \*\*Ask for Missing Code\*\*: If a requested feature requires modifying an existing file and I have not provided that file in the chat, ask me to paste it before generating updated code.

6\. \*\*Scope Isolation \& Zero Unrequested Changes\*\*: Strictly no unprompted edits to working code, key bindings, or core flight mechanics. If a change impacts outside systems, you must explicitly notify me of the side effects before generating code.

7\. \*\*Strict User Code Retention\*\*: When a modification is requested for an existing module file, the AI MUST use the exact user-supplied source code as the baseline. The AI is strictly prohibited from substituting generic or placeholder class implementations when updating code, and must patch or integrate requested additions directly into the user's provided file structure.

