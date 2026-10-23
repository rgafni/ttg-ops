/* Fictional demo only: sample document bodies for demo student records. */
window.SCDOC = function (H) {
  var esc = H.esc, t = H.t, kv = H.kv, fd = H.fd, fds = H.fds, first = H.first, hrs = H.hrs, D = H.D;
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
  return docBody;
};
