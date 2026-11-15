import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "DMCA Copyright Policy",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/dmca") },
};

export default function DmcaPage() {
  const name = config.appName;
  const noticeEmail =
    process.env.NEXT_PUBLIC_DMCA_EMAIL || "dmca@example.com";

  return (
    <LegalPage title="DMCA Copyright Policy">
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p>
        {name} respects intellectual property rights. We respond to notices of
        alleged copyright infringement that comply with the Digital Millennium
        Copyright Act (17 U.S.C. § 512) (“DMCA”).
      </p>

      <h2>Important about our service</h2>
      <p>
        {name} is a link directory. We do not host video files. Many listings
        only store a title, thumbnail URL, and outbound destination URL. Where
        material is hosted by a third party, you may also need to contact that
        host. We will remove or disable listings on {name} when we receive a
        valid DMCA notice identifying content on our service.
      </p>

      <h2>How to submit a DMCA notice</h2>
      <p>
        Send a written notice to our designated agent that includes{" "}
        <strong className="text-zinc-200">all</strong> of the following:
      </p>
      <ul>
        <li>
          Identification of the copyrighted work claimed to have been infringed
          (or a representative list if multiple works).
        </li>
        <li>
          Identification of the material claimed to be infringing, and
          information reasonably sufficient to locate it on {name} (URL/slug of
          the listing).
        </li>
        <li>
          Your name, mailing address, telephone number, and email address.
        </li>
        <li>
          A statement that you have a good-faith belief that use of the material
          is not authorized by the copyright owner, its agent, or the law.
        </li>
        <li>
          A statement that the information in the notice is accurate, and under
          penalty of perjury, that you are the owner or authorized to act on
          behalf of the owner of an exclusive right that is allegedly infringed.
        </li>
        <li>Your physical or electronic signature.</li>
      </ul>

      <h2>Designated DMCA Agent</h2>
      <p>
        Email:{" "}
        <a href={`mailto:${noticeEmail}`}>{noticeEmail}</a>
      </p>
      <p className="text-xs text-zinc-600">
        Replace this address with your real compliance inbox via{" "}
        <code className="text-zinc-500">NEXT_PUBLIC_DMCA_EMAIL</code> before
        going live with a custom domain.
      </p>

      <h2>Counter-notification</h2>
      <p>
        If your listing was removed and you believe it was a mistake or
        misidentification, you may send a counter-notification containing the
        elements required by 17 U.S.C. § 512(g).
      </p>

      <h2>Repeat infringers</h2>
      <p>
        We may permanently remove listings and, where applicable, terminate
        access for repeat infringers in appropriate circumstances.
      </p>
    </LegalPage>
  );
}
