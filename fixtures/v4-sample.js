/* FICTIONAL sample only. Safe for the public repo. No real students, providers, or clinical content. */
window.TTG_V4_FIXTURES = {
  generated: '2026-11-06',
  disclaimer: 'Fictional sample data',
  students: [{
    id: 'STU-DEMO-001',
    code: 'JL',
    name: 'Jordan Lee',
    status: 'Active',
    services: ['OT weekly', 'Speech biweekly'],
    providers: [
      { id: 'PRV-DEMO-001', name: 'A. Brooks (fictional)', role: 'OT' },
      { id: 'PRV-DEMO-002', name: 'M. Patel (fictional)', role: 'Speech' }
    ],
    history: [
      { date: '2026-09-01', label: 'Sep–Oct tracking window opened' },
      { date: '2026-09-08', label: 'Grip baseline 4.0 min' },
      { date: '2026-10-20', label: 'Grip 7.5 min recorded' }
    ],
    documents: [
      { name: 'Annual OT assessment', type: 'Assessment', date: '2026-09-12', source: 'Sample upload' },
      { name: 'Speech progress summary', type: 'Plan', date: '2026-10-02', source: 'Sample upload' },
      { name: 'Goal tracker export', type: 'Tracker', date: '2026-10-20', source: 'Sample export' }
    ],
    goals: [
      { name: 'Pencil grasp endurance', unit: 'minutes', values: [
        { date: '2026-09-08', value: 4.0, source: 'Sample session note' },
        { date: '2026-09-22', value: 5.5, source: 'Sample session note' },
        { date: '2026-10-06', value: 6.0, source: 'Sample session note' },
        { date: '2026-10-20', value: 7.5, source: 'Sample session note' }
      ]},
      { name: 'Utterance length', unit: 'words', values: [
        { date: '2026-10-14', value: 3.2, source: 'Sample session note' }
      ]}
    ],
    emailRefs: ['EM-DEMO-001', 'EM-DEMO-003']
  }, {
    id: 'STU-DEMO-002',
    code: 'AR',
    name: 'Alex Rivera',
    status: 'Active',
    services: ['PT'],
    providers: [{ id: 'PRV-DEMO-003', name: 'J. Nguyen (fictional)', role: 'PT' }],
    history: [{ date: '2026-10-01', label: 'Goals check-in due' }],
    documents: [],
    goals: [],
    emailRefs: []
  }],
  /* Ambiguous name pair for identity tests — same display name, different ids */
  ambiguousNames: [
    { id: 'STU-DEMO-010', name: 'Sam Ortiz', code: 'SO1' },
    { id: 'STU-DEMO-011', name: 'Sam Ortiz', code: 'SO2' }
  ],
  notes: [
    { id: 'NOTE-DEMO-001', studentId: 'STU-DEMO-001', date: '2026-10-20', providerId: 'PRV-DEMO-001', provider: 'A. Brooks (fictional)', service: 'OT', status: 'Complete', text: 'Grip held 7.5 min on writing task.', source: 'Sample session note', durationMin: 45 },
    { id: 'NOTE-DEMO-002', studentId: 'STU-DEMO-001', date: '2026-10-14', providerId: 'PRV-DEMO-002', provider: 'M. Patel (fictional)', service: 'Speech', status: 'Complete', text: 'Mixed utterance length across turns.', source: 'Sample session note', durationMin: 30 },
    { id: 'NOTE-DEMO-003', studentId: 'STU-DEMO-001', date: '2026-10-06', providerId: 'PRV-DEMO-001', provider: 'A. Brooks (fictional)', service: 'OT', status: 'Complete', text: 'Grip endurance 6.0 min.', source: 'Sample session note', durationMin: 45 },
    { id: 'NOTE-DEMO-004', studentId: 'STU-DEMO-001', date: '2026-09-22', providerId: 'PRV-DEMO-001', provider: 'A. Brooks (fictional)', service: 'OT', status: 'Partial', text: 'Objective fields filled; plan brief.', source: 'Sample session note', durationMin: 45 },
    { id: 'NOTE-DEMO-005', studentId: 'STU-DEMO-001', date: '2026-09-08', providerId: 'PRV-DEMO-001', provider: 'A. Brooks (fictional)', service: 'OT', status: 'Complete', text: 'Baseline grip endurance recorded at 4 minutes.', source: 'Sample session note', durationMin: 45 }
  ],
  /* Session logged without a note — proves note absence != session absence */
  sessionsWithoutNotes: [
    { id: 'SES-DEMO-001', studentId: 'STU-DEMO-001', date: '2026-10-18', provider: 'A. Brooks (fictional)', service: 'OT', durationMin: 45, noteId: null }
  ],
  schedules: [
    { providerId: 'PRV-DEMO-001', provider: 'A. Brooks (fictional)', studentId: 'STU-DEMO-001', student: 'Jordan Lee', service: 'OT', when: 'Mon / Wed 10:00', status: 'Assigned' },
    { providerId: 'PRV-DEMO-002', provider: 'M. Patel (fictional)', studentId: 'STU-DEMO-001', student: 'Jordan Lee', service: 'Speech', when: 'Thu 2:00', status: 'Open gap' },
    { providerId: 'PRV-DEMO-003', provider: 'J. Nguyen (fictional)', studentId: 'STU-DEMO-002', student: 'Alex Rivera', service: 'PT', when: 'Tue / Fri 11:00', status: 'Assigned' }
  ],
  billingBatches: [{
    id: 'BILL-DEMO-001',
    studentId: 'STU-DEMO-001',
    student: 'Jordan Lee',
    service: 'OT',
    period: 'Sep–Oct 2026',
    status: 'Needs review',
    lines: [
      { id: 'BL-1', date: '2026-10-20', provider: 'A. Brooks', durationMin: 45, noteId: 'NOTE-DEMO-001' },
      { id: 'BL-2', date: '2026-10-06', provider: 'A. Brooks', durationMin: 45, noteId: 'NOTE-DEMO-003' },
      { id: 'BL-3', date: '2026-09-22', provider: 'A. Brooks', durationMin: 45, noteId: 'NOTE-DEMO-004' },
      { id: 'BL-4', date: '2026-09-08', provider: 'A. Brooks', durationMin: 45, noteId: 'NOTE-DEMO-005' }
    ]
  }],
  emailItems: [
    { id: 'EM-DEMO-001', title: 'School asked about OT progress', linkName: 'Jordan Lee', linkType: 'student', linkId: 'STU-DEMO-001', date: '2026-10-22', source: 'Sample email thread', status: 'Pending' },
    { id: 'EM-DEMO-002', title: 'Confirm Thu speech slot', linkName: 'M. Patel (fictional)', linkType: 'provider', linkId: 'PRV-DEMO-002', date: '2026-10-21', source: 'Sample email thread', status: 'Pending' },
    { id: 'EM-DEMO-003', title: 'Send Sep–Oct parent update', linkName: 'Jordan Lee', linkType: 'student', linkId: 'STU-DEMO-001', date: '2026-10-18', source: 'Commitment from call note', status: 'Pending' }
  ],
  coverage: {
    soapStudentsWithNotes: 1,
    soapStudentsKnown: 2,
    note: 'Fixture coverage only. Live Ensora imports stay private and are incomplete (SOAP historically covers 4 students).'
  }
};
