import { NextRequest, NextResponse } from "next/server";
import { getMailCounts } from "@/lib/googleSheets";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const et = searchParams.get("et") ?? "";

  try {
    const data = await getMailCounts({ startDate, endDate, etNameOrAll: et });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process data matrix" }, { status: 500 });
  }
}
