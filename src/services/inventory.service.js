import supabaseService from './supabase.service'

class InventoryService {
  constructor() {
    this.movesTable = 'inventory_moves'
    this.stockTable = 'stock_balances'
  }

  // Obtener stock actual por sede (usa tabla materializada stock_balances)
  async getStockBalances(tenantId, page = 1, pageSize = 20, filters = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.stockTable)
        .select(`
          *,
          location:location_id(name),
          variant:variant_id(
            sku, variant_name, cost, price,
            product:product_id(name, category:category_id(name))
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (filters.location_id) query = query.eq('location_id', filters.location_id)
      if (filters.variant_id) query = query.eq('variant_id', filters.variant_id)
      if (filters.low_stock) query = query.lte('on_hand', filters.low_stock)

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  // Kardex: movimientos de inventario
  async getInventoryMoves(tenantId, page = 1, pageSize = 20, filters = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.movesTable)
        .select(`
          *,
          location:location_id(name),
          to_location:to_location_id(name),
          variant:variant_id(
            sku, variant_name,
            product:product_id(name)
          ),
          created_by_user:created_by(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.location_id) query = query.eq('location_id', filters.location_id)
      if (filters.variant_id) query = query.eq('variant_id', filters.variant_id)
      if (filters.move_type) query = query.eq('move_type', filters.move_type)
      if (filters.from_date) query = query.gte('created_at', filters.from_date)
      if (filters.to_date) query = query.lte('created_at', filters.to_date)

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  // Refrescar alertas de stock manualmente (respaldo a triggers)
  async refreshStockAlerts() {
    try {
      const { error } = await supabaseService.client.rpc('fn_refresh_stock_alerts')
      if (error) {
        console.warn('Error refrescando alertas de stock:', error.message)
      }
    } catch (error) {
      console.warn('Error refrescando alertas de stock:', error.message)
    }
  }

  // Crear movimiento manual (ajuste)
  async createManualAdjustment(tenantId, adjustment) {
    try {
      // Insertar movimiento
      const moveData = {
        tenant_id: tenantId,
        move_type: 'ADJUSTMENT',
        location_id: adjustment.location_id,
        variant_id: adjustment.variant_id,
        quantity: Math.abs(adjustment.quantity),
        unit_cost: adjustment.unit_cost || 0,
        source: 'MANUAL',
        source_id: null,
        note: adjustment.note || null,
        created_by: adjustment.created_by
      }

      const { data, error } = await supabaseService.insert(this.movesTable, moveData)
      if (error) throw error

      // Actualizar stock_balances con delta
      const delta = adjustment.is_increase ? Math.abs(adjustment.quantity) : -Math.abs(adjustment.quantity)
      const { error: stockErr } = await supabaseService.client.rpc('fn_apply_stock_delta', {
        p_tenant: tenantId,
        p_location: adjustment.location_id,
        p_variant: adjustment.variant_id,
        p_delta: delta
      })

      if (stockErr) throw stockErr
      
      // Refrescar alertas después de cambios en stock
      await this.refreshStockAlerts()
      
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Crear traslado entre sedes
  async createTransfer(tenantId, transfer) {
    try {
      // Movimiento OUT de origen
      await supabaseService.insert(this.movesTable, {
        tenant_id: tenantId,
        move_type: 'TRANSFER_OUT',
        location_id: transfer.from_location_id,
        to_location_id: transfer.to_location_id,
        variant_id: transfer.variant_id,
        quantity: transfer.quantity,
        unit_cost: transfer.unit_cost || 0,
        source: 'TRANSFER',
        note: transfer.note || null,
        created_by: transfer.created_by
      })

      // Movimiento IN en destino
      await supabaseService.insert(this.movesTable, {
        tenant_id: tenantId,
        move_type: 'TRANSFER_IN',
        location_id: transfer.to_location_id,
        variant_id: transfer.variant_id,
        quantity: transfer.quantity,
        unit_cost: transfer.unit_cost || 0,
        source: 'TRANSFER',
        note: transfer.note || null,
        created_by: transfer.created_by
      })

      // Actualizar stock en ambas sedes
      await supabaseService.client.rpc('fn_apply_stock_delta', {
        p_tenant: tenantId,
        p_location: transfer.from_location_id,
        p_variant: transfer.variant_id,
        p_delta: -transfer.quantity
      })
      await supabaseService.client.rpc('fn_apply_stock_delta', {
        p_tenant: tenantId,
        p_location: transfer.to_location_id,
        p_variant: transfer.variant_id,
        p_delta: transfer.quantity
      })

      // Refrescar alertas después de traslado
      await this.refreshStockAlerts()

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Crear ingreso por compra
  async createPurchaseEntry(tenantId, entry) {
    try {
      const { data, error } = await supabaseService.insert(this.movesTable, {
        tenant_id: tenantId,
        move_type: 'PURCHASE_IN',
        location_id: entry.location_id,
        variant_id: entry.variant_id,
        quantity: entry.quantity,
        unit_cost: entry.unit_cost || 0,
        source: 'PURCHASE',
        note: entry.note || null,
        created_by: entry.created_by
      })

      if (error) throw error

      await supabaseService.client.rpc('fn_apply_stock_delta', {
        p_tenant: tenantId,
        p_location: entry.location_id,
        p_variant: entry.variant_id,
        p_delta: entry.quantity
      })

      // Refrescar alertas después de entrada por compra
      await this.refreshStockAlerts()

      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Actualizar stock mínimo
  async updateMinStock(tenantId, variantId, minStock) {
    try {
      const { error } = await supabaseService.client.rpc('fn_update_min_stock', {
        p_tenant: tenantId,
        p_variant: variantId,
        p_min_stock: minStock
      })

      if (error) throw error
      
      // Refrescar alertas después de cambiar stock mínimo
      await this.refreshStockAlerts()
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Obtener productos bajo stock mínimo (con alertas)
  async getStockAlerts(tenantId, filters = {}) {
    try {
      let query = supabaseService.client
        .from('vw_stock_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('alert_level', ['OUT_OF_STOCK', 'LOW_STOCK', 'NO_AVAILABLE', 'LOW_AVAILABLE'])
        .order('alert_level')
        .order('on_hand')

      if (filters.location_id) query = query.eq('location_id', filters.location_id)
      if (filters.alert_level) query = query.eq('alert_level', filters.alert_level)

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }

  // Obtener historial de alertas
  async getAlertLog(tenantId, page = 1, pageSize = 50, filters = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from('stock_alert_log')
        .select(`
          *,
          location:location_id(name),
          variant:variant_id(
            sku, variant_name,
            product:product_id(name)
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.location_id) query = query.eq('location_id', filters.location_id)
      if (filters.alert_level) query = query.eq('alert_level', filters.alert_level)

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }
}

export default new InventoryService()
