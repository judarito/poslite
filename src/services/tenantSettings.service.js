import supabaseService from './supabase.service'

class TenantSettingsService {
  constructor() {
    this.table = 'tenant_settings'
    this.tenantsTable = 'tenants'
  }

  // Obtener configuración del tenant
  async getSettings(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) throw error
      return { success: true, data: data || {} }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Obtener datos del tenant
  async getTenant(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.tenantsTable)
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Guardar/actualizar configuración (upsert)
  async saveSettings(tenantId, settings) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .upsert({
          tenant_id: tenantId,
          business_name: settings.business_name || null,
          business_address: settings.business_address || null,
          business_phone: settings.business_phone || null,
          logo_url: settings.logo_url || null,
          receipt_footer: settings.receipt_footer || null,
          default_tax_included: settings.default_tax_included || false
        }, { onConflict: 'tenant_id' })
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Actualizar datos generales del tenant
  async updateTenant(tenantId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.tenantsTable, {
        name: updates.name,
        tax_id: updates.tax_id || null,
        currency_code: updates.currency_code || 'COP'
      }, { tenant_id: tenantId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default new TenantSettingsService()
