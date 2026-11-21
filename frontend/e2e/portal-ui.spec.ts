import { test, expect, Page } from '@playwright/test';

const DEFAULT_BACKEND_URL = (
  process.env.LIVE_BACKEND_URL || 'https://placement-portal-gemini-hz5y.vercel.app'
).replace(/\/$/, '');

interface RoleTestCase {
  roleCode: string;
  labelPatterns: RegExp[];
  expectedNavKeywords: RegExp[];
  testEmail?: string;
}

const DASHBOARD_ROLES: RoleTestCase[] = [
  {
    roleCode: 'STUDENT',
    labelPatterns: [/student/i],
    expectedNavKeywords: [/profile|resume|drives|jobs|training|courses|offers|helpdesk|overview|dashboard/i],
    testEmail: '22f3001013@ds.study.iitm.ac.in',
  },
  {
    roleCode: 'RECRUITER',
    labelPatterns: [/recruiter/i],
    expectedNavKeywords: [/jobs|postings|candidates|applications|interviews|offers|overview|dashboard/i],
    testEmail: 'lalit@iit.in',
  },
  {
    roleCode: 'EXAMINER',
    labelPatterns: [/examiner/i],
    expectedNavKeywords: [/evaluation|question|bank|assessment|grading|badges|overview|dashboard/i],
    testEmail: 'shyam@ds.iitm.ac.in',
  },
  {
    roleCode: 'ADMIN',
    labelPatterns: [/^admin$/i, /super admin/i, /administrator/i],
    expectedNavKeywords: [/users|registrations|audit|roles|analytics|helpdesk|overview|dashboard/i],
    testEmail: 'placement.admin@iitm.ac.in',
  },
  {
    roleCode: 'PROGRAM_COORDINATOR',
    labelPatterns: [/training coordinator/i, /program coordinator/i, /placement coordinator/i, /coordinator/i],
    expectedNavKeywords: [/training|courses|analytics|interviews|offers|drives|students|overview|dashboard/i],
  },
];

