# Marketplace Hunter

Watches **Subito**, **Wallapop** and **Vinted** for anything second-hand, scores the sellers,
and keeps price history so you can tell a genuine bargain from a listing that is merely new.

It knows how to read computer and memory adverts in detail. For everything else — kitchenware,
bicycles, whatever — it skips the specification parsing and matches on price, place and seller.

Built after six manual sweeps of the same market. The parser carries the corrections those
runs produced, which is most of the value here.

## Running it locally

```bash
node --version          # 22.5 or newer, for the built-in SQLite
npm run ui:build        # compile the Svelte frontend into public/
npm start               # http://localhost:8080
```

The server has **no dependencies to install** — everything it uses is Node standard library,
`node:sqlite` included. npm appears only to build the frontend, whose toolchain lives in
`frontend/` and never ships to the runtime.

While working on the interface:

```bash
npm start               # backend on :8080
npm run ui:dev          # Vite on :5173, proxying /api to :8080
```

To sweep on a schedule from the command line instead of the UI:

```bash
npm run worker          # sweeps now, then every SWEEP_MINUTES
npm run once            # a single sweep, then exits
```

## Deploying to Arcane

Pushing to `main` builds `ghcr.io/illeb/marketplace-search:latest` through
`.github/workflows/publish.yml`. Paste `docker-compose.yml` into Arcane as a stack and deploy
it. Updating afterwards is a pull and a recreate, with no source checkout on the host:

```bash
docker compose pull && docker compose up -d
```

The image is a two-stage build: Node plus npm compile the Svelte app, and the runtime stage
keeps only `src/`, `package.json` and the compiled `public/`. It runs as the unprivileged
`node` user and has a healthcheck on `/api/stats`.

**The package inherits the repository's visibility.** While the repo is private the Proxmox
host needs `docker login ghcr.io` with a token that has `read:packages`. Making just the
package public on the GitHub Packages page avoids that, and publishes nothing but the image.

The database sits on the `hunter-data` volume, so saved searches and price history survive a
redeploy. To build from a checkout instead of pulling:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Settings are environment variables; `.env.example` lists every one with its default.

## Configuring searches

Everything is editable in the UI: **search terms, price range, location, countries**, the
sources to use, and a minimum seller-review count.

A search can hold **several comma-separated terms** — `optiplex sff, thinkcentre sff,
elitedesk 800` — and one sweep covers them all. Coverage is poor with a single term;
the manual runs needed thirty or more.

### Looking for

| Kind | What happens |
|---|---|
| **Computer** | Full specification parsing, and the computer filters appear: brand, minimum generation, minimum memory, minimum storage, chassis, processor tier. |
| **Memory** | Parses DDR4 modules: kit layout, capacity per stick, speed. Rejects laptop SODIMMs and server ECC. |
| **Other** | No specification parsing at all. Matches on price, place and seller, so it works for anything. |

The computer filters are hidden unless the kind is Computer, because they mean nothing
for a saucepan.

**Minimum storage** is the largest drive of any type, not the SSD alone. Filtering on the
SSD discarded machines whose advert never says which kind of disk it has.

### Location and countries

