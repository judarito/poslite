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
