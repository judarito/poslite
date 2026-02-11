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
}

export default new PurchasesService()
