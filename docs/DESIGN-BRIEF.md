# Design brief: the appstore report page

## What we are building

A Claude Code / Codex skill plus a plain CLI. You give it an App Store link or an app idea. It fetches everything the public App Store exposes about the competitors, with no account and no API key, and writes a folder:

```
runs/<name>/
  report.html          ← the page you are designing
  shortlist.json/.csv
  profiles.json
  reviews-summary.json
  apps/<app>/reviews.json, meta.json, page.json, screenshots/
  provenance.json
```

`report.html` is one file, light theme only, opened in any browser. Images are files next to it. The only JavaScript is the reviews explorer. Everything else is static.

Two shapes of the page:

- **Idea run**: sections 1 to 7 below, five to eight apps.
- **Single app**: sections 2, 3, 5, 6, 7 for one app.

Sections appear only when the run has that data. Each section opens with a **verdict**: one to three sentences written by the agent from the data underneath. Every number on the page is fetched from Apple. There are no estimates, so no estimate labels.

## The sections

| # | Section | The question it answers | What's in it |
|---|---|---|---|
| 1 | Is there a market? | enter or not | shortlist table |
| 2 | Who am I competing with? | which to study | one profile card per app |
| 3 | How do they make money? | pricing model | price + in-app purchase table |
| 4 | How do people find them? | name, subtitle, keywords | apps × search terms grid, autocomplete lists (phase 2) |
| 5 | Where are they failing? | what to build first | per-app review stats table |
| 6 | Reviews explorer | read the raw material | search, filters, the list |
| 7 | Provenance | can I trust this | endpoint table |
| 8 | What changed | is it moving | deltas, only on a refresh (phase 3) |

---

## Section 1 · shortlist row (real data)

```json
{
  "name": "fomo - never miss out",
  "seller": "FOMO Labs Inc.",
  "rating": 4.8,
  "ratings": 17754,
  "price": "Free",
  "genre": "Finance",
  "updated": "2026-09-11",
  "released": "2025-04-18",
  "topFreeRank": 27,
  "topGrossingRank": null,
  "hits": ["memecoin #1", "meme coin trading #1", "meme coins #1", "solana memecoin #10"],
  "source": "search"
}
```

