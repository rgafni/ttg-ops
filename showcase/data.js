/* FICTIONAL DEMO DATA. Every name, ID, number, date and school here is made up. No real people. */
(function () {
  var D = window.SC = { today: '2026-10-22', month: 'October 2026' };
  function P(id, name, role, disc, area, langs, start, lic, licExp, pets, color) {
    var first = name.replace(/^Dr\. /, '').split(' ')[0].toLowerCase();
    return { id: id, name: name, role: role, discipline: disc, area: area, languages: langs, start: start,
      license: lic, licenseExp: licExp, pets: pets, color: color,
      email: first + '@example.invalid', phone: '555-01' + id.slice(-2), status: 'Active' };
  }
  D.providers = [
    P('P-001', 'Riley Placeholder', 'RBT', 'Applied behavior analysis', 'Example Borough North', 'English, Spanish', '2023-02-13', 'RBT cert DEMO-RBT-1101', '2027-02-28', '2023-02-01', '#c2500a'),
    P('P-002', 'Casey Sampleton', 'RBT', 'Applied behavior analysis', 'Example Borough East', 'English', '2023-09-05', 'RBT cert DEMO-RBT-1102', '2026-12-15', '2023-08-22', '#9a3412'),
    P('P-003', 'Dr. Morgan Mockup', 'BCBA', 'Behavior analysis and supervision', 'All areas', 'English, Hebrew', '2021-08-02', 'BCBA DEMO-BC-2203, LBA DEMO-LBA-3304', '2027-08-31', '2021-07-20', '#7c2d12'),
    P('P-004', 'Taylor Testwell', 'SLP', 'Speech and language therapy', 'Example Borough North', 'English', '2022-01-10', 'SLP license DEMO-SLP-4405, CCC-SLP', '2027-05-31', '2021-12-14', '#b45309'),
    P('P-005', 'Avery Dummy', 'OT', 'Occupational therapy', 'Example Borough South', 'English, Russian', '2022-09-12', 'OT license DEMO-OT-5506', '2028-01-31', '2022-08-30', '#a16207'),
    P('P-006', 'Jamie Fakename', 'AT trainer', 'Assistive technology training', 'Remote and home visits', 'English', '2024-01-08', 'ATP cert DEMO-ATP-6607', '2027-03-31', '2023-12-18', '#854d0e'),
    P('P-007', 'Dr. Quinn Demoson', 'BCBA', 'Behavior analysis and parent training', 'Example Borough East', 'English, Yiddish', '2022-03-07', 'BCBA DEMO-BC-7708, LBA DEMO-LBA-7709', '2027-10-31', '2022-02-22', '#be123c'),
    P('P-008', 'Reese Proxy', 'RBT', 'Applied behavior analysis', 'Example Borough South', 'English, Haitian Creole', '2024-08-19', 'RBT cert DEMO-RBT-8810', '2026-11-30', '2024-08-06', '#c2410c'),
    P('P-009', 'Skyler Standin', 'RBT', 'Applied behavior analysis', 'Example Borough West', 'English, Mandarin', '2025-01-06', 'RBT cert DEMO-RBT-9911', '2027-01-31', '2024-12-17', '#ea580c'),
    P('P-010', 'Drew Fictive', 'PT', 'Physical therapy', 'Example Borough West', 'English', '2023-04-17', 'PT license DEMO-PT-1012', '2027-09-30', '2023-04-03', '#9f1239'),
    P('P-011', 'Emery Madeup', 'SLP', 'Speech and language therapy', 'Example Borough East', 'English, Spanish', '2024-02-26', 'SLP license DEMO-SLP-1113, CCC-SLP', '2028-02-29', '2024-02-09', '#b91c1c'),
    P('P-012', 'Hollis Notreal', 'Counselor', 'School counseling', 'Example Borough North', 'English, Arabic', '2023-10-02', 'LMHC DEMO-LMHC-1214', '2027-06-30', '2023-09-19', '#92400e')
  ];
  var PDOC = ['Provider intake form', 'License or certification', 'CV (current)', 'W-9', 'Direct deposit form', 'DOE clearance (PETS)', 'Signed handbook', 'Mandated reporter training'];
  D.providers.forEach(function (p, i) {
    var pend = { 'P-008': 'Mandated reporter training', 'P-009': 'CV (current)', 'P-011': 'Direct deposit form' }[p.id];
    p.docs = PDOC.map(function (n, k) {
      var d = k === 5 ? p.pets : addDays(p.start, -10 + k);
      if (k === 2) d = '2026-0' + (1 + (i % 8)) + '-1' + (i % 9);
      return { name: n, date: d, status: n === pend ? 'Pending' : 'On file' };
    });
    p.intake = pend ? 'In progress' : 'Complete';
    p.ensora = { account: 'Active', lastLogin: addDays(D.today, -(i % 3)), unsigned: [0, 2, 0, 1, 0, 0, 0, 3, 1, 0, 0, 0][i] };
    p.notes = [];
  });
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  D.addDays = addDays;
  D.pmap = {}; D.providers.forEach(function (p) { D.pmap[p.id] = p; });
  var PN = {
    'P-001': [['2026-10-20', 'Clinical Director', 'Strong data on manding goals at school. Ask to cover one extra Friday block in November.'], ['2026-09-08', 'Office', 'School start confirmed at PS 000 Example School. DOE clearance verified.']],
    'P-002': [['2026-10-17', 'Office', 'October log for the comp bank is missing the parent signature. Reminder sent.'], ['2026-02-01', 'Clinical Director', 'Took over the ZX comp ABA bank from P-007.']],
    'P-003': [['2026-10-21', 'Clinical Director', 'Drafting the C3 progress report for the Nov 30 disclosure.'], ['2026-09-30', 'Office', 'Supervision ratio checked for all RBTs this month. All within limits.']],
    'P-004': [['2026-10-15', 'Office', 'AI 4 still pending for ZX push-in. Sessions tracked, invoices held.'], ['2026-06-28', 'Clinical Director', 'End of year speech reports submitted on time.']],
    'P-005': [['2026-10-02', 'Office', 'Added a Thursday slot for MS fine motor sessions.'], ['2026-06-26', 'Clinical Director', 'OT weekly line for ZX ended with the school year.']],
    'P-006': [['2026-09-18', 'Office', 'AT device training scheduled for OP family in November.'], ['2026-02-10', 'Clinical Director', 'Flat fee AT training delivered for ZX. Signed off.']],
    'P-007': [['2026-10-14', 'Clinical Director', 'Parent training going well for the LT family. Considering a bank extension request.'], ['2026-08-25', 'Office', 'License renewal confirmed through 2027.']],
    'P-008': [['2026-10-19', 'Office', 'Mandated reporter training module due by Oct 31.'], ['2026-08-19', 'Clinical Director', 'Onboarded. Shadowed P-001 for two sessions.']],
    'P-009': [['2026-10-12', 'Office', 'Updated CV requested for the BD hearing packet.'], ['2026-09-10', 'Clinical Director', 'Started afterschool ABA for BD.']],
    'P-010': [['2026-10-06', 'Office', 'PT sessions moved to Tuesday afternoons at family request.'], ['2026-06-24', 'Clinical Director', 'Year end PT report filed for WT.']],
    'P-011': [['2026-10-09', 'Office', 'Direct deposit form sent again. Paper check used for September.'], ['2026-09-12', 'Clinical Director', 'Picked up speech for FH and CC.']],
    'P-012': [['2026-10-11', 'Office', 'Counseling group at PS 222 Demo Academy approved by the school.'], ['2026-09-15', 'Clinical Director', 'Counseling caseload set for the school year.']]
  };
  D.providers.forEach(function (p) { p.notes = PN[p.id].map(function (n) { return { date: n[0], who: n[1], text: n[2] }; }); });
})();
/* FICTIONAL DEMO DATA, students part 1. */
(function () {
  var D = window.SC;
  // line: [case, ai, svc, DOE label, setting, type, funding, max, len, rate, start, end, used, pid, days, time, note]
  D.raw = [
  { id: 'STU-0001', tag: 'ZX', name: 'Zed Example', osis: '000-000-001', dob: '2018-01-01', grade: '3', cls: 'Autism',
    addr: '123 Fake Street, Apt 0, Example Borough', g: ['Pat Example', 'Parent', '555-0100', 'pat@example.invalid', 'English'],
    law: ['Example Law Group', 'A. Counsel', '555-0190', 'counsel@example.invalid'],
    school: ['PS 000 Example School', '1 Sample Ave, Example Borough', 'M. Coordinator', 'Special ed coordinator', '555-0180', '8:00 AM to 2:20 PM'],
    lang: 'English', intake: ['2024-11-04', 'Referred by law firm after impartial hearing'], settings: 'School, home (after school)',
    allergies: 'None', consents: 'Service consent, photo/video no, data-sharing with counsel yes', related: 'Speech, OT (ended), AT training (complete)',
    cases: [['C1', 'FAKE-111111', '2024-25', 'Findings of Fact and Decision (compensatory award)', '2025-03-14', '2025-04-01 to 2026-12-31', 'Active', 'Comp banks still running'],
            ['C2', 'FAKE-222222', '2025-26', 'Statement of Agreement and Order', '2025-10-01', '2025-09-08 to 2026-06-26, bank to 2026-12-31', 'Partly closed', 'Weekly lines ended, one bank open'],
            ['C3', 'FAKE-333333', '2026-27', 'Pendency (hearing still open)', '2026-09-10', '2026-09-10 until the case concludes', 'Active', 'Pendency']],
    lines: [
      ['C1', '1', 'CompABA-Bank', 'Compensatory ABA', 'Home', 'Comp bank', 'IHO', 600, 60, 100, '2025-04-01', '2026-12-31', 410, 'P-002', 'Sat', '10:00-12:00', 'was Sam Formerly, P-007, until 2026-01-31'],
      ['C1', '2', 'CompBCBA-Bank', 'Compensatory BCBA Supervision', 'Home', 'Comp bank', 'IHO', 80, 60, 150, '2025-04-01', '2026-12-31', 52, 'P-003', 'Fri', '16:00-17:00'],
      ['C1', '3', 'CompST-Bank', 'Compensatory Speech Therapy', 'Home', 'Comp bank', 'IHO', 53, 45, 90, '2025-04-01', '2026-06-30', 53, 'P-004', '', ''],
      ['C2', '1', 'ABA-School', 'ABA', 'School', 'Weekly 20 hrs/wk', 'IHO', 800, 60, 90, '2025-09-08', '2026-06-26', 780, 'P-001', '', ''],
      ['C2', '2', 'BCBA-Supervision', 'BCBA Supervision', 'School', 'Weekly 2 hrs/wk', 'IHO', 80, 60, 150, '2025-09-08', '2026-06-26', 76, 'P-003', '', ''],
      ['C2', '3', 'OT-Weekly', 'Occupational Therapy', 'School pull-out', 'Weekly 2 x 30 min', 'IHO', 80, 30, 55, '2025-09-08', '2026-06-26', 74, 'P-005', '', ''],
      ['C2', '4', 'PCAT-Bank', 'Parent Counseling and Training', 'Home / remote', 'Bank', 'IHO', 30, 60, 130, '2025-10-01', '2026-12-31', 12, 'P-003', 'Thu', '18:00-19:00'],
      ['C2', '5', 'AT-FlatFee', 'Assistive Technology Training', 'Home', 'Flat fee', 'IHO', 1, 0, 1000, '2026-02-10', '2026-02-10', 1, 'P-006', '', ''],
      ['C3', '1', 'ABA-School', 'ABA', 'School', 'Weekly 15 hrs/wk', 'Pendency', 600, 60, 90, '2026-09-10', '', 78, 'P-001', 'Mon Tue Wed Thu Fri', '8:00-11:00'],
      ['C3', '2', 'ABA-AfterSchool', 'ABA (afterschool)', 'Home, after school', 'Weekly 5 hrs/wk', 'Pendency', 200, 60, 90, '2026-09-10', '', 26, 'P-002', 'Mon Tue Wed Thu Fri', '15:30-16:30'],
      ['C3', '3', 'BCBA-Supervision', 'BCBA Supervision', 'School + home', 'Weekly 2 hrs/wk', 'Pendency', 80, 60, 150, '2026-09-10', '', 10, 'P-003', 'Mon Wed', '11:00-12:00'],
      ['C3', '4P', 'ST-PushIn', 'Speech Therapy', 'School push-in', 'Weekly 2 x 30 min', 'Pendency', 80, 30, 60, '2026-09-10', '', 10, 'P-004', 'Tue Thu', '10:00-10:30']
    ],
    hearing: ['C3', '2026-12-07'], reports: [['2025-06-15', 'C1 period'], ['2026-01-20', 'C1 + C2 winter'], ['2026-06-20', 'C2 year end']], nextReport: '2026-11-30',
    notes: [['2026-10-21', 'Clinical Director', 'Case note', 'C3 disclosure Nov 30. Progress report draft started with P-003. Packet needs the BCBA hours letter.'],
            ['2026-10-17', 'Office', 'Billing', 'C1 comp ABA October log is missing the parent signature. Invoice held until signed.'],
            ['2026-10-15', 'Office', 'Authorization', 'AI 4 for speech push-in still pending with the DOE. Follow up sent to the implementation unit.'],
            ['2026-10-08', 'Dr. Morgan Mockup', 'Supervision', 'Observed school session. Prompt fading on track for 3 of 4 goals.'],
            ['2026-09-12', 'Office', 'School', 'School start confirmed with M. Coordinator. Badges issued for P-001 and P-004.']],
    ensora: ['Linked', 64, 3] }
  ];
})();
/* FICTIONAL DEMO DATA, students part 2. */
(function () {
  var D = window.SC, S = '2026-09-10';
  function st(o) { D.raw.push(o); }
  st({ id: 'STU-0002', tag: 'MS', name: 'Mira Sample', osis: '000-000-002', dob: '2020-03-14', grade: '1', cls: 'Speech or language impairment',
    addr: '45 Mock Lane, Example Borough', g: ['Lee Sample', 'Parent', '555-0201', 'lee.sample@example.invalid', 'Spanish'],
    law: ['Sample and Partners Law', 'B. Advocate', '555-0291', 'advocate@example.invalid'],
    school: ['PS 111 Sample Elementary', '11 Demo Road, Example Borough', 'R. Liaison', 'Assistant principal', '555-0281', '8:10 AM to 2:30 PM'],
    lang: 'Spanish', intake: ['2026-08-18', 'Referred by law firm'], settings: 'School', allergies: 'Peanut allergy, EpiPen in school nurse office',
    consents: 'Service consent, photo/video yes, data-sharing with counsel yes', related: 'Speech, OT',
    cases: [['C1', 'FAKE-444444', '2026-27', 'Statement of Agreement and Order', '2026-09-02', '2026-09-10 to 2027-06-25', 'Active', 'Weekly lines']],
    lines: [['C1', '1', 'ABA-School', 'ABA', 'School', 'Weekly 10 hrs/wk', 'IHO', 400, 60, 90, S, '2027-06-25', 58, 'P-008', 'Mon Tue Wed Thu Fri', '8:30-10:30'],
            ['C1', '2', 'BCBA-Supervision', 'BCBA Supervision', 'School', 'Weekly 2 hrs/wk', 'IHO', 80, 60, 150, S, '2027-06-25', 12, 'P-007', 'Fri', '9:00-11:00'],
            ['C1', '3', 'ST-Weekly', 'Speech Therapy', 'School push-in', 'Weekly 2 x 30 min', 'IHO', 80, 30, 60, S, '2027-06-25', 12, 'P-011', 'Mon Wed', '10:45-11:15'],
            ['C1', '4', 'OT-Weekly', 'Occupational Therapy', 'School pull-out', 'Weekly 2 x 30 min', 'IHO', 80, 30, 55, S, '2027-06-25', 11, 'P-005', 'Tue Thu', '13:00-13:30']],
    hearing: ['C1', '2027-02-08'], reports: [['2026-10-01', 'Baseline report']], nextReport: '2026-12-18',
    notes: [['2026-10-16', 'Office', 'School', 'Nurse confirmed EpiPen location. Shared with all four providers.'], ['2026-10-03', 'Dr. Quinn Demoson', 'Supervision', 'Baseline complete. Goals drafted for requesting and peer play.']],
    ensora: ['Linked', 31, 0] });
  st({ id: 'STU-0003', tag: 'OP', name: 'Otto Placeholder', osis: '000-000-003', dob: '2016-06-22', grade: '5', cls: 'Autism',
    addr: '78 Sample Court, Example Borough', g: ['Robin Placeholder', 'Grandparent', '555-0301', 'robin.p@example.invalid', 'English'],
    law: ['Demo Legal Advocates', 'C. Barrister', '555-0391', 'barrister@example.invalid'],
    school: ['Home instruction (DOE approved)', '78 Sample Court, Example Borough', 'H. Visitor', 'Home instruction teacher', '555-0381', '9:00 AM to 2:00 PM at home'],
    attends: 'No, home instruction', lang: 'English', intake: ['2025-05-12', 'Parent referral'], settings: 'Home', allergies: 'None',
    consents: 'Service consent, photo/video no, data-sharing with counsel yes', related: 'AT training',
    cases: [['C1', 'FAKE-555500', '2024-25', 'Findings of Fact and Decision (compensatory award)', '2025-06-30', '2025-07-15 to 2027-06-30', 'Active', 'Comp bank'],
            ['C2', 'FAKE-555555', '2026-27', 'Pendency (hearing still open)', '2026-09-08', '2026-09-08 until the case concludes', 'Active', 'Pendency']],
    lines: [['C1', '1', 'CompABA-Bank', 'Compensatory ABA', 'Home', 'Comp bank', 'IHO', 300, 60, 100, '2025-07-15', '2027-06-30', 188, 'P-009', 'Sat', '9:00-11:00'],
            ['C2', '1', 'ABA-Home', 'ABA', 'Home', 'Weekly 25 hrs/wk', 'Pendency', 1000, 60, 90, '2026-09-08', '', 150, 'P-009', 'Mon Tue Wed Thu Fri', '9:00-14:00'],
            ['C2', '2', 'BCBA-Supervision', 'BCBA Supervision', 'Home', 'Weekly 2 hrs/wk', 'Pendency', 80, 60, 150, '2026-09-08', '', 12, 'P-003', 'Tue', '13:00-15:00'],
            ['C2', '3', 'AT-Bank', 'Assistive Technology Training', 'Home', 'Bank', 'Pendency', 10, 60, 120, '2026-09-08', '', 3, 'P-006', 'Sat', '11:00-12:00']],
    hearing: ['C2', '2026-11-19'], reports: [['2025-12-15', 'C1 fall'], ['2026-06-18', 'C1 year end']], nextReport: '2026-11-12',
    notes: [['2026-10-20', 'Clinical Director', 'Case note', 'Hearing Nov 19. Disclosure Nov 12. Packet almost complete.'], ['2026-10-01', 'Jamie Fakename', 'Session', 'Started speech generating device training with the family.']],
    ensora: ['Linked', 58, 1] });
  st({ id: 'STU-0004', tag: 'LT', name: 'Luna Testa', osis: '000-000-004', dob: '2022-02-02', grade: 'Pre-K', cls: 'Preschool student with a disability',
    addr: '9 Example Way, Example Borough', g: ['Sam Testa', 'Parent', '555-0401', 'sam.testa@example.invalid', 'English, Italian'],
    law: ['Example Law Group', 'A. Counsel', '555-0190', 'counsel@example.invalid'],
    school: ['Demo Preschool Center', '200 Placeholder Blvd, Example Borough', 'T. Director', 'Center director', '555-0481', '12:00 PM to 3:00 PM'],
    lang: 'English', intake: ['2026-06-30', 'Referred by law firm'], settings: 'Home, preschool', allergies: 'Dairy sensitivity',
    consents: 'Service consent, photo/video yes, data-sharing with counsel yes', related: 'Speech, parent training',
    cases: [['C1', 'FAKE-666666', '2026-27', 'Findings of Fact and Decision', '2026-08-20', '2026-09-01 to 2027-08-31', 'Active', 'Weekly lines and bank']],
    lines: [['C1', '1', 'ABA-Home', 'ABA', 'Home', 'Weekly 6 hrs/wk', 'IHO', 300, 60, 90, '2026-09-01', '2027-08-31', 42, 'P-002', 'Mon Wed Fri', '9:00-11:00'],
            ['C1', '2', 'PCAT-Bank', 'Parent Counseling and Training', 'Home / remote', 'Bank', 'IHO', 24, 60, 130, '2026-09-01', '2027-08-31', 6, 'P-007', 'Wed', '18:00-19:00'],
            ['C1', '3', 'ST-Weekly', 'Speech Therapy', 'Preschool', 'Weekly 2 x 30 min', 'IHO', 90, 30, 60, '2026-09-01', '2027-08-31', 13, 'P-004', 'Mon Wed', '11:30-12:00']],
    hearing: ['C1', '2027-05-03'], reports: [['2026-10-05', 'Baseline report']], nextReport: '2026-12-20',
    notes: [['2026-10-14', 'Dr. Quinn Demoson', 'Parent training', 'Family practicing visual schedule at bedtime. Good carryover.'], ['2026-09-02', 'Office', 'Intake', 'Service agreement signed. Schedule set with the family.']],
    ensora: ['Linked', 24, 0] });
  st({ id: 'STU-0005', tag: 'BD', name: 'Bram Demoray', osis: '000-000-005', dob: '2017-09-30', grade: '4', cls: 'Autism',
    addr: '310 Fictional Ave, Example Borough', g: ['Jo Demoray', 'Parent', '555-0501', 'jo.demoray@example.invalid', 'Mandarin, English'],
    law: ['Mockingbird Education Law', 'D. Pleader', '555-0591', 'pleader@example.invalid'],
    school: ['PS 333 Placeholder Elementary', '33 Sample Street, Example Borough', 'K. Counselor', 'Guidance counselor', '555-0581', '8:00 AM to 2:20 PM'],
    lang: 'Mandarin', intake: ['2026-08-27', 'Referred by law firm after impartial hearing'], settings: 'Home (after school), school',
    allergies: 'None', consents: 'Service consent, photo/video no, data-sharing with counsel yes', related: 'Counseling',
    cases: [['C1', 'FAKE-777777', '2026-27', 'Pendency (hearing still open)', '2026-09-09', '2026-09-10 until the case concludes', 'Active', 'Pendency']],
    lines: [['C1', '1', 'ABA-AfterSchool', 'ABA (afterschool)', 'Home, after school', 'Weekly 10 hrs/wk', 'Pendency', 400, 60, 90, S, '', 56, 'P-009', 'Mon Tue Wed Thu Fri', '15:30-17:30'],
            ['C1', '2', 'BCBA-Supervision', 'BCBA Supervision', 'Home', 'Weekly 1 hr/wk', 'Pendency', 40, 60, 150, S, '', 6, 'P-003', 'Thu', '14:00-15:00'],
            ['C1', '3', 'Counseling-Weekly', 'Counseling Services', 'School', 'Weekly 1 x 30 min', 'Pendency', 40, 30, 70, S, '', 6, 'P-012', 'Fri', '13:00-13:30']],
    hearing: ['C1', '2027-01-12'], reports: [['2026-10-06', 'Baseline report']], nextReport: '2027-01-05',
    notes: [['2026-10-12', 'Office', 'Hearing', 'Lawyer asked for provider CVs for the January hearing.'], ['2026-09-18', 'Skyler Standin', 'Session', 'Family prefers Mandarin for parent updates. Notes shared in both languages.']],
    ensora: ['Linked', 38, 1] });
})();
/* FICTIONAL DEMO DATA, students part 3. */
(function () {
  var D = window.SC, S = '2026-09-10', E = '2027-06-25';
  function st(o) { D.raw.push(o); }
  st({ id: 'STU-0006', tag: 'WT', name: 'Wren Testcase', osis: '000-000-006', dob: '2019-04-11', grade: '2', cls: 'Multiple disabilities',
    addr: '52 Placeholder Place, Example Borough', g: ['Ari Testcase', 'Parent', '555-0601', 'ari.t@example.invalid', 'English'],
    law: ['Demo Legal Advocates', 'C. Barrister', '555-0391', 'barrister@example.invalid'],
    school: ['PS 666 Sample Academy', '66 Mock Parkway, Example Borough', 'V. Chair', 'IEP coordinator', '555-0681', '8:20 AM to 2:40 PM'],
    lang: 'English', intake: ['2025-08-11', 'Referred by school'], settings: 'School, home', allergies: 'Seizure plan on file, school nurse trained',
    consents: 'Service consent, photo/video no, data-sharing with counsel yes', related: 'OT, PT',
    cases: [['C1', 'FAKE-888800', '2025-26', 'Statement of Agreement and Order', '2025-09-15', '2025-09-15 to 2026-06-26', 'Closed', 'All lines ended'],
            ['C2', 'FAKE-888888', '2026-27', 'Statement of Agreement and Order', '2026-09-04', '2026-09-10 to 2027-06-25', 'Active', 'Weekly lines']],
    lines: [['C1', '1', 'ABA-School', 'ABA', 'School', 'Weekly 10 hrs/wk', 'IHO', 400, 60, 90, '2025-09-15', '2026-06-26', 392, 'P-001', '', ''],
            ['C2', '1', 'ABA-School', 'ABA', 'School', 'Weekly 10 hrs/wk', 'IHO', 400, 60, 90, S, E, 60, 'P-001', 'Mon Tue Wed Thu Fri', '12:00-14:00'],
            ['C2', '2', 'BCBA-Supervision', 'BCBA Supervision', 'School', 'Weekly 1 hr/wk', 'IHO', 40, 60, 150, S, E, 6, 'P-007', 'Tue', '14:00-15:00'],
            ['C2', '3', 'OT-Weekly', 'Occupational Therapy', 'School pull-out', 'Weekly 2 x 30 min', 'IHO', 80, 30, 55, S, E, 12, 'P-005', 'Mon Wed', '9:00-9:30'],
            ['C2', '4', 'PT-Weekly', 'Physical Therapy', 'Home', 'Weekly 2 x 45 min', 'IHO', 80, 45, 75, S, E, 11, 'P-010', 'Tue Thu', '15:00-15:45']],
    hearing: ['C2', '2027-03-15'], reports: [['2026-01-22', 'C1 winter'], ['2026-06-24', 'C1 year end']], nextReport: '2026-12-15',
    notes: [['2026-10-06', 'Drew Fictive', 'Session', 'Moved PT to Tuesday and Thursday afternoons at the family request.'], ['2026-09-10', 'Office', 'School', 'Seizure plan reviewed with P-001 and P-005 before school start.']],
    ensora: ['Linked', 49, 0] });
  st({ id: 'STU-0007', tag: 'JS', name: 'Juniper Specimen', osis: '000-000-007', dob: '2015-12-05', grade: '6', cls: 'Emotional disability',
    addr: '14 Sampleton Road, Example Borough', g: ['Kit Specimen', 'Foster parent', '555-0701', 'kit.s@example.invalid', 'English, Arabic'],
    law: ['Mockingbird Education Law', 'D. Pleader', '555-0591', 'pleader@example.invalid'],
    school: ['PS 222 Demo Academy', '222 Example Street, Example Borough', 'N. Dean', 'Dean of students', '555-0781', '8:00 AM to 2:50 PM'],
    lang: 'English', intake: ['2026-01-20', 'Referred by foster care agency'], settings: 'School', allergies: 'None',
    consents: 'Service consent, photo/video no, data-sharing with counsel yes (agency co-signed)', related: 'Counseling',
    cases: [['C1', 'FAKE-999900', '2025-26', 'Findings of Fact and Decision (compensatory award)', '2026-02-10', '2026-03-01 to 2027-02-28', 'Active', 'Comp bank'],
            ['C2', 'FAKE-999999', '2026-27', 'Statement of Agreement and Order', '2026-09-03', '2026-09-10 to 2027-06-25', 'Active', 'Weekly lines']],
    lines: [['C1', '1', 'CompCounseling-Bank', 'Compensatory Counseling Services', 'School', 'Comp bank', 'IHO', 60, 40, 70, '2026-03-01', '2027-02-28', 34, 'P-012', 'Mon', '13:00-13:40'],
            ['C2', '1', 'Counseling-Weekly', 'Counseling Services', 'School', 'Weekly 2 x 40 min', 'IHO', 80, 40, 70, S, E, 12, 'P-012', 'Mon Wed', '12:00-12:40'],
            ['C2', '2', 'BCBA-Consult', 'BCBA Consultation', 'School', 'Weekly 1 hr/wk', 'IHO', 40, 60, 150, S, E, 6, 'P-007', 'Thu', '10:00-11:00']],
    hearing: ['C2', '2027-04-20'], reports: [['2026-06-19', 'C1 year end']], nextReport: '2027-01-15',
    notes: [['2026-10-11', 'Hollis Notreal', 'Session', 'Started a small social skills group with school approval.'], ['2026-09-03', 'Office', 'Consent', 'Agency caseworker co-signed the data-sharing consent.']],
    ensora: ['Linked', 27, 0] });
  st({ id: 'STU-0008', tag: 'FH', name: 'Fern Hollowmock', osis: '000-000-008', dob: '2019-07-19', grade: '2', cls: 'Speech or language impairment',
    addr: '600 Demo Terrace, Example Borough', g: ['Bo Hollowmock', 'Parent', '555-0801', 'bo.h@example.invalid', 'English'],
    law: ['Sample and Partners Law', 'B. Advocate', '555-0291', 'advocate@example.invalid'],
    school: ['PS 444 Mockingbird School', '44 Example Lane, Example Borough', 'P. Planner', 'Special ed coordinator', '555-0881', '8:00 AM to 2:20 PM'],
    lang: 'English', intake: ['2025-10-02', 'Referred by law firm'], settings: 'School', allergies: 'None',
    consents: 'Service consent, photo/video yes, data-sharing with counsel yes', related: 'Speech',
    cases: [['C1', 'FAKE-121200', '2025-26', 'Findings of Fact and Decision (compensatory award)', '2025-12-01', '2026-01-05 to 2026-12-31', 'Active', 'Comp bank'],
            ['C2', 'FAKE-121212', '2026-27', 'Statement of Agreement and Order', '2026-09-05', '2026-09-10 to 2027-06-25', 'Active', 'Weekly lines']],
    lines: [['C1', '1', 'CompST-Bank', 'Compensatory Speech Therapy', 'School', 'Comp bank', 'IHO', 50, 60, 90, '2026-01-05', '2026-12-31', 41, 'P-004', 'Fri', '9:00-10:00'],
            ['C2', '1', 'ST-Weekly', 'Speech Therapy', 'School pull-out', 'Weekly 2 x 45 min', 'IHO', 80, 45, 70, S, E, 12, 'P-011', 'Tue Thu', '9:00-9:45'],
            ['C2', '2', 'BCBA-Consult', 'BCBA Consultation', 'School', 'Weekly 1 hr/wk', 'IHO', 40, 60, 150, S, E, 5, 'P-007', 'Mon', '13:00-14:00']],
    hearing: ['C2', '2027-02-22'], reports: [['2026-06-22', 'C1 year end']], nextReport: '2026-12-11',
    notes: [['2026-10-09', 'Emery Madeup', 'Session', 'Articulation probes up to 70 percent on target sounds.'], ['2026-09-12', 'Office', 'Staffing', 'P-011 assigned to the weekly speech line.']],
    ensora: ['Linked', 21, 0] });
  st({ id: 'STU-0009', tag: 'CC', name: 'Cass Copyton', osis: '000-000-009', dob: '2018-05-27', grade: '3', cls: 'Autism',
    addr: '87 Mockup Street, Example Borough', g: ['Dee Copyton', 'Parent', '555-0901', 'dee.c@example.invalid', 'Haitian Creole, English'],
    law: ['Example Law Group', 'A. Counsel', '555-0190', 'counsel@example.invalid'],
    school: ['PS 555 Testwood School', '5 Fictional Circle, Example Borough', 'L. Supervisor', 'Assistant principal', '555-0981', '8:30 AM to 2:50 PM'],
    lang: 'Haitian Creole', intake: ['2026-07-14', 'Referred by law firm after impartial hearing'], settings: 'School',
    allergies: 'Gluten free diet', consents: 'Service consent, photo/video no, data-sharing with counsel yes', related: 'OT, speech',
    cases: [['C1', 'FAKE-131313', '2026-27', 'Pendency (hearing still open)', '2026-09-08', '2026-09-10 until the case concludes', 'Active', 'Pendency']],
    lines: [['C1', '1', 'ABA-School', 'ABA', 'School', 'Weekly 10 hrs/wk', 'Pendency', 400, 60, 90, S, '', 56, 'P-008', 'Mon Tue Wed Thu Fri', '11:30-13:30'],
            ['C1', '2', 'BCBA-Supervision', 'BCBA Supervision', 'School', 'Weekly 1 hr/wk', 'Pendency', 40, 60, 150, S, '', 6, 'P-007', 'Wed', '10:00-11:00'],
            ['C1', '3', 'OT-Weekly', 'Occupational Therapy', 'School pull-out', 'Weekly 1 x 30 min', 'Pendency', 40, 30, 55, S, '', 6, 'P-005', 'Fri', '11:00-11:30'],
            ['C1', '4', 'ST-Weekly', 'Speech Therapy', 'School push-in', 'Weekly 1 x 45 min', 'Pendency', 40, 45, 70, S, '', 6, 'P-011', 'Mon', '14:00-14:45']],
    hearing: ['C1', '2026-12-14'], reports: [['2026-10-08', 'Baseline report']], nextReport: '2026-12-04',
    notes: [['2026-10-19', 'Office', 'Ensora', 'Two session notes from P-008 still unsigned in Ensora.'], ['2026-10-02', 'Dr. Quinn Demoson', 'Supervision', 'Token board introduced. Transitions faster this week.']],
    ensora: ['Linked', 33, 2] });
  st({ id: 'STU-0010', tag: 'NE', name: 'Nico Exampleton', osis: '000-000-010', dob: '2014-10-03', grade: '7', cls: 'Orthopedic impairment',
    addr: '1200 Sample Heights, Example Borough', g: ['Mel Exampleton', 'Parent', '555-1001', 'mel.e@example.invalid', 'English'],
    law: ['Demo Legal Advocates', 'C. Barrister', '555-0391', 'barrister@example.invalid'],
    school: ['IS 777 Example Middle School', '77 Placeholder Ave, Example Borough', 'G. Advisor', 'Grade advisor', '555-1081', '8:00 AM to 2:45 PM'],
    lang: 'English', intake: ['2025-11-17', 'Parent referral'], settings: 'Home (after school)', allergies: 'Latex allergy',
    consents: 'Service consent, photo/video yes, data-sharing with counsel yes', related: 'PT',
    cases: [['C1', 'FAKE-141414', '2026-27', 'Statement of Agreement and Order', '2026-09-01', '2026-09-10 to 2027-06-25', 'Active', 'Weekly lines']],
    lines: [['C1', '1', 'ABA-AfterSchool', 'ABA (afterschool)', 'Home, after school', 'Weekly 4 hrs/wk', 'IHO', 160, 60, 90, S, E, 24, 'P-002', 'Tue Thu', '17:00-19:00'],
            ['C1', '2', 'BCBA-Supervision', 'BCBA Supervision', 'Home', 'Weekly 1 hr/wk', 'IHO', 40, 60, 150, S, E, 6, 'P-003', 'Mon', '17:00-18:00'],
            ['C1', '3', 'PT-Weekly', 'Physical Therapy', 'Home', 'Weekly 1 x 45 min', 'IHO', 40, 45, 75, S, E, 6, 'P-010', 'Wed', '16:00-16:45']],
    hearing: ['C1', '2027-03-29'], reports: [['2026-06-17', 'Prior year end']], nextReport: '2026-12-18',
    notes: [['2026-10-13', 'Drew Fictive', 'Session', 'Latex free equipment kit confirmed at home.'], ['2026-09-14', 'Office', 'Schedule', 'After school sessions start at 5:00 to fit the bus schedule.']],
    ensora: ['Linked', 18, 0] });
})();
/* Builds the fictional model from the raw demo records above. */
(function () {
  var D = window.SC, T = D.today, add = D.addDays;
  function age(dob) { var a = +T.slice(0, 4) - +dob.slice(0, 4); if (T.slice(5) < dob.slice(5)) a--; return a; }
  function bizBack(s, n) { var d = new Date(s + 'T12:00:00'); while (n > 0) { d.setDate(d.getDate() - 1); var w = d.getDay(); if (w && w < 6) n--; } return d.toISOString().slice(0, 10); }
  function perWeek(days) { return days ? days.split(' ').length : 0; }
  D.students = D.raw.map(function (r, si) {
    var s = { id: r.id, tag: r.tag, name: r.name, osis: r.osis, dob: r.dob, age: age(r.dob), grade: r.grade, cls: r.cls, addr: r.addr,
      guardian: { name: r.g[0], rel: r.g[1], phone: r.g[2], email: r.g[3], lang: r.g[4] },
      lawyer: { firm: r.law[0], name: r.law[1], phone: r.law[2], email: r.law[3] },
      school: { name: r.school[0], addr: r.school[1], contact: r.school[2], title: r.school[3], phone: r.school[4], hours: r.school[5] },
      attends: r.attends || 'Yes', lang: r.lang, status: 'Active' };
    s.cases = r.cases.map(function (c) { return { tag: c[0], num: c[1], sy: c[2], basis: c[3], orderDate: c[4], window: c[5], status: c[6], note: c[7] }; });
    s.lines = r.lines.map(function (l) {
      var pend = /P$/.test(l[1]), max = l[7], used = l[12], end = l[11];
      var o = { tag: r.tag + '-' + l[0] + '-' + l[2], case: l[0], ai: l[1].replace('P', ''), aiPending: pend, label: l[3], setting: l[4], type: l[5], funding: l[6],
        max: max, len: l[8], rate: l[9], start: l[10], end: end, used: used, remaining: Math.max(0, max - used), pid: l[13], days: l[14], time: l[15], note: l[16] || '' };
      o.window = o.type === 'Flat fee' ? 'Delivered ' + o.start : o.start + (end ? ' to ' + end : ' until case ends');
      o.status = end && end < T ? (used >= max ? 'Complete' : 'Ended') : used >= max ? 'Exhausted' : pend ? 'AI pending' : 'Active';
      if (o.type === 'Flat fee') o.status = 'Complete';
      o.caseNum = s.cases.filter(function (c) { return c.tag === o.case; })[0].num;
      return o;
    });
    var act = s.lines.filter(function (l) { return l.status === 'Active' || l.status === 'AI pending'; });
    s.active = act;
    s.hrsWk = act.reduce(function (a, l) { return a + (/Weekly/.test(l.type) ? perWeek(l.days) * hoursOf(l.time) : 0); }, 0);
    s.schedule = act.filter(function (l) { return l.days; }).map(function (l) { return l.days.replace(/ /g, ', ') + ' ' + l.time + ' ' + l.label + ' (' + l.pid + ')'; });
    s.team = []; s.lines.forEach(function (l) { if (s.team.indexOf(l.pid) < 0) s.team.push(l.pid); });
    if (r.id === 'STU-0001') s.formerTeam = [{ pid: 'P-007X', name: 'Sam Formerly', role: 'RBT', lines: 'ZX-C1-CompABA-Bank until 2026-01-31', left: '2026-01-31' }];
    s.bcba = s.team.map(function (p) { return D.pmap[p]; }).filter(function (p) { return p.role === 'BCBA'; })[0];
    var i0 = r.intake[0];
    s.intake = { date: i0, source: r.intake[1], settings: r.settings, allergies: r.allergies, consents: r.consents, related: r.related, status: 'Complete',
      papers: ['Student intake form', 'Signed service agreement', 'Consents', 'IEP copy', 'Guardian contact sheet', 'Schedule and availability form'].map(function (n, k) { return { name: n, date: add(i0, k % 3), status: 'Received' }; }) };
    var sy0 = s.cases[0].sy;
    s.docs = [
      { name: 'IEP (current)', ver: '2026-05-2' + (si % 9) + ', SY 2026-27', status: 'On file' },
      { name: 'IEP (prior)', ver: '2025-05-1' + (si % 9) + ', SY 2025-26', status: 'On file' },
      { name: 'Evaluations (psych-ed, speech, OT, FBA)', ver: (+i0.slice(0, 4) - 1) + ' to 2026', status: 'On file' },
      { name: 'Behavior plan / treatment plan and goals', ver: 'v' + (2 + si % 3) + ', 2026-09-1' + (si % 9), status: 'On file' },
      { name: 'Consents (service, photo/video, data-sharing)', ver: 'Renewed 2026-09-01, first signed ' + i0, status: 'On file' },
      { name: 'Other: school letter', ver: '2026-09-0' + (1 + si % 8), status: 'On file' },
      { name: 'Progress report history', ver: r.reports.length + ' reports, latest ' + r.reports[r.reports.length - 1][0], status: 'On file' }
    ];
    var hasSchool = function (c) { return s.lines.some(function (l) { return l.case === c.tag && /School|Preschool/.test(l.setting); }); };
    s.cases.forEach(function (c) {
      var ls = s.lines.filter(function (l) { return l.case === c.tag; }), pendN = ls.filter(function (l) { return l.aiPending; }).length;
      var st0 = ls[0].start, hear = r.hearing[0] === c.tag;
      c.lineCount = ls.length;
      c.docs = [
        ['Order / pendency document', c.basis.split(' (')[0] + ', ' + c.orderDate, 'On file'],
        ['Vendor info sent to DOE', add(c.orderDate, 9), 'On file'],
        ['DOE authorization emails', 'AI 1 to AI ' + (ls.length - pendN) + ' received' + (pendN ? ', AI ' + ls.length + ' pending' : ''), pendN ? 'Pending' : 'On file'],
        ['Signed parent service agreement', add(st0, -9), 'On file'],
        ['School start confirmation', hasSchool(c) ? add(st0, 2) : 'Not needed (home only)', 'On file'],
        ['Provider change notice / bank continuation', r.id === 'STU-0001' && c.tag === 'C1' ? '2026-02-01 (CompABA moved to P-002)' : 'Not needed', 'On file'],
        ['Case intake form', add(st0, -9), 'On file'],
        ['Hearing evidence packet', hear ? 'Due for disclosure ' + bizBack(r.hearing[1], 5) : 'Used for ' + c.tag + ' hearing', hear ? 'In prep' : 'On file'],
        ['BCBA affidavit / recommended hours letter', hear ? 'Draft, due ' + add(bizBack(r.hearing[1], 5), -7) : add(c.orderDate, -20), hear ? 'In prep' : 'On file'],
        ['Monthly DOE invoices', c.status === 'Closed' ? 'Final invoice 2026-07-06' : 'Monthly, October in progress', 'On file']
      ].map(function (d) { return { name: d[0], val: d[1], status: d[2] }; });
    });
    var un = r.ensora[2];
    s.billing = act.filter(function (l) { return l.type !== 'Flat fee'; }).map(function (l, k) {
      var n = /Weekly/.test(l.type) ? perWeek(l.days) * 3 : (l.days ? 3 : 2), mins = l.len * n, hrs = (mins / 60);
      var sign = /School|Preschool/.test(l.setting) ? 'Provider + principal' : 'Provider + parent', stt = 'Sent to DOE';
      if (l.aiPending) stt = 'Held: authorization pending';
      else if (r.id === 'STU-0001' && l.case === 'C1' && l.ai === '1') { stt = 'Blocked: missing parent signature'; sign = 'Provider only'; }
      else if (un && k === 0) { stt = 'Held: ' + un + ' unsigned notes'; }
      return { id: r.tag + '-2026-10-' + l.pid.replace('-', '') + '-' + l.case + '-AI' + l.ai, pid: l.pid, line: l.tag, ai: l.ai, caseTag: l.case, sessions: n, hrs: hrs.toFixed(2), billed: n + ' x ' + l.len + ' min', amount: n * l.rate, sign: sign, status: stt };
    });
    s.notes = r.notes.map(function (n) { return { date: n[0], who: n[1], type: n[2], text: n[3] }; });
    var disc = bizBack(r.hearing[1], 5);
    s.progress = { history: r.reports.map(function (x) { return { date: x[0], period: x[1], by: s.bcba.name, status: 'Signed, final' }; }),
      next: r.nextReport, assessment: add(r.nextReport, 45), txReview: add(r.intake[0].slice(0, 4) === '2026' ? '2026-12-01' : '2026-11-15', si),
      hearing: r.hearing[1], hearingCase: r.hearing[0], disclosure: disc, alert: add(disc, -21), consent: 'Current, renewed 2026-09-01' };
    var soon = disc < add(T, 45);
    s.packet = ['Goal by goal progress report with baselines', 'Treatment plan, goals and curriculum (dated)', 'Current BIP (dated)', 'Weekly schedule (dated)',
      'Attendance and hours per service per month', 'Session and supervision notes', 'BCBA recommended hours letter', 'Provider CVs'].map(function (n, k) {
      return { name: n, status: soon && (k === 0 || k === 6) ? 'In prep' : 'Ready' };
    });
    s.ensora = { profile: r.ensora[0], client: 'DEMO-EN-' + (4100 + si * 7), synced: r.ensora[1], unsigned: un, lastSync: T + ' 6:00 AM', graphs: add(T, -(si % 4) - 1) };
    s.attention = [];
    if (un) s.attention.push(un + (un === 1 ? ' unsigned note' : ' unsigned notes') + ' in Ensora');
    if (s.lines.some(function (l) { return l.aiPending; })) s.attention.push('Authorization pending');
    if (soon) s.attention.push('Disclosure ' + disc);
    s.billing.forEach(function (b) { if (/^Blocked/.test(b.status)) s.attention.push(b.status.replace('Blocked: ', 'Invoice blocked: ')); });
    return s;
  });
  function hoursOf(t) { if (!t) return 0; var p = t.split('-').map(function (x) { var a = x.split(':'); return +a[0] + (+a[1]) / 60; }); return p[1] - p[0]; }
  D.hoursOf = hoursOf;
  D.smap = {}; D.students.forEach(function (s) { D.smap[s.id] = s; });
  D.providers.forEach(function (p) {
    p.lines = []; D.students.forEach(function (s) { s.lines.forEach(function (l) { if (l.pid === p.id) p.lines.push({ s: s, l: l }); }); });
    p.studentIds = []; p.lines.forEach(function (x) { if (p.studentIds.indexOf(x.s.id) < 0) p.studentIds.push(x.s.id); });
    p.activeStudents = []; p.lines.forEach(function (x) { if ((x.l.status === 'Active' || x.l.status === 'AI pending') && p.activeStudents.indexOf(x.s.id) < 0) p.activeStudents.push(x.s.id); });
    p.week = {}; ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { p.week[d] = []; });
    p.lines.forEach(function (x) { if (x.l.days && (x.l.status === 'Active' || x.l.status === 'AI pending')) x.l.days.split(' ').forEach(function (d) { p.week[d].push({ time: x.l.time, s: x.s, l: x.l }); }); });
    p.hrsWk = 0; Object.keys(p.week).forEach(function (d) { p.week[d].sort(function (a, b) { return pad(a.time) < pad(b.time) ? -1 : 1; }); p.week[d].forEach(function (b) { p.hrsWk += hoursOf(b.time); }); });
    p.ensora.students = p.activeStudents.length;
  });
  function pad(t) { return t.length < 11 ? '0' + t : t; }
  var auth = 0, used = 0;
  D.students.forEach(function (s) { s.active.forEach(function (l) { auth += l.max * (l.len || 60) / 60; used += l.used * (l.len || 60) / 60; }); });
  D.stats = { students: D.students.length, providers: D.providers.length,
    intakeDone: D.students.filter(function (s) { return s.intake.status === 'Complete'; }).length + D.providers.filter(function (p) { return p.intake === 'Complete'; }).length,
    intakeAll: D.students.length + D.providers.length, hrsUsed: Math.round(used), hrsAuth: Math.round(auth) };
})();
