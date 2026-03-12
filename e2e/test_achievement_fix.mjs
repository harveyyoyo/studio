import puppeteer from 'puppeteer';

(async () => {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', request => {
        console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    try {
        console.log('Navigating to admin page...');
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

        // Wait for the login screen or dashboard
        await new Promise(r => setTimeout(r, 2000));

        // If login is required (passcode field exists)
        const passcodeInputs = await page.$$('input[type="password"]');
        if (passcodeInputs.length > 0) {
            console.log('Logging in as admin...');
            await page.type('input[type="password"]', 'admin');
            await page.click('button[type="submit"]');
            await new Promise(r => setTimeout(r, 3000));
        } else {
            console.log('Already logged in or no passcode required.');
        }

        // Click on Achievements tab
        console.log('Clicking Achievements Tab...');
        const tabs = await page.$$('[role="tab"]');
        for (const tab of tabs) {
            const text = await page.evaluate(el => el.textContent, tab);
            if (text && text.includes('Achievements')) {
                await tab.click();
                break;
            }
        }
        await new Promise(r => setTimeout(r, 1000));

        // Click Add Achievement button
        console.log('Clicking Add Achievement...');
        const buttons = await page.$$('button');
        let addedClicked = false;
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text && text.includes('Add Achievement')) {
                await btn.click();
                addedClicked = true;
                break;
            }
        }

        if (!addedClicked) {
            console.log('Could not find Add Achievement button!');
        } else {
            await new Promise(r => setTimeout(r, 1000));

            // Fill out form
            console.log('Filling out achievement form...');
            await page.type('#ach-name', 'Test Achievement');
            await page.type('#ach-desc', 'Test Description');

            // Click save
            console.log('Clicking save...');
            const dialogBtns = await page.$$('div[role="dialog"] button');
            for (const btn of dialogBtns) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text && text.includes('Save Achievement')) {
                    await btn.click();
                    break;
                }
            }

            await new Promise(r => setTimeout(r, 3000));
            console.log('Done!');
        }

    } catch (err) {
        console.error('SCRIPT ERROR:', err);
    } finally {
        await browser.close();
    }
})();
