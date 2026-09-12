#!/usr/bin/env node
// appstore — App Store research from public endpoints. Zero dependencies. Node 18+.
// Commands: find | profile | reviews | compare | keywords | aso | refresh | report | run | hints   (see SKILL.md)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const DATA = process.env.APPSTORE_DATA || path.join(os.homedir(), 'appstore-data');
const CACHE_TTL = 24 * 3600 * 1000;
const UA_WEB = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const UA_ITUNES = 'iTunes/12.12 (Macintosh; OS X 10.15.7) AppleWebKit/605.1.15';
const STOREFRONT = {us:143441,in:143467,gb:143444,ca:143455,au:143460,de:143443,fr:143442,jp:143462,br:143503,mx:143468,es:143454,it:143450,nl:143452,se:143456,sg:143464,ae:143481,kr:143466,cn:143465,ru:143469,tr:143480,id:143476,ph:143474,my:143473,th:143475,vn:143471,pk:143477,ng:143561,za:143472,eg:143516,sa:143479,nz:143461,ie:143449,ch:143459,at:143445,be:143446,dk:143458,no:143457,fi:143447,pl:143478,pt:143453,il:143491,ar:143505,cl:143483,co:143501,pe:143507,hk:143463,tw:143470};

// ---------- utils ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ensure = d => { fs.mkdirSync(d, { recursive: true }); return d; };
const writeJSON = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 1));
const readJSON = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const today = () => new Date().toISOString().slice(0, 10);
const log = (...a) => console.error(...a);
function csv(rows, cols) {
  const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [cols.join(',')].concat(rows.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
}
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true; o[k] = v; }
    else o._.push(a);
  }
  return o;
}

// ---------- http with cache + pacing + backoff ----------
let lastHit = 0;
let FRESH = false; // set by refresh: ignore cached copies of live data
const PACE = { 'apps.apple.com': 2500, default: 400 };
const prov = []; // provenance log
async function http(url, { headers = {}, binary = false, ttl = CACHE_TTL, label = '' } = {}) {
  const key = crypto.createHash('sha1').update(url + JSON.stringify(headers)).digest('hex');
  const cdir = ensure(path.join(DATA, 'cache'));
  const cpath = path.join(cdir, key + (binary ? '.bin' : '.txt'));
  const meta = path.join(cdir, key + '.meta.json');
  if (!(FRESH && !binary) && fs.existsSync(cpath) && fs.existsSync(meta)) {
    const m = readJSON(meta);
    if (Date.now() - m.t < ttl) { prov.push({ label, url, status: 'cache' }); return binary ? fs.readFileSync(cpath) : fs.readFileSync(cpath, 'utf8'); }
  }
  const host = new URL(url).host;
  const pace = PACE[host] || PACE.default;
  const wait = lastHit + pace - Date.now(); if (wait > 0) await sleep(wait);
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    lastHit = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA_WEB, 'Accept-Language': 'en-US,en;q=0.9', ...headers } });
      if (res.status === 429 || res.status >= 500) { lastErr = new Error('HTTP ' + res.status); await sleep(8000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      fs.writeFileSync(cpath, body); writeJSON(meta, { t: Date.now(), url });
      prov.push({ label, url, status: res.status });
      return body;
    } catch (e) { lastErr = e; if (!/HTTP (429|5\d\d)/.test(String(e))) break; }
  }
  prov.push({ label, url, status: 'failed', error: String(lastErr) });
  throw lastErr;
}
const httpJSON = async (url, opt) => JSON.parse(await http(url, opt));

