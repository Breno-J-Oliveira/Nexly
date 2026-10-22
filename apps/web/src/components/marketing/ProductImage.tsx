import Image from 'next/image';

/** Capturas da aplicação com dados fictícios, sem expor dados de clientes. */
export function ProductImage({
  screen,
  alt,
  priority = false,
  compact = false,
}: {
  screen: string;
  alt: string;
  priority?: boolean;
  compact?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#111116]">
      <Image
        src={`/images/product/${screen}-demo.webp`}
        alt={alt}
        width={1440}
        height={900}
        priority={priority}
        sizes={compact ? '(max-width: 768px) 100vw, 380px' : '(max-width: 1024px) 100vw, 1120px'}
        className="h-auto w-full"
      />
      <figcaption className="border-t border-white/[0.06] px-4 py-3 text-center text-[11px] leading-5 text-[#A1A1AA]">
        Nexly em uso · dados de demonstração
      </figcaption>
    </figure>
  );
}
