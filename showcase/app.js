/* TTG showcase. Fictional demo data only. Hash routing: #/, #/alerts, #/alerts/GROUP, #/students, #/providers, #/students/ID[/services|/documents|/notes], #/students/ID/doc/N, #/providers/ID[/students|/schedule|/notes] */
(function () {
  var D = window.SC, view = document.getElementById('view');
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYFULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fd(iso) { if (!iso) return ''; var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
  function fds(iso) { var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]); }
  function wd(iso) { return WD[new Date(iso + 'T12:00:00').getDay()]; }
  function t(s) { return esc(s).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, function (m) { return fd(m); }); }
  function hrs(x) { return (Math.round(x * 100) / 100).toString(); }
  function first(n) { return n.split(' ')[0]; }
  function ini(n) { return n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join(''); }
  var SC = ['#c2500a', '#9a3412', '#b45309', '#be123c', '#a16207', '#7c2d12', '#ea580c', '#92400e'];
  function scol(s) { return SC[(+s.id.slice(-1) - 1) % SC.length]; }
  function av(name, color, c) { return '<span class="av ' + (c || '') + '" style="background:' + color + '">' + esc(ini(name)) + '</span>'; }
  function pill(x, k) { return '<span class="pill ' + (k || '') + '">' + esc(x) + '</span>'; }
  function stp(st) { return pill(st, /^(Received|Signed|Approved|Complete|Active|Cleared|Held)$/.test(st) ? 'ok' : /^(Requested|Awaiting signature|Pending)$/.test(st) ? 'warn' : /^(Draft|In progress|Upcoming|Scheduled)$/.test(st) ? 'acc' : ''); }
  function I(k) { var P = { back: '<path d="m15 5-7 7 7 7"/>', chev: '<path d="m9 6 6 6-6 6"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>' }; return '<svg class="i i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + P[k] + '</svg>'; }
  var DOT = '<span class="dot"> \u00b7 </span>';
  function J(a) { return a.filter(function (x) { return x !== '' && x != null; }).map(function (x) { return '<span class="nw">' + x + '</span>'; }).join(DOT); }
  function Jw(a) { return a.filter(function (x) { return x !== '' && x != null; }).join(DOT); }
  function kv(rows, cls) { return '<dl class="kv' + (cls ? ' ' + cls : '') + '">' + rows.filter(function (r) { return r && r[1] !== '' && r[1] != null; }).map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : t(r[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function tel(p) { return '<a class="lnk" href="tel:' + p.replace(/[^\d]/g, '') + '">' + esc(p) + '</a>'; }
  function mail(e) { return '<a class="lnk" href="mailto:' + esc(e) + '">' + esc(e) + '</a>'; }
  function sec(id, title, meta, body) { return '<section class="card" id="' + id + '"><div class="ch"><h2>' + esc(title) + '</h2>' + (meta ? '<span class="cm">' + meta + '</span>' : '') + '</div>' + body + '</section>'; }
  function checklist(items) { return '<ul class="cl">' + items.map(function (c) { return '<li class="' + (c.done ? 'done' : 'open') + '"><span class="box">' + (c.done ? I('check') : '') + '</span><span class="ct">' + esc(c.item) + '</span><span class="cd">' + (c.done ? fds(c.date) : 'Open') + '</span></li>'; }).join('') + '</ul>'; }
  var DORD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function hm(m) { var h = Math.floor(m / 60) % 12 || 12, mm = m % 60; return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : ''); }
  function rng(s, e) { var a = s < 720 ? 'a' : 'p', b = e < 720 ? 'a' : 'p'; return hm(s) + (a === b ? '' : a) + '-' + hm(e) + b; }
  function slots(l) { return l.sessions.slice().sort(function (a, b) { return DORD.indexOf(a.d) - DORD.indexOf(b.d) || a.s - b.s; }); }
  function schips(l) { return '<div class="sch">' + slots(l).map(function (x) { return '<span><b>' + x.d + '</b> ' + rng(x.s, x.e) + '</span>'; }).join('') + '</div>'; }
  function role(p) { return p.role === 'Counselor' ? 'LMSW' : p.role; }
  function svcs(s) { return s.lines.map(function (l) { return l.svc; }).filter(function (v) { return v !== 'BCBA supervision'; }); }
  function chips(a) { return '<span class="chips">' + a.join('') + '</span>'; }
  function addD(iso, n) { return D.addDays(iso, n); }
  function soon(iso, days) { return iso > D.today && iso <= addD(D.today, days); }
  function hw(x) { return hrs(x) + '&nbsp;hrs/wk'; }
  /* generic compact row: lead html, title, right text or pill, second line, extra */
  function row(href, lead, title, right, line, extra, cls) {
    var tag = href ? 'a' : 'div';
    return '<' + tag + ' class="row' + (cls ? ' ' + cls : '') + (href ? '' : ' static') + '"' + (href ? ' href="' + href + '"' : '') + '>' + (lead || '') + '<span class="rm"><span class="r1"><b>' + title + '</b>' + (right || '') + '</span>' + (line ? '<span class="r2">' + line + '</span>' : '') + (extra || '') + '</span>' + (href ? I('chev') : '') + '</' + tag + '>';
  }
  function rr(x) { return '<span class="rr">' + x + '</span>'; }

  /* ---------- alerts (computed) ---------- */
  var LOW = 0.2;
  function banksOf(s) { var out = []; s.cases.forEach(function (c) { c.banks.forEach(function (b) { out.push({ s: s, c: c, b: b, rem: b.auth - b.used, frac: (b.auth - b.used) / b.auth }); }); }); return out; }
  function lowBanks(s) { return banksOf(s).filter(function (x) { return x.frac < LOW; }); }
  function openDocs(s) { return s.docs.filter(function (d) { return /^(Requested|Awaiting signature|Draft)$/.test(d.status); }); }
  function openIntake(s) { return s.checklist.filter(function (c) { return !c.done; }); }
  function nextDate(s) { return s.hearings.filter(function (h) { return h.date > D.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0]; }
  function sflags(s) {
    var f = [];
    if (lowBanks(s).length) f.push(['Low hours', 'warn']);
    if (s.docs.some(function (d) { return /^(Requested|Awaiting signature)$/.test(d.status); })) f.push(['Docs open', 'warn']);
    if (openIntake(s).length) f.push(['Intake open', 'acc']);
    if (!f.length) f.push(['On track', 'ok']);
    return f;
  }
  function pflags(p) {
    var f = [[p.pets.status === 'Cleared' ? 'PETS cleared' : 'PETS pending', p.pets.status === 'Cleared' ? 'ok' : 'warn']];
    if (p.onboardStatus !== 'Complete') f.push(['Onboarding open', 'acc']);
    if (p.licExp <= addD(D.today, 90)) f.push(['Renewal due', 'warn']);
    if (p.sessionNotes.some(function (n) { return !n.signed; })) f.push(['Unsigned note', 'warn']);
    return f;
  }
  function A() {
    var a = { banks: [], pets: [], docs: [], notes: [], license: [], intake: [], dates: [] };
    D.students.forEach(function (s) {
      lowBanks(s).forEach(function (x) { a.banks.push(x); });
      openDocs(s).forEach(function (d) { a.docs.push({ s: s, d: d }); });
      openIntake(s).forEach(function (c) { a.intake.push({ s: s, c: c }); });
      s.hearings.forEach(function (h) { if (soon(h.date, 60)) a.dates.push({ s: s, h: h }); });
    });
    a.banks.sort(function (x, y) { return x.frac - y.frac; });
    a.dates.sort(function (x, y) { return x.h.date < y.h.date ? -1 : 1; });
    D.providers.forEach(function (p) {
      if (p.pets.status !== 'Cleared') a.pets.push(p);
      if (p.licExp <= addD(D.today, 90)) a.license.push(p);
      p.sessionNotes.forEach(function (n) { if (!n.signed) a.notes.push({ p: p, n: n }); });
    });
    a.open = a.banks.length + a.pets.length + a.docs.length + a.notes.length + a.license.length + a.intake.length;
    return a;
  }
  var GROUPS = [['banks', 'Low hour banks'], ['pets', 'PETS pending'], ['docs', 'Documents pending'], ['notes', 'Unsigned session notes'], ['license', 'License renewals'], ['intake', 'Intake items open'], ['dates', 'Upcoming hearing dates']];
  function dchip(iso) { var p = iso.split('-'); return '<span class="dchip">' + MON[+p[1] - 1] + '<i>' + (+p[2]) + '</i></span>'; }
  function arow(href, color, name, line1, chip) { return row(href, av(name, color), esc(name), chip, line1); }
  function aRows(k, a, max) {
    var L = a[k].slice(0, max || 99);
    return L.map(function (x) {
      switch (k) {
        case 'banks': return arow('#/students/' + x.s.id + '/services', scol(x.s), x.s.name, Jw([esc(x.b.svc), esc(x.c.num)]), pill(hrs(x.rem) + ' of ' + hrs(x.b.auth) + ' hrs left', 'warn'));
        case 'pets': return arow('#/providers/' + x.id, x.color, x.name, Jw([esc(role(x)), 'submitted ' + fd(x.pets.submitted)]), pill('PETS pending', 'warn'));
        case 'docs': return arow('#/students/' + x.s.id + '/doc/' + x.d.id, scol(x.s), x.s.name, esc(x.d.name), stp(x.d.status));
        case 'notes': var s = D.smap[x.n.sid]; return arow('#/providers/' + x.p.id + '/notes', x.p.color, x.p.name, Jw([esc(s.name), esc(x.n.svc), fds(x.n.date)]), pill('Unsigned', 'warn'));
        case 'license': return arow('#/providers/' + x.id, x.color, x.name, Jw([esc(x.license), 'expires ' + fd(x.licExp)]), pill('Renewal due', 'warn'));
        case 'intake': return arow('#/students/' + x.s.id + '/documents', scol(x.s), x.s.name, esc(x.c.item), pill('Open', 'acc'));
        case 'dates': return row('#/students/' + x.s.id, dchip(x.h.date), esc(x.s.name), '', Jw([esc(x.h.what), wd(x.h.date).slice(0, 3)]));
      }
    }).join('');
  }

  /* ---------- home ---------- */
  function vHome() {
    var a = A(), tot = D.students.reduce(function (n, s) { return n + s.hrsWk; }, 0);
    var h = '<div class="hd"><h1>Today</h1><p class="sub2">' + wd(D.today) + ', ' + fd(D.today) + '</p></div>';
    h += '<div class="stats"><a href="#/students"><b>' + D.students.length + '</b><span>Students</span></a><a href="#/providers"><b>' + D.providers.length + '</b><span>Providers</span></a><a href="#/students"><b>' + hrs(tot) + '</b><span>Hrs/wk</span></a><a href="#/alerts" class="hot"><b>' + a.open + '</b><span>Alerts</span></a></div>';
    h += '<section class="card" id="attention"><div class="ch"><h2>Needs attention</h2><a class="more" href="#/alerts">All alerts</a></div><div class="list">' +
      GROUPS.filter(function (g) { return g[0] !== 'dates' && a[g[0]].length; }).map(function (g) { return row('#/alerts/' + g[0], '<span class="cnt">' + a[g[0]].length + '</span>', esc(g[1]), '', catLine(g[0], a), '', 'cat'); }).join('') + '</div></section>';
    h += '<section class="card" id="upcoming"><div class="ch"><h2>Upcoming dates</h2><a class="more" href="#/alerts/dates">All ' + a.dates.length + '</a></div><div class="list">' + aRows('dates', a, 4) + '</div></section>';
    h += '<section class="card" id="quick"><div class="ch"><h2>Quick links</h2></div><div class="ql">' +
      [['#/students', 'All students'], ['#/providers', 'All providers'], ['#/alerts/banks', 'Hour banks'], ['#/alerts/docs', 'Pending documents'], ['#/students/S-1001', 'Eli Vantorre'], ['#/providers/P-203/schedule', 'Priya schedule']].map(function (q) { return '<a href="' + q[0] + '">' + esc(q[1]) + '</a>'; }).join('') + '</div></section>';
    return h + '<p class="foot">Fictional demo data</p>';
  }
  function catLine(k, a) {
    var names = function (arr, f) { var n = arr.map(f).filter(function (v, i, x) { return x.indexOf(v) === i; }); return esc(n.slice(0, 2).join(', ') + (n.length > 2 ? ' +' + (n.length - 2) : '')); };
    if (k === 'pets' || k === 'license') return names(a[k], function (p) { return p.name; });
    if (k === 'notes') return names(a[k], function (x) { return x.p.name; });
    return names(a[k], function (x) { return x.s.name; });
  }

  /* ---------- alerts page ---------- */
  function vAlerts() {
    var a = A();
    var h = '<div class="hd"><h1>Alerts</h1><p class="sub2">' + a.open + ' open' + DOT + a.dates.length + ' dates in 60 days</p></div>';
    h += '<nav class="pick" aria-label="Alert groups">' + GROUPS.filter(function (g) { return a[g[0]].length; }).map(function (g) { return '<a href="#/alerts/' + g[0] + '" data-tab="1"><b>' + a[g[0]].length + '</b> ' + esc(g[1].replace('Upcoming hearing dates', 'Dates').replace('Unsigned session notes', 'Unsigned notes').replace('Intake items open', 'Intake open').replace('Documents pending', 'Documents').replace('Low hour banks', 'Low hours').replace('License renewals', 'Renewals')) + '</a>'; }).join('') + '</nav>';
    GROUPS.forEach(function (g) { if (a[g[0]].length) h += sec(g[0], g[1], a[g[0]].length + '', '<div class="list">' + aRows(g[0], a) + '</div>'); });
    return h;
  }

  /* ---------- lists ---------- */
  var Q = { s: '', sb: '', ss: '', st: '', p: '', pb: '', pr: '', pst: '' };
  var BOR = ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'];
  function sel(k, label, opts) { return '<label class="fl"><select data-q="' + k + '" aria-label="' + esc(label) + '"' + (Q[k] ? ' class="set"' : '') + '><option value="">' + esc(label) + ': all</option>' + opts.map(function (o) { return '<option' + (Q[k] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>'; }
  function srow(s) {
    return row('#/students/' + s.id, av(s.name, scol(s)), esc(s.name), rr(hw(s.hrsWk)), Jw(['Gr ' + esc(s.grade), esc(s.borough), esc(svcs(s).join(', '))]), chips(sflags(s).map(function (x) { return pill(x[0], x[1]); })));
  }
  function prow(p) {
    return row('#/providers/' + p.id, av(p.name, p.color), esc(p.name), rr(esc(role(p))), Jw([p.students.length + ' students', hw(p.hrsWk), esc(p.area)]), chips(pflags(p).map(function (x) { return pill(x[0], x[1]); })));
  }
  function hit(hay, q) { q = q.trim().toLowerCase(); if (!q) return true; hay = hay.toLowerCase(); return q.split(/\s+/).every(function (w) { return new RegExp('(^|[^a-z0-9])' + w.replace(/[^a-z0-9]/g, '\\$&')).test(hay); }); }
  function sres() {
    var q = Q.s;
    var r = D.students.filter(function (s) {
      if (!hit(s.name + ' ' + s.school + ' ' + s.borough + ' ' + s.cls + ' ' + s.lines.map(function (l) { return l.svc + ' ' + D.pmap[l.pid].name; }).join(' '), q)) return false;
      if (Q.sb && s.borough !== Q.sb) return false;
      if (Q.ss && !s.lines.some(function (l) { return l.svc === Q.ss; })) return false;
      if (Q.st && !sflags(s).some(function (x) { return x[0] === Q.st; })) return false;
      return true;
    });
    return '<p class="count">' + r.length + ' of ' + D.students.length + ' students</p>' + (r.length ? '<div class="list box">' + r.map(srow).join('') + '</div>' : '<p class="empty">No matches</p>');
  }
  function pres() {
    var q = Q.p;
    var r = D.providers.filter(function (p) {
      if (!hit(p.name + ' ' + p.role + ' ' + role(p) + ' ' + p.discipline + ' ' + p.area + ' ' + p.languages, q)) return false;
      if (Q.pb && !(p.area === 'All boroughs' || p.area.indexOf(Q.pb) >= 0)) return false;
      if (Q.pr && role(p) !== Q.pr) return false;
      if (Q.pst && !pflags(p).some(function (x) { return x[0] === Q.pst; })) return false;
      return true;
    });
    return '<p class="count">' + r.length + ' of ' + D.providers.length + ' providers</p>' + (r.length ? '<div class="list box">' + r.map(prow).join('') + '</div>' : '<p class="empty">No matches</p>');
  }
  function clr(keys) { return keys.some(function (k) { return Q[k]; }) ? '<button type="button" class="clr" data-clear="' + keys.join(',') + '">Clear filters</button>' : ''; }
  function vStudents() {
    return '<input class="search" type="search" data-q="s" placeholder="Search students, school, provider" value="' + esc(Q.s) + '" autocomplete="off">' +
      '<div class="filters">' + sel('sb', 'Borough', BOR) + sel('ss', 'Service', ['ABA', 'BCBA supervision', 'Speech', 'OT', 'PT', 'SETSS', 'Counseling']) + sel('st', 'Status', ['On track', 'Low hours', 'Docs open', 'Intake open']) + '<div id="clr">' + clr(['s', 'sb', 'ss', 'st']) + '</div></div>' +
      '<div id="res">' + sres() + '</div>';
  }
  function vProviders() {
    return '<input class="search" type="search" data-q="p" placeholder="Search providers, discipline, language" value="' + esc(Q.p) + '" autocomplete="off">' +
      '<div class="filters">' + sel('pb', 'Borough', BOR) + sel('pr', 'Role', ['BCBA', 'RBT', 'SLP', 'OT', 'PT', 'SETSS', 'LMSW']) + sel('pst', 'Status', ['PETS cleared', 'PETS pending', 'Onboarding open', 'Renewal due', 'Unsigned note']) + '<div id="clr">' + clr(['p', 'pb', 'pr', 'pst']) + '</div></div>' +
      '<div id="res">' + pres() + '</div>';
  }

  /* ---------- profile shell ---------- */
  function tabs(base, list, cur) { return '<nav class="seg" aria-label="Sections">' + list.map(function (x) { return '<a href="' + base + (x[0] === 'overview' ? '' : '/' + x[0]) + '" data-tab="' + x[0] + '"' + (x[0] === cur ? ' class="on" aria-current="page"' : '') + '>' + esc(x[1]) + '</a>'; }).join('') + '</nav>'; }
  var STABS = [['overview', 'Overview'], ['services', 'Services'], ['documents', 'Documents'], ['notes', 'Notes']];
  var PTABS = [['overview', 'Overview'], ['students', 'Students'], ['schedule', 'Schedule'], ['notes', 'Notes']];
  function attn(items) { return '<div class="list">' + items.map(function (m) { return row(m[0], '', m[1], '', m[2], '', 'cat'); }).join('') + '</div>'; }

  /* ---------- student ---------- */
  function vStudent(s, tab) {
    var nd = nextDate(s), lb = banksOf(s).sort(function (x, y) { return x.frac - y.frac; })[0];
    var h = '<section class="sum"><div class="sumh">' + av(s.name, scol(s), 'lg') + '<div><h1>' + esc(s.name) + '</h1><p>' + Jw(['Age ' + s.age, 'Grade ' + esc(s.grade), esc(s.cls), esc(s.borough)]) + '</p>' + chips(sflags(s).map(function (x) { return pill(x[0], x[1]); })) + '</div></div>' +
      kv([['Weekly hours', J([hrs(s.hrsWk) + ' hrs', s.lines.length + ' services', s.team.length + ' providers']), 1], ['Next date', nd ? J([fds(nd.date), esc(nd.what)]) : 'None', 1], ['Lowest bank', J([hrs(lb.rem) + ' of ' + hrs(lb.b.auth) + ' hrs left', esc(lb.b.svc)]), 1]]) + '</section>';
    h += tabs('#/students/' + s.id, STABS, tab);
    var b = '';
    if (tab === 'overview') {
      var mine = [];
      lowBanks(s).forEach(function (x) { mine.push(['#/students/' + s.id + '/services', 'Low hour bank', Jw([esc(x.b.svc), hrs(x.rem) + ' of ' + hrs(x.b.auth) + ' hrs left'])]); });
      openDocs(s).forEach(function (d) { mine.push(['#/students/' + s.id + '/doc/' + d.id, esc(d.status), esc(d.name)]); });
      openIntake(s).forEach(function (c) { mine.push(['#/students/' + s.id + '/documents', 'Intake open', esc(c.item)]); });
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', attn(mine));
      b += sec('profile', 'Profile', '', kv([['Born', J([fd(s.dob), 'age ' + s.age]), 1], ['School', Jw([esc(s.school), J([esc(s.district), esc(s.borough)])]), 1], ['IEP class', s.cls], ['Diagnosis', s.dx],
        ['Parent', Jw([esc(s.parent.name) + ', ' + esc(s.parent.rel.toLowerCase()), esc(s.parent.lang)]), 1], ['Contact', Jw([tel(s.parent.phone), mail(s.parent.email)]), 1],
        s.parent2 ? ['Parent 2', Jw([esc(s.parent2.name) + ', ' + esc(s.parent2.rel.toLowerCase()), tel(s.parent2.phone)]), 1] : null]));
      b += sec('team', 'Team', s.team.length + ' providers', '<div class="list">' + s.team.map(function (pid) { var p = D.pmap[pid]; var ls = s.lines.filter(function (l) { return l.pid === pid; }); return row('#/providers/' + pid, av(p.name, p.color), esc(p.name), rr(esc(role(p))), Jw(ls.map(function (l) { return esc(l.svc) + ' ' + hw(l.wk); }).concat(['<span class="nw">' + esc(p.phone) + '</span>']))); }).join('') +
        row('', av(s.lawyer.name, '#57534e'), esc(s.lawyer.name), rr('Attorney'), Jw([esc(s.lawyer.firm), '<span class="nw">' + esc(s.lawyer.phone) + '</span>'])) + '</div>');
      b += sec('case', 'Case', esc(s.caseNo), kv([['Hearing', J([fd(s.hearingDate), 'order ' + fd(s.orderDate)]), 1], ['Attorney', Jw([esc(s.lawyer.name), esc(s.lawyer.firm)]), 1], ['Phone', tel(s.lawyer.phone), 1], ['Outcome', s.outcome]]));
      b += sec('hearings', 'Hearing dates', s.hearings.length + ' dates', '<ol class="tl">' + s.hearings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return '<li class="' + (x.date > D.today ? 'future' : '') + '"><div class="td"><b>' + fd(x.date) + '</b><span>' + esc(x.what) + '</span>' + stp(x.status) + '</div><p>' + t(x.detail) + '</p></li>'; }).join('') + '</ol>');
    } else if (tab === 'services') {
      b += sec('services', 'Service lines', hw(s.hrsWk) + ' total', s.lines.map(function (l) {
        var p = D.pmap[l.pid];
        return '<div class="svc"><div class="svh"><b>' + esc(l.svc) + DOT + hw(l.wk) + '</b><span class="rr">' + Jw([esc(l.ai), esc(l.caseNo)]) + '</span></div>' +
          '<p class="svp">' + J(['<a class="lnk" href="#/providers/' + p.id + '">' + esc(p.name) + ', ' + esc(role(p)) + '</a>', esc(l.setting), l.sessions.length + ' x ' + l.len + ' min']) + '</p>' +
          '<p class="svp mut">' + fd(l.start) + ' to ' + fd(l.end) + '</p>' + schips(l) + '</div>';
      }).join(''));
      b += sec('cases', 'Hour banks', s.cases.length + (s.cases.length > 1 ? ' cases' : ' case'), s.cases.map(function (c) {
        return '<div class="bk2"><div class="bkh"><b>Case ' + esc(c.num) + '</b>' + stp(c.status) + '</div><p class="bkm">' + Jw([t(c.basis), 'SY ' + esc(c.sy), t(c.window)]) + '</p>' +
          '<div class="tw2"><table><thead><tr><th>Service</th><th class="n">Auth</th><th class="n">Used</th><th class="n">Left</th></tr></thead><tbody>' + c.banks.map(function (b) {
            var rem = b.auth - b.used, pct = Math.round(b.used / b.auth * 100), low = rem / b.auth < LOW;
            return '<tr class="' + (low ? 'lo' : '') + '"><td>' + esc(b.svc) + (low ? ' ' + pill('Low', 'warn') : '') + '<small>' + esc(D.pmap[b.pid].name) + '</small><span class="mbar"><i style="width:' + pct + '%"></i></span></td><td class="n">' + hrs(b.auth) + '</td><td class="n">' + hrs(b.used) + '</td><td class="n' + (low ? ' lo' : '') + '"><b>' + hrs(rem) + '</b></td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }).join(''));
    } else if (tab === 'documents') {
      b += sec('docs', 'Documents', s.docs.length + ' on file', '<div class="list">' + s.docs.map(function (d) { return row('#/students/' + s.id + '/doc/' + d.id, I('doc'), esc(d.name), stp(d.status), Jw([d.date ? fd(d.date) : '', esc(d.by)]), '', 'doc'); }).join('') + '</div>');
      var done = s.checklist.filter(function (c) { return c.done; }).length;
      b += sec('intake', 'Intake', done + ' of ' + s.checklist.length + ' done', kv([['Intake', J([fd(s.intakeDate), 'via special ed attorney']), 1], ['Attorney', s.lawyer.name]]) + '<h3>Intake checklist</h3>' + checklist(s.checklist));
    } else if (tab === 'notes') {
      b += sec('notes', 'Notes', s.notes.length + ' entries', '<ol class="tl">' + s.notes.map(function (n) { return '<li><div class="td"><b>' + fd(n.date) + '</b><span class="mut">' + esc(n.by) + '</span></div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
      b += sec('reports', 'Progress reports', s.reports.length + ' reports', s.reports.map(function (r) { return '<div class="rp"><div class="r1"><b>' + esc(r.title) + '</b>' + stp(r.status) + '</div><div class="bkm">' + Jw([esc(r.period), (r.status === 'Draft' ? 'due ' : '') + fd(r.date), esc(r.by)]) + '</div><p>' + esc(r.excerpt) + '</p></div>'; }).join(''));
    }
    return h + '<div class="tabbody" id="tab-' + tab + '">' + b + '</div><p class="foot">Fictional demo record</p>';
  }

  /* ---------- document sample view ---------- */
  function ul(a) { return '<ul class="dl">' + a.map(function (x) { return '<li>' + t(x) + '</li>'; }).join('') + '</ul>'; }
  function tbl(head, rows) { return '<div class="tw2"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + t(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
  function svcList(s) { return s.lines.map(function (l) { return l.svc + ', ' + hrs(l.wk) + ' hrs per week, ' + l.setting.toLowerCase() + ' based'; }); }
  function docBody(s, d) {
    var fn = first(s.name), P = function (h, b) { return '<h3>' + esc(h) + '</h3>' + b; }, p = function (x) { return '<p>' + t(x) + '</p>'; };
    switch (d.type) {
      case 'fofd': return P('Case', kv([['Case number', s.caseNo], ['Hearing date', s.hearingDate], ['Parent attorney', s.lawyer.name + ', ' + s.lawyer.firm], ['School year', '2026-27']])) +
        P('Background', p(fn + ' is ' + s.age + ' years old and in grade ' + s.grade + ' at ' + s.school + '. ' + s.dx)) +
        P('Findings', ul(['The DOE did not offer ' + fn + ' a free appropriate public education for the 2026-27 school year.', 'The services on the IEP do not address ' + fn + "'s needs in the areas shown by the evaluations.", 'The services requested by the parent are appropriate.'])) +
        P('Order', ul(svcList(s).concat(s.comp.map(function (c) { return c[0] + ', bank of ' + c[1] + ' hours'; })).concat(['Services to be provided by a provider of the parent\u0027s choosing at prevailing rates.']))) + '<div class="sig">Impartial Hearing Officer (fictional)<br>' + fd(s.orderDate) + '</div>';
      case 'iep': return P('Present levels', p(s.dx)) + P('Annual goals', ul([fn + ' will request needed items with a phrase in 4 of 5 chances.', fn + ' will follow a 2 step direction in class with one prompt.', fn + ' will complete a classroom task for 10 minutes with no more than 2 reminders.'])) +
        P('Recommended services (IEP)', ul(s.lines.filter(function (l) { return !/BCBA/.test(l.svc); }).map(function (l) { return l.svc + ', ' + Math.max(1, Math.round(l.wk / 2)) + ' x 30 min per week'; }))) + P('Testing accommodations', ul(['Extended time (1.5x)', 'Separate location, small group', 'Breaks every 20 minutes']));
      case 'psych': return P('Tests given', ul(['WISC-V', 'WIAT-4', 'Vineland-3 (parent and teacher)', 'BASC-3'])) +
        P('Scores', tbl(['Area', 'Standard score', 'Range'], [['Verbal comprehension', String(78 + s.age), 'Low average'], ['Visual spatial', String(90 + s.age), 'Average'], ['Working memory', String(74 + s.age), 'Low'], ['Processing speed', String(80 + s.age), 'Low average'], ['Adaptive behavior', String(70 + s.age), 'Low']])) +
        P('Summary', p(fn + ' shows a pattern consistent with ' + s.cls.toLowerCase() + '. ' + s.dx.split('. ')[1] + '. Intensive, individual support is recommended.')) + '<div class="sig">Licensed psychologist (fictional)<br>' + fd(d.date) + '</div>';
      case 'fba': return P('Target behaviors', ul(['Leaving the work area without permission', 'Crying or dropping to the floor at transitions', 'Refusing a task by pushing materials away'])) +
        P('Data', tbl(['Behavior', 'Baseline', 'Now'], [['Leaving area', '6 per hour', '2 per hour'], ['Transition protest', '4 per day', '1 per day'], ['Task refusal', '45%', '18%']])) +
        P('Likely function', p('Escape from non preferred tasks and access to preferred items. Behavior is most likely in the 5 minutes after a transition.')) +
        P('Replacement behaviors', ul(['Ask for a break with a card or words', 'Use a first-then board', 'Wait with a visual timer'])) + '<div class="sig">' + esc(d.by) + '<br>' + fd(d.date) + '</div>';
      case 'speech': return P('Tests given', ul(['CELF-5', 'GFTA-3', 'Language sample, 50 utterances'])) + P('Findings', tbl(['Area', 'Score', 'Range'], [['Receptive language', '74', 'Moderate delay'], ['Expressive language', '69', 'Moderate delay'], ['Articulation', '82', 'Mild delay'], ['Pragmatics', 'Below criterion', 'Delayed']])) +
        P('Recommendation', p('Individual speech therapy, 30 minute sessions, ' + Math.round(s.lines.filter(function (l) { return l.svc === 'Speech'; }).reduce(function (a, l) { return a + l.wk; }, 0) * 2) + ' times per week, focused on functional communication and turn taking.')) + '<div class="sig">' + esc(d.by) + '<br>' + fd(d.date) + '</div>';
      case 'otpt': return P('Tests given', ul(['BOT-2', 'Sensory Profile 2', 'Beery VMI'])) + P('Findings', tbl(['Area', 'Score', 'Range'], [['Fine motor', '71', 'Below average'], ['Visual motor', '76', 'Below average'], ['Gross motor', '68', 'Well below average'], ['Sensory processing', 'Definite difference', 'Atypical']])) +
        P('Recommendation', p('Individual therapy at school to improve motor planning, strength and daily living skills. Home program with weekly updates to the parent.')) + '<div class="sig">' + esc(d.by) + '<br>' + fd(d.date) + '</div>';
      case 'consent': return p('I, ' + s.parent.name + ', give consent for Together They Grow to provide the following services to ' + s.name + ':') + ul(svcList(s)) + p('I understand I can withdraw consent in writing at any time. Session notes and progress reports are shared with my attorney for the hearing.') + '<div class="sig">Signed: ' + esc(s.parent.name) + ', ' + esc(s.parent.rel.toLowerCase()) + '<br>' + fd(d.date) + '</div>';
      case 'hipaa': return p('I authorize Together They Grow to share records about ' + s.name + ' with the people below, for providing and coordinating services and for the impartial hearing.') + ul([s.lawyer.name + ', ' + s.lawyer.firm, s.school + ', school staff', 'NYC DOE implementation unit']) + p('This release expires on 2027-08-31.') + '<div class="sig">' + (d.status === 'Signed' ? 'Signed: ' + esc(s.parent.name) + '<br>' + fd(d.date) : 'Awaiting signature from ' + esc(s.parent.name) + '<br>Sent Sep 29, 2026') + '</div>';
      case 'tx': return P('Goals', tbl(['Goal', 'Baseline', 'Target'], [['Request items with a 2 word phrase', '20%', '80%'], ['Wait for 1 minute with a timer', '10 sec', '60 sec'], ['Transition with a first-then card', '30%', '90%'], ['Follow a 3 step routine at home', '1 step', '3 steps']])) +
        P('Methods', ul(['Discrete trial training and natural environment teaching', 'Token board with 5 tokens', 'Parent training twice a month'])) + P('Hours', p('ABA ' + hrs(s.lines.filter(function (l) { return l.svc === 'ABA'; })[0].wk) + ' hrs per week at home, BCBA supervision ' + hrs((s.lines.filter(function (l) { return /BCBA/.test(l.svc); })[0] || { wk: 0 }).wk) + ' hrs per week.')) + '<div class="sig">' + esc(d.by) + '<br>' + (d.status === 'Draft' ? 'Draft, not yet signed' : fd(d.date)) + '</div>';
      case 'log':
        var rows = [], dd = new Date('2026-10-01T12:00:00');
        while (dd.toISOString().slice(0, 10) <= '2026-10-21') {
          var iso = dd.toISOString().slice(0, 10), dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dd.getDay()];
          s.lines.forEach(function (l) { l.sessions.forEach(function (x) { if (x.d === dn) rows.push([fds(iso), l.svc, first(D.pmap[l.pid].name), String(l.len)]); }); });
          dd.setDate(dd.getDate() + 1);
        }
        return p(rows.length + ' sessions logged Oct 1 to Oct 21.') + tbl(['Date', 'Service', 'Provider', 'Min'], rows);
    }
    return '';
  }
  function vDoc(s, d) {
    return '<article class="paper"><div class="ph"><div class="pt">' + esc(d.name) + '</div><div class="pm">' + Jw([esc(s.name), esc(s.caseNo)]) + '</div></div>' +
      kv([['Student', '<a class="lnk" href="#/students/' + s.id + '">' + esc(s.name) + '</a>', 1], ['From', J([esc(d.by), d.date ? fd(d.date) : 'Not yet signed']), 1], ['Status', stp(d.status), 1]]) + '<div class="pb">' + docBody(s, d) + '</div></article><p class="foot">Sample document, fictional</p>';
  }

  /* ---------- provider ---------- */
  function vProvider(p, tab) {
    var spw = p.lines.reduce(function (a, x) { return a + x.l.sessions.length; }, 0);
    var h = '<section class="sum"><div class="sumh">' + av(p.name, p.color, 'lg') + '<div><h1>' + esc(p.name) + '</h1><p>' + Jw([esc(role(p)), esc(p.discipline)]) + '</p>' + chips(pflags(p).map(function (x) { return pill(x[0], x[1]); })) + '</div></div>' +
      kv([['Students', J([p.students.length + ' students', hw(p.hrsWk)]), 1], ['Sessions', spw + ' per week'], ['License', 'Expires ' + fd(p.licExp), 1], ['Area', p.area]]) + '</section>';
    h += tabs('#/providers/' + p.id, PTABS, tab);
    var b = '';
    if (tab === 'overview') {
      var mine = [];
      if (p.pets.status !== 'Cleared') mine.push(['', 'PETS pending', 'Submitted ' + fd(p.pets.submitted)]);
      if (p.licExp <= addD(D.today, 90)) mine.push(['', 'Renewal due', Jw([esc(p.license), 'expires ' + fd(p.licExp)])]);
      p.sessionNotes.forEach(function (n) { if (!n.signed) mine.push(['#/providers/' + p.id + '/notes', 'Unsigned note', Jw([esc(D.smap[n.sid].name), fds(n.date)])]); });
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', attn(mine));
      b += sec('contact', 'Contact', '', kv([['Phone', tel(p.phone), 1], ['Email', mail(p.email), 1], ['Languages', p.languages], ['Started', p.start]]));
      b += sec('license', 'Discipline and license', '', kv([['Role', Jw([esc(role(p)), esc(p.discipline)]), 1], ['License', p.license], ['Expires', p.licExp], ['Certification', p.cert],
        ['PETS', stp(p.pets.status) + ' ' + (p.pets.status === 'Cleared' ? fd(p.pets.date) : 'submitted ' + fd(p.pets.submitted)), 1]]));
      var done = p.onboarding.filter(function (c) { return c.done; }).length;
      b += sec('onboarding', 'Onboarding', done + ' of ' + p.onboarding.length + ' done', checklist(p.onboarding));
    } else if (tab === 'students') {
      b += sec('students', 'Assigned students', p.students.length + ' students', '<div class="list">' + p.students.map(function (sid) { var s = D.smap[sid], ls = p.lines.filter(function (x) { return x.s.id === sid; }); return row('#/students/' + sid, av(s.name, scol(s)), esc(s.name), rr(Jw(['Gr ' + esc(s.grade), esc(s.borough)])), ls.map(function (x) { return Jw([esc(x.l.svc), hw(x.l.wk), esc(x.l.setting.toLowerCase())]); }).join('; ')); }).join('') + '</div>');
    } else if (tab === 'schedule') {
      b += sec('schedule', 'Weekly schedule', hw(p.hrsWk), '<div class="grid">' + DORD.map(function (d) {
        var bl = p.week[d].slice().sort(function (x, y) { return x.st - y.st; }), tot = bl.reduce(function (a, x) { return a + (x.e - x.st); }, 0) / 60;
        return '<div class="gd"><div class="gl"><b>' + d + '</b><span>' + (bl.length ? hrs(tot) + 'h' : '') + '</span></div><div class="gb">' + (bl.length ? bl.map(function (x) { return '<a class="blk" href="#/students/' + x.s.id + '"><b>' + rng(x.st, x.e) + '</b><span>' + esc(x.s.name) + '<small>' + Jw([esc(x.l.svc), esc(x.l.setting.toLowerCase())]) + '</small></span></a>'; }).join('') : '<div class="off">Off</div>') + '</div></div>';
      }).join('') + '</div>');
    } else if (tab === 'notes') {
      b += sec('sessions', 'Recent session notes', p.sessionNotes.length + ' notes', '<ol class="tl">' + p.sessionNotes.map(function (n) { var s = D.smap[n.sid]; return '<li><div class="td"><b>' + wd(n.date).slice(0, 3) + ', ' + fds(n.date) + '</b><span class="mut">' + Jw([n.time, n.mins + ' min']) + '</span>' + (n.signed ? pill('Signed', 'ok') : pill('Unsigned', 'warn')) + '</div><div class="svp">' + Jw(['<a class="lnk" href="#/students/' + s.id + '">' + esc(s.name) + '</a>', esc(n.svc)]) + '</div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
    }
    return h + '<div class="tabbody" id="tab-' + tab + '">' + b + '</div><p class="foot">Fictional demo record</p>';
  }

  /* ---------- router ---------- */
  var stack = [], pos = {}, repl = false, bk = document.getElementById('bk'), ttl = document.getElementById('ttl'), brand = document.getElementById('brand');
  function parse() { var h = location.hash.replace(/^#\/?/, '').split('/'); return { r: h[0] || 'home', id: h[1], sub: h[2], n: h[3] }; }
  function tabOf(list, sub) { return list.some(function (x) { return x[0] === sub; }) ? sub : 'overview'; }
  function render() {
    var x = parse(), html, title = '', parent = '', nav = x.r;
    if (x.r === 'students' && x.id) {
      var s = D.smap[x.id];
      if (!s) { html = '<p class="empty">Student not found</p>'; parent = '#/students'; }
      else if (x.sub === 'doc') { var d = s.docs.filter(function (k) { return k.id === x.n; })[0]; html = d ? vDoc(s, d) : '<p class="empty">Document not found</p>'; title = d ? d.name : 'Document'; parent = '#/students/' + s.id + '/documents'; }
      else { html = vStudent(s, tabOf(STABS, x.sub)); title = s.name; parent = '#/students'; }
    } else if (x.r === 'providers' && x.id) { var p = D.pmap[x.id]; html = p ? vProvider(p, tabOf(PTABS, x.sub)) : '<p class="empty">Provider not found</p>'; title = p ? p.name : 'Provider'; parent = '#/providers'; }
    else if (x.r === 'students') { html = vStudents(); title = 'Students'; }
    else if (x.r === 'providers') { html = vProviders(); title = 'Providers'; }
    else if (x.r === 'alerts') { html = vAlerts(); title = 'Alerts'; }
    else { html = vHome(); nav = 'home'; }
    view.innerHTML = html;
    bk.hidden = !parent; bk.setAttribute('data-parent', parent); brand.hidden = !!parent; ttl.textContent = parent ? title : ''; ttl.hidden = !parent;
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === nav); });
    var n = A().open, bd = document.getElementById('badge'); if (bd) bd.textContent = n;
    document.title = (title ? title + ' | ' : '') + 'TTG';
    return x;
  }
  function hdr() { return document.querySelector('.top').offsetHeight; }
  function onHash() {
    var h = location.hash || '#/', wasRepl = repl, prevY = window.scrollY; repl = false;
    var isBack = !wasRepl && stack.length > 1 && stack[stack.length - 2] === h;
    if (wasRepl && stack.length) stack[stack.length - 1] = h; else if (isBack) stack.pop(); else stack.push(h);
    var x = render();
    if (x.r === 'alerts' && x.id && document.getElementById(x.id)) { var e = document.getElementById(x.id); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - hdr() - 12); return; }
    if (wasRepl) { var sg = document.querySelector('.seg'); if (sg) { var st = sg.getBoundingClientRect().top + window.scrollY - hdr(); window.scrollTo(0, Math.min(prevY, st)); return; } }
    window.scrollTo(0, isBack && pos[h] ? pos[h] : 0);
  }
  window.addEventListener('scroll', function () { pos[location.hash || '#/'] = window.scrollY; }, { passive: true });
  bk.addEventListener('click', function () { if (stack.length > 1) history.back(); else location.replace(bk.getAttribute('data-parent') || '#/'); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-tab]');
    if (a) { e.preventDefault(); var href = a.getAttribute('href'); if (href === (location.hash || '#/')) { repl = true; onHash(); return; } repl = true; location.replace(href); return; }
    var c = e.target.closest('[data-clear]');
    if (c) { c.getAttribute('data-clear').split(',').forEach(function (k) { Q[k] = ''; }); render(); }
  });
  function refilter(k) { var isS = /^s/.test(k); document.getElementById('res').innerHTML = isS ? sres() : pres(); document.getElementById('clr').innerHTML = clr(isS ? ['s', 'sb', 'ss', 'st'] : ['p', 'pb', 'pr', 'pst']); }
  document.addEventListener('input', function (e) { var k = e.target.getAttribute('data-q'); if (!k) return; Q[k] = e.target.value; refilter(k); });
  document.addEventListener('change', function (e) { var k = e.target.getAttribute('data-q'); if (!k || e.target.tagName !== 'SELECT') return; Q[k] = e.target.value; refilter(k); });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', onHash); onHash();
})();
