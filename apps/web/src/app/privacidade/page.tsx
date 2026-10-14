import Link from 'next/link';
import Image from 'next/image';


export default function PrivacidadePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060608] px-4 py-10" >

      <main className="w-full max-w-[560px] rounded-xl border border-white/5 bg-[#111116] p-6 sm:p-8">
        <div className="mb-6 flex justify-center"><Image src="/logo.svg" alt="Nexly" width={32} height={40} /></div>
        <h1 className="text-center text-xl font-semibold uppercase" style={{ color: '#FAFAFA' }}>Política de Privacidade</h1>
        <p className="mt-3 text-center text-xs" style={{ color: '#A1A1AA' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="mt-6 max-h-[50vh] space-y-5 overflow-y-auto rounded-lg border border-white/5 bg-[#18181F] p-4 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>
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
        <Link href="/" className="mt-6 block rounded-lg bg-[#6366F1] py-3 text-center text-sm font-medium text-white" >Voltar para o início</Link>
      </main>

    </div>
  );
}
