import puppeteer from 'puppeteer';

(async () => {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

    console.log('Navigating to root to set localStorage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
        localStorage.setItem('loginState', 'developer');
        localStorage.setItem('schoolId', 'harveyyoyo');
        localStorage.setItem('userName', 'Developer');
    });

    console.log('Navigating to /prize ...');
    await page.goto('http://localhost:3000/prize', { waitUntil: 'networkidle0' });

    console.log('Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Capturing screenshot...');
    await page.screenshot({ path: 'prize_error2.png' });

    console.log('Closing browser...');
    await browser.close();
})();
