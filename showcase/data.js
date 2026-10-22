/* FICTIONAL DEMO DATA. Every person, phone, email, case number, license and school here is invented. */
(function () {
  var D = window.SC = { today: '2026-10-22', month: 'October 2026', syStart: '2026-09-08', syEnd: '2027-06-25' };
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  D.addDays = addDays;

  /* ---------- Providers ---------- */
  D.providers = [
    { id: 'P-201', name: 'Dana Halloway', role: 'BCBA', discipline: 'Behavior analysis, supervision', license: 'NYS LBA 099412', cert: 'BCBA 1-19-099412', licExp: '2027-08-31', pets: { status: 'Cleared', date: '2021-07-20' }, phone: '(212) 555-0141', email: 'dana.halloway@example.com', area: 'Brooklyn, Queens, Manhattan', languages: 'English, Hebrew', start: '2021-08-02', color: '#7c2d12', rate: 'BCBA supervision, parent training' },
    { id: 'P-202', name: 'Marcus Wexley', role: 'RBT', discipline: 'ABA therapy', license: 'RBT RBT-99-31877', cert: 'Supervised by Dana Halloway', licExp: '2027-02-28', pets: { status: 'Cleared', date: '2023-02-01' }, phone: '(718) 555-0162', email: 'marcus.wexley@example.com', area: 'Brooklyn, Bronx', languages: 'English, Spanish', start: '2023-02-13', color: '#c2500a' },
    { id: 'P-203', name: 'Priya Fairbairn', role: 'SLP', discipline: 'Speech and language therapy', license: 'NYS SLP 099187, CCC-SLP', cert: 'TSSLD certified', licExp: '2027-05-31', pets: { status: 'Cleared', date: '2021-12-14' }, phone: '(347) 555-0118', email: 'priya.fairbairn@example.com', area: 'All boroughs', languages: 'English, Hindi', start: '2022-01-10', color: '#b45309' },
    { id: 'P-204', name: 'Hannah Rosenquist', role: 'OT', discipline: 'Occupational therapy', license: 'NYS OT 099356', cert: 'Sensory integration certified', licExp: '2028-01-31', pets: { status: 'Cleared', date: '2022-08-30' }, phone: '(917) 555-0173', email: 'hannah.rosenquist@example.com', area: 'Brooklyn, Queens, Staten Island', languages: 'English, Russian', start: '2022-09-12', color: '#a16207' },
    { id: 'P-205', name: 'Jordan Abernethy', role: 'SETSS', discipline: 'Special education teacher (SETSS)', license: 'NYS Students with Disabilities 1-6, cert 099640', cert: 'Orton-Gillingham trained', licExp: '2029-06-30', pets: { status: 'Cleared', date: '2023-08-22' }, phone: '(646) 555-0129', email: 'jordan.abernethy@example.com', area: 'Manhattan, Staten Island, Queens', languages: 'English', start: '2023-09-05', color: '#9a3412' },
    { id: 'P-206', name: 'Talia Merriweather', role: 'RBT', discipline: 'ABA therapy', license: 'RBT RBT-99-40518', cert: 'Supervised by Dana Halloway', licExp: '2026-12-15', pets: { status: 'Cleared', date: '2024-08-06' }, phone: '(718) 555-0195', email: 'talia.merriweather@example.com', area: 'Queens, Manhattan', languages: 'English, Haitian Creole', start: '2024-08-19', color: '#be123c' },
    { id: 'P-207', name: 'Owen Varnell', role: 'PT', discipline: 'Physical therapy', license: 'NYS PT 099803', cert: 'Pediatric clinical specialist', licExp: '2027-09-30', pets: { status: 'Cleared', date: '2023-04-03' }, phone: '(347) 555-0150', email: 'owen.varnell@example.com', area: 'Bronx, Brooklyn', languages: 'English', start: '2023-04-17', color: '#9f1239' },
    { id: 'P-208', name: 'Leah Quillon', role: 'Counselor', discipline: 'Counseling (LMSW)', license: 'NYS LMSW 099271', cert: 'School social worker certificate', licExp: '2028-03-31', pets: { status: 'Cleared', date: '2026-09-24' }, phone: '(929) 555-0137', email: 'leah.quillon@example.com', area: 'Manhattan, Queens, Staten Island', languages: 'English, Arabic', start: '2026-09-29', color: '#92400e' }
  ];
  D.pmap = {}; D.providers.forEach(function (p) { D.pmap[p.id] = p; });

  var ONB = ['Application and interview', 'License verified with NYSED', 'DOE PETS clearance', 'Fingerprinting', 'Resume and two references', 'W-9 and direct deposit', 'Liability insurance', 'Mandated reporter training', 'HIPAA and FERPA training', 'Signed handbook and contract', 'Ensora account set up'];
  D.providers.forEach(function (p, i) {
    var pending = p.id === 'P-208' ? ['Liability insurance', 'HIPAA and FERPA training'] : p.id === 'P-206' ? ['License verified with NYSED'] : [];
    p.onboarding = ONB.map(function (n, k) {
      var done = pending.indexOf(n) < 0;
      var label = n === 'License verified with NYSED' && pending.length && p.id === 'P-206' ? 'RBT renewal before Dec 15, 2026' : n;
      return { item: label, done: done, date: done ? (n === 'DOE PETS clearance' ? p.pets.date : addDays(p.start, -21 + k * 2)) : '' };
    });
    p.onboardStatus = pending.length ? 'In progress' : 'Complete';
  });

  /* ---------- Students ---------- */
  var LAW = {
    cm: { firm: 'Calloway & Marchbanks Special Education Law', name: 'Ruth Calloway, Esq.', phone: '(212) 555-0104', email: 'rcalloway@example.com' },
    pe: { firm: 'Pemberton Ellery LLP', name: 'Simone Pemberton, Esq.', phone: '(646) 555-0188', email: 'spemberton@example.com' },
    wg: { firm: 'Winslow Graybeal Advocacy', name: 'Theo Winslow, Esq.', phone: '(718) 555-0109', email: 'twinslow@example.com' }
  };
  D.students = [
    { id: 'S-1001', name: 'Eli Vantorre', dob: '2019-03-14', grade: '2', school: 'PS 917 Harbor Lane', district: 'District 20', borough: 'Brooklyn', cls: 'Autism',
      dx: 'Autism spectrum disorder, level 2. Limited functional speech (2 to 3 word phrases). Elopement and task refusal at transitions. Strong visual learner, motivated by trains and music.',
      parent: { name: 'Marta Vantorre', rel: 'Mother', phone: '(718) 555-0121', email: 'marta.v@example.com', lang: 'English' }, parent2: { name: 'Paul Vantorre', rel: 'Father', phone: '(718) 555-0122' },
      law: 'cm', intakeDate: '2026-08-11', hearingDate: '2026-07-29', ihoCase: '291045', outcome: 'Granted. IHO ordered 10 hrs/wk home ABA with 2 hrs/wk BCBA supervision, plus a 150 hour compensatory ABA bank.', orderDate: '2026-08-04',
      svc: [['ABA', 'P-202', 10, 'Home', 120], ['BCBA supervision', 'P-201', 2, 'Home', 60], ['Speech', 'P-203', 2, 'School', 30], ['OT', 'P-204', 1, 'School', 30]], comp: [['Compensatory ABA', 150, 41]] },
    { id: 'S-1002', name: 'Sofia Delacorte', dob: '2016-06-02', grade: '5', school: 'PS 958 Clove Valley', district: 'District 31', borough: 'Staten Island', cls: 'Learning disability',
      dx: 'Specific learning disability in reading (dyslexia) and written expression. Reads about two grade levels below placement. Anxiety around reading aloud. Verbal reasoning in the high average range.',
      parent: { name: 'Gina Delacorte', rel: 'Mother', phone: '(718) 555-0131', email: 'gina.delacorte@example.com', lang: 'English, Italian' },
      law: 'pe', intakeDate: '2026-08-19', hearingDate: '2026-08-06', ihoCase: '291388', outcome: 'Granted in part. IHO ordered 5 hrs/wk SETSS with an Orton-Gillingham trained teacher and 1 hr/wk counseling. Speech kept at IEP level.', orderDate: '2026-08-14',
      svc: [['SETSS', 'P-205', 5, 'School', 60], ['Speech', 'P-203', 1, 'School', 30], ['Counseling', 'P-208', 1, 'School', 60]], comp: [] },
    { id: 'S-1003', name: 'Noah Brightwell', dob: '2021-11-20', grade: 'Pre-K', school: 'Little Maple Preschool (fictional)', district: 'District 26', borough: 'Queens', cls: 'Preschool student with a disability',
      dx: 'Autism spectrum disorder with expressive language delay. Uses about 20 words and some signs. Feeding selectivity. Toilet training in progress. Joins play when peers are calm.',
      parent: { name: 'Amara Brightwell', rel: 'Mother', phone: '(347) 555-0144', email: 'amara.b@example.com', lang: 'English, Yoruba' },
      law: 'wg', intakeDate: '2026-09-02', hearingDate: '2026-08-20', ihoCase: '291702', outcome: 'Granted. Pendency confirmed for 12 hrs/wk ABA, 3 hrs/wk speech and 2 hrs/wk OT while the CPSE case is pending.', orderDate: '2026-08-27',
      svc: [['ABA', 'P-206', 12, 'Home', 180], ['BCBA supervision', 'P-201', 2, 'Home', 60], ['Speech', 'P-203', 3, 'Preschool', 45], ['OT', 'P-204', 2, 'Preschool', 60]], comp: [] },
    { id: 'S-1004', name: 'Ava Ostrander', dob: '2013-04-09', grade: '8', school: 'IS 931 Riverside Upper', district: 'District 3', borough: 'Manhattan', cls: 'Other health impairment',
      dx: 'ADHD, combined type, with executive function deficits. Misses multi-step assignments and loses materials. Strong in math. Peer conflict at lunch reported twice last year.',
      parent: { name: 'Claire Ostrander', rel: 'Mother', phone: '(212) 555-0152', email: 'claire.ostrander@example.com', lang: 'English' },
      law: 'cm', intakeDate: '2026-08-25', hearingDate: '2026-08-12', ihoCase: '291466', outcome: 'Granted. IHO ordered 4 hrs/wk SETSS for executive function and 1 hr/wk counseling, plus 40 compensatory SETSS hours.', orderDate: '2026-08-21',
      svc: [['SETSS', 'P-205', 4, 'School', 60], ['Counseling', 'P-208', 1, 'School', 60]], comp: [['Compensatory SETSS', 40, 6]] },
    { id: 'S-1005', name: 'Liam Penhallow', dob: '2017-01-27', grade: '4', school: 'PS 974 Grand Concourse Academy', district: 'District 9', borough: 'Bronx', cls: 'Autism',
      dx: 'Autism spectrum disorder, level 2, with low muscle tone. Speaks in full sentences but has rigid routines. Meltdowns when routines change. Walks on toes and tires quickly on stairs.',
      parent: { name: 'Denise Penhallow', rel: 'Grandmother, legal guardian', phone: '(718) 555-0163', email: 'denise.penhallow@example.com', lang: 'English' },
      law: 'wg', intakeDate: '2026-08-14', hearingDate: '2026-07-31', ihoCase: '291120', outcome: 'Granted. IHO ordered 8 hrs/wk home ABA, 2 hrs/wk BCBA supervision, 1 hr/wk PT and 1 hr/wk OT.', orderDate: '2026-08-07',
      svc: [['ABA', 'P-202', 8, 'Home', 120], ['BCBA supervision', 'P-201', 2, 'Home', 60], ['PT', 'P-207', 1, 'School', 60], ['OT', 'P-204', 1, 'School', 60]], comp: [['Compensatory ABA', 80, 22]] },
    { id: 'S-1006', name: 'Chloe Kettering', dob: '2020-05-18', grade: '1', school: 'PS 962 Prospect Hill', district: 'District 15', borough: 'Brooklyn', cls: 'Orthopedic impairment',
      dx: 'Spastic diplegic cerebral palsy. Walks with a posterior walker. Fine motor delays affect handwriting and buttons. Mild articulation errors. Bright, social and eager to please.',
      parent: { name: 'Nora Kettering', rel: 'Mother', phone: '(347) 555-0176', email: 'nora.kettering@example.com', lang: 'English' }, parent2: { name: 'Sam Kettering', rel: 'Father', phone: '(347) 555-0177' },
      law: 'pe', intakeDate: '2026-08-28', hearingDate: '2026-08-18', ihoCase: '291590', outcome: 'Granted. IHO ordered 2 hrs/wk PT, 2 hrs/wk OT and 1.5 hrs/wk speech at school.', orderDate: '2026-08-25',
      svc: [['PT', 'P-207', 2, 'School', 60], ['OT', 'P-204', 2, 'School', 60], ['Speech', 'P-203', 1.5, 'School', 30]], comp: [] },
    { id: 'S-1007', name: 'Mateo Castellane', dob: '2015-09-03', grade: '6', school: 'IS 948 Jackson Heights', district: 'District 30', borough: 'Queens', cls: 'Emotional disability',
      dx: 'Disruptive mood dysregulation and anxiety. Frequent removals from class last year (14 incidents). Responds well to clear expectations and token systems. Reading at grade level, math slightly below.',
      parent: { name: 'Lucia Castellane', rel: 'Mother', phone: '(929) 555-0185', email: 'lucia.castellane@example.com', lang: 'Spanish (interpreter needed)' },
      law: 'cm', intakeDate: '2026-09-09', hearingDate: '2026-08-26', ihoCase: '291833', outcome: 'Granted. IHO ordered 2 hrs/wk counseling, 3 hrs/wk SETSS, 6 hrs/wk ABA at home with 1 hr/wk BCBA supervision.', orderDate: '2026-09-02',
      svc: [['Counseling', 'P-208', 2, 'School', 60], ['SETSS', 'P-205', 3, 'School', 60], ['ABA', 'P-206', 6, 'Home', 120], ['BCBA supervision', 'P-201', 1, 'Home', 60]], comp: [] },
    { id: 'S-1008', name: 'Zoe Thornbury', dob: '2018-02-11', grade: '3', school: 'PS 989 Yorkville Commons', district: 'District 2', borough: 'Manhattan', cls: 'Autism',
      dx: 'Autism spectrum disorder, level 1, with sensory sensitivity to noise. Fluent speech but limited back and forth conversation. Hand flapping when excited. Reading above grade level.',
      parent: { name: 'Rebecca Thornbury', rel: 'Mother', phone: '(646) 555-0194', email: 'rebecca.t@example.com', lang: 'English' },
      law: 'pe', intakeDate: '2026-08-21', hearingDate: '2026-08-07', ihoCase: '291402', outcome: 'Granted. IHO ordered 10 hrs/wk home ABA, 2 hrs/wk BCBA supervision and 2 hrs/wk social pragmatic speech.', orderDate: '2026-08-15',
      svc: [['ABA', 'P-206', 10, 'Home', 120], ['BCBA supervision', 'P-201', 2, 'Home', 60], ['Speech', 'P-203', 2, 'School', 30]], comp: [['Compensatory speech', 30, 12]] }
  ];
  D.smap = {}; D.students.forEach(function (s) { D.smap[s.id] = s; });

  function age(dob) { var a = 2026 - +dob.slice(0, 4); if (dob.slice(5) > '10-22') a--; return a; }
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var busy = {}; D.providers.forEach(function (p) { busy[p.id] = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] }; });
  function tm(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h > 12 ? h - 12 : h; return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap; }
  D.tm = tm;
  function place(pid, len, setting, si, am) {
    var win = setting === 'Home' ? (am ? [9 * 60, 13 * 60] : [15 * 60, 19 * 60 + 30]) : [8 * 60 + 30, 14 * 60 + 30];
    var order = DAYS.slice(si % 5).concat(DAYS.slice(0, si % 5)).concat(['Sat']);
    function free(d, st, l) { return !busy[pid][d].some(function (x) { return st < x.e + 30 && x.s < st + l + 30; }); }
    var best = null;
    order.forEach(function (d) {
      if (best) return;
      var w = d === 'Sat' ? [9 * 60, 14 * 60] : win;
      if (busy[pid][d].some(function (x) { return x.sid === si; })) return;
      for (var st = w[0]; st + len <= w[1]; st += 30) if (free(d, st, len)) { best = { d: d, s: st, e: st + len }; break; }
    });
    if (!best) throw new Error('no slot ' + pid + ' ' + si);
    best.sid = si; busy[pid][best.d].push(best); return best;
  }
  var weeksDone = 6.5, weeksYr = 40;
  D.students.forEach(function (s, si) {
    s.age = age(s.dob); s.lawyer = LAW[s.law];
    s.caseNo = 'IH ' + s.ihoCase; s.compCase = s.comp.length ? 'IH ' + (+s.ihoCase - 18733) : '';
    s.lines = s.svc.map(function (v, k) {
      var sessions = [], n = Math.round(v[2] * 60 / v[4]);
      for (var i = 0; i < n; i++) sessions.push(place(v[1], v[4], v[3], si, s.grade === 'Pre-K'));
      var start = addDays(s.orderDate, 10 + k * 2);
      if (start < addDays(s.intakeDate, 7)) start = addDays(s.intakeDate, 7 + k);
      if (v[3] !== 'Home' && start < D.syStart) start = addDays(D.syStart, k);
      var auth = Math.round(v[2] * weeksYr), used = Math.round(v[2] * weeksDone * (0.86 + ((si + k) % 4) * 0.03) * 2) / 2;
      return { id: s.id + '-L' + (k + 1), svc: v[0], pid: v[1], wk: v[2], setting: v[3], len: v[4], sessions: sessions, start: start, end: '2027-06-25', auth: auth, used: used, caseNo: s.caseNo, ai: 'AI ' + (3 + k) };
    });
    s.hrsWk = s.lines.reduce(function (a, l) { return a + l.wk; }, 0);
    s.team = s.lines.map(function (l) { return l.pid; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  });
  /* provider schedules and student lists */
  D.providers.forEach(function (p) {
    p.week = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] };
    p.lines = [];
    D.students.forEach(function (s) { s.lines.forEach(function (l) { if (l.pid === p.id) { p.lines.push({ s: s, l: l }); l.sessions.forEach(function (x) { p.week[x.d].push({ s: s, l: l, st: x.s, e: x.e }); }); } }); });
    Object.keys(p.week).forEach(function (d) { p.week[d].sort(function (a, b) { return a.st - b.st; }); });
    p.students = p.lines.map(function (x) { return x.s.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    p.hrsWk = p.lines.reduce(function (a, x) { return a + x.l.wk; }, 0);
  });
})();
(function () {
  var D = window.SC, A = D.addDays;
  function first(s) { return s.name.split(' ')[0]; }
  var CK = ['Referral received from attorney', 'Parent intake call', 'IHO decision (FOFD) received', 'Current IEP received', 'Evaluations received', 'Consent for services signed', 'HIPAA release signed', 'Sent to DOE implementation unit', 'Providers assigned', 'Schedule confirmed with parent', 'Ensora profile created', 'First session held'];
  var OPEN = { 'S-1003': ['Evaluations received'], 'S-1007': ['Schedule confirmed with parent'], 'S-1004': ['HIPAA release signed'] };
  var NOTES = {
    'S-1001': [['2026-10-21', 'Dana Halloway, BCBA', 'Parent training session. Marta is running the first-then board at dinner. Elopement at the front door down from 6 per week to 2.'], ['2026-10-14', 'Office', 'Comp ABA bank at 41 of 150 hours. Comp hours run during school breaks with Marcus.'], ['2026-09-30', 'Priya Fairbairn, SLP', 'Started PECS phase 3. Eli picks between 2 picture cards for snack with 80% accuracy.'], ['2026-09-15', 'Office', 'DOE implementation unit confirmed AI numbers for all four lines.']],
    'S-1002': [['2026-10-20', 'Jordan Abernethy, SETSS', 'Moved to the second OG reading level. Sofia read a 120 word passage aloud to the group for the first time.'], ['2026-10-08', 'Leah Quillon, LMSW', 'Counseling started. Worked on a coping card for test days. Mom reports fewer stomach aches before school.'], ['2026-09-24', 'Office', 'Ms. Pemberton asked for monthly session logs. Set to auto send on the 5th.'], ['2026-09-10', 'Office', 'Pull out room confirmed with the assistant principal, room 214.']],
    'S-1003': [['2026-10-19', 'Talia Merriweather, RBT', 'Noah used the sign for more 14 times in session with no prompt. Toilet schedule every 45 minutes, 3 of 5 successes.'], ['2026-10-12', 'Dana Halloway, BCBA', 'Updated feeding goal. Accepts touching 2 new foods per meal. Next step is a lick or taste.'], ['2026-10-01', 'Office', 'Still waiting on the speech evaluation from the CPSE. Reminder sent to Mr. Winslow.'], ['2026-09-16', 'Office', 'Pendency order received. Home ABA started on Sep 9.']],
    'S-1004': [['2026-10-21', 'Jordan Abernethy, SETSS', 'Ava now uses a planner check at the end of each SETSS block. Missing assignments down from 9 to 3 this month.'], ['2026-10-09', 'Leah Quillon, LMSW', 'Worked on a script for lunch conflicts. Ava role played walking away and asking for help.'], ['2026-09-29', 'Office', 'HIPAA release sent again by email. Mom will sign at the Oct 27 meeting.'], ['2026-09-12', 'Office', 'Comp SETSS hours will be used during winter and spring breaks.']],
    'S-1005': [['2026-10-20', 'Owen Varnell, PT', 'Climbed 12 stairs with alternating feet and one rail. Toe walking cues down to 3 per session.'], ['2026-10-16', 'Marcus Wexley, RBT', 'Practiced a schedule change card. Liam accepted 2 of 3 surprise changes with no meltdown.'], ['2026-10-02', 'Dana Halloway, BCBA', 'Met with Ms. Penhallow. Reviewed the calm down corner and the visual timer at home.'], ['2026-09-18', 'Office', 'All lines active. Comp ABA bank at 22 of 80 hours.']],
    'S-1006': [['2026-10-21', 'Hannah Rosenquist, OT', 'Chloe buttoned 3 large buttons in 2 minutes. Started a slant board for handwriting.'], ['2026-10-13', 'Owen Varnell, PT', 'Walked 150 feet in the hallway with the walker and no rest. Working on curb steps.'], ['2026-10-05', 'Priya Fairbairn, SLP', 'Final /s/ in words at 70% accuracy. Sent a home practice sheet.'], ['2026-09-22', 'Office', 'School nurse asked for the walker plan on file. Sent the PT note.']],
    'S-1007': [['2026-10-20', 'Leah Quillon, LMSW', 'Mateo named three warning signs before he gets angry. Practiced box breathing. Spanish summary sent to mom.'], ['2026-10-15', 'Talia Merriweather, RBT', 'Token board at home for homework. 4 of 5 nights completed with 2 or fewer prompts.'], ['2026-10-06', 'Office', 'Spanish interpreter booked for the Oct 30 parent meeting.'], ['2026-09-23', 'Office', 'Mom asked to move Tuesday ABA to Wednesday. Waiting on new time.']],
    'S-1008': [['2026-10-19', 'Priya Fairbairn, SLP', 'Social group with 2 peers. Zoe kept a topic going for 4 turns with a visual cue card.'], ['2026-10-14', 'Talia Merriweather, RBT', 'Noise tolerance: stayed in the kitchen with the blender on for 40 seconds, up from 10.'], ['2026-10-03', 'Dana Halloway, BCBA', 'Treatment plan signed by parent. Mastery criteria set at 80% over 3 sessions.'], ['2026-09-17', 'Office', 'Comp speech bank at 12 of 30 hours. Using Friday makeup slots.']]
  };
  var REP = {
    'S-1001': ['Eli completed the VB-MAPP baseline. He scored at level 1 in manding, listener and tacting. Main targets: requesting with 2 word phrases, waiting 30 seconds, and safe transitions at the door.', 'Eli now requests 18 items with a 2 word phrase across home and school. Elopement dropped 65% since September. Waiting is at 20 seconds with a timer. We recommend keeping 12 hrs/wk and starting a toilet training goal.'],
    'S-1002': ['Baseline: Sofia decodes CVC words at 85% and multisyllable words at 30%. Oral reading fluency 61 words per minute at grade 5 level.', 'Sofia moved up one OG level. Fluency is now 74 words per minute. She uses the vowel team chart without reminders. Written paragraphs now have a topic sentence in 4 of 5 samples.'],
    'S-1003': ['Noah responds to his name 40% of the time and uses 20 words and 6 signs. Feeding: accepts 9 foods. Toileting: no initiation yet.', 'Noah now responds to his name 75% of the time and signs more, help and all done without prompts. He sits for a 5 minute circle with one adult nearby. Toilet success 3 of 5 times on schedule.'],
    'S-1004': ['Baseline: Ava turned in 58% of homework in September. She needed 4 to 6 reminders to start an assignment. She uses no planner.', 'Ava now writes all assignments in her planner with one check in. Homework turned in rose to 81%. Two lunch conflicts this month, both resolved with her script and no office referral.'],
    'S-1005': ['Liam scored 42 on the gross motor scale (below average). He toe walks about 70% of the time. Rigid with routines: 3 to 4 meltdowns per week at home.', 'Liam now walks heel to toe for 2 minutes with one cue. Meltdowns are down to 1 per week. He accepts a change card with a 2 minute warning in most cases.'],
    'S-1006': ['Chloe walks 60 feet with the walker before resting. Pencil grasp is fisted. Final /s/ and /z/ are reduced in conversation.', 'Chloe walks 150 feet with the walker and steps up a 4 inch curb with help. She holds a pencil with a tripod grip using a grip aid. Final /s/ at 70% in words.'],
    'S-1007': ['Baseline: 14 classroom removals last school year. Mateo cannot name his anger triggers yet. Homework completion at home 1 of 5 nights.', 'No classroom removals this month. Mateo names 3 triggers and uses breathing in 2 of 3 practice scenes. Homework done 4 of 5 nights with the token board.'],
    'S-1008': ['Zoe keeps a conversation going for 1 to 2 turns. She covers her ears and leaves when noise is above normal room level. Reads at grade 4 level.', 'Zoe now keeps a topic for 4 turns with a cue card and asks a peer one question per session. Noise tolerance rose from 10 to 40 seconds. Hand flapping no longer stops her from joining the group.']
  };
  var SN = {
    ABA: ['Worked on manding and waiting with a visual timer. {n} met the target in {a} of 10 trials. Reinforcer: preferred toy.', 'Ran the transition routine 6 times. {n} followed the first-then card with 1 gesture prompt. No elopement this session.', 'Parent present for 20 minutes. Modeled praise and wait time. {n} completed 3 of 4 task analysis steps on his own.', 'Data collected on 5 targets. 2 targets at mastery and moved to maintenance. {n} had one brief protest, resolved with a break card.'],
    'BCBA supervision': ['Supervised RBT for 60 minutes. Fidelity at 92%. Adjusted the prompt fading plan for {n}.', 'Parent training. Reviewed the behavior plan and practiced planned ignoring. Caregiver fidelity at 80%.', 'Reviewed graphs. {n} is on track for 3 of 4 goals. Added a new waiting target.', 'Overlap session with RBT. Probed generalization of requests with a new adult. {n} responded in 7 of 10 trials.'],
    Speech: ['Pragmatics and turn taking with picture cues. {n} reached 70% accuracy on the target.', 'Articulation drill, 50 trials. {n} produced the target sound in words at {a}0% accuracy.', 'Language group with 1 peer. {n} answered who and what questions in 8 of 10 tries.', 'Home practice sheet sent. {n} used a 3 word phrase to request 6 times with no model.'],
    OT: ['Fine motor station: beads, tongs, putty. {n} completed 4 of 5 stations with a short break.', 'Handwriting on a slant board. {n} copied 6 letters within the lines.', 'Sensory diet check. Heavy work before class helped {n} sit for 12 minutes.', 'Scissor skills. {n} cut along a curved line with 1 cue for grip.'],
    PT: ['Stair training, 3 rounds of 12 steps. {n} used alternating feet with one rail.', 'Balance beam and single leg stance. {n} held 6 seconds on each side.', 'Gait training in the hallway. {n} walked 150 feet with good posture and 2 cues.', 'Stretching for heel cords and a home exercise review with the classroom aide.'],
    SETSS: ['OG lesson: vowel teams. {n} read 18 of 20 words and 2 decodable sentences.', 'Executive function: planner check and breaking a project into 3 steps. {n} finished step 1 in session.', 'Fluency drill. {n} read 74 words per minute with 3 errors.', 'Written expression with a graphic organizer. {n} wrote a 5 sentence paragraph.'],
    Counseling: ['Feelings thermometer and 2 coping strategies. {n} chose box breathing and a short walk.', 'Role play for a peer conflict. {n} used the "I feel" script 2 times.', 'Check in about the week. {n} rated stress 4 of 10, down from 7.', 'Worked on a worry plan for test days. Copy sent home.']
  };
  function svcKey(v) { return /Compensatory ABA/.test(v) ? 'ABA' : v; }
  D.students.forEach(function (s, si) {
    var open = OPEN[s.id] || [];
    s.checklist = CK.map(function (c, k) { var done = open.indexOf(c) < 0; return { item: c, done: done, date: done ? A(s.intakeDate, k < 3 ? k - 2 : Math.min(k + 2, 22)) : '' }; });
    s.notes = NOTES[s.id].map(function (x) { return { date: x[0], by: x[1], text: x[2] }; });
    var has = function (re) { return s.lines.some(function (l) { return re.test(l.svc); }); };
    var lead = s.lines[0];
    var docs = [
      { type: 'fofd', name: 'IHO Findings of Fact and Decision', date: s.orderDate, status: 'Received', by: 'Impartial Hearing Officer' },
      { type: 'iep', name: 'IEP, 2026-27', date: A(s.hearingDate, -64), status: 'Received', by: 'CSE ' + s.district },
      { type: 'psych', name: 'Psychoeducational evaluation', date: A(s.hearingDate, -120), status: s.id === 'S-1003' ? 'Requested' : 'Received', by: 'Independent evaluator' }
    ];
    if (has(/ABA/)) docs.push({ type: 'fba', name: 'Functional behavior assessment', date: A(lead.start, 12), status: 'Received', by: 'Dana Halloway, BCBA' });
    if (has(/Speech/)) docs.push({ type: 'speech', name: 'Speech and language evaluation', date: A(s.hearingDate, -95), status: s.id === 'S-1003' ? 'Requested' : 'Received', by: 'Priya Fairbairn, SLP' });
    if (has(/OT|PT/)) docs.push({ type: 'otpt', name: has(/PT/) && has(/OT/) ? 'OT and PT evaluation' : has(/PT/) ? 'PT evaluation' : 'OT evaluation', date: A(s.hearingDate, -88), status: 'Received', by: has(/PT/) ? 'Owen Varnell, PT' : 'Hannah Rosenquist, OT' });
    docs.push({ type: 'consent', name: 'Parent consent for services', date: A(s.intakeDate, 3), status: 'Signed', by: s.parent.name });
    docs.push({ type: 'hipaa', name: 'HIPAA release of information', date: s.id === 'S-1004' ? '' : A(s.intakeDate, 4), status: s.id === 'S-1004' ? 'Awaiting signature' : 'Signed', by: s.parent.name });
    if (has(/ABA/)) docs.push({ type: 'tx', name: 'ABA treatment plan', date: A(lead.start, 20), status: s.id === 'S-1007' ? 'Draft' : 'Approved', by: 'Dana Halloway, BCBA' });
    docs.push({ type: 'log', name: 'Session log, October 2026', date: '2026-10-21', status: 'In progress', by: 'TTG office' });
    s.docs = docs.map(function (d, k) { d.id = String(k + 1); return d; });
    s.reports = [
      { title: 'Initial assessment summary', period: 'Baseline', date: A(lead.start, 14), by: s.lines.some(function (l) { return /ABA/.test(l.svc); }) ? 'Dana Halloway, BCBA' : D.pmap[lead.pid].name + ', ' + D.pmap[lead.pid].role, status: 'Complete', excerpt: REP[s.id][0] },
      { title: 'Progress report, quarter 1', period: 'Sep to Nov 2026', date: '2026-11-20', by: s.lines.some(function (l) { return /ABA/.test(l.svc); }) ? 'Dana Halloway, BCBA' : D.pmap[lead.pid].name + ', ' + D.pmap[lead.pid].role, status: 'Draft', excerpt: REP[s.id][1] }
    ];
    s.hearings = [
      { date: s.hearingDate, what: 'Impartial hearing', detail: 'Case ' + s.caseNo + '. ' + s.outcome.split('.')[0] + '.', status: 'Held' },
      { date: A('2026-11-30', si % 3 * 7), what: 'Disclosure deadline', detail: 'Progress reports and session logs to ' + s.lawyer.name.replace(', Esq.', ''), status: 'Upcoming' },
      { date: A('2026-12-08', si * 3), what: 'Implementation status conference', detail: 'Case ' + s.caseNo + ', by video', status: 'Scheduled' }
    ];
    if (s.comp.length) s.hearings.splice(1, 0, { date: A(s.hearingDate, -365), what: 'Prior hearing, comp services', detail: 'Case ' + s.compCase + '. Compensatory bank awarded.', status: 'Held' });
    /* cases and hour banks */
    s.cases = [{ num: s.caseNo, sy: '2026-27', basis: 'IHO order dated ' + s.orderDate, window: s.lines[0].start + ' to 2027-06-25', status: 'Active', banks: s.lines.map(function (l) { return { svc: l.svc, pid: l.pid, auth: l.auth, used: l.used }; }) }];
    if (s.comp.length) s.cases.push({ num: s.compCase, sy: '2025-26 award', basis: 'Compensatory award, prior IHO order', window: '2025-09-15 to 2027-08-31', status: 'Active', banks: s.comp.map(function (c) { return { svc: c[0], pid: s.lines[0].pid, auth: c[1], used: c[2] }; }) });
  });
  /* recent session notes per provider */
  var DI = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  D.providers.forEach(function (p, pi) {
    var out = [];
    for (var back = 0; back < 10 && out.length < 6; back++) {
      var d = new Date('2026-10-21T12:00:00'); d.setDate(d.getDate() - back);
      var dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      (p.week[dn] || []).slice().reverse().forEach(function (x) {
        if (out.length >= 6) return;
        var arr = SN[svcKey(x.l.svc)] || SN.ABA, k = (out.length + pi + x.s.id.charCodeAt(5)) % arr.length;
        out.push({ date: d.toISOString().slice(0, 10), time: D.tm(x.st), sid: x.s.id, svc: x.l.svc, mins: x.e - x.st, signed: !(p.id === 'P-206' && out.length === 0), text: arr[k].replace(/\{n\}/g, first(x.s)).replace(/\{a\}/g, String(6 + (k % 4))) });
      });
    }
    p.sessionNotes = out;
  });
})();
