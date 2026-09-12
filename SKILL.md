---
name: appstore
description: App Store competitor research for people building iOS apps. Use this whenever the user shares an apps.apple.com link, names an iOS app, describes an app idea and wants to know the competition, asks what users complain about in an app, wants an app's reviews, pricing, in-app purchases, ratings, screenshots, or chart position, or asks how to rank better in App Store search. Trigger even when the user does not say "App Store" but clearly means a competitor teardown, app research, or ASO for an iOS app. Fetches everything from public Apple endpoints with no account or API key.
---

# appstore

Research any iOS app or app idea from public App Store data. The engine is `scripts/appstore.js`, a single Node file with no dependencies. It fetches, caches, and writes a run folder. You read the folder and write the verdicts.

Data folder: `~/appstore-data/` (override with `APPSTORE_DATA`). Each run lives in `runs/<name>/`.

## Rules

- Only fetched numbers appear in output. Never estimate downloads, revenue, or anything Apple does not publish. If asked, say plainly that no public source exists and point to Top Free rank (downloads signal) and Top Grossing rank (App Store revenue signal).
- Quote reviews verbatim with stars and date. Never paraphrase a review as if it were a quote.
- When you classify or count reviews by theme, say how you counted and show the search word so the user can reproduce it in the explorer.
- Every fetch goes through the script. Do not scrape by hand.

## Commands

Run with `node scripts/appstore.js <command> ... --run <name>`. The script prints JSON to stdout and progress to stderr.

| Command | Use | Key options |
|---|---|---|
| `run --idea "<idea>" --terms "a\|b\|c" --must "w\|x" --top 5` | Idea to full report in one go: find, profile, reviews, report | `--country us,in` `--full-images` |
| `find --terms "a\|b\|c" --must "w\|x"` | Shortlist only | `--top 8` |
| `profile <link\|id\|name> ...` | Full listing per app, screenshots saved | `--country us,in` |
| `reviews <link\|id\|name> ...` | Every written review, with developer replies | `--country us,in` `--since 2026-06-01` |
| `hints "<term>" ...` | Apple's autocomplete: what people actually type | `--country` |
| `report` | Rebuild `report.html` from the run folder, including `verdicts.json` | |

`--terms` uses `|` as separator. `--must` keeps only apps whose name or description contains one of those words; use it to filter giants that match a generic term.

## Workflow for an idea

1. Turn the idea into 6 to 8 search terms a real person would type. Mix the exact phrase, two-word variants, and the category noun. Run `hints` on the two core terms first and add any suggestion that fits.
2. Pick 1 to 3 `--must` words that a true competitor would have in its listing.
3. `run` with `--top 5`. It takes 2 to 6 minutes depending on review counts. Apple rate-limits store page fetches; the script paces itself, so do not run two instances at once.
4. Read `shortlist.json`, `profiles.json`, `reviews-summary.json`. Then read reviews: the newest 1 to 2 star reviews per app from `apps/*/reviews.json`, and the most helpful 5 star ones.
5. Write `verdicts.json` in the run folder, then run `report`. Keys: `market`, `competitors`, `money`, `failing`, `reviews`. Each value is one to three sentences, every claim backed by a number or a quote from the folder. Example: `"failing": "Moonshot: 305 of 2,135 negative reviews mention withdrawals; 75% of its last-90-day reviews are 1 to 2 stars. fomo: fees and a missing slippage preview, 18 mentions since June."`
6. Tell the user where `report.html` is. If an artifact tool is available, publish it with the run folder's `apps/**/screenshots/*` as supporting files so images render.

## Workflow for a link or app name

`profile` then `reviews` on it (add `--country` for the user's storefront), then `report`. Same verdict step, keys `competitors`, `money`, `failing`, `reviews`.

## Answering follow-up questions

The run folder is the source of truth. Use short Node one-liners over `reviews.json` to count and filter, for example reviews mentioning a word by month, or 1 star reviews since a date. Quote the matching reviews verbatim. Point the user to the explorer in `report.html` for the same filter so they can read the rest.

## What is not available

Downloads, revenue, retention, daily users, Apple's keyword popularity score, individual star ratings without text, version history beyond the current release, the hidden keyword field of any app. Say so when asked.

## Storefronts

`--country` takes ISO codes: us, in, gb, ca, au, de, fr, jp, br, mx, es, it, nl, se, sg, ae, kr, and about 30 more. Reviews come back in the language they were written in.
