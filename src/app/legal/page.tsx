import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal — SavedPocket",
  description: "Legal notice, usage terms, and AGPL v3 license for SavedPocket.",
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
          SavedPocket is free software distributed under the GNU Affero General Public License v3.0
          (AGPL-3.0). This notice provides additional usage guidelines that clarify user
          responsibilities when deploying or using this software. These guidelines do not alter the
          AGPL-3.0 License.
        </p>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

          <H2 id="user-responsibility">User Responsibility</H2>
          <P>By installing and using SavedPocket, you agree to the following:</P>

          <H3>1. Platform Terms of Service Compliance</H3>
          <P>
            You are solely responsible for ensuring that your use of SavedPocket complies with the
            terms of service of any third-party platform (Instagram, LinkedIn, X/Twitter, YouTube,
            etc.) whose pages you save content from. The software developers bear no responsibility
            for any violations of third-party platform terms.
          </P>

          <H3>2. Personal Data</H3>
          <P>
            SavedPocket processes content from accounts that the user has authenticated and has
            legitimate access to. You must not use SavedPocket to collect or process personal data
            belonging to other individuals without their explicit consent. For enterprise or
            multi-user deployments involving employee data, a written data processing agreement must
            be established with the relevant parties before integration.
          </P>

          <H3>3. Data Masking &amp; Enterprise Use</H3>
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
              "Mass data collection for commercial resale or redistribution",
              "Processing data belonging to third parties without their informed consent",
              "Using SavedPocket to circumvent platform access controls or authentication systems",
              "Transferring collected data to unauthorized third parties",
              "Distributing a modified version of SavedPocket as a proprietary (closed-source) product without complying with AGPL-3.0 obligations",
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
            SavedPocket will be able to access data through platforms&apos; own agreed APIs — operating
            within formally agreed data-sharing frameworks and further aligning the software with
            platform policies.
          </P>

          <H2 id="contact">Contact</H2>
          <P>
            For questions about enterprise data agreements or compliance, please open an issue in the
            project repository.
          </P>

          <div className="my-6 border-t border-neutral-100" />

          <H2 id="license">License — GNU AGPL v3.0</H2>
          <P>
            SavedPocket is distributed under the{" "}
            <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
            The full license text is available in the{" "}
            <a
              href="https://github.com/Commencis/saved-pocket-webmcp/blob/main/LICENSE"
              className="underline text-neutral-600 hover:text-neutral-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              LICENSE file in the repository
            </a>.
          </P>

          <H3>What AGPL-3.0 means for you</H3>
          <UL items={[
            <><strong>Free to use:</strong> You can run, study, and modify SavedPocket for any purpose, including commercially.</>,
            <><strong>Copyleft:</strong> If you distribute a modified version — or run a modified version as a network service (SaaS) — you must release your modifications under AGPL-3.0 as well.</>,
            <><strong>Source must remain open:</strong> You cannot incorporate SavedPocket into a proprietary (closed-source) product without complying with the license obligations.</>,
            <><strong>No warranty:</strong> SavedPocket is provided &quot;as is&quot; without any warranty of any kind. The authors are not liable for damages arising from its use.</>,
          ]} />

          <div className="rounded-xl bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
            Copyright © 2026 Commencis. This program is free software: you can redistribute it
            and/or modify it under the terms of the GNU Affero General Public License as published
            by the Free Software Foundation, either version 3 of the License, or (at your option)
            any later version. This program is distributed in the hope that it will be useful, but
            WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
            FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
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
