'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear produto',
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erroCamera, setErroCamera] = useState(false);
  const [flash, setFlash] = useState(false);
  const [manual, setManual] = useState('');

  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    setErroCamera(false);
    setFlash(false);
    setManual('');

    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;

    const iniciar = async (): Promise<void> => {
      if (!videoRef.current) return;
      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return;
            const code = result.getText();
            if (typeof navigator.vibrate === 'function') navigator.vibrate(200);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 500);
            controls?.stop();
            onScanRef.current(code);
            onCloseRef.current();
          },
        );
      } catch {
        setErroCamera(true);
      }
    };

    void iniciar();

    return () => {
      controls?.stop();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.8)] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#E4E4E7]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {!erroCamera ? (
          <>
            <div className="relative mx-auto mt-4 h-60 w-full overflow-hidden rounded-lg bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {flash && <div className="absolute inset-0 bg-[rgba(34,197,94,0.3)]" />}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-56 animate-pulse rounded-lg border-2 border-[#6366F1]" />
              </div>
            </div>
            <p className="mt-3 text-center text-[13px] text-[#71717A]">
              Aponte para o código de barras
            </p>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-[13px] text-[#A1A1AA]">
              Câmera indisponível. Digite o código manualmente:
            </p>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ex: 7891234567890"
              autoFocus
              className="mt-2 w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#060608] px-3 py-2 text-sm text-[#FAFAFA] outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
            <button
              type="button"
              onClick={() => {
                onScan(manual.trim());
                onClose();
              }}
              disabled={!manual.trim()}
              className="mt-3 w-full rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
