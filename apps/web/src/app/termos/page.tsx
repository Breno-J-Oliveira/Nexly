import { LegalPage } from '@/components/marketing/LegalPage';

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de uso"
      description="Leia as condições de utilização do Nexly antes de continuar."
      sections={[
        {
          title: 'Aceitação dos termos',
          content:
            'O uso da plataforma Nexly está condicionado à aceitação integral destes Termos de Uso e da Política de Privacidade.',
        },
        {
          title: 'Cadastro e responsabilidades',
          content:
            'O usuário é responsável pela veracidade dos dados informados no cadastro e pela segurança de suas credenciais de acesso.',
        },
        {
          title: 'Uso permitido',
          content:
            'O Nexly deve ser utilizado para fins lícitos, sendo vedado o uso para atividades ilegais ou que possam causar danos a terceiros.',
        },
        {
          title: 'Alterações nos termos',
          content: 'Podemos atualizar estes termos. As alterações serão publicadas na plataforma.',
        },
      ]}
    />
  );
}
