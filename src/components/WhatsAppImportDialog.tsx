"use client";

import { CheckSquare, Square, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^[\]`]+/g;
const NOISE_HOSTS = new Set(["wa.me", "whatsapp.com", "chat.whatsapp.com"]);

function extractUrls(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const line of text.split("\n")) {
    const matches = line.match(URL_REGEX);
    if (!matches) continue;
    for (const raw of matches) {
      const url = raw.replace(/[.,;:!?)]+$/, "");
      try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        if (NOISE_HOSTS.has(host)) continue;
      } catch {
        continue;
      }
      if (!seen.has(url)) {
        seen.add(url);
        results.push(url);
      }
    }
  }
  return results;
}

type Step = "upload" | "preview" | "result";

interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  errors: string[];
}

export function WhatsAppImportDialog({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setStep("upload");
    setUrls([]);
    setSelected(new Set());
    setBusy(false);
    setProgress(0);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const found = extractUrls(text);
      setUrls(found);
      setSelected(new Set(found));
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  }

  function toggleAll() {
    if (selected.size === urls.length) setSelected(new Set());
    else setSelected(new Set(urls));
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function handleImport() {
    const toImport = urls.filter((u) => selected.has(u));
    if (toImport.length === 0) return;
    setBusy(true);
    setProgress(0);

    const BATCH = 50;
    let created = 0;
    let duplicates = 0;
    let errors: string[] = [];
    let done = 0;

    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH);
      const res = await fetch("/api/import/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: batch }),
      });
      if (res.ok) {
        const data = await res.json();
        created += data.created;
        duplicates += data.duplicates;
        errors = [...errors, ...data.errors];
      }
      done += batch.length;
      setProgress(Math.round((done / toImport.length) * 100));
    }

    setResult({ total: toImport.length, created, duplicates, errors });
    setStep("result");
    setBusy(false);
    onImported?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            WhatsApp&apos;tan İçe Aktar
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-neutral-600">
                WhatsApp sohbetini dışa aktar, dosyayı buraya yükle — linkler
                otomatik bulunur.
              </p>
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-500">
                <p className="font-medium text-neutral-700">Nasıl export edilir?</p>
                <p className="mt-1">
                  WhatsApp → Sohbet aç → Sağ üst &quot;···&quot; → <strong>Sohbeti Dışa Aktar</strong> →{" "}
                  <strong>Medyasız</strong>
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <Upload className="h-4 w-4" /> .txt dosyası seç
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">
                  <strong>{urls.length}</strong> link bulundu
                </span>
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  {selected.size === urls.length ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {selected.size === urls.length ? "Tümünü kaldır" : "Tümünü seç"}
                </button>
              </div>

              {urls.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Bu dosyada link bulunamadı. Doğru sohbeti export ettiğinden emin ol.
                </p>
              ) : (
                <ul className="max-h-56 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200">
                  {urls.map((url) => {
                    let host = url;
                    try {
                      host = new URL(url).hostname.replace(/^www\./, "");
                    } catch {}
                    return (
                      <li
                        key={url}
                        onClick={() => toggle(url)}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50"
                      >
                        {selected.has(url) ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-neutral-300" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-neutral-700">
                            {host}
                          </p>
                          <p className="truncate text-xs text-neutral-400">{url}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  Geri
                </button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0 || busy}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busy
                    ? `İçe aktarılıyor… %${progress}`
                    : `${selected.size} link ekle`}
                </button>
              </div>

              {busy && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === "result" && result && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-green-50 px-3 py-3">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600">Eklendi</p>
                </div>
                <div className="rounded-xl bg-neutral-100 px-3 py-3">
                  <p className="text-2xl font-bold text-neutral-600">{result.duplicates}</p>
                  <p className="text-xs text-neutral-500">Zaten vardı</p>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-3">
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-xs text-red-500">Hata</p>
                </div>
              </div>
              {result.created > 0 && (
                <p className="text-sm text-neutral-500">
                  Yeni linkler AI tarafından analiz edilecek — birkaç dakika sürebilir.
                </p>
              )}
              <button
                onClick={handleClose}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Tamam
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
