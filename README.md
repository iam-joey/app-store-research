# appstore

App Store competitor research for people building iOS apps. Paste a link or describe an idea, get a research folder: every competitor's listing, pricing, in-app purchases, star histogram, chart rank, screenshots, and **every written review with the developer's replies**, plus a searchable report page.

No Apple developer account. No API keys. No packages to install. One Node file.

```
node scripts/appstore.js run --idea "memecoin trading platform" \
  --terms "memecoin|meme coin trading|meme coins|pump fun" --must "meme|memecoin" --top 5
```

Output lands in `~/appstore-data/runs/<name>/`:

```
shortlist.json / .csv      who competes, found via search, Apple's similar apps, and category charts
profiles.json              listing details, IAP prices, histogram, chart rank, privacy labels
reviews-summary.json       counts per app, last-90-day negative share, developer reply counts
apps/<app>/meta.json       every field Apple exposes
apps/<app>/page.json       embedded store-page data
apps/<app>/reviews.json    all reviews, .csv alongside
apps/<app>/screenshots/    icon, iPhone, iPad, Apple Watch
report.html                the research page with a reviews explorer
provenance.json            which endpoint answered, how many calls, what failed
```

## Use as an agent skill

The folder follows the Agent Skills format (`SKILL.md` + `scripts/`). Copy or symlink it:

- Claude Code: `~/.claude/skills/appstore`
- Codex: `~/.codex/skills/appstore`
- Any other agent that reads `SKILL.md`

Then ask in plain words: "check this app: https://apps.apple.com/…", "who competes with a sleep score app", "what do Bevel users complain about".

## Use as a CLI

| Command | Does |
|---|---|
| `run --idea … --terms … --must … --top N` | find, profile, reviews, report in one go |
| `find --terms "a\|b\|c" --must "w"` | shortlist only |
| `profile <link\|id\|name> …` | full listing per app, screenshots saved |
| `reviews <link\|id\|name> … [--country us,in] [--since YYYY-MM-DD]` | every review, all storefronts you ask for |
| `hints "<term>" …` | Apple's autocomplete, i.e. what people actually type |
| `report --run <name>` | rebuild report.html from the folder |

Node 18 or newer. Set `APPSTORE_DATA` to move the data folder.

## Where the data comes from

All public Apple endpoints, fetched with a 24-hour cache and pacing so you never get rate-limited:

- Lookup and Search APIs: details, descriptions, screenshots, search results
- The store page's embedded data: histogram, chart rank, in-app purchase prices, privacy labels, similar apps
- The iTunes-era reviews endpoint: every review, four sort orders, any storefront, with developer replies
- RSS charts: Top Free, Top Paid, Top Grossing per category
- Search autocomplete

## What it will never show

Downloads, revenue, retention, or Apple's keyword popularity score. No public source exists, and this tool does not estimate. Top Free rank is the official download signal; Top Grossing rank is the App Store revenue signal.

## License

MIT
