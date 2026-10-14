import Link from 'next/link';
import Image from 'next/image';


export default function TermosPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060608] px-4 py-10" >

      <main className="w-full max-w-[560px] rounded-xl border border-white/5 bg-[#111116] p-6 sm:p-8">
        <div className="mb-6 flex justify-center"><Image src="/logo.svg" alt="Nexly" width={32} height={40} /></div>
        <h1 className="text-center text-xl font-semibold uppercase" style={{ color: '#FAFAFA' }}>Termos de Uso</h1>
        <p className="mt-3 text-center text-xs" style={{ color: '#A1A1AA' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="mt-6 max-h-[50vh] space-y-5 overflow-y-auto rounded-lg border border-white/5 bg-[#18181F] p-4 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>
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
        <Link href="/" className="mt-6 block rounded-lg bg-[#6366F1] py-3 text-center text-sm font-medium text-white" >Voltar para o início</Link>
      </main>

    </div>
  );
}
