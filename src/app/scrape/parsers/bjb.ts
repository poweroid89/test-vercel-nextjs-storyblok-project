import { JSDOM } from 'jsdom';

function parseNumberSafe(value: unknown): number {
    if (typeof value !== 'string') return 0;
    const cleaned = value.replace(/[^\d.-]/g, '').trim();
    if (cleaned === '' || isNaN(Number(cleaned))) return 0;
    return parseFloat(cleaned);
}

export async function parseBJB() {
    // Динамічні імпорти, щоб Webpack не падав
    const puppeteer = (await import('puppeteer-extra')).default;
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    const chromium = (await import('@sparticuz/chromium')).default;

    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        args: [
            ...(chromium.args || []),
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=site-per-process',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--window-size=1920,1080',
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
        Referer: 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.9,uk;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
    });

    await page.goto('https://www.bankbjb.co.id/page/daftar-kurs');
    await page.waitForTimeout(5000); // пауза 5 секунд

    const html = await page.content();
    await browser.close();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tableBody = document.querySelector('.uk-table tbody');
    const exchangeRates: Record<string, { buy: number; sell: number }> = {};

    if (tableBody) {
        tableBody.querySelectorAll('tr').forEach((row) => {
            const cells = row.querySelectorAll('td');
            const currency = cells[0]?.textContent?.trim();
            const buy = parseNumberSafe((cells[cells.length - 1]?.textContent?.trim() ?? '0').replace(/,/g, ''));
            const sell = parseNumberSafe((cells[cells.length - 2]?.textContent?.trim() ?? '0').replace(/,/g, ''));

            if (currency) exchangeRates[currency] = { buy, sell };
        });
    }

    return { bank: 'bankbjb.co.id', rates: exchangeRates };
}