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
        <p className="mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wide">&ldquo;Notice&rdquo;</p>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

          <P>
            SavedPocket is open-source software distributed under GNU Affero General Public
            License, Version 3 (AGPL-3.0) (&ldquo;SavedPocket&rdquo;).
          </P>
          <P>
            This Notice sets forth additional requirements and guidelines and clarifies
            responsibilities applicable to any individual or entity that downloads, accesses,
            installs, deploys or operates SavedPocket or its source code, whether directly or
            indirectly (&ldquo;User(s)&rdquo;) in connection with their use and operation of
            SavedPocket.
          </P>

          <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            SavedPocket was developed specifically for the purposes of and for use in the WebMCP
            Challenge managed by Devpost (&ldquo;Hackathon&rdquo;) and is not intended for use
            outside the Hackathon. It has not been designed, tested or validated for use outside
            the context of the Hackathon. Any installation, deployment, operation or other use of
            SavedPocket outside such context is undertaken at the relevant User&apos;s sole
            discretion and risk, and SavedPocket developers, authors and contributors make no
            representation or warranty as to its suitability, reliability, security or fitness for
            such use, in addition to the disclaimers set out in the GNU Affero General Public
            License, Version 3.
          </div>

          <P>
            By downloading, accessing, installing, deploying or operating SavedPocket or its
            source code, Users acknowledge that they have read and understood this Notice and agree
            to comply with the requirements and conditions set forth herein.
          </P>

          <H2 id="compliance">1. Compliance</H2>
          <P>
            SavedPocket relies on and interacts with certain third-party products, platforms and
            services (e.g., Instagram, LinkedIn, X/Twitter, YouTube). Accordingly, the use or
            operation of SavedPocket may be subject to the applicable third party&apos;s terms and
            conditions, policies, restrictions and/or authorization requirements. Users shall be
            responsible for obtaining any rights, licenses, permissions, consents, or authorizations
            required for such use or operation and for ensuring that their use or operation of
            SavedPocket complies with all applicable third-party terms and requirements.
          </P>
          <P>
            Users shall be responsible for taking the necessary actions &ndash; such as entering
            into an agreement with the relevant platform or using official and approved APIs &ndash;
            to ensure that the Data (as described below) transfer from the third-party products,
            platforms and services is legally compliant.
          </P>
          <P>
            Users shall also be responsible for ensuring that their use or operation of SavedPocket
            complies with applicable laws.
          </P>

          <H2 id="personal-data">2. Personal Data</H2>
          <P>
            Any data, information or content obtained from or made available through third-party
            products, platforms and services as well as any data, information or content generated,
            created, derived, processed or otherwise made available through or in connection with
            the use or operation of SavedPocket (&ldquo;Data&rdquo;) may contain personal data.
          </P>
          <P>
            Users shall be responsible for taking all actions and implementing and maintaining all
            measures, safeguards and infrastructure necessary to ensure that the use or operation of
            SavedPocket complies with all applicable data protection and privacy laws and
            regulations.
          </P>

          <H2 id="intellectual-property">3. Intellectual Property Rights</H2>
          <P>
            Data may be protected by copyright, database rights or other intellectual property or
            proprietary rights of third parties.
          </P>
          <P>
            Users shall be responsible for ensuring that they have all necessary rights, licenses,
            permissions and authorizations to access, use, reproduce, process, modify, display,
            distribute or otherwise exploit such Data in connection with their use or operation of
            SavedPocket and that such use or operation does not infringe or otherwise violate any
            third-party intellectual property or proprietary rights.
          </P>
          <P>
            Nothing in this Notice or the availability or distribution of SavedPocket shall be
            construed as granting any right, license, permission or authorization with respect to
            any Data or any third-party product, platform or service.
          </P>

          <H2 id="prohibited-uses">4. Prohibited Uses</H2>
          <P>The following uses are explicitly prohibited:</P>
          <UL items={[
            "Bulk scraping or mass data collection, including for commercial resale or redistribution;",
            "Using SavedPocket to circumvent platform access controls, authentication systems, or other technical restrictions;",
            "Using SavedPocket to access or use Data that the relevant User is not authorized to access or use;",
            "Transferring Data to unauthorized third parties.",
          ]} />

          <H2 id="liability">5. Liability</H2>
          <P>
            Any violation of the requirements set forth in this Notice or otherwise applicable to
            the use or operation of SavedPocket shall be the sole responsibility of the relevant
            User. SavedPocket developers, authors and contributors shall not be responsible or
            liable for any use or operation of SavedPocket in violation of such requirements or for
            any claims, losses, damages, liabilities or other consequences arising out of or in
            connection with such use or operation.
          </P>
          <P>
            SavedPocket is provided &ldquo;as is&rdquo;, without warranty of any kind, express or
            implied, including but not limited to the warranties of merchantability, fitness for a
            particular purpose and non-infringement. In no event shall SavedPocket developers,
            authors and contributors be liable for any claim, damages or other liability, whether
            in an action of contract, tort or otherwise, arising out of or in connection with the
            use or operation of SavedPocket.
          </P>
          <P>
            SavedPocket relies on and interacts with certain third-party products, platforms and
            services that are outside the control of SavedPocket developers, authors and
            contributors. No representation or warranty is made regarding the availability,
            continuity, compatibility, accuracy or functionality of any such third-party product,
            platform or service, and SavedPocket developers, authors and contributors shall not be
            responsible or liable for any modification, restriction, suspension, discontinuation or
            unavailability thereof or for any resulting impact on the operation or functionality of
            SavedPocket.
          </P>

          <div className="my-6 border-t border-neutral-100" />

          <H3>License</H3>
          <P>
            The full license text is available in the{" "}
            <a
              href="https://github.com/Commencis/saved-pocket-webmcp/blob/main/LICENSE"
              className="underline text-neutral-600 hover:text-neutral-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              LICENSE file in the project repository
            </a>.
          </P>

          <div className="rounded-xl bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-500">
            Copyright &copy; 2026 Commencis. This program is free software: you can redistribute
            it and/or modify it under the terms of the GNU Affero General Public License as
            published by the Free Software Foundation, either version 3 of the License, or (at
            your option) any later version. This program is distributed in the hope that it will
            be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
            MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
            License for more details.
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
