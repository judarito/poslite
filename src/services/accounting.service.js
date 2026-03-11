import { supabase } from '@/plugins/supabase'
import supabaseService from './supabase.service'

const AI_EDGE_FUNCTION = 'deepseek-proxy'
const AI_MODEL = import.meta.env.VITE_DEEPSEEK_TEXT_MODEL || 'deepseek-chat'

function extractJsonBlock(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch (_e) {
      return null
    }
  }
}

class AccountingService {
  getDefaultPeriod() {
    const now = new Date()
    const year = now.getFullYear()
    const month = `${now.getMonth() + 1}`.padStart(2, '0')
    const day = `${now.getDate()}`.padStart(2, '0')

    return {
      date_from: `${year}-${month}-01`,
      date_to: `${year}-${month}-${day}`
    }
  }

  async getSettings(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from('tenant_settings')
        .select(`
          accounting_enabled,
          accounting_mode,
          accounting_ai_enabled,
          accounting_auto_post_sales,
          accounting_auto_post_purchases,
          accounting_country_code
        `)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) throw error

      return {
        success: true,
        data: {
          accounting_enabled: data?.accounting_enabled || false,
          accounting_mode: data?.accounting_mode || 'ASYNC',
          accounting_ai_enabled: data?.accounting_ai_enabled !== false,
          accounting_auto_post_sales: data?.accounting_auto_post_sales || false,
          accounting_auto_post_purchases: data?.accounting_auto_post_purchases || false,
          accounting_country_code: data?.accounting_country_code || 'CO'
        }
      }
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('tenant_settings_rounding_method_check')) {
        return {
          success: false,
          error: 'Configuración inconsistente en tenant_settings.rounding_method. Ejecuta la migración FixRoundingMethodConstraint.sql y vuelve a intentar.'
        }
      }
      return { success: false, error: message || 'No se pudo guardar configuración contable.' }
    }
  }

  async saveSettings(tenantId, settings) {
    try {
      const payload = {
        accounting_enabled: Boolean(settings.accounting_enabled),
        accounting_mode: settings.accounting_mode || 'ASYNC',
        accounting_ai_enabled: settings.accounting_ai_enabled !== false,
        accounting_auto_post_sales: Boolean(settings.accounting_auto_post_sales),
        accounting_auto_post_purchases: Boolean(settings.accounting_auto_post_purchases),
        accounting_country_code: settings.accounting_country_code || 'CO'
      }

      // 1) Primero intentar UPDATE (no dispara defaults/constraints de INSERT)
      const { data: updatedRows, error: updateError } = await supabaseService.client
        .from('tenant_settings')
        .update(payload)
        .eq('tenant_id', tenantId)
        .select()
        .limit(1)

      if (updateError) throw updateError
      if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        return { success: true, data: updatedRows[0] }
      }

      // 2) Si no existe fila, insertar con fallback de rounding_method
      const insertBase = {
        tenant_id: tenantId,
        ...payload,
        print_format: 'thermal'
      }

      const roundingCandidates = ['normal', 'NONE']
      let lastInsertError = null

      for (const roundingMethod of roundingCandidates) {
        const { data, error } = await supabaseService.client
          .from('tenant_settings')
          .insert({
            ...insertBase,
            rounding_method: roundingMethod
          })
          .select()
          .single()

        if (!error) {
          return { success: true, data }
        }

        lastInsertError = error
      }

      throw lastInsertError || new Error('No se pudo crear configuración de tenant_settings')
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getSummary(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_summary', { p_tenant_id: tenantId })

      if (error) throw error
      return { success: true, data: data || {} }
    } catch (error) {
      return { success: false, error: error.message, data: {} }
    }
  }

  async getComplianceSnapshot(tenantId, filters = {}) {
    try {
      const period = {
        ...this.getDefaultPeriod(),
        ...filters
      }

      const fromDateTime = `${period.date_from}T00:00:00`
      const toDateTime = `${period.date_to}T23:59:59.999`

      const [
        salesRes,
        purchasesRes,
        entriesRes,
        providerRes,
        resolutionRes,
        queueCountRes
      ] = await Promise.all([
        supabaseService.client
          .from('sales')
          .select(`
            sale_id,
            subtotal,
            tax_total,
            total,
            status,
            invoice_type,
            dian_status,
            sold_at,
            third_party_id
          `)
          .eq('tenant_id', tenantId)
          .in('status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
          .gte('sold_at', fromDateTime)
          .lte('sold_at', toDateTime),
        supabaseService.client
          .from('purchases')
          .select('purchase_id, total, created_at, supplier_id')
          .eq('tenant_id', tenantId)
          .gte('created_at', fromDateTime)
          .lte('created_at', toDateTime),
        supabaseService.client
          .from('accounting_entries')
          .select('entry_id, status, entry_date')
          .eq('tenant_id', tenantId)
          .gte('entry_date', period.date_from)
          .lte('entry_date', period.date_to),
        supabaseService.client
          .from('fe_provider_config')
          .select('provider_name, environment, is_active')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabaseService.client
          .from('invoice_resolutions')
          .select(`
            resolution_id,
            prefix,
            from_number,
            to_number,
            current_number,
            valid_from,
            valid_to,
            is_active
          `)
          .eq('tenant_id', tenantId)
          .eq('document_type', 'FE')
          .eq('is_active', true)
          .order('resolution_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseService.client
          .from('accounting_event_queue')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['PENDING', 'FAILED'])
      ])

      if (salesRes.error) throw salesRes.error
      if (purchasesRes.error) throw purchasesRes.error
      if (entriesRes.error) throw entriesRes.error
      if (providerRes.error) throw providerRes.error
      if (resolutionRes.error) throw resolutionRes.error
      if (queueCountRes.error) throw queueCountRes.error

      const sales = salesRes.data || []
      const purchases = purchasesRes.data || []
      const entries = entriesRes.data || []
      const provider = providerRes.data || null
      const resolution = resolutionRes.data || null
      const pendingQueueEvents = Number(queueCountRes.count || 0)

      const totals = {
        sales_subtotal: 0,
        sales_tax: 0,
        sales_total: 0,
        purchases_total: 0
      }

      sales.forEach((sale) => {
        totals.sales_subtotal += Number(sale.subtotal || 0)
        totals.sales_tax += Number(sale.tax_total || 0)
        totals.sales_total += Number(sale.total || 0)
      })

      purchases.forEach((purchase) => {
        totals.purchases_total += Number(purchase.total || 0)
      })

      const postedEntries = entries.filter((entry) => entry.status === 'POSTED').length
      const draftEntries = entries.filter((entry) => entry.status === 'DRAFT').length

      const feSales = sales.filter((sale) => sale.invoice_type === 'FE')
      const feAccepted = feSales.filter((sale) => sale.dian_status === 'ACCEPTED').length
      const feRejected = feSales.filter((sale) => sale.dian_status === 'REJECTED').length
      const feError = feSales.filter((sale) => sale.dian_status === 'ERROR').length
      const fePending = feSales.filter((sale) => ['PENDING', 'PROCESSING', null].includes(sale.dian_status)).length

      const thirdPartyIds = new Set(
        sales
          .map((sale) => sale.third_party_id)
          .filter(Boolean)
      )

      const supplierIds = new Set(
        purchases
          .map((purchase) => purchase.supplier_id)
          .filter(Boolean)
      )

      const counterpartyCount = new Set([...thirdPartyIds, ...supplierIds]).size

      const hasProvider = Boolean(provider?.is_active)
      const hasResolution = Boolean(resolution?.resolution_id)
      const readyFEConfig = hasProvider && hasResolution

      const resolutionProgress = resolution
        ? {
            prefix: resolution.prefix || '',
            current_number: Number(resolution.current_number || 0),
            from_number: Number(resolution.from_number || 0),
            to_number: Number(resolution.to_number || 0),
            used_percent: Number(resolution.to_number || 0) > Number(resolution.from_number || 0)
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    (
                      ((Number(resolution.current_number || 0) - Number(resolution.from_number || 0)) /
                        (Number(resolution.to_number || 0) - Number(resolution.from_number || 0) + 1)) * 100
                    )
                  )
                )
              : 0,
            valid_from: resolution.valid_from || null,
            valid_to: resolution.valid_to || null
          }
        : null

      const obligations = [
        {
          key: 'dian_fe',
          name: 'Facturación Electrónica DIAN',
          frequency: 'Por operación',
          meaning: 'Emitir, validar y conservar facturas electrónicas con CUFE ante DIAN.',
          status: readyFEConfig ? (feRejected > 0 || feError > 0 ? 'ALERT' : 'READY') : 'PENDING',
          evidence: readyFEConfig
            ? `FE periodo: ${feSales.length} · Aceptadas: ${feAccepted} · Rechazadas/Error: ${feRejected + feError}`
            : 'Falta proveedor tecnológico o resolución activa.',
          route: '/tenant-config'
        },
        {
          key: 'iva',
          name: 'Declaración de IVA',
          frequency: 'Bimestral o cuatrimestral (según régimen)',
          meaning: 'Consolidar IVA generado en ventas e IVA descontable en compras.',
          status: totals.sales_tax > 0 || totals.purchases_total > 0 ? 'READY' : 'PENDING',
          evidence: `IVA ventas: ${totals.sales_tax.toFixed(2)} · Compras: ${totals.purchases_total.toFixed(2)}`,
          route: '/reports/financiero'
        },
        {
          key: 'books',
          name: 'Libros Contables (Diario y Mayor)',
          frequency: 'Mensual',
          meaning: 'Mantener asientos posteados y balanceados como soporte contable.',
          status: postedEntries > 0 ? (pendingQueueEvents > 0 ? 'ALERT' : 'READY') : 'PENDING',
          evidence: `Asientos posteados: ${postedEntries} · Borrador: ${draftEntries} · Cola pendiente: ${pendingQueueEvents}`,
          route: '/accounting/diario'
        },
        {
          key: 'withholding',
          name: 'Retención en la Fuente / ICA',
          frequency: 'Mensual',
          meaning: 'Controlar bases, conceptos y valores retenidos para declaración y pago.',
          status: 'PARTIAL',
          evidence: 'Disponible de forma asistida: revisar causación y parametrización tributaria específica del cliente.',
          route: '/accounting/retenciones'
        },
        {
          key: 'monthly_close',
          name: 'Cierre Contable Mensual',
          frequency: 'Mensual',
          meaning: 'Cerrar periodos y bloquear cambios para proteger consistencia contable y fiscal.',
          status: postedEntries > 0 ? 'PARTIAL' : 'PENDING',
          evidence: `Asientos posteados periodo: ${postedEntries}`,
          route: '/accounting/cierre'
        },
        {
          key: 'exogena',
          name: 'Información Exógena / Medios Magnéticos',
          frequency: 'Anual',
          meaning: 'Reportar operaciones con terceros de acuerdo con topes y conceptos DIAN.',
          status: counterpartyCount > 0 ? 'PARTIAL' : 'PENDING',
          evidence: `Terceros detectados en el periodo: ${counterpartyCount}`,
          route: '/third-parties'
        }
      ]

      const requiredReports = [
        {
          key: 'journal_book',
          name: 'Libro Diario',
          purpose: 'Detalle cronológico de asientos para revisión y soporte fiscal.',
          route: '/accounting/diario',
          status: postedEntries > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'ledger_book',
          name: 'Libro Mayor',
          purpose: 'Movimientos y saldo acumulado por cuenta contable.',
          route: '/accounting/mayor',
          status: postedEntries > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'trial_balance',
          name: 'Balanza de Comprobación',
          purpose: 'Control de cierre y validación de equilibrio contable.',
          route: '/accounting',
          status: postedEntries > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'financial_summary',
          name: 'Estado Financiero Resumido',
          purpose: 'Revisar ingresos, costo, utilidad, impuestos y margen del periodo.',
          route: '/reports/financiero',
          status: sales.length > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'sales_tax_report',
          name: 'Ventas e IVA',
          purpose: 'Soporte de declaración de IVA y conciliación comercial-fiscal.',
          route: '/reports/ventas',
          status: sales.length > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'cash_report',
          name: 'Caja y Flujo de Efectivo',
          purpose: 'Sustentar movimientos de caja y cruces contra contabilidad.',
          route: '/reports/cajas',
          status: 'READY'
        },
        {
          key: 'third_party_master',
          name: 'Maestro de Terceros',
          purpose: 'Base para reportes a DIAN, retenciones e información exógena.',
          route: '/third-parties',
          status: counterpartyCount > 0 ? 'READY' : 'PENDING'
        },
        {
          key: 'withholding_control',
          name: 'Control de Retenciones',
          purpose: 'Estimación operativa de retenciones y trazabilidad de configuración tributaria.',
          route: '/accounting/retenciones',
          status: purchases.length > 0 || sales.length > 0 ? 'PARTIAL' : 'PENDING'
        },
        {
          key: 'period_close_control',
          name: 'Cierre de Periodo',
          purpose: 'Controlar cierre mensual y bloqueo de asientos por periodo.',
          route: '/accounting/cierre',
          status: postedEntries > 0 ? 'PARTIAL' : 'PENDING'
        },
        {
          key: 'automation_console',
          name: 'Consola de Automatización',
          purpose: 'Reglas de contabilización automática y excepciones de integración.',
          route: '/accounting/automatizacion',
          status: pendingQueueEvents > 0 ? 'ALERT' : 'READY'
        }
      ]

      const readinessScore = obligations.reduce((acc, obligation) => {
        if (obligation.status === 'READY') return acc + 1
        if (obligation.status === 'PARTIAL') return acc + 0.5
        return acc
      }, 0)

      return {
        success: true,
        data: {
          period,
          kpis: {
            sales_count: sales.length,
            sales_subtotal: totals.sales_subtotal,
            sales_tax: totals.sales_tax,
            sales_total: totals.sales_total,
            purchases_count: purchases.length,
            purchases_total: totals.purchases_total,
            posted_entries: postedEntries,
            draft_entries: draftEntries,
            pending_queue_events: pendingQueueEvents,
            fe_total: feSales.length,
            fe_accepted: feAccepted,
            fe_rejected: feRejected,
            fe_error: feError,
            fe_pending: fePending,
            counterparties: counterpartyCount
          },
          fe_configuration: {
            provider_name: provider?.provider_name || null,
            environment: provider?.environment || null,
            is_ready: readyFEConfig,
            resolution: resolutionProgress
          },
          obligations,
          required_reports: requiredReports,
          readiness_score: readinessScore,
          readiness_max: obligations.length
        }
      }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  normalizeJournalEntries(entries = [], filters = {}) {
    const accountId = filters.account_id || null
    const search = String(filters.search || '').trim().toLowerCase()

    return (entries || [])
      .map((entry) => {
        const baseText = `${entry.entry_number || ''} ${entry.description || ''} ${entry.source_module || ''} ${entry.source_event || ''}`.toLowerCase()
        const entryMatch = !search || baseText.includes(search)

        const filteredLines = (entry.lines || [])
          .filter((line) => !accountId || line.account_id === accountId)
          .filter((line) => {
            if (!search || entryMatch) return true
            const lineText = `${line.description || ''} ${line.account?.code || ''} ${line.account?.name || ''}`.toLowerCase()
            return lineText.includes(search)
          })
          .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))

        if (!filteredLines.length) return null
        return {
          ...entry,
          lines: filteredLines
        }
      })
      .filter(Boolean)
  }

  flattenJournalRows(entries = []) {
    const rows = []

    for (const entry of (entries || [])) {
      for (const line of (entry.lines || [])) {
        rows.push({
          entry_id: entry.entry_id,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          source_module: entry.source_module,
          source_event: entry.source_event,
          entry_description: entry.description || '',
          entry_status: entry.status,
          line_id: line.line_id,
          line_number: line.line_number,
          line_description: line.description || '',
          account_id: line.account_id,
          account_code: line.account?.code || '',
          account_name: line.account?.name || '',
          account_type: line.account?.account_type || '',
          natural_side: line.account?.natural_side || '',
          third_party_id: line.third_party_id || null,
          debit_amount: Number(line.debit_amount || 0),
          credit_amount: Number(line.credit_amount || 0)
        })
      }
    }

    return rows
  }

  async getJournalEntries(tenantId, filters = {}) {
    try {
      if (!tenantId) {
        return { success: false, error: 'tenant_id es requerido', data: null }
      }

      const limit = Math.max(1, Math.min(5000, Number(filters.limit || 1200)))

      let query = supabaseService.client
        .from('accounting_entries')
        .select(`
          entry_id,
          entry_number,
          entry_date,
          source_module,
          source_event,
          description,
          status,
          created_at,
          lines:accounting_entry_lines(
            line_id,
            line_number,
            account_id,
            third_party_id,
            description,
            debit_amount,
            credit_amount,
            account:account_id(
              account_id,
              code,
              name,
              account_type,
              natural_side
            )
          )
        `)
        .eq('tenant_id', tenantId)

      if (filters.date_from) query = query.gte('entry_date', filters.date_from)
      if (filters.date_to) query = query.lte('entry_date', filters.date_to)
      if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status)
      if (filters.source_module && filters.source_module !== 'ALL') query = query.eq('source_module', filters.source_module)

      const { data, error } = await query
        .order('entry_date', { ascending: true })
        .order('entry_number', { ascending: true })
        .limit(limit)

      if (error) throw error

      const entries = this.normalizeJournalEntries(data || [], filters)
      const lines = this.flattenJournalRows(entries)

      const totals = lines.reduce(
        (acc, line) => {
          acc.debit += Number(line.debit_amount || 0)
          acc.credit += Number(line.credit_amount || 0)
          return acc
        },
        { debit: 0, credit: 0 }
      )

      return {
        success: true,
        data: {
          entries,
          lines,
          totals: {
            debit: totals.debit,
            credit: totals.credit,
            balanced: Math.round(totals.debit * 100) === Math.round(totals.credit * 100)
          }
        }
      }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getLedgerReport(tenantId, filters = {}) {
    try {
      if (!tenantId) {
        return { success: false, error: 'tenant_id es requerido', data: null }
      }

      const accountId = filters.account_id || null
      if (!accountId) {
        return { success: false, error: 'account_id es requerido', data: null }
      }

      const { data: account, error: accountError } = await supabaseService.client
        .from('accounting_accounts')
        .select('account_id, code, name, account_type, natural_side, is_postable, is_active')
        .eq('tenant_id', tenantId)
        .eq('account_id', accountId)
        .maybeSingle()

      if (accountError) throw accountError
      if (!account) {
        return { success: false, error: 'Cuenta contable no encontrada', data: null }
      }

      const journalResult = await this.getJournalEntries(tenantId, {
        ...filters,
        account_id: accountId,
        status: filters.status || 'POSTED',
        limit: filters.limit || 2500
      })

      if (!journalResult.success) {
        return { success: false, error: journalResult.error, data: null }
      }

      const movementsBase = journalResult.data?.lines || []

      let openingBalance = 0
      if (filters.date_from) {
        const prevDate = new Date(`${filters.date_from}T00:00:00`)
        if (!Number.isNaN(prevDate.getTime())) {
          prevDate.setDate(prevDate.getDate() - 1)
          const cutoff = prevDate.toISOString().substring(0, 10)
          const trialResult = await this.getTrialBalance(tenantId, { date_from: null, date_to: cutoff })
          if (trialResult.success) {
            const prevAccount = (trialResult.data || []).find((row) => row.account_code === account.code)
            openingBalance = Number(prevAccount?.balance || 0)
          }
        }
      }

      let runningBalance = openingBalance
      const movements = movementsBase.map((line) => {
        const debit = Number(line.debit_amount || 0)
        const credit = Number(line.credit_amount || 0)
        const delta = account.natural_side === 'CREDIT'
          ? credit - debit
          : debit - credit

        runningBalance += delta

        return {
          ...line,
          delta,
          running_balance: runningBalance
        }
      })

      const totals = movements.reduce(
        (acc, line) => {
          acc.debit += Number(line.debit_amount || 0)
          acc.credit += Number(line.credit_amount || 0)
          return acc
        },
        { debit: 0, credit: 0 }
      )

      return {
        success: true,
        data: {
          account,
          opening_balance: openingBalance,
          closing_balance: runningBalance,
          total_debit: totals.debit,
          total_credit: totals.credit,
          movements,
          entry_count: new Set(movements.map((m) => m.entry_id)).size
        }
      }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getTrialBalance(tenantId, filters = {}) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_trial_balance', {
          p_tenant_id: tenantId,
          p_date_from: filters.date_from || null,
          p_date_to: filters.date_to || null
        })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async getRecentEntries(tenantId, limit = 30) {
    try {
      const { data, error } = await supabaseService.client
        .from('accounting_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async getEventQueue(tenantId, limit = 50) {
    try {
      const { data, error } = await supabaseService.client
        .from('accounting_event_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async processQueue(tenantId, options = {}) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_process_queue', {
          p_tenant_id: tenantId,
          p_limit: Number(options.limit || 50),
          p_only_event_id: options.event_id || null
        })

      if (error) throw error
      return { success: true, data: data || {} }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getAccounts(tenantId, options = {}) {
    try {
      let query = supabaseService.client
        .from('accounting_accounts')
        .select('account_id, code, name, account_type, natural_side, is_postable, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (options.onlyPostable) {
        query = query.eq('is_postable', true)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async getWithholdingConfigs(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from('accounting_withholding_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('code', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async saveWithholdingConfig(tenantId, config = {}) {
    try {
      const payload = {
        tenant_id: tenantId,
        code: String(config.code || '').trim().toUpperCase(),
        name: String(config.name || '').trim(),
        applies_to: config.applies_to || 'PURCHASES',
        rate: Number(config.rate || 0),
        base_threshold: Number(config.base_threshold || 0),
        account_code: config.account_code ? String(config.account_code).trim() : null,
        is_active: config.is_active !== false,
        updated_at: new Date().toISOString()
      }

      if (!payload.code || !payload.name) {
        return { success: false, error: 'code y name son requeridos' }
      }

      let query = supabaseService.client
        .from('accounting_withholding_configs')
        .upsert(
          config.config_id
            ? { ...payload, config_id: config.config_id }
            : payload,
          { onConflict: config.config_id ? 'config_id' : 'tenant_id,code' }
        )
        .select()
        .limit(1)

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: Array.isArray(data) ? data[0] : data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getWithholdingSummary(tenantId, filters = {}) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_get_withholding_summary', {
          p_tenant_id: tenantId,
          p_date_from: filters.date_from || null,
          p_date_to: filters.date_to || null
        })

      if (error) throw error
      if (!data?.success) {
        return { success: false, error: data?.message || 'No se pudo calcular resumen de retenciones', data }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getPeriodClosures(tenantId, options = {}) {
    try {
      let query = supabaseService.client
        .from('accounting_period_closures')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(options.limit || 48)

      if (options.year) {
        query = query.eq('period_year', Number(options.year))
      }

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async closePeriod(tenantId, params = {}) {
    try {
      const year = Number(params.year)
      const month = Number(params.month)

      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_close_period', {
          p_tenant_id: tenantId,
          p_year: year,
          p_month: month,
          p_notes: params.notes || null
        })

      if (error) throw error
      if (!data?.success) {
        return { success: false, error: data?.message || 'No se pudo cerrar el periodo', data }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async reopenPeriod(tenantId, params = {}) {
    try {
      const year = Number(params.year)
      const month = Number(params.month)

      const { data, error } = await supabaseService.client
        .rpc('fn_accounting_open_period', {
          p_tenant_id: tenantId,
          p_year: year,
          p_month: month,
          p_notes: params.notes || null
        })

      if (error) {
        // Backward compatibility: old deployments may only have reopen RPC.
        const fallback = await supabaseService.client
          .rpc('fn_accounting_reopen_period', {
            p_tenant_id: tenantId,
            p_year: year,
            p_month: month,
            p_notes: params.notes || null
          })

        if (fallback.error) throw fallback.error
        const fallbackData = fallback.data
        if (!fallbackData?.success) {
          return { success: false, error: fallbackData?.message || 'No se pudo abrir el periodo', data: fallbackData }
        }
        return { success: true, data: fallbackData }
      }

      if (!data?.success) {
        return { success: false, error: data?.message || 'No se pudo abrir el periodo', data }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getPostingRules(tenantId, filters = {}) {
    try {
      let query = supabaseService.client
        .from('accounting_posting_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (filters.source_module && filters.source_module !== 'ALL') {
        query = query.eq('source_module', filters.source_module)
      }
      if (filters.event_type && filters.event_type !== 'ALL') {
        query = query.eq('event_type', filters.event_type)
      }

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async savePostingRule(tenantId, rule = {}) {
    try {
      const payload = {
        tenant_id: tenantId,
        source_module: String(rule.source_module || '').trim().toUpperCase(),
        event_type: String(rule.event_type || '').trim().toUpperCase(),
        rule_name: String(rule.rule_name || '').trim(),
        debit_account_code: String(rule.debit_account_code || '').trim(),
        credit_account_code: String(rule.credit_account_code || '').trim(),
        description_template: String(rule.description_template || '').trim(),
        auto_post: rule.auto_post !== false,
        priority: Number(rule.priority || 100),
        is_active: rule.is_active !== false,
        updated_at: new Date().toISOString()
      }

      if (!payload.source_module || !payload.event_type || !payload.rule_name) {
        return { success: false, error: 'source_module, event_type y rule_name son requeridos' }
      }
      if (!payload.debit_account_code || !payload.credit_account_code) {
        return { success: false, error: 'debit_account_code y credit_account_code son requeridos' }
      }

      const { data, error } = await supabaseService.client
        .from('accounting_posting_rules')
        .upsert(
          rule.rule_id
            ? { ...payload, rule_id: rule.rule_id }
            : payload,
          { onConflict: rule.rule_id ? 'rule_id' : 'tenant_id,source_module,event_type,rule_name' }
        )
        .select()
        .limit(1)

      if (error) throw error
      return { success: true, data: Array.isArray(data) ? data[0] : data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async getAutomationExceptions(tenantId, options = {}) {
    try {
      let query = supabaseService.client
        .from('accounting_automation_exceptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(options.limit || 100)

      if (options.status && options.status !== 'ALL') {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  async resolveAutomationException(tenantId, exception) {
    try {
      const exceptionId = typeof exception === 'string' ? exception : exception?.exception_id
      if (!exceptionId) {
        return { success: false, error: 'exception_id es requerido' }
      }

      const { data, error } = await supabaseService.client
        .from('accounting_automation_exceptions')
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('exception_id', exceptionId)
        .select()
        .limit(1)

      if (error) throw error
      return { success: true, data: Array.isArray(data) ? data[0] : data }
    } catch (error) {
      return { success: false, error: error.message, data: null }
    }
  }

  async requestAIAssistant({ tenantId, prompt }) {
    try {
      const userPrompt = String(prompt || '').trim()
      if (!userPrompt) {
        return { success: false, error: 'Escribe el contexto del asiento a proponer.' }
      }

      const accountsResult = await this.getAccounts(tenantId, { onlyPostable: true, limit: 60 })
      if (!accountsResult.success) {
        return { success: false, error: accountsResult.error || 'No se pudo cargar el plan de cuentas.' }
      }

      const catalog = accountsResult.data.map((a) => `${a.code} - ${a.name} (${a.natural_side})`).join('\n')

      const messages = [
        {
          role: 'system',
          content: 'Eres un asistente contable experto en Colombia (PUC). Responde SOLO JSON válido, sin markdown.'
        },
        {
          role: 'user',
          content: `Con base en este contexto de negocio, propone un borrador de asiento contable para POS.

Contexto:\n${userPrompt}

Plan de cuentas disponible:\n${catalog}

Responde EXCLUSIVAMENTE JSON con esta forma:
{
  "summary": "string",
  "confidence": 0.0,
  "warnings": ["string"],
  "entry": {
    "entry_date": "YYYY-MM-DD",
    "description": "string",
    "lines": [
      {
        "account_code": "string",
        "account_name": "string",
        "debit_amount": 0,
        "credit_amount": 0,
        "reason": "string"
      }
    ]
  }
}

Reglas:
- Debe quedar balanceado (sum(debit)=sum(credit)).
- No inventes cuentas fuera del catálogo.
- Si no hay suficiente contexto, baja confidence y agrega warnings.
`
        }
      ]

      const { data, error } = await supabase.functions.invoke(AI_EDGE_FUNCTION, {
        body: {
          model: AI_MODEL,
          messages,
          temperature: 0.15,
          max_tokens: 1800
        }
      })

      if (error) throw error

      const content = data?.content || ''
      const parsed = typeof content === 'object' ? content : extractJsonBlock(content)

      if (!parsed) {
        return {
          success: false,
          error: 'La IA respondió, pero no en formato JSON utilizable.',
          raw: content
        }
      }

      return { success: true, data: parsed, raw: content }
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'No se pudo generar sugerencia IA.'
      }
    }
  }
}

export default new AccountingService()
