import supabaseService from './supabase.service'
import aiPurchaseAdvisor from './ai-purchase-advisor.service'

class PurchasesService {
  /**
   * Obtener sugerencias inteligentes de compra
   * @param {string} tenantId - ID del tenant
   * @param {number} minPriority - Prioridad mínima (1=Crítico, 2=Alto, 3=Medio)
   * @param {number} limit - Límite de resultados
   */
  async getPurchaseSuggestions(tenantId, minPriority = 3, limit = 50) {
    try {
      const { data, error } = await supabaseService.client.rpc('fn_get_purchase_suggestions', {
        p_tenant_id: tenantId,
        p_min_priority: minPriority,
        p_limit: limit
      })

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('Error getting purchase suggestions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Obtener análisis de rotación de inventario
   * @param {string} tenantId - ID del tenant
   */
  async getInventoryRotationAnalysis(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from('vw_inventory_rotation_analysis')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('days_of_stock_remaining', { ascending: true, nullsFirst: false })
        .limit(100)

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('Error getting inventory rotation analysis:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Obtener análisis de IA para sugerencias de compra
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opciones del análisis
   * @param {string} options.businessContext - Contexto del negocio
   * @param {number} options.maxBudget - Presupuesto máximo disponible
   * @param {number} options.priorityLevel - Nivel de prioridad mínimo
   */
  async getAIPurchaseAnalysis(tenantId, options = {}) {
    try {
      if (!aiPurchaseAdvisor.isAvailable()) {
        return {
          success: false,
          error: 'Servicio de IA no disponible. Configure VITE_DEEPSEEK_API_KEY.'
        }
      }

      // Obtener datos base
      const [suggestionsResult, rotationResult] = await Promise.all([
        this.getPurchaseSuggestions(tenantId, options.priorityLevel || 3, 100),
        this.getInventoryRotationAnalysis(tenantId)
      ])

      if (!suggestionsResult.success || !rotationResult.success) {
        throw new Error('Error obteniendo datos base para análisis')
      }

      // Llamar a la IA para análisis avanzado
      const aiAnalysis = await aiPurchaseAdvisor.generatePurchaseRecommendations(
        tenantId,
        rotationResult.data,
        suggestionsResult.data,
        options
      )

      // Generar resumen ejecutivo
      const executiveSummary = aiPurchaseAdvisor.generateExecutiveSummary(aiAnalysis)

      return {
        success: true,
        data: {
          ...aiAnalysis,
          executive_summary: executiveSummary,
          base_suggestions: suggestionsResult.data,
          analysis_timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error getting AI purchase analysis:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Verificar si el servicio de IA está disponible
   */
  isAIAvailable() {
    return aiPurchaseAdvisor.isAvailable()
  }

  /**
   * Obtener historial de compras con paginación
   * @param {string} tenantId - ID del tenant
   * @param {number} page - Página actual
   * @param {number} pageSize - Tamaño de página
   * @param {Object} filters - Filtros opcionales
   */
  async getPurchases(tenantId, page = 1, pageSize = 20, filters = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from('inventory_moves')
        .select(`
          inventory_move_id,
          move_type,
          location_id,
          variant_id,
          quantity,
          unit_cost,
          created_at,
          note,
          location:location_id(name),
          variant:variant_id(
            sku,
            variant_name,
            product:product_id(name)
          ),
          created_by_user:created_by(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('move_type', 'PURCHASE_IN')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id)
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date)
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date)
      }

      const { data, error, count } = await query

      if (error) throw error

      // Transformar datos para mejor acceso
      const purchases = (data || []).map(item => ({
        purchase_id: item.inventory_move_id,
        sku: item.variant?.sku || '',
        variant_name: item.variant?.variant_name || '',
        product_name: item.variant?.product?.name || '',
        location_name: item.location?.name || '',
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.quantity * item.unit_cost,
        purchased_at: item.created_at,
        purchased_by_name: item.created_by_user?.full_name || '',
        note: item.note,
        // Para compatibilidad con cálculo de precio actual
        current_price: item.variant?.price || 0
      }))

      return {
        success: true,
        data: purchases,
        total: count || 0
      }
    } catch (error) {
      console.error('Error getting purchases:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0
      }
    }
  }

  /**
   * Obtener detalle completo de una compra con todas sus líneas
   * @param {string} tenantId - ID del tenant
   * @param {string} purchaseId - ID de la compra (source_id)
   */
  async getPurchaseDetail(tenantId, purchaseId) {
    try {
      const { data, error } = await supabaseService.client
        .from('inventory_moves')
        .select(`
          inventory_move_id,
          move_type,
          location_id,
          variant_id,
          quantity,
          unit_cost,
          created_at,
          note,
          source_id,
          location:location_id(name),
          variant:variant_id(
            sku,
            variant_name,
            product:product_id(name)
          ),
          created_by_user:created_by(full_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('move_type', 'PURCHASE_IN')
        .eq('source_id', purchaseId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Compra no encontrada'
        }
      }

      const firstLine = data[0]
      
      // Transformar líneas
      const lines = data.map(item => ({
        line_id: item.inventory_move_id,
        variant_id: item.variant_id,
        sku: item.variant?.sku || '',
        variant_name: item.variant?.variant_name || '',
        product_name: item.variant?.product?.name || '',
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        line_total: item.quantity * item.unit_cost
      }))

      // Calcular totales
      const total = lines.reduce((sum, line) => sum + line.line_total, 0)

      return {
        success: true,
        data: {
          purchase_id: purchaseId,
          location_id: firstLine.location_id,
          location_name: firstLine.location?.name || '',
          created_at: firstLine.created_at,
          created_by_name: firstLine.created_by_user?.full_name || '',
          note: firstLine.note || '',
          lines: lines,
          total: total,
          items_count: lines.length
        }
      }
    } catch (error) {
      console.error('Error getting purchase detail:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new PurchasesService()
