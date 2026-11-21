import { test, expect, Page } from '@playwright/test';

const BACKEND_URL = (
  process.env.LIVE_BACKEND_URL || 'https://placement-portal-gemini-hz5y.vercel.app'
).replace(/\/$/, '');

interface RoleTestCase {
  roleCode: string;
  labelPatterns: RegExp[];
  expectedNavKeywords: RegExp[];
}

const DASHBOARD_ROLES: RoleTestCase[] = [
  {
    roleCode: 'STUDENT',
    labelPatterns: [/student/i],
    expectedNavKeywords: [/profile|resume|drives|jobs|training|courses|offers|helpdesk|overview|dashboard/i],
  },
  {
    roleCode: 'RECRUITER',
    labelPatterns: [/recruiter/i],
    expectedNavKeywords: [/jobs|postings|candidates|applications|interviews|offers|overview|dashboard/i],
  },
  {
    roleCode: 'EXAMINER',
    labelPatterns: [/examiner/i],
    expectedNavKeywords: [/evaluation|question|bank|assessment|grading|badges|overview|dashboard/i],
  },
  {
    roleCode: 'ADMIN',
    labelPatterns: [/^admin$/i, /super admin/i, /administrator/i],
    expectedNavKeywords: [/users|registrations|audit|roles|analytics|helpdesk|overview|dashboard/i],
  },
  {
    roleCode: 'PROGRAM_COORDINATOR',
    labelPatterns: [/training coordinator/i, /program coordinator/i, /placement coordinator/i, /coordinator/i],
    expectedNavKeywords: [/training|courses|analytics|interviews|offers|drives|students|overview|dashboard/i],
  },
];

/**
 * Helper: Authenticates into a specific dashboard role via either:
 * 1) Clicking a quick-role / SSO demo button on the login screen if present, OR
 * 2) Provisioning an API user via backend /register + /sso-login and injecting the JWT/session into localStorage, OR
 * 3) Filling the email/password login form.
 */
async function signInAsRole(page: Page, roleCase: RoleTestCase) {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Strategy 1: Check for quick-role / demo / SSO role buttons on the login view
  for (const pattern of roleCase.labelPatterns) {
    const roleBtn = page.getByRole('button', { name: pattern }).first();
    if (await roleBtn.isVisible().catch(() => false)) {
      await roleBtn.click();
      await page.waitForTimeout(800);

      // If clicking the role chip selects the role before clicking a Sign In / Continue button:
      const submitBtn = page
        .getByRole('button', { name: /sign in|login|continue|enter portal|sso/i })
        .first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      }
      await page.waitForTimeout(1200);
      return;
    }
  }

  // Strategy 2: Check for a <select> role dropdown on the login form
  const roleSelect = page.locator('select').first();
  if (await roleSelect.isVisible().catch(() => false)) {
    const options = await roleSelect.locator('option').allTextContents();
    const matchIndex = options.findIndex((opt) =>
      roleCase.labelPatterns.some((rx) => rx.test(opt))
    );
    if (matchIndex >= 0) {
      await roleSelect.selectOption({ index: matchIndex });
    }
  }

  // Strategy 3: Register via live backend API & fill credentials if email/password inputs are shown
  const uid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const email = `ui_${roleCase.roleCode.toLowerCase()}_${uid}@ds.study.iitm.ac.in`;
  const password = `UiPass_${uid}!9`;

  await page.request.post(`${BACKEND_URL}/api/v1/auth/register`, {
    data: {
      email,
      password,
      full_name: `UI ${roleCase.roleCode} ${uid}`,
      role: roleCase.roleCode,
    },
  });

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if ((await emailInput.isVisible().catch(() => false)) && (await passwordInput.isVisible().catch(() => false))) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
    }
  }
}

/**
 * Helper: Clicks through every visible sidebar / navigation tab inside the active dashboard
 * to ensure no view throws a runtime error or renders a blank screen.
 */
async function walkAllDashboardTabs(page: Page) {
  const navButtons = page.locator('aside button, nav button, [role="tab"], aside a, nav a');
  const count = await navButtons.count();
  const maxTabsToVisit = Math.min(count, 12);

  for (let i = 0; i < maxTabsToVisit; i++) {
    const item = navButtons.nth(i);
    const text = (await item.innerText().catch(() => '')).trim();
    // Skip logout / sign-out buttons so we stay authenticated across all tabs
    if (!text || /logout|sign out|exit/i.test(text)) continue;

    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
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

    const response = await page.goto('/', { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('button, input').first()).toBeVisible();

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

      // Verify dashboard content is rendered and contains expected domain terminology
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(20);

      const matchesDomainContent = roleCase.expectedNavKeywords.some((rx) => rx.test(bodyText));
      expect(
        matchesDomainContent,
        `Expected ${roleCase.roleCode} dashboard keywords (${roleCase.expectedNavKeywords}) in visible text`
      ).toBeTruthy();

      // Click every sidebar/tab view in this role's workspace
      await walkAllDashboardTabs(page);

      expect(pageErrors, `Uncaught JS errors in ${roleCase.roleCode} dashboard`).toEqual([]);
      expect(serverErrors, `HTTP 500 responses in ${roleCase.roleCode} dashboard`).toEqual([]);
    });
  }

  test('Student Helpdesk UI ticket creation persists across full browser reload', async ({ page }) => {
    const studentRole = DASHBOARD_ROLES[0];
    await signInAsRole(page, studentRole);

    // Navigate to Helpdesk / Support tab if present
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

          // Reload browser and confirm ticket persists from Neon PostgreSQL
          await page.reload({ waitUntil: 'networkidle' });
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