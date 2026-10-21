import Image from 'next/image';

/** A marca usa sempre o arquivo original, sem reconstruir o símbolo em CSS. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 text-[#FAFAFA]">
      <Image
        src="/logo.svg"
        alt=""
        width={compact ? 23 : 30}
        height={compact ? 32 : 42}
        className="shrink-0 object-contain"
      />
      <span
        className={
          compact ? 'text-lg font-semibold tracking-tight' : 'text-xl font-semibold tracking-tight'
        }
      >
        Nexly
      </span>
    </span>
  );
}