**Near** is a type-ahead over European towns, backed by [Photon](https://photon.komoot.io),
which is OpenStreetMap data served for prefix matching. Picking a town stores its
coordinates, which is what Wallapop needs; you never type latitude and longitude.
Results are cached for thirty days so typing does not hammer the service.

**Countries** is a multi-select. Leave it empty and the search covers **all of Europe**.
It is applied three ways, because each marketplace is different:

- **Subito** is Italian only, so it is skipped when Italy is out of scope.
- **Wallapop** searches one national catalogue per request, so the first few chosen
  countries each get a request.
- **Vinted** has a single EU-wide catalogue, so its results are filtered by the seller's
  country afterwards.

## What the parser knows

These all cost a wrong answer at least once before being fixed:

- **Units in four languages.** French adverts say Go and To, Spanish say gigas.
- **Processor suffixes.** The S, K and F variants were missing at first, so 4th-generation
  machines passed as "generation unknown".
- **Solid-state versus mechanical.** Taking the largest capacity reports a 500 GB spinning
  disk as an SSD. Each capacity is attributed to its nearest storage keyword instead.
- **Generation from the model.** An OptiPlex 3070 is 9th generation whether or not the
  advert says so; the same holds across ThinkCentre, EliteDesk, ProDesk and Esprimo.
- **Tiered pricing.** Sellers headline the stripped build and list the real configurations in
  the body. One sweep contained eighteen. Any advert quoting two or more prices is flagged.
- **Unstated chassis.** Roughly a third of adverts never say SFF or Micro. That is a third
  state, not a reason to discard the listing silently.
- **Advert is not a machine.** Power supplies, heatsinks, bare motherboards and laptops all
  match a naive brand search.
- **"Micro" is French and Italian for microphone.** A ports list reading "prises casque et
  micro" filed a French tower under the Micro chassis. Audio-jack prose is stripped before
  the chassis is read.
- **Form factors that never existed.** Dell's Micro chassis arrives with the 9020 in 2014,
  so on an OptiPlex 790 a seller writing "micro PC" means small, not the form factor. A
  Micro reading is withdrawn from the models that never had one. The 3010, 7010 and 9010
  names were reused in 2023 for a line that does, so those are only withdrawn when a real
  processor number dates the machine to 2012.
- **Models older than the four-digit names.** The 390, 790 and 990 are 2nd generation and
  the 755 and 760 predate the Core i numbering entirely. Until they were listed they passed
  generation filters as "generation unknown".
- **A trailing `\b` after a truncated stem never matches.** `ventol\b` cannot match "ventola",
  so every stem in the accessory filter was dead and fans, adapters and power supplies parsed
  as machines for six sweeps. Whole words and stems are now two separate patterns.
- **A part sold *for* a machine.** "Kit WiFi Interno per Dell OptiPlex Micro" is not a computer.
  The preposition has to sit directly on the brand, so "mini pc per ufficio Dell OptiPlex" is
  left alone. A title that *leads* with a component noun is also a part, except `cpu`: in
  Spanish adverts "CPU sobremesa" is the whole machine.
- **Bare "Mini" is a form factor.** HP and Lenovo write "800 G2 Mini", not "Desktop Mini". It is
  read only when "tower", "tour" or "DisplayPort" does not follow.
- **HP's USDT is not a Mini.** The ultra-slim desktop is about 2.6 litres against the Mini's one,
  and sellers still title it "Mini PC". It belongs with SFF.
- **ThinkCentre names without the chassis letter.** "M700 Tiny" is as common as "M700q", and the
  Haswell-era M73 and M93p have no suffix at all. Requiring one left most of the Lenovo market
  with no model and therefore no generation.
- **Form factors glued to the model.** "optiplex 790sff" has no word boundary before `sff`, so
  `\bsff\b` missed it and the machine landed in Unstated. The chassis patterns allow a digit on
  either side but not a letter.

Each field carries a confidence note: stated, labelled, inferred from the model, or unknown.

## Relevance

Marketplaces answer a query with whatever they think is related. Asking Subito for a dough
mixer returns neck massagers and decorative tiles, and Vinted mixes promoted items into
results; on one sweep **421 of 599 results contained none of the query's words**. Nothing
downstream can tell the difference between those and a genuine hit, so a listing earns its
place by mentioning what was asked for in its title or body.

Words are compared on stems with accents folded, so *impastatrice* matches *impastatrici*
and *pentole* matches *pentola*. A listing's word may be shorter than the query's
(*ordenador* for *ordenadores*) but has to stay within a quarter of its length — at four
characters the verb *impasta* stood in for *impastatrice* and brought in pasta machines and
a lot of Kinder toys.

The cost of this is synonyms: a *planetaria* or *robot da cucina* advert that never writes
*impastatrice* is dropped. Add those as extra comma-separated terms to catch them.

## Form factor names

The same chassis has four names, and searching for one brand's word finds a quarter of the
market. A micro-only sweep has to ask for all of them:

| Dell | Lenovo | HP | Fujitsu |
|---|---|---|---|
| OptiPlex **Micro** (MFF) | ThinkCentre **Tiny** (q suffix) | EliteDesk / ProDesk **Mini** (DM) | Esprimo **Q** |

Searching only for OptiPlex returned 56 machines where the four brands together return 691, and
the ThinkCentre and EliteDesk lines undercut Dell by roughly 20 € at the same specification.

Both sizes are worth watching, and they trade against each other:

| | Volume | Processor | Idle | Expansion |
|---|---|---|---|---|
| Micro / Tiny / Mini | ~1 L | T-suffix, 35 W | 8–12 W | 2 DIMM, 1 M.2, 1 × 2.5" |
| SFF | ~8 L | full desktop, 65 W | 20–30 W | 4 DIMM, full-height PCIe, 3.5" bay |

SFF is consistently cheaper to buy. On a machine that never turns off, the ~15 W difference is
about 130 kWh a year, so at Italian domestic rates the 40 € saved on the purchase returns to the
meter inside a year. About 175 adverts state no size at all; they are kept and labelled rather
than dropped, and towers hide among them.

## Distance

A search can be limited to a radius around a place. Only Wallapop returns coordinates, Subito
names a town, and Vinted's search gives no location at all, so the radius works by geocoding the
town name once and caching it in `geocache` forever. 972 towns resolved on the first pass.

An unknown location is a third state, not "far away". Roughly two thirds of Vinted adverts carry
no town, so a radius that silently dropped them would delete Vinted from the search. The
`include_unlocated` flag decides: on by default, off when you only want adverts you can drive to.

| Radius from Rimini | unlocated kept | unlocated dropped |
|---|---|---|
| off | 796 | 796 |
| 150 km | 586 | 34 |
| 400 km | 754 | 202 |

## Sold detection

A listing that disappears from a search for `MISSES_BEFORE_SOLD` consecutive sweeps is
marked sold. This matters because **a sold Subito advert keeps serving its page at the old
price** — a naive price check reads it as live. The adapters also expose `isSold()`, which
reads Subito's `item-sold-badge`, Wallapop's `sold` flag, and Vinted's availability.

## Source quirks

| | Auth | Descriptions | Pagination | Reputation |
|---|---|---|---|---|
| Subito | none | inline | offset | `trust/profiles` |
| Wallapop | `x-deviceos` header | inline | JWT cursor | `users/{id}/stats` |
| Vinted | bootstrapped session cookie | **title only** | page number | `api/v2/users/{id}` |

Vinted is the awkward one. Its search returns titles without specifications, so promising
candidates each cost a page fetch for the embedded JSON, capped by `VINTED_MAX_DETAILS` per
sweep. It also rate-limits hard enough that the session is rotated every
`VINTED_ROTATE_EVERY` requests.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 8080 | HTTP port |
| `DB_PATH` | `./data/hunter.db` | SQLite file |
| `SWEEP_MINUTES` | 60 | how often every enabled search runs |
| `MISSES_BEFORE_SOLD` | 2 | consecutive absences before a listing counts as sold |
| `VINTED_HOST` | vinted.it | marketplace domain |
| `VINTED_ROTATE_EVERY` | 10 | requests before the session is rebuilt |
| `VINTED_MAX_DETAILS` | 40 | per-sweep budget for Vinted page fetches |

## API

```
GET    /api/searches
POST   /api/searches            body = partial search, missing fields take defaults
PUT    /api/searches/:id        body = partial search
DELETE /api/searches/:id
POST   /api/searches/:id/run    runs one search now, returns {found, offTopic, matched}
POST   /api/sweep               runs every enabled search in the background
GET    /api/listings?search_id=:id
GET    /api/places?q=rimi       place autocomplete, returns {label, lat, lon, country}
GET    /api/countries
GET    /api/stats
```

A search carries these fields. The csv ones are comma-separated and empty means no limit.

| Field | Meaning |
|---|---|
| `name`, `query` | label, and the comma-separated search terms |
| `kind` | `computer`, `memory` or `other`; decides which filters apply |
| `min_price`, `max_price` | euro |
| `sources` | subset of `subito,wallapop,vinted` |
| `countries` | ISO2 codes; empty means all of Europe |
| `place`, `lat`, `lon` | the search centre, set together by the autocomplete |
| `radius_km` | 0 means no distance limit |
| `include_unlocated` | keep adverts with no stated location when a radius is set |
| `chassis` | subset of `Micro,SFF,Unstated,Tower` |
| `vendor` | `Intel`, `AMD` or empty for both |
| `brands` | subset of `Dell,HP,Lenovo,Fujitsu` |
| `cpu_tiers` | subset of `i3,i5,i7,Ryzen 3,Ryzen 5,Ryzen 7` |
| `min_gen` | Intel generation floor |
| `min_year` | launch-year floor, the one age limit that works for both vendors |
| `min_ram`, `min_storage` | GB |
| `min_reviews` | seller reputation floor |
| `enabled` | whether the hourly sweep includes it |

Each listing comes back with its parsed specification, the seller's reputation, `distance_km`
(null when the advert states no location), `is_new` for anything first matched today, and
`cautions`, the advisory notes shown beside a row.

## Honest limitations

- These are **undocumented internal APIs**. They will break. Wallapop could add request
  signing tomorrow and the adapter would need rewriting.
- Bulk scraping generally sits against marketplace terms of service. This is built for
  personal buying at a polite request rate; treat anything public as a different question.
- Cross-posting is **not yet deduplicated**. The same machine appears on Subito and Vinted
  from the same seller; matching on a service tag or on normalised title plus city would fix it.
- The remaining parser gap is adverts that state nothing useful. A language-model pass over
  just those would close most of it.
