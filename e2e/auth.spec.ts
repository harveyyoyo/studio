import { test, expect } from '@playwright/test';

test('login and navigate to portal and student pages', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER MSG: ${msg.text()}`));
    page.on('pageerror', error => console.log(`BROWSER ERROR: ${error.message}`));

    // Go to login page
    console.log("Navigating to home page...");
    await page.goto('http://localhost:3000/');

    // Wait for and click School ABC
    console.log("Clicking School ABC demo login...");
    const schoolAbcBtn = page.locator('text=School ABC');
    await schoolAbcBtn.waitFor({ state: 'visible', timeout: 10000 });
    await schoolAbcBtn.click();

    // Verify it goes to portal and stays there
    console.log("Waiting for portal...");
    try {
        await page.waitForURL('http://localhost:3000/portal', { timeout: 15000 });
    } catch (e) {
        await page.screenshot({ path: 'auth_test_failure.png', fullPage: true });
        console.log("Saved auth_test_failure.png");
        throw e;
    }

    console.log("Successfully reached Portal page!");

    // Verify it doesn't get kicked out to '/'
    await page.waitForTimeout(2000);
    expect(page.url()).toBe('http://localhost:3000/portal');

    // Click on Student Portal
    console.log("Clicking Student Portal...");
    const studentPortalBtn = page.locator('text=Student Portal').first();
    await studentPortalBtn.waitFor({ state: 'visible', timeout: 10000 });
    await studentPortalBtn.click();

    // Verify it goes to student and stays there
    console.log("Waiting for student page...");
    await page.waitForURL('http://localhost:3000/student', { timeout: 10000 });
    console.log("Successfully reached Student Portal page!");

    await page.waitForTimeout(2000);
    expect(page.url()).toBe('http://localhost:3000/student');

    console.log("Test passed!");
});
