# AGENTS.md

## Repo state

The application is built and running. A full pass was verified end to end against **real Stellar Testnet** and **SQLite (`node:sqlite`)**: fund → build → sign → submit → server-side verify → persist → render → collection, plus idempotent replay, rejection of a fabricated transaction hash, and the PIN-gated wallet session.

There is still **no git repo**, so nothing is committed and nothing should be until one exists and you ask.

### Commands

`package.json` is the source of truth:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build, Next.js `standalone` output |
| `npm run start` | Serve the production build |
| `npm run db:migrate` | Apply pending files from `migrations/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

There is no test suite. Do not claim tests were run; verify by exercising the running app.

Storage is SQLite via `node:sqlite` at `data/tredie.db` (override `TREDIE_DB_FILE`). `npm run db:migrate` applies forward-only files from `migrations/` and runs at container boot too. There is no Postgres, no Cloud SQL, no `pg` package.

## Reading `MASTER.md`

`MASTER.md` is the authoritative product spec (~1690 lines) and is heavily redundant: nearly every list is flattened to one item per line with blank lines between. Do not read it end-to-end for small tasks — jump to the relevant section:

| Task | Section |
| --- | --- |
| Rarity thresholds / probabilities | `## Rarity system` |
| Species + attribute vocabularies | `## Creature system`, `## Color system`, `## Material system`, `## Accessories` |
| Prompt construction for image gen | `## Important rarity rule`, `## Important generation rule`, `## AI generation style`, `## Image composition` |
| Data model | `## Database` |
| Screens/flows | `## Home screen`, `## Create transaction`, `## Tredie birth experience`, `## Tredie detail page`, `## Collection`, `## Timeline`, `## Landing page` |
| Stack + env vars | `## Application architecture`, `## Suggested environment variables` |
| Scope boundaries | `## MVP scope` |
| Visual/UX acceptance | `## Design system`, `## Accessibility`, `## Final visual quality test` |

The spec contradicts itself in places (e.g. `## Visual variation` lists `Body` as an attribute while `## Important rarity rule` enumerates `Color/Material/Expression/Accessory/Special feature/Personality/Name`). Treat `## Important rarity rule` and `## Important generation rule` as the canonical attribute set, and flag conflicts rather than silently picking one.

## Prescribed stack

Next.js + TypeScript + Tailwind + shadcn/ui + Motion + Lucide + **SQLite** + Stellar SDK + Freighter, containerised and deployed to **Google Cloud Run**. Rarity config stays centralized and data-driven (adjustable without touching application logic).

The spec names Supabase on Vercel and an AI image model. The owner overrode both: **SQLite + Docker + Cloud Run on GCP**, and **no AI generation** — three fixed pets plus a random accessory. Follow the owner's decisions, not the spec text.

Use Stellar **Testnet** for the hackathon and label it clearly in the UI.

### Environment notes worth knowing

- Nothing is required locally. With no env vars the app uses SQLite at `data/tredie.db`.
- **Wallet sessions need `TREDIE_PIN_COOKIE_SECRET` for real use.** The session cookie `tredie_wallet` is an HMAC-signed `publicKey.expiry`. Without the secret, `src/services/wallet-session.ts` falls back to a per-process random key that is cached on `globalThis` — this matters: Turbopack instantiates modules once per server chunk (API routes vs pages), so a module-local fallback secret would give each chunk its own key and every page gate would reject cookies the API signed. Do not replace the `globalThis` cache with a module variable, and never make the fallback deterministic. Sessions simply do not survive a restart without the env secret.
- **Session gating.** `/tredies/[id]` and collection/create routes require an unlocked session cookie for the owner; a bare URL or a stranger's session redirects to `/home`. Verify by exercising the running app (see `## Repo state`).
- Portraits are static assets, so `GCS_BUCKET` is **not** required: nothing is uploaded and the read-only Cloud Run filesystem is not written to. `src/services/storage` and `src/services/generation` are dormant; do not assume they run.
- `STELLAR_ASSET_CODE` defaults to `USDC` per the spec, but a fresh Testnet wallet holds only XLM and there is no USDC faucet, so a walkable Testnet demo uses `XLM`. When the asset is a trustline the server prepends `changeTrust` if the payer has none.
- Horizon's `POST /transactions` is unusable from some networks. `submitSignedTransaction` tries it, then falls back to Soroban RPC `sendTransaction` and polls Horizon for the result. Both are real submissions; do not "simplify" this into a single route.

## Portrait model

A Tredie's portrait is the species asset with an optional accessory drawn over its head — no image model, no upload, no storage.

