# Chapter 10 — Knowledge Representation

**Part 3: Knowledge, Reasoning, and Planning**

Ontology hierarchies, event calculus, description logics, and default reasoning.
Covers AIMA 4th Edition §10.1–§10.6 (pp. 332–361).

---

## Visualizations

### §10.1–10.2 · Ontological Engineering & Categories (`#ontological-engineering`)
Interactive tree of the **AIMA upper ontology** (Figure 10.1): Anything → AbstractObjects / GeneralizedEvents → Sets, Numbers, Intervals, Places, PhysicalObjects … → Humans.
- Click any node to see its ancestors and inherited properties
- Step-through inheritance query (e.g. "What properties does Humans inherit?")
- **What-if**: add a custom category with a chosen parent and see it inserted
- Explains member vs. subset, disjoint sets, exhaustive decomposition, and partition

### §10.3 · Event Calculus & Time (`#event-calculus`)
Two sub-visualizations:

**A) Allen's 13 Interval Relations** — two interactive time intervals that update the relation name and KaTeX definition in real time; animate through all 13 relations with play/pause/step controls.

**B) Event Calculus Timeline** — the Shankar travel scenario (SF → DC → Berkeley): shows fluents (`At(Shankar,SF)`, `At(Shankar,DC)`, `At(Shankar,Berkeley)`) being initiated/terminated by flight and drive events; step through time point by point.

### §10.4 · Mental Objects & Modal Logic (`#modal-logic`)
Possible-worlds diagram for the **Lois / Superman / Clark Kent** example:
- Toggle which worlds are accessible to Lois or Bond
- Live table of knowledge atoms K(agent, fact) updating as accessibility changes
- Explains referential transparency vs. opacity; modal operators K_A P; nested knowledge

### §10.5 · Semantic Networks & Description Logic (`#semantic-networks`)
Two sub-visualizations:

**A) Semantic Network Inheritance** — SVG graph (Figure 10.4 style) with step-through query: "How many legs does Mary have?" traces MemberOf → SubsetOf links until Legs=2 found on Persons. **What-if**: give John a custom Legs value and see default override.

**B) CLASSIC Description Logic** — interactive concept builder (And / All / AtLeast / AtMost primitives); `dlClassify` step-through trace for any constructed concept; **what-if**: remove a property and watch classification change.

### §10.6 · Default Reasoning & JTMS (`#default-reasoning`)
Three sub-visualizations:

**A) Nixon Diamond (Circumscription)** — both preferred models shown side by side; add prioritized circumscription (religion > politics) to collapse to one model.

**B) Default Logic Extensions** — Tweety/Penguin scenario; step through blocked/applied rules; **what-if**: toggle "Tweety is a penguin" and observe which extension results.

**C) JTMS Belief Revision** — add P, P⇒Q, R, P∨R⇒Q with justifications; retract P and watch Q stay (justified by R); retract R and watch Q finally leave.

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Architecture

This chapter is a **self-contained microfrontend** built with:
- **React 18** + **TypeScript** (strict mode)
- **Vite** for bundling (base path: `/chapter-10/`)
- **Vitest** for unit testing (100% coverage required on `src/algorithms/`)
- **KaTeX** for math rendering

All algorithm logic lives in `src/algorithms/index.ts` as pure functions.
Never import from other chapter directories.

---

## Contribution

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for standards and PR checklist.
Branch naming: `chapter-10/viz-name`
