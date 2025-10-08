import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const bank = searchParams.get('bank');
    const currency = searchParams.get('currency');
    const date = searchParams.get('date');

    if (!bank || !currency || !date) {
        return NextResponse.json(
            { error: 'Missing required parameters: bank, currency, and date' },
            { status: 400 }
        );
    }

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('bank', bank)
        .eq('currency', currency)
        .gte('timestamp', dayStart)
        .lte('timestamp', dayEnd)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('❌ Supabase fetch error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    return NextResponse.json({
        bank,
        currency,
        date,
        history: data.map((row) => ({
            buy: row.buy,
            sell: row.sell,
            timestamp: row.timestamp,
        })),
    });
}
