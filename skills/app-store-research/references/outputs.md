# Output files

Every command writes into the run folder `~/appstore-data/runs/<name>/` and rebuilds `report.html` there. Screenshots and per-app files live under `apps/<slug>-<id>/`.

| Command | Writes | Contents |
|---|---|---|
| `find` | `shortlist.json`, `shortlist.csv` | `idea`, `country`, `terms`, `must`, `genreId`, `shortlist[]` (id, name, url, seller, rating, ratings, price, genre, version, updated, released, topFreeRank, topGrossingRank, hits, source), `chartsTop10` |
| `profile` | `profiles.json`; per app `meta.json`, `page.json`, `developer-apps.json`, `screenshots/` | per app: id, name, url, subtitle, seller, developer, price, rating, ratings, histogram (5 to 1), chart {position, category}, inAppPurchases [{name, price}], privacy [{type, categories}], version, updated, released, sizeMB, minimumOs, languages, genre, similar, releaseNotes, description, dir |
| `reviews` | `reviews-summary.json`; per app `reviews.json`, `reviews.csv` | summary per app: totals per country {expected, fetched, route}, reviews, byStar, last90, negativeLast90, developerReplies, oldest, newest. Each review: id, title, body, rating, date, author, edited, voteSum, voteCount, country, developerReply, developerReplyDate |
| `compare` | `compare.json`, `compare.csv` | per app: rating, ratings, chart, price, iapCount, iapCheapest, monthly, yearly, lifetime, released, updated, version, sizeMB, minimumOs, languages, privacy {tracking, linked, notLinked, none}, reviews, last90, negativeLast90, negativePct, replies, replyPct, mentions per `--terms` word {reviews, negative, inDescription} |
| `refresh` | `changes.json`, `history/<stamp>-*.json` | per app: changes [{field, from, to}] for rating, ratings, price, chart, version, updated, inAppPurchases; newReviews; negativeLast90 |
| every command | `provenance.json`, `fetch-log.jsonl` | calls, cached and failed counts per endpoint; one line per request |
| `report` | `report.html` | self-contained page. Sections appear when their file exists: Candidates, The app or Competitors, Pricing, Side by side, Review signals, Reviews |

## Counting reviews yourself

`apps/*/reviews.json` is plain JSON. Example, 1-star reviews since June that mention a word:

```bash
node -e 'const r=require("./apps/<slug>/reviews.json").reviews.filter(x=>x.rating===1&&x.date>="2026-06-01"&&/withdraw/i.test(x.title+x.body));console.log(r.length);r.slice(0,5).forEach(x=>console.log(x.date,x.title,"\n ",x.body))'
```
