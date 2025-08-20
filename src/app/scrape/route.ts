import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import StoryblokClient from 'storyblok-js-client';

// ==== Типи для Storyblok блоків ====
interface Rate {
    component: 'Rate';
    name: string;
    buy: string;
    sell: string;
}

interface Bank {
    id: string;
    name: string;
    rates: Rate[];
}

interface BankList {
    component: 'BankList';
    banks: Bank[];
}

export async function GET() {
    try {
        // Запуск браузера
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true, // на Vercel headless:true обов’язково
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        );
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });

        await page.goto('https://bri.co.id/kurs-detail');

        const html = await page.content();
        await browser.close();

        // Парсимо HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const tableBody = document.querySelector('#_bri_kurs_detail_portlet_display2 tbody');
        const exchangeRates: Record<string, { buy: string; sell: string }> = {};

        if (tableBody) {
            tableBody.querySelectorAll('tr').forEach((row) => {
                const cells = row.querySelectorAll('td');
                const currency = cells[0]?.querySelector('.text')?.textContent?.trim();
                const buy = cells[1]?.textContent?.trim() ?? '';
                const sell = cells[2]?.textContent?.trim() ?? '';

                if (currency) {
                    exchangeRates[currency] = { buy, sell };
                }
            });
        }

        // Збереження у Storyblok
        const client = new StoryblokClient({
            oauthToken: process.env.STORYBLOK_MANAGEMENT_TOKEN,
        });

        const storyId = '79842200061416'; // ID сторінки
        const spaceId = process.env.STORYBLOK_SPACE_ID;

        const storyRes = await client.get(`spaces/${spaceId}/stories/${storyId}`);
        const story = storyRes.data.story;

        // Знаходимо BankList
        const bankListBlock = story.content.body.find(
            (block: BankList) => block.component === 'BankList'
        ) as BankList;

        const bankIndex = bankListBlock.banks.findIndex((b: Bank) => b.id === 'bri');

        if (bankIndex === -1) {
            throw new Error('Bank with id "bri" not found');
        }

        const bank = bankListBlock.banks[bankIndex];

        bankListBlock.banks[bankIndex] = {
            ...bank,
            name: 'Bank Rakyat Indonesia',
            rates: Object.entries(exchangeRates).map(([currency, values]) => ({
                component: 'Rate',
                name: currency,
                buy: values.buy,
                sell: values.sell,
            })),
        };

        // Оновлюємо сторі
        await client.put(`/spaces/${spaceId}/stories/${storyId}`, {
            story: {
                name: story.name,
                slug: story.slug,
                content: story.content, // передаємо увесь контент з оновленим BankList
            },
            publish: 1,
        });

        return NextResponse.json({ message: 'Data scraped and saved to Storyblok' });
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
