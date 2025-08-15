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
        await page.goto('https://api.ipify.org/?format=json', { waitUntil: 'domcontentloaded' });

        // Збирання курсів валют як рядки
        const exchangeRates = {
                USD: { buy: 1, sell: 3 },
                EUR: { buy: 2, sell: 4 },
            };
        const websiteContent = await page.content();

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
                        name: websiteContent,
                        logo: {
                            filename: 'https://bri.co.id/o/bri-corporate-theme/images/bri-logo-white.png',
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
