'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { featureCatalog } from './marketing/feature-catalog';

/** In-page, optional help: no persistence, navigation, input changes or automatic actions. */
export function ClientesTutorial({ canCreate, paused }: { canCreate: boolean; paused: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const launcher = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const catalog = featureCatalog.find((item) => item.id === 'clientes');
  const steps = [
    {
      title: 'Encontre um cliente',
      text: catalog?.steps[1] ?? 'Encontre um cliente pela busca.',
      target: 'clientes-busca',
      detail: 'Digite o nome no campo Buscar cliente. A ajuda não modifica sua busca.',
    },
    ...(canCreate
      ? [
          {
            title: 'Onde cadastrar',
            text: catalog?.steps[0] ?? 'Cadastre os contatos.',
            target: 'clientes-novo',
            detail:
              'O botão Novo cliente abre o formulário. Abra quando quiser; esta ajuda não cadastra ninguém.',
          },
        ]
      : []),
  ];
  const current = step === null ? null : steps[Math.min(step, steps.length - 1)];
  function close() {
    setStep(null);
    setNotice('');
    launcher.current?.querySelector('button')?.focus();
  }
  function locate() {
    if (!current) return;
    const target = document.querySelector<HTMLElement>(`[data-help="${current.target}"]`);
    if (!target || target.getClientRects().length === 0 || target.matches(':disabled')) {
      setNotice(
        'Este controle não está disponível agora. Você pode encerrar a ajuda e continuar trabalhando.',
      );
      return;
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    setNotice('Controle localizado. Para encerrar a ajuda a qualquer momento, pressione Escape.');
  }
  useEffect(() => {
    if (step === null || paused) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
      setStep(null);
      setNotice('');
      launcher.current?.querySelector('button')?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [step, paused]);
  return (
    <section
      id="ajuda-clientes"
      className="mb-5 scroll-mt-28 rounded-xl border border-indigo-400/20 bg-[#111116] p-4"
      aria-label="Ajuda de clientes"
    >
      <div ref={launcher}>
        <Button
          disabled={paused}
          variant="secondary"
          onClick={() => {
            setStep(0);
            setNotice('');
            requestAnimationFrame(() => heading.current?.focus());
          }}
        >
          {current ? 'Recomeçar ajuda de clientes' : 'Conhecer esta tela'}
        </Button>
      </div>
      {current && !paused && (
        <div className="mt-4">
          <h3 ref={heading} tabIndex={-1} className="text-base font-semibold">
            {current.title}
          </h3>
          <p role="status" className="mt-2 text-sm text-indigo-200">
            Etapa {Math.min(step ?? 0, steps.length - 1) + 1} de {steps.length} · {current.text}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">{current.detail}</p>
          <p className="mt-2 text-sm text-[#A1A1AA]">
            Você pode usar a tela normalmente. Nenhuma informação será salva por esta ajuda.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={locate}>
              <span aria-hidden="true">→ </span>Mostrar controle
            </Button>
            {(step ?? 0) > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setStep((value) => Math.max(0, (value ?? 0) - 1));
                  setNotice('');
                  requestAnimationFrame(() => heading.current?.focus());
                }}
              >
                Voltar na ajuda
              </Button>
            )}
            {(step ?? 0) < steps.length - 1 && (
              <Button
                onClick={() => {
                  setStep((value) => (value ?? 0) + 1);
                  setNotice('');
                  requestAnimationFrame(() => heading.current?.focus());
                }}
              >
                Próxima dica
              </Button>
            )}
            <Button variant="secondary" onClick={close}>
              Encerrar ajuda
            </Button>
          </div>
          <p role="status" className="mt-2 text-sm text-[#A1A1AA]">
            {notice}
          </p>
        </div>
      )}
      {current && paused && (
        <p role="status" className="mt-3 text-sm text-[#A1A1AA]">
          Ajuda pausada enquanto você usa os detalhes ou o formulário.
        </p>
      )}
    </section>
  );
}
