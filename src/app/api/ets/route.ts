import { NextResponse } from "next/server";
import { listETTabs } from "@/lib/googleSheets";

export async function GET() {
  try {
    const ets = await listETTabs();
    return NextResponse.json({ ets }, { status: 200 });
  } catch (error) {
    console.error("[ets] Failed to fetch ET list:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch ET list from Google Sheets",
      },
      { status: 500 },
    );
  }
}

