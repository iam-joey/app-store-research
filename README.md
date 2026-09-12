<p align="center">
  <img src="assets/app-store.svg" width="112" alt="App Store">
</p>

<h1 align="center">App Store Research</h1>

<p align="center">
  Give your coding agent an App Store link or an app idea. It fetches what Apple shows publicly and answers your questions.<br>
  No Apple account. No API key. No packages. Works in Claude Code and Codex.
</p>

## Install

```bash
npx skills add iam-joey/app-store-research --skill app-store-research --global --yes
```

Needs Node 18 or newer. That's it.

## Ask it things

**"I want to build a memecoin trading app. Who am I up against?"**

> 49 apps match. The five that matter: Phantom (4.8★, 64,210 ratings, #111 in Finance), Moonshot (4.2★, 28,702 ratings, 16% one-star), fomo (4.8★, 17,520 ratings, #27 in Finance), Hype (4.9★, 201 ratings), GMGN (3.7★, 87 ratings). All free to download, none sell in-app purchases.

**"What do people complain about in Bevel?"** with the App Store link

> 951 written reviews, 263 in the last 90 days, 88 of those are 1 or 2 stars. The developer replied to 225. Most repeated complaint since June, verbatim:
>
> ★☆☆☆☆ 6 Jul 2026 · "Deceptive advertising… as expected. Downloaded because an ad said this app was free to use…"

**"Which search terms does Bevel show up for?"**

> #1 for "ai health coach", #4 for "health coach", nowhere in the top 25 for "sleep", "recovery" or "hrv", even though its subtitle says "Exercise, Sleep & Nutrition".

**"Give me the report."**

> One `report.html` per run: candidates, profiles with screenshots, pricing, side by side, search terms, review signals, and every review with search and filters. Opens in any browser.

Every number is fetched. Reviews are quoted word for word. Nothing is estimated.

## What it can see

Listing, subtitle, price, every in-app purchase and its price, rating and the star histogram, chart position, privacy label, screenshots, Apple's "you might also like", every written review with developer replies from any country, search positions for any term, Apple's search autocomplete, Top Free and Top Grossing charts.

What it can't, because Apple doesn't publish it: downloads, revenue, retention, keyword popularity scores.

## Commands

The agent runs these for you. You can also run them by hand.

| Command | Does |
|---|---|
| `run --idea "..." --terms "a\|b\|c"` | Idea to report in one go |
| `find --terms "a\|b"` | Shortlist competitors |
| `profile <link>` | Full listing, screenshots saved |
| `reviews <link>` | Every written review |
| `compare --terms "withdraw\|fees"` | Side by side, plus who mentions what |
| `keywords --terms "a\|b"` | Search position per term per app |
| `aso <my link> --vs "id\|id"` | Your title and subtitle against theirs |
| `refresh` | What changed since last time |
| `report` | Rebuild `report.html` |

```bash
node skills/app-store-research/scripts/appstore.js --help
```

Data lives in `~/appstore-data/runs/<name>/` as JSON, CSV and `report.html`.

## License

MIT. The App Store icon belongs to Apple and is used here only to refer to the App Store.
