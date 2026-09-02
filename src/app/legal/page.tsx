import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal — SavedPocket",
  description: "Legal notice, usage terms, and MIT license for SavedPocket.",
};

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-3 mt-8 text-xl font-semibold text-neutral-900 first:mt-0">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-base font-semibold text-neutral-800">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-neutral-700">{children}</p>;
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-3 ml-4 flex list-disc flex-col gap-1 text-sm leading-relaxed text-neutral-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-600">
            ← Back
          </Link>
        </div>

        <h1 className="mb-1 text-3xl font-bold text-neutral-900">Legal Notice</h1>
        <p className="mb-8 text-sm text-neutral-500">
          SavedPocket is open-source software distributed under the MIT License. This notice provides
          additional usage guidelines that clarify user responsibilities when deploying or using this
          software. These guidelines do not alter the MIT License.
        </p>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

          <H2 id="user-responsibility">User Responsibility</H2>
          <P>By installing and using SavedPocket, you agree to the following:</P>

          <H3>1. Platform Terms of Service Compliance</H3>
          <P>
            You are solely responsible for ensuring that your use of SavedPocket complies with the
            terms of service of any third-party platform (Instagram, LinkedIn, X/Twitter, YouTube,
            etc.) from which content is collected. The software developers bear no responsibility for
            any violations of third-party platform terms.
          </P>

          <H3>2. Personal Data</H3>
          <P>
            SavedPocket processes content from accounts that the user has authenticated and has
            legitimate access to. You must not use SavedPocket to collect or process personal data
            belonging to other individuals without their explicit consent. For enterprise or
            multi-user deployments involving employee data, a written data processing agreement must
            be established with the relevant parties before integration.
          </P>

          <H3>3. Data Masking & Enterprise Use</H3>
          <P>
            When integrating SavedPocket with organizational systems, sensitive or personally
            identifiable information (PII) must be masked or anonymized on the client side before
            being transmitted to SavedPocket. The operator is responsible for ensuring that no
            unauthorized personal data enters the system.
          </P>

          <H3>4. Prohibited Uses</H3>
          <P>The following uses are explicitly prohibited:</P>
          <UL
            items={[
              "Bulk scraping or mass data collection for commercial resale or redistribution",
              "Processing data belonging to third parties without their informed consent",
              "Using SavedPocket to circumvent platform access controls or authentication systems",
              "Transferring collected data to unauthorized third parties",
            ]}
          />

          <H3>5. Legal Liability</H3>
          <P>
            Any violation of third-party platform terms, applicable data protection laws (GDPR,
            KVKK, CCPA, etc.), or the restrictions set forth in this notice is the sole legal
            responsibility of the user or operator. The software authors and contributors are not
            liable for any legal consequences arising from such violations.
          </P>

          <H2 id="future-compatibility">Future Compatibility</H2>
          <P>
            As the WebMCP standard (W3C Community Group draft) matures and is adopted by platforms,
            SavedPocket intends to transition from browser-extension-based scraping to
            platform-native data access APIs, operating within formally agreed data-sharing
            frameworks. This transition will further align the software with platform policies.
          </P>

          <H2 id="contact">Contact</H2>
          <P>
            For questions about enterprise data agreements or compliance, please open an issue in the
            project repository.
          </P>

          <div className="my-6 border-t border-neutral-100" />

          <H2 id="license">MIT License</H2>
          <div className="rounded-xl bg-neutral-50 p-4 font-mono text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
{`MIT License

Copyright (c) 2026 Commencis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
          </div>
        </div>

        <div className="mt-6 flex gap-4 text-xs text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">Home</Link>
          <Link href="/docs" className="hover:text-neutral-600">Docs</Link>
        </div>
      </div>
    </main>
  );
}
