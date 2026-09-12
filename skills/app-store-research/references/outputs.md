# What each command produces

The skill has three kinds of output. Design the second one.

1. **Terminal text.** Every command prints a short JSON summary. Agents read it, humans mostly don't.
2. **`report.html`.** One page per run, opened in any browser from the run folder. This is the visual product. It works the same in Claude Code, Codex, or a plain terminal.
3. **Artifact.** Only in Claude Code. Claude publishes the same `report.html` to a shareable link. Nothing extra is designed for it. It is the same page.

So: one page template, not one artifact per command. Sections appear only when the run has that data.

## Per command

| Command | Terminal | Files | Page sections it adds | Artifact |
|---|---|---|---|---|
| `run "<idea>"` | shortlist summary, then progress | everything below | 1, 2, 3, 5, 6, 7 today; 4 after phase 2 | yes, the full page |
| `find` | shortlist table | `shortlist.json`, `shortlist.csv` | 1 · Is there a market | no, terminal is enough |
| `profile <app…>` | per-app summary | `apps/<app>/meta.json`, `page.json`, `screenshots/` | 2 · Competitors, 3 · Money | yes when the user asked to "look at" an app |
| `reviews <app…>` | counts per app | `apps/<app>/reviews.json`, `.csv` | 5 · Where they fail, 6 · Reviews explorer | yes, the explorer is the point |
| `compare <app…> --mine` | the table | `compare.csv` | 2 as a side-by-side, 4 · Features matrix | yes |
| `keywords "<term>…"` | grid | `keywords.json` | 4 · How people find them | yes |
| `aso <my app>` | audit + suggestions | `aso.json` | 4, second half · How to get found | yes |
| `hints "<term>"` | list of suggestions | none | none | no |
| `watch add/list/remove` | the list | `watchlist.json` | none | no |
| `refresh --diff` | what changed | new dated run folder, `diff.json` | 8 · What changed since last week | yes |

## The page, section by section

Each section has a one-paragraph verdict at the top, written from the data under it, then the data.

| # | Section | Answers | Shows | States to design |
|---|---|---|---|---|
| 1 | Is there a market? | enter or not | shortlist table, terms searched, chart ranks | 5 rows, 20 rows, one row |
| 2 | Who am I competing with? | which to study | profile cards: icon, subtitle, snapshot numbers, screenshot strip, histogram, description, what's new, privacy, similar apps | one app, five apps; with and without subtitle, chart rank, IAP |
| 3 | How do they make money? | pricing model | price + IAP table, fee sentences quoted from descriptions | apps with IAP, apps with none |
| 4 | How do people find them? | name, subtitle, keywords | apps × terms grid, autocomplete lists, title and subtitle words, ASO audit when `--mine` | empty cells matter |
| 5 | Where are they failing? | what to build first | per-app table: reviews, 1★, 5★, last 90 days, negative share, developer replies | one app, five apps |
| 6 | Reviews explorer | read the raw material | search box, app chips, star chips, developer-reply toggle, sort, list with reply blocks | zero results, 50 of 4,000 |
| 7 | Provenance | can I trust this | endpoint table with calls, cached, failed, and the not-available list | one row failed |
| 8 | What changed | is it moving | deltas per app: ratings, rank, keyword positions, new reviews, new version | first run (nothing to diff) |

Two page shapes cover everything:

- **Idea run**: sections 1 through 7.
- **Single app**: sections 2, 3, 5, 6, 7 for that one app. Same components, one column.

Section 8 only appears on a refresh.

## Rules the design must keep

- Light theme only.
- Every number is fetched. No estimate labels anywhere, because there are no estimates.
- Reviews are verbatim, with stars, date, storefront, and the developer's reply.
- Images are files next to the page, not embedded, so the page stays small and screenshots can be opened at full size.
- Wide tables scroll inside their own box. The page never scrolls sideways.
- The page reads correctly with no JavaScript except the reviews explorer.

## Do we need artifacts at all?

No. The page is the product and it must work without them, because Codex and plain CLI users never see an artifact. In Claude Code, publishing the page as an artifact is a one-line convenience for sharing a link with a co-founder. Keep it, don't design for it.
