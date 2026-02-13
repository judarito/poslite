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
          // Negocio básico
          business_name: settings.business_name || null,
          business_address: settings.business_address || null,
          business_phone: settings.business_phone || null,
          logo_url: settings.logo_url || null,
          receipt_footer: settings.receipt_footer || null,
          default_tax_included: settings.default_tax_included || false,
          
          // Interfaz y UX
          default_page_size: settings.default_page_size || 20,
          theme: settings.theme || 'light',
          date_format: settings.date_format || 'DD/MM/YYYY',
          locale: settings.locale || 'es-CO',
          session_timeout_minutes: settings.session_timeout_minutes || 60,
          
          // IA
          ai_forecast_days_back: settings.ai_forecast_days_back || 90,
          ai_purchase_suggestion_days: settings.ai_purchase_suggestion_days || 14,
          ai_purchase_advisor_enabled: settings.ai_purchase_advisor_enabled !== false,
          ai_sales_forecast_enabled: settings.ai_sales_forecast_enabled !== false,
          
          // Inventario (sin duplicados - min_stock y allow_backorder ya existen por producto)
          expiry_alert_days: settings.expiry_alert_days || 30,
          reserve_stock_on_layaway: settings.reserve_stock_on_layaway !== false,
          
          // Ventas y Precios
          max_discount_without_auth: settings.max_discount_without_auth || 5.00,
          rounding_method: settings.rounding_method || 'normal',
          rounding_multiple: settings.rounding_multiple || 100,
          
          // Facturación
          invoice_prefix: settings.invoice_prefix || 'FAC',
          next_invoice_number: settings.next_invoice_number || 1,
          electronic_invoicing_enabled: settings.electronic_invoicing_enabled || false,
          print_format: settings.print_format || 'thermal',
          thermal_paper_width: settings.thermal_paper_width || 80,
          
          // Notificaciones
          email_alerts_enabled: settings.email_alerts_enabled || false,
          alert_email: settings.alert_email || null,
          notify_low_stock: settings.notify_low_stock !== false,
          notify_expiring_products: settings.notify_expiring_products !== false
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
