import { NextResponse } from "next/server";

export async function GET() {
  // Returns an empty placeholder array to satisfy Next.js compilation safely
  return NextResponse.json({ campaigns: [] });
}
