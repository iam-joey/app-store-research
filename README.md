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

**"I want to build a habit tracker. Who am I up against?"**

> 69 apps match. Top five by ratings: Me+ (247,840), Structured (165,685, #88 Top Free), Habit Tracker (146,641), Productive (91,085), Fabulous (88,914). All free to download.

**"What do people complain about in Bevel?"** with the link

> 88 of the last 263 reviews are 1 or 2 stars. Most helpful one, verbatim: "Downloaded because an ad said this app was free to use…"

**"Give me the report."**

> One `report.html` with everything above plus every review, searchable. Opens in any browser.

Every number is fetched. Reviews are quoted word for word. Nothing is estimated.

## What it can see

- Price, in-app purchases, rating histogram, chart position, privacy label, screenshots
- Every written review with developer replies, from any country

Not downloads or revenue. Apple doesn't publish them, so it won't guess.

## How to use it

Just ask. Any question about an iOS app, a competitor, or an app idea triggers the skill. To call it directly:

Claude Code:

```
/app-store-research what do people complain about in https://apps.apple.com/us/app/id6456176249
```

Codex:

```
$app-store-research who are the top habit tracker apps and what do they charge
```

Data lands in `~/appstore-data/runs/<name>/`, with `report.html` next to it.

## License

MIT. The App Store icon belongs to Apple and is used here only to refer to the App Store.
