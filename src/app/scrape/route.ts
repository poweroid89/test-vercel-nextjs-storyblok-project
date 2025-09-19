import { NextResponse } from "next/server";
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
            default:
                return NextResponse.json(
                    { error: "Unknown or missing bank parameter" },
                    { status: 400 }
                );
        }

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message },
            { status: 500 }
        );
    }
}
