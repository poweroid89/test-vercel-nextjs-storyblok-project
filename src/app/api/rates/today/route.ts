import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

interface ExchangeRate {
    bank: string;
    currency: string;
    buy: number;
    sell: number;
    timestamp: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const bankParam = searchParams.get('bank');
    const currencyParam = searchParams.get('currency');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let query = supabase
        .from('exchange_rates')
        .select('*')
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`)
        .order('timestamp', { ascending: false });

    if (bankParam) query = query.eq('bank', bankParam);
    if (currencyParam) query = query.eq('currency', currencyParam);

    const { data, error } = await query;

    if (error) {
        console.error('❌ Supabase fetch error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch today rates' }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ date: today, banks: {} });
    }

    // Беремо лише найновіші записи для кожного bank+currency
    const latestByBankCurrency = Object.values(
        data.reduce<Record<string, ExchangeRate>>((acc, row) => {
            const key = `${row.bank}-${row.currency}`;
            if (!acc[key]) acc[key] = row; // перший найновіший, бо order(desc)
            return acc;
        }, {})
    );

    // Групуємо по банках
    const grouped = latestByBankCurrency.reduce<Record<string, Record<string, Omit<ExchangeRate, 'bank'>>>>(
        (acc, row) => {
            if (!acc[row.bank]) acc[row.bank] = {};
            acc[row.bank][row.currency] = {
                buy: row.buy,
                sell: row.sell,
                timestamp: row.timestamp,
            };
            return acc;
        },
        {}
    );

    return NextResponse.json({
        date: today,
        banks: grouped,
    });
}
