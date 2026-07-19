'use client';

import { useCallback, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { CheckIcon, CloseIcon, AlertTriangleIcon, RefreshIcon } from '@/components/Icons';

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
  error: string | null;
};

const EMPTY_SLOT: SlotState = { file: null, hash: null, hashing: false, error: null };

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

async function hashFile(file: File): Promise<string> {
  if (!('crypto' in window) || !window.crypto.subtle) {
    throw new Error(
      "Brauzeringiz Web Crypto API'ni qo'llab-quvvatlamaydi (HTTPS orqali oching).",
    );
  }
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function FileSlot({
  label,
  state,
  onFile,
  onClear,
}: {
  label: string;
  state: SlotState;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

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
              <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                <RefreshIcon size={14} /> Hash hisoblanmoqda...
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
              <div className="hash-value">{state.hash}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const [slotA, setSlotA] = useState<SlotState>(EMPTY_SLOT);
  const [slotB, setSlotB] = useState<SlotState>(EMPTY_SLOT);

  const runHash = useCallback(
    (file: File, setSlot: React.Dispatch<React.SetStateAction<SlotState>>) => {
      setSlot({ file, hash: null, hashing: true, error: null });
      hashFile(file)
        .then((hash) => setSlot({ file, hash, hashing: false, error: null }))
        .catch((err) =>
          setSlot({
            file,
            hash: null,
            hashing: false,
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
  const clearA = useCallback(() => setSlotA(EMPTY_SLOT), []);
  const clearB = useCallback(() => setSlotB(EMPTY_SLOT), []);

  const bothReady = Boolean(slotA.hash && slotB.hash);
  const isMatch = bothReady && slotA.hash === slotB.hash;
  const hasAnyError = Boolean(slotA.error || slotB.error);

  return (
    <div className="page">
      <nav className="navbar">
        <div className="navbar-inner container">
          <a href="/" className="brand">
            <Logo size={28} />
            MRcipher
          </a>
          <a href="/" className="btn btn-ghost btn-sm">
            Bosh sahifa
          </a>
        </div>
      </nav>

      <main>
        <div className="container" style={{ maxWidth: 860 }}>
          <section className="hero" style={{ paddingBottom: '1rem' }}>
            <div className="badge">
              <span className="badge-dot" />
              Fayl butunligini tekshirish
            </div>
            <h1 style={{ fontSize: '1.9rem', marginTop: '0.75rem' }}>
              Ikki faylni solishtiring
            </h1>
            <p className="text-muted" style={{ maxWidth: 560, margin: '0.5rem auto 0' }}>
              Har ikkala faylning SHA-256 hashi butunlay brauzeringizda hisoblanadi.
              Fayllar hech qachon serverga yuborilmaydi va hajmiga cheklov yo&apos;q.
            </p>
          </section>

          <section className="card">
            <div className="verify-grid">
              <FileSlot label="1-fayl (A)" state={slotA} onFile={handleFileA} onClear={clearA} />
              <FileSlot label="2-fayl (B)" state={slotB} onFile={handleFileB} onClear={clearB} />
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
                </div>
              </div>
            )}

            {!bothReady && !hasAnyError && (slotA.file || slotB.file) && (
              <p className="text-muted mt-2" style={{ textAlign: 'center' }}>
                Solishtirish uchun ikkinchi faylni ham qo&apos;shing.
              </p>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        <p className="text-muted">MRcipher — AES-256-GCM Encryption-as-a-Service</p>
      </footer>
    </div>
  );
}
