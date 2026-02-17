import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const et = searchParams.get("et") ?? "ALL";

  try {
    const campaigns = await listCampaigns(et);
    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error) {
    console.error("[campaigns] Failed to fetch campaign list:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch campaign list from Google Sheets",
      },
      { status: 500 },
    );
  }
}

