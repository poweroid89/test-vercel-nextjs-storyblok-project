import { NextResponse } from "next/server";
import { supabase } from '../../../lib/supabaseClient';
import { parseBRI } from "./parsers/bri";
import { parseBCA } from "./parsers/bca";
import { parseMandiri } from "./parsers/mandiri";
import { parseBNI } from "./parsers/bni";
import { parseCimbniaga } from "./parsers/cimbniaga";
import { parseDanamon } from "./parsers/danamon";
import { parseOCBC } from "./parsers/ocbc";
import { parseBankmega } from "./parsers/bankmega";
import { parseBTN } from "./parsers/btn";
import { parseMaybank } from "./parsers/maybank";
import { parseBJB } from "./parsers/bjb";
import { parsePermata } from "./parsers/permata";
import { parsePanin } from "./parsers/panin";
import { parseHSBC } from "./parsers/hsbc";
import { parseDBS } from "./parsers/dbs";
import { parseUOB } from "./parsers/uob";

interface ExchangeRateRow {
    bank: string;
    currency: string;
    buy: number;
    sell: number;
    timestamp: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const bank = searchParams.get("bank");

        let result;
        switch (bank) {
            case "bri.co.id":
                result = await parseBRI();
                break;
            case "bca.co.id":
                result = await parseBCA();
                break;
            case "bankmandiri.co.id":
                result = await parseMandiri(); // proxy
                break;
            case "bni.co.id":
                result = await parseBNI(); // proxy
                break;
            case "cimbniaga.co.id":
                result = await parseCimbniaga();
                break;
            case "danamon.co.id":
                result = await parseDanamon();
                break;
            case "ocbc.id":
                result = await parseOCBC(); // proxy blocked by ip
                break;
            case "bankmega.com":
                result = await parseBankmega();
                break;
            case "btn.co.id":
                result = await parseBTN();
                break;
            case "maybank.co.id":
                result = await parseMaybank();
                break;
            case "bankbjb.co.id":
                result = await parseBJB();
                break;
            case "permatabank.com":
                result = await parsePermata(); // proxy
                break;
            case "panin.co.id":
                result = await parsePanin();
                break;
            case "hsbc.co.id":
                result = await parseHSBC();
                break;
            case "dbs.id":
                result = await parseDBS();
                break;
            case "uob.co.id":
                result = await parseUOB();
                break;
            default:
                return NextResponse.json(
                    { error: "Unknown or missing bank parameter" },
                    { status: 400 }
                );
        }

        const timestamp = new Date().toISOString();

        // Формуємо масив для вставки
        const rows: ExchangeRateRow[] = Object.entries(result.rates).map(
            ([currency, { buy, sell }]: any) => ({
                bank: result.bank,
                currency,
                buy,
                sell,
                timestamp,
            })
        );

        // Вставляємо в Supabase
        const { error } = await supabase
            .from("exchange_rates")
            .insert(rows);

        if (error) {
            console.error("❌ Supabase insert error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
