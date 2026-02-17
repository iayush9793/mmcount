import { NextResponse } from "next/server";
import { getMailCounts } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isoDate = searchParams.get("date") ?? "";
  const campaign = searchParams.get("campaign") ?? "";
  const et = searchParams.get("et") ?? "";

  if (!isoDate || !campaign || !et) {
    return NextResponse.json(
      {
        error: "Missing required query parameters: date, campaign, et",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getMailCounts({
      isoDate,
      campaign,
      etNameOrAll: et,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[mailCounts] Failed to fetch mail counts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch mail counts from Google Sheets",
      },
      { status: 500 },
    );
  }
}

