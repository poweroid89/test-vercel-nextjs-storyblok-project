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
import { parseBI } from "./parsers/bi";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

interface Rate {
    buy: number;
    sell: number;
}

interface BankRatesResult {
    bank: string;
    rates: Record<string, Rate>;
}

interface ExchangeRateRow {
    bank: string;
    currency: string;
    buy: number;
    sell: number;
    timestamp: string;
}

function validateRates(bank: string, rates: any) {
    if (!rates || typeof rates !== "object") return "Rates is not an object";

    const entries = Object.entries(rates);

    if (entries.length === 0) return "Rates object is empty";

    for (const [currency, rate] of entries) {
        if (!currency || typeof currency !== "string")
            return `Invalid currency key: ${currency}`;

        if (!rate || typeof rate !== "object")
            return `Invalid rate for ${currency}`;

        if (typeof rate.buy !== "number" || isNaN(rate.buy))
            return `Invalid BUY value for ${currency}`;

        if (typeof rate.sell !== "number" || isNaN(rate.sell))
            return `Invalid SELL value for ${currency}`;
    }

    return null; // OK
}

async function sendAlertEmail(bank: string, message: string, payload: any) {
    try {
        await resend.emails.send({
            from: process.env.FROM_EMAIL!,
            to: process.env.ALERT_EMAIL!,
            subject: `❌ Parser Error: ${bank}`,
            html: `
                <h2>Error parsing: ${bank}</h2>
                <p><b>Message:</b> ${message}</p>
                <pre>${JSON.stringify(payload, null, 2)}</pre>
            `,
        });
    } catch (e) {
        console.error("Failed to send alert email:", e);
    }
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
            case "bi.go.id":
                result = await parseBI();
                break;
            default:
                return NextResponse.json(
                    { error: "Unknown or missing bank parameter" },
                    { status: 400 }
                );
        }

        const errorMessage = validateRates(bank!, result.rates);

        if (errorMessage) {
            await sendAlertEmail(bank!, errorMessage, result);
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }
        const timestamp = new Date().toISOString();

        const rows: ExchangeRateRow[] = Object.entries(result.rates).map(
            ([currency, rate]) => ({
                bank: result.bank,
                currency,
                buy: rate.buy,
                sell: rate.sell,
                timestamp,
            })
        );

        const tableName = bank === "bi.go.id" ? "exchange_rates_bi" : "exchange_rates";

        const { error } = await supabase.from(tableName).insert(rows);

        if (error) {
            await sendAlertEmail(bank!, "Supabase insert error", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (err) {
        await sendAlertEmail("System Error", err.message, err);
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
