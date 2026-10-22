/* TTG showcase. Fictional demo data only. */
(function () {
  var D = window.SC, A = window.SCA = {};
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fd(iso) { var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
  function t(s) { return esc(s).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, function (m) { return fd(m); }); }
  function n(x) { return Number(x).toLocaleString('en-US'); }
  var IC = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    students: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    providers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.4 0 4.2 1.6 4.5 4.5"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', back: '<path d="m15 6-6 6 6 6"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', dot: '<circle cx="12" cy="12" r="4"/>'
  };
  function ic(k, c) { return '<svg class="' + (c || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + '</svg>'; }
  var COLORS = ['#c2500a', '#9a3412', '#b45309', '#be123c', '#a16207', '#7c2d12', '#ea580c', '#92400e', '#b91c1c', '#c2410c'];
  function ini(name) { return name.replace(/^Dr\. /, '').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join(''); }
  function av(name, color, c) { return '<span class="av ' + (c || '') + '" style="background:' + color + '">' + esc(ini(name)) + '</span>'; }
  function scol(s) { return COLORS[(+s.id.slice(-2) - 1) % COLORS.length]; }
  function pill(txt, k) { return '<span class="pill ' + (k || '') + '">' + t(txt) + '</span>'; }
  function spill(st) {
    var k = /^(Active|On file|Received|Complete|Ready|Sent to DOE|Linked|Cleared|Signed)/.test(st) ? 'ok' : /^(Blocked|Missing)/.test(st) ? 'bad' : /^(Ended|Closed|Exhausted)/.test(st) ? '' : 'warn';
    return pill(st, k);
  }
  function kv(rows) { return '<dl class="kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : t(r[1])) + '</dd></div>'; }).join('') + '</dl>'; }
  function sec(id, num, title, meta, body, open) {
    return '<details class="sec" id="' + id + '"' + (open ? ' open' : '') + '><summary><span class="num">' + num + '</span><span class="stt"><b>' + esc(title) + '</b><span>' + t(meta) + '</span></span>' + ic('down', 'tog') + '</summary><div class="body">' + body + '</div></details>';
  }
  function check(name, sub, st) {
    var ok = /^(On file|Received|Ready|Signed|Cleared)/.test(st);
    return '<div class="item"><span class="ck ' + (ok ? 'ok' : 'warn') + '">' + ic(ok ? 'check' : 'dot') + '</span><div class="im"><div class="it">' + t(name) + '</div><div class="is">' + t(sub) + '</div></div>' + spill(st) + '</div>';
  }
  function bar(used, max, done) { var p = max ? Math.min(100, Math.round(used / max * 100)) : 0; return '<div class="bar' + (done ? ' done' : '') + '"><i style="width:' + p + '%"></i></div>'; }
  function plink(pid) { var p = D.pmap[pid]; return p ? '<a href="#/providers/' + p.id + '">' + esc(p.name) + '</a>' : esc(pid); }
  function slink(s) { return '<a href="#/students/' + s.id + '">' + esc(s.name) + '</a>'; }
  function plural(k, w) { return k + ' ' + w + (k === 1 ? '' : 's'); }
  A.esc = esc; A.t = t; A.fd = fd; A.n = n; A.ic = ic; A.av = av; A.scol = scol; A.pill = pill; A.spill = spill; A.kv = kv; A.sec = sec; A.check = check; A.bar = bar; A.plink = plink; A.slink = slink; A.plural = plural;

  function srow(s) {
    var provs = s.active.map(function (l) { return l.pid; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return '<a class="row" href="#/students/' + s.id + '">' + av(s.name, scol(s)) + '<div class="rmain"><div class="rname">' + esc(s.name) + '</div><div class="rsub">Grade ' + esc(s.grade) + ', ' + esc(s.school.name) + '</div><div class="pills">' +
      pill(s.hrsWk + ' hrs/wk') + pill(plural(provs.length, 'provider')) + (s.attention.length ? pill(plural(s.attention.length, 'alert'), 'warn') : pill('On track', 'ok')) + '</div></div>' + ic('chev', 'chev') + '</a>';
  }
  function prow(p) {
    return '<a class="row" href="#/providers/' + p.id + '">' + av(p.name, p.color) + '<div class="rmain"><div class="rname">' + esc(p.name) + '</div><div class="rsub">' + esc(p.role) + ', ' + esc(p.area) + '</div><div class="pills">' +
      pill(plural(p.activeStudents.length, 'student')) + pill('PETS cleared', 'ok') + (p.intake === 'Complete' ? pill('Intake complete', 'ok') : pill('Intake in progress', 'warn')) + '</div></div>' + ic('chev', 'chev') + '</a>';
  }
  var V = A.V = {};
  V.home = function () {
    var st = D.stats;
    return '<h1>Overview</h1><p class="sub">' + D.month + '</p><div class="stats">' +
      '<a class="stat" href="#/students"><b>' + st.students + '</b><span>Students</span></a>' +
      '<a class="stat" href="#/providers"><b>' + st.providers + '</b><span>Providers</span></a>' +
      '<div class="stat"><b>' + st.intakeDone + '<span class="of"> of ' + st.intakeAll + '</span></b><span>Intake complete</span>' + bar(st.intakeDone, st.intakeAll) + '</div>' +
      '<div class="stat"><b>' + n(st.hrsUsed) + '</b><span>Hours used of ' + n(st.hrsAuth) + ' authorized</span>' + bar(st.hrsUsed, st.hrsAuth) + '</div></div>' +
      '<div class="hrow"><h2>Students</h2><a href="#/students">See all</a></div><div class="list">' + D.students.slice(0, 5).map(srow).join('') + '</div>' +
      '<div class="hrow"><h2>Providers</h2><a href="#/providers">See all</a></div><div class="list">' + D.providers.slice(0, 5).map(prow).join('') + '</div>';
  };
  var F = A.F = { sq: '', sc: 'All', pq: '', pc: 'All' };
  var SCH = { All: function () { return true; }, 'Needs attention': function (s) { return s.attention.length; }, School: function (s) { return s.active.some(function (l) { return /School|Preschool/.test(l.setting); }); }, Home: function (s) { return s.active.some(function (l) { return /Home/.test(l.setting); }); }, Pendency: function (s) { return s.cases.some(function (c) { return /Pendency/.test(c.basis) && c.status !== 'Closed'; }); } };
  var PCH = { All: function () { return true; }, BCBA: function (p) { return p.role === 'BCBA'; }, RBT: function (p) { return p.role === 'RBT'; }, 'Related services': function (p) { return ['SLP', 'OT', 'PT', 'Counselor', 'AT trainer'].indexOf(p.role) >= 0; }, 'Intake in progress': function (p) { return p.intake !== 'Complete'; } };
  function chips(map, cur, key) { return '<div class="chips">' + Object.keys(map).map(function (k) { return '<button class="chip' + (k === cur ? ' on' : '') + '" data-chip="' + key + '" data-v="' + k + '">' + k + '</button>'; }).join('') + '</div>'; }
  V.studentsBody = function () {
    var q = F.sq.toLowerCase(), r = D.students.filter(SCH[F.sc]).filter(function (s) { return !q || (s.name + ' ' + s.tag + ' ' + s.school.name + ' ' + s.team.map(function (p) { return D.pmap[p].name; }).join(' ')).toLowerCase().indexOf(q) >= 0; });
    return '<p class="count">' + plural(r.length, 'student') + '</p><div class="list">' + (r.map(srow).join('') || '<p class="sub">No matches</p>') + '</div>';
  };
  V.students = function () { return '<h1>Students</h1><p class="sub">' + plural(D.students.length, 'active student') + '</p><input class="search" id="q" data-q="sq" placeholder="Search name, school or provider" value="' + esc(F.sq) + '">' + chips(SCH, F.sc, 'sc') + '<div id="res">' + V.studentsBody() + '</div>'; };
  V.providersBody = function () {
    var q = F.pq.toLowerCase(), r = D.providers.filter(PCH[F.pc]).filter(function (p) { return !q || (p.name + ' ' + p.role + ' ' + p.discipline + ' ' + p.area).toLowerCase().indexOf(q) >= 0; });
    return '<p class="count">' + plural(r.length, 'provider') + '</p><div class="list">' + (r.map(prow).join('') || '<p class="sub">No matches</p>') + '</div>';
  };
  V.providers = function () { return '<h1>Providers</h1><p class="sub">' + plural(D.providers.length, 'provider') + ' on file</p><input class="search" id="q" data-q="pq" placeholder="Search name, role or area" value="' + esc(F.pq) + '">' + chips(PCH, F.pc, 'pc') + '<div id="res">' + V.providersBody() + '</div>'; };
})();
(function () {
  var D = window.SC, A = window.SCA, V = A.V, esc = A.esc, t = A.t, kv = A.kv, sec = A.sec, pill = A.pill, spill = A.spill, check = A.check, bar = A.bar, plink = A.plink, n = A.n, plural = A.plural;
  function back(h, l) { return '<a class="back" href="' + h + '">' + A.ic('back') + esc(l) + '</a>'; }
  function grp(x) { return '<div class="grp">' + esc(x) + '</div>'; }
  function lineCard(l) {
    var done = /Ended|Complete|Exhausted/.test(l.status), unit = l.type === 'Flat fee' ? 'delivery' : 'session';
    return '<div class="box"><div class="bh"><div class="im"><div class="it" style="font-size:18px;font-weight:650">' + esc(l.label) + '</div><div class="mono">' + esc(l.tag) + '</div></div>' + spill(l.status) + '</div>' +
      '<div class="usage"><span><b>' + n(l.used) + '</b> of ' + n(l.max) + ' ' + unit + 's used</span><span>' + (l.type === 'Flat fee' ? 'Delivered' : n(l.remaining) + ' left') + '</span></div>' + bar(l.used, l.max, done) +
      '<dl class="lgrid"><div><dt>AI #</dt><dd>' + esc(l.ai) + (l.aiPending ? ' (pending)' : '') + '</dd></div><div><dt>Funding</dt><dd>' + esc(l.funding) + '</dd></div><div><dt>Setting</dt><dd>' + esc(l.setting) + '</dd></div>' +
      '<div><dt>Type</dt><dd>' + esc(l.type) + '</dd></div><div><dt>Session length</dt><dd>' + (l.len ? l.len + ' min' : 'Flat fee') + '</dd></div><div><dt>Rate</dt><dd>$' + n(l.rate) + (l.type === 'Flat fee' ? ' flat' : ' per session') + '</dd></div>' +
      '<div class="full"><dt>Window</dt><dd>' + t(l.window) + '</dd></div><div class="full"><dt>Provider</dt><dd>' + plink(l.pid) + (l.note ? ' <span class="is">(' + t(l.note) + ')</span>' : '') + '</dd></div>' +
      (l.days && !done ? '<div class="full"><dt>Schedule</dt><dd>' + esc(l.days.replace(/ /g, ', ')) + ', ' + esc(l.time) + '</dd></div>' : '') + '</dl></div>';
  }
  V.student = function (id) {
    var s = D.smap[id]; if (!s) return back('#/students', 'Students') + '<p class="sub">Student not found</p>';
    var lines = s.lines, openCases = s.cases.filter(function (c) { return c.status !== 'Closed'; }).length, teamNow = s.active.map(function (l) { return l.pid; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var h = back('#/students', 'Students') + '<div class="hero"><div class="top1">' + A.av(s.name, A.scol(s), 'lg') + '<div><h1>' + esc(s.name) + '</h1><div class="meta">' + esc(s.tag) + ', age ' + s.age + ', grade ' + esc(s.grade) + '</div></div></div>' +
      '<div class="pills" style="margin-top:14px">' + pill('Active', 'ok') + pill('Intake complete', 'ok') + pill('Ensora linked', 'ok') + pill(s.cls, 'acc') + '</div>' +
      (s.attention.length ? '<div class="alerts">' + s.attention.map(function (a) { return '<div>' + t(a) + '</div>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="qf"><div><b>' + s.hrsWk + '</b><span>Hours per week</span></div><div><b>' + s.active.length + '</b><span>Active lines</span></div><div><b>' + teamNow.length + '</b><span>Providers</span></div><div><b>' + t(s.progress.next).replace(/, \d{4}$/, '') + '</b><span>Next report</span></div></div>';
    h += sec('s1', '1', 'Student', s.cls + ', ' + s.school.name, kv([['Internal student ID', s.id], ['Tag prefix', s.tag], ['Name', s.name], ['DOE Student ID / OSIS #', s.osis], ['Date of birth / age', A.fd(s.dob) + ', age ' + s.age, 1], ['Primary classification', s.cls], ['Grade', s.grade], ['Home address', s.addr], ['Language at home', s.lang], ['Attends school', s.attends], ['Status', spill(s.status), 1]]) +
      grp('Guardian') + kv([['Name', s.guardian.name], ['Relationship', s.guardian.rel], ['Phone', '<a href="tel:' + s.guardian.phone + '">' + s.guardian.phone + '</a>', 1], ['Email', '<a href="mailto:' + s.guardian.email + '">' + s.guardian.email + '</a>', 1], ['Language', s.guardian.lang]]) +
      grp('Law firm') + kv([['Firm', s.lawyer.firm], ['Attorney', s.lawyer.name], ['Phone', s.lawyer.phone], ['Email', s.lawyer.email]]) +
      grp('School / placement, SY 2026-27') + kv([['School', s.school.name], ['Address', s.school.addr], ['Hours', s.school.hours], ['Contact', s.school.contact + ', ' + s.school.title], ['Contact phone', s.school.phone]]), true);
    h += sec('s1a', '1a', 'Intake info', 'Complete, ' + A.fd(s.intake.date), kv([['Intake date', s.intake.date], ['Source', s.intake.source], ['Settings where services happen', s.intake.settings], ['School name / address', s.school.name + ', ' + s.school.addr], ['School contact', s.school.contact + ', ' + s.school.title], ['Weekly schedule (current)', s.schedule.map(esc).join('<br>'), 1], ['Scheduled hours per week', s.hrsWk + ' hrs'], ['Related services', s.intake.related], ['Allergies / safety notes', s.intake.allergies], ['Consents on file', s.intake.consents]]) +
      grp('Intake papers') + '<div class="items">' + s.intake.papers.map(function (p) { return check(p.name, 'Received ' + p.date, p.status); }).join('') + '</div>');
    h += sec('s1b', '1b', 'Student documents', s.docs.length + ' on file, carry across cases', '<div class="items">' + s.docs.map(function (d) { return check(d.name, d.ver, d.status); }).join('') + '</div>');
    h += sec('s2', '2', 'Cases', plural(s.cases.length, 'case') + ', ' + openCases + ' open', s.cases.map(function (c) {
      return '<div class="box"><div class="bh"><div class="im"><div class="it" style="font-size:18px;font-weight:650"><span class="tagc">' + c.tag + '</span>' + esc(c.num) + '</div><div class="is">SY ' + esc(c.sy) + ', ' + esc(c.note) + '</div></div>' + spill(c.status) + '</div>' +
        '<dl class="lgrid"><div class="full"><dt>Order / basis</dt><dd>' + esc(c.basis) + '</dd></div><div><dt>Order date</dt><dd>' + t(c.orderDate) + '</dd></div><div><dt>Service lines</dt><dd>' + c.lineCount + '</dd></div><div class="full"><dt>Service window</dt><dd>' + t(c.window) + '</dd></div></dl></div>';
    }).join(''));
    h += sec('s2a', '2a', 'Case documents', 'New set per case number', s.cases.map(function (c) { return grp(c.tag + ' ' + c.num) + '<div class="items">' + c.docs.map(function (d) { return check(d.name, d.val, d.status); }).join('') + '</div>'; }).join(''));
    h += sec('s3', '3', 'Service lines', plural(lines.length, 'line') + ', ' + s.active.length + ' active', s.cases.map(function (c) { return grp(c.tag + ' ' + c.num + ', SY ' + c.sy) + lines.filter(function (l) { return l.case === c.tag; }).map(lineCard).join(''); }).join(''));
    var team = s.team.map(function (pid) { var p = D.pmap[pid], ls = lines.filter(function (l) { return l.pid === pid; });
      return '<a class="item" href="#/providers/' + pid + '" style="align-items:center">' + A.av(p.name, p.color, 'sm') + '<div class="im"><div class="it">' + esc(p.name) + '</div><div class="is">' + esc(p.id) + ', ' + esc(p.role) + '</div><div class="is">' + ls.map(function (l) { return esc(l.tag) + (/Ended|Complete|Exhausted/.test(l.status) ? ' (' + l.status.toLowerCase() + ')' : ''); }).join('<br>') + '</div></div>' + A.ic('chev', 'chev') + '</a>'; }).join('');
    (s.formerTeam || []).forEach(function (f) { team += '<div class="item" style="align-items:center">' + A.av(f.name, '#a8a29e', 'sm') + '<div class="im"><div class="it">' + esc(f.name) + '</div><div class="is">P-007, ' + esc(f.role) + ', left ' + t(f.left) + '</div><div class="is">' + esc(f.lines) + '</div></div>' + pill('Former') + '</div>'; });
    h += sec('s3a', '3a', 'Provider team', plural(s.team.length + (s.formerTeam || []).length, 'provider'), '<div class="items">' + team + '</div>');
    var tot = s.billing.reduce(function (a, b) { return a + b.amount; }, 0);
    h += sec('s4', '4', 'Monthly billing', D.month + ', ' + plural(s.billing.length, 'invoice'), '<div class="items">' + s.billing.map(function (b) {
      return '<div class="item"><div class="im"><div class="it">' + esc(b.line) + '</div><div class="is">' + D.pmap[b.pid].name + ', ' + b.caseTag + ' AI ' + b.ai + '</div><div class="is">' + b.sessions + ' sessions, ' + b.hrs + ' hrs, billed ' + b.billed + ', $' + n(b.amount) + '</div><div class="is">Signed: ' + b.sign + '</div></div>' + spill(b.status) + '</div>';
    }).join('') + '</div><div class="total"><span>Total this month</span><b>$' + n(tot) + '</b></div>');
    h += sec('s5', '5', 'Notes and records', plural(s.notes.length, 'note') + ', Ensora linked', grp('Ensora') + kv([['Profile', spill(s.ensora.profile), 1], ['Ensora client ID', s.ensora.client], ['Sessions synced this school year', String(s.ensora.synced)], ['Unsigned session notes', s.ensora.unsigned ? spill(plural(s.ensora.unsigned, 'unsigned note')) : spill('Signed, all current'), 1], ['Last sync', s.ensora.lastSync], ['Graphs updated', s.ensora.graphs]]) +
      grp('Case notes') + '<div class="items tl">' + s.notes.map(function (x) { return '<div class="item"><div class="im"><div class="is">' + t(x.date) + ', ' + esc(x.who) + ', ' + esc(x.type) + '</div><div class="it" style="font-weight:500">' + t(x.text) + '</div></div></div>'; }).join('') + '</div>');
    var pr = s.progress;
    h += sec('s5a', '5a', 'Progress reports', 'Next due ' + A.fd(pr.next), grp('History') + '<div class="items">' + pr.history.map(function (x) { return check(x.period, x.date + ', ' + x.by, x.status); }).join('') + '</div>' +
      grp('Coming up') + kv([['Next progress report', pr.next], ['Assessment due', pr.assessment], ['Treatment plan review', pr.txReview], ['Hearing date (' + pr.hearingCase + ')', pr.hearing], ['Disclosure date', pr.disclosure], ['Admin and BCBA alert', pr.alert], ['Data-sharing consent', spill(pr.consent), 1]]));
    var ready = s.packet.filter(function (p) { return p.status === 'Ready'; }).length;
    h += sec('s5b', '5b', 'Hearing packet', pr.hearingCase + ', ' + ready + ' of ' + s.packet.length + ' ready', '<div class="items">' + s.packet.map(function (p) { return check(p.name, p.status === 'Ready' ? 'From documents on file' : 'Due ' + A.fd(pr.disclosure), p.status); }).join('') + '</div><p class="is" style="margin:12px 0 0">Signed by the Clinical Director and ' + esc(s.bcba.name) + '.</p>');
    var caseDocs = s.cases.reduce(function (a, c) { return a + c.docs.length; }, 0), pdocs = s.team.reduce(function (a, p) { return a + D.pmap[p].docs.length; }, 0);
    h += sec('s6', '6', 'Documents by level', 'Student, case, line, month, provider', '<div class="items">' +
      [['Student', s.docs.length + ' documents', 'Carry across every case'], ['Case', caseDocs + ' documents across ' + plural(s.cases.length, 'case'), 'New set per case number'], ['Service line', plural(lines.length, 'line') + ' with full terms', 'Stay on their case'], ['Month', s.billing.length * 2 + ' logs and invoices for ' + D.month, 'One per line, provider and month'], ['Provider', pdocs + ' documents across ' + plural(s.team.length, 'provider'), 'Linked, not copied']]
        .map(function (r) { return '<div class="item"><div class="im"><div class="it">' + r[0] + '</div><div class="is">' + r[1] + '</div><div class="is">' + r[2] + '</div></div></div>'; }).join('') + '</div>');
    return h + '<p class="foot">Fictional demo record</p>';
  };
  V.provider = function (id) {
    var p = D.pmap[id]; if (!p) return back('#/providers', 'Providers') + '<p class="sub">Provider not found</p>';
    var onfile = p.docs.filter(function (d) { return d.status === 'On file'; }).length;
    var h = back('#/providers', 'Providers') + '<div class="hero"><div class="top1">' + A.av(p.name, p.color, 'lg') + '<div><h1>' + esc(p.name) + '</h1><div class="meta">' + esc(p.role) + ', ' + esc(p.discipline) + '</div></div></div>' +
      '<div class="pills" style="margin-top:14px">' + pill('Active', 'ok') + pill('PETS cleared ' + A.fd(p.pets), 'ok') + (p.intake === 'Complete' ? pill('Intake complete', 'ok') : pill('Intake in progress', 'warn')) + '</div></div>' +
      '<div class="qf"><div><b>' + p.activeStudents.length + '</b><span>Students</span></div><div><b>' + p.hrsWk.toFixed(1).replace('.0', '') + '</b><span>Hours per week</span></div><div><b>' + p.lines.length + '</b><span>Service lines</span></div><div><b>' + onfile + '/' + p.docs.length + '</b><span>Documents</span></div></div>';
    h += sec('p1', '1', 'Contact', p.email, kv([['Provider ID', p.id], ['Name', p.name], ['Email', '<a href="mailto:' + p.email + '">' + p.email + '</a>', 1], ['Phone', '<a href="tel:' + p.phone + '">' + p.phone + '</a>', 1], ['Service area', p.area], ['Languages', p.languages], ['Start date', p.start]]), true);
    h += sec('p2', '2', 'Discipline and license', p.role + ', expires ' + A.fd(p.licenseExp), kv([['Role', p.role], ['Discipline', p.discipline], ['License / certification', p.license], ['License expires', p.licenseExp], ['DOE clearance (PETS)', spill('Cleared'), 1], ['PETS cleared date', p.pets], ['Status', spill(p.status), 1]]));
    h += sec('p3', '3', 'Intake documents', onfile + ' of ' + p.docs.length + ' on file', '<div class="items">' + p.docs.map(function (d) { return check(d.name, d.status === 'On file' ? (d.name === 'DOE clearance (PETS)' ? 'Cleared ' : 'Received ') + d.date : 'Requested ' + D.addDays(D.today, -9), d.status); }).join('') + '</div>');
    h += sec('p4', '4', 'Students', plural(p.activeStudents.length, 'active student') + ', ' + plural(p.lines.length, 'line'), '<div class="items">' + p.studentIds.map(function (sid) {
      var s = D.smap[sid], ls = p.lines.filter(function (x) { return x.s.id === sid; });
      return '<a class="item" href="#/students/' + sid + '" style="align-items:center">' + A.av(s.name, A.scol(s), 'sm') + '<div class="im"><div class="it">' + esc(s.name) + '</div><div class="is">' + ls.map(function (x) { return esc(x.l.label) + ', ' + esc(x.l.caseNum) + ' AI ' + esc(x.l.ai) + (/Ended|Complete|Exhausted/.test(x.l.status) ? ' (' + x.l.status.toLowerCase() + ')' : ''); }).join('<br>') + '</div></div>' + A.ic('chev', 'chev') + '</a>';
    }).join('') + '</div>');
    h += sec('p5', '5', 'Weekly schedule', p.hrsWk.toFixed(1).replace('.0', '') + ' hrs per week', '<div class="days">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) {
      var b = p.week[d]; return '<div class="day"><b>' + d + '</b><div class="blks">' + (b.length ? b.map(function (x) { return '<a class="blk" href="#/students/' + x.s.id + '"><b>' + esc(x.time) + '</b><span>' + esc(x.s.name) + ', ' + esc(x.l.label) + ', ' + esc(x.l.setting) + '</span></a>'; }).join('') : '<div class="off">Off</div>') + '</div></div>';
    }).join('') + '</div>');
    h += sec('p6', '6', 'Ensora', p.ensora.unsigned ? plural(p.ensora.unsigned, 'unsigned note') : 'All notes signed', kv([['Account', spill(p.ensora.account), 1], ['Last login', p.ensora.lastLogin], ['Students in Ensora', String(p.ensora.students)], ['Unsigned session notes', p.ensora.unsigned ? spill(plural(p.ensora.unsigned, 'unsigned note')) : spill('Signed, all current'), 1]]));
    h += sec('p7', '7', 'Notes', plural(p.notes.length, 'note'), '<div class="items tl">' + p.notes.map(function (x) { return '<div class="item"><div class="im"><div class="is">' + t(x.date) + ', ' + esc(x.who) + '</div><div class="it" style="font-weight:500">' + t(x.text) + '</div></div></div>'; }).join('') + '</div>');
    return h + '<p class="foot">Fictional demo record</p>';
  };
  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/'), r = h[0] || 'home', id = h[1], v = document.getElementById('view');
    v.innerHTML = r === 'students' ? (id ? V.student(id) : V.students()) : r === 'providers' ? (id ? V.provider(id) : V.providers()) : V.home();
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === r); });
    if (!A.keepScroll) window.scrollTo(0, 0); A.keepScroll = false;
    document.title = (id ? ((D.smap[id] || D.pmap[id] || {}).name || '') + ' | ' : '') + 'TTG showcase';
  }
  document.addEventListener('input', function (e) { var k = e.target.getAttribute('data-q'); if (!k) return; A.F[k] = e.target.value; document.getElementById('res').innerHTML = k === 'sq' ? V.studentsBody() : V.providersBody(); });
  document.addEventListener('click', function (e) { var c = e.target.closest('[data-chip]'); if (!c) return; var k = c.getAttribute('data-chip'); A.F[k] = c.getAttribute('data-v');
    c.parentNode.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === c); }); document.getElementById('res').innerHTML = k === 'sc' ? V.studentsBody() : V.providersBody(); });
  window.addEventListener('hashchange', route); route();
})();
