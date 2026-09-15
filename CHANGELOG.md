# Changelog

## 0.2 (2026-09-15)

- `find` no longer lets huge apps win on ratings alone. Size stops counting past 100,000 ratings.
- `find --max-ratings N` keeps apps above N ratings out of the top slots. They are still listed under `overCap` so you can see who the giants are.
- New `drop <app>` removes an app from a run: deletes its folder, takes it out of profiles, review summary and compare, and rebuilds the report.

## 0.1 (2026-09-13)

- First release: find, profile, reviews, compare, refresh, report, hints.
