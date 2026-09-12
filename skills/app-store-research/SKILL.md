---
name: app-store-research
description: App Store research for people building iOS apps, from public Apple data with no account or API key. Use this whenever the user shares an apps.apple.com link, names an iOS app, describes an app idea and wants to know the competition, asks what users complain about or love in an app, wants an app's reviews, pricing, in-app purchases, ratings, screenshots or chart position, wants to compare apps, asks which search terms apps show up for, or asks how to improve their own app's title, subtitle or App Store search ranking (ASO). Trigger even when the user never says "App Store" but clearly means iOS competitor research.
license: MIT
compatibility: Requires Node.js 18 or newer and internet access to apple.com. No packages, no API keys.
metadata:
  author: iam-joey
  version: "0.1"
---

# App Store research

The engine is `scripts/appstore.js` in this skill's folder: one Node 18+ file, no dependencies. Run it with `node scripts/appstore.js --help` first to see the usage. Every command writes JSON into a run folder under `~/appstore-data/runs/<name>/` (override the root with `APPSTORE_DATA`) and regenerates `report.html` there. You read the folder and answer in chat. The page is for when the user wants one thing to open or share.

Run: `node <skill folder>/scripts/appstore.js <command> ... --run <name>`. JSON goes to stdout, progress to stderr. Pick a short run name from the idea or app and reuse it for every follow-up, so the data accumulates in one folder.

## Rules

- Only fetched numbers. Never estimate downloads, revenue or retention; Apple does not publish them. If asked, say so and point to Top Free rank (a download signal) and Top Grossing rank (an App Store revenue signal).
- Quote reviews verbatim with stars and date. Never paraphrase one as if it were a quote.
- When you count reviews by theme, say how (the search word) so the user can repeat it in the page's search box.
- All fetching goes through the script. Do not scrape by hand. Do not run two instances at once; Apple rate-limits store pages and the script paces itself.

## What the user asks, what you do

| They ask | Command | Read | Answer in chat |
|---|---|---|---|
| Who are my competitors for [idea]? | `find --terms "a\|b\|c" --must "w"` | `shortlist.json` | 5 to 8 apps: name with link, rating, ratings count, price, chart ranks. Offer to profile the top ones. |
| Tell me about [app] | `profile <link>` | `profiles.json` | Price, in-app purchases, rating and count, chart position, last update, subtitle, privacy label summary. |
| What do people hate / love about [app]? | `reviews <link>` | `reviews-summary.json`, `apps/*/reviews.json` | Counts (all time, last 90 days, negative share), then 3 to 5 verbatim quotes with stars and dates. Name the search word and the Loved / Complaints button on the page. |
| How do they make money? | `profile` | `profiles.json` | One table: download price, in-app purchase names and prices. |
| Compare these / me vs them | `compare --terms "withdraw\|fees"` | `compare.json` | Point to the Side by side section. In chat, only the rows that differ. `--terms` counts reviews mentioning each word per app. |
| What search terms do they show up for? | `keywords --terms "a\|b"` | `keywords.json` | Grid of term by app position, Apple's autocomplete per term, apps that outrank them. Without `--terms` it reuses the run's search terms. |
| How do I fix my title and subtitle? | `aso <my link> --vs "id\|id" --terms "a\|b"` | `aso.json` | Their title and subtitle words vs the competitors', words they lack, Apple autocomplete for the seeds, and where they and each competitor rank for each term. Character counts against the 30 limit. |
| Anything changed since last time? | `refresh` | `changes.json` | Per app: rating, ratings, price, IAP, chart, version changes and new review counts. |
| The whole research on [idea] | `run --idea "..." --terms "a\|b\|c\|d\|e\|f" --must "w" --top 5` | everything | find, profile, reviews, compare, keywords, report in one go. 2 to 6 minutes. Then give the report. |
| Give me the report | `report` | | Path to `report.html`. Publish it if an artifact tool exists, with `apps/**/screenshots/*` as supporting files so images render. |

`--terms` and `--must` use `|` as separator. `--country us,in` fetches several storefronts (first one is used for search and charts). `--exclude "coinbase|binance"` drops names from a shortlist. `--pick id,id` chooses which candidates to profile. `hints "<term>"` prints Apple's autocomplete for any term.

## Chat or page?

Chat by default. Every answer above fits in a few lines plus quotes. Give the page when the user asks for a report, asks for the full research on an idea, or asks for something that is a table (compare, keywords) or a list too long for chat (all reviews). Then say where `report.html` is and, if you can publish artifacts, publish it. One page per run; it grows as commands add sections.

## Search terms for an idea

Turn the idea into 6 to 8 terms a real person would type: the exact phrase, two-word variants, the category noun, one or two brand names people would search for. Run `hints` on the two core terms first and add suggestions that fit. Pick 1 to 3 `--must` words a true competitor would have in its listing; without them, generic terms return giants like Coinbase or Instagram.

## Follow-up questions

The run folder is the source of truth. Use short Node one-liners over `apps/*/reviews.json` to count and filter, for example 1-star reviews since a date that mention a word. Quote the matches verbatim. Point to the same search on the page.

## Not available

Downloads, revenue, retention, daily users, Apple's keyword popularity score, star ratings without text, version history before the current release, any app's hidden keyword field. Say so plainly when asked. Keyword positions come from Apple's Search API order for the storefront, which tracks App Store search closely but is not the same ranking users see with personalisation.

## Output files

[references/outputs.md](references/outputs.md) lists every file each command writes and what is in it. Read it when a follow-up question needs a field you have not seen.

## Storefronts

`--country` takes ISO codes: us, in, gb, ca, au, de, fr, jp, br, mx, es, it, nl, se, sg, ae, kr and about 30 more. Reviews come back in the language they were written in.
