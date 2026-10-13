# Tredie

Your transactions, alive. Every Stellar transaction becomes a unique collectible creature.

Rarity comes from the amount, species is derived from rarity, and the application picks every visual attribute from a seed built from the transaction hash. A Tredie's portrait is a fixed species asset with an optional accessory drawn over its head — there is no image model, and nothing is uploaded. Payment and portrait are fully decoupled, so a failed portrait never costs a second payment.

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn-style primitives, Motion, Lucide |
| Database | SQLite (`node:sqlite`, plain SQL, forward-only migrations) |
| Portraits | Fixed WebP assets in `public/tredie`, composed in the UI |
| Blockchain | Stellar SDK — Testnet by default, USDC per spec |
| Deploy | Docker → Google Cloud Run |

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional; the app runs with no env at all
npm run dev
```

With no configuration Tredie runs on a local SQLite file at `data/tredie.db` (override with `TREDIE_DB_FILE`). The app boots with zero env vars.

### Persistent storage

```bash
npm run db:migrate        # applies pending files from migrations/
```

Migrations are forward-only, take a SQLite write lock, and run both locally and at container boot. Point `TREDIE_DB_FILE` at a mounted volume in Docker or a Cloud Run volume to keep data across restarts.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (Next.js `standalone` output) |
| `npm run start` | Serve the production build |
| `npm run db:migrate` | Apply pending SQL files from `migrations/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Environment

Every variable is optional locally; `TREDIE_PIN_COOKIE_SECRET` is the only one that matters for a real deployment. See `.env.example` for the annotated list.

- **SQLite** — `TREDIE_DB_FILE` (default `data/tredie.db`). No host, no credentials.
- **Sessions** — `TREDIE_PIN_COOKIE_SECRET` signs the wallet-session cookie. Set it in production and on multi-instance deployments. Without it, the app falls back to a per-process random key: it boots and works, but sessions do not survive a restart and are not valid across instances.
- **Stellar** — `STELLAR_NETWORK` (`testnet` default), `STELLAR_ASSET_CODE`, `STELLAR_USDC_ISSUER`, and optional Horizon / RPC overrides.

`GCS_BUCKET` and the `IMAGE_GENERATION_*` variables are accepted but currently unused: portraits are static assets, so nothing is uploaded and no model is called. The `src/services/storage` and `src/services/generation` boundaries are kept dormant so either can be reintroduced without touching the UI.

### Settlement asset

The spec settles in **USDC**. `STELLAR_ASSET_CODE` defaults to `USDC`.

On Testnet a freshly generated wallet holds only XLM (friendbot funds XLM and there is no USDC faucet), so paying in USDC from a brand-new account cannot succeed. For a walkable Testnet demo set:

```
STELLAR_ASSET_CODE=XLM
```

When the asset is a trustline and the payer has no trustline yet, the server prepends a `changeTrust` operation to the payment automatically.

---

## Docker and Cloud Run

```bash
docker build -t tredie .
docker run --rm -p 8080:8080 \
  -e TREDIE_DB_FILE=/data/tredie.db \
  -v tredie-data:/data \
  -e STELLAR_NETWORK=testnet \
  -e TREDIE_PIN_COOKIE_SECRET=$(openssl rand -hex 32) \
  tredie
```

The image is a multi-stage build using Next.js `standalone` output, runs as a non-root user, binds `0.0.0.0:$PORT` (8080, which is what Cloud Run injects) and ships a healthcheck against `/home`. It runs migrations at boot.

### Deploy flow (Cloud Run + Artifact Registry)

```bash
PROJECT=tredie
REGION=us-central1

# 1. Image
gcloud artifacts repositories create images \
  --repository-format=docker --location=$REGION --project $PROJECT
gcloud builds submit . \
  --tag $REGION-docker.pkg.dev/$PROJECT/images/tredie:latest \
  --project $PROJECT --timeout=1800s

# 2. Persistence: read-write SQLite on a Cloud Storage volume
gcloud storage buckets create gs://tredie-data --project=$PROJECT --location=$REGION

# 3. Secret (stable wallet sessions across instances/restarts)
gcloud secrets create tredie-pin-cookie-secret --project $PROJECT \
  --data-file=<(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 4. Deploy (migrations run automatically at boot: CMD migrates then execs server.js)
gcloud run deploy tredie \
  --image $REGION-docker.pkg.dev/$PROJECT/images/tredie:latest \
  --region $REGION --project $PROJECT \
  --allow-unauthenticated --min-instances=1 --max-instances=3 --memory=1Gi --cpu=1 \
  --set-env-vars STELLAR_NETWORK=testnet,STELLAR_ASSET_CODE=XLM,TREDIE_DB_FILE=/app/data/tredie.db \
  --set-secrets TREDIE_PIN_COOKIE_SECRET=tredie-pin-cookie-secret:latest \
  "--add-volume=name=data-vol,type=cloud-storage,bucket=tredie-data" \
  "--add-volume-mount=volume=data-vol,mount-path=/app/data"
```