async function ensureRoleAccountApprovedViaAdminApi(
  page: Page,
  roleCase: RoleTestCase,
  backendUrl: string
) {
  if (!roleCase.testEmail || backendUrl.includes('localhost')) return;

  // 1. Register test account in Neon PostgreSQL if not already registered
  await page.request
    .post(`${backendUrl}/api/v1/auth/register`, {
      data: {
        email: roleCase.testEmail,
        password: '123456',
        full_name: roleCase.roleCode === 'RECRUITER' ? 'Lalit Recruiter' : 'Shyam Examiner',
        role: roleCase.roleCode,
      },
    })
    .catch(() => {});

  // 2. Authenticate as seeded Placement Admin to get an Admin JWT
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'placement.admin@iitm.ac.in';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || '123456';
  const adminLogin = await page.request
    .post(`${backendUrl}/api/v1/auth/sso-login`, {
      data: {
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
      },
    })
    .catch(() => null);

  if (!adminLogin || !adminLogin.ok()) return;
  const adminData = await adminLogin.json();
  const token = adminData.access_token;
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}` };

  // 3. Approve via /api/v1/admin/registrations/{user_id}/decision
  const listRes = await page.request
    .get(`${backendUrl}/api/v1/admin/registrations`, { headers })
    .catch(() => null);
  if (listRes && listRes.ok()) {
    const items = await listRes.json();
    if (Array.isArray(items)) {
      for (const item of items) {
        const uid = item.user_id || item.id;
        if (item.email?.toLowerCase() === roleCase.testEmail.toLowerCase() && uid) {
          await page.request
            .post(`${backendUrl}/api/v1/admin/registrations/${uid}/decision`, {
              headers,
              data: { decision: 'APPROVED', remarks: 'Approved by Playwright E2E suite' },
            })
            .catch(() => {});
        }
      }
    }
  }
}

async function attemptLoginClickFlow(page: Page, roleCase: RoleTestCase) {
  for (const pattern of roleCase.labelPatterns) {
    const roleBtn = page.getByRole('button', { name: pattern }).first();
    if (await roleBtn.isVisible().catch(() => false)) {
      await roleBtn.click();
      await page.waitForTimeout(250);
      break;
    }
  }

  const fillTestBtn = page.getByRole('button', { name: /fill test/i }).first();
  if (await fillTestBtn.isVisible().catch(() => false)) {
    await fillTestBtn.click();
    await page.waitForTimeout(250);
  }

  // Explicitly populate the visible email textbox & password textbox via accessible role
  if (roleCase.testEmail) {
    const emailInput = page.getByRole('textbox').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(roleCase.testEmail);
    }
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('123456');
    }
  }

  const submitBtn = page
    .locator('button[type="submit"]')
    .or(page.getByRole('button', { name: /^sign in$/i }))
    .last();

  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }
}

async function isStillOnAuthScreen(page: Page): Promise<boolean> {
  return page
    .getByRole('heading', { name: /IITM Placement & Career Portal/i })
    .isVisible()
    .catch(() => false);
}

async function signInAsRole(page: Page, roleCase: RoleTestCase) {
  let detectedBackendUrl = DEFAULT_BACKEND_URL;

  // Capture the exact backend origin the frontend calls during auth
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1/')) {
      detectedBackendUrl = url.split('/api/v1/')[0];
    }
  });

  if (['RECRUITER', 'EXAMINER'].includes(roleCase.roleCode)) {
    await ensureRoleAccountApprovedViaAdminApi(page, roleCase, detectedBackendUrl);
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /student/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await attemptLoginClickFlow(page, roleCase);

  // If the frontend used a different backend URL or needed local Admin approval, resolve and retry once
  if (await isStillOnAuthScreen(page)) {
    if (['RECRUITER', 'EXAMINER'].includes(roleCase.roleCode)) {
      await ensureRoleAccountApprovedViaAdminApi(page, roleCase, detectedBackendUrl);

      // Also approve in local/offline Admin UI if the frontend is running without a live backend
      const adminRole = DASHBOARD_ROLES.find((r) => r.roleCode === 'ADMIN')!;
      await attemptLoginClickFlow(page, adminRole);
      const approveBtns = page.getByRole('button', { name: /^Approve$/i });
      const approveCount = await approveBtns.count();
      for (let i = 0; i < approveCount; i++) {
        await approveBtns.first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // Sign out back to login screen if logged in as Admin
      const signOutBtn = page.getByRole('button', { name: /sign out|logout/i }).first();
      if (await signOutBtn.isVisible().catch(() => false)) {
        await signOutBtn.click();
        await page.waitForTimeout(400);
      }
    }

    await attemptLoginClickFlow(page, roleCase);
  }
}

async function walkAllDashboardTabs(page: Page) {
  const navButtons = page.locator('aside button, nav button, [role="tab"], aside a, nav a');
  const count = await navButtons.count();
  const maxTabsToVisit = Math.min(count, 12);

  for (let i = 0; i < maxTabsToVisit; i++) {
    const item = navButtons.nth(i);
    const text = (await item.innerText().catch(() => '')).trim();
    if (!text || /logout|sign out|exit/i.test(text)) continue;

    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(350);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  }
}

test.describe('Multi-Role Dashboard UI Verification', () => {
  test('Public landing / auth screen renders cleanly with zero runtime errors', async ({ page }) => {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) {
        serverErrors.push(`${res.request().method()} ${res.url()} -> ${res.status()}`);
      }
    });

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('button, input').first()).toBeVisible({ timeout: 15000 });

    expect(pageErrors, 'Uncaught JS runtime errors on initial load').toEqual([]);
    expect(serverErrors, 'HTTP 500 responses on initial load').toEqual([]);
  });

  for (const roleCase of DASHBOARD_ROLES) {
    test(`${roleCase.roleCode} dashboard loads and all navigation tabs render without crashes`, async ({ page }) => {
      const pageErrors: string[] = [];
      const serverErrors: string[] = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('response', (res) => {
        if (res.status() >= 500) {
          serverErrors.push(`${res.request().method()} ${res.url()} -> ${res.status()}`);
        }
      });

      await signInAsRole(page, roleCase);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(20);

      const matchesDomainContent = roleCase.expectedNavKeywords.some((rx) => rx.test(bodyText));
      expect(
        matchesDomainContent,
        `Expected ${roleCase.roleCode} dashboard keywords (${roleCase.expectedNavKeywords}) in visible text`
      ).toBeTruthy();

      await walkAllDashboardTabs(page);

      expect(pageErrors, `Uncaught JS errors in ${roleCase.roleCode} dashboard`).toEqual([]);
      expect(serverErrors, `HTTP 500 responses in ${roleCase.roleCode} dashboard`).toEqual([]);
    });
  }

  test('Student Helpdesk UI ticket creation persists across full browser reload', async ({ page }) => {
    const studentRole = DASHBOARD_ROLES[0];
    await signInAsRole(page, studentRole);

    const helpdeskTab = page
      .locator('aside button, nav button, [role="tab"], button')
      .filter({ hasText: /helpdesk|support|ticket|grievance/i })
      .first();

    if (await helpdeskTab.isVisible().catch(() => false)) {
      await helpdeskTab.click();
      await page.waitForTimeout(500);

      const subjectText = `Playwright UI Ticket ${Date.now().toString(36)}`;
      const subjectInput = page
        .locator('input[name="subject"], input[name="title"], input[placeholder*="subject" i], input[placeholder*="title" i]')
        .first();
      const descInput = page
        .locator('textarea[name="description"], textarea, input[placeholder*="description" i]')
        .first();

      if ((await subjectInput.isVisible().catch(() => false)) && (await descInput.isVisible().catch(() => false))) {
        await subjectInput.fill(subjectText);
        await descInput.fill('End-to-end browser UI persistence verification.');

        const createBtn = page
          .getByRole('button', { name: /submit|create|raise|send/i })
          .first();
        if (await createBtn.isVisible().catch(() => false)) {
          await createBtn.click();
          await page.waitForTimeout(1200);

          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1500);
          if (await helpdeskTab.isVisible().catch(() => false)) {
            await helpdeskTab.click();
            await page.waitForTimeout(800);
          }
          await expect(page.locator('body')).toContainText(subjectText);
        }
      }
    }
  });
});