- Art lives in `public/tredie` as optimised WebP (17–31 KB), generated once from `Assets/` with sharp. Do not commit the multi-megabyte originals into `public/`.
- `src/config/portraits.ts` holds every layout number: the species art path, each species' head anchor (`centreX`/`top`/`width`/`height`, measured from the alpha channel of the canonical art), the accessory's own bounding box and opening, and a `fit` multiplier. `HEADROOM` reserves space above the creature so tall hats are not clipped.
- `ACCESSORY_PORTRAIT` is the source of truth for which accessories can exist. Adding one means dropping a 1.153-ratio image into `public/tredie/accessories` and adding an entry — and only then may it be listed in `ACCESSORIES`.
- `GOLD-NO-WAY-OTTER.png` is a pixel-aligned gold recolour of `otter.png` (identical silhouette and bounding box), so it is a drop-in that reuses the otter's anchor. It is not a new species.
- The accessory's stored value is an **id** (`top-hat`), not a display name. Render the label through `ACCESSORY_PORTRAIT[id].name`.
- `/dev/portraits` renders every species × accessory plus the golden otter, with the computed placement numbers. It is dev-only (`notFound()` in production). Use it to tune `fit` and the anchors; this is the required final visual QA.

### Rarity and the golden otter

- Rarity comes from the amount band (`src/config/rarity.ts`) plus a seeded random roll, so it is deterministic per transaction hash.
- Bands: `shimmer` (<$10, RARE) · `sprout` ($10–49.99, RARE/EPIC) · `tide` ($50–199.99, EPIC) · `deep` ($200–1999.99, EPIC/LEGENDARY) · `abyss` ($2000+, LEGENDARY).
- **The golden otter is the single most improbable outcome: it requires a transfer of at least `GOLDEN_MIN_USD` ($2000) and even then rolls golden only `GOLDEN_CHANCE` (0.10%) of the time.** Below $2000 the chance is exactly 0. `goldenChance` is an absolute probability, not conditional on the rarity roll.

## Hard invariants — do not violate

These are stated as non-negotiable in the spec and are the easiest things to break accidentally:

- **Three species only.** RARE=ROCK, EPIC=FISH, LEGENDARY=OTTER. Species is derived purely from rarity. No hybrids, no new animals, no fantasy species. The golden otter is a recolour of the same otter, not a fourth species.
- **There is no image model.** Amount → rarity → species → colour → material → expression → accessory → special feature → personality → name are all selected by application code, and the portrait is composed from fixed assets in `public/tredie` by `src/components/tredie/tredie-image.tsx`. Do not reintroduce "generate a random Tredie" prompting.
- **The app chooses every attribute; the accessory has art or it does not exist.** Only accessory ids present in `ACCESSORY_PORTRAIT` (`src/config/portraits.ts`) may appear in `ACCESSORIES` (`src/config/vocab.ts`). One accessory per Tredie.
- **Never charge twice.** Transaction execution and image generation must be decoupled. Retrying a failed generation must reuse the existing confirmed Stellar transaction, never create a new payment. `stellar_transaction_hash` is `UNIQUE` and creation is idempotent — keep it that way.
- **Never fake verification.** Every Tredie stores a real Stellar tx hash; verify server-side before creating the Tredie record. Do not trust client-supplied tx IDs.
- **Images are never base64 in the database.** Nothing is uploaded any more — the portrait is composed from static assets at render time — but the rule stands if uploads return.
- **A Tredie keeps its original portrait.** No regeneration, no "improvement" pass. The portrait is a pure function of the stored species + accessory.
- **Secrets stay server-side.** `TREDIE_PIN_COOKIE_SECRET`, GCS credentials and anything private must never reach client bundles. No private keys, ever.
- **Service boundaries.** Image generation behind `/services/generation`, Stellar behind `/services/stellar`, persistence behind `/services/persistence`. UI must not couple to any of them — this is what makes the providers swappable.

## Visual reference assets

`Assets/` holds the canonical creature art and must be treated as fixed reference, not as something to redesign:

- `rock.png`, `fish.png`, `otter.png` — the three canonical species; all three must read as the same studio's work.
- `GOLD-NO-WAY-OTTER.png` — the golden Legendary otter, the visual pinnacle.
- `MAIN-LOGO-landing.png`, `APP-LOGO.png`, `BANNER-repo.jpg`, `background-app.jpg` — brand assets. Note there is no small/favicon-size logo variant.
- `Assets/Accesorys/` — four hat overlays (`french-hat`, `grad-hat`, `noob-hat`, `top-hat`). The directory is spelled `Accesorys` (sic); use the path as-is. This is a strict subset of the accessory vocabulary in `## Accessories` — the app needs the full list (scarf, backpack, glasses, bow, headphones, crown, flower, satchel, necklace).

Generation prompts should derive their style description from these images. The spec's composition rules are strict: 1:1 canvas, single creature, full body, front three-quarter view, centered, occupying ~65–75% of canvas, clean warm neutral background, subtle ground shadow, no scenery/hands/text/logos/coins/charts/cryptocurrency symbols/watermark.

## Anti-goals

The product must **not** read as a crypto dashboard, banking app, NFT marketplace, or DeFi/analytics dashboard. Blockchain jargon, coin imagery, financial charts, neon crypto aesthetics, excessive gradients/glassmorphism, and huge dashboards are all explicitly banned.

Voice: short, friendly, playful, modern. Never corporate or technical.

Out of scope for MVP (do not build, even if it seems natural): marketplace, trading, selling, social network, messaging, complex profiles, leaderboards, token economy, DeFi, analytics, gamification systems, settings screens.

The reveal animation and the collection are the product. Keep the core loop demonstrable end to end in under 90 seconds.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
