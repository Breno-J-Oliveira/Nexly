'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Erro ao carregar dados', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-4xl">⚠</div>
      <h3 className="text-[15px] font-semibold" style={{ color: '#EF4444' }}>
        {message}
      </h3>
      <p className="mt-1.5 text-[13px]" style={{ color: '#71717A' }}>
        Tente novamente ou recarregue a pagina
      </p>
      {onRetry && (
        <button
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
