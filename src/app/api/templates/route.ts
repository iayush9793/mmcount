import { NextResponse } from "next/server";
import { getTemplatesForCampaign } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const et = searchParams.get("et") ?? "";
  const campaign = searchParams.get("campaign") ?? "";

  if (!date || !et || !campaign) {
    return NextResponse.json({ error: "Missing query parameters" }, { status: 400 });
  }

  try {
    const templates = await getTemplatesForCampaign({ isoDate: date, etNameOrAll: et, campaign });
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}