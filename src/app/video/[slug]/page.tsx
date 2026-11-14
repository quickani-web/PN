import { redirect, notFound } from "next/navigation";
import { getSafeRedirectBySlug } from "@/lib/catalogue";
import { isSafeExternalRedirect } from "@/lib/security/urls";

type Props = { params: Promise<{ slug: string }> };

/** Old /video/[slug] URLs jump straight to the external destination. */
export default async function VideoPage({ params }: Props) {
  const { slug } = await params;
  const target = await getSafeRedirectBySlug(slug);
  if (!target || !isSafeExternalRedirect(target.destinationUrl)) {
    notFound();
  }
  redirect(target.destinationUrl);
}