Notes for Cloud Run specifically:

- No object storage is needed: portraits are static assets served from `public/`, and the read-only runtime filesystem is never written to.
- SQLite lives on a **Cloud Storage volume** mounted read-write at `/app/data` (GCS FUSE), so data survives redeploys. Keep `--min-instances` at 1 — a single instance owns the file; the volume is not a network database shared across writers.
- Migrations are run by the container CMD at boot (idempotent, forward-only) before `exec node server.js`.
- `TREDIE_PIN_COOKIE_SECRET` signs the session cookie HMAC; from a Secret Manager version so instances never disagree.

## Portraits and rarity

A portrait is the species asset with an optional accessory over its head, composed by `src/components/tredie/tredie-image.tsx` from `src/config/portraits.ts`. Every layout number there — each species' head anchor, each accessory's bounding box and opening, and a `fit` multiplier — was measured from the alpha channel of the canonical art rather than eyeballed.

- Species is derived from rarity: `RARE` → rock, `EPIC` → fish, `LEGENDARY` → otter.
- Accessories are random within the rarity, and only ids with real art are eligible. Add one by dropping a 1.153-ratio image into `public/tredie/accessories` and adding an entry to `ACCESSORY_PORTRAIT`.
- `GOLD-NO-WAY-OTTER.webp` is a pixel-aligned gold recolour of the otter, so it reuses the otter's anchor.

Amount bands and the golden roll live in `src/config/rarity.ts`:

| Band | Amount | Rarity |
| --- | --- | --- |
| Shimmer | under $10 | RARE |
| Sprout | $10–49.99 | RARE / EPIC |
| Tide | $50–199.99 | EPIC |
| Deep | $200–1999.99 | EPIC / LEGENDARY |
| Abyss | $2000+ | LEGENDARY |

**The golden otter is the most improbable outcome in the product.** It requires a transfer of at least `GOLDEN_MIN_USD` ($2000) and even then appears only `GOLDEN_CHANCE` (0.10%) of the time. Below $2000 the chance is exactly zero. `goldenChance` is an absolute probability, not conditional on the rarity roll.

### Visual QA

```
npm run dev
# then open http://localhost:3000/dev/portraits
```

That sheet renders every species × accessory plus the golden otter, with the computed placement numbers. It is dev-only. Use it to tune `fit`, `HEADROOM` and the head anchors in `src/config/portraits.ts`.

The art in `public/tredie` is optimised WebP (17–31 KB per file) generated once from `Assets/` with sharp. `Assets/` holds the multi-megabyte originals and is not shipped.

---

## Architecture

```
src/config/          rarity thresholds, attribute vocabularies, portrait layout
src/lib/core/        deterministic RNG, creature assembly
src/services/
  stellar/           Horizon + RPC access, payment build, submit, verification
  persistence/       TredieRepository interface, SQLite repository
  generation/        dormant — AI providers, kept behind the service boundary
  storage/           dormant — object storage, kept behind the service boundary
src/app/api/         build, submit, fund, tredies, portrait rebuild
src/app/dev/         portrait layout QA sheet (dev only)
```

The UI never talks to Horizon, the SQLite repository, or an image provider directly. Everything crosses a service boundary, which is what keeps the payment and portrait providers swappable.

### Hard invariants

- **Three species only.** `RARE` → rock, `EPIC` → fish, `LEGENDARY` → otter. Species is derived from rarity, never chosen independently. The golden otter is a recolour of the same otter, not a fourth species.
- **The app chooses every attribute.** Amount → rarity → species → colour → material → expression → accessory → special feature → personality → name are all selected in code from a seed derived from the transaction hash. There is no image model.
- **Never charge twice.** The transaction and the portrait are separate steps. Rebuilding a portrait reuses the confirmed transaction; `stellar_transaction_hash` is `UNIQUE` and creation is idempotent.
- **Never fake verification.** Every Tredie is created only after the transaction is re-read from Horizon, and every stored field comes from that response — never from the client.
- **A Tredie keeps its original portrait.** No regeneration path exists.
- **The accessory has art or it does not exist.** Only ids in `ACCESSORY_PORTRAIT` may appear in `ACCESSORIES`.
- **Secrets stay server-side.** No private key ever reaches the client bundle.

---

## Stellar submission

Horizon's `POST /transactions` is tried first. If that route is unreachable — it fails from some networks and proxies — submission falls back to the Soroban RPC `sendTransaction` endpoint and the result is polled on Horizon. Both routes are real submissions to stellar-core; neither fabricates a transaction.

---

## Testing the whole loop

`MASTER.md` is the product specification; `AGENTS.md` records the constraints that must not be broken.