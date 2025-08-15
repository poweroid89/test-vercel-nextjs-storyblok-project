import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import StoryblokClient from 'storyblok-js-client';

export async function GET(request: Request) {
    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: false
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        );
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });

        await page.goto('https://bri.co.id/kurs-detail', { waitUntil: 'domcontentloaded' });

        const html = await page.content();
        await browser.close();

        // Парсимо HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const tableBody = document.querySelector('#_bri_kurs_detail_portlet_display2 tbody');
        const exchangeRates: Record<string, { buy: string; sell: string }> = {};

        if (tableBody) {
            tableBody.querySelectorAll('tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                const currency = cells[0]?.querySelector('.text')?.textContent?.trim();
                const buy = cells[1]?.textContent?.trim();
                const sell = cells[2]?.textContent?.trim();

                if (currency) {
                    exchangeRates[currency] = { buy, sell };
                }
            });
        }

        // Збереження у Storyblok
        const client = new StoryblokClient({
            oauthToken: process.env.STORYBLOK_MANAGEMENT_TOKEN
        });

        await client.put(
            `/spaces/${process.env.STORYBLOK_SPACE_ID}/stories/80091874109660`,
            {
                story: {
                    name: 'Bank List',
                    slug: 'bank-list',
                    content: {
                        component: 'BankList',
                        banks: [
                            {
                                component: 'Bank',
                                name: 'Bank Rakyat Indonesia',
                                logo: {
                                    filename: 'https://bri.co.id/o/bri-corporate-theme/images/bri-logo.png'
                                },
                                rates: Object.entries(exchangeRates).map(([currency, values]) => ({
                                    component: 'Rate',
                                    name: currency,
                                    buy: values.buy,
                                    sell: values.sell
                                }))
                            }
                        ]
                    }
                },
                publish: 1
            }
        );

        return NextResponse.json({ message: 'Data scraped and saved to Storyblok' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