// ---------- apple endpoints ----------
async function lookup(id, cc = 'us') {
  const d = await httpJSON(`https://itunes.apple.com/lookup?id=${id}&country=${cc}`, { label: 'lookup' });
  return d.results.find(r => r.wrapperType === 'software') || null;
}
async function lookupDeveloper(artistId, cc = 'us') {
  const d = await httpJSON(`https://itunes.apple.com/lookup?id=${artistId}&entity=software&country=${cc}`, { label: 'developer' });
  return d.results.filter(r => r.wrapperType === 'software');
}
async function search(term, cc = 'us', limit = 25) {
  const d = await httpJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${cc}&entity=software&limit=${limit}`, { label: 'search', ttl: 6 * 3600 * 1000 });
  return d.results;
}
async function hints(term, cc = 'us') {
  const sf = STOREFRONT[cc] || STOREFRONT.us;
  const xml = await http(`https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=${encodeURIComponent(term)}`, { headers: { 'X-Apple-Store-Front': `${sf}-1,29`, 'User-Agent': UA_ITUNES }, label: 'autocomplete', ttl: 6 * 3600 * 1000 });
  return [...xml.matchAll(/<key>term<\/key>\s*<string>([^<]*)<\/string>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}
async function chart(kind, genreId, cc = 'us', limit = 200) {
  // kind: topfreeapplications | toppaidapplications | topgrossingapplications
  const g = genreId ? `/genre=${genreId}` : '';
  const d = await httpJSON(`https://itunes.apple.com/${cc}/rss/${kind}/limit=${limit}${g}/json`, { label: 'chart:' + kind, ttl: 6 * 3600 * 1000 });
  const e = d.feed.entry || [];
  return (Array.isArray(e) ? e : [e]).map((a, i) => ({ rank: i + 1, id: a.id.attributes['im:id'], name: a['im:name'].label }));
}
async function storePage(id, cc = 'us') {
  const html = await http(`https://apps.apple.com/${cc}/app/id${id}`, { label: 'page' });
  const m = html.match(/<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { error: 'no embedded data' };
  const sm = JSON.parse(m[1]).data[0].data.shelfMapping;
  const out = {};
  try { const pr = sm.productRatings.items[0]; out.ratingAverage = pr.ratingAverage; out.ratingCount = pr.totalNumberOfRatings; out.histogram = { 5: pr.ratingCounts[0], 4: pr.ratingCounts[1], 3: pr.ratingCounts[2], 2: pr.ratingCounts[3], 1: pr.ratingCounts[4] }; } catch {}
  try { const pos = (sm.informationRibbon.items || []).find(i => i.type === 'chartPosition'); if (pos) out.chart = { position: Number(pos.content.position), category: pos.caption }; } catch {}
  try {
    out.information = {};
    for (const it of sm.information.items || []) {
      if (it.title === 'In-App Purchases') { const seen = new Set(); out.inAppPurchases = []; for (const i of it.items || []) for (const [n, p] of i.textPairs || []) { const k = n + '|' + p; if (!seen.has(k)) { seen.add(k); out.inAppPurchases.push({ name: n, price: p.replace(/ /g, '') }); } } }
      else out.information[it.title] = it.summary || (it.items || []).map(i => (i.heading ? i.heading + ': ' : '') + (i.text || '')).join(' | ');
    }
  } catch {}
  try { out.privacy = (sm.privacyTypes.items || []).map(t => ({ type: t.title, categories: (t.categories || []).map(c => c.title || c.name) })); } catch {}
  try { out.similar = (sm.similarItems.items || []).map(i => ({ id: i.id || (i.offerDisplayProperties || {}).adamId, name: i.title })).filter(x => x.name); } catch {}
  try { out.featuredReviews = (sm.allProductReviews.items || []).map(i => i.review).filter(Boolean).map(r => ({ id: r.id, title: r.title, rating: r.rating, date: r.date, body: r.contents })); } catch {}
  try { out.capabilities = (sm.capabilities.items || []).map(i => i.title).filter(Boolean); } catch {}
  const sub = html.match(/<(?:p|h2) class="subtitle[^"]*"[^>]*>\s*([^<]+?)\s*<\/(?:p|h2)>/); if (sub) out.subtitle = sub[1].trim().replace(/&amp;/g, '&');
  const watch = [...new Set([...html.matchAll(/https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"\s]*?\/[^"\s]*?(?:[Ww]atch)[^"\s]*?\/\d+x\d+bb\.(?:png|jpg)/g)].map(m => m[0]))];
  if (watch.length) out.watchScreenshotUrls = watch;
  return out;
}
async function reviewsAll(id, cc = 'us', { max = 5000, sorts = [4, 1] } = {}) {
  // Legacy iTunes reviews endpoint. Returns every written review. sort: 1 helpful, 2 favorable, 3 critical, 4 recent
  const sf = STOREFRONT[cc]; if (!sf) throw new Error('unknown country ' + cc);
  const H = { 'X-Apple-Store-Front': `${sf},29`, 'User-Agent': UA_ITUNES };
  let total = null;
  try { const m = await httpJSON(`https://itunes.apple.com/WebObjects/MZStore.woa/wa/customerReviews?id=${id}&displayable-kind=11&page=1&sort=4`, { headers: H, label: 'reviews:total', ttl: 6 * 3600 * 1000 }); total = m.totalNumberOfReviews; } catch {}
  const all = new Map();
  for (const sort of sorts) {
    for (let start = 0; start < max; start += 100) {
      const d = await httpJSON(`https://itunes.apple.com/WebObjects/MZStore.woa/wa/userReviewsRow?id=${id}&displayable-kind=11&startIndex=${start}&endIndex=${start + 100}&sort=${sort}`, { headers: H, label: 'reviews', ttl: 6 * 3600 * 1000 });
      const l = d.userReviewList || []; if (!l.length) break;
      for (const r of l) all.set(r.userReviewId, r);
      if (total != null && all.size >= total) break;
    }
    if (total != null && all.size >= total) break;
  }
  const revs = [...all.values()].map(r => ({ id: r.userReviewId, title: r.title, body: r.body, rating: r.rating, date: r.date.slice(0, 10), author: r.name, edited: !!r.isEdited, voteSum: r.voteSum || 0, voteCount: r.voteCount || 0, country: cc.toUpperCase(), developerReply: r.developerResponse ? r.developerResponse.body : null, developerReplyDate: r.developerResponse ? String(r.developerResponse.modified || '').slice(0, 10) : null }));
  revs.sort((a, b) => b.date.localeCompare(a.date));
  return { total, reviews: revs };
}
async function rssReviews(id, cc = 'us') { // fallback, may be empty
  const out = [];
  for (let p = 1; p <= 10; p++) {
    const d = await httpJSON(`https://itunes.apple.com/${cc}/rss/customerreviews/page=${p}/id=${id}/sortby=mostrecent/json`, { label: 'reviews:rss', ttl: 6 * 3600 * 1000 });
    const e = d.feed.entry; if (!e) break;
    for (const x of (Array.isArray(e) ? e : [e])) out.push({ id: x.id.label, title: x.title.label, body: x.content.label, rating: +x['im:rating'].label, date: x.updated.label.slice(0, 10), author: x.author.name.label, version: x['im:version'].label, country: cc.toUpperCase() });
  }
  return out;
}

// ---------- resolve app ids ----------
async function resolve(input, cc = 'us') {
  const s = String(input).trim();
  const m = s.match(/id(\d{6,})/) || s.match(/^(\d{6,})$/);
  if (m) return { id: Number(m[1]) };
  const r = await search(s, cc, 5);
  if (!r.length) throw new Error('no app found for "' + s + '"');
  return { id: r[0].trackId, matches: r.map(a => ({ id: a.trackId, name: a.trackName, ratings: a.userRatingCount })) };
}

// ---------- commands ----------
async function cmdFind(o, run) {
  const cc = (o.country || 'us').split(',')[0];
  const terms = (o.terms || o._.join(' ')).split('|').map(s => s.trim()).filter(Boolean);
  const must = o.must ? o.must.split('|').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const top = +(o.top || 8);
  const apps = new Map(), hits = {};
  for (const t of terms) {
    const r = await search(t, cc, 25);
    r.forEach((a, i) => { apps.set(a.trackId, a); (hits[a.trackId] = hits[a.trackId] || []).push({ term: t, position: i + 1 }); });
    log(`search "${t}": ${r.length}`);
  }
  const rel = a => !must.length || must.some(w => (a.trackName + ' ' + a.description).toLowerCase().includes(w));
  let cands = [...apps.values()].filter(rel).map(a => ({ ...a, _hits: hits[a.trackId], _source: 'search' }));
  const excl = o.exclude ? o.exclude.split('|').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  cands = cands.filter(a => !excl.some(w => a.trackName.toLowerCase().includes(w)));
  const score = a => a._hits.length * Math.log10(a.userRatingCount + 100);
  cands.sort((x, y) => score(y) - score(x));
  // similar-apps hop from the top 3
  const hop = [];
  for (const a of cands.slice(0, 3)) {
    try { const pg = await storePage(a.trackId, cc); for (const s of pg.similar || []) if (s.id && !apps.has(+s.id)) hop.push({ id: +s.id, from: a.trackName }); } catch (e) { log('similar hop failed', a.trackName, String(e)); }
  }
  for (const h of hop.slice(0, 12)) {
    try { const a = await lookup(h.id, cc); if (a && rel(a) && !apps.has(a.trackId)) { apps.set(a.trackId, a); cands.push({ ...a, _hits: [], _source: 'similar to ' + h.from }); } } catch {}
  }
  // charts for the dominant genre
  const genre = {}; for (const a of cands.slice(0, 10)) genre[a.primaryGenreId] = (genre[a.primaryGenreId] || 0) + 1;
  const gid = Object.entries(genre).sort((a, b) => b[1] - a[1])[0]?.[0];
  let free = [], gross = [];
  if (gid) { try { free = await chart('topfreeapplications', gid, cc); gross = await chart('topgrossingapplications', gid, cc); } catch (e) { log('charts failed', String(e)); } }
  const rankIn = (list, id) => (list.find(x => +x.id === id) || {}).rank || null;
  const shortlist = cands.map(a => ({ id: a.trackId, name: a.trackName, url: a.trackViewUrl, seller: a.sellerName, rating: +a.averageUserRating.toFixed(2), ratings: a.userRatingCount, price: a.formattedPrice, genre: a.primaryGenreName, version: a.version, updated: a.currentVersionReleaseDate.slice(0, 10), released: a.releaseDate.slice(0, 10), topFreeRank: rankIn(free, a.trackId), topGrossingRank: rankIn(gross, a.trackId), hits: a._hits.map(h => `${h.term} #${h.position}`), source: a._source }));
  const out = { idea: o.idea || terms.join(', '), country: cc, terms, must, genreId: gid, shortlist, chartsTop10: { free: free.slice(0, 10), grossing: gross.slice(0, 10) } };
  writeJSON(path.join(run, 'shortlist.json'), out);
  fs.writeFileSync(path.join(run, 'shortlist.csv'), csv(shortlist, ['id', 'name', 'seller', 'rating', 'ratings', 'price', 'genre', 'updated', 'released', 'topFreeRank', 'topGrossingRank', 'source']));
  console.log(JSON.stringify({ shortlist: shortlist.slice(0, top).map(s => ({ id: s.id, name: s.name, rating: s.rating, ratings: s.ratings, price: s.price, topFreeRank: s.topFreeRank, topGrossingRank: s.topGrossingRank, updated: s.updated, source: s.source, hits: s.hits })), totalCandidates: shortlist.length, file: path.join(run, 'shortlist.json') }, null, 1));
  return out;
}

async function cmdProfile(o, run) {
  const ccs = (o.country || 'us').split(',');
  const full = !!o['full-images'];
  const results = [];
  for (const input of o._) {
    const { id } = await resolve(input, ccs[0]);
    const base = await lookup(id, ccs[0]); if (!base) { log('not found', input); continue; }
    const dir = ensure(path.join(run, 'apps', `${slug(base.trackName)}-${id}`));
    const meta = {}; const page = {};
    for (const cc of ccs) {
      try { meta[cc] = await lookup(id, cc); } catch (e) { meta[cc] = { error: String(e) }; }
      try { page[cc] = await storePage(id, cc); } catch (e) { page[cc] = { error: String(e) }; }
    }
    writeJSON(path.join(dir, 'meta.json'), meta); writeJSON(path.join(dir, 'page.json'), page);
    // images
    const sdir = ensure(path.join(dir, 'screenshots'));
    const save = async (name, url) => { try { fs.writeFileSync(path.join(sdir, name), await http(url, { binary: true, label: 'image', ttl: 30 * 86400000 })); } catch (e) { log('image failed', name); } };
    await save('icon.png', base.artworkUrl512 || base.artworkUrl100);
    const size = full ? '0x0ss.png' : '392x696bb.jpg';
    let i = 0; for (const u of base.screenshotUrls || []) await save(`iphone-${String(++i).padStart(2, '0')}.${full ? 'png' : 'jpg'}`, u.replace(/\/[^/]+$/, '/' + size));
    i = 0; for (const u of base.ipadScreenshotUrls || []) await save(`ipad-${String(++i).padStart(2, '0')}.${full ? 'png' : 'jpg'}`, u.replace(/\/[^/]+$/, '/' + (full ? '0x0ss.png' : '576x768bb.jpg')));
    i = 0; for (const u of (page[ccs[0]].watchScreenshotUrls || []).slice(0, 10)) await save(`watch-${String(++i).padStart(2, '0')}.png`, u);
    try { const dev = await lookupDeveloper(base.artistId, ccs[0]); writeJSON(path.join(dir, 'developer-apps.json'), dev.map(a => ({ id: a.trackId, name: a.trackName, ratings: a.userRatingCount, rating: a.averageUserRating }))); } catch {}
    const p0 = page[ccs[0]];
    results.push({ id, name: base.trackName, url: base.trackViewUrl, subtitle: p0.subtitle || null, seller: base.sellerName, developer: base.artistName, price: base.formattedPrice, rating: +base.averageUserRating.toFixed(2), ratings: base.userRatingCount, histogram: p0.histogram, chart: p0.chart || null, inAppPurchases: p0.inAppPurchases || [], privacy: p0.privacy, version: base.version, updated: base.currentVersionReleaseDate.slice(0, 10), released: base.releaseDate.slice(0, 10), sizeMB: Math.round(base.fileSizeBytes / 1048576), minimumOs: base.minimumOsVersion, languages: base.languageCodesISO2A, genre: base.primaryGenreName, similar: (p0.similar || []).map(s => s.name), screenshots: fs.readdirSync(sdir).length, releaseNotes: base.releaseNotes, description: base.description, dir });
    log('profiled', base.trackName);
  }
  writeJSON(path.join(run, 'profiles.json'), results);
  console.log(JSON.stringify(results.map(({ description, releaseNotes, ...r }) => r), null, 1));
  return results;
}

async function cmdReviews(o, run) {
  const ccs = (o.country || 'us').split(',');
  const since = o.since || null;
  const summary = [];
  for (const input of o._) {
    const { id } = await resolve(input, ccs[0]);
    const base = await lookup(id, ccs[0]);
    const dir = ensure(path.join(run, 'apps', `${slug(base.trackName)}-${id}`));
    let all = []; const totals = {};
    for (const cc of ccs) {
      try { const { total, reviews } = await reviewsAll(id, cc); totals[cc] = { expected: total, fetched: reviews.length, route: 'legacy' }; all = all.concat(reviews); }
      catch (e) { log('legacy reviews failed', cc, String(e)); try { const r = await rssReviews(id, cc); totals[cc] = { expected: null, fetched: r.length, route: 'rss' }; all = all.concat(r); } catch (e2) { totals[cc] = { error: String(e2) }; } }
    }
    if (since) all = all.filter(r => r.date >= since);
    all.sort((a, b) => b.date.localeCompare(a.date));
    writeJSON(path.join(dir, 'reviews.json'), { app: base.trackName, id, totals, reviews: all });
    fs.writeFileSync(path.join(dir, 'reviews.csv'), csv(all, ['id', 'date', 'country', 'rating', 'title', 'body', 'author', 'edited', 'voteSum', 'voteCount', 'developerReply', 'developerReplyDate']));
    const cut = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const r90 = all.filter(r => r.date >= cut), neg90 = r90.filter(r => r.rating <= 2);
    const byStar = [1, 2, 3, 4, 5].reduce((m, s) => (m[s] = all.filter(r => r.rating === s).length, m), {});
    summary.push({ id, name: base.trackName, totals, reviews: all.length, byStar, last90: r90.length, negativeLast90: neg90.length, developerReplies: all.filter(r => r.developerReply).length, oldest: all.at(-1)?.date, newest: all[0]?.date, dir });
    log('reviews', base.trackName, all.length);
  }
  writeJSON(path.join(run, 'reviews-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 1));
  return summary;
}


// ---------- compare / keywords / aso / refresh ----------
const STOP = new Set('the and for with your you app apps from into that this are all any our its via per one new get pro plus free best top ios iphone ipad by of to in on at or an a is it be as up'.split(' '));
const shortName = n => String(n).replace(/\u00AD/g, '').replace(/[:–—-].*$/, '').trim() || n;
const tokenize = t => String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
const money = p => { const m = String(p || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : null; };
const loadRun = run => ({ profiles: readJSON(path.join(run, 'profiles.json')) || [], rsum: readJSON(path.join(run, 'reviews-summary.json')) || [], short: readJSON(path.join(run, 'shortlist.json')) });
const splitList = v => v ? String(v).split('|').map(x => x.trim()).filter(Boolean) : [];

function cmdCompare(o, run) {
  const { profiles, rsum } = loadRun(run);
  if (!profiles.length) throw new Error('nothing to compare: run profile first');
  const terms = splitList(o.terms);
  const cheapest = (iap, re) => iap.filter(i => re.test(i.name)).sort((a, b) => (money(a.price) ?? 1e9) - (money(b.price) ?? 1e9))[0] || null;
  const apps = profiles.map(p => {
    const r = rsum.find(x => x.id === p.id) || {};
    const iap = p.inAppPurchases || [];
    const priv = {}; for (const t of p.privacy || []) priv[t.type] = t.categories.length;
    const revs = (readJSON(path.join(p.dir, 'reviews.json')) || { reviews: [] }).reviews;
    const mentions = {};
    for (const t of terms) { const tl = t.toLowerCase(); const hit = revs.filter(x => (x.title + ' ' + x.body).toLowerCase().includes(tl)); mentions[t] = { reviews: hit.length, negative: hit.filter(x => x.rating <= 2).length, inDescription: (p.description || '').toLowerCase().includes(tl) }; }
    const monthly = cheapest(iap, /month/i), yearly = cheapest(iap, /year|annual/i), lifetime = cheapest(iap, /lifetime|forever|one.?time/i);
    return { id: p.id, name: p.name, short: shortName(p.name), url: p.url, rating: p.rating, ratings: p.ratings, chart: p.chart, price: p.price, iapCount: iap.length, iapCheapest: iap.length ? iap.slice().sort((a, b) => (money(a.price) ?? 1e9) - (money(b.price) ?? 1e9))[0].price : null, monthly: monthly && monthly.price, yearly: yearly && yearly.price, lifetime: lifetime && lifetime.price, released: p.released, updated: p.updated, version: p.version, sizeMB: p.sizeMB, minimumOs: p.minimumOs, languages: (p.languages || []).length, privacy: { tracking: priv['Data Used to Track You'] || 0, linked: priv['Data Linked to You'] || 0, notLinked: priv['Data Not Linked to You'] || 0, none: 'Data Not Collected' in priv }, reviews: r.reviews ?? null, last90: r.last90 ?? null, negativeLast90: r.negativeLast90 ?? null, negativePct: r.last90 ? Math.round(100 * r.negativeLast90 / r.last90) : null, replies: r.developerReplies ?? null, replyPct: r.reviews ? Math.round(100 * r.developerReplies / r.reviews) : null, mentions };
  });
  const out = { at: today(), terms, apps };
  writeJSON(path.join(run, 'compare.json'), out);
  const cols = ['name', 'rating', 'ratings', 'price', 'iapCount', 'iapCheapest', 'monthly', 'yearly', 'released', 'updated', 'sizeMB', 'languages', 'reviews', 'last90', 'negativePct', 'replyPct'];
  fs.writeFileSync(path.join(run, 'compare.csv'), csv(apps.map(a => ({ ...a, chart: a.chart ? a.chart.position : '' })), cols.concat(['chart'])));
  console.log(JSON.stringify(out, null, 1));
  return out;
}

async function cmdKeywords(o, run) {
  const cc = (o.country || 'us').split(',')[0];
  const { profiles, short } = loadRun(run);
  const terms = splitList(o.terms).length ? splitList(o.terms) : (short ? short.terms : []);
  if (!terms.length) throw new Error('give --terms "a|b|c"');
  const ids = new Set(profiles.map(p => p.id));
  const rows = [], others = {};
  for (const t of terms) {
    const r = await search(t, cc, 25);
    let auto = []; try { auto = await hints(t, cc); } catch {}
    r.slice(0, 10).forEach((a, i) => { if (!ids.has(a.trackId)) { const x = others[a.trackId] = others[a.trackId] || { id: a.trackId, name: a.trackName, url: a.trackViewUrl, ratings: a.userRatingCount, terms: [] }; x.terms.push(`${t} #${i + 1}`); } });
    rows.push({ term: t, results: r.length, positions: Object.fromEntries(profiles.map(p => [p.id, (r.findIndex(a => a.trackId === p.id) + 1) || null])), top: r.slice(0, 10).map((a, i) => ({ rank: i + 1, id: a.trackId, name: a.trackName, ratings: a.userRatingCount })), autocomplete: auto.slice(0, 10) });
    log(`keyword "${t}": ${r.length} results, ${auto.length} suggestions`);
  }
  const apps = profiles.map(p => ({ id: p.id, name: p.name, short: shortName(p.name), url: p.url, subtitle: p.subtitle || null, words: [...new Set(tokenize(p.name + ' ' + (p.subtitle || '')))] }));
  const out = { at: today(), country: cc, terms: rows, apps, others: Object.values(others).sort((a, b) => b.terms.length - a.terms.length || b.ratings - a.ratings).slice(0, 15) };
  writeJSON(path.join(run, 'keywords.json'), out);
  console.log(JSON.stringify({ grid: rows.map(r => ({ term: r.term, ...Object.fromEntries(apps.map(a => [a.short, r.positions[a.id]])), autocomplete: r.autocomplete.slice(0, 5) })), others: out.others.slice(0, 8).map(x => `${x.name} (${x.terms.join(', ')})`), file: path.join(run, 'keywords.json') }, null, 1));
  return out;
}

async function cmdASO(o, run) {
  const cc = (o.country || 'us').split(',')[0];
  if (!o._[0]) throw new Error('give your app: aso <link|id|name>');
  const { id } = await resolve(o._[0], cc);
  const base = await lookup(id, cc); if (!base) throw new Error('app not found');
  const page = await storePage(id, cc);
  const mine = { id, name: base.trackName, subtitle: page.subtitle || null, url: base.trackViewUrl, genre: base.primaryGenreName, rating: +base.averageUserRating.toFixed(2), ratings: base.userRatingCount, chart: page.chart || null };
  let comps = loadRun(run).profiles.filter(p => p.id !== id).map(p => ({ id: p.id, name: p.name, subtitle: p.subtitle || null, url: p.url, ratings: p.ratings }));
  for (const v of splitList(o.vs)) { const r = await resolve(v, cc); if (r.id === id) continue; const b = await lookup(r.id, cc); const pg = await storePage(r.id, cc); comps.push({ id: r.id, name: b.trackName, subtitle: pg.subtitle || null, url: b.trackViewUrl, ratings: b.userRatingCount }); }
  if (!comps.length) throw new Error('no competitors: profile some in this run or pass --vs "id|id"');
  const myWords = [...new Set(tokenize(mine.name + ' ' + (mine.subtitle || '')))];
  const freq = {}; for (const c of comps) for (const w of new Set(tokenize(c.name + ' ' + (c.subtitle || '')))) (freq[w] = freq[w] || { word: w, apps: [] }).apps.push(shortName(c.name));
  const competitorWords = Object.values(freq).sort((a, b) => b.apps.length - a.apps.length);
  const youLack = competitorWords.filter(x => !myWords.includes(x.word));
  const seeds = splitList(o.terms).length ? splitList(o.terms) : [...new Set(myWords.slice(0, 3).concat(youLack.slice(0, 3).map(x => x.word)))];
  const autocomplete = {}; for (const t of seeds) { try { autocomplete[t] = (await hints(t, cc)).slice(0, 10); } catch { autocomplete[t] = []; } }
  const checks = [...new Set(seeds.concat(Object.values(autocomplete).flat()))].slice(0, 25);
  const positions = {};
  for (const t of checks) { const r = await search(t, cc, 25); positions[t] = { you: (r.findIndex(a => a.trackId === id) + 1) || null, competitors: Object.fromEntries(comps.map(c => [shortName(c.name), (r.findIndex(a => a.trackId === c.id) + 1) || null])), top3: r.slice(0, 3).map(a => a.trackName) }; }
  const out = { at: today(), country: cc, app: { ...mine, titleChars: mine.name.length, subtitleChars: (mine.subtitle || '').length, limit: 30, words: myWords }, competitors: comps, competitorWords, youLack, autocomplete, positions };
  writeJSON(path.join(run, 'aso.json'), out);
  console.log(JSON.stringify(out, null, 1));
  return out;
}

async function cmdRefresh(o, run) {
  const { profiles, rsum } = loadRun(run);
  if (!profiles.length) throw new Error('nothing to refresh in this run');
  const hist = ensure(path.join(run, 'history')); const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.copyFileSync(path.join(run, 'profiles.json'), path.join(hist, `${stamp}-profiles.json`));
  if (fs.existsSync(path.join(run, 'reviews-summary.json'))) fs.copyFileSync(path.join(run, 'reviews-summary.json'), path.join(hist, `${stamp}-reviews-summary.json`));
  const ccs = o.country || Object.keys((rsum[0] || {}).totals || { us: 1 }).join(',');
  const ids = profiles.map(p => String(p.id));
  FRESH = true;
  const quiet = console.log; console.log = () => {};
  const newP = await cmdProfile({ ...o, _: ids, country: ccs }, run);
  const newR = o['no-reviews'] ? rsum : await cmdReviews({ ...o, _: ids, country: ccs }, run);
  console.log = quiet;
  const fields = [['rating', p => p.rating], ['ratings', p => p.ratings], ['price', p => p.price], ['chart', p => p.chart ? '#' + p.chart.position : null], ['version', p => p.version], ['updated', p => p.updated], ['inAppPurchases', p => (p.inAppPurchases || []).map(i => i.name + ' ' + i.price).join(', ')]];
  const apps = newP.map(n => {
    const b = profiles.find(p => p.id === n.id) || {}; const rb = rsum.find(r => r.id === n.id) || {}; const rn = newR.find(r => r.id === n.id) || {};
    const changes = fields.map(([f, g]) => ({ field: f, from: g(b), to: g(n) })).filter(c => JSON.stringify(c.from) !== JSON.stringify(c.to));
    return { id: n.id, name: n.name, changes, newReviews: (rn.reviews ?? 0) - (rb.reviews ?? 0), negativeLast90: rn.negativeLast90 ?? null };
  });
  const out = { at: new Date().toISOString(), previous: stamp, apps };
  writeJSON(path.join(run, 'changes.json'), out);
  const rp = require('./report.js').build(run);
  console.log(JSON.stringify({ ...out, report: rp.report }, null, 1));
  return out;
}

// ---------- report ----------
function cmdReport(o, run) { const r = require('./report.js').build(run); console.log(JSON.stringify(r)); }

function saveProvenance(run) {
  const agg = {};
  for (const p of prov) { const a = agg[p.label] = agg[p.label] || { label: p.label, calls: 0, cached: 0, failed: 0 }; a.calls++; if (p.status === 'cache') a.cached++; if (p.status === 'failed') a.failed++; }
  const prev = readJSON(path.join(run, 'provenance.json')) || [];
  for (const p of prev) { const a = agg[p.label] = agg[p.label] || { label: p.label, calls: 0, cached: 0, failed: 0 }; a.calls += p.calls; a.cached += p.cached; a.failed += p.failed; }
  writeJSON(path.join(run, 'provenance.json'), Object.values(agg));
  fs.appendFileSync(path.join(run, 'fetch-log.jsonl'), prov.map(p => JSON.stringify({ t: new Date().toISOString(), ...p })).join('\n') + (prov.length ? '\n' : ''));
}

const USAGE = `appstore.js — App Store research from Apple's public endpoints. Node 18+, no dependencies.

usage: node appstore.js <command> [inputs] [options]

commands
  run       --idea "text" --terms "a|b|c" [--must "w"] [--top 5]   find + profile + reviews + compare + keywords + report
  find      --terms "a|b|c" [--must "w"] [--exclude "x"]          shortlist candidates for an idea, with chart ranks
  profile   <link|id|name> ...                                    listing, IAPs, histogram, privacy, screenshots
  reviews   <link|id|name> ... [--since 2026-01-01]               every written review with developer replies
  compare   [--terms "withdraw|fees"]                             side by side table of the profiled apps
  keywords  [--terms "a|b"]                                       search position per term per app, autocomplete
  aso       <my link> [--vs "id|id"] [--terms "a|b"]              my title/subtitle words vs competitors, positions
  refresh                                                         refetch the run and list what changed
  report                                                          rebuild report.html
  hints     "<term>" ...                                          Apple search autocomplete

options
  --run <name>        run folder name (default: date + inputs)
  --country us,in     storefronts; the first is used for search and charts
  --pick id,id        which shortlist entries to profile in run
  --full-images       full-size screenshots

inputs accept an apps.apple.com link, a numeric id, or an app name.
data folder: {DATA}  (override with APPSTORE_DATA)
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = parseArgs(rest);
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { console.log(USAGE.replace('{DATA}', DATA)); return; }
  const runName = o.run || `${today()}-${slug(o.idea || o._.join(' ') || cmd)}`;
  const run = ensure(path.join(DATA, 'runs', runName));
  if (!fs.existsSync(path.join(run, 'run.json'))) writeJSON(path.join(run, 'run.json'), { created: new Date().toISOString(), title: o.title || o.idea || o._.join(' ') });
  try {
    if (cmd === 'find') await cmdFind(o, run);
    else if (cmd === 'profile') await cmdProfile(o, run);
    else if (cmd === 'reviews') await cmdReviews(o, run);
    else if (cmd === 'report') cmdReport(o, run);
    else if (cmd === 'compare') { cmdCompare(o, run); require('./report.js').build(run); }
    else if (cmd === 'keywords') { await cmdKeywords(o, run); require('./report.js').build(run); }
    else if (cmd === 'aso') await cmdASO(o, run);
    else if (cmd === 'refresh') await cmdRefresh(o, run);
    else if (cmd === 'hints') { for (const t of o._) console.log(JSON.stringify({ term: t, suggestions: await hints(t, (o.country || 'us').split(',')[0]) })); }
    else if (cmd === 'run') {
      const f = await cmdFind(o, run);
      const top = o.pick ? String(o.pick).split(',').map(s => s.trim()) : f.shortlist.slice(0, +(o.top || 5)).map(s => String(s.id));
      await cmdProfile({ ...o, _: top }, run);
      await cmdReviews({ ...o, _: top }, run);
      const quiet = console.log; console.log = () => {};
      try { if (top.length > 1) cmdCompare(o, run); await cmdKeywords({ ...o, terms: undefined }, run); } catch (e) { log('compare/keywords skipped:', e.message); }
      console.log = quiet;
      saveProvenance(run); cmdReport(o, run);
    }
    else { console.error('unknown command: ' + cmd + '\n'); console.log(USAGE.replace('{DATA}', DATA)); process.exit(2); }
    saveProvenance(run);
    log('run folder:', run);
  } catch (e) { saveProvenance(run); console.error('ERROR', e.message); process.exit(1); }
}
main();
