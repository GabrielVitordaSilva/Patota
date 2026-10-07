import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const memberGuide = [
  {
    title: 'Confirmar presença',
    steps: [
      'Na tela Início, o bloco verde mostra o próximo jogo, o horário e o local.',
      'Toque em "Vou" ou "Não vou". Dá para trocar a resposta enquanto a lista estiver aberta.',
      'Ao confirmar "Vou", a vaga fica reservada. Falta sem aviso pode gerar multa (veja Regras).',
      'A lista fecha automaticamente antes do jogo. Depois disso os botões ficam desativados.'
    ]
  },
  {
    title: 'Ver os times',
    steps: [
      'Quando a diretoria sorteia, o card "Times sorteados" aparece no Início.',
      'O botão "Compartilhar" envia a escalação para o WhatsApp.'
    ]
  },
  {
    title: 'Pagar mensalidade e multas',
    steps: [
      'Em Financeiro você vê o que está pendente e o histórico.',
      'Copie a chave PIX, faça o pagamento no seu banco e volte para anexar o comprovante.',
      'Depois que o admin conferir, o pagamento passa para "Pago".'
    ]
  },
  {
    title: 'Ranking e Elenco',
    steps: [
      'Ranking mostra a pontuação da temporada.',
      'Elenco mostra os cards dos jogadores. Você pode avaliar os colegas e trocar a sua foto.'
    ]
  },
  {
    title: 'Jogos',
    steps: ['A aba Jogos lista os próximos eventos, quem confirmou e o histórico com placares.']
  }
]

const adminGuide = [
  {
    title: 'Criar e editar jogos',
    steps: [
      'Administração → Eventos → "Criar Novo Evento". Escolha o tipo, a data e hora e o local.',
      'Não há campo de prazo: o sistema fecha as confirmações sozinho (sexta às 18h para jogo de sábado, ou 24h antes nos outros dias).',
      'Use o lápis do card para corrigir data ou local.'
    ]
  },
  {
    title: 'Sortear times e lançar placar',
    steps: [
      'Com a lista fechada, gere os times no card do evento. Dá para resetar e sortear de novo; isso reabre as confirmações por 6 horas.',
      'Depois do jogo, marque quem esteve presente e lance o placar e os gols.',
      'Os pontos do ranking são distribuídos ao salvar o placar.'
    ]
  },
  {
    title: 'Pagamentos e caixa',
    steps: [
      'Pagamentos: abra o comprovante enviado pelo membro e confirme ou rejeite.',
      'Caixa: registre saídas (materiais, campo, confraternização) e acompanhe o saldo.',
      'Dashboard resume entradas, pendências e inadimplentes.'
    ]
  },
  {
    title: 'Membros e ranking',
    steps: [
      'Membros: adicione jogadores, edite posição e valor, ative ou desative. Quem acabou de se cadastrar só entra depois de ativado.',
      'Ranking: use "Ajustar" para somar ou remover pontos em correções.'
    ]
  }
]

function Guide({ items }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((section) => (
        <section key={section.title} className="ui-card p-5">
          <h2 className="ui-title">{section.title}</h2>
          <ol className="mt-3 space-y-2.5">
            {section.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="font-display text-lg font-bold leading-snug text-clay-500 tabular-nums">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

export default function Help() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('member')
  const showAdmin = isAdmin && tab === 'admin'

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
          {[['member', 'Para jogadores'], ['admin', 'Para admins']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-md text-sm font-semibold ${tab === id ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      )}
      <Guide items={showAdmin ? adminGuide : memberGuide} />
      <p className="text-sm text-slate-500">Ficou com dúvida? Fale com a diretoria.</p>
    </div>
  )
}
