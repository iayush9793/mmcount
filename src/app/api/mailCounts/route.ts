import { NextResponse } from "next/server";
import { getMailCounts } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const campaign = searchParams.get("campaign") ?? "";
  const et = searchParams.get("et") ?? "";
  const template = searchParams.get("template") ?? "ALL TEMPLATES";

  if (!date || !campaign || !et) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const result = await getMailCounts({ isoDate: date, campaign, etNameOrAll: et, template });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}