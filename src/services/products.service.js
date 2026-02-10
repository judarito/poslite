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
          product_variants(variant_id, sku, variant_name, cost, price, is_active)
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
          product_variants(
            variant_id, sku, variant_name, attrs, cost, price, is_active,
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
        is_active: product.is_active !== false,
        track_inventory: product.track_inventory !== false
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
        is_active: updates.is_active,
        track_inventory: updates.track_inventory
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
        is_active: variant.is_active !== false
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
        is_active: updates.is_active
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
            variant_id, sku, variant_name, cost, price, is_active,
            product:product_id(product_id, name, category_id, track_inventory)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('barcode', barcode)
        .limit(1)

      if (error) throw error
      if (data && data.length > 0) return { success: true, data: data[0].variant }

      // Buscar por SKU
      const r = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, is_active,
          product:product_id(product_id, name, category_id, track_inventory)
        `)
        .eq('tenant_id', tenantId)
        .eq('sku', barcode)
        .limit(1)

      if (r.error) throw r.error
      if (r.data && r.data.length > 0) return { success: true, data: r.data[0] }

      return { success: false, error: 'Producto no encontrado' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Buscar variantes por texto (para POS autocomplete)
  async searchVariants(tenantId, search, limit = 20) {
    try {
      // Buscar por SKU o nombre de variante
      const { data: byVariant, error: e1 } = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, is_active,
          product:product_id(product_id, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`sku.ilike.%${search}%,variant_name.ilike.%${search}%`)
        .limit(limit)

      if (e1) throw e1

      // Buscar por nombre de producto
      const { data: byProduct, error: e2 } = await supabaseService.client
        .from(this.variantsTable)
        .select(`
          variant_id, sku, variant_name, cost, price, is_active,
          product:product_id!inner(product_id, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .ilike('product.name', `%${search}%`)
        .limit(limit)

      if (e2) throw e2

      // Combinar y deduplicar por variant_id
      const map = new Map()
      ;[...(byVariant || []), ...(byProduct || [])].forEach(v => {
        if (!map.has(v.variant_id)) map.set(v.variant_id, v)
      })

      return { success: true, data: Array.from(map.values()).slice(0, limit) }
    } catch (error) {
      return { success: false, error: error.message, data: [] }
    }
  }
}

export default new ProductsService()
