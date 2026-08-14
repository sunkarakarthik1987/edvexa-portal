# Edvexa — Student Portal (SAT track, v1 prototype)

A client-only React prototype of the Edvexa student experience, scoped to the SAT
test-prep track. No backend, no auth, no tenancy — every data source is a typed mock
in `src/portal/data.ts`.

## Running it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot module replacement |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint across `src/` |
| `npm run typecheck` | TypeScript with no emit |
| `npm run format` | Prettier write |

Requires Node 20 or newer.

## Opening in VS Code

Open the folder directly (`code .` from this directory). On first open, VS Code will
offer the extensions listed in `.vscode/extensions.json` — accept them. Format-on-save
and ESLint autofix are already configured in `.vscode/settings.json`.

## Layout

```
src/
  main.tsx              entry point
  App.tsx               shell: sidebar nav, screen switching, test-runner takeover
  index.css             Tailwind layers + design-system component classes
  lib/cn.ts             class-name join helper
  portal/
    data.ts             types + mock data (the future API boundary)
    engine.ts           test session construction, pooling, scoring, timing
    icons.tsx           inline SVG icon set
    ui.tsx              Card, Pill, Tag, Progress, Avatar, Stat, EmptyState
    Calendar.tsx        month grid with navigation and event dots
    StudyPlanWizards.tsx  five-step plan wizard + generated plan table
    TestRunner.tsx      intro → running → results → review
    screens.tsx         dashboard, plan, homework, tests, bank, results, messages
```

## Design system

Defined once in `tailwind.config.js`, used everywhere as semantic names — never raw hex
in components.

| Token | Value | Role |
| --- | --- | --- |
| `canvas` | `#FDFBD4` | Page background |
| `ink` | `#173600` | Primary text, active states, dark surfaces |
| `accent` | `#C05800` | Calls to action, flags, urgency |
| `ink-soft` | `#3D5B29` | Secondary text |
| `ink-faint` | `#6B7F5C` | Tertiary text, captions |
| `rule` | `#D9D6A8` | Borders and dividers |
| `surface` | `#FFFEF0` | Card fill |

Type: Helvetica Neue for body, IBM Plex Mono for labels, counts, timers, and data.

## Digital SAT shape

Encoded in `data.ts` and enforced by `engine.ts`:

- Reading & Writing — 2 modules × 27 questions
- Math — 2 modules × 22 questions
- Full-length test — 98 questions
- Timed practice — 75 seconds per question
- Sectionals draw from a section-pure pool
- Question bank sets filter by Unused / Used / Both

The mock bank holds 8 questions. `engine.ts` cycles it to reach faithful counts, so a
full test really does render 98 navigator cells. Replace `QUESTIONS` with real content
from the AI generation pipeline and the counts hold without touching the engine.

## Known gaps

This is a prototype, and the following are deliberately absent:

- No routing library — screen state is a `useState` in `App.tsx`. Add React Router when
  deep links or browser-back matter.
- No persistence — refreshing loses in-progress test state.
- No auth, no tenant scoping, no white-label theming layer.
- Score projection in `engine.ts` is a linear illustration, not a College Board scale.
- Screens were rebuilt from the v1 feature specification, not from the original
  wireframe files. Pixel fidelity against those wireframes has not been re-verified.

## Next

Wire `data.ts` to the Edvexa API behind a thin client, keeping the exported types as
the contract. Everything downstream of those types already works against real shapes.
