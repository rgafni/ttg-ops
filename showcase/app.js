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
  function kv(rows) { return '<dl class="kv">' + rows.filter(function (r) { return r && r[1] !== '' && r[1] != null; }).map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : t(r[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function tel(p) { return '<a class="lnk" href="tel:' + p.replace(/[^\d]/g, '') + '">' + esc(p) + '</a>'; }
  function mail(e) { return '<a class="lnk" href="mailto:' + esc(e) + '">' + esc(e) + '</a>'; }
  function sec(id, title, meta, body) { return '<section class="card" id="' + id + '"><div class="ch"><h2>' + esc(title) + '</h2>' + (meta ? '<span class="cm">' + t(meta) + '</span>' : '') + '</div>' + body + '</section>'; }
  function checklist(items) { return '<ul class="cl">' + items.map(function (c) { return '<li class="' + (c.done ? 'done' : 'open') + '"><span class="box">' + (c.done ? I('check') : '') + '</span><span class="ct"><b>' + esc(c.item) + '</b><span>' + (c.done ? 'Done ' + fd(c.date) : 'Open') + '</span></span></li>'; }).join('') + '</ul>'; }
  function slots(l) { return l.sessions.slice().sort(function (a, b) { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(a.d) - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(b.d); }).map(function (x) { return x.d + ' ' + D.tm(x.s) + ' to ' + D.tm(x.e); }); }
  function role(p) { return p.role === 'Counselor' ? 'LMSW' : p.role; }
  function svcs(s) { return s.lines.map(function (l) { return l.svc; }).filter(function (v) { return v !== 'BCBA supervision'; }); }
  function chips(a) { return '<span class="chips">' + a.join('') + '</span>'; }
  function addD(iso, n) { return D.addDays(iso, n); }
  function soon(iso, days) { return iso > D.today && iso <= addD(D.today, days); }

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
  function arow(href, color, name, line1, chip) { return '<a class="row" href="' + href + '">' + av(name, color) + '<span class="rm"><b>' + esc(name) + '</b><span>' + line1 + '</span>' + (chip ? chips([chip]) : '') + '</span>' + I('chev') + '</a>'; }
  function aRows(k, a, max) {
    var L = a[k].slice(0, max || 99);
    return L.map(function (x) {
      switch (k) {
        case 'banks': return arow('#/students/' + x.s.id + '/services', scol(x.s), x.s.name, esc(x.b.svc) + ', case ' + esc(x.c.num), pill(hrs(x.rem) + ' of ' + hrs(x.b.auth) + ' hrs left', 'warn'));
        case 'pets': return arow('#/providers/' + x.id, x.color, x.name, esc(role(x)) + ', submitted ' + fd(x.pets.submitted), pill('PETS pending', 'warn'));
        case 'docs': return arow('#/students/' + x.s.id + '/doc/' + x.d.id, scol(x.s), x.s.name, esc(x.d.name), stp(x.d.status));
        case 'notes': var s = D.smap[x.n.sid]; return arow('#/providers/' + x.p.id + '/notes', x.p.color, x.p.name, esc(s.name) + ', ' + esc(x.n.svc) + ', ' + fds(x.n.date), pill('Unsigned', 'warn'));
        case 'license': return arow('#/providers/' + x.id, x.color, x.name, esc(x.license) + ', expires ' + fd(x.licExp), pill('Renewal due', 'warn'));
        case 'intake': return arow('#/students/' + x.s.id + '/documents', scol(x.s), x.s.name, esc(x.c.item), pill('Open', 'acc'));
        case 'dates': return arow('#/students/' + x.s.id, scol(x.s), x.s.name, esc(x.h.what), pill(fds(x.h.date), 'acc'));
      }
    }).join('');
  }

  /* ---------- home ---------- */
  function vHome() {
    var a = A(), tot = D.students.reduce(function (n, s) { return n + s.hrsWk; }, 0);
    var h = '<div class="hd"><h1>Today</h1><p class="sub2">' + wd(D.today) + ', ' + fd(D.today) + '</p></div>';
    h += '<div class="stats"><a href="#/students"><b>' + D.students.length + '</b><span>Students</span></a><a href="#/providers"><b>' + D.providers.length + '</b><span>Providers</span></a><a href="#/students"><b>' + hrs(tot) + '</b><span>Hours per week</span></a><a href="#/alerts" class="hot"><b>' + a.open + '</b><span>Open alerts</span></a></div>';
    h += '<section class="card" id="attention"><div class="ch"><h2>Needs attention</h2><a class="more" href="#/alerts">All alerts</a></div><div class="list">' +
      GROUPS.filter(function (g) { return g[0] !== 'dates' && a[g[0]].length; }).map(function (g) { return '<a class="row cat" href="#/alerts/' + g[0] + '"><span class="cnt">' + a[g[0]].length + '</span><span class="rm"><b>' + esc(g[1]) + '</b><span>' + catLine(g[0], a) + '</span></span>' + I('chev') + '</a>'; }).join('') + '</div></section>';
    h += '<section class="card" id="upcoming"><div class="ch"><h2>Upcoming hearing dates</h2><a class="more" href="#/alerts/dates">All ' + a.dates.length + '</a></div><div class="list">' + aRows('dates', a, 4) + '</div></section>';
    h += '<section class="card" id="quick"><div class="ch"><h2>Quick links</h2></div><div class="ql">' +
      [['#/students', 'All students'], ['#/providers', 'All providers'], ['#/alerts/banks', 'Hour banks'], ['#/alerts/docs', 'Pending documents'], ['#/students/S-1001', 'Eli Vantorre'], ['#/providers/P-203/schedule', 'Priya schedule']].map(function (q) { return '<a href="' + q[0] + '">' + esc(q[1]) + '</a>'; }).join('') + '</div></section>';
    return h + '<p class="foot">Fictional demo data</p>';
  }
  function catLine(k, a) {
    var names = function (arr, f) { var n = arr.map(f).filter(function (v, i, x) { return x.indexOf(v) === i; }); return esc(n.slice(0, 2).join(', ') + (n.length > 2 ? ' and ' + (n.length - 2) + ' more' : '')); };
    if (k === 'pets' || k === 'license') return names(a[k], function (p) { return p.name; });
    if (k === 'notes') return names(a[k], function (x) { return x.p.name; });
    return names(a[k], function (x) { return x.s.name; });
  }

  /* ---------- alerts page ---------- */
  function vAlerts() {
    var a = A();
    var h = '<div class="hd"><h1>Alerts</h1><p class="sub2">' + a.open + ' open, ' + a.dates.length + ' dates in the next 60 days</p></div>';
    h += '<nav class="pick" aria-label="Alert groups">' + GROUPS.filter(function (g) { return a[g[0]].length; }).map(function (g) { return '<a href="#/alerts/' + g[0] + '" data-tab="1"><b>' + a[g[0]].length + '</b> ' + esc(g[1].replace('Upcoming hearing dates', 'Dates').replace('Unsigned session notes', 'Unsigned notes').replace('Intake items open', 'Intake open')) + '</a>'; }).join('') + '</nav>';
    GROUPS.forEach(function (g) { if (a[g[0]].length) h += sec(g[0], g[1], a[g[0]].length + '', '<div class="list">' + aRows(g[0], a) + '</div>'); });
    return h;
  }

  /* ---------- lists ---------- */
  var Q = { s: '', sb: '', ss: '', st: '', p: '', pb: '', pr: '', pst: '' };
  var BOR = ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'];
  function sel(k, label, opts) { return '<label class="fl"><span>' + esc(label) + '</span><select data-q="' + k + '"><option value="">All</option>' + opts.map(function (o) { return '<option' + (Q[k] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>'; }
  function srow(s) {
    var f = sflags(s);
    return '<a class="row" href="#/students/' + s.id + '">' + av(s.name, scol(s)) + '<span class="rm"><b>' + esc(s.name) + '</b><span>Grade ' + esc(s.grade) + ', ' + esc(s.borough) + ', ' + hrs(s.hrsWk) + '&nbsp;hrs/wk</span>' +
      chips(f.map(function (x) { return pill(x[0], x[1]); }).concat(svcs(s).map(function (v) { return '<span class="tag">' + esc(v) + '</span>'; }))) + '</span>' + I('chev') + '</a>';
  }
  function prow(p) {
    return '<a class="row" href="#/providers/' + p.id + '">' + av(p.name, p.color) + '<span class="rm"><b>' + esc(p.name) + '</b><span>' + esc(role(p)) + ', ' + p.students.length + ' students, ' + hrs(p.hrsWk) + '&nbsp;hrs/wk</span>' +
      chips(pflags(p).map(function (x) { return pill(x[0], x[1]); })) + '</span>' + I('chev') + '</a>';
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
    return '<p class="count">' + r.length + ' of ' + D.students.length + ' students</p><div class="list">' + (r.map(srow).join('') || '<p class="empty">No matches</p>') + '</div>';
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
    return '<p class="count">' + r.length + ' of ' + D.providers.length + ' providers</p><div class="list">' + (r.map(prow).join('') || '<p class="empty">No matches</p>') + '</div>';
  }
  function clr(keys) { return keys.some(function (k) { return Q[k]; }) ? '<button type="button" class="clr" data-clear="' + keys.join(',') + '">Clear filters</button>' : ''; }
  function vStudents() {
    return '<div class="hd"><h1>Students</h1></div><input class="search" type="search" data-q="s" placeholder="Search name, school, provider" value="' + esc(Q.s) + '" autocomplete="off">' +
      '<div class="filters">' + sel('sb', 'Borough', BOR) + sel('ss', 'Service', ['ABA', 'BCBA supervision', 'Speech', 'OT', 'PT', 'SETSS', 'Counseling']) + sel('st', 'Status', ['On track', 'Low hours', 'Docs open', 'Intake open']) + '<div id="clr">' + clr(['s', 'sb', 'ss', 'st']) + '</div></div>' +
      '<div id="res">' + sres() + '</div>';
  }
  function vProviders() {
    return '<div class="hd"><h1>Providers</h1></div><input class="search" type="search" data-q="p" placeholder="Search name, discipline, language" value="' + esc(Q.p) + '" autocomplete="off">' +
      '<div class="filters">' + sel('pb', 'Borough', BOR) + sel('pr', 'Role', ['BCBA', 'RBT', 'SLP', 'OT', 'PT', 'SETSS', 'LMSW']) + sel('pst', 'Status', ['PETS cleared', 'PETS pending', 'Onboarding open', 'Renewal due', 'Unsigned note']) + '<div id="clr">' + clr(['p', 'pb', 'pr', 'pst']) + '</div></div>' +
      '<div id="res">' + pres() + '</div>';
  }

  /* ---------- profile shell ---------- */
  function tabs(base, list, cur) { return '<nav class="seg" aria-label="Sections">' + list.map(function (x) { return '<a href="' + base + (x[0] === 'overview' ? '' : '/' + x[0]) + '" data-tab="' + x[0] + '"' + (x[0] === cur ? ' class="on" aria-current="page"' : '') + '>' + esc(x[1]) + '</a>'; }).join('') + '</nav>'; }
  function facts(rows) { return '<dl class="sf">' + rows.map(function (r) { return '<div' + (r[3] ? ' class="w"' : '') + '><dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : esc(r[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  var STABS = [['overview', 'Overview'], ['services', 'Services'], ['documents', 'Documents'], ['notes', 'Notes']];
  var PTABS = [['overview', 'Overview'], ['students', 'Students'], ['schedule', 'Schedule'], ['notes', 'Notes']];

  /* ---------- student ---------- */
  function vStudent(s, tab) {
    var nd = nextDate(s), lb = banksOf(s).sort(function (x, y) { return x.frac - y.frac; })[0];
    var h = '<section class="sum"><div class="sumh">' + av(s.name, scol(s), 'lg') + '<div><h1>' + esc(s.name) + '</h1><p>Age ' + s.age + ', grade ' + esc(s.grade) + '</p><p>' + esc(s.school) + '</p>' + chips(sflags(s).map(function (x) { return pill(x[0], x[1]); })) + '</div></div>' +
      facts([['Weekly hours', hrs(s.hrsWk) + ' hrs, ' + s.lines.length + ' services'], ['Team', s.team.length + ' providers'], ['Borough', s.borough], ['Classification', s.cls], ['Next date', nd ? fds(nd.date) + ', ' + nd.what.toLowerCase() : 'None', 0, 1], ['Lowest bank', hrs(lb.rem) + ' of ' + hrs(lb.b.auth) + ' hrs left, ' + lb.b.svc, 0, 1]]) + '</section>';
    h += tabs('#/students/' + s.id, STABS, tab);
    var b = '';
    if (tab === 'overview') {
      var mine = [];
      lowBanks(s).forEach(function (x) { mine.push(['#/students/' + s.id + '/services', 'Low hour bank', esc(x.b.svc) + ', ' + hrs(x.rem) + ' of ' + hrs(x.b.auth) + ' hrs left']); });
      openDocs(s).forEach(function (d) { mine.push(['#/students/' + s.id + '/doc/' + d.id, d.status, esc(d.name)]); });
      openIntake(s).forEach(function (c) { mine.push(['#/students/' + s.id + '/documents', 'Intake open', esc(c.item)]); });
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', '<div class="list">' + mine.map(function (m) { return '<a class="row cat" href="' + m[0] + '"><span class="rm"><b>' + esc(m[1]) + '</b><span>' + m[2] + '</span></span>' + I('chev') + '</a>'; }).join('') + '</div>');
      b += sec('profile', 'Profile', '', kv([['Age', s.age + ' (born ' + fd(s.dob) + ')'], ['Grade', s.grade], ['School', s.school], ['District', s.district], ['Borough', s.borough], ['Classification', s.cls]]) +
        '<div class="para"><div class="pl">Diagnosis summary</div><p>' + esc(s.dx) + '</p></div>' +
        '<h3>Parent contact</h3>' + kv([['Name', s.parent.name + ', ' + s.parent.rel.toLowerCase()], ['Phone', tel(s.parent.phone), 1], ['Email', mail(s.parent.email), 1], ['Language', s.parent.lang]]) +
        (s.parent2 ? kv([['Second parent', s.parent2.name + ', ' + s.parent2.rel.toLowerCase()], ['Phone', tel(s.parent2.phone), 1]]) : ''));
      b += sec('team', 'Team', s.team.length + ' providers', '<div class="list">' + s.team.map(function (pid) { var p = D.pmap[pid]; var ls = s.lines.filter(function (l) { return l.pid === pid; }); return '<a class="row" href="#/providers/' + pid + '">' + av(p.name, p.color) + '<span class="rm"><b>' + esc(p.name) + '</b><span>' + esc(role(p)) + ', ' + esc(ls.map(function (l) { return l.svc + ' ' + hrs(l.wk) + ' hrs/wk'; }).join(', ')) + '</span><span>' + esc(p.phone) + '</span></span>' + I('chev') + '</a>'; }).join('') +
        '<div class="row static">' + av(s.lawyer.name, '#57534e') + '<span class="rm"><b>' + esc(s.lawyer.name) + '</b><span>Attorney, ' + esc(s.lawyer.firm) + '</span><span>' + esc(s.lawyer.phone) + '</span></span></div></div>');
      b += sec('case', 'Case', '', kv([['Case number', s.caseNo], ['Hearing date', s.hearingDate], ['Order date', s.orderDate], ['Attorney', s.lawyer.name], ['Firm', s.lawyer.firm], ['Attorney phone', tel(s.lawyer.phone), 1]]) +
        '<div class="para"><div class="pl">Hearing outcome</div><p>' + esc(s.outcome) + '</p></div>');
      b += sec('hearings', 'Hearing dates', s.hearings.length + ' dates', '<ol class="tl">' + s.hearings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return '<li class="' + (x.date > D.today ? 'future' : '') + '"><div class="td">' + fd(x.date) + ' ' + stp(x.status) + '</div><div class="tw">' + esc(x.what) + '</div><p>' + t(x.detail) + '</p></li>'; }).join('') + '</ol>');
    } else if (tab === 'services') {
      b += sec('services', 'Service lines', hrs(s.hrsWk) + ' hrs per week', s.lines.map(function (l) {
        var p = D.pmap[l.pid];
        return '<div class="sub"><div class="subh"><b>' + esc(l.svc) + '</b>' + pill(hrs(l.wk) + ' hrs/wk', 'acc') + '</div>' + kv([['Provider', '<a class="lnk" href="#/providers/' + p.id + '">' + esc(p.name) + ', ' + esc(role(p)) + '</a>', 1], ['Weekly hours', hrs(l.wk) + ' hrs, ' + l.sessions.length + ' sessions of ' + l.len + ' min'], ['Setting', l.setting], ['Start', l.start], ['End', l.end], ['Authorization', l.ai + ', case ' + l.caseNo], ['Schedule', slots(l).map(esc).join('<br>'), 1]]) + '</div>';
      }).join(''));
      b += sec('cases', 'Hour banks', s.cases.length + (s.cases.length > 1 ? ' cases' : ' case'), s.cases.map(function (c) {
        return '<div class="sub"><div class="subh"><b>Case ' + esc(c.num) + '</b>' + stp(c.status) + '</div><p class="muted">' + t(c.basis) + '. SY ' + esc(c.sy) + '.</p><p class="muted">Window: ' + t(c.window) + '</p>' + c.banks.map(function (b) {
          var rem = b.auth - b.used, pct = Math.round(b.used / b.auth * 100), low = rem / b.auth < LOW;
          return '<div class="bank' + (low ? ' low' : '') + '"><div class="bt"><b>' + esc(b.svc) + (low ? ' ' + pill('Low', 'warn') : '') + '</b><span>' + esc(D.pmap[b.pid].name) + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="nums"><div><b>' + hrs(b.auth) + '</b><span>authorized</span></div><div><b>' + hrs(b.used) + '</b><span>used</span></div><div><b>' + hrs(rem) + '</b><span>remaining</span></div></div></div>';
        }).join('') + '</div>';
      }).join(''));
    } else if (tab === 'documents') {
      b += sec('docs', 'Documents', s.docs.length + ' on file', '<div class="list">' + s.docs.map(function (d) { return '<a class="row doc" href="#/students/' + s.id + '/doc/' + d.id + '">' + I('doc') + '<span class="rm"><b>' + esc(d.name) + '</b><span>' + (d.date ? fd(d.date) + ', ' : '') + esc(d.by) + '</span>' + chips([stp(d.status)]) + '</span>' + I('chev') + '</a>'; }).join('') + '</div>');
      var done = s.checklist.filter(function (c) { return c.done; }).length;
      b += sec('intake', 'Intake', done + ' of ' + s.checklist.length + ' done', kv([['Intake date', s.intakeDate], ['Referral source', 'Special ed attorney'], ['Attorney', s.lawyer.name]]) + '<h3>Intake checklist</h3>' + checklist(s.checklist));
    } else if (tab === 'notes') {
      b += sec('notes', 'Notes', s.notes.length + ' entries', '<ol class="tl">' + s.notes.map(function (n) { return '<li><div class="td">' + fd(n.date) + '</div><div class="tw">' + esc(n.by) + '</div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
      b += sec('reports', 'Progress reports', s.reports.length + ' reports', s.reports.map(function (r) { return '<div class="sub"><div class="subh"><b>' + esc(r.title) + '</b>' + stp(r.status) + '</div><p class="muted">' + esc(r.period) + ', ' + (r.status === 'Draft' ? 'due ' : '') + fd(r.date) + ', ' + esc(r.by) + '</p><blockquote>' + esc(r.excerpt) + '</blockquote></div>'; }).join(''));
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
    return '<article class="paper"><div class="ph"><div class="pt">' + esc(d.name) + '</div><div class="pm">' + esc(s.name) + '</div></div>' +
      kv([['Student', '<a class="lnk" href="#/students/' + s.id + '">' + esc(s.name) + '</a>', 1], ['Date', d.date || 'Not yet signed'], ['From', d.by], ['Status', stp(d.status), 1]]) + '<div class="pb">' + docBody(s, d) + '</div></article><p class="foot">Sample document, fictional</p>';
  }

  /* ---------- provider ---------- */
  function vProvider(p, tab) {
    var spw = p.lines.reduce(function (a, x) { return a + x.l.sessions.length; }, 0);
    var h = '<section class="sum"><div class="sumh">' + av(p.name, p.color, 'lg') + '<div><h1>' + esc(p.name) + '</h1><p>' + esc(role(p)) + ', ' + esc(p.discipline) + '</p>' + chips(pflags(p).map(function (x) { return pill(x[0], x[1]); })) + '</div></div>' +
      facts([['Students', p.students.length + ''], ['Weekly hours', hrs(p.hrsWk) + ' hrs, ' + spw + ' sessions'], ['License expires', fd(p.licExp), 0, 1], ['Service area', p.area, 0, 1], ['Phone', tel(p.phone), 1, 1]]) + '</section>';
    h += tabs('#/providers/' + p.id, PTABS, tab);
    var b = '';
    if (tab === 'overview') {
      var mine = [];
      if (p.pets.status !== 'Cleared') mine.push(['#/providers/' + p.id + '#onboarding', 'PETS pending', 'Submitted ' + fd(p.pets.submitted)]);
      if (p.licExp <= addD(D.today, 90)) mine.push(['#/providers/' + p.id + '#license', 'Renewal due', esc(p.license) + ', expires ' + fd(p.licExp)]);
      p.sessionNotes.forEach(function (n) { if (!n.signed) mine.push(['#/providers/' + p.id + '/notes', 'Unsigned note', esc(D.smap[n.sid].name) + ', ' + fds(n.date)]); });
      if (mine.length) b += sec('alerts', 'Needs attention', mine.length + '', '<div class="list">' + mine.map(function (m) { return '<div class="row cat static"><span class="rm"><b>' + esc(m[1]) + '</b><span>' + m[2] + '</span></span></div>'; }).join('') + '</div>');
      b += sec('contact', 'Contact', '', '<div class="acts"><a class="btn" href="tel:' + p.phone.replace(/[^\d]/g, '') + '">' + I('phone') + 'Call</a><a class="btn" href="mailto:' + esc(p.email) + '">' + I('mail') + 'Email</a></div>' +
        kv([['Phone', tel(p.phone), 1], ['Email', mail(p.email), 1], ['Service area', p.area], ['Languages', p.languages], ['Start date', p.start]]));
      b += sec('license', 'Discipline and license', '', kv([['Discipline', p.discipline], ['Role', role(p)], ['License number', p.license], ['Certification', p.cert], ['License expires', p.licExp], ['PETS clearance', stp(p.pets.status), 1], ['PETS cleared on', p.pets.date], ['PETS submitted', p.pets.status === 'Cleared' ? '' : p.pets.submitted]]));
      var done = p.onboarding.filter(function (c) { return c.done; }).length;
      b += sec('onboarding', 'Onboarding', done + ' of ' + p.onboarding.length + ' done', checklist(p.onboarding));
    } else if (tab === 'students') {
      b += sec('students', 'Assigned students', p.students.length + ' students', '<div class="list">' + p.students.map(function (sid) { var s = D.smap[sid], ls = p.lines.filter(function (x) { return x.s.id === sid; }); return '<a class="row" href="#/students/' + sid + '">' + av(s.name, scol(s)) + '<span class="rm"><b>' + esc(s.name) + '</b><span>' + esc(ls.map(function (x) { return x.l.svc + ', ' + hrs(x.l.wk) + ' hrs/wk, ' + x.l.setting.toLowerCase(); }).join('; ')) + '</span><span>' + esc(s.borough) + ', grade ' + esc(s.grade) + '</span></span>' + I('chev') + '</a>'; }).join('') + '</div>');
    } else if (tab === 'schedule') {
      b += sec('schedule', 'Weekly schedule', hrs(p.hrsWk) + ' hrs per week', '<div class="grid">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) {
        var bl = p.week[d], tot = bl.reduce(function (a, x) { return a + (x.e - x.st); }, 0) / 60;
        return '<div class="gd"><div class="gl"><b>' + d + '</b><span>' + (bl.length ? hrs(tot) + ' h' : '') + '</span></div><div class="gb">' + (bl.length ? bl.map(function (x) { return '<a class="blk" href="#/students/' + x.s.id + '"><b>' + D.tm(x.st) + ' to ' + D.tm(x.e) + '</b><span>' + esc(x.s.name) + '</span><span>' + esc(x.l.svc) + ', ' + esc(x.l.setting.toLowerCase()) + '</span></a>'; }).join('') : '<div class="off">Off</div>') + '</div></div>';
      }).join('') + '</div>');
    } else if (tab === 'notes') {
      b += sec('sessions', 'Recent session notes', p.sessionNotes.length + ' notes', '<ol class="tl">' + p.sessionNotes.map(function (n) { var s = D.smap[n.sid]; return '<li><div class="td">' + wd(n.date) + ', ' + fd(n.date) + ' ' + (n.signed ? pill('Signed', 'ok') : pill('Unsigned', 'warn')) + '</div><div class="tw"><a class="lnk" href="#/students/' + s.id + '">' + esc(s.name) + '</a>, ' + esc(n.svc) + ', ' + n.time + ', ' + n.mins + ' min</div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
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