`source` is either `search` or `similar to <app name>` (found through Apple's "you might also like"). `topGrossingRank` is null when the app is not in the top 200 of its category, which is normal for apps that earn outside the App Store. States: 5 rows, 20 rows, 1 row.

## Section 2 · profile card (real data)

```json
{
  "name": "fomo - never miss out",
  "subtitle": "Trade BTC, ETH, SOL, and more",
  "developer": "fomo labs, inc",
  "price": "Free",
  "rating": 4.8,
  "ratings": 17520,
  "histogram": { "5": 16091, "4": 767, "3": 340, "2": 122, "1": 434 },
  "chart": { "position": 27, "category": "Finance" },
  "inAppPurchases": [],
  "privacy": [
    { "type": "Data Used to Track You", "categories": ["Identifiers"] },
    { "type": "Data Linked to You", "categories": ["Contact Info", "Identifiers", "Usage Data", "Diagnostics"] },
    { "type": "Data Not Linked to You", "categories": ["Identifiers", "Diagnostics"] }
  ],
  "version": "1.91.1",
  "updated": "2026-09-09",
  "released": "2025-04-18",
  "sizeMB": 102,
  "minimumOs": "16.4",
  "languages": ["EN", "JA", "ZH", "ES"],
  "similar": ["Invo", "DEX Screener", "GMGN - Meme Track", "Jupiter Mobile", "TradeLocker", "Moonshot"],
  "screenshots": 10,
  "description": "Catch the next big crypto before everyone else – buy any token on Solana, Robinhood Chain, BNB Chain, Base, Ethereum or Monad! ...",
  "releaseNotes": "..."
}
```

Files next to the page: `screenshots/icon.png`, `iphone-01.jpg` … `iphone-10.jpg`, sometimes `ipad-*.jpg` and `watch-*.png`. Screenshots are 392×696 by default, full size on request.

States: subtitle missing, chart missing (not charting), IAP empty, one app vs five apps, description long (Bevel's is 3,700 characters, collapse it).

When in-app purchases exist, they look like this (Bevel):

```json
"inAppPurchases": [
  { "name": "Bevel Pro - Monthly", "price": "$14.99" },
  { "name": "Bevel Pro - Annual", "price": "$99.99" },
  { "name": "350 Bevel Intelligence-Credits", "price": "$4.99" }
]
```

## Section 5 · review stats row (real data)

```json
{
  "name": "fomo - never miss out",
  "reviews": 419,
  "byStar": { "1": 141, "2": 21, "3": 27, "4": 23, "5": 207 },
  "last90": 261,
  "negativeLast90": 101,
  "developerReplies": 143,
  "oldest": "2025-04-21",
  "newest": "2026-09-11",
  "totals": { "us": { "expected": 419, "fetched": 419, "route": "legacy" } }
}
```

`expected` vs `fetched` proves completeness. `route` says which Apple endpoint answered.

---

## Section 6 · the reviews explorer

### Where reviews come from

An iTunes-era Apple endpoint that the old desktop iTunes app used. It still answers. It returns **every written review** an app has, 100 per request, for any of Apple's 175 storefronts, with the developer's reply attached. Not sampled, not capped. Bevel: 857 of 857. Moonshot: 2,756 of 2,756.

What it does not return: the app version the review was written on, and star ratings that have no text (those only exist as the histogram totals).

### One review, exactly as stored

```json
{
  "id": "14396432195",
  "title": "AS MUCH AS 20% FEES SELLING SOLANA",
  "body": "This has been a lot of fun following top crypto performers and tag along on some of the highs. Well one star because the fees are constantly changing on the same coin. I'll have $4, or $40 and the fees will change from \"$.10\" to \"$.95\" on the same coin same time. The app experienced a crash today, and I wasn't able to sell my coins or do anything- just sat and watched my worth plummet by more than...",
  "rating": 1,
  "date": "2026-08-06",
  "author": "ian grimmer",
  "edited": true,
  "voteSum": 0,
  "voteCount": 0,
  "country": "US",
  "developerReply": "Hi there! the different fees you pointed out is specifically because we try to charge lower fees on smaller trade amounts! so that you pay less fees. on the app crashing we sincerely apologise for that and are making sure it never happens again.",
  "developerReplyDate": "2026-08-05"
}
```

A 5-star one:

```json
{
  "title": "I'm a newbie",
  "body": "I'm a newbie at trading Crypto, before it was Bitcoin and I have a Coinbase account that I had forgotten about. ... I like the features that help guide you through trading.",
  "rating": 5,
  "date": "2026-08-31",
  "author": "MotherTrucker6kids",
  "edited": false,
  "voteSum": 0,
  "voteCount": 1,
  "country": "US",
  "developerReply": null
}
```

A 3-star one:

```json
{
  "title": "Not always reliable",
  "body": "I literally have to close and re-open the app in order to click on a token in my wallet and have it actually show the chart and trade it etc. 50% of the time that i click on a token in my wallet nothing happens. Please fix this",
  "rating": 3,
  "date": "2026-09-10",
  "author": "Joeyfbaby93",
  "country": "US",
  "developerReply": null
}
```

Field notes for the review card:

- `rating` 1 to 5. Colour by band: 1 to 2 negative, 3 middle, 4 to 5 positive.
- `title` can be long and shouty. Bodies range from 5 characters to 2,000+.
- `author` is a public App Store nickname. Show it or not, your call. Verbatim quotes elsewhere on the page omit it.
- `edited` true means the reviewer changed it after posting.
- `voteSum` / `voteCount`: helpful votes. Mostly 0. Show only when non-zero.
- `country` is the storefront code. Reviews are in whatever language they were written in.
- `developerReply` is null for most reviews. When present, it belongs visually to the review, with its own date. Note the reply date can be earlier than the review date because Apple shows the review's last-edited date.

### What the explorer must do

All reviews from all profiled apps are in the page as data. The page shows 50 and a "show 50 more" button. Every control filters the full set instantly, no server.

Controls:

- **Search box**: matches title, body, and developer reply. Highlight matches.
- **App chips**: one per app with its count. Multi-select.
- **Star chips**: 5★ to 1★ with counts, counts update when apps are selected. Multi-select.
- **Has developer reply** toggle.
- **Sort**: most recent, oldest, most helpful, lowest stars, highest stars.
- **Clear**.
- **Count line**: "1,203 of 4,467 reviews matching "withdraw"".

Optional but useful: reviews per month as a small stacked bar (negative / middle / positive), click a month to filter. The Bevel page had it.

States: 50 of 4,467; zero results; one app with 28 reviews; 10,000+ reviews (still fine, page is about 3 MB).

Scale reference from real runs:

| App | Reviews |
|---|---|
| GMGN | 28 |
| fomo | 419 |
| Bevel | 857 US + 94 India |
| Phantom | 1,192 |
| Moonshot | 2,756 |

## Section 7 · provenance (real data)

```json
[
  { "label": "search", "calls": 12, "cached": 0, "failed": 0 },
  { "label": "page", "calls": 16, "cached": 6, "failed": 0 },
  { "label": "lookup", "calls": 54, "cached": 24, "failed": 0 },
  { "label": "chart:topfreeapplications", "calls": 2, "cached": 0, "failed": 0 },
  { "label": "reviews", "calls": 94, "cached": 0, "failed": 0 },
  { "label": "image", "calls": 92, "cached": 0, "failed": 0 }
]
```

Plus a fixed line: not available from any public source: downloads, revenue, retention, individual ratings without text, version history beyond the current release.

## Rules

- Light theme only.
- Verdict block at the top of each section, visually distinct from data.
- Tables scroll inside their own box on narrow screens. The page never scrolls sideways.
- Reviews verbatim. Never truncate a body in the explorer; truncate only in verdict quotes.
- Numbers use tabular figures and thousands separators.
- Print the fetch date on the page. Data goes stale.
