import { test, expect, APIRequestContext } from '@playwright/test';

const BACKEND_URL = (
  process.env.LIVE_BACKEND_URL || 'http://127.0.0.1:8010'
).replace(/\/$/, '');

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'placement.admin@iitm.ac.in';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '123456';
const STUDENT_EMAIL = '22f3001013@ds.study.iitm.ac.in';
const PASSWORD = '123456';

async function apiLogin(
  request: APIRequestContext,
  email: string,
  role: string,
  password = PASSWORD
) {
  return request.post(`${BACKEND_URL}/api/v1/auth/sso-login`, {
    data: { email, password, role },
  });
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.describe.serial('End-to-End Business Requirements & BRULE Verification (Steps A–F)', () => {
  let runId = '';
  let recruiterEmail = '';
  let examinerEmail = '';
  let adminToken = '';
  let recruiterToken = '';
  let examinerToken = '';
  let studentToken = '';
  let createdJobId = '';
  let highCgpaJobId = '';
  let createdApplicationId = '';
  let createdOfferId = '';

  test('Step A (IAM & Governance): Domain validation, pending approval gate, and Admin approval', async ({
    request,
    page,
  }) => {
    runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 10000)}`.toUpperCase();
    recruiterEmail = `recruiter.${runId.toLowerCase()}@acme-corp.in`;
    examinerEmail = `examiner.${runId.toLowerCase()}@ds.iitm.ac.in`;

    // 1. BRULE-29: Reject non-institutional student email domain
    const badStudent = await request.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: {
        email: `invalid.${runId.toLowerCase()}@gmail.com`,
        password: PASSWORD,
        full_name: 'Invalid Domain Student',
        role: 'STUDENT',
      },
    });
    expect(badStudent.status()).toBeGreaterThanOrEqual(400);

    // 2. Authenticate as Placement Admin first
    const adminRes = await apiLogin(request, ADMIN_EMAIL, 'ADMIN', ADMIN_PASSWORD);
    expect(adminRes.ok(), await adminRes.text()).toBeTruthy();
    adminToken = (await adminRes.json()).access_token;

    // 3. WF-06: Register fresh Recruiter account in PENDING state
    const regRecruiter = await request.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: {
        email: recruiterEmail,
        password: PASSWORD,
        full_name: `Acme Recruiter ${runId}`,
        role: 'RECRUITER',
        organization_or_dept: 'Acme Analytics',
      },
    });
    expect(regRecruiter.status(), await regRecruiter.text()).toBe(201);

    // Unapproved Recruiter must be blocked from login
    expect((await apiLogin(request, recruiterEmail, 'RECRUITER')).ok()).toBeFalsy();

    // Register Examiner (or provision in PENDING state via Admin if EXAMINER role row is lazy-seeded)
    const regExaminer = await request.post(`${BACKEND_URL}/api/v1/auth/register`, {
      data: {
        email: examinerEmail,
        password: PASSWORD,
        full_name: `IITM Examiner ${runId}`,
        role: 'EXAMINER',
        organization_or_dept: 'IITM BS Data Science',
      },
    });
    if (regExaminer.status() !== 201) {
      const createExa = await request.post(`${BACKEND_URL}/api/v1/admin/users`, {
        headers: authHeaders(adminToken),
        data: {
          email: examinerEmail,
          full_name: `IITM Examiner ${runId}`,
          role: 'EXAMINER',
          organization_or_dept: 'IITM BS Data Science',
          approval_status: 'PENDING',
          password: PASSWORD,
        },
      });
      expect(createExa.status(), await createExa.text()).toBe(201);
    }

    // Unapproved Examiner must also be blocked from login
    expect((await apiLogin(request, examinerEmail, 'EXAMINER')).ok()).toBeFalsy();

    // 4. Refresh Admin JWT right before governance calls and approve both pending registrations
    const freshAdminRes = await apiLogin(request, ADMIN_EMAIL, "ADMIN", ADMIN_PASSWORD);
    expect(freshAdminRes.ok(), await freshAdminRes.text()).toBeTruthy();
    adminToken = (await freshAdminRes.json()).access_token;
    const regListRes = await request.get(`${BACKEND_URL}/api/v1/admin/registrations`, {
      headers: authHeaders(adminToken),
    });
    expect(regListRes.ok(), await regListRes.text()).toBeTruthy();
    const registrations = await regListRes.json();

    for (const targetEmail of [recruiterEmail, examinerEmail]) {
      const record = registrations.find(
        (r: { email?: string }) => r.email?.toLowerCase() === targetEmail.toLowerCase()
      );
      expect(record, `Expected pending registration record for ${targetEmail}`).toBeTruthy();
      const uid = record.user_id || record.id;

      const approveRes = await request.post(
        `${BACKEND_URL}/api/v1/admin/registrations/${uid}/decision`,
        {
          headers: authHeaders(adminToken),
          data: { decision: 'APPROVED', remarks: 'Verified via Playwright E2E' },
        }
      );
      expect(approveRes.ok(), await approveRes.text()).toBeTruthy();
    }

    // 5. Verify approved Recruiter & Examiner can now log in via API & render Recruiter UI
    const recLogin = await apiLogin(request, recruiterEmail, 'RECRUITER');
    expect(recLogin.ok(), await recLogin.text()).toBeTruthy();
    recruiterToken = (await recLogin.json()).access_token;

    const exaLogin = await apiLogin(request, examinerEmail, 'EXAMINER');
    expect(exaLogin.ok(), await exaLogin.text()).toBeTruthy();
    examinerToken = (await exaLogin.json()).access_token;

    await page.addInitScript(
      ({ token, email, name }) => {
        localStorage.setItem('iitm_portal_jwt', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem(
          'iitm_portal_user',
          JSON.stringify({ email, role: 'RECRUITER', name })
        );
      },
      { token: recruiterToken, email: recruiterEmail, name: `Acme Recruiter ${runId}` }
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/iitm|recruiter|jobs|postings|sign in/i);
  });

  test('Step B (Recruiter CRM & Opportunities): Create eligible & high-CGPA-cutoff job postings', async ({
    request,
  }) => {
    const jobRes = await request.post(`${BACKEND_URL}/api/v1/recruitment/jobs`, {
      headers: authHeaders(recruiterToken),
      data: {
        job_code: `JOB-${runId}-1`,
        company_name: 'Acme Analytics',
        title: `Data Scientist Intern ${runId}`,
        role_type: 'INTERNSHIP',
        domain: 'DATA_SCIENCE',
        location: 'Bengaluru / Remote',
        compensation_label: 'INR 12.0 LPA / 60k Stipend',
        description: 'End-to-end machine learning pipeline role verified by Playwright E2E.',
        min_cgpa: 7.0,
        max_active_backlogs: 0,
      },
    });
    expect(jobRes.status(), await jobRes.text()).toBe(201);
    const job = await jobRes.json();
    createdJobId = job.id || job.job_id;
    expect(createdJobId).toBeTruthy();

    const strictJobRes = await request.post(`${BACKEND_URL}/api/v1/recruitment/jobs`, {
      headers: authHeaders(recruiterToken),
      data: {
        job_code: `JOB-${runId}-2`,
        company_name: 'Acme Analytics',
        title: `Principal Quant Researcher ${runId}`,
        role_type: 'FULL_TIME',
        domain: 'SOFTWARE_DEVELOPMENT',
        location: 'Mumbai',
        compensation_label: 'INR 24.0 LPA',
        description: 'High CGPA cutoff role for eligibility engine validation.',
        min_cgpa: 9.95,
        max_active_backlogs: 0,
      },
    });
    expect(strictJobRes.status(), await strictJobRes.text()).toBe(201);
    const strictJob = await strictJobRes.json();
    highCgpaJobId = strictJob.id || strictJob.job_id;

    const listRes = await request.get(`${BACKEND_URL}/api/v1/recruitment/jobs`, {
      headers: authHeaders(recruiterToken),
    });
    expect(listRes.ok()).toBeTruthy();
    const jobs = await listRes.json();
    expect(
      jobs.some((j: { id?: string; job_id?: string }) => (j.id || j.job_id) === createdJobId)
    ).toBeTruthy();
  });

  test('Step C (Student Lifecycle & Eligibility): Update profile, enforce 3-resume cap, apply & block duplicates', async ({
    request,
  }) => {
    const stuLogin = await apiLogin(request, STUDENT_EMAIL, 'STUDENT');
    expect(stuLogin.ok(), await stuLogin.text()).toBeTruthy();
    studentToken = (await stuLogin.json()).access_token;

    // Initialize Student dossier via PUT /me/registration first
    const regDossierRes = await request.put(`${BACKEND_URL}/api/v1/students/me/registration`, {
      headers: authHeaders(studentToken),
      data: {
        full_name: 'IITM BS Student',
        cgpa: 8.4,
        gender: 'Prefer not to say',
        mobile_number: '9876543210',
        personal_email: 'student.personal@example.com',
        state: 'Tamil Nadu',
        category: 'GENERAL',
        degree_type: 'STANDALONE',
        is_working_professional: false,
      },
    });
    expect(regDossierRes.ok(), await regDossierRes.text()).toBeTruthy();

    // FR-03.2 / FR-03.5 / FR-04: Update profile, marksheet CGPA, & skills
    const profileRes = await request.patch(`${BACKEND_URL}/api/v1/students/me/profile`, {
      headers: authHeaders(studentToken),
      data: {
        headline: 'IITM BS Data Science Candidate',
        linkedin_url: 'https://linkedin.com/in/iitm-student',
      },
    });
    expect(profileRes.ok(), await profileRes.text()).toBeTruthy();

    const marksheetRes = await request.post(`${BACKEND_URL}/api/v1/students/me/marksheet`, {
      headers: authHeaders(studentToken),
      data: {
        file_name: `grade_card_${runId}.pdf`,
        file_size_bytes: 204800,
        cgpa: 8.4,
      },
    });
    expect(marksheetRes.ok(), await marksheetRes.text()).toBeTruthy();

    await request.post(`${BACKEND_URL}/api/v1/students/me/skills`, {
      headers: authHeaders(studentToken),
      data: { skill_name: 'Python', proficiency: 'ADVANCED' },
    });

    // BRULE-55: Verify 3-resume version limit
    const existingWorkspace = await (
      await request.get(`${BACKEND_URL}/api/v1/students/me`, { headers: authHeaders(studentToken) })
    ).json();
    for (const r of existingWorkspace.resumes || []) {
      await request.delete(`${BACKEND_URL}/api/v1/students/me/resumes/${r.id}`, {
        headers: authHeaders(studentToken),
      });
    }

    for (let i = 1; i <= 3; i++) {
      const rRes = await request.post(`${BACKEND_URL}/api/v1/students/me/resumes`, {
        headers: authHeaders(studentToken),
        data: {
          label: `Resume v${i}`,
          file_name: `Resume_v${i}_${runId}.pdf`,
          file_size_bytes: 150000,
          is_default: i === 1,
        },
      });
      expect(rRes.status(), await rRes.text()).toBe(201);
    }

    const fourthResume = await request.post(`${BACKEND_URL}/api/v1/students/me/resumes`, {
      headers: authHeaders(studentToken),
      data: {
        label: 'Resume v4',
        file_name: `Resume_v4_${runId}.pdf`,
        file_size_bytes: 150000,
        is_default: false,
      },
    });
    expect(fourthResume.status()).toBeGreaterThanOrEqual(400);

    // BRULE-36: Ineligible application to 9.95 CGPA role must be blocked
    const ineligibleApply = await request.post(
      `${BACKEND_URL}/api/v1/recruitment/jobs/${highCgpaJobId}/apply`,
      {
        headers: authHeaders(studentToken),
        data: {},
      }
    );
    expect(ineligibleApply.status()).toBeGreaterThanOrEqual(400);

    // FR-18.1: Eligible application succeeds
    const applyRes = await request.post(
      `${BACKEND_URL}/api/v1/recruitment/jobs/${createdJobId}/apply`,
      {
        headers: authHeaders(studentToken),
        data: {},
      }
    );
    expect(applyRes.ok(), await applyRes.text()).toBeTruthy();
    const appData = await applyRes.json();
    createdApplicationId = appData.id || appData.application_id;
    expect(createdApplicationId).toBeTruthy();

    // BRULE-39: Duplicate application to same opportunity must be prevented
    const dupApply = await request.post(
      `${BACKEND_URL}/api/v1/recruitment/jobs/${createdJobId}/apply`,
      {
        headers: authHeaders(studentToken),
        data: {},
      }
    );
    expect(dupApply.status()).toBeGreaterThanOrEqual(400);
  });

  test('Step D (Examiner & Training): Admin builds question bank, Examiner submits 1-on-1 evaluation, Student receives it', async ({
    request,
  }) => {
    // 1. RBAC boundary: EXAMINER cannot author question bank (403); STUDENT cannot submit evaluations (403)
    const exaQbForbidden = await request.post(`${BACKEND_URL}/api/v1/training/question-bank`, {
      headers: authHeaders(examinerToken),
      data: {
        domain: "DATA_SCIENCE",
        track: "INTERNSHIP",
        prompt: `Examiner unauthorized question probe (${runId})`,
        options: ["A", "B", "C", "D"],
        correct_index: 0,
        difficulty: "MEDIUM",
      },
    });
    expect(exaQbForbidden.status()).toBe(403);

    const stuEvalForbidden = await request.post(`${BACKEND_URL}/api/v1/training/examiner/evaluations`, {
      headers: authHeaders(studentToken),
      data: {
        student_roll_number: "22F3001013",
        skillsets_observed: ["Python"],
        programming_rating: 5,
        data_science_rating: 5,
        communication_rating: 5,
        is_placement_ready: true,
        performing_exceptionally_good: true,
        remedial_tasks: [],
        examiner_notes: "Self-evaluation probe",
      },
    });
    expect(stuEvalForbidden.status()).toBe(403);

    // 2. ADMIN / TRAINING_COORDINATOR builds question bank entry (FR-10 / FR-11)
    const qbRes = await request.post(`${BACKEND_URL}/api/v1/training/question-bank`, {
      headers: authHeaders(adminToken),
      data: {
        domain: "DATA_SCIENCE",
        track: "INTERNSHIP",
        prompt: `What does L1 regularization encourage in linear models? (${runId})`,
        options: [
          "Feature sparsity by driving weights to zero",
          "Uniform weight scaling",
          "Higher polynomial degree",
          "Larger batch variance",
        ],
        correct_index: 0,
        difficulty: "MEDIUM",
      },
    });
    expect(qbRes.status(), await qbRes.text()).toBe(201);

    // 3. Approved EXAMINER conducts 1-on-1 evaluation for student 22F3001013
    const note = `Strong ML fundamentals and clean 1-on-1 problem solving (${runId})`;
    const evalSubmitRes = await request.post(`${BACKEND_URL}/api/v1/training/examiner/evaluations`, {
      headers: authHeaders(examinerToken),
      data: {
        student_roll_number: "22F3001013",
        skillsets_observed: ["Python", "Statistical Modeling", "SQL"],
        programming_rating: 5,
        data_science_rating: 4,
        communication_rating: 5,
        is_placement_ready: true,
        performing_exceptionally_good: true,
        remedial_tasks: ["Practice system design trade-offs"],
        examiner_notes: note,
      },
    });
    expect(evalSubmitRes.status(), await evalSubmitRes.text()).toBe(201);

    // 4. Student retrieves received 1-on-1 evaluations and confirms Examiner verdict & notes synced
    const myEvalsRes = await request.get(`${BACKEND_URL}/api/v1/training/examiner/evaluations/me`, {
      headers: authHeaders(studentToken),
    });
    expect(myEvalsRes.ok(), await myEvalsRes.text()).toBeTruthy();
    const myEvals = await myEvalsRes.json();
    expect(
      myEvals.some(
        (e: { examiner_notes?: string; is_placement_ready?: boolean }) =>
          e.examiner_notes === note && e.is_placement_ready === true
      )
    ).toBeTruthy();

    const coursesRes = await request.get(`${BACKEND_URL}/api/v1/training/courses`, {
      headers: authHeaders(studentToken),
    });
    expect(coursesRes.ok()).toBeTruthy();
  });

  test('Step E (ATS, Interviews & Offers): Shortlist, schedule interview, release & accept offer', async ({
    request,
  }) => {
    for (const nextStatus of ['SHORTLISTED', 'INTERVIEW_SCHEDULED']) {
      const statusRes = await request.patch(
        `${BACKEND_URL}/api/v1/recruitment/applications/${createdApplicationId}/status`,
        {
          headers: authHeaders(recruiterToken),
          data: { status: nextStatus, remarks: `Moved to ${nextStatus}` },
        }
      );
      expect(statusRes.ok(), await statusRes.text()).toBeTruthy();
    }

    const interviewRes = await request.post(`${BACKEND_URL}/api/v1/placement/interviews`, {
      headers: authHeaders(recruiterToken),
      data: {
        application_id: createdApplicationId,
        round_number: 1,
        round_type: 'TECHNICAL_1',
        mode: 'ONLINE_MEET',
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
        duration_minutes: 45,
        meeting_link_or_venue: 'https://meet.google.com/iitm-e2e-test',
        panelist_name: 'Senior DS Lead',
      },
    });
    expect(interviewRes.status(), await interviewRes.text()).toBe(201);

    const offerRes = await request.post(`${BACKEND_URL}/api/v1/placement/offers`, {
      headers: authHeaders(recruiterToken),
      data: {
        application_id: createdApplicationId,
        ctc_lpa: 12.0,
        joining_date: '2026-12-15',
        offer_expires_at: '2026-12-01',
      },
    });
    expect(offerRes.status(), await offerRes.text()).toBe(201);
    const offerData = await offerRes.json();
    createdOfferId = offerData.id || offerData.offer_id;
    expect(createdOfferId).toBeTruthy();

    const acceptRes = await request.post(
      `${BACKEND_URL}/api/v1/placement/offers/${createdOfferId}/respond`,
      {
        headers: authHeaders(studentToken),
        data: {
          decision: 'ACCEPTED',
          student_remarks: 'Excited to join Acme Analytics!',
        },
      }
    );
    expect(acceptRes.ok(), await acceptRes.text()).toBeTruthy();
  });

  test('Step F (Governance, Helpdesk & Audit): Verify Helpdesk persistence, Analytics, and Audit Logs', async ({
    request,
  }) => {
    const ticketId = `tkt-${runId.toLowerCase()}`;
    const ticketSubject = `Offer Verification Query ${runId}`;
    const ticketRes = await request.post(`${BACKEND_URL}/api/v1/portal-state/helpdesk`, {
      headers: authHeaders(studentToken),
      data: {
        id: ticketId,
        ticketNumber: `HD-${runId}`,
        raisedByEmail: STUDENT_EMAIL,
        raisedByName: 'IITM BS Student',
        raisedByRole: 'STUDENT',
        category: 'PLACEMENT',
        priority: 'HIGH',
        subject: ticketSubject,
        description: 'Verifying helpdesk SLA persistence via E2E suite.',
        status: 'OPEN',
        assignedTo: 'Placement Admin',
        escalationCount: 0,
        comments: [],
      },
    });
    expect(ticketRes.status(), await ticketRes.text()).toBe(201);

    const ticketsList = await request.get(`${BACKEND_URL}/api/v1/portal-state/helpdesk`, {
      headers: authHeaders(adminToken),
    });
    expect(ticketsList.ok()).toBeTruthy();
    const allTickets = await ticketsList.json();
    expect(
      allTickets.some((t: { subject?: string }) => t.subject === ticketSubject)
    ).toBeTruthy();

    const analyticsRes = await request.get(`${BACKEND_URL}/api/v1/placement/analytics/overview`, {
      headers: authHeaders(adminToken),
    });
    expect(analyticsRes.ok()).toBeTruthy();

    const auditRes = await request.get(`${BACKEND_URL}/api/v1/audit-logs`, {
      headers: authHeaders(adminToken),
    });
    expect(auditRes.ok()).toBeTruthy();
    const logs = await auditRes.json();
    expect(Array.isArray(logs) && logs.length > 0).toBeTruthy();
  });
});
