# Sperm Odyssey: Race to the Egg

Sperm Odyssey is a respectful, educational, and family-friendly multiplayer racing game about the microscopic voyage from the vagina to the oocyte. Players guide stylized sperm cells through a series of biologically inspired regions, learning about real reproductive biology along the way.

## Safety & Tone

* Abstract shapes, gradients, and icons – no anatomical detail or explicit language.
* Educational tooltips and a compendium provide scientific context and further reading.
* Optional accessibility features include reduced motion, colorblind palettes, scalable UI, and optional tooltip narration.

## Project Structure

```
/ (root)
├─ client/      # Vite + PixiJS front-end with bitecs ECS
├─ server/      # Node.js + Socket.IO authoritative simulation
├─ shared/      # Shared types, schemas, and constants
└─ docs/        # Design, science, accessibility, telemetry notes
```

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the development servers**

   ```bash
   npm run dev
   ```

   * Client Vite dev server: http://localhost:5173
   * Server Socket.IO/Express: http://localhost:8787

3. **Run tests**

   ```bash
   npm test
   ```

4. **Build for production**

   ```bash
   npm run build
   ```

5. **Docker (optional)**

   ```bash
   docker-compose up --build
   ```

## Scripts Overview

* `npm run dev` – concurrently runs `client` (Vite) and `server` (ts-node-dev) in watch mode.
* `npm run build` – builds all workspaces (client, server, shared).
* `npm run test` – runs Vitest (client/shared) and Jest (server).
* `npm run lint` – validates code style via ESLint.
* `npm run format` – formats code with Prettier.

## Educational Focus

* Level design follows the journey through the vagina, cervix, uterus, utero-tubal junction, isthmus reservoir, and ampulla.
* Mechanics like capacitation, hyperactivation, chemotaxis, and polyspermy blocking are simulated with PG-friendly abstraction.
* Tooltips and the compendium link in-game actions to biological processes, reinforcing learning outcomes.

## Contributing

* Ensure all content remains PG and educational.
* Respect accessibility and inclusivity guidelines in copy and mechanics.
* Run linting and tests before submitting pull requests.

## License

MIT License © 2025 CandanUmut
