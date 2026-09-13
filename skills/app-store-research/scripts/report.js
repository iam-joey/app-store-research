'use strict';
// Builds report.html for a run folder. Design: docs/design-draft.html. Zero dependencies.
const fs = require('node:fs');
const path = require('node:path');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const readJSON = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
const num = n => (n == null ? '–' : Number(n).toLocaleString('en-US'));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dlong = d => { if (!d) return ''; const [y, m, dd] = d.slice(0, 10).split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
const dstamp = d => { const [y, m, dd] = d.slice(0, 10).split('-'); return `${+dd} ${['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][+m - 1]} ${y}`; };
const TONES = {"market": "blue", "profile": "amber", "pricing": "green", "compare": "blue", "insights": "rose", "explorer": "violet", "provenance": "grey"};
const icon = n => `<svg class="icon" aria-hidden="true"><use href="#icon-${n}"/></svg>`;
const SPRITE = `<svg class="sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><symbol id="icon-overview" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></symbol><symbol id="icon-apps" viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M10 18h4M9 6h6"/></symbol><symbol id="icon-pricing" viewBox="0 0 24 24"><path d="M12 3v18m5-14.5c-1-3-10-3-10 1.5s10 2 10 6.5-9 4.5-10 1.5"/></symbol><symbol id="icon-reviews" viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></symbol><symbol id="icon-insights" viewBox="0 0 24 24"><path d="M4 20V10m8 10V4m8 16v-7M2 20h20"/></symbol><symbol id="icon-source" viewBox="0 0 24 24"><path d="m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4Z"/><path d="m8 12 3 3 5-6"/></symbol><symbol id="icon-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></symbol><symbol id="icon-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></symbol><symbol id="icon-chevron" viewBox="0 0 24 24"><path d="m8 5 7 7-7 7"/></symbol><symbol id="icon-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol><symbol id="icon-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/></symbol><symbol id="icon-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></symbol><symbol id="icon-reply" viewBox="0 0 24 24"><path d="m9 5-6 6 6 6m-6-6h11a7 7 0 0 1 7 7v2"/></symbol><symbol id="icon-helpful" viewBox="0 0 24 24"><path d="M8 10 12 3c3 0 3 3 2 6h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H8V10ZM3 10h5v11H3Z"/></symbol><symbol id="icon-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></symbol><symbol id="icon-spark" viewBox="0 0 24 24"><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></symbol><symbol id="icon-external" viewBox="0 0 24 24"><path d="M14 4h6v6m0-6-9 9M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></symbol><symbol id="icon-compare" viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></symbol><symbol id="icon-keywords" viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/></symbol><symbol id="icon-market" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></symbol></svg>`;
const MARK = `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%2317191c%22/%3E%3Cpath%20d%3D%22M9%2024V8h7a5%205%200%200%201%200%2010H9m7%200%207%206%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E`;

function build(run) {
  const runMeta = readJSON(path.join(run, 'run.json')) || {};
  const short = readJSON(path.join(run, 'shortlist.json'));
  const profiles = readJSON(path.join(run, 'profiles.json')) || [];
  const rsum = readJSON(path.join(run, 'reviews-summary.json')) || [];
  const V = readJSON(path.join(run, 'verdicts.json')) || {};
  const provRows = readJSON(path.join(run, 'provenance.json')) || [];
  const cmp = readJSON(path.join(run, 'compare.json'));
  const changes = readJSON(path.join(run, 'changes.json'));
  const rel = p => path.relative(run, p).split(path.sep).join('/');
  const today = new Date().toISOString().slice(0, 10);
  const single = profiles.length === 1 && !short;
  const shortName = p => p.name.replace(/\u00AD/g, '').replace(/[:\u2013\u2014-].*$/, '').trim() || p.name;
  const storeUrl = (x, cc) => x.url || `https://apps.apple.com/${(cc || 'us').toLowerCase()}/app/id${x.id}`;
  const title = runMeta.title || short?.idea || (profiles[0] ? shortName(profiles[0]) : 'App research');

  // reviews
  const allReviews = []; const perApp = {};
  for (const p of profiles) { const rj = readJSON(path.join(p.dir, 'reviews.json')); if (!rj) continue; perApp[p.name] = rj; for (const r of rj.reviews) allReviews.push({ a: shortName(p), t: r.title, b: r.body, s: r.rating, d: r.date, c: r.country, e: r.edited ? 1 : 0, v: r.voteSum || 0, vc: r.voteCount || 0, dr: r.developerReply || undefined, dd: r.developerReplyDate || undefined }); }
  const countries = [...new Set(allReviews.map(r => r.c))];
  const cut = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  // ---- sections ----
  const sections = []; // {id, label, icon, html}
  const secTop = (i, h2, note) => `<div class="section-top"><div class="section-title"><span class="section-index">${String(i).padStart(2, '0')}</span><h2>${h2}</h2></div></div>`;
  const verdict = () => '';

  if (short) {
    const rowHtml = s => `<tr><td><a class="store-link" href="${esc(storeUrl(s, short.country))}" target="_blank" rel="noopener">${esc(s.name)}</a><span class="sub">${esc(s.seller)}</span></td><td>${s.rating}</td><td>${num(s.ratings)}</td><td style="text-align:left">${esc(s.price)}</td><td>${s.topFreeRank ? '#' + s.topFreeRank : '–'}</td><td>${s.topGrossingRank ? '#' + s.topGrossingRank : '–'}</td><td>${dlong(s.updated)}</td></tr>`;
    const top = short.shortlist.slice(0, 8), rest = short.shortlist.slice(8);
    const thead = `<thead><tr><th>APP</th><th>RATING</th><th>RATINGS</th><th style="text-align:left">PRICE</th><th>TOP FREE</th><th>GROSSING</th><th>UPDATED</th></tr></thead>`;
    sections.push({ id: 'market', label: 'Candidates', icon: 'market', h2: 'Candidates', html: (i) => secTop(i, 'Candidates', `${short.shortlist.length} candidates`) + verdict('market', `${short.shortlist.length} apps matched ${short.terms.length} search terms in the ${short.country.toUpperCase()} store.`) + `<div class="card table-wrap tw"><table class="stats-table shortlist-table">${thead}<tbody>${top.map(rowHtml).join('')}</tbody></table>${rest.length ? `<details class="extra inline"><summary>Show all ${short.shortlist.length} candidates ${icon('chevron')}</summary><table class="stats-table shortlist-table"><tbody>${rest.map(rowHtml).join('')}</tbody></table></details>` : ''}<div class="source-foot">Searched: ${short.terms.map(esc).join(' · ')}. Ranks are ${esc(short.shortlist[0]?.genre || 'category')} Top Free and Top Grossing.</div></div>` });
  }

  if (profiles.length) {
    const block = p => {
      const h = p.histogram || {}; const tot = Object.values(h).reduce((a, b) => a + b, 0) || 1;
      const sdir = path.join(p.dir, 'screenshots');
      const files = fs.existsSync(sdir) ? fs.readdirSync(sdir).filter(f => /^iphone-/.test(f)).sort() : [];
      const iconPath = fs.existsSync(path.join(sdir, 'icon.png')) ? rel(path.join(sdir, 'icon.png')) : null;
      const iap = p.inAppPurchases || [];
      const shown = files.slice(0, single ? 10 : 5);
      return `<div class="profile-block" id="app-${p.id}"><div class="profile-layout"><div class="card"><div class="profile-main"><div class="app-heading">${iconPath ? `<img class="app-icon" src="${iconPath}" alt="">` : `<div class="app-monogram">${esc(p.name[0])}</div>`}<div><div class="app-name"><a class="store-link" href="${esc(storeUrl(p))}" target="_blank" rel="noopener">${esc(p.name)} ${icon('external')}</a></div>${p.subtitle ? `<div class="app-subtitle">${esc(p.subtitle)}</div>` : ''}<div class="app-developer">by ${esc(p.developer)} · since ${p.released.slice(0, 4)}</div></div><span class="app-category">${esc(p.genre)}</span></div>
<div class="metrics"><div class="metric"><div class="metric-label">Rating</div><div class="metric-value">${Number(p.rating).toFixed(1)} <small>★</small></div><div class="metric-detail">${num(p.ratings)} ratings</div></div><div class="metric"><div class="metric-label">Chart</div><div class="metric-value">${p.chart ? '#' + p.chart.position : '–'}</div><div class="metric-detail">${p.chart ? esc(p.chart.category) : 'Not in top 200'}</div></div><div class="metric"><div class="metric-label">Price</div><div class="metric-value">${esc(p.price)}</div><div class="metric-detail">${iap.length ? 'from ' + esc(iap.map(i => i.price).sort()[0]) + ' in-app' : 'No IAP'}</div></div><div class="metric"><div class="metric-label">Updated</div><div class="metric-value" style="font-size:20px">${dlong(p.updated)}</div><div class="metric-detail">v${esc(p.version)}</div></div></div></div>
<div class="profile-bottom"><span>${p.sizeMB} MB · iOS ${esc(p.minimumOs)}+ · ${(p.languages || []).length} languages</span><a href="#details-${p.id}" onclick="document.getElementById('details-${p.id}').open=true">Details ${icon('arrow')}</a></div></div>
<div class="card rating-card"><div class="rating-heading"><span class="small-title">Rating distribution</span><span class="muted tiny">${num(Math.round(tot))}</span></div>${[5, 4, 3, 2, 1].map(st => `<div class="rating-row"><span>${st} ★</span><div class="rating-track"><div class="rating-fill" style="width:${(100 * (h[st] || 0) / tot).toFixed(2)}%"></div></div><span class="rating-num">${Math.round(100 * (h[st] || 0) / tot)}%</span></div>`).join('')}</div></div>
${shown.length ? `<div class="shots">${shown.map(f => `<a href="${rel(path.join(sdir, f))}" target="_blank" rel="noopener"><img src="${rel(path.join(sdir, f))}" alt="${esc(p.name)} screenshot" loading="lazy"></a>`).join('')}</div>` : ''}
<details class="extra" id="details-${p.id}"><summary>Description, what's new, privacy, similar apps${files.length > shown.length ? `, all ${files.length} screenshots` : ''} ${icon('chevron')}</summary><div class="extra-content">${files.length > shown.length ? `<div class="shots">${files.slice(shown.length).map(f => `<a href="${rel(path.join(sdir, f))}" target="_blank" rel="noopener"><img src="${rel(path.join(sdir, f))}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}<div class="details-grid"><div><h3>Description</h3><p>${esc(p.description)}</p></div><div>${p.releaseNotes ? `<h3>What's new in ${esc(p.version)}</h3><p>${esc(p.releaseNotes)}</p>` : ''}<h3>Privacy</h3><p>${(p.privacy || []).map(t => `${esc(t.type)}: ${t.categories.map(esc).join(', ') || 'none'}`).join('<br>')}</p><h3>Apple's "you might also like"</h3><p>${p.similar.map(esc).join(', ')}</p><h3>Seller</h3><p>${esc(p.seller)}</p></div></div></div></details></div>`;
    };
    const h2 = single ? 'The app' : 'Competitors';
    sections.push({ id: 'profile', label: single ? 'App profile' : 'Competitors', icon: 'apps', h2, html: (i) => secTop(i, h2, single ? 'The product at a glance' : `${profiles.length} apps profiled`) + verdict('competitors', profiles.map(p => `${shortName(p)}: ${p.rating}★ from ${num(p.ratings)} ratings${p.chart ? ', #' + p.chart.position + ' in ' + p.chart.category : ''}`).join('. ') + '.') + profiles.map(block).join('') });

    // money: one table
    const moneyRows = profiles.map(p => { const iap = p.inAppPurchases || []; return `<tr><td><a class="store-link" href="${esc(storeUrl(p))}" target="_blank" rel="noopener">${esc(shortName(p))}</a></td><td style="text-align:left">${esc(p.price)}</td><td style="text-align:left">${iap.length ? iap.slice(0, 3).map(i => `${esc(i.name)} <b>${esc(i.price)}</b>`).join('<br>') + (iap.length > 3 ? `<span class="sub">+${iap.length - 3} more</span>` : '') : '<span class="muted">none listed · charges outside the App Store, if any</span>'}</td></tr>`; }).join('');
    sections.push({ id: 'pricing', label: 'Pricing', icon: 'pricing', h2: 'Pricing', html: (i) => secTop(i, 'Pricing') + verdict('money', profiles.map(p => `${shortName(p)}: ${p.price}${(p.inAppPurchases || []).length ? ', in-app from ' + p.inAppPurchases.map(i => i.price).sort()[0] : ', no in-app purchases'}`).join('. ') + '.') + `<div class="card table-wrap tw"><table class="stats-table money-table"><thead><tr><th>APP</th><th style="text-align:left">DOWNLOAD</th><th style="text-align:left">IN-APP PURCHASES</th></tr></thead><tbody>${moneyRows}</tbody></table></div>` });
  }


  if (cmp && cmp.apps.length > 1) {
    const A = cmp.apps;
    const link = a => `<a class="store-link" href="${esc(a.url || '')}" target="_blank" rel="noopener">${esc(a.short)}</a>`;
    const row = (label, f, opt = {}) => `<tr><td>${label}</td>${A.map(a => { const v = f(a); return `<td${opt.left ? ' style="text-align:left"' : ''}>${v == null || v === '' ? '<span class="muted">–</span>' : v}</td>`; }).join('')}</tr>`;
    const group = t => `<tr class="group-row"><td colspan="${A.length + 1}">${t}</td></tr>`;
    const rows = [
      group('Listing'),
      row('Rating', a => `${Number(a.rating).toFixed(1)} ★`), row('Ratings', a => num(a.ratings)), row('Chart', a => a.chart ? `#${a.chart.position} <span class="sub">${esc(a.chart.category)}</span>` : null),
      row('Released', a => dlong(a.released)), row('Last update', a => `${dlong(a.updated)} <span class="sub">v${esc(a.version)}</span>`), row('Size', a => a.sizeMB + ' MB'), row('Languages', a => a.languages),
      group('Pricing'),
      row('Download', a => esc(a.price)), row('In-app purchases', a => a.iapCount || null), row('Cheapest in-app', a => esc(a.iapCheapest)), row('Monthly plan', a => esc(a.monthly)), row('Yearly plan', a => esc(a.yearly)), row('Lifetime', a => esc(a.lifetime)),
      group('Privacy label'),
      row('Data used to track you', a => a.privacy.none ? 'none collected' : a.privacy.tracking + ' categories'), row('Data linked to you', a => a.privacy.none ? 'none collected' : a.privacy.linked + ' categories'),
      group('Reviews'),
      row('Written reviews', a => num(a.reviews)), row('Last 90 days', a => num(a.last90)), row('Negative, last 90 days', a => a.negativePct == null ? null : `<span style="color:var(--red)">${num(a.negativeLast90)} · ${a.negativePct}%</span>`), row('Developer replies', a => a.replyPct == null ? null : `${num(a.replies)} · ${a.replyPct}%`),
      ...(cmp.terms.length ? [group('Reviews mentioning'), ...cmp.terms.map(t => row(`“${esc(t)}”`, a => { const m = a.mentions[t]; return m ? `${num(m.reviews)}${m.negative ? ` <span class="sub">${m.negative} negative</span>` : ''}${m.inDescription ? ' <span class="coverage-tag">in description</span>' : ''}` : null; }))] : [])
    ];
    sections.push({ id: 'compare', label: 'Side by side', icon: 'compare', h2: 'Side by side', html: (i) => secTop(i, 'Side by side') + `<div class="card table-wrap tw"><table class="stats-table compare-table"><thead><tr><th></th>${A.map(a => `<th>${link(a)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>${cmp.terms.length ? `<div class="source-foot">Mentions count reviews whose title or text contains the word. Type the same word in the reviews search below to read them.</div>` : ''}</div>` });
  }


  if (rsum.length) {
    const cols = rsum.map(r => { const p = profiles.find(p => p.id === r.id); return p ? shortName(p) : r.name; });
    const row = (label, f, cls = '') => `<tr><td>${label}</td>${rsum.map(r => `<td${cls ? ` style="${cls}"` : ''}>${f(r)}</td>`).join('')}</tr>`;
    const pct = r => r.last90 ? Math.round(100 * r.negativeLast90 / r.last90) + '%' : '–';
    const table = `<div class="card table-wrap tw"><table class="stats-table"><thead><tr><th>REVIEW SIGNAL</th>${cols.map(c => `<th>${esc(c).toUpperCase()}</th>`).join('')}</tr></thead><tbody>${row('Written reviews, all time', r => num(r.reviews))}${row('Reviews in the last 90 days', r => num(r.last90))}${row('Negative in the last 90 days <span class="tiny muted">(1–2★)</span>', r => `${num(r.negativeLast90)} · ${pct(r)}`, 'color:var(--red)')}${row('Reviews with a developer reply', r => num(r.developerReplies))}${row('Coverage', r => Object.entries(r.totals).map(([cc, t]) => `<span class="coverage-tag">${t.fetched === t.expected ? icon('check') : ''} ${cc.toUpperCase()} ${num(t.fetched)} of ${num(t.expected ?? t.fetched)}</span>`).join(' '))}</tbody></table></div>`;
    // highlighted review: most recent negative with a body over 80 chars in the last 90 days, prefer helpful votes
    const cand = allReviews.filter(r => r.s <= 2 && r.d >= cut && r.b.length > 80).sort((a, b) => (b.v - a.v) || b.d.localeCompare(a.d))[0] || allReviews.filter(r => r.s <= 3).sort((a, b) => b.d.localeCompare(a.d))[0];
    const note = cand ? `<aside class="insight-note">${icon('reviews')}<h3>“${esc(cand.t)}”</h3><p>${esc(cand.b.length > 260 ? cand.b.slice(0, 260).replace(/\s\S*$/, '') + '…' : cand.b)}</p><span class="quote-source">${cand.s}-STAR REVIEW · ${esc(cand.a).toUpperCase()} · ${dlong(cand.d).toUpperCase()}${cand.v ? ' · ' + cand.v + ' FOUND IT HELPFUL' : ''}</span></aside>` : '';
    sections.push({ id: 'insights', label: 'Review signals', icon: 'insights', h2: 'Review signals', html: (i) => secTop(i, 'Review signals', 'Written reviews only') + verdict('failing', rsum.map((r, k) => `${cols[k]}: ${num(r.negativeLast90)} of ${num(r.last90)} reviews in the last 90 days are 1 or 2 stars`).join('. ') + '.') + `<div class="insights-layout">${table}${note}</div>` });
  }

  if (allReviews.length) {
    const apps = [...new Set(allReviews.map(r => r.a))];
    sections.push({ id: 'explorer', label: 'Reviews', icon: 'reviews', h2: 'Reviews', html: (i) => secTop(i, 'Reviews', 'Go straight to the source') + verdict('reviews', `${num(allReviews.length)} reviews from ${countries.join(', ')}. Search any word. Developer replies are searched too.`) + `<div class="card explorer"><div class="explorer-top"><div class="search-box">${icon('search')}<input id="search" type="search" placeholder="Search reviews or developer replies…" aria-label="Search reviews"></div><select id="sort" class="sort" aria-label="Sort reviews"><option value="recent">Most recent</option><option value="oldest">Oldest first</option><option value="helpful">Most helpful</option><option value="low">Lowest stars</option><option value="high">Highest stars</option></select></div><div class="filters"><div id="apps" style="display:contents"></div><span class="filter-divider"></span><button type="button" class="chip preset" data-preset="loved">Loved <span class="count"></span></button><button type="button" class="chip preset" data-preset="complaints">Complaints <span class="count"></span></button><span class="filter-divider"></span><div id="stars" style="display:contents"></div>${countries.length > 1 ? `<span class="filter-divider"></span><div id="ccs" style="display:contents"></div>` : ''}<label class="reply-toggle"><input type="checkbox" id="has-reply">Has developer reply</label><button type="button" id="clear" class="clear">Clear</button></div><div class="result-line"><span id="result-count" role="status" aria-live="polite"></span><span>${num(allReviews.length)} reviews · ${apps.length} app${apps.length > 1 ? 's' : ''} · ${countries.join(', ')}</span></div><div id="review-list"></div><button type="button" id="more" class="more" hidden>Show 50 more</button></div><div class="scope-foot">${icon('info')} Review text as Apple returned it. Reviewer names omitted.</div>` });
  }

  const failed = provRows.reduce((a, p) => a + p.failed, 0), calls = provRows.reduce((a, p) => a + p.calls, 0);
  const provLine = `<div class="card"><p class="prov-line">Fetched from Apple's public App Store endpoints on ${dlong(today)}: ${num(calls)} requests across ${provRows.length} endpoints, ${failed} failed. Apple does not publish downloads, revenue, or retention, so this page has none.</p><details class="extra inline"><summary>Endpoint table ${icon('chevron')}</summary><table class="stats-table source-table"><thead><tr><th>SOURCE</th><th>CALLS</th><th>CACHED</th><th>FAILED</th></tr></thead><tbody>${provRows.map(p => `<tr><td>${esc(p.label)}</td><td>${p.calls}</td><td>${p.cached}</td><td${p.failed ? ' style="color:var(--red)"' : ''}>${p.failed}</td></tr>`).join('')}</tbody></table>${allReviews.length ? `<div class="source-foot">Review range ${dlong(allReviews.map(r => r.d).sort()[0])} – ${dlong(allReviews.map(r => r.d).sort().at(-1))} · route: ${[...new Set(rsum.flatMap(r => Object.values(r.totals).map(t => t.route)))].join(', ')}</div>` : ''}</details></div>`;
  sections.push({ id: 'provenance', label: 'Data sources', icon: 'source', h2: 'Data sources', html: (i) => secTop(i, 'Data sources') + provLine });

  // ---- overview ----
  const takeaway = '';
  const h1 = single ? esc(profiles[0].name) : `Competitors for <em>${esc(title)}</em>`;
  const intro = single ? 'The product, the pricing, and what people really think.' : `${profiles.length} competitors, their pricing, and what their users say.`;
  const nav = sections.map((s, i) => `<a href="#${s.id}" class="nav-link" data-tone="${TONES[s.id] || 'grey'}">${icon(s.icon)}<span>${esc(s.label)}</span><span class="nav-no">${String(i + 1).padStart(2, '0')}</span></a>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)} — App Store Research</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap">
<style>${fs.readFileSync(path.join(__dirname, 'report.css'), 'utf8')}</style></head>
<body>${SPRITE}
<aside class="sidebar"><a class="brand" href="#overview"><img src="${MARK}" alt=""><span class="brand-name">App Store<br><em>Research</em></span></a><p class="brand-caption">${esc(title)}</p><div class="nav-label">THIS REPORT</div><nav aria-label="Report sections"><a href="#overview" class="nav-link selected">${icon('overview')}<span>Overview</span><span class="nav-no">—</span></a>${nav}</nav><div class="side-bottom"><div class="side-version"><span>RUN</span><span>${esc(path.basename(run))}</span></div></div></aside>
<div class="main">
<main class="page"><section id="overview"><div class="eyebrow">${icon('overview')} ${single ? 'APP REPORT' : 'IDEA REPORT'}</div><div class="heading-row"><div><h1>${h1}</h1></div></div><div class="meta"><span>${icon('calendar')} ${dlong(today)}</span><span>${icon('globe')} ${countries.map(c => ({ US: 'United States', IN: 'India', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France', JP: 'Japan' })[c] || c).join(', ') || 'United States'}</span><span>${icon('reviews')} ${num(allReviews.length)} written reviews</span>${profiles.length > 1 ? `<span>${icon('apps')} ${profiles.length} apps</span>` : ''}${changes ? `<span>${icon('spark')} refreshed ${dlong(changes.at)} · ${changes.apps.reduce((a, x) => a + x.changes.length, 0)} changes, ${num(changes.apps.reduce((a, x) => a + Math.max(0, x.newReviews), 0))} new reviews</span>` : ''}</div></section>
${sections.map((s, i) => `<section class="section" id="${s.id}" data-tone="${TONES[s.id] || 'grey'}">${s.html(i + 1)}</section>`).join('\n')}
<footer class="footer"><a href="#overview" class="footer-brand"><img src="${MARK}" alt="">App Store Research</a><span>Generated by the appstore skill · ${esc(path.basename(run))}</span></footer></main></div>
${allReviews.length ? `<script>const reviews=${JSON.stringify(allReviews).replace(/</g, '\\u003c')};${EXPLORER_JS}</script>` : ''}
</body></html>`;
  fs.writeFileSync(path.join(run, 'report.html'), html);
  return { report: path.join(run, 'report.html'), reviews: allReviews.length, profiles: profiles.length, sections: sections.map(s => s.id) };
}

const EXPLORER_JS = `
const state={apps:new Set(),stars:new Set(),ccs:new Set(),limit:20};
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hl(v){const t=String(v??''),q=el('search').value.trim();if(!q)return esc(t);let out='',s=0,i;const lt=t.toLowerCase(),lq=q.toLowerCase();while((i=lt.indexOf(lq,s))!==-1){out+=esc(t.slice(s,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>';s=i+q.length;}return out+esc(t.slice(s));}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dl(d){if(!d)return '';const [y,m,dd]=d.split('-');return (+dd)+' '+MON[+m-1]+' '+y;}
function svg(n){return '<svg class="icon" aria-hidden="true"><use href="#icon-'+n+'"/></svg>';}
const APPS=[...new Set(reviews.map(r=>r.a))],CCS=[...new Set(reviews.map(r=>r.c))];
function chips(id,items,set,label){const box=el(id);if(!box)return;box.innerHTML='';for(const it of items){const b=document.createElement('button');b.type='button';b.className='chip';b.setAttribute('aria-pressed',set.has(it));b.innerHTML=esc(label(it))+' <span class="count"></span>';b.onclick=()=>{set.has(it)?set.delete(it):set.add(it);state.limit=20;render();};box.append(b);}}
function base(){return reviews.filter(r=>(!state.apps.size||state.apps.has(r.a))&&(!state.ccs.size||state.ccs.has(r.c)));}
function render(){const q=el('search').value.trim().toLowerCase();const b=base();let f=b.filter(r=>(!state.stars.size||state.stars.has(r.s))&&(!el('has-reply').checked||r.dr)&&(!q||[r.t,r.b,r.dr].some(t=>String(t||'').toLowerCase().includes(q))));const sort=el('sort').value;f.sort((x,y)=>sort==='oldest'?x.d.localeCompare(y.d):sort==='helpful'?(y.v-x.v)||y.d.localeCompare(x.d):sort==='low'?(x.s-y.s)||y.d.localeCompare(x.d):sort==='high'?(y.s-x.s)||y.d.localeCompare(x.d):y.d.localeCompare(x.d));
el('result-count').innerHTML='<strong>'+f.length.toLocaleString()+' of '+reviews.length.toLocaleString()+' reviews</strong>'+(q?' matching “'+esc(el('search').value.trim())+'”':'');
el('review-list').innerHTML=f.length?f.slice(0,state.limit).map(r=>'<article class="review"><div class="review-meta"><span class="star-band '+(r.s<3?'negative':r.s===3?'middle':'')+'" aria-label="'+r.s+' out of 5 stars">'+'★'.repeat(r.s)+'<span style="opacity:.25">'+'★'.repeat(5-r.s)+'</span></span><span>'+esc(r.a)+'</span><span>·</span><span>'+esc(r.c)+'</span>'+(r.e?'<span>· Edited</span>':'')+'<time class="review-date" datetime="'+esc(r.d)+'">'+dl(r.d)+'</time></div><h3>'+hl(r.t)+'</h3><p class="review-body">'+hl(r.b)+'</p>'+(r.dr?'<div class="developer-reply"><div class="reply-head">'+svg('reply')+'<strong>Developer response</strong><span>· '+dl(r.dd)+'</span></div><p>'+hl(r.dr)+'</p></div>':'')+(r.vc?'<div class="helpful">'+svg('helpful')+r.v+' helpful · '+r.vc+' vote'+(r.vc===1?'':'s')+'</div>':'')+'</article>').join(''):'<div class="empty">'+svg('search')+'<strong>No reviews found</strong>Try another search or clear your filters.</div>';
el('more').hidden=f.length<=state.limit;el('more').textContent='Show 50 more · '+(f.length-state.limit).toLocaleString()+' left';
chips('apps',APPS,state.apps,a=>a);chips('stars',[5,4,3,2,1],state.stars,s=>s+' ★');chips('ccs',CCS,state.ccs,c=>c);
document.querySelectorAll('#apps .chip').forEach((c,i)=>c.querySelector('.count').textContent=reviews.filter(r=>r.a===APPS[i]&&(!state.ccs.size||state.ccs.has(r.c))).length.toLocaleString());
document.querySelectorAll('#stars .chip').forEach((c,i)=>c.querySelector('.count').textContent=b.filter(r=>r.s===5-i).length.toLocaleString());
document.querySelectorAll('.preset').forEach(c=>{const p=c.dataset.preset;const on=p==='loved'?(state.stars.size===2&&state.stars.has(4)&&state.stars.has(5)):(state.stars.size===2&&state.stars.has(1)&&state.stars.has(2));c.setAttribute('aria-pressed',on);c.querySelector('.count').textContent=b.filter(r=>p==='loved'?r.s>=4:r.s<=2).length.toLocaleString();});
document.querySelectorAll('#ccs .chip').forEach((c,i)=>c.querySelector('.count').textContent=reviews.filter(r=>r.c===CCS[i]&&(!state.apps.size||state.apps.has(r.a))).length.toLocaleString());}
el('search').addEventListener('input',()=>{state.limit=20;render();});el('sort').addEventListener('change',render);el('has-reply').addEventListener('change',()=>{state.limit=20;render();});
el('clear').addEventListener('click',()=>{state.apps.clear();state.stars.clear();state.ccs.clear();state.limit=20;el('search').value='';el('has-reply').checked=false;el('sort').value='recent';render();});
el('more').addEventListener('click',()=>{state.limit+=50;render();});
document.querySelectorAll('.preset').forEach(c=>c.addEventListener('click',()=>{const p=c.dataset.preset;const want=p==='loved'?[4,5]:[1,2];const on=c.getAttribute('aria-pressed')==='true';state.stars.clear();if(!on)want.forEach(s=>state.stars.add(s));state.limit=20;render();}));
const links=[...document.querySelectorAll('.nav-link')];const secs=links.map(l=>document.querySelector(l.getAttribute('href'))).filter(Boolean);
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('selected',l.getAttribute('href')==='#'+e.target.id));}});},{rootMargin:'-30% 0px -60% 0px'});secs.forEach(s=>io.observe(s));
render();`;

module.exports = { build };
