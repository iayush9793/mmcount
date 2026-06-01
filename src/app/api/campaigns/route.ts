// src/app/api/campaigns/route.ts
import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const et = searchParams.get("et") ?? "";
  const date = searchParams.get("date") ?? ""; // Capture date parameter

  if (!et) {
    return NextResponse.json({ error: "Missing ET parameter" }, { status: 400 });
  }

  try {
    // Forward both ET and Date constraints to the sheets engine
    const campaigns = await listCampaigns(et, date);
    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error) {
    console.error("[api/campaigns] Failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}