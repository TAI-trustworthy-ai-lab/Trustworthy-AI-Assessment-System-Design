import { NextResponse } from "next/server";
import translate from "google-translate-api-x";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { q, source, target } = body;
        const result = await translate(q, { from: source, to: target, forceFrom: true });
        console.log(result.text);
        return NextResponse.json({ translatedText: result.text });
    } catch (error) {
        console.error("Translation error:", error);
        return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }
}
