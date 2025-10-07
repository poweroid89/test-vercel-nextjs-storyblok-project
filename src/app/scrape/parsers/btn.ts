import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { JSDOM } from 'jsdom';

export async function parseBTN() {
    const browser = await puppeteer.launch({
        args: [
            ...(chromium.args || []),
            '--disable-blink-features=AutomationControlled', // Відключаємо автоматизацію
            '--disable-dev-shm-usage', // Уникаємо проблем із пам’яттю в Docker
            '--no-sandbox', // Для сумісності з серверним середовищем
            '--disable-setuid-sandbox',
            '--disable-web-security', // Вимикаємо CORS для тестування
            '--disable-features=site-per-process', // Уникаємо ізоляції сайтів
            '--enable-features=NetworkService,NetworkServiceInProcess', // Увімкнення мережевих функцій
            '--window-size=1920,1080', // Реалістичний розмір вікна
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();
    await page.setUserAgent( 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' );
    await page.setExtraHTTPHeaders({
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.9,uk;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
    });
    async function simulateHumanBehavior() {
        await page.mouse.move(
            Math.random() * 800 + 200,
            Math.random() * 600 + 100
        );
        await page.evaluate(() => window.scrollBy(0, Math.random() * 300 + 100));
    }
    await page.goto('https://www.btn.co.id/');

    await simulateHumanBehavior();

    const simulationLinkSelector = 'a[href="/en/Simulation"]';
    const linkExists = await page.$(simulationLinkSelector);

    if (linkExists) {
        await page.click(simulationLinkSelector);
    } else {
        await page.goto('https://www.btn.co.id/en/Simulation');
    }

    await simulateHumanBehavior();
    await page.evaluate(() => window.stop());

    const html = await page.content();
    await browser.close();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tableBody = document.querySelector('.conv-landing-kurs__desktop .table-kurs-valas table tbody');
    const exchangeRates: Record<string, { buy: number; sell: number }> = {};

    if (tableBody) {
        tableBody.querySelectorAll('tr').forEach((row) => {
            const cells = row.querySelectorAll('td');
            const currency = cells[0]?.querySelector('p')?.textContent?.trim();
            const buyText = cells[3]?.textContent?.trim() ?? '0';
            const sellText = cells[4]?.textContent?.trim() ?? '0';

            const buy = parseNumberSafe(buyText.replace(/\./g, '').replace(',', '.'));
            const sell = parseNumberSafe(sellText.replace(/\./g, '').replace(',', '.'));

            if (currency) {
                exchangeRates[currency] = { buy, sell };
            }
        });
    }

    return { bank: "btn.co.id", rates: exchangeRates };
}

function parseNumberSafe(value: unknown): number {
    if (typeof value !== 'string') return 0;
    const cleaned = value.replace(/[^\d.-]/g, '').trim();
    if (cleaned === '' || isNaN(Number(cleaned))) return 0;

    return parseFloat(cleaned);
}