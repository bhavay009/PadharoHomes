import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const UPDATED = "June 2026";

function LegalShell({ title, children }) {
  return (
    <div className="container-px py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-500">
          <ChevronLeft className="h-4 w-4" /> Back home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated: {UPDATED}</p>
        <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-zinc-700">
          {children}
        </div>
        <div className="mt-10 rounded-2xl bg-muted-light p-4 text-xs text-muted">
          This document is a general template provided for convenience and is not legal advice.
          Please have it reviewed by a qualified lawyer before relying on it for a live business.
        </div>
        <p className="mt-6 text-sm text-muted">
          Questions? Email <a href="mailto:hello@padharohomes.com" className="font-medium text-brand-600">hello@padharohomes.com</a>.
        </p>
      </div>
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        Welcome to Padharo Homes. By creating an account, browsing, listing a property, or making
        a booking, you agree to these Terms. Padharo Homes is a platform that connects guests with
        hosts for direct bookings.
      </p>
      <Sec title="1. Your account">
        <p>
          We use passwordless login: you sign in with a one-time code sent to your email or phone.
          You are responsible for keeping access to that email/phone secure, and for activity under
          your account.
        </p>
      </Sec>
      <Sec title="2. Bookings, deposits & payments">
        <p>
          When you book a stay, you pay a <strong>deposit online</strong> to confirm the reservation;
          the remaining <strong>balance is paid directly at the property</strong>. Prices, deposit
          percentage, fees, taxes, and the cancellation policy are shown on each listing before you book.
        </p>
        <p>
          Deposits may be <strong>non-refundable</strong> on cancellation or no-show, as stated on the
          listing at the time of booking. Hosts set their own cancellation policies.
        </p>
      </Sec>
      <Sec title="3. Hosts">
        <p>
          Hosts are responsible for the accuracy of their listings (photos, pricing, availability,
          amenities, house rules) and for honouring confirmed bookings. Hosts must have the legal right
          to list and rent their property.
        </p>
      </Sec>
      <Sec title="4. Guests">
        <p>
          Guests agree to follow the host's house rules, respect the property, and pay the balance due
          at the property. Guests are responsible for any damage they cause beyond normal wear and tear.
        </p>
      </Sec>
      <Sec title="5. Reviews">
        <p>
          Guests may review a stay after a confirmed booking. Reviews must be honest and respectful.
          We may remove content that is abusive, fraudulent, or violates these Terms.
        </p>
      </Sec>
      <Sec title="6. Prohibited use">
        <p>
          You agree not to misuse the platform — including fraud, scraping, attempting to bypass
          security, or posting illegal or harmful content.
        </p>
      </Sec>
      <Sec title="7. Liability">
        <p>
          Padharo Homes facilitates direct bookings between hosts and guests. To the extent permitted
          by law, we are not liable for the conduct of hosts or guests, or for the condition of any
          property. The platform is provided “as is”.
        </p>
      </Sec>
      <Sec title="8. Changes">
        <p>We may update these Terms; continued use after changes means you accept the updated Terms.</p>
      </Sec>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This policy explains what information Padharo Homes collects, how we use it, and your choices.
      </p>
      <Sec title="1. Information we collect">
        <p>
          <strong>Account:</strong> your email or phone number, and optionally your name, bio, languages,
          and profile photo. <strong>Listings:</strong> property details and photos you upload as a host.
          <strong> Bookings:</strong> guest name, contact, dates, and amounts. <strong>Reviews:</strong>
          ratings and comments you submit.
        </p>
      </Sec>
      <Sec title="2. How we use it">
        <p>
          To create and secure your account, process bookings and deposits, show listings and reviews,
          send confirmations and login codes, and operate and improve the service.
        </p>
      </Sec>
      <Sec title="3. Who we share it with">
        <p>
          <strong>Hosts and guests</strong> share necessary booking details with each other.
          We use trusted service providers to run the platform: a <strong>payment gateway</strong> (for
          deposits), <strong>Cloudinary</strong> (image hosting), an <strong>email/SMS provider</strong>
          (login codes and notifications), and <strong>cloud hosting/database</strong>. We do not sell
          your personal data.
        </p>
      </Sec>
      <Sec title="4. Storage on your device">
        <p>
          We store a login token and small preferences in your browser's local storage to keep you
          signed in. You can clear these via your browser settings.
        </p>
      </Sec>
      <Sec title="5. Your rights">
        <p>
          You can request access to, correction of, or deletion of your personal data by contacting us.
          Some records may be retained where required for legal or accounting reasons.
        </p>
      </Sec>
      <Sec title="6. Security">
        <p>
          We use industry-standard measures (encrypted connections, hashed login codes, scoped access).
          No system is perfectly secure, so please protect access to your email/phone.
        </p>
      </Sec>
      <Sec title="7. Changes">
        <p>We may update this policy and will revise the “last updated” date above.</p>
      </Sec>
    </LegalShell>
  );
}
