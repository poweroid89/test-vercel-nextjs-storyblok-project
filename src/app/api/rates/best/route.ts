import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

interface RateRow {
    bank: string;
    currency: string;
    buy: number;
    sell: number;
    timestamp: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .gte('timestamp', dayStart)
        .lte('timestamp', dayEnd)
        .order('timestamp', { ascending: false });

    if (error || !data) {
        console.error('❌ Supabase fetch error:', error?.message);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Беремо лише найновіший запис для кожного банку+валюти
    const latestByBank: Record<string, RateRow> = {};
    for (const row of data) {
        if (row.buy === 0 || row.sell === 0) continue; // ❌ пропускаємо нульові значення
        const key = `${row.bank}_${row.currency}`;
        if (!latestByBank[key]) latestByBank[key] = row;
    }

    // Групуємо по валюті
    const grouped: Record<string, RateRow[]> = {};
    Object.values(latestByBank).forEach((row) => {
        if (!grouped[row.currency]) grouped[row.currency] = [];
        grouped[row.currency].push(row);
    });

    // Формуємо результат
    const result = Object.entries(grouped).map(([currency, rates]) => {
        const validRates = rates.filter(r => r.buy > 0 && r.sell > 0);
        if (validRates.length === 0) return null;

        const avgBuy = validRates.reduce((sum, r) => sum + r.buy, 0) / validRates.length;
        const avgSell = validRates.reduce((sum, r) => sum + r.sell, 0) / validRates.length;

        const bestBuy = validRates.reduce((min, r) => (r.buy < min.buy ? r : min), validRates[0]);
        const bestSell = validRates.reduce((max, r) => (r.sell > max.sell ? r : max), validRates[0]);

        return {
            currency,
            avg: Number(((avgBuy + avgSell) / 2).toFixed(2)),
            best_buy: { rate: bestBuy.buy, bank: bestBuy.bank },
            best_sell: { rate: bestSell.sell, bank: bestSell.bank },
        };
    }).filter(Boolean);

    return NextResponse.json({
        date,
        count: result.length,
        rates: result,
    });
}
