import supabaseService from './supabase.service'

class SalesService {
  constructor() {
    this.table = 'sales'
    this.linesTable = 'sale_lines'
    this.paymentsTable = 'sale_payments'
    this.returnsTable = 'sale_returns'
    this.returnLinesTable = 'sale_return_lines'
  }

  // Crear venta usando SP atómico
  async createSale(tenantId, saleData) {
    try {
      const { data, error } = await supabaseService.client.rpc('sp_create_sale', {
        p_tenant: tenantId,
        p_location: saleData.location_id,
        p_cash_session: saleData.cash_session_id || null,
        p_customer: saleData.customer_id || null,
        p_sold_by: saleData.sold_by,
        p_lines: saleData.lines,
        p_payments: saleData.payments,
        p_note: saleData.note || null
      })

      if (error) throw error
      return { success: true, data: { sale_id: data } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Obtener ventas con paginación
  async getSales(tenantId, page = 1, pageSize = 10, filters = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select(`
          *,
          location:location_id(name),
          customer:customer_id(full_name, document),
          sold_by_user:sold_by(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('sold_at', { ascending: false })
        .range(from, to)

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.location_id) query = query.eq('location_id', filters.location_id)
      if (filters.from_date) query = query.gte('sold_at', filters.from_date)
      if (filters.to_date) query = query.lte('sold_at', filters.to_date)

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  // Obtener detalle de venta
  async getSaleById(tenantId, saleId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select(`
          *,
          location:location_id(name),
          customer:customer_id(full_name, document, phone),
          sold_by_user:sold_by(full_name),
          sale_lines(
            sale_line_id, quantity, unit_price, unit_cost,
            discount_amount, tax_amount, line_total, tax_detail,
            variant:variant_id(sku, variant_name, product:product_id(name))
          ),
          sale_payments(
            sale_payment_id, amount, reference, paid_at,
            payment_method:payment_method_id(code, name)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('sale_id', saleId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Anular venta
  async voidSale(tenantId, saleId) {
    try {
      const { data, error } = await supabaseService.update(this.table, {
        status: 'VOIDED'
      }, { tenant_id: tenantId, sale_id: saleId })

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Crear devolución usando SP
  async createReturn(tenantId, returnData) {
    try {
      const { data, error } = await supabaseService.client.rpc('sp_create_return', {
        p_tenant: tenantId,
        p_sale_id: returnData.sale_id,
        p_created_by: returnData.created_by,
        p_lines: returnData.lines,
        p_reason: returnData.reason || null
      })

      if (error) throw error
      return { success: true, data: { return_id: data } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Obtener devoluciones
  async getReturns(tenantId, page = 1, pageSize = 10) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabaseService.client
        .from(this.returnsTable)
        .select(`
          *,
          sale:sales!sale_returns_sale_id_fkey(sale_number, total),
          location:locations!sale_returns_location_id_fkey(name),
          created_by_user:users!sale_returns_created_by_fkey(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }
}

export default new SalesService()
