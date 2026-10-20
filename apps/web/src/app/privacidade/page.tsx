import Link from 'next/link';
import { LegalPage } from '@/components/marketing/LegalPage';

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de privacidade"
      description="Entenda como suas informações são utilizadas e encontre os caminhos para exercer seus direitos."
      sections={[
        {
          title: 'Dados coletados',
          content:
            'Coletamos informações fornecidas no cadastro, como nome, e-mail, CNPJ e dados do negócio, além de dados de uso da plataforma.',
        },
        {
          title: 'Uso dos dados',
          content:
            'Utilizamos os dados para operação da plataforma, suporte ao cliente, melhorias no serviço e comunicações importantes.',
        },
        {
          title: 'Proteção',
          content:
            'Adotamos medidas de segurança técnicas e administrativas para proteger suas informações contra acessos não autorizados.',
        },
        {
          title: 'Seus direitos',
          content: (
            <>
              Você pode solicitar acesso, correção ou exclusão dos seus dados entrando em contato
              pela nossa{' '}
              <Link href="/suporte" className="rounded text-[#C7C5FF] underline underline-offset-4">
                página de suporte
              </Link>
              .
            </>
          ),
        },
      ]}
    />
  );
}
