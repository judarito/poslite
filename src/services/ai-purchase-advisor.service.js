/**
 * AI Purchase Advisor Service
 * Utiliza DeepSeek para generar sugerencias inteligentes de compra
 * basadas en históricos de ventas, inventario y tendencias
 * Con sistema de caché inteligente para optimizar costos
 */

import AICacheManager from '../utils/aiCache.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const CACHE_TTL_HOURS = 12; // Caché de 12 horas para sugerencias de compra

class AIPurchaseAdvisorService {
  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️ VITE_DEEPSEEK_API_KEY no está configurada. El análisis IA no estará disponible.');
    }
  }

  /**
   * Verifica si el servicio de IA está disponible
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Genera sugerencias inteligentes de compra usando IA
   * @param {string} tenantId - ID del tenant
   * @param {Array} rotationData - Datos de rotación de inventario
   * @param {Array} suggestions - Sugerencias base del sistema
   * @param {Object} options - Opciones adicionales (forceRefresh: boolean)
   */
  async generatePurchaseRecommendations(tenantId, rotationData, suggestions, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Servicio de IA no disponible. Configure VITE_DEEPSEEK_API_KEY.');
    }

    try {
      // Generar clave de caché
      const cacheParams = {
        suggestionCount: suggestions.length,
        rotationDataHash: this._hashRotationData(rotationData),
        maxBudget: options.maxBudget
      };
      const cacheKey = AICacheManager.generateKey('purchase', tenantId, cacheParams);

      // Verificar caché (a menos que se fuerce refresh)
      if (!options.forceRefresh) {
        const cached = AICacheManager.get(cacheKey);
        if (cached) {
          console.log('📦 Usando análisis de compra desde caché');
          return {
            ...cached,
            from_cache: true,
            cached_at: new Date().toISOString()
          };
        }
      }

      console.log('🚀 Consultando API de DeepSeek...');

      const prompt = this._buildPrompt(rotationData, suggestions, options);
      
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            {
              role: 'system',
              content: this._getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Más determinístico para análisis de negocio
          max_tokens: 4000,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('Respuesta vacía de DeepSeek');
      }

      const result = this._parseAIResponse(aiResponse, suggestions);

      // Guardar en caché
      AICacheManager.set(cacheKey, result, CACHE_TTL_HOURS);

      return {
        ...result,
        from_cache: false
      };
    } catch (error) {
      console.error('Error en AI Purchase Advisor:', error);
      throw error;
    }
  }

  /**
   * Prompt del sistema que define el comportamiento de la IA
   */
  _getSystemPrompt() {
    return `Eres un asesor experto en gestión de inventario para PYMES. Tu objetivo es analizar datos de ventas e inventario para generar recomendaciones inteligentes de compra.

Debes considerar:
- Tendencias de demanda (crecimiento/decrecimiento)
- Estacionalidad y patrones de compra
- Velocidad de rotación de productos
- Riesgo de agotamiento vs. sobrestock
- Rentabilidad y márgenes
- Productos complementarios o sustitutos
- Optimización de capital de trabajo

Tu respuesta debe ser en formato JSON estructurado con:
1. "enhanced_suggestions": Array de productos con análisis mejorado
2. "insights": Array de insights estratégicos
3. "warnings": Array de alertas importantes
4. "optimization_tips": Consejos de optimización

Sé preciso, práctico y enfocado en resultados accionables para el negocio.`;
  }

  /**
   * Construye el prompt con los datos del negocio
   */
  _buildPrompt(rotationData, suggestions, options) {
    const { businessContext, maxBudget, priorityLevel } = options;

    // Preparar resumen de datos
    const summaryStats = this._generateSummaryStats(rotationData, suggestions);
    
    // Top productos por diferentes criterios
    const topByDemand = this._getTopProducts(rotationData, 'sold_last_30d', 10);
    const topByGrowth = this._getTopProducts(rotationData, 'trend_percentage', 10);
    const outOfStock = suggestions.filter(s => s.priority === 1).slice(0, 10);

    return `Analiza los siguientes datos de inventario y ventas para generar recomendaciones inteligentes de compra:

## CONTEXTO DEL NEGOCIO
${businessContext || 'Tienda minorista general'}

## ESTADÍSTICAS GENERALES
- Total de productos activos: ${rotationData.length}
- Productos con sugerencia de compra: ${suggestions.length}
- Productos críticos (agotados): ${suggestions.filter(s => s.priority === 1).length}
- Productos con alta prioridad: ${suggestions.filter(s => s.priority === 2).length}
- Inversión estimada total: $${summaryStats.totalInvestment.toLocaleString()}
${maxBudget ? `- Presupuesto disponible: $${maxBudget.toLocaleString()}` : ''}

## TOP 10 PRODUCTOS POR DEMANDA (últimos 30 días)
${topByDemand.map((p, i) => `${i + 1}. ${p.product_name} ${p.variant_name || ''} - ${p.sold_last_30d} unidades vendidas, ${p.current_stock} en stock`).join('\n')}

## TOP 10 PRODUCTOS CON MAYOR CRECIMIENTO
${topByGrowth.map((p, i) => `${i + 1}. ${p.product_name} ${p.variant_name || ''} - Crecimiento: ${p.trend_percentage}%, Stock actual: ${p.current_stock}`).join('\n')}

## PRODUCTOS CRÍTICOS (AGOTADOS CON DEMANDA ACTIVA)
${outOfStock.length > 0 ? outOfStock.map((p, i) => `${i + 1}. ${p.product_name} ${p.variant_name || ''} - ${p.reason} - Sugerido: ${p.suggested_order_qty} unidades ($${p.estimated_cost})`).join('\n') : 'No hay productos críticos'}

## SUGERENCIAS BASE DEL SISTEMA
${suggestions.slice(0, 20).map(s => `- ${s.product_name} ${s.variant_name || ''}: ${s.reason} | Stock: ${s.current_stock} | Sugerido: ${s.suggested_order_qty} unidades | Demanda diaria: ${s.avg_daily_demand} | Costo: $${s.estimated_cost}`).join('\n')}

## ANÁLISIS REQUERIDO
Por favor genera:

1. **Enhanced Suggestions**: Mejora las sugerencias del sistema considerando:
   - Priorización inteligente basada en ROI y urgencia
   - Ajuste de cantidades considerando tendencias y estacionalidad
   - Agrupación por categorías o proveedores si aplica
   - Identificación de oportunidades (productos en crecimiento)

2. **Strategic Insights**: Proporciona 3-5 insights clave como:
   - Patrones de demanda detectados
   - Oportunidades de mejora
   - Riesgos identificados
   - Recomendaciones estratégicas

3. **Warnings**: Alertas importantes sobre:
   - Productos con riesgo alto de agotamiento
   - Posible sobrestock
   - Anomalías en tendencias

4. **Optimization Tips**: 2-3 consejos prácticos para optimizar el inventario

Responde ÚNICAMENTE con JSON válido en este formato:
{
  "enhanced_suggestions": [
    {
      "variant_id": "uuid",
      "product_name": "string",
      "ai_priority": 1-5,
      "ai_suggested_qty": number,
      "ai_reasoning": "string explicando el razonamiento",
      "confidence": 0.0-1.0,
      "estimated_roi_days": number
    }
  ],
  "insights": [
    {
      "type": "opportunity|risk|pattern",
      "title": "string",
      "description": "string",
      "impact": "high|medium|low"
    }
  ],
  "warnings": [
    {
      "severity": "critical|high|medium",
      "product_name": "string",
      "message": "string"
    }
  ],
  "optimization_tips": [
    {
      "title": "string",
      "description": "string",
      "expected_benefit": "string"
    }
  ]
}`;
  }

  /**
   * Genera estadísticas resumidas
   */
  _generateSummaryStats(rotationData, suggestions) {
    return {
      totalProducts: rotationData.length,
      totalSuggestions: suggestions.length,
      totalInvestment: suggestions.reduce((sum, s) => sum + (s.estimated_cost || 0), 0),
      criticalCount: suggestions.filter(s => s.priority === 1).length,
      highPriorityCount: suggestions.filter(s => s.priority === 2).length,
      avgDemand: rotationData.reduce((sum, p) => sum + (p.avg_daily_demand || 0), 0) / rotationData.length
    };
  }

  /**
   * Obtiene top productos según un criterio
   */
  _getTopProducts(rotationData, field, limit = 10) {
    return [...rotationData]
      .filter(p => p[field] != null && p[field] > 0)
      .sort((a, b) => (b[field] || 0) - (a[field] || 0))
      .slice(0, limit);
  }

  /**
   * Parsea la respuesta JSON de la IA
   */
  _parseAIResponse(aiResponse, originalSuggestions) {
    try {
      // Extraer JSON de la respuesta (por si viene con texto adicional)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      
      const parsed = JSON.parse(jsonStr);

      // Validar estructura
      if (!parsed.enhanced_suggestions || !Array.isArray(parsed.enhanced_suggestions)) {
        throw new Error('Estructura de respuesta inválida');
      }

      // Enriquecer las sugerencias originales con el análisis de IA
      const enhancedSuggestions = originalSuggestions.map(original => {
        const aiEnhancement = parsed.enhanced_suggestions.find(
          ai => ai.variant_id === original.variant_id
        );

        if (aiEnhancement) {
          return {
            ...original,
            ai_priority: aiEnhancement.ai_priority,
            ai_suggested_qty: aiEnhancement.ai_suggested_qty,
            ai_reasoning: aiEnhancement.ai_reasoning,
            ai_confidence: aiEnhancement.confidence,
            ai_estimated_roi_days: aiEnhancement.estimated_roi_days,
            has_ai_analysis: true
          };
        }

        return original;
      });

      return {
        suggestions: enhancedSuggestions,
        insights: parsed.insights || [],
        warnings: parsed.warnings || [],
        optimization_tips: parsed.optimization_tips || [],
        raw_response: parsed
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', aiResponse);
      throw new Error(`Error al parsear respuesta de IA: ${error.message}`);
    }
  }

  /**
   * Genera un resumen ejecutivo del análisis
   */
  generateExecutiveSummary(aiAnalysis) {
    const { suggestions, insights, warnings } = aiAnalysis;

    const criticalProducts = suggestions.filter(s => s.ai_priority === 1 || s.priority === 1);
    const totalInvestment = suggestions.reduce((sum, s) => sum + (s.ai_suggested_qty || s.suggested_order_qty) * (s.unit_cost || 0), 0);
    const highConfidence = suggestions.filter(s => (s.ai_confidence || 0) > 0.8);

    return {
      critical_products_count: criticalProducts.length,
      total_investment: totalInvestment,
      high_confidence_count: highConfidence.length,
      key_insight: insights.find(i => i.impact === 'high')?.description || 'Sin insights de alto impacto',
      top_warning: warnings.find(w => w.severity === 'critical')?.message || 'Sin alertas críticas',
      recommendation: this._generateTopRecommendation(suggestions, insights)
    };
  }

  /**
   * Genera la recomendación principal
   */
  _generateTopRecommendation(suggestions, insights) {
    const urgentProducts = suggestions.filter(s => 
      (s.ai_priority === 1 || s.priority === 1) && 
      (s.ai_confidence || 0) > 0.7
    );

    if (urgentProducts.length > 0) {
      return `Atención inmediata a ${urgentProducts.length} productos críticos que requieren reabastecimiento urgente.`;
    }

    const growthOpportunity = insights.find(i => i.type === 'opportunity');
    if (growthOpportunity) {
      return growthOpportunity.description;
    }

    return 'Mantener niveles actuales de inventario con monitoreo continuo.';
  }

  /**
   * Genera un hash simple de los datos de rotación para caché
   * @private
   */
  _hashRotationData(rotationData) {
    // Usar solo métricas clave para el hash (no todo el objeto)
    const key = rotationData.slice(0, 20).map(p => 
      `${p.variant_id}_${p.current_stock}_${p.sold_last_30d}`
    ).join('|');
    
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
}

export default new AIPurchaseAdvisorService();
