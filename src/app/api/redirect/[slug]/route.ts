import { NextRequest, NextResponse } from "next/server";
import { getSafeRedirectBySlug, recordListingClick } from "@/lib/catalogue";
import { isSafeExternalRedirect } from "@/lib/security/urls";
import { config } from "@/lib/config";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  // Never accept destination from query params
  if (
    request.nextUrl.searchParams.has("url") ||
    request.nextUrl.searchParams.has("to")
  ) {
    return NextResponse.json(
      { error: "Invalid redirect request" },
      { status: 400 },
    );
  }

  const { slug } = await context.params;
  const target = await getSafeRedirectBySlug(slug);
  if (!target || !isSafeExternalRedirect(target.destinationUrl)) {
    return NextResponse.redirect(new URL("/", config.appUrl), 302);
  }

  // Don't block the outbound redirect on analytics
  void recordListingClick(slug);

  return NextResponse.redirect(target.destinationUrl, 302);
}
