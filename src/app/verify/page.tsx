'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, AlertTriangleIcon } from '@/components/Icons';
import { SiteHeader, SiteSidebar, SiteBottomNav, SiteFooter } from '@/components/SiteChrome';

/**
 * /verify — fayl butunligini tekshirish (hash orqali solishtirish).
 *
 * Bu sahifa TO'LIQ brauzer tomonida ishlaydi: fayllar hech qachon serverga
 * yuborilmaydi, hash butunlay foydalanuvchi qurilmasida (Web Crypto API,
 * SHA-256) hisoblanadi. Shu sababli:
 *   - Serverdagi so'rov hajmi cheklovi (masalan encrypt/decrypt endpointidagi
 *     512 KiB limiti) bu yerga umuman tegishli emas — fayl hajmiga sun'iy
 *     cheklov qo'yilmagan.
 *   - Yagona real chegara — foydalanuvchi qurilmasining xotirasi, bu esa
 *     ilova tomonidan emas, brauzer/OS tomonidan belgilanadi.
 */

type SlotState = {
  file: File | null;
  hash: string | null;
  hashing: boolean;
  progress: number;
  error: string | null;
};

const EMPTY_SLOT: SlotState = { file: null, hash: null, hashing: false, progress: 0, error: null };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unitIndex]}`;
}

function toHex(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a file with SHA-256, reporting read progress along the way.
 *
 * The file is streamed in chunks via Blob.stream() so large files (video,
 * archives, etc.) report real progress instead of freezing on one big
 * arrayBuffer() read. Reading accounts for 0-95% of the bar; the final
 * digest pass (fast, but not instant for very large files) fills the rest.
 */
async function hashFile(file: File, onProgress: (pct: number) => void): Promise<string> {
  if (!('crypto' in window) || !window.crypto.subtle) {
    throw new Error(
      "Brauzeringiz Web Crypto API'ni qo'llab-quvvatlamaydi (HTTPS orqali oching).",
    );
  }

  if (file.size === 0) {
    const digest = await window.crypto.subtle.digest('SHA-256', new ArrayBuffer(0));
    onProgress(100);
    return toHex(digest);
  }

  if (typeof file.stream !== 'function') {
    // Fallback for browsers without Blob.stream() support.
    const buffer = await file.arrayBuffer();
    onProgress(95);
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    onProgress(100);
    return toHex(digest);
  }

  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onProgress(Math.min(95, (received / file.size) * 95));
    }
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  onProgress(97);
  const digest = await window.crypto.subtle.digest('SHA-256', combined);
  onProgress(100);
  return toHex(digest);
}

function FileSlot({
  label,
  state,
  onFile,
  onClear,
  onMouseEnter,
  onMouseLeave,
}: {
  label: string;
  state: SlotState;
  onFile: (file: File) => void;
  onClear: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  function copyHash() {
    if (!state.hash) return;
    navigator.clipboard.writeText(state.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}${state.file ? ' has-file' : ''}`}
        tabIndex={0}
        onClick={() => !state.file && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!state.file && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onPaste={(e) => {
          const files = e.clipboardData?.files;
          if (files && files.length > 0) {
            handleFiles(files);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {!state.file ? (
          <div className="dropzone-placeholder">
            <span>Faylni shu yerga tashlang</span>
            <span className="text-dim" style={{ fontSize: '0.8rem' }}>
              yoki bosing / Ctrl+V orqali joylashtiring
            </span>
            <span className="text-dim" style={{ fontSize: '0.75rem' }}>
              Hajm cheklovi yo&apos;q
            </span>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <div className="dropzone-file-row">
              <span className="dropzone-file-name">{state.file.name}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                aria-label="Faylni olib tashlash"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="dropzone-file-size">{formatBytes(state.file.size)}</div>

            {state.hashing && (
              <div className="hash-progress">
                <div className="hash-progress-track">
                  <div
                    className="hash-progress-fill"
                    style={{ width: `${Math.max(4, state.progress)}%` }}
                  />
                </div>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Hash hisoblanmoqda... {Math.round(state.progress)}%
                </span>
              </div>
            )}

            {state.error && (
              <div className="alert alert-error mt-1" style={{ marginBottom: 0 }}>
                <span className="alert-icon">
                  <AlertTriangleIcon size={16} />
                </span>
                <div className="alert-body">{state.error}</div>
              </div>
            )}

            {state.hash && !state.hashing && (
              <div className="hash-row">
                <div className="hash-value">{state.hash}</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-copy-inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyHash();
                  }}
                >
                  {copied ? 'Nusxa olindi!' : 'Nusxa olish'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type VerifyMode = 'compare' | 'single';
type SlotKey = 'A' | 'B' | 'single';

export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>('compare');

  const [slotA, setSlotA] = useState<SlotState>(EMPTY_SLOT);
  const [slotB, setSlotB] = useState<SlotState>(EMPTY_SLOT);
  const [slotSingle, setSlotSingle] = useState<SlotState>(EMPTY_SLOT);

  // Qaysi box hozir sichqoncha ostida turgani — shu orqali "hover + Ctrl+V"
  // qaysi boxga fayl joylashtirishni bilishimiz uchun kerak.
  const [hoveredSlot, setHoveredSlot] = useState<SlotKey | null>(null);

  const runHash = useCallback(
    (file: File, setSlot: React.Dispatch<React.SetStateAction<SlotState>>) => {
      setSlot({ file, hash: null, hashing: true, progress: 0, error: null });
      hashFile(file, (pct) => {
        setSlot((prev) => (prev.file === file ? { ...prev, progress: pct } : prev));
      })
        .then((hash) => setSlot({ file, hash, hashing: false, progress: 100, error: null }))
        .catch((err) =>
          setSlot({
            file,
            hash: null,
            hashing: false,
            progress: 0,
            error:
              err instanceof Error
                ? `Faylni o'qishda xatolik: ${err.message}`
                : "Faylni o'qishda noma'lum xatolik yuz berdi.",
          }),
        );
    },
    [],
  );

  const handleFileA = useCallback((file: File) => runHash(file, setSlotA), [runHash]);
  const handleFileB = useCallback((file: File) => runHash(file, setSlotB), [runHash]);
  const handleFileSingle = useCallback(
    (file: File) => runHash(file, setSlotSingle),
    [runHash],
  );
  const clearA = useCallback(() => setSlotA(EMPTY_SLOT), []);
  const clearB = useCallback(() => setSlotB(EMPTY_SLOT), []);
  const clearSingle = useCallback(() => setSlotSingle(EMPTY_SLOT), []);

  // Sichqoncha biror box ustida bo'lganda Ctrl+V bosilsa, shu boxga fayl
  // joylashtiriladi. Bu global (window) darajasida ishlaydi, chunki oddiy
  // <div> hover holatida (fokussiz) paste hodisasini har doim ham
  // qo'lga olavermaydi — shu sababli hover holatini o'zimiz kuzatib,
  // clipboard'ni window darajasida o'qiymiz.
  useEffect(() => {
    function handleWindowPaste(e: ClipboardEvent) {
      if (!hoveredSlot) return;
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;

      e.preventDefault();
      const file = files[0];
      if (hoveredSlot === 'A') handleFileA(file);
      else if (hoveredSlot === 'B') handleFileB(file);
      else if (hoveredSlot === 'single') handleFileSingle(file);
    }

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [hoveredSlot, handleFileA, handleFileB, handleFileSingle]);

  // Rejim almashtirilganda (masalan compare -> single) eskirib qolgan hover
  // holatini tozalaymiz, chunki tegishli box endi ekranda bo'lmasligi mumkin.
  useEffect(() => {
    setHoveredSlot(null);
  }, [mode]);

  const bothReady = Boolean(slotA.hash && slotB.hash);
  const isMatch = bothReady && slotA.hash === slotB.hash;
  const hasAnyError = Boolean(slotA.error || slotB.error);
  const namesDiffer = Boolean(
    slotA.file && slotB.file && slotA.file.name !== slotB.file.name,
  );

  return (
    <div className="page">
      <SiteHeader />

      <div className="app-shell">
        <SiteSidebar active="verify" />

        <main className="app-main">
        <div className="container" style={{ maxWidth: 860 }}>
          <section className="hero" style={{ paddingBottom: '1rem' }}>
            <div className="badge">
              <span className="badge-dot" />
              Fayl butunligini tekshirish
            </div>
            <h1 style={{ fontSize: '1.9rem', marginTop: '0.75rem' }}>
              {mode === 'compare' ? 'Ikki faylni solishtiring' : 'Bitta fayl hashi'}
            </h1>
            <p className="text-muted" style={{ maxWidth: 560, margin: '0.5rem auto 0' }}>
              {mode === 'compare'
                ? "Har ikkala faylning SHA-256 hashi butunlay brauzeringizda hisoblanadi. Fayllar hech qachon serverga yuborilmaydi va hajmiga cheklov yo'q."
                : "Faylning SHA-256 hashi butunlay brauzeringizda hisoblanadi. Fayl hech qachon serverga yuborilmaydi va hajmiga cheklov yo'q."}
            </p>
          </section>

          <section className="card">
            <div className="card-header" style={{ justifyContent: 'center', border: 'none', padding: 0, marginBottom: '1.25rem' }}>
              <div className="tab-list">
                <button
                  type="button"
                  className={`tab ${mode === 'compare' ? 'active' : ''}`}
                  onClick={() => setMode('compare')}
                >
                  Ikki faylni solishtirish
                </button>
                <button
                  type="button"
                  className={`tab ${mode === 'single' ? 'active' : ''}`}
                  onClick={() => setMode('single')}
                >
                  Bitta fayl hashi
                </button>
              </div>
            </div>

            {mode === 'compare' ? (
              <>
                <div className="verify-grid">
                  <FileSlot
                    label="1-fayl (A)"
                    state={slotA}
                    onFile={handleFileA}
                    onClear={clearA}
                    onMouseEnter={() => setHoveredSlot('A')}
                    onMouseLeave={() => setHoveredSlot((prev) => (prev === 'A' ? null : prev))}
                  />
                  <FileSlot
                    label="2-fayl (B)"
                    state={slotB}
                    onFile={handleFileB}
                    onClear={clearB}
                    onMouseEnter={() => setHoveredSlot('B')}
                    onMouseLeave={() => setHoveredSlot((prev) => (prev === 'B' ? null : prev))}
                  />
                </div>

                {bothReady && (
                  <div className={`alert ${isMatch ? 'alert-success' : 'alert-error'} mt-2`}>
                    <span className="alert-icon">
                      {isMatch ? <CheckIcon size={18} /> : <AlertTriangleIcon size={18} />}
                    </span>
                    <div className="alert-body">
                      {isMatch
                        ? "Fayllar bir xil — o'zgarmagan."
                        : 'Fayllar boshqacha — kamida bittasi boshqa yoki o\'zgartirilgan.'}
                      {isMatch && namesDiffer && (
                        <div className="mt-1" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                          Diqqat: fayl nomlari boshqacha —{' '}
                          <strong>{slotA.file?.name}</strong> va <strong>{slotB.file?.name}</strong>.
                          Mazmuni bir xil, lekin fayl nomi almashtirilgan bo&apos;lishi mumkin.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!bothReady && !hasAnyError && (slotA.file || slotB.file) && (
                  <p className="text-muted mt-2" style={{ textAlign: 'center' }}>
                    Solishtirish uchun ikkinchi faylni ham qo&apos;shing.
                  </p>
                )}
              </>
            ) : (
              <div style={{ maxWidth: 420, margin: '0 auto' }}>
                <FileSlot
                  label="Fayl"
                  state={slotSingle}
                  onFile={handleFileSingle}
                  onClear={clearSingle}
                  onMouseEnter={() => setHoveredSlot('single')}
                  onMouseLeave={() => setHoveredSlot((prev) => (prev === 'single' ? null : prev))}
                />
              </div>
            )}
          </section>
        </div>
        <SiteFooter variant="app" />
        </main>

        <SiteBottomNav active="verify" />
      </div>
    </div>
  );
}
