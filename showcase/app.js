/* TTG showcase v5. One app, two data modes:
   LIVE: real TTG Ops data, fetched at runtime from the TTG Ops API with the key saved on this device (same key and
         same bootstrap call as /platform/). Held in memory only; never written to storage. No key, no data.
   DEMO: fictional data from data.js, reached with ?demo. Never calls the API.
   Routes (hash): #/ #/students #/providers #/alerts[/GROUP] #/students/ID[/services|/records|/notes] #/students/ID/doc/N
   #/providers/ID[/students|/schedule|/notes] */
(function () {
  'use strict';
  var MODE = /(^|[?&])demo(=|&|$)/.test(location.search.slice(1)) ? 'demo' : 'live';
  var M = null, view = document.getElementById('view');
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WDF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DORD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DOT = '<span class="dot"> \u00b7 </span>';
  var NOF = '<span class="nof">Not on file</span>';

  /* ---------- formatting (one format for each kind of value, used everywhere) ---------- */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fd(iso) { if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return esc(iso || ''); return MON[+iso.slice(5, 7) - 1] + ' ' + (+iso.slice(8, 10)) + ', ' + iso.slice(0, 4); }
  function t(v) { return esc(String(v == null ? '' : v).replace(/\s*[\u2013\u2014]\s*/g, ' - ')).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, function (m) { return fd(m); }); }
  function hrs(x) { return (Math.round(x * 100) / 100).toString(); }
  function hw(x) { return x == null ? '' : hrs(x) + '&nbsp;hrs/wk'; }
  function age(a) { return a == null ? '' : 'Age ' + a; }
  function days(a, b) { return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5); }
  function addD(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function plural(n, w, ws) { return n + ' ' + (n === 1 ? w : (ws || w + 's')); }
  function hm(m) { var h = Math.floor(m / 60) % 12 || 12, mm = m % 60; return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : ''); }
  function rng(s, e) { var a = s < 720 ? 'am' : 'pm', b = (e % 1440) < 720 ? 'am' : 'pm'; return hm(s) + (a === b ? '' : a) + '-' + hm(e) + b; }
  function nm(o) { return '<span class="nm">' + esc(o.first) + (o.last ? ' <span class="ln">' + esc(o.last) + '</span>' : '') + '</span>'; }
  function ini(o) { return ((o.first || '?')[0] + (o.last ? o.last[0] : (o.first[1] || ''))).toUpperCase(); }
  var AVC = ['#9a3412', '#b45309', '#c2410c', '#a16207', '#7c2d12', '#be123c', '#92400e', '#9f1239'];
  function av(o, c) { var h = 0; String(o.name).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; }); return '<span class="av ' + (c || '') + '" style="background:' + AVC[h % AVC.length] + '">' + esc(ini(o)) + '</span>'; }
  function pill(x, k) { return '<span class="pill ' + (k || '') + '">' + esc(x) + '</span>'; }
  function stp(st) { return pill(st, /^(Received|Signed|Approved|Complete|Active|Cleared|Held)$/.test(st) ? 'ok' : /^(Requested|Awaiting signature|Pending|Partial|Received, incomplete)$/.test(st) ? 'warn' : /^(Not received|Unstaffed)$/.test(st) ? 'bad' : /^(Draft|In progress|Upcoming|Scheduled)$/.test(st) ? 'acc' : ''); }
  function Jw(a) { return a.filter(function (x) { return x !== '' && x != null; }).join(DOT); }
  function I(k) { var P = { chev: '<path d="m9 6 6 6-6 6"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>' }; return '<svg class="i i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + P[k] + '</svg>'; }
  /* key/value rows. Empty values show "Not on file" unless the row is marked optional (4th item). */
  function kv(rows) { return '<dl class="kv">' + rows.filter(function (r) { return r && !(r[3] && (r[1] === '' || r[1] == null)); }).map(function (r) { var v = r[1]; return '<div><dt>' + esc(r[0]) + '</dt><dd>' + (v === '' || v == null ? NOF : r[2] ? v : t(v)) + '</dd></div>'; }).join('') + '</dl>'; }
  function tel(p) { return p ? '<a class="lnk" href="tel:' + String(p).replace(/[^\d+]/g, '') + '">' + esc(p) + '</a>' : ''; }
  function mail(e) { return e ? '<a class="lnk" href="mailto:' + esc(e) + '">' + esc(e) + '</a>' : ''; }
  function sec(id, title, meta, body) { return '<section class="card" id="' + id + '"><div class="ch"><h2>' + esc(title) + '</h2>' + (meta ? '<span class="cm">' + meta + '</span>' : '') + '</div>' + body + '</section>'; }
  function empty(txt) { return '<p class="empty">' + esc(txt) + '</p>'; }
  function row(href, lead, title, right, line, extra, cls) {
    var tag = href ? 'a' : 'div';
    return '<' + tag + ' class="row' + (cls ? ' ' + cls : '') + (href ? '' : ' static') + '"' + (href ? ' href="' + href + '"' : '') + '>' + (lead || '') + '<span class="rm"><span class="r1"><b>' + title + '</b>' + (right || '') + '</span>' + (line ? '<span class="r2">' + line + '</span>' : '') + (extra || '') + '</span>' + (href ? I('chev') : '') + '</' + tag + '>';
  }
  function rr(x, cls) { return '<span class="rr' + (cls ? ' ' + cls : '') + '">' + x + '</span>'; }
  /* tags and chips never wrap: show the first few, then +N */
  function tags(list, max) { max = max || 3; var a = list.slice(0, list.length > max ? max - 1 : max); return '<span class="tags">' + a.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + (list.length > a.length ? '<span class="tag more">+' + (list.length - a.length) + '</span>' : '') + '</span>'; }
  function chips(fl, max) { max = max || 3; if (!fl.length) return '<span class="chips"><span class="okline">No open alerts</span></span>'; var a = fl.slice(0, fl.length > max ? max - 1 : max); return '<span class="chips">' + a.map(function (x) { return pill(x.label, x.cls); }).join('') + (fl.length > a.length ? pill('+' + (fl.length - a.length), 'n') : '') + '</span>'; }
  function allChips(fl) { return fl.length ? '<span class="chips wrap">' + fl.map(function (x) { return pill(x.label, x.cls); }).join('') + '</span>' : ''; }
  function byName(a, b) { return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0; }

  /* ---------- lookups ---------- */
  var SM = {}, PM = {};
  function stu(id) { return SM[id]; }
  function prv(id) { return PM[id]; }
  function svcs(s) { var o = []; s.lines.forEach(function (l) { if (o.indexOf(l.svc) < 0) o.push(l.svc); }); return o.sort(SCM.svcSort); }
  function role(p) { return p.title || p.roles.join(', '); }

  /* ---------- alerts: one list, ranked by urgency ---------- */
  /* group: [key, title, short label for chips, severity rank (lower = more urgent), applies to] */
  var GROUPS = [
    ['unstaffed', 'Unstaffed services', 'Unstaffed', 1], ['red', 'Red health flags', 'Red flag', 2], ['banks', 'Low hour banks', 'Low hours', 2],
    ['nobcba', 'No BCBA on file', 'No BCBA', 3], ['notes', 'Unsigned session notes', 'Unsigned note', 3], ['pets', 'PETS pending', 'PETS pending', 3],
    ['license', 'License renewals', 'Renewal due', 4], ['docs', 'Documents pending', 'Docs open', 4], ['intake', 'Intake papers open', 'Intake open', 5],
    ['pintake', 'Provider papers open', 'Papers open', 5], ['board', 'Not on case board', 'Not on board', 6], ['dates', 'Upcoming dates', 'Date soon', 7]];
  var GI = {}; GROUPS.forEach(function (g, i) { GI[g[0]] = { i: i, title: g[1], label: g[2], rank: g[3] }; });
  var CLS = { 1: 'bad', 2: 'bad', 3: 'warn', 4: 'warn', 5: 'acc', 6: 'acc', 7: 'n' };
  var AL = null;
  function alerts() {
    if (AL) return AL;
    var L = [], today = M.today;
    function add(g, o) { o.g = g; o.rank = GI[g].rank; L.push(o); }
    M.students.forEach(function (s) {
      s.lines.forEach(function (l) { if (l.status === 'Unstaffed') add('unstaffed', { s: s, href: '#/students/' + s.id + '/services', title: s, text: Jw([esc(l.svc) + ' open', l.since ? 'since ' + fd(l.since) : '']), right: l.days != null ? plural(l.days, 'day') : '', sort: -(l.days || 0) }); });
      if (s.health) { var reds = ['relationship', 'service', 'clinical', 'billing'].filter(function (k) { return s.health[k] === 'red'; }); if (reds.length) add('red', { s: s, href: '#/students/' + s.id, title: s, text: Jw([reds.map(function (k) { return k[0].toUpperCase() + k.slice(1); }).join(', '), esc(s.why || '')]), right: '', sort: -reds.length }); }
      s.banks.forEach(function (b) { var rem = b.auth - b.used; if (b.auth && rem / b.auth < 0.2) add('banks', { s: s, href: '#/students/' + s.id + '/services', title: s, text: Jw([esc(b.svc), esc(b.caseNo)]), right: hrs(rem) + ' of ' + hrs(b.auth) + ' hrs left', sort: rem / b.auth }); });
      if (M.mode === 'live' && s.lines.some(function (l) { return l.svc === 'ABA' && l.status !== 'Unstaffed'; }) && !s.lines.some(function (l) { return l.svc === 'BCBA' && l.status !== 'Unstaffed'; })) add('nobcba', { s: s, href: '#/students/' + s.id, title: s, text: 'ABA with no supervising BCBA', right: '', sort: 0 });
      if (s.docs) s.docs.forEach(function (d) { if (/^(Requested|Awaiting signature)$/.test(d.status)) add('docs', { s: s, href: '#/students/' + s.id + '/doc/' + d.id, title: s, text: esc(d.name), right: '', chip: stp(d.status), sort: 0 }); });
      if (s.checklist) { var open = s.checklist.filter(function (c) { return !c.done; }); if (open.length) add('intake', { s: s, href: '#/students/' + s.id + '/records', title: s, text: esc(open.map(function (c) { return c.item; }).join(', ')), right: plural(open.length, 'item'), sort: -open.length }); }
      if (s.intake && s.intake.status && !/^received$/i.test(s.intake.status)) add('intake', { s: s, href: '#/students/' + s.id + '/records', title: s, text: esc(s.intake.missing || 'Intake papers'), chip: stp(s.intake.status), sort: /not/i.test(s.intake.status) ? -1 : 0 });
      s.dates.forEach(function (h) { if (h.date > today && h.date <= addD(today, 60)) add('dates', { s: s, href: '#/students/' + s.id, title: s, text: Jw([esc(h.what), WDF[new Date(h.date + 'T12:00:00Z').getUTCDay()].slice(0, 3)]), date: h.date, right: fd(h.date), sort: days(today, h.date) }); });
    });
    M.providers.forEach(function (p) {
      if (p.pets && p.pets.status !== 'Cleared') add('pets', { p: p, href: '#/providers/' + p.id, title: p, text: Jw([esc(role(p)), p.pets.submitted ? 'submitted ' + fd(p.pets.submitted) : '']), sort: 0 });
      if (p.licExp && p.licExp <= addD(today, 90)) add('license', { p: p, href: '#/providers/' + p.id, title: p, text: Jw([esc(p.license), 'expires ' + fd(p.licExp)]), right: plural(days(today, p.licExp), 'day'), sort: days(today, p.licExp) });
      if (p.sessionNotes) p.sessionNotes.forEach(function (n) { if (!n.signed) add('notes', { p: p, href: '#/providers/' + p.id + '/notes', title: p, text: Jw([esc(stu(n.sid) ? stu(n.sid).name : ''), esc(n.svc), fd(n.date)]), sort: n.date }); });
      if (p.intake && p.intake.status && !/^received$/i.test(p.intake.status)) add('pintake', { p: p, href: '#/providers/' + p.id, title: p, text: esc(p.intake.missing || 'Provider papers'), chip: stp(p.intake.status), sort: /not/i.test(p.intake.status) ? -1 : 0 });
    });
    (M.other || []).forEach(function (o) { add('board', { o: o, href: '', title: o, text: Jw([esc(o.status), esc(o.received)]), sort: 0 }); });
    L.sort(function (a, b) { return a.rank - b.rank || GI[a.g].i - GI[b.g].i || (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0) || byName(a.title, b.title); });
    AL = { list: L, open: L.filter(function (a) { return a.g !== 'dates'; }).length, urgent: L.filter(function (a) { return a.rank <= 3; }).length };
    return AL;
  }
  function flagsOf(o, key) { var seen = {}, f = []; alerts().list.forEach(function (a) { if (a[key] === o && !seen[a.g] && a.g !== 'dates') { seen[a.g] = 1; f.push({ g: a.g, label: GI[a.g].label, cls: CLS[a.rank], rank: a.rank }); } }); return f; }
  function sflags(s) { return flagsOf(s, 's'); }
  function pflags(p) { return flagsOf(p, 'p'); }
  function score(f) { return f.reduce(function (a, x) { return a + Math.pow(10, 8 - x.rank); }, 0); }
  function arow(a, showGroup) {
    var who = a.title, lead = a.g === 'dates' && a.date ? dchip(a.date) : av(who);
    var right = a.chip || (a.right ? rr(a.right) : '');
    return row(a.href, lead, nm(who), right, (showGroup ? '<span class="gl2">' + esc(GI[a.g].label) + '</span>' + DOT : '') + a.text, '', 'arow');
  }
  function dchip(iso) { return '<span class="dchip">' + MON[+iso.slice(5, 7) - 1] + '<i>' + (+iso.slice(8, 10)) + '</i></span>'; }

  /* ---------- home ---------- */
  function vHome() {
    var a = alerts(), S = M.students, known = S.filter(function (s) { return s.hrsWk != null; }), tot = known.reduce(function (n, s) { return n + s.hrsWk; }, 0);
    var top = a.list.filter(function (x) { return x.g !== 'dates'; }).slice(0, 6);
    var h = '<div class="hd"><h1>' + WDF[new Date(M.today + 'T12:00:00Z').getUTCDay()] + ', ' + fd(M.today) + '</h1></div>';
    h += '<div class="stats"><a href="#/students"><b>' + S.length + '</b><span>Students</span></a><a href="#/providers"><b>' + M.providers.length + '</b><span>Providers</span></a>' +
      '<a href="#/students?sort=hours"><b>' + hrs(tot) + '</b><span>Hrs/wk</span></a><a href="#/alerts" class="' + (a.urgent ? 'hot' : '') + '"><b>' + a.urgent + '</b><span>Urgent</span></a></div>';
    if (known.length < S.length) h += '<p class="note">Hrs/wk counts ' + known.length + ' of ' + S.length + ' students. The rest have no weekly hours on file.</p>';
    h += sec('attn', 'Needs attention', a.open ? '<a class="more" href="#/alerts">All ' + a.open + '</a>' : '', top.length ? '<div class="list">' + top.map(function (x) { return arow(x, true); }).join('') + '</div>' : empty('No open alerts'));
    var up = a.list.filter(function (x) { return x.g === 'dates'; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    h += sec('dates', 'Upcoming dates', up.length > 5 ? '<a class="more" href="#/alerts/dates">All ' + up.length + '</a>' : up.length ? 'Next 60 days' : '', up.length ? '<div class="list">' + up.slice(0, 5).map(function (x) { return arow(x); }).join('') + '</div>' : empty(M.mode === 'live' ? 'No hearing or report dates on file' : 'No dates in the next 60 days'));
    h += sec('cov', 'On file', 'Students', coverage());
    if (M.sync && M.sync.stale) h += '<p class="note">Case roster last updated ' + fd(M.sync.roster_updated) + ' (' + plural(M.sync.roster_age_days, 'day') + ' ago).</p>';
    h += '<p class="foot">' + (M.mode === 'demo' ? 'Fictional demo data. <a class="lnk" href="./">Leave demo</a>' : 'Live TTG Ops data, read only. <a class="lnk" href="./?demo">Open demo</a>' + DOT + '<button type="button" class="lnkb" data-act="forget">Forget key</button>') + '</p>';
    return h;
  }
  function coverage() {
    var S = M.students, n = S.length;
    var rows = [['Date of birth', function (s) { return s.dob; }], ['School', function (s) { return s.school; }], ['Guardian contact', function (s) { return s.guardianPhone || s.guardianEmail; }], ['Weekly hours', function (s) { return s.hrsWk != null; }],
      ['Schedule', function (s) { return s.lines.some(function (l) { return l.slots.length; }); }], ['BCBA', function (s) { return s.bcba; }], ['Hour bank', function (s) { return s.banks.length; }], ['Auth dates', function (s) { return s.lines.some(function (l) { return l.end; }); }],
      ['Case number', function (s) { return s.caseNo; }], ['Intake papers', function (s) { return s.intake ? /^received$/i.test(s.intake.status) : (s.checklist && s.checklist.every(function (c) { return c.done; })); }],
      [M.mode === 'demo' ? 'Ensora profile' : 'Ensora data', function (s) { return s.ensora ? s.ensora.data && !/^none$/i.test(s.ensora.data) : s.checklist && s.checklist.some(function (c) { return /ensora/i.test(c.item) && c.done; }); }]];
    return '<div class="tw2"><table class="cov"><tbody>' + rows.map(function (r) {
      var k = S.filter(function (s) { return r[1](s); }).length, pct = n ? Math.round(k / n * 100) : 0;
      return '<tr><td>' + esc(r[0]) + '<span class="mbar' + (pct < 50 ? ' lo' : '') + '"><i style="width:' + pct + '%"></i></span></td><td class="n' + (k === 0 ? ' z' : '') + '">' + k + ' of ' + n + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  /* ---------- alerts page ---------- */
  function vAlerts(group) {
    var a = alerts(), G = {}; a.list.forEach(function (x) { (G[x.g] = G[x.g] || []).push(x); });
    var keys = GROUPS.map(function (g) { return g[0]; }).filter(function (k) { return G[k]; });
    var h = '<div class="hd"><h1>Alerts</h1><span class="cm">' + Jw([a.open + ' open', a.urgent + ' urgent']) + '</span></div>';
    if (!keys.length) return h + empty('No open alerts');
    h += '<nav class="pick" aria-label="Alert groups"><a href="#/alerts" data-tab="1" class="' + (!group ? 'on' : '') + '"><b>' + a.open + '</b> All open</a>' + keys.map(function (k) { return '<a href="#/alerts/' + k + '" data-tab="1" class="' + (group === k ? 'on' : '') + '"><b>' + G[k].length + '</b> ' + esc(GI[k].label) + '</a>'; }).join('') + '</nav>';
    keys.filter(function (k) { return group ? k === group : k !== 'dates'; }).forEach(function (k) { h += sec(k, GI[k].title, plural(G[k].length, k === 'dates' ? 'date' : 'item'), '<div class="list">' + G[k].map(function (x) { return arow(x); }).join('') + '</div>'); });
    return h;
  }

  /* ---------- lists: search, sort, filters, A to Z ---------- */
  var Q = { s: '', ssvc: '', sset: '', sal: '', ssort: 'name', p: '', prole: '', pal: '', psort: 'name' };
  function hit(hay, q) { q = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!q) return true; hay = hay.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; }); }
  function sel(k, label, opts) { return '<label class="fl"><select data-q="' + k + '" aria-label="' + esc(label) + '"' + (Q[k] ? ' class="set"' : '') + '><option value="">' + esc(label) + '</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (Q[k] === o[0] ? ' selected' : '') + '>' + esc(o[0]) + ' (' + o[1] + ')</option>'; }).join('') + '</select></label>'; }
  function countOpts(list, fn, order) { var c = {}; list.forEach(function (x) { fn(x).forEach(function (v) { c[v] = (c[v] || 0) + 1; }); }); return Object.keys(c).sort(order || function (a, b) { return a < b ? -1 : 1; }).map(function (k) { return [k, c[k]]; }); }
  function sortSeg(k, opts) { return '<div class="sortbar" role="group" aria-label="Sort"><span class="sl">Sort</span>' + opts.map(function (o) { return '<button type="button" data-sort="' + k + ':' + o[0] + '" class="' + (Q[k] === o[0] ? 'on' : '') + '" aria-pressed="' + (Q[k] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
  function alertLabels(f) { return f.map(function (x) { return x.label; }); }
  function srow(s) {
    var f = sflags(s), sv = svcs(s);
    return row('#/students/' + s.id, av(s), nm(s), rr(s.hrsWk != null ? hw(s.hrsWk) : s.hrsTxt ? esc(s.hrsTxt) : '<span class="nof">No hours</span>', 'hrs'), sv.length ? tags(sv, 4) : '<span class="nof">No services on file</span>', chips(f), 'srow');
  }
  function prow(p) {
    var f = pflags(p);
    return row('#/providers/' + p.id, av(p), nm(p), rr(esc(role(p)), 'role'), Jw([plural(p.students.length, 'student'), p.hrsWk != null ? hw(p.hrsWk) : '<span class="nof">No schedule</span>']), chips(f), 'srow');
  }
  function grouped(list, sortKey, rowFn, idx) {
    if (!list.length) return '';
    if (sortKey !== 'name') {
      return '<div class="list box">' + list.map(rowFn).join('') + '</div>';
    }
    var G = {}, order = []; list.forEach(function (x) { if (!G[x.letter]) { G[x.letter] = []; order.push(x.letter); } G[x.letter].push(x); });
    return '<div class="list box azl">' + order.map(function (L) { return '<div class="azg"><h3 class="azh" id="' + idx + '-' + L + '">' + L + '<span>' + G[L].length + '</span></h3>' + G[L].map(rowFn).join('') + '</div>'; }).join('') + '</div>' +
      (order.length > 3 ? '<nav class="jump" aria-label="Jump to letter">' + order.map(function (L) { return '<a href="#' + idx + '-' + L + '" data-jump="' + idx + '-' + L + '">' + L + '</a>'; }).join('') + '</nav>' : '');
  }
  function sList() {
    var all = M.students, r = all.filter(function (s) {
      if (!hit(s.name + ' ' + svcs(s).join(' ') + ' ' + s.lines.map(function (l) { return l.provider; }).join(' ') + ' ' + (s.setting || '') + ' ' + (s.school || '') + ' ' + (s.borough || ''), Q.s)) return false;
      if (Q.ssvc && svcs(s).indexOf(Q.ssvc) < 0) return false;
      if (Q.sset && s.settings.indexOf(Q.sset) < 0) return false;
      if (Q.sal && (Q.sal === 'None' ? sflags(s).length : alertLabels(sflags(s)).indexOf(Q.sal) < 0)) return false;
      return true;
    });
    if (Q.ssort === 'hours') r.sort(function (a, b) { return (b.hrsWk == null ? -1 : b.hrsWk) - (a.hrsWk == null ? -1 : a.hrsWk) || byName(a, b); });
    else if (Q.ssort === 'alerts') r.sort(function (a, b) { return score(sflags(b)) - score(sflags(a)) || byName(a, b); });
    else r.sort(byName);
    return { all: all, r: r };
  }
  function sres() {
    var x = sList(), filt = Q.s || Q.ssvc || Q.sset || Q.sal;
    return '<div class="count"><span>' + (filt ? x.r.length + ' of ' + plural(x.all.length, 'student') : plural(x.all.length, 'student')) + '</span>' + (filt ? '<button type="button" class="clr" data-clear="s,ssvc,sset,sal">Clear</button>' : '') + '</div>' +
      (x.r.length ? grouped(x.r, Q.ssort, srow, 'S') : empty('No students match'));
  }
  function vStudents() {
    var all = M.students;
    return '<div class="hd"><h1>Students</h1></div><div class="sbox">' + I('search') + '<input class="search" type="search" data-q="s" placeholder="Search name, service, provider" value="' + esc(Q.s) + '" aria-label="Search students" autocomplete="off"></div>' +
      sortSeg('ssort', [['name', 'Name'], ['hours', 'Hours'], ['alerts', 'Alerts']]) +
      '<div class="filters">' + sel('ssvc', 'Service', countOpts(all, svcs, SCM.svcSort)) + sel('sset', 'Setting', countOpts(all, function (s) { return s.settings; })) +
      sel('sal', 'Alert', countOpts(all, function (s) { var f = alertLabels(sflags(s)); return f.length ? f : ['None']; }, function (a, b) { return a === 'None' ? 1 : b === 'None' ? -1 : a < b ? -1 : 1; })) + '</div><div id="res">' + sres() + '</div>';
  }
  function pList() {
    var all = M.providers, r = all.filter(function (p) {
      if (!hit(p.name + ' ' + p.roles.join(' ') + ' ' + p.students.map(function (id) { return stu(id) ? stu(id).name : ''; }).join(' '), Q.p)) return false;
      if (Q.prole && p.roles.indexOf(Q.prole) < 0) return false;
      if (Q.pal && (Q.pal === 'None' ? pflags(p).length : alertLabels(pflags(p)).indexOf(Q.pal) < 0)) return false;
      return true;
    });
    if (Q.psort === 'students') r.sort(function (a, b) { return b.students.length - a.students.length || byName(a, b); });
    else if (Q.psort === 'alerts') r.sort(function (a, b) { return score(pflags(b)) - score(pflags(a)) || byName(a, b); });
    else r.sort(byName);
    return { all: all, r: r };
  }
  function pres() {
    var x = pList(), filt = Q.p || Q.prole || Q.pal;
    return '<div class="count"><span>' + (filt ? x.r.length + ' of ' + plural(x.all.length, 'provider') : plural(x.all.length, 'provider')) + '</span>' + (filt ? '<button type="button" class="clr" data-clear="p,prole,pal">Clear</button>' : '') + '</div>' +
      (x.r.length ? grouped(x.r, Q.psort, prow, 'P') : empty('No providers match'));
  }
  function vProviders() {
    var all = M.providers;
    return '<div class="hd"><h1>Providers</h1></div><div class="sbox">' + I('search') + '<input class="search" type="search" data-q="p" placeholder="Search name, role, student" value="' + esc(Q.p) + '" aria-label="Search providers" autocomplete="off"></div>' +
      sortSeg('psort', [['name', 'Name'], ['students', 'Students'], ['alerts', 'Alerts']]) +
      '<div class="filters f2">' + sel('prole', 'Role', countOpts(all, function (p) { return p.roles; }, SCM.svcSort)) +
      sel('pal', 'Alert', countOpts(all, function (p) { var f = alertLabels(pflags(p)); return f.length ? f : ['None']; }, function (a, b) { return a === 'None' ? 1 : b === 'None' ? -1 : a < b ? -1 : 1; })) + '</div><div id="res">' + pres() + '</div>';
  }

  /* ---------- student profile ---------- */
  var STABS = [['overview', 'Overview'], ['services', 'Services'], ['records', 'Records'], ['notes', 'Notes']];
  var PTABS = [['overview', 'Overview'], ['students', 'Students'], ['schedule', 'Schedule'], ['notes', 'Notes']];
  function tabs(base, list, cur, counts) { return '<nav class="seg" aria-label="Sections">' + list.map(function (x) { return '<a href="' + base + (x[0] === 'overview' ? '' : '/' + x[0]) + '" data-tab="' + x[0] + '"' + (x[0] === cur ? ' class="on" aria-current="page"' : '') + '>' + esc(x[1]) + (counts && counts[x[0]] ? ' <small>' + counts[x[0]] + '</small>' : '') + '</a>'; }).join('') + '</nav>'; }
  function attn(list) { return '<div class="list">' + list.map(function (a) { return row(a.href, '', esc(GI[a.g].label), a.chip || (a.right ? rr(a.right) : ''), a.text, '', 'cat'); }).join('') + '</div>'; }
  function sched(slots) { return '<div class="sch">' + slots.slice().sort(function (a, b) { return DORD.indexOf(a.d) - DORD.indexOf(b.d) || a.s - b.s; }).map(function (x) { return '<span><b>' + x.d + '</b> ' + rng(x.s, x.e) + '</span>'; }).join('') + '</div>'; }
  var HC = { red: 'bad', yellow: 'warn', green: 'ok' };
  function health(hh) { return ['relationship', 'service', 'clinical', 'billing'].map(function (k) { var v = hh && hh[k]; return [k[0].toUpperCase() + k.slice(1), v && HC[v] ? pill(v[0].toUpperCase() + v.slice(1), HC[v]) : '<span class="nof">Not rated</span>', 1]; }); }
  function vStudent(s, tab) {
    var f = sflags(s), mine = alerts().list.filter(function (a) { return a.s === s && a.g !== 'dates'; });
    var sub = Jw([age(s.age), s.grade ? 'Grade ' + esc(s.grade) : '', esc(s.cls || ''), esc(s.borough || '')]) || esc(s.setting || '');
    var nd = s.dates.filter(function (x) { return x.date > M.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    var h = '<section class="sum"><div class="sumh">' + av(s, 'lg') + '<div><h1>' + nm(s) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + allChips(f) + '</div></div>';
    var bySched = s.lines.some(function (l) { return l.wk != null; }) ? hw(s.lines.reduce(function (a, l) { return a + (l.wk || 0); }, 0)) + ' by schedule' : '';
    h += kv([['Weekly hours', s.hrsWk != null ? hw(s.hrsWk) : s.hrsTxt ? esc(s.hrsTxt) : bySched ? NOF + DOT + bySched : '', 1], ['Services', svcs(s).length ? Jw([esc(svcs(s).join(', ')), plural(s.lines.filter(function (l) { return l.pid; }).map(function (l) { return l.pid; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length, 'provider')]) : '', 1],
        ['Next date', nd ? Jw([fd(nd.date), esc(nd.what)]) : '', 1]]) + '</section>';
    h += tabs('#/students/' + s.id, STABS, tab, { notes: s.notes.length || '' });
    var b = '';
    if (tab === 'overview') {
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', attn(mine));
      b += sec('profile', 'Profile', '', kv([s.last ? null : ['Last name', ''], ['Date of birth', s.dob ? fd(s.dob) : ''], ['Age', s.age != null ? String(s.age) : ''], ['Grade', s.grade], ['School', s.school], ['Borough', s.borough], ['Classification', s.cls], ['OSIS', s.osis], ['Attends school', s.attends], ['Setting', s.setting], ['Home language', s.language]]));
      b += sec('family', 'Guardian', '', kv([['Name', s.guardian], ['Phone', tel(s.guardianPhone), 1], ['Email', mail(s.guardianEmail), 1], ['Second contact', s.guardian2, 0, 1]]));
      var team = []; s.lines.forEach(function (l) { if (l.pid && !team.some(function (x) { return x.pid === l.pid; })) team.push(l); });
      b += sec('team', 'Team', team.length ? plural(team.length, 'provider') : '', team.length ? '<div class="list">' + team.map(function (l) { var p = prv(l.pid), ls = s.lines.filter(function (x) { return x.pid === l.pid; }); return row('#/providers/' + p.id, av(p), nm(p), rr(esc(ls.map(function (x) { return x.svc; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '))), Jw([ls.some(function (x) { return x.wk != null; }) ? hw(ls.reduce(function (a, x) { return a + (x.wk || 0); }, 0)) : '', p.phone ? '<span class="nw">' + esc(p.phone) + '</span>' : ''])); }).join('') + '</div>' : empty('No providers on file'));
      b += sec('case', 'Case', '', kv([['Case number', s.caseNo], ['Hearing', s.hearingDate ? fd(s.hearingDate) : ''], ['Order', s.orderDate ? fd(s.orderDate) : ''], ['Outcome', s.outcome], ['Attorney', s.lawyer ? Jw([esc(s.lawyer.name), esc(s.lawyer.firm)]) : '', 1], ['Attorney phone', s.lawyer ? tel(s.lawyer.phone) : '', 1]]));
      if (M.mode === 'live') {
        b += sec('watch', 'Health and live issues', '', kv(health(s.health).concat([['Why', s.why], ['Live issues', s.rosterNotes], ['Source', s.source]])));
      }
      if (s.dates.length) b += sec('hearings', 'Dates', plural(s.dates.length, 'date'), '<ol class="tl">' + s.dates.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return '<li class="' + (x.date > M.today ? 'future' : '') + '"><div class="td"><b>' + fd(x.date) + '</b><span>' + esc(x.what) + '</span>' + stp(x.status) + '</div>' + (x.detail ? '<p>' + t(x.detail) + '</p>' : '') + '</li>'; }).join('') + '</ol>');
    } else if (tab === 'services') {
      var tot = s.lines.some(function (l) { return l.wk != null; }) ? hw(s.lines.reduce(function (a, l) { return a + (l.wk || 0); }, 0)) + (M.mode === 'live' ? ' by schedule' : '') : '';
      b += sec('services', 'Service lines', tot, s.lines.length ? s.lines.map(function (l) {
        var p = l.pid && prv(l.pid);
        return '<div class="svc' + (l.status === 'Unstaffed' ? ' gap' : '') + '"><div class="svh"><b>' + esc(l.svc) + (l.wk != null && M.mode === 'demo' ? DOT + hw(l.wk) : '') + '</b>' + (l.status !== 'Active' ? stp(l.status) : l.ai ? rr(Jw([esc(l.ai), esc(l.caseNo)])) : '') + '</div>' +
          kv([['Provider', p ? '<a class="lnk" href="#/providers/' + p.id + '">' + nm(p) + '</a>' : l.status === 'Unstaffed' ? '<span class="bad">Open' + (l.since ? ' since ' + fd(l.since) : '') + '</span>' : '', 1], ['Setting', l.setting], ['Mandate', l.mandate], M.mode === 'live' && l.wk != null ? ['By schedule', hw(l.wk), 1] : null, ['Schedule', l.slots.length ? sched(l.slots) : l.schedText ? esc(l.schedText) : '', 1],
            ['Period', l.start && l.end ? fd(l.start) + ' to ' + fd(l.end) : l.end ? 'Auth expires ' + fd(l.end) : ''], ['Note', l.note, 0, 1]]) + '</div>';
      }).join('') : empty('No services on file'));
      b += sec('banks', 'Hour banks', s.banks.length ? plural(s.banks.length, 'bank') : '', s.banks.length ? '<div class="tw2"><table><thead><tr><th>Service</th><th class="n">Auth</th><th class="n">Used</th><th class="n">Left</th></tr></thead><tbody>' + s.banks.map(function (b2) {
        var rem = b2.auth - b2.used, pct = Math.round(b2.used / b2.auth * 100), low = rem / b2.auth < 0.2;
        return '<tr class="' + (low ? 'lo' : '') + '"><td>' + esc(b2.svc) + (low ? ' ' + pill('Low', 'bad') : '') + '<small>' + Jw([esc(b2.caseNo), esc(b2.provider)]) + '</small><span class="mbar"><i style="width:' + pct + '%"></i></span></td><td class="n">' + hrs(b2.auth) + '</td><td class="n">' + hrs(b2.used) + '</td><td class="n' + (low ? ' lo' : '') + '"><b>' + hrs(rem) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' : kv([['Hour bank', ''], ['Hours used', ''], ['Auth expiry', '']]));
    } else if (tab === 'records') {
      if (s.intake) b += sec('intake', 'Intake papers', stp(s.intake.status), kv([['Status', s.intake.status], ['Received', s.intake.received], ['Missing', s.intake.missing], ['Welcome email', s.intake.welcome, 0, 1], ['Last contact', s.intake.last ? fd(s.intake.last) : '', 0, 1], ['Checked', s.intake.updated ? fd(s.intake.updated) : '']]));
      if (s.checklist) { var done = s.checklist.filter(function (c) { return c.done; }).length; b += sec('intake', 'Intake', done + ' of ' + s.checklist.length + ' done', kv([['Intake date', s.intakeDate ? fd(s.intakeDate) : '']]) + checklist(s.checklist)); }
      if (s.docs) b += sec('docs', 'Documents', plural(s.docs.length, 'document'), '<div class="list">' + s.docs.slice().sort(function (a, b) { return (b.date || '9') < (a.date || '9') ? -1 : 1; }).map(function (d) { return row('#/students/' + s.id + '/doc/' + d.id, I('doc'), esc(d.name), stp(d.status), Jw([d.date ? fd(d.date) : 'Not dated', esc(d.by)]), '', 'doc'); }).join('') + '</div>');
      else b += sec('docs', 'Documents', '', kv([['IEP', ''], ['Order (FOFD)', ''], ['Evaluations', ''], ['Consents', ''], ['Service agreement', '']]));
      if (s.ensora) b += sec('ensora', 'Ensora', '', kv([['Use', s.ensora.use], ['Data', s.ensora.data && !/^none$/i.test(s.ensora.data) ? s.ensora.data : ''], ['Last export', s.ensora.last], ['Where', s.ensora.source], ['Missing', s.ensora.missing]]));
      else if (M.mode === 'demo') b += sec('ensora', 'Ensora', '', kv([['Profile', s.checklist && s.checklist.some(function (c) { return /ensora/i.test(c.item) && c.done; }) ? 'Created' : '']]));
    } else if (tab === 'notes') {
      var N = s.notes.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; });
      b += sec('notes', 'Notes', N.length ? plural(N.length, 'note') + ', newest first' : '', N.length ? '<ol class="tl">' + N.map(function (n) { return '<li><div class="td"><b>' + (n.date ? fd(n.date) : 'Not dated') + '</b><span class="mut">' + Jw([esc(n.by), esc(n.type)]) + '</span></div><p>' + t(n.text) + '</p></li>'; }).join('') + '</ol>' : empty('No notes on file'));
      if (s.reports) b += sec('reports', 'Progress reports', plural(s.reports.length, 'report'), s.reports.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).map(function (r) { return '<div class="rp"><div class="r1"><b>' + esc(r.title) + '</b>' + stp(r.status) + '</div><div class="bkm">' + Jw([esc(r.period), (r.status === 'Draft' ? 'due ' : '') + fd(r.date), esc(r.by)]) + '</div><p>' + t(r.excerpt) + '</p></div>'; }).join(''));
      else b += sec('reports', 'Progress reports', '', kv([['Latest report', ''], ['Next due', '']]));
    }
    return h + '<div class="tabbody" id="tab-' + tab + '">' + b + '</div>' + (M.mode === 'demo' ? '<p class="foot">Fictional demo record</p>' : '');
  }
  function checklist(items) { return '<ul class="cl">' + items.map(function (c) { return '<li class="' + (c.done ? 'done' : 'open') + '"><span class="box">' + (c.done ? I('check') : '') + '</span><span class="ct">' + esc(c.item) + '</span><span class="cd">' + (c.done ? fd(c.date) : 'Open') + '</span></li>'; }).join('') + '</ul>'; }

  /* ---------- demo document view ---------- */
  var docBody = null;
  function vDoc(s, d) {
    if (!docBody && window.SCDOC) docBody = window.SCDOC({ esc: esc, t: t, kv: function (rows) { return kv(rows.map(function (r) { return [r[0], r[1], r[2], 1]; })); }, fd: fd, fds: fd, first: function (n) { return n.split(' ')[0]; }, hrs: hrs, D: window.SC });
    return '<article class="paper"><div class="ph"><div class="pt">' + esc(d.name) + '</div><div class="pm">' + Jw([esc(s.name), esc(s.caseNo)]) + '</div></div>' +
      kv([['Student', '<a class="lnk" href="#/students/' + s.id + '">' + nm(s) + '</a>', 1], ['From', Jw([esc(d.by), d.date ? fd(d.date) : 'Not yet signed']), 1], ['Status', stp(d.status), 1]]) + '<div class="pb">' + (docBody ? docBody(s.raw, d) : '') + '</div></article><p class="foot">Sample document, fictional</p>';
  }

  /* ---------- provider profile ---------- */
  function vProvider(p, tab) {
    var f = pflags(p), mine = alerts().list.filter(function (a) { return a.p === p; });
    var spw = p.lines.reduce(function (a, x) { return a + x.l.slots.length; }, 0);
    var h = '<section class="sum"><div class="sumh">' + av(p, 'lg') + '<div><h1>' + nm(p) + '</h1><p>' + Jw([esc(role(p)), esc(p.discipline || '')]) + '</p>' + allChips(f) + '</div></div>' +
      kv([['Students', plural(p.students.length, 'student'), 1], ['Scheduled', p.hrsWk != null ? Jw([hw(p.hrsWk), plural(spw, 'session') + ' per week']) : '', 1], ['Phone', tel(p.phone), 1]]) + '</section>';
    h += tabs('#/providers/' + p.id, PTABS, tab);
    var b = '';
    if (tab === 'overview') {
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', attn(mine));
      b += sec('contact', 'Contact', '', kv([['Phone', tel(p.phone), 1], ['Email', mail(p.email), 1], ['Area', p.area], ['Languages', p.languages], ['Started', p.start ? fd(p.start) : '']]));
      b += sec('license', 'Discipline and license', '', kv([['Role', role(p)], ['License', p.license], ['Expires', p.licExp ? fd(p.licExp) : ''], ['Certification', p.cert, 0, M.mode === 'live' ? 0 : 1], ['PETS', p.pets ? stp(p.pets.status) + ' ' + (p.pets.status === 'Cleared' ? fd(p.pets.date) : 'submitted ' + fd(p.pets.submitted)) : '', 1]]));
      if (p.intake) b += sec('papers', 'Provider papers', stp(p.intake.status), kv([['Status', p.intake.status], ['Received', p.intake.received], ['Missing', p.intake.missing], ['Welcome email', p.intake.welcome], ['Checked', p.intake.updated ? fd(p.intake.updated) : '']]));
      else if (M.mode === 'live') b += sec('papers', 'Provider papers', '', kv([['Status', '']]));
      if (p.onboarding) { var done = p.onboarding.filter(function (c) { return c.done; }).length; b += sec('onboarding', 'Onboarding', done + ' of ' + p.onboarding.length + ' done', checklist(p.onboarding)); }
    } else if (tab === 'students') {
      var S = p.students.map(stu).filter(Boolean).sort(byName);
      b += sec('students', 'Students', plural(S.length, 'student'), S.length ? '<div class="list">' + S.map(function (s) { var ls = p.lines.filter(function (x) { return x.sid === s.id; }); return row('#/students/' + s.id, av(s), nm(s), rr(ls.some(function (x) { return x.l.wk != null; }) ? hw(ls.reduce(function (a, x) { return a + (x.l.wk || 0); }, 0)) : '', 'hrs'), Jw(ls.map(function (x) { return Jw([esc(x.l.svc), esc((x.l.setting || '').toLowerCase())]); }))); }).join('') + '</div>' : empty('No students on file'));
    } else if (tab === 'schedule') {
      var W = {}; DORD.forEach(function (d) { W[d] = []; });
      var unparsed = [];
      p.lines.forEach(function (x) { if (x.l.slots.length) x.l.slots.forEach(function (sl) { W[sl.d].push({ sl: sl, s: stu(x.sid), l: x.l }); }); else if (x.l.schedText) unparsed.push(x); });
      var days2 = DORD.filter(function (d) { return W[d].length || d !== 'Sun'; });
      b += sec('schedule', 'Weekly schedule', p.hrsWk != null ? hw(p.hrsWk) : '', spw ? '<div class="grid">' + days2.map(function (d) {
        var bl = W[d].sort(function (a, c) { return a.sl.s - c.sl.s; }), tot = bl.reduce(function (a, x) { return a + (x.sl.e - x.sl.s); }, 0) / 60;
        return '<div class="gd"><div class="gl"><b>' + d + '</b><span>' + (bl.length ? hrs(tot) + 'h' : '') + '</span></div><div class="gb">' + (bl.length ? bl.map(function (x) { return '<a class="blk" href="#/students/' + x.s.id + '"><b>' + rng(x.sl.s, x.sl.e) + '</b><span>' + nm(x.s) + '<small>' + Jw([esc(x.l.svc), esc((x.l.setting || '').toLowerCase())]) + '</small></span></a>'; }).join('') : '<div class="off">Off</div>') + '</div></div>';
      }).join('') + '</div>' : empty('No schedule on file'));
      if (unparsed.length) b += sec('sched2', 'Schedule notes', plural(unparsed.length, 'line'), kv(unparsed.map(function (x) { return [stu(x.sid).name, x.l.schedText]; })));
    } else if (tab === 'notes') {
      if (p.sessionNotes) {
        var SN = p.sessionNotes.slice().sort(function (a, c) { return c.date < a.date ? -1 : 1; });
        b += sec('sessions', 'Session notes', plural(SN.length, 'note') + ', newest first', '<ol class="tl">' + SN.map(function (n) { var s = stu(n.sid); return '<li><div class="td"><b>' + fd(n.date) + '</b><span class="mut">' + Jw([esc(n.time), n.mins + ' min']) + '</span>' + (n.signed ? pill('Signed', 'ok') : pill('Unsigned', 'warn')) + '</div><div class="svp">' + Jw(['<a class="lnk" href="#/students/' + s.id + '">' + nm(s) + '</a>', esc(n.svc)]) + '</div><p>' + t(n.text) + '</p></li>'; }).join('') + '</ol>');
      } else {
        var AG = {}, AO = []; p.lines.forEach(function (x) { if (!x.l.note) return; if (!AG[x.l.note]) { AG[x.l.note] = []; AO.push(x.l.note); } if (AG[x.l.note].indexOf(stu(x.sid)) < 0) AG[x.l.note].push(stu(x.sid)); });
        b += sec('anotes', 'Assignment notes', AO.length ? plural(AO.length, 'note') : '', AO.length ? '<ol class="tl">' + AO.map(function (n) { var S2 = AG[n].sort(byName); return '<li><div class="td"><b>' + (S2.length === 1 ? nm(S2[0]) : plural(S2.length, 'student')) + '</b></div><p>' + t(n) + '</p>' + (S2.length > 1 ? '<p class="mut">' + S2.map(function (s) { return esc(s.name); }).join(', ') + '</p>' : '') + '</li>'; }).join('') + '</ol>' : empty('No notes on file'));
        var QN = p.queue.slice().sort(function (a, c) { return c.date < a.date ? -1 : 1; });
        if (QN.length) b += sec('queue', 'Outreach queue', plural(QN.length, 'item') + ', newest first', '<ol class="tl">' + QN.map(function (n) { return '<li><div class="td"><b>' + fd(n.date) + '</b>' + stp(n.status) + '</div><p>' + t(n.subject) + '</p></li>'; }).join('') + '</ol>');
        b += sec('snotes', 'Session notes', '', kv([['Latest note', '']]));
      }
    }
    return h + '<div class="tabbody" id="tab-' + tab + '">' + b + '</div>' + (M.mode === 'demo' ? '<p class="foot">Fictional demo record</p>' : '');
  }

  /* ---------- states: key prompt, loading, error ---------- */
  var top = document.querySelector('.top'), tabbar = document.querySelector('.tabs'), modeEl = document.getElementById('mode');
  function chrome(on) { tabbar.hidden = !on; document.body.classList.toggle('bare', !on); }
  function vLock(msg, bad) {
    chrome(false); setTitle('', ''); modeEl.hidden = true;
    view.innerHTML = '<section class="lock"><h1>TTG</h1><p>Enter the TTG Ops key to load students and providers.</p>' +
      '<form id="kf" autocomplete="off"><label class="kl" for="key">Key</label><input id="key" name="key" type="password" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" class="search' + (bad ? ' err' : '') + '"' + (bad ? ' aria-invalid="true"' : '') + '>' +
      (msg ? '<p class="msg' + (bad ? ' bad' : '') + '" role="alert">' + esc(msg) + '</p>' : '') +
      '<button type="submit" class="bigbtn">Unlock</button></form><a class="bigbtn alt" href="./?demo">Demo</a><p class="note">Demo shows fictional students and providers.</p></section>';
  }
  function vLoading() {
    chrome(false); modeEl.hidden = true;
    view.innerHTML = '<section class="loading" aria-busy="true"><p class="mut">Loading TTG Ops data</p>' + new Array(7).join('<div class="sk"><i></i><span><b></b><em></em></span></div>') + '</section>';
  }
  function vError(msg) {
    chrome(false); modeEl.hidden = true;
    view.innerHTML = '<section class="lock"><h1>Could not load</h1><p>' + esc(msg) + '</p><button type="button" class="bigbtn" data-act="retry">Try again</button><a class="bigbtn alt" href="./?demo">Demo</a></section>';
  }

  /* ---------- router ---------- */
  var stack = [], pos = {}, repl = false, bk = document.getElementById('bk'), ttl = document.getElementById('ttl'), brand = document.getElementById('brand');
  function parse() { var raw = location.hash.replace(/^#\/?/, ''), qs = raw.split('?'), h = qs[0].split('/'); return { r: h[0] || 'home', id: h[1] ? decodeURIComponent(h[1]) : '', sub: h[2], n: h[3], q: qs[1] || '' }; }
  function tabOf(list, sub) { return list.some(function (x) { return x[0] === sub; }) ? sub : 'overview'; }
  function setTitle(title, parent) { bk.hidden = !parent; bk.setAttribute('data-parent', parent || ''); brand.hidden = !!parent; ttl.textContent = parent ? title : ''; ttl.hidden = !parent; document.title = (title ? title + ' | ' : '') + 'TTG'; }
  function notFound(what, back) { return '<section class="lock"><h1>' + esc(what) + ' not found</h1><p>It may have been removed or the link is from the other data set.</p><a class="bigbtn" href="' + back + '">Back to list</a></section>'; }
  function render() {
    if (!M) return parse();
    chrome(true);
    var x = parse(), html, title = '', parent = '', nav = x.r;
    if (/sort=hours/.test(x.q)) Q.ssort = 'hours';
    if (x.r === 'students' && x.id) {
      var s = stu(x.id);
      if (!s) { html = notFound('Student', '#/students'); title = 'Student'; parent = '#/students'; }
      else if (x.sub === 'doc' && s.docs) { var d = s.docs.filter(function (k) { return k.id === x.n; })[0]; html = d ? vDoc(s, d) : notFound('Document', '#/students/' + s.id + '/records'); title = d ? d.name : 'Document'; parent = '#/students/' + s.id + '/records'; }
      else { html = vStudent(s, tabOf(STABS, x.sub === 'documents' ? 'records' : x.sub)); title = s.name; parent = '#/students'; }
    } else if (x.r === 'providers' && x.id) { var p = prv(x.id); html = p ? vProvider(p, tabOf(PTABS, x.sub)) : notFound('Provider', '#/providers'); title = p ? p.name : 'Provider'; parent = '#/providers'; }
    else if (x.r === 'students') { html = vStudents(); title = 'Students'; }
    else if (x.r === 'providers') { html = vProviders(); title = 'Providers'; }
    else if (x.r === 'alerts') { html = vAlerts(GI[x.id] ? x.id : ''); title = 'Alerts'; }
    else { html = vHome(); nav = 'home'; }
    view.innerHTML = html;
    setTitle(parent ? title : (nav === 'home' ? '' : title), parent);
    document.querySelectorAll('[data-nav]').forEach(function (a) { var on = a.getAttribute('data-nav') === nav; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var bd = document.getElementById('badge'); if (bd) bd.textContent = alerts().urgent || '';
    return x;
  }
  function hdr() { return top.offsetHeight; }
  function onHash() {
    var h = location.hash || '#/', wasRepl = repl, prevY = window.scrollY; repl = false;
    var isBack = !wasRepl && stack.length > 1 && stack[stack.length - 2] === h;
    if (wasRepl && stack.length) stack[stack.length - 1] = h; else if (isBack) stack.pop(); else stack.push(h);
    var x = render(); if (!M) return;
    if (x.r === 'alerts' && x.id && document.getElementById(x.id)) { window.scrollTo(0, 0); return; }
    if (wasRepl) { var sg = document.querySelector('.seg'); if (sg) { var st = sg.getBoundingClientRect().top + window.scrollY - hdr(); window.scrollTo(0, Math.min(prevY, st)); return; } window.scrollTo(0, Math.min(prevY, 0)); return; }
    window.scrollTo(0, isBack && pos[h] ? pos[h] : 0);
  }
  window.addEventListener('scroll', function () { pos[location.hash || '#/'] = window.scrollY; }, { passive: true });
  bk.addEventListener('click', function () { if (stack.length > 1) history.back(); else location.replace(bk.getAttribute('data-parent') || '#/'); });
  function refilter() { var x = parse(), r = document.getElementById('res'); if (!r) return; r.innerHTML = x.r === 'students' ? sres() : pres(); document.querySelectorAll('select[data-q]').forEach(function (s) { s.classList.toggle('set', !!Q[s.getAttribute('data-q')]); }); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-tab]');
    if (a) { e.preventDefault(); var href = a.getAttribute('href'); repl = true; if (href === (location.hash || '#/')) { onHash(); return; } location.replace(href); return; }
    var j = e.target.closest('a[data-jump]');
    if (j) { e.preventDefault(); var el = document.getElementById(j.getAttribute('data-jump')); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - hdr() - 4); return; }
    var c = e.target.closest('[data-clear]');
    if (c) { c.getAttribute('data-clear').split(',').forEach(function (k) { Q[k] = ''; }); var inp = document.querySelector('input[data-q]'); if (inp) inp.value = ''; document.querySelectorAll('select[data-q]').forEach(function (s) { if (!Q[s.getAttribute('data-q')]) s.value = ''; }); refilter(); return; }
    var so = e.target.closest('[data-sort]');
    if (so) { var kv2 = so.getAttribute('data-sort').split(':'); Q[kv2[0]] = kv2[1]; document.querySelectorAll('[data-sort^="' + kv2[0] + ':"]').forEach(function (b) { var on = b === so; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); refilter(); return; }
    var act = e.target.closest('[data-act]');
    if (act) {
      var w = act.getAttribute('data-act');
      if (w === 'retry') boot();
      if (w === 'forget' && confirm('Remove the TTG Ops key from this device? TTG Ops on this device will ask for it again.')) { try { localStorage.removeItem('ttgops.k'); localStorage.removeItem('ttgops.cache'); } catch (x) {} M = null; AL = null; vLock(''); }
    }
  });
  document.addEventListener('input', function (e) { var k = e.target.getAttribute('data-q'); if (!k || e.target.tagName !== 'INPUT') return; Q[k] = e.target.value; refilter(); });
  document.addEventListener('change', function (e) { var k = e.target.getAttribute('data-q'); if (!k || e.target.tagName !== 'SELECT') return; Q[k] = e.target.value; refilter(); });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'kf') return; e.preventDefault();
    var k = (document.getElementById('key').value || '').trim();
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(k)) { vLock('That does not look like a TTG Ops key.', true); return; }
    load(k, true);
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', onHash);

  /* ---------- boot ---------- */
  function start(model) {
    M = model; AL = null; SM = {}; PM = {};
    M.students.forEach(function (s) { SM[s.id] = s; }); M.providers.forEach(function (p) { PM[p.id] = p; });
    modeEl.hidden = false; modeEl.textContent = M.mode === 'demo' ? 'Demo' : 'Live'; modeEl.className = 'mode ' + M.mode;
    stack = []; onHash();
  }
  function apiUrl() {
    var url = (window.TTG_CONFIG && window.TTG_CONFIG.API_URL) || '', la = '';
    try { la = localStorage.getItem('ttgops.api') || ''; } catch (x) {}
    if (!url) url = la;
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(la)) url = la;
    return url;
  }
  function load(key, typed) {
    var url = apiUrl();
    if (!url) { vError('TTG Ops is not set up on this site.'); return; }
    vLoading();
    var ac = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ac) ac.abort(); }, 60000);
    fetch(url, { signal: ac ? ac.signal : undefined, method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: key, action: 'bootstrap', data: {} }), redirect: 'follow', referrerPolicy: 'no-referrer', cache: 'no-store', credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || j.ok === false || j.error) { var er = new Error((j && j.error) || 'unauthorized'); er.auth = /unauth|key|denied|forbidden/i.test(er.message); throw er; }
        if (typed) { try { if (localStorage.getItem('ttgops.k') !== key) localStorage.removeItem('ttgops.cache'); localStorage.setItem('ttgops.k', key); } catch (x) {} }
        clearTimeout(tm); start(SCM.fromLive(j.data || j));
      })
      .catch(function (e) {
        clearTimeout(tm);
        if (e.name === 'AbortError') { vError('The TTG Ops server took too long to answer. Try again.'); return; }
        if (e.auth) vLock(typed ? 'Key not accepted. Check it and try again.' : 'The key saved on this device was not accepted. Enter it again.', true);
        else vError('The TTG Ops server did not answer (' + (e.message || 'network error') + '). Check the connection and try again.');
      });
  }
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.body.appendChild(s); }); }
  function boot() {
    if (MODE === 'demo') {
      vLoading();
      loadScript('data.js?v=5').then(function () { return loadScript('demo-docs.js?v=5'); }).then(function () { start(SCM.fromDemo(window.SC)); }).catch(function () { vError('Demo data did not load.'); });
      return;
    }
    var k = ''; try { k = localStorage.getItem('ttgops.k') || ''; } catch (x) {}
    if (!k) { vLock(''); return; }
    load(k, false);
  }
  boot();
})();
