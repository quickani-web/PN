import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  const name = config.appName;
  return (
    <LegalPage title="Terms of Service">
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p>
        Welcome to {name}. By accessing or using this website, you agree to
        these Terms of Service. If you do not agree, do not use the site.
      </p>

      <h2>1. Adult audience only</h2>
      <p>
        This website contains adult-oriented material and is intended solely for
        adults who are at least <strong className="text-zinc-200">18 years of age</strong>{" "}
        (or the age of majority in your jurisdiction, if higher). By entering,
        you represent that you are of legal age to view such material where you
        live and that you want to view adult content.
      </p>

      <h2>2. What this site is</h2>
      <p>
        {name} is a <strong className="text-zinc-200">video-link directory / information location tool</strong>.
        We list publicly available third-party destinations. We do{" "}
        <strong className="text-zinc-200">not</strong> host, stream, upload, or
        store video files. Clicking a listing opens an external website that we
        do not control.
      </p>

      <h2>3. No illegal content</h2>
      <p>
        We prohibit and do not knowingly index or promote child sexual abuse
        material (CSAM), non-consensual intimate imagery, or other illegal
        content. Report concerns via the contacts on our{" "}
        <a href="/dmca">DMCA</a> page.
      </p>

      <h2>4. Third-party sites</h2>
      <p>
        External destinations have their own terms, privacy practices, and
        compliance obligations. We are not responsible for content, ads,
        cookies, malware, or practices on websites you visit after leaving{" "}
        {name}.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        Listing titles, thumbnails, and destination URLs originate from or point
        to third parties. Copyright owners may submit notices under our{" "}
        <a href="/dmca">DMCA Policy</a>.
      </p>

      <h2>6. Disclaimer of warranties</h2>
      <p>
        The site is provided “as is” and “as available,” without warranties of
        any kind, express or implied, including fitness for a particular
        purpose, non-infringement, or uninterrupted availability.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {name} and its operators shall
        not be liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of data, profits, or goodwill, arising
        from your use of the site or third-party destinations.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States and the State
        of Delaware, without regard to conflict-of-law rules, except where
        mandatory local consumer law applies.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms at any time. Continued use after changes means
        you accept the revised Terms.
      </p>
    </LegalPage>
  );
}
