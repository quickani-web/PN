import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "18 U.S.C. § 2257 Statement",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/2257") },
};

export default function Statement2257Page() {
  const name = config.appName;
  return (
    <LegalPage title="18 U.S.C. § 2257 Record-Keeping Requirements Compliance Statement">
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>Exemption / non-producer status</h2>
      <p>
        The operators of {name} are{" "}
        <strong className="text-zinc-200">
          not the primary or secondary producer
        </strong>{" "}
        (as those terms are defined in 18 U.S.C. § 2257 and 28 C.F.R. Part 75)
        of any of the visual content linked from this website.
      </p>
      <p>
        {name} operates solely as an{" "}
        <strong className="text-zinc-200">
          adult video-link directory / information location tool
        </strong>
        . Our activities with respect to content are limited to indexing,
        categorizing, and providing outbound hyperlinks to material hosted on
        third-party websites. We do not film, produce, upload, or host video
        files.
      </p>

      <h2>Custodian of records</h2>
      <p>
        All visual depictions of actual sexually explicit conduct accessible via
        links on this website are hosted, controlled, and distributed by
        independent third-party platforms and/or their content producers. Please
        direct requests for records required under 18 U.S.C. § 2257 / § 2257A
        to the respective third-party website, producer, studio, or uploader
        responsible for that content.
      </p>

      <h2>Age of performers</h2>
      <p>
        We require that linked destinations and their producers comply with
        applicable United States law, including that all persons depicted were
        18 years of age or older at the time the content was created. We do not
        knowingly link to illegal content involving minors.
      </p>

      <h2>Reporting</h2>
      <p>
        To report a listing you believe is illegal or non-compliant, contact us
        using the details on our <a href="/dmca">DMCA / notices</a> page and
        include the listing URL.
      </p>
    </LegalPage>
  );
}
