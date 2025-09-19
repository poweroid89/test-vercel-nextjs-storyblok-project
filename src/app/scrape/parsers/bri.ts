import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { JSDOM } from 'jsdom';

export async function parseBRI() {
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
    await page.setRequestInterception(true);
    page.on("request", (req) => {
        if (req.url().includes("jquery.dataTables.min.js")) {
            req.abort();
        } else {
            req.continue();
        }
    });
    await page.setUserAgent( 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' );
    await page.setExtraHTTPHeaders({
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.9,uk;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
    });
    await page.setExtraHTTPHeaders({
        "referer": "https://google.com",
        "accept-language": "en-US,en;q=0.9,uk;q=0.8",
        "connection": "keep-alive",
        "cache-control": "no-cache",
    });
    await page.goto('https://bri.co.id/kurs-detail');

    const html = await page.content();
    await browser.close();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tableBody = document.querySelector('#_bri_kurs_detail_portlet_display2 tbody');
    const exchangeRates: Record<string, { buy: number; sell: number }> = {};

    if (tableBody) {
        tableBody.querySelectorAll('tr').forEach((row) => {
            const cells = row.querySelectorAll('td');
            const currency = cells[0]?.querySelector('.text')?.textContent?.trim();
            const buy = parseFloat((cells[1]?.textContent?.trim() ?? 0).replace(/,/g, ''));
            const sell = parseFloat((cells[2]?.textContent?.trim() ?? 0).replace(/,/g, ''));
            if (currency) {
                exchangeRates[currency] = { buy, sell };
            }
        });
    }

    return { bank: "bri.co.id", rates: exchangeRates };
}
