"use client";

import { GitFork, X } from "lucide-react";
import { useState } from "react";

interface Props {
  existingForkName: string | null;
  addForkAction: () => Promise<void>;
}

export function ForkButtonClient({ existingForkName, addForkAction }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [pending, setPending] = useState(false);

  const buttonClass =
    "flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100";

  if (!existingForkName) {
    return (
      <form action={addForkAction}>
        <button type="submit" className={buttonClass}>
          <GitFork className="h-4 w-4" /> Fork to my library
        </button>
      </form>
    );
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className={buttonClass}>
        <GitFork className="h-4 w-4" /> Fork to my library
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!pending) setShowModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitFork className="h-5 w-5 shrink-0 text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Already forked</h2>
              </div>
              {!pending && (
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mb-5 text-sm text-neutral-500">
              You already have a fork named{" "}
              <span className="font-medium text-neutral-700">"{existingForkName}"</span>.
            </p>

            <div className="flex flex-col gap-2">
              <form
                action={async () => {
                  setPending(true);
                  await addForkAction();
                }}
                className="w-full"
              >
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  Fork as new collection
                </button>
              </form>

              <button
                onClick={() => setShowModal(false)}
                disabled={pending}
                className="w-full rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
