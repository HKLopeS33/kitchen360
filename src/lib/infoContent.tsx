import type { ReactNode } from 'react';

export interface InfoPageContent {
  title: string;
  subtitle: string;
  body: ReactNode;
}

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-lg font-black text-[#1a1a1a] mt-6 mb-2">{children}</h2>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-[#555] leading-relaxed mb-2">{children}</p>
);
const Li = ({ children }: { children: ReactNode }) => (
  <li className="text-sm text-[#555] leading-relaxed mb-1.5 ml-4 list-disc">{children}</li>
);

export const INFO_PAGES: Record<string, InfoPageContent> = {
  privacidade: {
    title: 'Política de Privacidade',
    subtitle: 'Última atualização: junho de 2026',
    body: (
      <>
        <P>
          O <strong>Floresta Já</strong> ("nós", "nosso" ou "app") respeita a sua privacidade e está
          comprometido em proteger os dados pessoais dos seus usuários, em conformidade com a
          <strong> Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</strong>. Esta política
          explica quais informações coletamos, como as usamos e quais são os seus direitos.
        </P>

        <SectionTitle>1. Quais dados coletamos</SectionTitle>
        <ul>
          <Li><strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada).</Li>
          <Li><strong>Dados de entrega:</strong> endereço completo, telefone/WhatsApp.</Li>
          <Li><strong>Dados de pedidos:</strong> itens comprados, valores, observações e histórico de compras.</Li>
          <Li><strong>Dados de pagamento:</strong> processados diretamente pelo Mercado Pago — não armazenamos número de cartão ou dados sensíveis de pagamento em nossos servidores.</Li>
          <Li><strong>Dados de estabelecimentos parceiros:</strong> nome do negócio, categoria, horário de funcionamento, fotos e informações de contato.</Li>
        </ul>

        <SectionTitle>2. Como usamos seus dados</SectionTitle>
        <ul>
          <Li>Processar e entregar seus pedidos aos estabelecimentos parceiros;</Li>
          <Li>Viabilizar a comunicação entre cliente, estabelecimento e entregador;</Li>
          <Li>Processar pagamentos com segurança através do Mercado Pago;</Li>
          <Li>Enviar notificações sobre o status do seu pedido;</Li>
          <Li>Melhorar a experiência de uso do aplicativo.</Li>
        </ul>

        <SectionTitle>3. Com quem compartilhamos seus dados</SectionTitle>
        <P>Compartilhamos apenas o necessário, e somente com:</P>
        <ul>
          <Li><strong>Estabelecimentos parceiros</strong> — recebem nome, endereço de entrega, telefone e itens do pedido para realizar a entrega;</Li>
          <Li><strong>Mercado Pago</strong> — processa os pagamentos de forma segura e independente;</Li>
          <Li><strong>Supabase</strong> — nosso provedor de banco de dados e autenticação, responsável pelo armazenamento seguro das informações.</Li>
        </ul>
        <P>Nunca vendemos seus dados pessoais a terceiros.</P>

        <SectionTitle>4. Seus direitos (LGPD)</SectionTitle>
        <P>Você pode, a qualquer momento:</P>
        <ul>
          <Li>Acessar, corrigir ou atualizar seus dados pela tela "Meus Dados";</Li>
          <Li>Solicitar a exclusão da sua conta e dos seus dados pessoais;</Li>
          <Li>Solicitar uma cópia dos dados que mantemos sobre você;</Li>
          <Li>Revogar consentimentos dados anteriormente.</Li>
        </ul>
        <P>Para exercer esses direitos, entre em contato pelo e-mail <strong>contatoflorestaja@hotmail.com</strong>.</P>

        <SectionTitle>5. Segurança</SectionTitle>
        <P>
          Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não
          autorizados, perda, alteração ou divulgação indevida, incluindo criptografia de senhas e
          conexões seguras (HTTPS).
        </P>

        <SectionTitle>6. Alterações nesta política</SectionTitle>
        <P>
          Podemos atualizar esta Política de Privacidade periodicamente. Mudanças significativas
          serão comunicadas dentro do app.
        </P>

        <SectionTitle>7. Contato</SectionTitle>
        <P>
          Dúvidas sobre privacidade e proteção de dados? Fale conosco em
          <strong> contatoflorestaja@hotmail.com</strong>.
        </P>
      </>
    ),
  },

  ajuda: {
    title: 'Central de Ajuda',
    subtitle: 'Tire suas dúvidas sobre o Floresta Já',
    body: (
      <>
        <SectionTitle>Como faço um pedido?</SectionTitle>
        <P>
          Escolha um estabelecimento na tela inicial, selecione os itens desejados, adicione ao
          carrinho e finalize informando o endereço de entrega e a forma de pagamento.
        </P>

        <SectionTitle>Quais formas de pagamento são aceitas?</SectionTitle>
        <P>
          Aceitamos PIX, cartão de crédito e cartão de débito, processados com segurança através do
          Mercado Pago.
        </P>

        <SectionTitle>Como acompanho meu pedido?</SectionTitle>
        <P>
          Depois de confirmar o pagamento, você pode acompanhar o status do pedido em tempo real na
          seção "Meus Pedidos" — da confirmação até a entrega.
        </P>

        <SectionTitle>Posso cancelar um pedido?</SectionTitle>
        <P>
          Pedidos só podem ser cancelados pelo estabelecimento enquanto estiverem nos status
          "Aguardando" ou "Preparando". Em caso de dúvidas, entre em contato diretamente com o
          estabelecimento pelo telefone informado no perfil dele.
        </P>

        <SectionTitle>Esqueci minha senha, e agora?</SectionTitle>
        <P>
          Na tela de login, utilize a opção de recuperação de senha informando o e-mail cadastrado.
        </P>

        <SectionTitle>Não encontrou o que procurava?</SectionTitle>
        <P>
          Fale com a nossa equipe de suporte pelo e-mail <strong>contatoflorestaja@hotmail.com</strong> ou
          pelo WhatsApp <strong>(87) 99971-0850</strong>. Respondemos em horário comercial, de
          segunda a sábado.
        </P>
      </>
    ),
  },

  suporte: {
    title: 'Fale Conosco',
    subtitle: 'Estamos aqui para ajudar você',
    body: (
      <>
        <P>
          Precisa de ajuda com um pedido, sua conta ou tem alguma sugestão? Nossa equipe de suporte
          está pronta para te atender.
        </P>
        <SectionTitle>Canais de atendimento</SectionTitle>
        <ul>
          <Li><strong>E-mail:</strong> contatoflorestaja@hotmail.com</Li>
          <Li><strong>WhatsApp:</strong> (87) 99971-0850</Li>
          <Li><strong>Horário de atendimento:</strong> Segunda a sábado, das 8h às 18h</Li>
        </ul>
        <SectionTitle>Antes de entrar em contato</SectionTitle>
        <P>
          Para agilizar o seu atendimento, tenha em mãos o número do seu pedido (disponível em
          "Meus Pedidos") e descreva o problema com o máximo de detalhes possível.
        </P>
        <SectionTitle>Problemas com pagamento</SectionTitle>
        <P>
          Questões relacionadas a cobranças e estornos são processadas pelo Mercado Pago. Caso
          tenha algum problema, podemos te ajudar a abrir uma solicitação junto a eles.
        </P>
      </>
    ),
  },

  parcerias: {
    title: 'Parcerias',
    subtitle: 'Cadastre seu estabelecimento no Floresta Já',
    body: (
      <>
        <P>
          Tem um restaurante, mercado, loja de conveniência ou farmácia em Floresta - PE? Junte-se
          ao Floresta Já e alcance ainda mais clientes na sua região!
        </P>
        <SectionTitle>Vantagens de ser parceiro</SectionTitle>
        <ul>
          <Li>Visibilidade para milhares de clientes locais;</Li>
          <Li>Painel completo para gerenciar cardápio, pedidos e horários de funcionamento;</Li>
          <Li>Recebimento de pagamentos de forma segura e automática via Mercado Pago;</Li>
          <Li>Sem mensalidade fixa — comece a vender sem complicação.</Li>
        </ul>
        <SectionTitle>Como se tornar parceiro</SectionTitle>
        <P>
          É simples: crie uma conta como "Estabelecimento" na tela de cadastro do app, preencha as
          informações do seu negócio e comece a publicar seu cardápio. Nossa equipe pode te ajudar
          em todo o processo.
        </P>
        <SectionTitle>Fale com nosso time comercial</SectionTitle>
        <P>
          E-mail: <strong>contatoflorestaja@hotmail.com</strong> · WhatsApp: <strong>(87) 99971-0850</strong>
        </P>
      </>
    ),
  },

  'trabalhe-conosco': {
    title: 'Trabalhe Conosco',
    subtitle: 'Faça parte do time Floresta Já',
    body: (
      <>
        <P>
          Estamos sempre em busca de pessoas apaixonadas por tecnologia, gastronomia e por levar o
          melhor de Floresta - PE até a porta de cada cliente.
        </P>
        <SectionTitle>Oportunidades</SectionTitle>
        <ul>
          <Li><strong>Entregadores parceiros:</strong> tenha flexibilidade de horários e ganhe entregando pela sua cidade;</Li>
          <Li><strong>Atendimento ao cliente:</strong> ajude nossos usuários a terem a melhor experiência possível;</Li>
          <Li><strong>Tecnologia:</strong> times de desenvolvimento, design e produto para evoluir o app continuamente.</Li>
        </ul>
        <SectionTitle>Como se candidatar</SectionTitle>
        <P>
          Envie seu currículo (ou uma breve apresentação, no caso de entregadores) para
          <strong> contatoflorestaja@hotmail.com</strong>, informando a vaga de interesse no
          assunto do e-mail.
        </P>
      </>
    ),
  },

  'politica-assinatura': {
    title: 'Política de uso e assinatura',
    subtitle: 'Como funciona o acesso de estabelecimentos à plataforma Floresta Já',
    body: (
      <>
        <P>
          Para manter o Floresta Já no ar — servidores, suporte, melhorias contínuas e
          divulgação para novos clientes — cada estabelecimento parceiro contribui com
          uma <strong>mensalidade única</strong>, com o mesmo valor para todos, definida
          pela administração da plataforma.
        </P>

        <SectionTitle>Período de teste gratuito (15 dias)</SectionTitle>
        <P>
          Ao cadastrar seu estabelecimento, você ganha automaticamente <strong>15 dias
          grátis</strong> para conhecer a plataforma: cadastre seus produtos, configure
          horários de funcionamento, formas de pagamento e realize vendas reais de teste,
          sem qualquer cobrança nesse período.
        </P>

        <SectionTitle>Como funciona a mensalidade</SectionTitle>
        <ul>
          <Li>O valor é <strong>igual para todos os estabelecimentos</strong>, sem planos diferenciados.</Li>
          <Li>Após o período de teste, a continuidade do acesso à plataforma depende do pagamento da mensalidade vigente.</Li>
          <Li>O pagamento é processado/registrado pela administração da plataforma — em caso de dúvidas sobre como pagar, entre em contato pelo WhatsApp <strong>(87) 99971-0850</strong>.</Li>
          <Li>Estabelecimentos com mensalidade em atraso podem ter o acesso suspenso temporariamente até a regularização.</Li>
        </ul>

        <SectionTitle>O que está incluso</SectionTitle>
        <ul>
          <Li>Página própria do seu estabelecimento dentro do app, com cardápio, fotos, horários e formas de contato.</Li>
          <Li>Recebimento de pedidos em tempo real, com pagamento online via Pix, crédito ou débito.</Li>
          <Li>Link exclusivo da sua loja para compartilhar com seus clientes.</Li>
          <Li>Painel de gestão para controlar produtos, pedidos e disponibilidade.</Li>
        </ul>

        <SectionTitle>Cancelamento</SectionTitle>
        <P>
          Você pode encerrar sua participação na plataforma a qualquer momento, bastando
          entrar em contato pelos canais de suporte. Não há fidelidade ou multa por
          cancelamento.
        </P>

        <P>
          Ao cadastrar seu estabelecimento, você declara estar ciente e de acordo com
          esta política de uso e assinatura.
        </P>
      </>
    ),
  },
};
