# Chapter 2 — Intelligent Agents

**Part 1: Artificial Intelligence**

PEAS framework, environment properties, five agent architectures, rationality, and interactive simulations of simple-reflex and model-based vacuum agents.

---

## Visualizations

### §2.2 Rationality & Performance Measures (`rationality`)
Interactive simulation of the vacuum world under three different performance measures:
- **+1 per clean room per step** — the "right" measure; agent cleans efficiently then stops.
- **+10 per Suck action** — perverse incentive; rational agent re-dirties rooms to suck again (King Midas problem).
- **−1 per action taken** — misaligned measure; rational agent does nothing even while dirt accumulates.

Includes step-by-step playback with play/pause/step controls and a live score panel.

### §2.3.1 PEAS Framework Builder (`peas`)
Interactive tabbed explorer of five canonical agent PEAS descriptions (taxi driver, medical
diagnosis, image analysis, shopping agent, chess player). Rows show Performance, Environment,
Actuators, and Sensors for each agent type.

### §2.3.2 Environment Properties Explorer (`environment-properties`)
Visualises the 7 environment property dimensions from AIMA Figure 2.6:
- Observability, Agent Count, Determinism, Episode Structure, Dynamics, State Space, Prior Knowledge

Features:
- All 10 book environments (crossword through English tutor) with their property profiles
- 2 original examples: Email Spam Filter and Automated Stock Trader
- Difficulty bar showing how many dimensions are set to their harder pole
- "Build Your Own Environment" panel — toggle all 7 properties and receive an architecture recommendation

### §2.4 Agent Type Explorer (`agent-types`)
Side-by-side comparison of the five agent architectures (simple reflex → model-based → goal-based → utility-based → learning). Shows capabilities, components, and real-world examples for each.

### §2.4.2 Vacuum Cleaner World — Simple Reflex (`vacuum-world`)
Step-by-step simulation of the simple-reflex vacuum agent in the 2-room world (AIMA §2.1, §2.4.2). All 8 initial states selectable. Includes score panel with play/pause/step-back/forward controls.

### §2.4.3 Vacuum Cleaner World — Model-Based (`model-based-vacuum`)
Side-by-side comparison of the **simple reflex** and **model-based reflex** vacuum agents. The model-based agent maintains a belief state (unknown/clean/dirty) for each room and only terminates once it has verified both rooms are clean — eliminating unnecessary oscillation. Shows live belief badges updating as the agent explores.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests (100% coverage required)
npm test -- --run

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/aima-visualizations/chapter-02/`)
- **Vitest** for unit testing (100% coverage on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-02/viz-name`

