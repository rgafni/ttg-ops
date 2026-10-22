/* TTG showcase. Fictional demo data only. Hash routing: #/, #/students, #/providers, #/students/ID, #/students/ID/doc/N, #/providers/ID */
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
  function jump(items) { return '<nav class="jump" aria-label="Sections">' + items.map(function (x) { return '<button type="button" data-jump="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</nav>'; }
  function checklist(items) { return '<ul class="cl">' + items.map(function (c) { return '<li class="' + (c.done ? 'done' : 'open') + '"><span class="box">' + (c.done ? I('check') : '') + '</span><span class="ct"><b>' + esc(c.item) + '</b><span>' + (c.done ? 'Done ' + fd(c.date) : 'Open') + '</span></span></li>'; }).join('') + '</ul>'; }
  function slots(l) { return l.sessions.slice().sort(function (a, b) { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(a.d) - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(b.d); }).map(function (x) { return x.d + ' ' + D.tm(x.s) + ' to ' + D.tm(x.e); }); }
  function role(p) { return p.role === 'Counselor' ? 'LMSW' : p.role; }

  /* ---------- lists ---------- */
  function srow(s) { return '<a class="row" href="#/students/' + s.id + '">' + av(s.name, scol(s)) + '<span class="rm"><b>' + esc(s.name) + '</b><span>Age ' + s.age + ', grade ' + esc(s.grade) + ', ' + esc(s.borough) + '</span><span>' + esc(s.lines.map(function (l) { return l.svc === 'BCBA supervision' ? null : l.svc; }).filter(Boolean).join(', ')) + ', ' + hrs(s.hrsWk) + '&nbsp;hrs/wk</span></span>' + I('chev') + '</a>'; }
  function prow(p) { return '<a class="row" href="#/providers/' + p.id + '">' + av(p.name, p.color) + '<span class="rm"><b>' + esc(p.name) + '</b><span>' + esc(role(p)) + ', ' + esc(p.discipline) + '</span><span>' + p.students.length + ' students, ' + hrs(p.hrsWk) + '&nbsp;hrs/wk</span></span>' + I('chev') + '</a>'; }
  var Q = { s: '', p: '' };
  function search(k, ph) { return '<input class="search" type="search" data-q="' + k + '" placeholder="' + ph + '" value="' + esc(Q[k]) + '" autocomplete="off">'; }
  function sres() { var q = Q.s.toLowerCase(); var r = D.students.filter(function (s) { return !q || (s.name + ' ' + s.school + ' ' + s.borough + ' ' + s.cls + ' ' + s.lines.map(function (l) { return l.svc + ' ' + D.pmap[l.pid].name; }).join(' ')).toLowerCase().indexOf(q) >= 0; }); return r.map(srow).join('') || '<p class="empty">No matches</p>'; }
  function pres() { var q = Q.p.toLowerCase(); var r = D.providers.filter(function (p) { return !q || (p.name + ' ' + p.role + ' ' + p.discipline + ' ' + p.area).toLowerCase().indexOf(q) >= 0; }); return r.map(prow).join('') || '<p class="empty">No matches</p>'; }
  function vHome() {
    return '<div class="seg"><a href="#/students">Students <b>' + D.students.length + '</b></a><a href="#/providers">Providers <b>' + D.providers.length + '</b></a></div>' +
      '<h2 class="lh">Students</h2><div class="list">' + D.students.map(srow).join('') + '</div>' +
      '<h2 class="lh">Providers</h2><div class="list">' + D.providers.map(prow).join('') + '</div>';
  }
  function vStudents() { return search('s', 'Search students') + '<div class="list" id="res">' + sres() + '</div>'; }
  function vProviders() { return search('p', 'Search providers') + '<div class="list" id="res">' + pres() + '</div>'; }

  /* ---------- student ---------- */
  function vStudent(s) {
    var h = '<div class="hero">' + av(s.name, scol(s), 'lg') + '<div><h1>' + esc(s.name) + '</h1><p>Age ' + s.age + ', grade ' + esc(s.grade) + '</p><p>' + esc(s.school) + '</p></div></div>' +
      '<div class="facts"><div><b>' + hrs(s.hrsWk) + '</b><span>hrs/wk</span></div><div><b>' + s.lines.length + '</b><span>services</span></div><div><b>' + s.team.length + '</b><span>providers</span></div></div>';
    h += jump([['profile', 'Profile'], ['intake', 'Intake'], ['docs', 'Documents'], ['cases', 'Hours'], ['services', 'Services'], ['team', 'Team'], ['notes', 'Notes'], ['reports', 'Reports'], ['hearings', 'Hearings']]);
    h += sec('profile', 'Profile', '', kv([['Age', s.age + ' (born ' + fd(s.dob) + ')'], ['Grade', s.grade], ['School', s.school], ['District', s.district], ['Borough', s.borough], ['Classification', s.cls]]) +
      '<div class="para"><div class="pl">Diagnosis summary</div><p>' + esc(s.dx) + '</p></div>' +
      '<h3>Parent contact</h3>' + kv([['Name', s.parent.name + ', ' + s.parent.rel.toLowerCase()], ['Phone', tel(s.parent.phone), 1], ['Email', mail(s.parent.email), 1], ['Language', s.parent.lang]]) +
      (s.parent2 ? kv([['Second parent', s.parent2.name + ', ' + s.parent2.rel.toLowerCase()], ['Phone', tel(s.parent2.phone), 1]]) : ''));
    var done = s.checklist.filter(function (c) { return c.done; }).length;
    h += sec('intake', 'Intake', done + ' of ' + s.checklist.length + ' done', kv([['Intake date', s.intakeDate], ['Referral source', 'Special ed attorney'], ['Attorney', s.lawyer.name], ['Firm', s.lawyer.firm], ['Attorney phone', tel(s.lawyer.phone), 1], ['Hearing date', s.hearingDate], ['Case number', s.caseNo], ['Order date', s.orderDate]]) +
      '<div class="para"><div class="pl">Hearing outcome</div><p>' + esc(s.outcome) + '</p></div><h3>Intake checklist</h3>' + checklist(s.checklist));
    h += sec('docs', 'Documents', s.docs.length + ' on file', '<div class="list">' + s.docs.map(function (d) { return '<a class="row doc" href="#/students/' + s.id + '/doc/' + d.id + '">' + I('doc') + '<span class="rm"><b>' + esc(d.name) + '</b><span>' + (d.date ? fd(d.date) + ', ' : '') + esc(d.by) + '</span><span>' + stp(d.status) + '</span></span>' + I('chev') + '</a>'; }).join('') + '</div>');
    h += sec('cases', 'Cases and hour banks', s.cases.length + (s.cases.length > 1 ? ' cases' : ' case'), s.cases.map(function (c) {
      return '<div class="sub"><div class="subh"><b>Case ' + esc(c.num) + '</b>' + stp(c.status) + '</div><p class="muted">' + t(c.basis) + '. SY ' + esc(c.sy) + '.</p><p class="muted">Window: ' + t(c.window) + '</p>' + c.banks.map(function (b) {
        var rem = b.auth - b.used, pct = Math.round(b.used / b.auth * 100);
        return '<div class="bank"><div class="bt"><b>' + esc(b.svc) + '</b><span>' + esc(D.pmap[b.pid].name) + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="nums"><div><b>' + hrs(b.auth) + '</b><span>authorized</span></div><div><b>' + hrs(b.used) + '</b><span>used</span></div><div><b>' + hrs(rem) + '</b><span>remaining</span></div></div></div>';
      }).join('') + '</div>';
    }).join(''));
    h += sec('services', 'Service lines', hrs(s.hrsWk) + ' hrs per week', s.lines.map(function (l) {
      var p = D.pmap[l.pid];
      return '<div class="sub"><div class="subh"><b>' + esc(l.svc) + '</b>' + pill(hrs(l.wk) + ' hrs/wk', 'acc') + '</div>' + kv([['Provider', '<a class="lnk" href="#/providers/' + p.id + '">' + esc(p.name) + ', ' + esc(role(p)) + '</a>', 1], ['Weekly hours', hrs(l.wk) + ' hrs, ' + l.sessions.length + ' sessions of ' + l.len + ' min'], ['Setting', l.setting], ['Start', l.start], ['End', l.end], ['Authorization', l.ai + ', case ' + l.caseNo], ['Schedule', slots(l).map(esc).join('<br>'), 1]]) + '</div>';
    }).join(''));
    h += sec('team', 'Team', s.team.length + ' providers', '<div class="list">' + s.team.map(function (pid) { var p = D.pmap[pid]; var ls = s.lines.filter(function (l) { return l.pid === pid; }); return '<a class="row" href="#/providers/' + pid + '">' + av(p.name, p.color) + '<span class="rm"><b>' + esc(p.name) + '</b><span>' + esc(role(p)) + ', ' + esc(ls.map(function (l) { return l.svc + ' ' + hrs(l.wk) + ' hrs/wk'; }).join(', ')) + '</span><span>' + esc(p.phone) + '</span></span>' + I('chev') + '</a>'; }).join('') +
      '<div class="row static">' + av(s.lawyer.name, '#57534e') + '<span class="rm"><b>' + esc(s.lawyer.name) + '</b><span>Attorney, ' + esc(s.lawyer.firm) + '</span><span>' + esc(s.lawyer.phone) + '</span></span></div></div>');
    h += sec('notes', 'Notes', s.notes.length + ' entries', '<ol class="tl">' + s.notes.map(function (n) { return '<li><div class="td">' + fd(n.date) + '</div><div class="tw">' + esc(n.by) + '</div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
    h += sec('reports', 'Progress reports', s.reports.length + ' reports', s.reports.map(function (r) { return '<div class="sub"><div class="subh"><b>' + esc(r.title) + '</b>' + stp(r.status) + '</div><p class="muted">' + esc(r.period) + ', ' + (r.status === 'Draft' ? 'due ' : '') + fd(r.date) + ', ' + esc(r.by) + '</p><blockquote>' + esc(r.excerpt) + '</blockquote></div>'; }).join(''));
    h += sec('hearings', 'Hearing dates', '', '<ol class="tl">' + s.hearings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return '<li class="' + (x.date > D.today ? 'future' : '') + '"><div class="td">' + fd(x.date) + ' ' + stp(x.status) + '</div><div class="tw">' + esc(x.what) + '</div><p>' + t(x.detail) + '</p></li>'; }).join('') + '</ol>');
    return h + '<p class="foot">Fictional demo record</p>';
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
  function vProvider(p) {
    var h = '<div class="hero">' + av(p.name, p.color, 'lg') + '<div><h1>' + esc(p.name) + '</h1><p>' + esc(role(p)) + ', ' + esc(p.discipline) + '</p><p>' + pill('PETS ' + p.pets.status.toLowerCase(), p.pets.status === 'Cleared' ? 'ok' : 'warn') + '</p></div></div>' +
      '<div class="facts"><div><b>' + p.students.length + '</b><span>students</span></div><div><b>' + hrs(p.hrsWk) + '</b><span>hrs/wk</span></div><div><b>' + p.lines.reduce(function (a, x) { return a + x.l.sessions.length; }, 0) + '</b><span>sessions/wk</span></div></div>';
    h += jump([['contact', 'Contact'], ['license', 'License'], ['onboarding', 'Onboarding'], ['students', 'Students'], ['schedule', 'Schedule'], ['sessions', 'Session notes']]);
    h += sec('contact', 'Contact', '', '<div class="acts"><a class="btn" href="tel:' + p.phone.replace(/[^\d]/g, '') + '">' + I('phone') + 'Call</a><a class="btn" href="mailto:' + esc(p.email) + '">' + I('mail') + 'Email</a></div>' +
      kv([['Phone', tel(p.phone), 1], ['Email', mail(p.email), 1], ['Service area', p.area], ['Languages', p.languages], ['Start date', p.start]]));
    h += sec('license', 'Discipline and license', '', kv([['Discipline', p.discipline], ['Role', role(p)], ['License number', p.license], ['Certification', p.cert], ['License expires', p.licExp], ['PETS clearance', stp(p.pets.status), 1], ['PETS cleared on', p.pets.date]]));
    var done = p.onboarding.filter(function (c) { return c.done; }).length;
    h += sec('onboarding', 'Onboarding', done + ' of ' + p.onboarding.length + ' done', checklist(p.onboarding));
    h += sec('students', 'Assigned students', p.students.length + ' students', '<div class="list">' + p.students.map(function (sid) { var s = D.smap[sid], ls = p.lines.filter(function (x) { return x.s.id === sid; }); return '<a class="row" href="#/students/' + sid + '">' + av(s.name, scol(s)) + '<span class="rm"><b>' + esc(s.name) + '</b><span>' + esc(ls.map(function (x) { return x.l.svc + ', ' + hrs(x.l.wk) + ' hrs/wk, ' + x.l.setting.toLowerCase(); }).join('; ')) + '</span><span>' + esc(s.borough) + ', grade ' + esc(s.grade) + '</span></span>' + I('chev') + '</a>'; }).join('') + '</div>');
    h += sec('schedule', 'Weekly schedule', hrs(p.hrsWk) + ' hrs per week', '<div class="grid">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) {
      var b = p.week[d], tot = b.reduce(function (a, x) { return a + (x.e - x.st); }, 0) / 60;
      return '<div class="gd"><div class="gl"><b>' + d + '</b><span>' + (b.length ? hrs(tot) + ' h' : '') + '</span></div><div class="gb">' + (b.length ? b.map(function (x) { return '<a class="blk" href="#/students/' + x.s.id + '"><b>' + D.tm(x.st) + ' to ' + D.tm(x.e) + '</b><span>' + esc(x.s.name) + '</span><span>' + esc(x.l.svc) + ', ' + esc(x.l.setting.toLowerCase()) + '</span></a>'; }).join('') : '<div class="off">Off</div>') + '</div></div>';
    }).join('') + '</div>');
    h += sec('sessions', 'Recent session notes', p.sessionNotes.length + ' notes', '<ol class="tl">' + p.sessionNotes.map(function (n) { var s = D.smap[n.sid]; return '<li><div class="td">' + wd(n.date) + ', ' + fd(n.date) + ' ' + (n.signed ? pill('Signed', 'ok') : pill('Unsigned', 'warn')) + '</div><div class="tw"><a class="lnk" href="#/students/' + s.id + '">' + esc(s.name) + '</a>, ' + esc(n.svc) + ', ' + n.time + ', ' + n.mins + ' min</div><p>' + esc(n.text) + '</p></li>'; }).join('') + '</ol>');
    return h + '<p class="foot">Fictional demo record</p>';
  }

  /* ---------- router ---------- */
  var stack = [], pos = {}, bk = document.getElementById('bk'), ttl = document.getElementById('ttl'), brand = document.getElementById('brand');
  function parse() { var h = location.hash.replace(/^#\/?/, '').split('/'); return { r: h[0] || 'home', id: h[1], sub: h[2], n: h[3] }; }
  function render() {
    var x = parse(), html, title = '', parent = '';
    if (x.r === 'students' && x.id) {
      var s = D.smap[x.id];
      if (!s) { html = '<p class="empty">Student not found</p>'; parent = '#/students'; }
      else if (x.sub === 'doc') { var d = s.docs.filter(function (k) { return k.id === x.n; })[0]; html = d ? vDoc(s, d) : '<p class="empty">Document not found</p>'; title = d ? d.name : 'Document'; parent = '#/students/' + s.id; }
      else { html = vStudent(s); title = s.name; parent = '#/students'; }
    } else if (x.r === 'providers' && x.id) { var p = D.pmap[x.id]; html = p ? vProvider(p) : '<p class="empty">Provider not found</p>'; title = p ? p.name : 'Provider'; parent = '#/providers'; }
    else if (x.r === 'students') { html = vStudents(); title = 'Students'; }
    else if (x.r === 'providers') { html = vProviders(); title = 'Providers'; }
    else { html = vHome(); }
    view.innerHTML = html;
    bk.hidden = !parent; bk.setAttribute('data-parent', parent); brand.hidden = !!parent || !!title; ttl.textContent = title; ttl.hidden = !title;
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === x.r); });
    document.title = (title ? title + ' | ' : '') + 'TTG';
  }
  function onHash() {
    var h = location.hash || '#/';
    var isBack = stack.length > 1 && stack[stack.length - 2] === h;
    if (isBack) stack.pop(); else stack.push(h);
    render();
    window.scrollTo(0, isBack && pos[h] ? pos[h] : 0);
  }
  window.addEventListener('scroll', function () { pos[location.hash || '#/'] = window.scrollY; }, { passive: true });
  bk.addEventListener('click', function () { if (stack.length > 1) history.back(); else location.replace(bk.getAttribute('data-parent') || '#/'); });
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-jump]'); if (!j) return;
    var el = document.getElementById(j.getAttribute('data-jump')); if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY - (document.querySelector('.top').offsetHeight + document.querySelector('.jump').offsetHeight + 8);
    window.scrollTo({ top: top, behavior: 'smooth' });
  });
  document.addEventListener('input', function (e) { var k = e.target.getAttribute('data-q'); if (!k) return; Q[k] = e.target.value; document.getElementById('res').innerHTML = k === 's' ? sres() : pres(); });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', onHash); onHash();
})();
