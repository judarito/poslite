import supabaseService from './supabase.service'

class ReportsService {
  constructor() {
    // Las políticas RLS en las tablas sales, sale_lines, etc. ya filtran por rol
    this.salesTable = 'sales'
    this.saleLinesTable = 'sale_lines'
    this.salePaymentsTable = 'sale_payments'
    this.saleReturnsTable = 'sale_returns'
    this.cashSessionsTable = 'cash_sessions'
    this.cashMovementsTable = 'cash_movements'
  }

  // Resumen de ventas por período
  async getSalesSummary(tenantId, fromDate, toDate, locationId = null) {
    try {
      // Las políticas RLS de sales ya filtran por rol automáticamente
      let query = supabaseService.client
        .from('sales')
        .select('sale_id, subtotal, discount_total, tax_total, total, status, sold_at')
        .eq('tenant_id', tenantId)
        .in('status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
        .gte('sold_at', fromDate)
        .lte('sold_at', toDate)

      if (locationId) query = query.eq('location_id', locationId)

      const { data, error } = await query
      if (error) throw error

      const summary = {
        total_sales: (data || []).length,
        gross_subtotal: 0,
        gross_discount: 0,
        gross_tax: 0,
        gross_total: 0,
        returns_total: 0,
        net_total: 0
      }

      ;(data || []).forEach(s => {
        summary.gross_subtotal += parseFloat(s.subtotal) || 0
        summary.gross_discount += parseFloat(s.discount_total) || 0
        summary.gross_tax += parseFloat(s.tax_total) || 0
        summary.gross_total += parseFloat(s.total) || 0
      })

      // Obtener total de devoluciones en el mismo período
      // Nota: Las devoluciones ya están incluidas en el estado PARTIAL_RETURN y RETURNED
      // Aquí calculamos el total real de devoluciones
      const returns = data.filter(s => s.status === 'RETURNED' || s.status === 'PARTIAL_RETURN')
      returns.forEach(r => {
        // Las devoluciones parciales y totales ya están en negativo en el total
        summary.returns_total += Math.abs(parseFloat(r.total) || 0)
      })

      summary.net_total = summary.gross_total - summary.returns_total

      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Ventas agrupadas por día
  async getSalesByDay(tenantId, fromDate, toDate, locationId = null) {
    try {
      let query = supabaseService.client
        .from(this.salesTable)
        .select('sold_at, total, status')
        .eq('tenant_id', tenantId)
        .in('status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
        .gte('sold_at', fromDate)
        .lte('sold_at', toDate)
        .order('sold_at', { ascending: true })

      if (locationId) query = query.eq('location_id', locationId)

      const { data, error } = await query
      if (error) throw error

      const byDay = {}
      ;(data || []).forEach(s => {
        const day = s.sold_at.substring(0, 10)
        if (!byDay[day]) byDay[day] = { date: day, count: 0, gross_total: 0, returns_total: 0, net_total: 0 }
        byDay[day].count++
        byDay[day].gross_total += parseFloat(s.total) || 0
        
        // Si es devolución, sumar al total de devoluciones
        if (s.status === 'RETURNED' || s.status === 'PARTIAL_RETURN') {
          byDay[day].returns_total += Math.abs(parseFloat(s.total) || 0)
        }
      })

      // Calcular neto
      Object.values(byDay).forEach(d => {
        d.net_total = d.gross_total - d.returns_total
      })

      return { success: true, data: Object.values(byDay) }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Productos más vendidos
  async getTopProducts(tenantId, fromDate, toDate, limit = 20) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.saleLinesTable)
        .select(`
          variant_id, quantity, line_total,
          variant:variant_id(
            sku, variant_name, cost,
            product:product_id(name)
          ),
          sale:sale_id!inner(tenant_id, status, sold_at)
        `)
        .eq('sale.tenant_id', tenantId)
        .in('sale.status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
        .gte('sale.sold_at', fromDate)
        .lte('sale.sold_at', toDate)

      if (error) throw error

      // Agrupar por variante
      const grouped = {}
      ;(data || []).forEach(line => {
        const key = line.variant_id
        if (!grouped[key]) {
          grouped[key] = {
            variant_id: key,
            sku: line.variant?.sku,
            product_name: line.variant?.product?.name,
            variant_name: line.variant?.variant_name,
            total_qty: 0,
            total_revenue: 0,
            total_cost: 0
          }
        }
        grouped[key].total_qty += parseFloat(line.quantity) || 0
        grouped[key].total_revenue += parseFloat(line.line_total) || 0
        grouped[key].total_cost += (parseFloat(line.variant?.cost) || 0) * (parseFloat(line.quantity) || 0)
      })

      const sorted = Object.values(grouped)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, limit)
        .map(p => ({ ...p, profit: p.total_revenue - p.total_cost }))

      return { success: true, data: sorted }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Ventas por vendedor
  async getSalesBySeller(tenantId, fromDate, toDate) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.salesTable)
        .select('sold_by, total, sold_by_user:sold_by(full_name)')
        .eq('tenant_id', tenantId)
        .in('status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
        .gte('sold_at', fromDate)
        .lte('sold_at', toDate)

      if (error) throw error

      const grouped = {}
      ;(data || []).forEach(s => {
        if (!grouped[s.sold_by]) {
          grouped[s.sold_by] = { user_id: s.sold_by, name: s.sold_by_user?.full_name, count: 0, total: 0 }
        }
        grouped[s.sold_by].count++
        grouped[s.sold_by].total += parseFloat(s.total) || 0
      })

      return { success: true, data: Object.values(grouped).sort((a, b) => b.total - a.total) }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Ventas por método de pago
  async getSalesByPaymentMethod(tenantId, fromDate, toDate) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.salePaymentsTable)
        .select(`
          amount,
          payment_method:payment_method_id(code, name),
          sale:sale_id!inner(tenant_id, status, sold_at)
        `)
        .eq('sale.tenant_id', tenantId)
        .in('sale.status', ['COMPLETED', 'PARTIAL_RETURN', 'RETURNED'])
        .gte('sale.sold_at', fromDate)
        .lte('sale.sold_at', toDate)

      if (error) throw error

      const grouped = {}
      ;(data || []).forEach(p => {
        const code = p.payment_method?.code || 'N/A'
        if (!grouped[code]) {
          grouped[code] = { code, name: p.payment_method?.name, count: 0, total: 0 }
        }
        grouped[code].count++
        grouped[code].total += parseFloat(p.amount) || 0
      })

      return { success: true, data: Object.values(grouped).sort((a, b) => b.total - a.total) }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Movimientos de caja (gastos e ingresos)
  async getCashMovements(tenantId, fromDate, toDate, locationId = null, type = null) {
    try {
      let query = supabaseService.client
        .from(this.cashMovementsTable)
        .select(`
          cash_movement_id,
          type,
          category,
          amount,
          note,
          created_at,
          created_by_user:created_by(full_name),
          session:cash_session_id(
            cash_register:cash_register_id(name, location:location_id(name))
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false })

      if (type) query = query.eq('type', type)
      
      // Filtrar por location si se especifica
      const { data, error } = await query
      if (error) throw error

      let filteredData = data || []
      
      // Si hay filtro de ubicación, filtrar por la sede de la caja registradora
      if (locationId) {
        filteredData = filteredData.filter(m => 
          m.session?.cash_register?.location?.location_id === locationId
        )
      }

      // Calcular resumen
      const summary = {
        total_income: 0,
        total_expense: 0,
        count_income: 0,
        count_expense: 0,
        net: 0
      }

      filteredData.forEach(m => {
        const amount = parseFloat(m.amount) || 0
        if (m.type === 'INCOME') {
          summary.total_income += amount
          summary.count_income++
        } else {
          summary.total_expense += amount
          summary.count_expense++
        }
      })

      summary.net = summary.total_income - summary.total_expense

      return { success: true, data: filteredData, summary }
    } catch (error) {
      return { success: false, error: error.message, data: [], summary: null }
    }
  }

  // Movimientos agrupados por categoría
  async getCashMovementsByCategory(tenantId, fromDate, toDate, locationId = null) {
    try {
      const r = await this.getCashMovements(tenantId, fromDate, toDate, locationId)
      if (!r.success) return r

      const grouped = {}
      ;(r.data || []).forEach(m => {
        const category = m.category || 'Sin categoría'
        const key = `${m.type}_${category}`
        
        if (!grouped[key]) {
          grouped[key] = {
            type: m.type,
            category,
            count: 0,
            total: 0
          }
        }
        grouped[key].count++
        grouped[key].total += parseFloat(m.amount) || 0
      })

      return { success: true, data: Object.values(grouped).sort((a, b) => b.total - a.total) }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Resumen de plan separe
  async getLayawaySummary(tenantId, fromDate, toDate, locationId = null) {
    try {
      let query = supabaseService.client
        .from('vw_layaway_report')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)

      if (locationId) query = query.eq('location_id', locationId)

      const { data, error } = await query
      if (error) throw error

      const summary = {
        total_contracts: (data || []).length,
        active_contracts: 0,
        completed_contracts: 0,
        cancelled_contracts: 0,
        expired_contracts: 0,
        total_value: 0,
        total_paid: 0,
        total_balance: 0
      }

      ;(data || []).forEach(c => {
        if (c.status === 'ACTIVE') summary.active_contracts++
        if (c.status === 'COMPLETED') summary.completed_contracts++
        if (c.status === 'CANCELLED') summary.cancelled_contracts++
        if (c.status === 'EXPIRED') summary.expired_contracts++
        
        summary.total_value += parseFloat(c.total) || 0
        summary.total_paid += parseFloat(c.paid_total) || 0
        summary.total_balance += parseFloat(c.balance) || 0
      })

      return { success: true, summary, contracts: data || [] }
    } catch (error) {
      return { success: false, error: error.message, summary: null, contracts: [] }
    }
  }

  // Abonos de plan separe
  async getLayawayPayments(tenantId, fromDate, toDate, locationId = null) {
    try {
      let query = supabaseService.client
        .from('vw_layaway_payments_report')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('paid_at', fromDate)
        .lte('paid_at', toDate)
        .order('paid_at', { ascending: false })

      if (locationId) query = query.eq('location_id', locationId)

      const { data, error } = await query
      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Reporte de costos de producción (órdenes manufacturadas)
  async getProductionCostReport(tenantId, fromDate, toDate, locationId = null, status = null) {
    try {
      let query = supabaseService.client
        .from('vw_production_cost_report')
        .select('*')
        .eq('tenant_id', tenantId)

      // Filtrar por fecha de finalización
      if (fromDate && toDate) {
        query = query
          .gte('fecha_fin_real', fromDate)
          .lte('fecha_fin_real', toDate)
      }

      if (locationId) query = query.eq('location_id', locationId)
      if (status) query = query.eq('status', status)

      query = query.order('fecha_fin_real', { ascending: false, nullsFirst: false })

      const { data, error } = await query
      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Resumen de costos por producto manufacturado (últimos 90 días)
  async getProductionCostSummary(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from('vw_production_cost_summary_by_product')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_ordenes', { ascending: false })

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Top productos manufacturados por margen
  async getTopManufacturedByMargin(tenantId, limit = 10) {
    try {
      const { data, error } = await supabaseService.client
        .rpc('fn_top_manufactured_products_by_margin', {
          p_tenant_id: tenantId,
          p_limit: limit
        })

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }
}

export default new ReportsService()
