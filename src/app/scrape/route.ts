import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import StoryblokClient from 'storyblok-js-client';

export async function GET(request: Request) {
    // const secret = request.headers.get('cron-secret');
    // if (secret !== process.env.CRON_SECRET) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        }) as unknown as puppeteer.Browser;

        const page = await browser.newPage();
        await page.goto('https://bri.co.id/'); // Замініть на реальний сайт
        const exchangeRates = await page.evaluate(() => {
            const usdBuy = document.querySelector('.logo-home')?.innerText || '0';
            const usdSell = document.querySelector('.logo-default')?.innerText || '0';
            const eurBuy = document.querySelector('.eur-buy')?.innerText || '0';
            const eurSell = document.querySelector('.eur-sell')?.innerText || '0';
            return {
                USD: { buy: parseFloat(usdBuy), sell: parseFloat(usdSell) },
                EUR: { buy: parseFloat(eurBuy), sell: parseFloat(eurSell) },
            };
        });
        await browser.close();
        const client = new StoryblokClient({
            oauthToken: process.env.STORYBLOK_MANAGEMENT_TOKEN,
        });
        await client.put(`/spaces/${process.env.STORYBLOK_SPACE_ID}/stories/79844212156925`, {
            story: {
                name: 'Bank List',
                slug: 'bank-list',
                content: {
                    component: 'Bank',
                    id: 'bank-list-001',
                    name: 'ПриватБанк',
                    logo: { filename: 'https://bri.co.id/o/bri-corporate-theme/images/bri-logo-white.png' }, // Замініть на реальний URL
                    rates: exchangeRates,
                },
            },
            publish: 1,
        });

        return NextResponse.json({ message: 'Data scraped and saved to Storyblok' });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}