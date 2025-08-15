import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import StoryblokClient from 'storyblok-js-client';

export async function GET(request: Request) {
    // 🔒 Розкоментуй, якщо хочеш обмежити доступ по секрету
    // const secret = request.headers.get('cron-secret');
    // if (secret !== process.env.CRON_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    try {
        // Запуск браузера Puppeteer у serverless
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        const page = await browser.newPage();

        // Навігація на сайт
        await page.goto('https://api.ipify.org/', { waitUntil: 'domcontentloaded' });

        // Збирання курсів валют як рядки
        const exchangeRates = {
                USD: { buy: 4, sell: 5 },
                EUR: { buy: 6, sell: 7 },
            };
        const websiteContent = await page.content();

        await browser.close();

        // Storyblok API
        const client = new StoryblokClient({
            oauthToken: process.env.STORYBLOK_MANAGEMENT_TOKEN,
        });

        await client.put(
            `/spaces/${process.env.STORYBLOK_SPACE_ID}/stories/80091874109660`,
            {
                story: {
                    name: 'Bank List',
                    slug: 'bank-list',
                    content: {
                        component: 'BankList', // головний Content Type
                        banks: [
                            {
                                component: 'Bank',
                                name: 'ПриватБанк',
                                logo: {
                                    filename: 'https://yourdomain.com/bri-logo-white.png',
                                },
                                rates: Object.entries(exchangeRates).map(([currency, values]) => ({
                                    component: 'Rate',
                                    name: currency,
                                    buy: String(values.buy),
                                    sell: String(values.sell),
                                })),
                            },
                            {
                                component: 'Bank',
                                name: 'Монобанк',
                                logo: {
                                    filename: 'https://yourdomain.com/mono-logo.png',
                                },
                                rates: Object.entries(exchangeRates).map(([currency, values]) => ({
                                    component: 'Rate',
                                    name: currency,
                                    buy: String(values.buy),
                                    sell: String(values.sell),
                                })),
                            },
                            // можна додати ще банків аналогічно
                        ],
                    },
                },
                publish: 1,
            }
        );



        return NextResponse.json({ message: 'Data scraped and saved to Storyblok' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
