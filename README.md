# appstore

An agent skill for people building iOS apps. Give Claude Code or Codex an App Store link or an app idea, and it fetches everything Apple shows publicly, then answers your questions in chat. Ask for a report when you want one page to open or share.

No account, no API key, no packages. One Node file that reads Apple's public endpoints.

## What you can ask

- "I want to build a habit tracker. Who am I up against?"
- "Here's my app, what do people complain about?" with an apps.apple.com link
- "How does Bevel make money?"
- "Compare these five and tell me where they differ"
- "Which search terms does Phantom show up for?"
- "Fix my title and subtitle against these competitors"
- "Anything changed since last week?"
- "Give me the full report"

Every answer uses fetched numbers and verbatim reviews. Nothing is estimated.

## What it fetches

Listing details, subtitle, price and every in-app purchase with its price, rating and the 5-to-1 star histogram, category chart position, privacy label, screenshots, Apple's "you might also like", and every written review with developer replies, from any storefront. Search positions for any term and Apple's search autocomplete. Top Free and Top Grossing charts.

Not available anywhere public, so never shown: downloads, revenue, retention, keyword popularity scores.

## Install

Node 18 or newer is the only requirement.

Claude Code:

```bash
git clone https://github.com/iam-joey/app-store-research ~/.claude/skills/appstore
```

Codex:

```bash
git clone https://github.com/iam-joey/app-store-research ~/.codex/skills/appstore
```

Then talk to your agent. Data lands in `~/appstore-data/runs/<name>/` as JSON and CSV, plus `report.html`.

## The report

One page per run. Sections appear as the data does: candidates, app profiles with screenshots, pricing, side by side, search terms, review signals, and a reviews explorer with search, Loved / Complaints, star, storefront and developer-reply filters. Plain HTML, opens anywhere, no server.

## Running it by hand

```bash
node scripts/appstore.js run --idea "memecoin trading" --terms "memecoin|meme coin trading|solana memecoin" --must "meme" --top 5 --run memecoin
```

| Command | Does |
|---|---|
| `find --terms "a\|b" --must "w"` | Shortlist candidates for an idea, with chart ranks |
| `profile <link\|id\|name> ...` | Full listing per app, screenshots saved |
| `reviews <link\|id\|name> ...` | Every written review with developer replies |
| `compare --terms "withdraw\|fees"` | Side by side table, plus review mentions per word |
| `keywords --terms "a\|b"` | Search position per term per app, Apple autocomplete |
| `aso <my link> --vs "id\|id" --terms "a\|b"` | Your title and subtitle words vs competitors, positions per term |
| `refresh` | Refetch a run and list what changed |
| `report` | Rebuild `report.html` |
| `hints "<term>"` | Apple's autocomplete for a term |

Options: `--run <name>`, `--country us,in`, `--top 5`, `--exclude "coinbase"`, `--pick id,id`, `--full-images`.

## Data sources

iTunes Lookup and Search APIs, the App Store web page's embedded data, the legacy iTunes reviews endpoint (all reviews, any storefront), RSS charts, and the search autocomplete endpoint. Responses are cached for 24 hours in `~/appstore-data/cache/`. Store pages are fetched no faster than one every 2.5 seconds because Apple rate-limits them.

## License

MIT
