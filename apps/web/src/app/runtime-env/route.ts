import { NextResponse } from "next/server";

// Runtime (not build-time) environment info. The same Docker image serves both
// live and dev instances, so NEXT_PUBLIC_* build args can't distinguish them —
// APP_ENV is read per-request from the container's environment instead.
// Path is /runtime-env (not /api/*) because Caddy routes /api/* to Express.
export const dynamic = "force-dynamic";

export async function GET() {
  const env =
    process.env.APP_ENV ??
    (process.env.NODE_ENV === "development" ? "dev" : "live");
  return NextResponse.json({ env });
}
