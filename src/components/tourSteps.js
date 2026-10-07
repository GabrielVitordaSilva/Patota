// Passos do guia "Como usar" por tela. alvo = seletor CSS (null = caixa centralizada).
// Passos cujo alvo não existe na tela (ex.: botões só de admin) são pulados.
const comuns = (isAdmin) => [
  ['[data-tour="menu"]', 'Menu principal', 'Visão geral: o próximo jogo é o seu resumo. Jogos: agenda e histórico. Financeiro: mensalidades e multas. Ranking: pontuação da temporada. Elenco: cards dos jogadores.' + (isAdmin ? ' Administração: eventos, pagamentos, caixa, membros e ranking.' : '')],
  ['[data-tour="regras"]', 'Regras', 'Abre as regras da patota: valores de mensalidade, multas e como os pontos são contados.'],
  ['[data-tour="notificacoes"]', 'Notificações', 'O sino avisa quando há um novo jogo ou evento, uma nova mensalidade, uma multa ou a resposta do admin ao seu comprovante. O número vermelho mostra quantas você ainda não leu; ao tocar em uma, você vai direto para a tela certa. Dentro do sino, o botão "Ativar avisos" faz as notificações chegarem no celular mesmo com o app fechado. No iPhone, isso só funciona com o app instalado na Tela de Início.'],
  ['[data-tour="perfil"]', 'Sua conta', 'Mostra quem está logado. O ícone de seta encerra a sessão.'],
  ['[data-tour="ajuda"]', 'Guia sempre à mão', 'Cada tela tem o seu guia. Clique em Como usar sempre que quiser rever. ']
]

export function getSteps(pathname, isAdmin) {
  const c = comuns(isAdmin)
  switch (pathname) {
    case '/':
      return [
        [null, 'Como usar a Patota', 'Esta tela reúne o próximo jogo, a sua presença e a sua situação financeira. O guia leva menos de um minuto.'],
        ['[data-tour="kpis"]', 'Resumo em quatro números', 'Quando é o próximo jogo, quantos jogadores já confirmaram, quanto você tem pendente e qual é o seu status.'],
        ['[data-tour="jogo"]', 'Seus eventos', 'Cada jogo ou evento interno agendado ganha o seu próprio card, com dia, horário e local. Enquanto a lista estiver aberta, o selo "Lista aberta" aparece no canto. Responda em cada um separadamente.'],
        ['[data-tour="confirmar"]', 'Confirmar presença', 'Em cada evento, toque em "Vou" ou "Não vou". Você pode trocar a resposta enquanto a lista estiver aberta. Falta sem aviso pode gerar multa (veja Regras). A lista fecha automaticamente antes do jogo.'],
        ['[data-tour="times"]', 'Times sorteados', 'Quando a diretoria sorteia, a escalação aparece aqui. O botão Compartilhar envia para o WhatsApp.'],
        ['[data-tour="financeiro"]', 'Financeiro', 'Mostra o que está pendente. Se houver valor em aberto, copie a chave PIX por aqui e anexe o comprovante em Financeiro.'],
        ...c
      ]
    case '/events':
      return [
        [null, 'Jogos', 'Lista os próximos eventos e o histórico, com quem confirmou e os placares.'],
        ['[data-tour="eventos"]', 'Eventos', 'Cada card mostra tipo, data, local e quantos confirmaram. Jogos já realizados mostram o placar e quem jogou em cada time (preto e branco).'],
        ...c
      ]
    case '/finance':
      return [
        [null, 'Financeiro', 'Aqui você acompanha suas mensalidades e multas e envia comprovantes.'],
        ['[data-tour="pendencias"]', 'O que está pendente', 'Mensalidades e multas em aberto, com valor e vencimento.'],
        ['[data-tour="pagar"]', 'Como pagar', 'Copie a chave PIX, pague no seu banco e anexe o comprovante. Depois que o admin conferir, o pagamento passa para "Pago".'],
        ['[data-tour="historico"]', 'Histórico', 'Tudo que já foi pago ou está aguardando conferência.'],
        ...c
      ]
    case '/ranking':
      return [
        [null, 'Ranking', 'A pontuação da temporada, somando gols e resultados.'],
        ['[data-tour="ranking"]', 'Classificação', 'Os três primeiros ficam destacados. A lista é ordenada por pontos.'],
        ...c
      ]
    case '/cards':
      return [
        [null, 'Elenco', 'Os cards dos jogadores da patota.'],
        ['[data-tour="cards"]', 'Cards', 'Mostram posição, nota geral e atributos. Você pode avaliar os colegas e trocar a sua foto.'],
        ...c
      ]
    case '/admin':
      return [
        [null, 'Painel de administração', 'Daqui a diretoria cuida de eventos, pagamentos, caixa, membros e ranking.'],
        ['[data-tour="admin-dashboard"]', 'Dashboard', 'Resumo financeiro: entradas, pendências e quem está devendo.'],
        ['[data-tour="admin-events"]', 'Eventos', 'Crie jogos (data, hora e local). O prazo de confirmação é automático. Com a lista fechada, sorteie os times; depois do jogo, marque presenças e lance o placar e os gols. Resetar os times reabre as confirmações por 6 horas.'],
        ['[data-tour="admin-ranking"]', 'Ranking', 'Use "Ajustar" para somar ou remover pontos em correções, sempre com observação.'],
        ['[data-tour="admin-caixa"]', 'Caixa', 'Registre saídas (materiais, campo, confraternização) e acompanhe o saldo.'],
        ['[data-tour="admin-members"]', 'Membros', 'Adicione jogadores, edite posição e valor, ative ou desative. Quem acabou de se cadastrar só entra depois de ativado.'],
        ['[data-tour="admin-payments"]', 'Pagamentos', 'Abra o comprovante enviado pelo membro e confirme ou rejeite. Ao rejeitar, o motivo que você escrever aparece para o membro na tela Financeiro, e ele pode enviar outro comprovante.'],
        ['[data-tour="admin-fines"]', 'Multas', 'Veja todas as multas. Gerou uma sem querer? Edite o valor ou o tipo, ou exclua. Multas já pagas ficam bloqueadas.'],
        ...c
      ]
    default:
      return c
  }
}
