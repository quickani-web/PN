import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  const name = config.appName;
  return (
    <LegalPage title="Privacy Policy">
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <p>
        This Privacy Policy explains how {name} (“we”, “us”) handles information
        when you use our adult video-link directory.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong className="text-zinc-200">Usage data:</strong> pages viewed,
          approximate location from IP, browser type, and referral URLs (via
          hosting/analytics providers such as Vercel Analytics).
        </li>
        <li>
          <strong className="text-zinc-200">Local storage:</strong> your 18+ age
          confirmation preference stored in your browser.
        </li>
        <li>
          <strong className="text-zinc-200">Cookies:</strong> essential and
          analytics cookies may be used by us or third parties (ads, analytics).
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <p>
        To operate and secure the site, understand traffic, improve listings,
        and comply with law. We do not sell personal information as a primary
        business model.
      </p>

      <h2>3. Third parties</h2>
      <p>
        When you click a listing, you leave {name} and interact with an
        external site under that site’s privacy policy. Our hosting, CDN, and
        analytics providers process data to deliver the service.
      </p>

      <h2>4. Children</h2>
      <p>
        This site is for adults only (18+). We do not knowingly collect
        information from anyone under 18. If you believe a minor has used the
        site, contact us so we can delete related data where feasible.
      </p>

      <h2>5. Your choices</h2>
      <p>
        You can clear cookies/local storage in your browser, use private
        browsing, or block analytics via browser settings.
      </p>

      <h2>6. Contact</h2>
      <p>
        Privacy requests: use the contact method listed on our{" "}
        <a href="/dmca">DMCA / notices</a> page.
      </p>
    </LegalPage>
  );
}
