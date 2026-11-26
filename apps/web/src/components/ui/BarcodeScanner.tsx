'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

type Camera = { estado: 'iniciando' | 'pronta' } | { estado: 'erro'; mensagem: string };

function mensagemCamera(error: unknown): string {
  switch (error instanceof Error ? error.name : '') {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permita o acesso à câmera no navegador e tente novamente.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nenhuma câmera compatível foi encontrada.';
    case 'NotReadableError':
    case 'AbortError':
      return 'A câmera pode estar em uso. Feche outros apps que usam a câmera e tente novamente.';
    default:
      return 'Não foi possível iniciar a câmera.';
  }
}

export function BarcodeScanner({ isOpen, ...props }: BarcodeScannerProps) {
  return isOpen ? <ScannerDialog {...props} /> : null;
}

function ScannerDialog({
  onClose,
  onScan,
  title = 'Escanear produto',
}: Omit<BarcodeScannerProps, 'isOpen'>) {
  const titleId = useId();
  const codeId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const entregue = useRef(false);
  const callbacks = useRef({ onScan, onClose });
  callbacks.current = { onScan, onClose };

  const [camera, setCamera] = useState<Camera>({ estado: 'iniciando' });
  const [tentativa, setTentativa] = useState(0);
  const [manual, setManual] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    const origem = document.activeElement;
    dialog?.showModal();
    if (!window.matchMedia('(pointer: coarse)').matches) manualRef.current?.focus();

    return () => {
      dialog?.close();
      if (origem instanceof HTMLElement && origem.isConnected) origem.focus();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelado = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;

    function liberarCamera() {
      controls?.stop();
      controls = undefined;
      stream?.getTracks().forEach((track) => track.stop());
      if (video && video.srcObject === stream) video.srcObject = null;
      stream = undefined;
    }

    function mostrarErro(mensagem: string) {
      liberarCamera();
      if (!cancelado && !entregue.current) setCamera({ estado: 'erro', mensagem });
    }

    async function iniciarCamera(preview: HTMLVideoElement) {
      if (!window.isSecureContext) {
        mostrarErro('A câmera precisa de uma conexão HTTPS ou de um ambiente local.');
        return;
      }
      if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
        mostrarErro('Este navegador não disponibiliza acesso à câmera.');
        return;
      }

      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelado || entregue.current) return;

        // O navegador pode liberar a câmera depois que o leitor já foi fechado.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelado || entregue.current) {
          liberarCamera();
          return;
        }

        stream.getVideoTracks().forEach((track) => {
          track.addEventListener(
            'ended',
            () => mostrarErro('A câmera foi desconectada. Tente abrir novamente.'),
            { once: true },
          );
        });

        preview.srcObject = stream;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoElement(preview, (result, _error, scanner) => {
          const code = result?.getText().trim();
          if (!code || cancelado || entregue.current || !stream) return;
          entregue.current = true;
          scanner.stop();
          liberarCamera();
          callbacks.current.onScan(code);
          callbacks.current.onClose();
        });

        if (cancelado || entregue.current || !stream) {
          liberarCamera();
          return;
        }
        setCamera({ estado: 'pronta' });
      } catch (error) {
        mostrarErro(mensagemCamera(error));
      }
    }

    void iniciarCamera(video);

    return () => {
      cancelado = true;
      liberarCamera();
    };
  }, [tentativa]);

  function confirmarManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const code = manual.trim();
    if (!code || entregue.current) return;
    entregue.current = true;
    onScan(code);
    onClose();
  }

  function tentarNovamente() {
    setCamera({ estado: 'iniciando' });
    setTentativa((anterior) => anterior + 1);
    if (!window.matchMedia('(pointer: coarse)').matches) manualRef.current?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        // A janela de cadastro pode ter seu próprio controle de foco e de Escape.
        if (event.key === 'Escape' || event.key === 'Tab') event.stopPropagation();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-[#111116] p-5 text-[#FAFAFA] backdrop:bg-black/75"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="text-lg font-semibold">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#A1A1AA] hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#818CF8]"
          aria-label="Fechar leitor"
        >
          ✕
        </button>
      </div>

      <div
        className="relative mt-3 aspect-video overflow-hidden rounded-lg bg-black"
        hidden={camera.estado === 'erro'}
      >
        <video
          key={tentativa}
          ref={videoRef}
          className="h-full w-full object-contain"
          muted
          playsInline
          aria-hidden="true"
        />
        {camera.estado === 'pronta' && (
          <div
            className="pointer-events-none absolute inset-x-[12%] inset-y-[30%] rounded-lg border-2 border-[#818CF8]"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="mt-3 text-sm text-[#D4D4D8]" role="status">
        {camera.estado === 'iniciando' &&
          'Abrindo a câmera. Se o navegador pedir, permita o acesso.'}
        {camera.estado === 'pronta' &&
          'Centralize o código e segure o produto firme até a leitura.'}
        {camera.estado === 'erro' && camera.mensagem}
      </p>
      {camera.estado === 'erro' &&
        window.isSecureContext &&
        typeof navigator.mediaDevices?.getUserMedia === 'function' && (
          <button
            type="button"
            onClick={tentarNovamente}
            className="mt-1 min-h-9 rounded text-sm font-medium text-[#A5B4FC] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#818CF8]"
          >
            Abrir câmera novamente
          </button>
        )}

      <form className="mt-4 border-t border-white/10 pt-4" onSubmit={confirmarManual}>
        <label htmlFor={codeId} className="text-sm font-medium">
          Código de barras
        </label>
        <p id={codeId + '-ajuda'} className="mt-1 text-sm text-[#A1A1AA]">
          Digite o código ou use um leitor USB.
        </p>
        <input
          id={codeId}
          ref={manualRef}
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Ex.: 7891234567890"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#060608] px-3 py-2 text-base text-[#FAFAFA] outline-none focus:ring-2 focus:ring-[#818CF8]"
        />
        <button
          type="submit"
          disabled={!manual.trim()}
          className="mt-3 min-h-11 w-full rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4338CA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#818CF8] disabled:opacity-50"
        >
          Usar código
        </button>
      </form>
    </dialog>
  );
}
