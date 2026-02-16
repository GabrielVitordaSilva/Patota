import { supabase } from './supabaseClient'

export const financeService = {
  // Obter mensalidades do usuario
  async getUserDues(memberId) {
    const { data, error } = await supabase
      .from('dues')
      .select(
        `
        *,
        payments (
          id,
          valor,
          status,
          comprovante_url,
          criado_em
        )
      `
      )
      .eq('member_id', memberId)
      .order('competencia', { ascending: false })

    return { data, error }
  },

  // Obter multas do usuario
  async getUserFines(memberId) {
    const { data, error } = await supabase
      .from('fines')
      .select(
        `
        *,
        events (
          tipo,
          data_hora,
          local
        )
      `
      )
      .eq('member_id', memberId)
      .order('criado_em', { ascending: false })

    return { data, error }
  },

  // Obter pendencias do usuario
  async getUserPendencies(memberId) {
    const { data: dues } = await supabase
      .from('dues')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'PENDENTE')

    const { data: fines } = await supabase
      .from('fines')
      .select(
        `
        *,
        events (tipo, data_hora)
      `
      )
      .eq('member_id', memberId)
      .is('pago', false)

    const totalDues = dues?.reduce((sum, due) => sum + due.valor, 0) || 0
    const totalFines = fines?.reduce((sum, fine) => sum + fine.valor, 0) || 0

    return {
      dues: dues || [],
      fines: fines || [],
      total: totalDues + totalFines
    }
  },

  // Criar pagamento
  async createPayment(memberId, dueId, valor, comprovanteUrl = null) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        member_id: memberId,
        due_id: dueId,
        valor,
        status: 'PENDENTE',
        comprovante_url: comprovanteUrl
      })
      .select()
      .single()

    return { data, error }
  },

  // Criar pagamento de multa
  async createFinePayment(memberId, fineId, valor, comprovanteUrl = null) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        member_id: memberId,
        fine_id: fineId,
        valor,
        status: 'PENDENTE',
        comprovante_url: comprovanteUrl
      })
      .select()
      .single()

    return { data, error }
  },

  // Confirmar pagamento (Admin)
  async confirmPayment(paymentId, adminId) {
    const { data: payment, error } = await supabase
      .from('payments')
      .update({ status: 'CONFIRMADO' })
      .eq('id', paymentId)
      .select()
      .single()

    if (!error && payment) {
      await supabase.from('dues').update({ status: 'PAGO' }).eq('id', payment.due_id)

      await supabase.from('cash_ledger').insert({
        tipo: 'ENTRADA',
        categoria: 'MENSALIDADE',
        valor: payment.valor,
        referencia: `payment_${payment.id}`,
        lancado_por: adminId
      })
    }

    return { data: payment, error }
  },

  // Confirmar pagamento de multa (Admin)
  async confirmFinePayment(paymentId, adminId) {
    const { data: payment, error } = await supabase
      .from('payments')
      .update({ status: 'CONFIRMADO' })
      .eq('id', paymentId)
      .select()
      .single()

    if (!error && payment) {
      await supabase.from('fines').update({ pago: true }).eq('id', payment.fine_id)

      await supabase.from('cash_ledger').insert({
        tipo: 'ENTRADA',
        categoria: 'MULTA',
        valor: payment.valor,
        referencia: `payment_${payment.id}`,
        lancado_por: adminId
      })
    }

    return { data: payment, error }
  },

  // Upload de comprovante
  async uploadComprovante(file, memberId) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${memberId}_${Date.now()}.${fileExt}`
    const filePath = `comprovantes/${fileName}`

    const { error } = await supabase.storage.from('comprovantes').upload(filePath, file)

    if (error) {
      return { data: null, error }
    }

    const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(filePath)

    return { data: urlData.publicUrl, error: null }
  },

  // Gerar mensalidades do mes (Admin)
  async generateMonthlyDues(year, month) {
    const competencia = `${year}-${String(month).padStart(2, '0')}`
    const vencimento = `${year}-${String(month).padStart(2, '0')}-10`

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id')
      .eq('ativo', true)

    if (membersError) {
      return { data: null, error: membersError, generatedCount: 0 }
    }

    const { data: exemptions, error: exemptionsError } = await supabase
      .from('exemptions')
      .select('member_id')
      .eq('competencia', competencia)

    if (exemptionsError) {
      return { data: null, error: exemptionsError, generatedCount: 0 }
    }

    const exemptIds = exemptions?.map((e) => e.member_id) || []

    const dues =
      members?.map((member) => ({
        member_id: member.id,
        competencia,
        vencimento,
        valor: exemptIds.includes(member.id) ? 0 : 35,
        status: exemptIds.includes(member.id) ? 'ISENTO' : 'PENDENTE'
      })) || []

    if (dues.length === 0) {
      return { data: [], error: null, generatedCount: 0 }
    }

    const { data, error } = await supabase
      .from('dues')
      .upsert(dues, {
        onConflict: 'member_id,competencia',
        ignoreDuplicates: true
      })
      .select('id')

    return { data, error, generatedCount: data?.length || 0 }
  },

  // Criar isencao (Admin)
  async createExemption(memberId, competencia, motivo, adminId) {
    const { data, error } = await supabase
      .from('exemptions')
      .insert({
        member_id: memberId,
        competencia,
        motivo,
        aprovado_por: adminId
      })
      .select()
      .single()

    if (!error) {
      await supabase.from('dues').update({ status: 'ISENTO', valor: 0 }).eq('member_id', memberId).eq('competencia', competencia)
    }

    return { data, error }
  },

  // Obter extrato do caixa
  async getCashLedger(startDate = null, endDate = null) {
    let query = supabase.from('cash_ledger').select('*').order('criado_em', { ascending: false })

    if (startDate) {
      query = query.gte('criado_em', startDate)
    }
    if (endDate) {
      query = query.lte('criado_em', endDate)
    }

    const { data, error } = await query

    return { data, error }
  },

  // Obter saldo do caixa
  async getCashBalance() {
    const { data, error } = await supabase.from('cash_ledger').select('tipo, valor')

    if (error) return { balance: 0, error }

    const balance =
      data?.reduce((sum, item) => {
        return item.tipo === 'ENTRADA' ? sum + item.valor : sum - item.valor
      }, 0) || 0

    return { balance, error: null }
  },

  // Lancar saida no caixa (Admin)
  async createCashOut(categoria, valor, obs, adminId) {
    const { data, error } = await supabase
      .from('cash_ledger')
      .insert({
        tipo: 'SAIDA',
        categoria,
        valor,
        obs,
        lancado_por: adminId
      })
      .select()
      .single()

    return { data, error }
  }
}
