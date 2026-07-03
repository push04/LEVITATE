# TenderPulse BJ

Bihar & Jharkhand government tender aggregator. See [`../tenderbot.md`](../tenderbot.md) for full architecture.

## Run it

Double-click **`Run_TenderPulse.bat`** (one level up, in `LEVITATE-main (2)/`). First run installs
dependencies and the Playwright browser automatically, then starts a continuous crawl loop
(every `CRAWL_INTERVAL_MINUTES`, default 30) that never needs further interaction. Leave the
window open — it's the "always-on local PC worker" from the architecture doc.

Manual one-off crawl: `npm run crawl` (inside `tenderpulse-bj/`).

## What's live right now

74 sources across 5 engine families (`scrapers/engines/`), all confirmed against real
government sites — see `config/sources.json`:

- **GePNIC** — Jharkhand state portal + PMGSY Bihar
- **eProc2 Bihar** — all state departments
- **S3WaaS** — all 38 Bihar + 24 Jharkhand district portals
- **Standalone health** — SHSB, BMSICL (drugs/equipment/infra), JRHMS, IGIMS Patna, AIIMS Patna, RIMS Ranchi
- **GeM** — public bids filtered by consignee state (Bihar/Jharkhand)

**Not yet built**: IREPS (railway) — public search is JS-gated with no stable link/API found;
lowest priority per the build order in tenderbot.md Section 12.

## Data flow right now

Scraped tenders are normalized and deduped locally (`data/tenders.json`, `data/seen_refs.json`,
`data/crawl_report.json` per run) with zero external credentials required. Once
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are set in `.env` (copy `.env.example`), the same
data model maps directly onto `db/schema.sql` — wiring the actual push is the next step, along
with Groq AI summarization and the WhatsApp alert bot, both of which need their own credentials
before they can be built and tested for real.
