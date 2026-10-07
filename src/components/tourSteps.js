// Passos do guia "Como usar" por tela. alvo = seletor CSS (null = caixa centralizada).
// Passos cujo alvo nao existe na tela (ex.: botoes so de admin) sao pulados.
const comuns = (isAdmin) => [
  ['[data-tour="menu"]', 'Menu principal', 'Visao geral: o proximo jogo e o seu resumo. Jogos: agenda e historico. Financeiro: mensalidades e multas. Ranking: pontuacao da temporada. Elenco: cards dos jogadores. Regras: valores e pontuacao.' + (isAdmin ? ' Administracao: eventos, pagamentos, caixa, membros e ranking.' : '')],
  ['[data-tour="perfil"]', 'Sua conta', 'Mostra quem esta logado. O icone de seta encerra a sessao.'],
  ['[data-tour="ajuda"]', 'Guia sempre a mao', 'Cada tela tem o seu guia. Clique em Como usar sempre que quiser rever. O botao ao lado troca entre tema claro e escuro.']
]

export function getSteps(pathname, isAdmin) {
  const c = comuns(isAdmin)
  switch (pathname) {
    case '/':
      return [
        [null, 'Como usar a Patota', 'Esta tela reune o proximo jogo, a sua presenca e a sua situacao financeira. O guia leva menos de um minuto.'],
        ['[data-tour="kpis"]', 'Resumo em quatro numeros', 'Quando e o proximo jogo, quantos jogadores ja confirmaram, quanto voce tem pendente e qual e o seu status.'],
        ['[data-tour="jogo"]', 'Proximo jogo', 'Dia, horario e local. Enquanto a lista estiver aberta, o selo "Lista aberta" aparece no canto.'],
        ['[data-tour="confirmar"]', 'Confirmar presenca', 'Toque em "Vou" ou "Nao vou". Voce pode trocar a resposta enquanto a lista estiver aberta. Falta sem aviso pode gerar multa (veja Regras). A lista fecha automaticamente antes do jogo.'],
        ['[data-tour="times"]', 'Times sorteados', 'Quando a diretoria sorteia, a escalacao aparece aqui. O botao Compartilhar envia para o WhatsApp.'],
        ['[data-tour="financeiro"]', 'Financeiro', 'Mostra o que esta pendente. Se houver valor em aberto, copie a chave PIX por aqui e anexe o comprovante em Financeiro.'],
        ...c
      ]
    case '/events':
      return [
        [null, 'Jogos', 'Lista os proximos eventos e o historico, com quem confirmou e os placares.'],
        ['[data-tour="eventos"]', 'Eventos', 'Cada card mostra tipo, data, local e quantos confirmaram. Jogos ja realizados mostram o placar.'],
        ...c
      ]
    case '/finance':
      return [
        [null, 'Financeiro', 'Aqui voce acompanha suas mensalidades e multas e envia comprovantes.'],
        ['[data-tour="pendencias"]', 'O que esta pendente', 'Mensalidades e multas em aberto, com valor e vencimento.'],
        ['[data-tour="pagar"]', 'Como pagar', 'Copie a chave PIX, pague no seu banco e anexe o comprovante. Depois que o admin conferir, o pagamento passa para "Pago".'],
        ['[data-tour="historico"]', 'Historico', 'Tudo que ja foi pago ou esta aguardando conferencia.'],
        ...c
      ]
    case '/ranking':
      return [
        [null, 'Ranking', 'A pontuacao da temporada, somando gols e resultados.'],
        ['[data-tour="ranking"]', 'Classificacao', 'Os tres primeiros ficam destacados. Use as abas para trocar o criterio, quando houver.'],
        ...c
      ]
    case '/cards':
      return [
        [null, 'Elenco', 'Os cards dos jogadores da patota.'],
        ['[data-tour="cards"]', 'Cards', 'Mostram posicao, nota geral e atributos. Voce pode avaliar os colegas e trocar a sua foto.'],
        ...c
      ]
    case '/rules':
      return [
        [null, 'Regras', 'Valores de mensalidade, multas e como os pontos sao contados.'],
        ...c
      ]
    case '/admin':
      return [
        [null, 'Painel de administracao', 'Daqui a diretoria cuida de eventos, pagamentos, caixa, membros e ranking.'],
        ['[data-tour="admin-dashboard"]', 'Dashboard', 'Resumo financeiro: entradas, pendencias e quem esta devendo.'],
        ['[data-tour="admin-events"]', 'Eventos', 'Crie jogos (data, hora e local). O prazo de confirmacao e automatico. Com a lista fechada, sorteie os times; depois do jogo, marque presencas e lance o placar e os gols. Resetar os times reabre as confirmacoes por 6 horas.'],
        ['[data-tour="admin-ranking"]', 'Ranking', 'Use "Ajustar" para somar ou remover pontos em correcoes, sempre com observacao.'],
        ['[data-tour="admin-caixa"]', 'Caixa', 'Registre saidas (materiais, campo, confraternizacao) e acompanhe o saldo.'],
        ['[data-tour="admin-members"]', 'Membros', 'Adicione jogadores, edite posicao e valor, ative ou desative. Quem acabou de se cadastrar so entra depois de ativado.'],
        ['[data-tour="admin-payments"]', 'Pagamentos', 'Abra o comprovante enviado pelo membro e confirme ou rejeite.'],
        ...c
      ]
    default:
      return c
  }
}
