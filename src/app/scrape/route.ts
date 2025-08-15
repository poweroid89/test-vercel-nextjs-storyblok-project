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
        await page.goto('https://bri.co.id/', { waitUntil: 'domcontentloaded' });

        // Збирання курсів валют як рядки
        const exchangeRates = await page.evaluate(() => {
            const usdBuy = document.querySelector('.logo-home')?.textContent || '0';
            const usdSell = document.querySelector('.logo-default')?.textContent || '0';
            const eurBuy = document.querySelector('.eur-buy')?.textContent || '0';
            const eurSell = document.querySelector('.eur-sell')?.textContent || '0';

            return {
                USD: { buy: usdBuy, sell: usdSell },
                EUR: { buy: eurBuy, sell: eurSell },
            };
        });

        await browser.close();

        // Storyblok API
        const client = new StoryblokClient({
            oauthToken: process.env.STORYBLOK_MANAGEMENT_TOKEN,
        });

        await client.put(
            `/spaces/${process.env.STORYBLOK_SPACE_ID}/stories/79844212156925`,
            {
                story: {
                    name: 'Bank List',
                    slug: 'bank-list',
                    content: {
                        component: 'Bank',
                        id: 'bank-list-001',
                        name: 'ПриватБанк1',
                        logo: {
                            filename:
                            exchangeRates["USD"]["buy"],
                        },
                        rates: exchangeRates,
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
