import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { JSDOM } from 'jsdom';

export async function parseHSBC() {
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
    await page.goto('https://www.hsbc.co.id/1/2/en/personal/foreign-exchange/real-time-fx-rates#banknote-rates');

    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    const html = await page.content();
    await browser.close();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tableBody = document.querySelector('#banknote-rates tbody');
    const exchangeRates: Record<string, { buy: number; sell: number }> = {};

    if (tableBody) {
        Array.from(tableBody.querySelectorAll('tr')).slice(1).forEach((row) => {
            const cells = row.querySelectorAll('td');
            const currency = cells[0]?.textContent?.match(/\(([^)]+)\)/)?.[1]?.trim();

            const rawBuy = cells[1]?.innerHTML ?? '';
            const rawSell = cells[2]?.innerHTML ?? '';

            const cleanBuy = rawBuy.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
            const cleanSell = rawSell.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();

            const buy = parseNumberSafe(cleanBuy.replace(/,/g, '')) || 0;
            const sell = parseNumberSafe(cleanSell.replace(/,/g, '')) || 0;

            // Додаємо до exchangeRates лише якщо валюта визначена
            if (currency) {
                exchangeRates[currency] = { buy, sell };
            }
        });
    }

    return { bank: "hsbc.co.id", rates: exchangeRates };
}

function parseNumberSafe(value: unknown): number {
    if (typeof value !== 'string') return 0;
    const cleaned = value.replace(/[^\d.-]/g, '').trim();
    if (cleaned === '' || isNaN(Number(cleaned))) return 0;

    return parseFloat(cleaned);
}
