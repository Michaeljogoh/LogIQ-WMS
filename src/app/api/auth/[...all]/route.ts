import { NextResponse } from "next/server";

/** Placeholder — wire `better-auth` + `toNextJsHandler` in Module 2. */
export function GET() {
  return NextResponse.json(
    { error: "Auth handler not configured" },
    { status: 501 },
  );
}

export function POST() {
  return NextResponse.json(
    { error: "Auth handler not configured" },
    { status: 501 },
  );
}
