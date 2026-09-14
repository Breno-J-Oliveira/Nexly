import Link from 'next/link';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

export default function TermosPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <h1 className="text-3xl font-bold" style={{ color: '#FAFAFA' }}>Termos de Uso</h1>
        <p className="mt-4 text-[14px]" style={{ color: '#A1A1AA' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
          <p>Ao utilizar o Nexly, você concorda com os termos descritos abaixo. Leia atentamente antes de continuar.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>1. Aceitação dos termos</h2>
          <p>O uso da plataforma Nexly está condicionado à aceitação integral destes Termos de Uso e da Política de Privacidade.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>2. Cadastro e responsabilidades</h2>
          <p>O usuário é responsável pela veracidade dos dados informados no cadastro e pela segurança de suas credenciais de acesso.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>3. Uso permitido</h2>
          <p>O Nexly deve ser utilizado para fins lícitos, sendo vedado o uso para atividades ilegais ou que possam causar danos a terceiros.</p>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>4. Alterações nos termos</h2>
          <p>Podemos atualizar estes termos a qualquer momento. As alterações entrarão em vigor após a publicação na plataforma.</p>
        </div>
        <Link href="/" className="mt-10 inline-block text-[14px] font-medium hover:underline" style={{ color: '#818CF8' }}>Voltar para o início</Link>
      </main>
      <LandingFooter />
    </div>
  );
}
