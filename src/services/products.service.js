import supabaseService from './supabase.service'

class ProductsService {
  constructor() {
    this.table = 'products'
    this.variantsTable = 'product_variants'
    this.barcodesTable = 'product_barcodes'
  }

  async getProducts(tenantId, page = 1, pageSize = 10, search = '') {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select(`
          *,
          category:category_id(category_id, name),
          unit:unit_id(unit_id, code, name, dian_code, is_system),
          product_variants(variant_id, sku, variant_name, cost, price, pricing_method, markup_percentage, price_rounding, rounding_to, min_stock, allow_backorder, is_active)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, to)

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  async getProductById(tenantId, productId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select(`
          *,
          category:category_id(category_id, name),
          unit:unit_id(unit_id, code, name, dian_code, is_system),
          product_variants(
            variant_id, sku, variant_name, attrs, cost, price, price_includes_tax, pricing_method, markup_percentage, price_rounding, rounding_to, min_stock, allow_backorder, is_active,
            product_barcodes(barcode_id, barcode)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('product_id', productId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async createProduct(tenantId, product) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        name: product.name,
        description: product.description || null,
        category_id: product.category_id || null,
        unit_id: product.unit_id || null,
        is_active: product.is_active !== false,
        track_inventory: product.track_inventory !== false,
        requires_expiration: product.requires_expiration || false,
        inventory_behavior: product.inventory_behavior || 'RESELL',
        production_type: product.production_type || null,
        is_component: product.is_component || false
      })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateProduct(tenantId, productId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.table, {
        name: updates.name,
        description: updates.description || null,
        category_id: updates.category_id || null,
        unit_id: updates.unit_id || null,
        is_active: updates.is_active,
        track_inventory: updates.track_inventory,
        requires_expiration: updates.requires_expiration !== undefined ? updates.requires_expiration : false,
        inventory_behavior: updates.inventory_behavior || 'RESELL',
        production_type: updates.production_type || null,
        is_component: updates.is_component || false
      }, { tenant_id: tenantId, product_id: productId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteProduct(tenantId, productId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId, product_id: productId
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ---- Variantes ----
  async createVariant(tenantId, variant) {
    try {
      const { data, error } = await supabaseService.insert(this.variantsTable, {
        tenant_id: tenantId,
        product_id: variant.product_id,
        sku: variant.sku,
        variant_name: variant.variant_name || null,
        attrs: variant.attrs || null,
        cost: variant.cost || 0,
        price: variant.price || 0,
        price_includes_tax: variant.price_includes_tax || false,
        pricing_method: variant.pricing_method || 'MARKUP',
        markup_percentage: variant.markup_percentage || 20,
        price_rounding: variant.price_rounding || 'NONE',
        rounding_to: variant.rounding_to || 1,
        min_stock: variant.min_stock || 0,
        allow_backorder: variant.allow_backorder || false,
        is_active: variant.is_active !== false,
        requires_expiration: variant.requires_expiration !== undefined ? variant.requires_expiration : null
      })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateVariant(tenantId, variantId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.variantsTable, {
        sku: updates.sku,
        variant_name: updates.variant_name || null,
        attrs: updates.attrs || null,
        cost: updates.cost || 0,
        price: updates.price || 0,
        price_includes_tax: updates.price_includes_tax || false,
        pricing_method: updates.pricing_method || 'MARKUP',
        markup_percentage: updates.markup_percentage || 20,
        price_rounding: updates.price_rounding || 'NONE',
        rounding_to: updates.rounding_to || 1,
        min_stock: updates.min_stock || 0,
        allow_backorder: updates.allow_backorder || false,
        is_active: updates.is_active,
        requires_expiration: updates.requires_expiration !== undefined ? updates.requires_expiration : null
      }, { tenant_id: tenantId, variant_id: variantId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteVariant(tenantId, variantId) {
    try {
      const { error } = await supabaseService.delete(this.variantsTable, {
        tenant_id: tenantId, variant_id: variantId
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Buscar variante por código de barras o SKU (para POS)
  async findVariantByBarcode(tenantId, barcode) {
    try {
      // Buscar por barcode
      let { data, error } = await supabaseService.client
        .from(this.barcodesTable)
        .select(`
          barcode,
          variant:variant_id(
            variant_id, sku, variant_name, cost, price, price_includes_tax, is_active, is_component,
            product:product_id(product_id, name, category_id, track_inventory, is_component)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('barcode', barcode)
        .limit(1)

      if (error) throw error
      // Filtrar componentes: no se pueden vender directamente
      if (data && data.length > 0) {
        const variant = data[0].variant
        if (variant.is_component || variant.product?.is_component) {
          return { success: false, error: 'Este producto es un componente y no puede venderse directamente' }
        }
        return { success: true, data: variant }
      }

      // Buscar por SKU
      const r = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, price_includes_tax, is_active, is_component,
          product:product_id(product_id, name, category_id, track_inventory, is_component)
        `)
        .eq('tenant_id', tenantId)
        .eq('sku', barcode)
        .limit(1)

      if (r.error) throw r.error
      if (r.data && r.data.length > 0) {
        const variant = r.data[0]
        if (variant.is_component || variant.product?.is_component) {
          return { success: false, error: 'Este producto es un componente y no puede venderse directamente' }
        }
        return { success: true, data: variant }
      }

      return { success: false, error: 'Producto no encontrado' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Buscar variantes por texto (para POS autocomplete)
  async searchVariants(tenantId, search, limit = 20, locationId = null) {
    try {
      // Buscar por SKU o nombre de variante (EXCLUIR COMPONENTES)
      const { data: byVariant, error: e1 } = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, price_includes_tax, is_active, is_component,
          product:product_id(product_id, name, is_component)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_component', false)
        .or(`sku.ilike.%${search}%,variant_name.ilike.%${search}%`)
        .limit(limit)

      if (e1) throw e1

      // Buscar por nombre de producto (EXCLUIR COMPONENTES)
      const { data: byProduct, error: e2 } = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, price_includes_tax, is_active, is_component,
          product:product_id!inner(product_id, name, is_component)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_component', false)
        .ilike('product.name', `%${search}%`)
        .limit(limit)

      if (e2) throw e2

      // Combinar y deduplicar por variant_id
      const map = new Map()
      ;[...(byVariant || []), ...(byProduct || [])].forEach(v => {
        // Filtro adicional: Excluir si el producto padre también es componente
        if (!v.is_component && !v.product?.is_component) {
          if (!map.has(v.variant_id)) map.set(v.variant_id, v)
        }
      })

      let results = Array.from(map.values()).slice(0, limit)

      // Obtener stock de cada variante si se proporciona locationId
      if (locationId && results.length > 0) {
        const variantIds = results.map(v => v.variant_id)
        const { data: stockData, error: stockError } = await supabaseService.client
          .from('stock_balances')
          .select('variant_id, on_hand, reserved')
          .eq('tenant_id', tenantId)
          .eq('location_id', locationId)
          .in('variant_id', variantIds)

        if (!stockError && stockData) {
          const stockMap = new Map(stockData.map(s => [s.variant_id, s]))
          results = results.map(v => ({
            ...v,
            stock_on_hand: stockMap.get(v.variant_id)?.on_hand || 0,
            stock_reserved: stockMap.get(v.variant_id)?.reserved || 0,
            stock_available: (stockMap.get(v.variant_id)?.on_hand || 0) - (stockMap.get(v.variant_id)?.reserved || 0)
          }))
        }
      }

      return { success: true, data: results }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }
}

export default new ProductsService()
