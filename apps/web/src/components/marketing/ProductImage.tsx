import Image, { type StaticImageData } from 'next/image';
import dashboard from '../../../public/images/product/dashboard-atual.webp';
import agenda from '../../../public/images/product/agenda-atual.webp';
import clientes from '../../../public/images/product/clientes-atual.webp';
import estoque from '../../../public/images/product/estoque-atual.webp';
import pdv from '../../../public/images/product/pdv-atual.webp';
import relatorios from '../../../public/images/product/relatorios-atual.webp';

const screenshots: Record<string, StaticImageData> = {
  dashboard,
  agenda,
  clientes,
  estoque,
  pdv,
  relatorios,
};

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
  const screenshot = screenshots[screen];
  if (!screenshot) throw new Error(`Captura do Nexly não encontrada: ${screen}`);

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-[#111116]">
      <Image
        src={screenshot}
        alt={alt}
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
