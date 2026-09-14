import Link from 'next/link';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <h1 className="text-3xl font-bold" style={{ color: '#FAFAFA' }}>Política de Privacidade</h1>
        <p className="mt-4 text-[14px]" style={{ color: '#A1A1AA' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
          <p>O Nexly valoriza a privacidade dos seus dados. Esta política descreve como coletamos, usamos e protegemos suas informações.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>1. Dados coletados</h2>
          <p>Coletamos informações fornecidas no cadastro, como nome, e-mail, CNPJ e dados do negócio, além de dados de uso da plataforma.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>2. Uso dos dados</h2>
          <p>Utilizamos os dados para operação da plataforma, suporte ao cliente, melhorias no serviço e comunicações importantes.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>3. Proteção</h2>
          <p>Adotamos medidas de segurança técnicas e administrativas para proteger suas informações contra acessos não autorizados.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>4. Seus direitos</h2>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato conosco.</p>
        </div>
        <Link href="/" className="mt-10 inline-block text-[14px] font-medium hover:underline" style={{ color: '#818CF8' }}>Voltar para o início</Link>
      </main>
      <LandingFooter />
    </div>
  );
}
