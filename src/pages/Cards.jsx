import { useEffect, useMemo, useRef, useState } from 'react'
import { User, Star, Camera, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { cardsService, STAT_LABELS } from '../services/cards'

const NOTA_PADRAO = 70

// Cor da nota por faixa, estilo FIFA (verde alto -> vermelho baixo)
const statColor = (valor) => {
  if (valor == null) return 'text-white/40'
  if (valor >= 85) return 'text-emerald-400'
  if (valor >= 75) return 'text-lime-400'
  if (valor >= 65) return 'text-yellow-400'
  if (valor >= 50) return 'text-orange-400'
  return 'text-red-400'
}

export default function Cards() {
  const { member, isAdmin } = useAuth()
  const [members, setMembers] = useState([])
  const [ratings, setRatings] = useState([])
  const [photoUrls, setPhotoUrls] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [ratingTarget, setRatingTarget] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploadTarget, setUploadTarget] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { members: membersData, ratings: ratingsData, error } = await cardsService.getPlayerCards()

      if (error) {
        setLoadError(
          `Erro ao carregar cards: ${error.message}. Verifique se a migracao supabase-add-player-cards.sql foi executada no Supabase.`
        )
      }

      setMembers(membersData)
      setRatings(ratingsData)
      setPhotoUrls(await cardsService.getPhotoUrls(membersData))
    } catch (error) {
      console.error('Error loading cards:', error)
      setLoadError('Erro ao carregar os cards.')
    } finally {
      setLoading(false)
    }
  }

  const cards = useMemo(() => {
    return members
      .map((m) => {
        const recebidas = ratings.filter((r) => r.rated_member_id === m.id)
        const stats = {}
        STAT_LABELS.forEach(({ key }) => {
          stats[key] = recebidas.length
            ? Math.round(recebidas.reduce((sum, r) => sum + r[key], 0) / recebidas.length)
            : null
        })
        const overall = recebidas.length
          ? Math.round(STAT_LABELS.reduce((sum, { key }) => sum + stats[key], 0) / STAT_LABELS.length)
          : null
        const minhaAvaliacao = ratings.find(
          (r) => r.rated_member_id === m.id && r.rater_member_id === member?.id
        )

        return { ...m, stats, overall, avaliacoes: recebidas.length, minhaAvaliacao }
      })
      .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1) || a.nome.localeCompare(b.nome))
  }, [members, ratings, member])

  const openRating = (card) => {
    const inicial = {}
    STAT_LABELS.forEach(({ key }) => {
      inicial[key] = card.minhaAvaliacao?.[key] ?? NOTA_PADRAO
    })
    setForm(inicial)
    setRatingTarget(card)
  }

  const handleSaveRating = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await cardsService.rateMember(member.id, ratingTarget.id, form)
      if (error) throw error

      setRatingTarget(null)
      await loadCards()
    } catch (error) {
      alert(`Erro ao salvar avaliacao: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const openPhotoPicker = (card) => {
    setUploadTarget(card)
    fileInputRef.current?.click()
  }

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uploadTarget) return

    if (file.size > 5 * 1024 * 1024) {
      alert('A foto deve ter no maximo 5MB.')
      return
    }

    setUploading(true)
    try {
      const { error } = await cardsService.uploadPhoto(uploadTarget.id, file)
      if (error) throw error

      await loadCards()
    } catch (error) {
      alert(`Erro ao enviar foto: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setUploading(false)
      setUploadTarget(null)
    }
  }

  if (loading) return <div className="text-center py-12">Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Cards dos Jogadores</h1>

      {loadError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Como funciona:</strong> as notas do card sao a media das avaliacoes de toda a patota. Toque em
          "Avaliar" para dar (ou atualizar) a sua nota para cada jogador. Voce pode colocar a sua foto no seu card.
        </p>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelected} className="hidden" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isGoleiro = card.posicao === 'GOLEIRO'
          const isMe = card.id === member?.id

          return (
            <div key={card.id} className="space-y-2">
              <div
                className={`relative overflow-hidden rounded-2xl p-4 pt-5 text-white shadow-xl ring-1 ring-white/10 bg-gradient-to-br ${
                  isGoleiro
                    ? 'from-blue-600 via-blue-900 to-slate-950'
                    : 'from-slate-600 via-gray-900 to-black'
                }`}
              >
                {/* Brilho diagonal de fundo */}
                <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

                {/* Topo: overall + foto + posicao */}
                <div className="relative flex items-start gap-3">
                  <div className="shrink-0 text-center">
                    <p className="text-5xl font-black leading-none tracking-tight bg-gradient-to-b from-yellow-200 to-yellow-400 bg-clip-text text-transparent drop-shadow">
                      {card.overall ?? '--'}
                    </p>
                    <span className="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-widest bg-white/15">
                      {isGoleiro ? 'GOL' : 'LIN'}
                    </span>
                  </div>

                  <div className="flex-1 flex justify-center">
                    {photoUrls[card.id] ? (
                      <img
                        src={photoUrls[card.id]}
                        alt={card.nome}
                        className="w-24 h-24 rounded-full object-cover border-2 border-white/50 shadow-lg ring-2 ring-yellow-400/30"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/40 bg-white/5 flex items-center justify-center">
                        <User size={52} className="opacity-50" />
                      </div>
                    )}
                  </div>

                  <div className="w-10 shrink-0" />
                </div>

                {/* Nome */}
                <p className="relative mt-3 text-center font-extrabold text-lg uppercase tracking-wide truncate">
                  {card.nome}
                </p>

                <div className="relative my-3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Estatisticas: valor colado na sigla */}
                <div className="relative grid grid-cols-2 gap-x-4 gap-y-2">
                  {STAT_LABELS.map(({ key, sigla }) => (
                    <div
                      key={key}
                      className="flex items-baseline gap-2 rounded-lg bg-white/5 px-3 py-1.5"
                    >
                      <span className={`text-xl font-black tabular-nums ${statColor(card.stats[key])}`}>
                        {card.stats[key] ?? '--'}
                      </span>
                      <span className="text-xs font-bold tracking-widest text-white/60">{sigla}</span>
                    </div>
                  ))}
                </div>

                <p className="relative text-[10px] text-center text-white/50 mt-3">
                  {card.avaliacoes === 0
                    ? 'Ainda sem avaliacoes'
                    : `Media de ${card.avaliacoes} avaliacao${card.avaliacoes > 1 ? 'es' : ''}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!isMe ? (
                  <button onClick={() => openRating(card)} className="ui-btn-primary text-xs md:text-sm">
                    <Star size={14} className="inline mr-1" />
                    {card.minhaAvaliacao ? 'Reavaliar' : 'Avaliar'}
                  </button>
                ) : (
                  <span className="ui-btn-secondary text-xs md:text-sm text-center opacity-60 cursor-default">
                    Seu card
                  </span>
                )}

                {(isMe || isAdmin) && (
                  <button
                    onClick={() => openPhotoPicker(card)}
                    disabled={uploading}
                    className="ui-btn-secondary text-xs md:text-sm"
                  >
                    <Camera size={14} className="inline mr-1" />
                    {uploading && uploadTarget?.id === card.id ? 'Enviando...' : 'Foto'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {ratingTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 truncate">Avaliar {ratingTarget.nome}</h3>
              <button onClick={() => setRatingTarget(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveRating} className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {STAT_LABELS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                    <span className="font-bold text-emerald-600 w-8 text-right">{form[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) }))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 ui-btn-primary">
                  {saving ? 'Salvando...' : 'Salvar Avaliacao'}
                </button>
                <button type="button" onClick={() => setRatingTarget(null)} className="flex-1 ui-btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
