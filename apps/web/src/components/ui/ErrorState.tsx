'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Erro ao carregar dados', onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 text-center">
      <div aria-hidden="true" className="mb-4 text-4xl">
        ⚠
      </div>
      <h3 className="text-[15px] font-semibold" style={{ color: '#FCA5A5' }}>
        {message}
      </h3>
      <p className="mt-1.5 text-[13px]" style={{ color: '#A1A1AA' }}>
        Tente novamente ou recarregue a página
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
