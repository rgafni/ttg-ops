/* TTG platform demo data. Every person, ID, case number, address, rate and number here is FICTIONAL. Nothing comes from TTG records. */
window.TTG_DEMO = (function () {
  var seed = 20261022;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  var TODAY = '2026-10-22';
  var FIRST = ['Zed', 'Milo', 'Juniper', 'Orrin', 'Talia', 'Bram', 'Wren', 'Caspian', 'Lyra', 'Fenn', 'Odessa', 'Pip', 'Rowan', 'Sable', 'Tobin', 'Vesper', 'Arlo', 'Briar', 'Cove', 'Dax', 'Ember', 'Fable', 'Gideon', 'Halcyon', 'Ivo', 'Jory', 'Kestrel', 'Lark', 'Marlo', 'Nico', 'Onyx', 'Perrin', 'Quill', 'Rune', 'Sorrel'];
  var LAST = ['Example', 'Brightwater', 'Lindqvale', 'Marrowby', 'Quillfeather', 'Ashgrove', 'Thistledown', 'Copperfield', 'Wintermoor', 'Hollowell', 'Starling', 'Fernsby', 'Oakhart', 'Pemberly', 'Rookwood', 'Silverbrook', 'Tumblewick', 'Underhill', 'Vantwood', 'Whistler', 'Yarrowby', 'Ambergate', 'Bellwether', 'Cloverly', 'Dunmore', 'Elderglen', 'Foxworth', 'Glimmer', 'Heathcote', 'Ivybridge', 'Juniperson', 'Kettleby', 'Lumley', 'Mossgrove', 'Nettlefield'];
  var PF = ['Riley', 'Casey', 'Morgan', 'Taylor', 'Avery', 'Jamie', 'Sam', 'Quinn', 'Reese', 'Skyler', 'Drew', 'Emery', 'Hollis', 'Indigo', 'Jules', 'Kai', 'Lane', 'Marley', 'Noel', 'Oakley', 'Parker', 'Remy', 'Sage', 'Tatum', 'Umber', 'Vale', 'Winter', 'Ximena', 'Yael', 'Zuri', 'Blair', 'Cedar', 'Dallas', 'Ellis', 'Finley', 'Greer'];
  var PL = ['Placeholder', 'Sampleton', 'Mockup', 'Testwell', 'Dummy', 'Fakename', 'Formerly', 'Demoson', 'Proxy', 'Standin', 'Fictive', 'Madeup', 'Notreal', 'Imagin', 'Pretendo', 'Lorem', 'Ipsumly', 'Sketchley', 'Draftwood', 'Templeton', 'Mockridge', 'Fillmore', 'Blankley', 'Specimen', 'Prototyp', 'Avatara', 'Simmons-Test', 'Examplar', 'Rehearsal', 'Pilotson', 'Trialby', 'Sandboxe', 'Stubbs', 'Fixture', 'Seedling', 'Dryrun'];
  var ROLES = ['RBT / ABA', 'RBT / ABA', 'BCBA', 'SLP', 'OT', 'AT trainer', 'RBT / ABA'].concat(Array(14).fill('RBT / ABA'), Array(6).fill('BCBA'), Array(3).fill('SLP'), Array(2).fill('OT'), ['PT', 'PT', 'Counselor', 'SETSS']);
  var provStat = [].concat(Array(7).fill('Received'), Array(6).fill('Partial'), Array(22).fill('Not received'), ['Received, incomplete']);
  var providers = PF.map(function (f, i) {
    var role = ROLES[i], st = provStat[(i * 7) % 36];
    return { id: 'P-' + String(i + 1).padStart(3, '0'), name: (i === 2 ? 'Dr. ' : '') + f + ' ' + PL[i], role: role, email: f.toLowerCase() + '@example.invalid', phone: '555-01' + String(i).padStart(2, '0'),
      status: i === 6 ? 'Left' : 'Active', payRate: role === 'BCBA' ? 95 : role === 'RBT / ABA' ? 32 : 70, students: [],
      intake: { status: st, received: st === 'Not received' ? '' : 'Provider info form (2026-09-' + String(ri(3, 28)).padStart(2, '0') + ')', missing: st === 'Received' ? '' : pick(['W-9, direct deposit', 'DOE clearance', 'License copy, CV', 'Service record', 'Provider info form']) },
      docs: [['Provider info form', st !== 'Not received'], ['License / certification', st === 'Received' || rnd() > .5], ['CV', st === 'Received' || rnd() > .4], ['W-9', st === 'Received'], ['Direct deposit', st === 'Received' || rnd() > .7], ['DOE clearance', st !== 'Not received' && rnd() > .3]].map(function (d) { return { name: d[0], status: d[1] ? 'On file' : 'Missing' }; }) };
  });
  providers.forEach(function (p, i) {
    var st = p.intake.status, cleared = st === 'Received' || (st !== 'Not received' && i % 2 === 0);
    p.pets = { status: cleared ? 'Cleared' : st === 'Not received' ? '' : 'Pending', date: cleared ? '2026-0' + ri(6, 9) + '-' + String(ri(1, 28)).padStart(2, '0') : '' };
    p.docs.forEach(function (d) { if (d.name === 'DOE clearance') { d.name = 'DOE clearance (PETS)'; d.status = cleared ? 'On file' : 'Missing'; } });
    p.license = /BCBA/.test(p.role) ? 'BCBA ' + ri(100000, 999999) + ' (demo)' : /SLP|OT|PT/.test(p.role) ? 'NYS ' + p.role + ' ' + ri(10000, 99999) + ' (demo)' : /RBT/.test(p.role) ? 'RBT ' + ri(100000, 999999) + ' (demo)' : '';
    p.languages = pick(['English', 'English, Spanish', 'English, Yiddish', 'English, Russian']);
    p.start = '20' + ri(22, 26) + '-0' + ri(1, 9) + '-01';
    p.area = pick(['Brooklyn (demo)', 'Queens (demo)', 'Manhattan (demo)', 'Bronx (demo)']);
    p.intake.welcome = '2026-09-0' + ri(1, 9); p.intake.last = st === 'Not received' ? '' : '2026-10-0' + ri(1, 9);
    p.notes = st === 'Not received' ? [{ ts: '2026-10-1' + ri(0, 9) + ' 10:00', author: 'Nina', type: 'outreach', text: 'Reminder sent for intake papers.' }] : [];
  });
  var byRole = function (r) { return providers.filter(function (p) { return p.role === r && p.status !== 'Left'; }); };
  var SCH = { 'School': { days: [1, 2, 3, 4, 5], start: '08:00', end: '11:00' }, 'Home': { days: [1, 2, 3, 4, 5], start: '15:30', end: '17:30' }, 'Home weekend': { days: [0, 6], start: '10:00', end: '13:00' } };
  function mins0(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  function line(o) { o.used = o.used || 0; o.status = o.status || 'Active'; return o; }
  // Student 1: the v2 sample record (fictional), three overlapping cases.
  var zed = { id: 'STU-0001', code: 'ZX', name: 'Zed Example', status: 'Active', setting: 'School + Home',
    profile: { dob: '01/01/2018', osis: '000-000-001', address: '123 Fake Street, Apt 0, Example Borough', guardian: 'Pat Example (parent)', phone: '555-0100', email: 'parent@example.invalid', language: 'English', lawyer: 'Example Law Group, A. Counsel', school: 'PS 000 Example School', schoolContact: 'M. Coordinator', classification: 'Autism' },
    hearing: { date: '2026-12-07', disclosure: '2026-11-30' },
    docs: [['IEP (current) SY 2026-27', '2026-05-20', 'On file'], ['IEP (prior) SY 2025-26', '2025-05-12', 'On file'], ['Evaluations (psych-ed, speech, OT, FBA)', '2026-03-02', 'On file'], ['BIP / treatment plan v3', '2026-09-15', 'On file'], ['Consents SY 2026-27', '2026-09-01', 'On file'], ['Progress report history', '2026-06-20', 'On file']].map(function (d) { return { name: d[0], date: d[1], status: d[2] }; }),
    cases: [
      { num: 'FAKE-111111', year: '2024-25', basis: 'Findings of Fact and Decision (comp award)', orderDate: '2025-03-14', window: '2025-04-01 to 2026-12-31', status: 'Active', funding: 'IHO',
        docs: [['Order', 'On file'], ['Vendor info sent', 'On file'], ['Authorizations AI 1 to 3', 'On file'], ['Service agreement', 'On file'], ['School start confirmation', 'n/a'], ['Provider change notice', 'On file'], ['Case intake form', 'On file'], ['Hearing evidence packet', 'On file'], ['BCBA affidavit', 'On file']],
        lines: [line({ tag: 'ZX-C1-CompABA-Bank', ai: '1', label: 'Compensatory ABA', setting: 'Home', type: 'Comp bank', funding: 'IHO', max: 600, len: 60, rate: 100, start: '2025-04-01', end: '2026-12-31', used: 410, pid: 'P-002', sched: { days: [6], start: '10:00', end: '12:00' } }),
          line({ tag: 'ZX-C1-CompBCBA-Bank', ai: '2', label: 'Compensatory BCBA Supervision', setting: 'Home', type: 'Comp bank', funding: 'IHO', max: 80, len: 60, rate: 150, start: '2025-04-01', end: '2026-12-31', used: 52, pid: 'P-003', sched: { days: [3], start: '17:00', end: '18:00' } }),
          line({ tag: 'ZX-C1-CompST-Bank', ai: '3', label: 'Compensatory Speech Therapy', setting: 'Home', type: 'Comp bank', funding: 'IHO', max: 53, len: 45, rate: 90, start: '2025-04-01', end: '2026-06-30', used: 53, pid: 'P-004', status: 'Exhausted' })] },
      { num: 'FAKE-222222', year: '2025-26', basis: 'Statement of Agreement and Order', orderDate: '2025-10-01', window: '2025-09-08 to 2026-12-31', status: 'Partly closed', funding: 'IHO',
        docs: [['Order', 'On file'], ['Vendor info sent', 'On file'], ['Authorizations AI 1 to 5', 'On file'], ['Service agreement', 'On file'], ['School start confirmation', 'On file'], ['Provider change notice', 'n/a'], ['Case intake form', 'On file'], ['Hearing evidence packet', 'On file'], ['BCBA affidavit', 'On file']],
        lines: [line({ tag: 'ZX-C2-ABA-School', ai: '1', label: 'ABA', setting: 'School', type: 'Weekly 20 hrs/wk', funding: 'IHO', max: 800, len: 60, rate: 90, start: '2025-09-08', end: '2026-06-26', used: 780, pid: 'P-001', status: 'Ended' }),
          line({ tag: 'ZX-C2-BCBA-Supervision', ai: '2', label: 'BCBA Supervision', setting: 'School', type: 'Weekly 2 hrs/wk', funding: 'IHO', max: 80, len: 60, rate: 150, start: '2025-09-08', end: '2026-06-26', used: 76, pid: 'P-003', status: 'Ended' }),
          line({ tag: 'ZX-C2-OT-Weekly', ai: '3', label: 'Occupational Therapy', setting: 'School pull-out', type: 'Weekly 2 x 30 min', funding: 'IHO', max: 80, len: 30, rate: 55, start: '2025-09-08', end: '2026-06-26', used: 74, pid: 'P-005', status: 'Ended' }),
          line({ tag: 'ZX-C2-PCAT-Bank', ai: '4', label: 'Parent Counseling and Training', setting: 'Home / remote', type: 'Bank', funding: 'IHO', max: 30, len: 60, rate: 130, start: '2025-10-01', end: '2026-12-31', used: 12, pid: 'P-003', sched: { days: [4], start: '18:00', end: '19:00', every: 2 } }),
          line({ tag: 'ZX-C2-AT-FlatFee', ai: '5', label: 'Assistive Technology Training', setting: 'Home', type: 'Flat fee', funding: 'IHO', max: 1, len: null, rate: 1000, start: '2026-02-10', end: '2026-02-10', used: 1, pid: 'P-006', status: 'Complete' })] },
      { num: 'FAKE-333333', year: '2026-27', basis: 'Pendency', orderDate: '2026-09-10', window: '2026-09-10 until case ends', status: 'Active', funding: 'Pendency',
        docs: [['Pendency agreement', 'On file'], ['Vendor info sent', 'On file'], ['Authorizations AI 1 to 3', 'On file'], ['Authorization AI 4', 'Pending'], ['Service agreement', 'On file'], ['School start confirmation', 'On file'], ['Case intake form', 'On file'], ['BCBA affidavit', 'Missing'], ['Hearing evidence packet', 'Missing']],
        lines: [line({ tag: 'ZX-C3-ABA-School', ai: '1', label: 'ABA', setting: 'School', type: 'Weekly 15 hrs/wk', funding: 'Pendency', max: 600, len: 60, rate: 90, start: '2026-09-10', end: '', used: 78, pid: 'P-001', sched: { days: [1, 2, 3, 4, 5], start: '08:00', end: '11:00' } }),
          line({ tag: 'ZX-C3-ABA-AfterSchool', ai: '2', label: 'ABA (afterschool)', setting: 'Home', type: 'Weekly 5 hrs/wk', funding: 'Pendency', max: 200, len: 60, rate: 90, start: '2026-09-10', end: '', used: 26, pid: 'P-002', sched: { days: [1, 2, 3, 4, 5], start: '15:30', end: '16:30' } }),
          line({ tag: 'ZX-C3-BCBA-Supervision', ai: '3', label: 'BCBA Supervision', setting: 'School', type: 'Weekly 2 hrs/wk', funding: 'Pendency', max: 80, len: 60, rate: 150, start: '2026-09-10', end: '', used: 10, pid: 'P-003', sched: { days: [1, 3], start: '11:00', end: '12:00' } }),
          line({ tag: 'ZX-C3-ST-PushIn', ai: '4', aiPending: true, label: 'Speech Therapy', setting: 'School', type: 'Weekly 2 x 30 min', funding: 'Pendency', max: 80, len: 30, rate: 60, start: '2026-09-10', end: '', used: 10, pid: 'P-004', status: 'Pending AI', sched: { days: [2, 4], start: '10:00', end: '10:30' } })] }],
    notes: [{ ts: '2026-10-20 16:10', author: 'Roni', type: 'note', text: 'Disclosure for C3 on 11/30. Packet started.' }, { ts: '2026-10-14 09:02', author: 'Nina', type: 'outreach', text: 'Asked DOE for AI 4 on speech push-in.' }],
    health: { relationship: 'green', service: 'green', clinical: 'yellow', billing: 'yellow' }, why: 'AI 4 pending; C1 log missing parent signature',
    attends: 'Yes', year: '2026-27',
    intakeInfo: { date: '2024-11-04', source: 'Referred by law firm after impartial hearing', settings: 'School, home (after school)', schoolAddr: 'PS 000 Example School, 1 Sample Ave', schoolContact: 'M. Coordinator, special ed coordinator', schedule: 'Mon to Fri 8:00-11:00 school ABA (P-001); Mon to Fri 3:30-4:30 home ABA (P-002); Tue and Thu ST push-in 10:00-10:30 (P-004); BCBA supervision Mon and Wed (P-003)', allergies: 'None', consents: 'Service consent, photo/video no, data-sharing with counsel yes' },
    progress: { history: [['2025-06-15', 'C1 period'], ['2026-01-20', 'C1 + C2'], ['2026-06-20', 'C2 year end']], due: '2026-11-30', note: 'C3 disclosure' },
    packet: [['Goal by goal progress with baselines', 'In prep'], ['Treatment plan, goals, curriculum', 'On file'], ['Current BIP', 'On file'], ['Weekly schedule', 'On file'], ['Attendance and hours per service', 'On file'], ['Session and supervision notes', 'On file'], ['BCBA recommended hours letter', 'Missing'], ['Provider CVs', 'On file']] };
  zed.docs.forEach(function () {}); zed.cases.forEach(function (c) { c.docs = c.docs.map(function (d) { return { name: d[0], status: d[1] }; }); });
  zed.cases[0].lines[0].history = 'P-007 until 2026-01-31';
  var students = [zed];
  var stuStat = [].concat(Array(9).fill('Received'), Array(13).fill('Partial'), Array(11).fill('Not received'), ['Received'], ['Closed']);
  var GOOD = ['green', 'green', 'green', 'yellow', 'red', 'green', 'yellow'];
  var LAW = ['Northgate Legal (demo)', 'Harbor Advocacy (demo)', 'Example Law Group'];
  var SCHOOLS = ['PS 101 Demo School', 'PS 202 Sample Academy', 'IS 303 Example Middle', 'PS 404 Placeholder Elementary'];
  for (var i = 1; i < 35; i++) {
    var name = FIRST[i] + ' ' + LAST[i], code = (FIRST[i][0] + LAST[i][0] + i).toUpperCase(), closed = i === 34;
    var setting = pick(['School', 'Home', 'School + Home', 'Home weekend']);
    var fund = pick(['IHO', 'IHO', 'Pendency', 'RSA']), num = 'FAKE-' + String(400000 + i * 1373).slice(0, 6), start = pick(['2026-09-08', '2026-09-10', '2026-07-01', '2026-01-15']);
    var lines = [], k = 0, mk = function (label, role, set, hrs, len, rate, extra) {
      var pool = byRole(role), p = (i % 9 === 3 && role === 'RBT / ABA') ? null : pool[(i + k) % pool.length];
      var weeks = start < '2026-07-01' ? 72 : 40, max = Math.round(weeks * hrs * 60 / len), used = Math.round(max * (start < '2026-07-01' ? (0.6 + rnd() * 0.35) : (0.08 + rnd() * 0.12)));
      var s = SCH[/School/.test(set) ? 'School' : set === 'Home weekend' ? 'Home weekend' : 'Home'];
      var sch = { days: s.days.slice(0, Math.max(1, Math.min(s.days.length, Math.round(hrs / 2)))), start: s.start, end: s.end };
      if (hrs <= 2) { var st0 = /School/.test(set) ? '11:00' : '16:30', e0 = Math.floor(mins0(st0) + len) ; sch = { days: hrs >= 2 ? [1, 3] : [2], start: st0, end: String(Math.floor(e0 / 60)).padStart(2, '0') + ':' + String(e0 % 60).padStart(2, '0') }; if (set === 'Home weekend') sch.days = [6]; }
      var L = line(Object.assign({ tag: code + '-C1-' + label.replace(/[^A-Za-z]/g, '') + (k + 1), ai: String(k + 1), label: label, setting: set, type: (start < '2026-07-01' ? 'Bank ' : 'Weekly ') + hrs + ' hrs/wk', funding: fund, max: max, len: len, rate: rate, start: start, end: start < '2026-07-01' ? '2026-12-31' : '2027-06-26', used: used, pid: p ? p.id : '', sched: sch }, extra || {}));
      if (!p) L.status = 'Needs provider';
      lines.push(L); k++;
    };
    mk('ABA', 'RBT / ABA', setting === 'School + Home' ? 'School' : setting, pick([10, 15, 20, 25]), 60, 90);
    mk('BCBA Supervision', 'BCBA', /School/.test(setting) ? 'School' : 'Home', 2, 60, 150);
    if (rnd() > .45) mk(pick(['Speech Therapy', 'Occupational Therapy', 'Counseling']), pick(['SLP', 'OT', 'Counselor']), 'School', 1, 30, 60);
    if (rnd() > .7) mk('Parent Counseling and Training', 'BCBA', 'Home / remote', 1, 60, 130);
    if (i % 11 === 5) lines[lines.length - 1].aiPending = true, lines[lines.length - 1].status = 'Pending AI';
    var st = stuStat[i];
    students.push({ id: 'STU-' + String(i + 1).padStart(4, '0'), code: code, name: name, status: closed ? 'Closed' : 'Active', setting: setting,
      profile: { dob: '0' + ri(1, 9) + '/1' + ri(0, 9) + '/20' + ri(14, 21), osis: i % 17 === 2 ? '' : '000-000-' + String(100 + i).padStart(3, '0'), address: i === 14 ? '' : ri(10, 990) + ' ' + pick(['Demo Ave', 'Sample St', 'Example Blvd', 'Fiction Rd']) + ', Example Borough', guardian: pick(['Robin', 'Jordan', 'Alex', 'Charlie', 'Dana']) + ' ' + LAST[i] + ' (parent)', phone: '555-02' + String(i).padStart(2, '0'), email: 'family' + i + '@example.invalid', language: pick(['English', 'English', 'Spanish', 'Yiddish', 'Russian']), lawyer: pick(LAW), school: pick(SCHOOLS), schoolContact: 'Demo Coordinator', classification: pick(['Autism', 'Speech or language impairment', 'Other health impairment']) },
      hearing: i % 7 === 1 ? { date: '2026-11-' + ri(16, 30), disclosure: '2026-11-' + String(ri(9, 15)).padStart(2, '0') } : null,
      docs: [{ name: 'IEP (current)', date: '2026-0' + ri(3, 9) + '-1' + ri(0, 9), status: st === 'Not received' ? 'Missing' : 'On file' }, { name: 'Consents SY 2026-27', date: '', status: st === 'Received' ? 'On file' : 'Missing' }, { name: 'Evaluations', date: '', status: rnd() > .4 ? 'On file' : 'Missing' }],
      cases: [{ num: num, year: start < '2026-07-01' ? '2025-26' : '2026-27', basis: fund === 'Pendency' ? 'Pendency' : pick(['Findings of Fact and Decision', 'Statement of Agreement and Order']), orderDate: start, window: start + ' to ' + lines[0].end, status: closed ? 'Closed' : 'Active', funding: fund,
        docs: [{ name: 'Order', status: 'On file' }, { name: 'Authorizations', status: lines.some(function (l) { return l.aiPending; }) ? 'Pending' : 'On file' }, { name: 'Service agreement', status: st === 'Not received' ? 'Missing' : 'On file' }], lines: lines }],
      attends: setting === 'Home' || setting === 'Home weekend' ? 'No' : 'Yes', year: start < '2026-07-01' ? '2025-26' : '2026-27',
      intakeInfo: { date: st === 'Not received' ? '' : '2026-0' + ri(1, 9) + '-1' + ri(0, 9), source: pick(['Law firm referral', 'Law firm referral', 'Parent referral', '']), settings: setting, schoolAddr: '', schoolContact: rnd() > .5 ? 'Demo Coordinator' : '', schedule: '', allergies: st === 'Received' ? 'None' : '', consents: st === 'Received' ? 'Service consent, data-sharing with counsel' : '' },
      progress: { history: rnd() > .5 ? [['2026-06-1' + ri(0, 9), 'Year end']] : [], due: rnd() > .4 ? '2026-12-' + String(ri(1, 20)).padStart(2, '0') : '', note: '' },
      packet: [],
      notes: [], health: { relationship: pick(GOOD), service: lines.some(function (l) { return !l.pid; }) ? 'red' : pick(GOOD), clinical: pick(GOOD), billing: pick(GOOD) }, why: '',
      intake: { status: closed ? 'Closed' : st, received: st === 'Not received' || closed ? '' : 'Intake form, consents', missing: st === 'Received' || closed ? '' : st === 'Partial' ? pick(['Consents', 'Current IEP', 'Service agreement']) : 'Intake form, consents, IEP' },
      ensora: { use: pick(['Yes', 'Yes', 'No', 'Unknown']), data: pick(['Graphs + notes', 'Notes only', 'None']), last: '2026-10-' + String(ri(1, 21)).padStart(2, '0'), missing: '' } });
  }
  zed.intake = { status: 'Received', received: 'Intake form, consents, IEP', missing: '' };
  zed.ensora = { use: 'Yes', data: 'Graphs + notes', last: '2026-10-19', missing: '' };
  // derived per-student fields
  students.forEach(function (s) {
    var team = {}, lines = [];
    s.cases.forEach(function (c) { c.lines.forEach(function (l) { lines.push(l); var p = providers.filter(function (x) { return x.id === l.pid; })[0]; if (p) { l.provider = p.name; team[p.id] = p; if (p.students.indexOf(s.id) < 0) p.students.push(s.id); } }); });
    s.team = Object.keys(team).map(function (k) { return { name: team[k].name, role: team[k].role, provider_id: k }; });
    s.bcba = s.team.filter(function (t) { return t.role === 'BCBA'; }).map(function (t) { return t.name; }).join(', ');
    s.gaps = lines.filter(function (l) { return l.status === 'Needs provider'; }).map(function (l) { return { role: l.label, days: 6 + s.name.length, since: '2026-10-0' + (s.name.length % 9 + 1) }; });
    if (!s.why) s.why = s.gaps.length ? 'Needs ' + s.gaps[0].role + ' provider' : s.health.billing === 'red' ? 'Invoice blocked' : s.health.relationship === 'red' ? 'Parent check-in overdue' : '';
  });
  // sessions + invoices, September and October 2026
  function pad(n) { return String(n).padStart(2, '0'); }
  function mins(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  var invoices = [], inv = 0;
  ['2026-09', '2026-10'].forEach(function (mo) {
    var y = +mo.slice(0, 4), m = +mo.slice(5), dim = new Date(y, m, 0).getDate();
    students.forEach(function (s) {
      if (s.status === 'Closed') return;
      s.cases.forEach(function (c) {
        c.lines.forEach(function (l) {
          if (!l.sched || !l.pid || /Ended|Exhausted|Complete/.test(l.status)) return;
          var sess = [], every = 0;
          for (var d = 1; d <= dim; d++) {
            var ds = mo + '-' + pad(d), wd = new Date(y, m - 1, d).getDay();
            if (l.sched.days.indexOf(wd) < 0 || ds < l.start || (l.end && ds > l.end)) continue;
            if (l.sched.every && (every++ % l.sched.every)) continue;
            var len = mins(l.sched.end) - mins(l.sched.start), done = ds <= TODAY, miss = done && rnd() < .06;
            sess.push({ date: ds, start: l.sched.start, end: l.sched.end, mins: len, n: Math.round(len / l.len * 4) / 4, state: miss ? 'Cancelled' : done ? 'Completed' : 'Scheduled', note: done && !miss ? (mo === '2026-10' && rnd() < .12 ? 'Unsigned' : 'Signed') : '' });
          }
          if (!sess.length) return;
          var done = sess.filter(function (x) { return x.state === 'Completed'; }), billed = done.reduce(function (a, x) { return a + x.n; }, 0);
          var subm = done.reduce(function (a, x) { return a + x.mins; }, 0) / 60 + (rnd() < .25 ? 0.25 : 0);
          var schoolSign = /School/.test(l.setting), status, reason = '', sig = { provider: true, other: true };
          var p = providers.filter(function (x) { return x.id === l.pid; })[0];
          if (mo === '2026-10') { status = 'In progress'; sig = { provider: false, other: false }; }
          else {
            var r = rnd();
            if (l.aiPending) { status = 'Held'; reason = 'Authorization pending'; }
            else if (!s.profile.osis || !s.profile.address) { status = 'Blocked'; reason = 'Missing ' + (!s.profile.osis ? 'OSIS' : 'home address'); }
            else if (r < .1) { status = 'Blocked'; reason = 'Missing ' + (schoolSign ? 'principal' : 'parent') + ' signature'; sig.other = false; }
            else if (r < .18) { status = 'Waiting for signatures'; sig = { provider: true, other: false }; }
            else if (r < .32) { status = 'Ready to send'; }
            else status = 'Sent to DOE';
          }
          if (s.id === 'STU-0001' && mo === '2026-09' && l.tag === 'ZX-C1-CompABA-Bank') { status = 'Blocked'; reason = 'Missing parent signature'; sig.other = false; }
          if (s.id === 'STU-0001' && mo === '2026-09' && !l.aiPending && status !== 'Blocked') { status = 'Sent to DOE'; reason = ''; sig = { provider: true, other: true }; }
          invoices.push({ id: 'INV-' + mo.replace('-', '') + '-' + String(++inv).padStart(4, '0'), num: s.code + '-' + mo + '-' + l.pid.replace('-', '') + '-' + (s.cases.indexOf(c) + 1 > 0 ? 'C' + (s.cases.indexOf(c) + 1) : '') + '-AI' + l.ai,
            month: mo, studentId: s.id, student: s.name, caseNum: c.num, ai: l.ai, aiPending: !!l.aiPending, tag: l.tag, label: l.label, setting: l.setting, funding: l.funding, provider: p.name, pid: p.id, len: l.len, rate: l.rate, payRate: p.payRate,
            sessions: sess, billed: billed, submittedHrs: Math.round(subm * 100) / 100, total: billed * l.rate, cost: Math.round(subm * p.payRate), signer: schoolSign ? 'Principal' : 'Parent', sig: sig, status: status, reason: reason, version: status === 'Sent to DOE' && rnd() < .15 ? 2 : 1 });
        });
      });
    });
  });
  var intake = [];
  students.forEach(function (s) { intake.push({ kind: 'Student', id: s.id, name: s.name, who: s.team.map(function (t) { return t.name + ' (' + t.role + ')'; }).join('; '), status: s.intake.status, received: s.intake.received, missing: s.intake.missing, last: s.intake.received ? '2026-10-0' + (s.name.length % 9 + 1) : '', links: [] }); });
  providers.forEach(function (p) { intake.push({ kind: 'Provider', id: p.id, name: p.name, role: p.role, status: p.intake.status, received: p.intake.received, missing: p.intake.missing, last: '', links: [] }); });
  var reports = [
    { id: 'R-1', created: '2026-10-21T10:02:00', kind: 'month', scope: 'All cases', month: '2026-09', title: 'Monthly case report, September 2026', status: 'reviewed', body: 'Sessions delivered, invoices sent, holds and blocks for September 2026.' },
    { id: 'R-2', created: '2026-10-20T15:40:00', kind: 'student', scope: 'Zed Example', month: '2026-10', title: 'Student status: Zed Example', status: 'draft', body: 'Three open case numbers. C3 disclosure 11/30. AI 4 for speech pending.' },
    { id: 'R-3', created: '2026-10-18T09:12:00', kind: 'provider', scope: providers[0].name, month: '2026-09', title: 'Provider hours and billing: ' + providers[0].name, status: 'draft', body: 'Submitted hours vs billed sessions, September 2026.' },
    { id: 'R-4', created: '2026-10-17T12:00:00', kind: 'intake', scope: 'All', month: '2026-10', title: 'Intake papers', status: 'reviewed', body: 'Providers 7 received, 6 partial, 22 not received, 1 incomplete. Students 10 received, 13 partial, 11 not received, 1 closed.' }];
  var triggers = [['T1', 'Parent check-in overdue', 'Every 30 days'], ['T2', 'BCBA update overdue', 'Every 14 days'], ['T3', 'Hour bank low', 'Under 15% left'], ['T4', 'Authorization expiring', '30 days out'], ['T5', 'Case needs provider', 'Same day'], ['T6', 'Unsigned session note', 'End of day'], ['T7', 'Missing log signature', 'Month end'], ['T8', 'Disclosure deadline', '3 weeks before'], ['T9', 'Authorization pending', 'Weekly']].map(function (t) { return { id: t[0], name: t[1], cadence: t[2] }; });
  var admins = [{ name: 'Roni (demo)', email: 'admin1@example.invalid', role: 'Admin', status: 'Active' }, { name: 'Nina (demo)', email: 'admin2@example.invalid', role: 'Admin', status: 'Active' }, { name: 'Owner (demo)', email: 'owner@example.invalid', role: 'Owner', status: 'Active' }];
  return { mode: 'demo', today: TODAY, agency: { name: 'Together They Grow (demo)', tin: '00-0000000', address: '1 Demo Plaza, Example City', email: 'billing@example.invalid', phone: '555-0199' },
    students: students, providers: providers, invoices: invoices, intake: intake, reports: reports, triggers: triggers, admins: admins, queue: [] };
})();
