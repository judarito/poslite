import supabaseService from './supabase.service'

class CategoriesService {
  constructor() {
    this.table = 'categories'
  }

  async getCategories(tenantId, page = 1, pageSize = 10, search = '') {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select('*, parent:parent_category_id(category_id, name)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, to)

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const { data, error, count } = await query
      if (error) throw error

      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  async getAllCategories(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select('category_id, name, parent_category_id')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  async createCategory(tenantId, category) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        name: category.name,
        parent_category_id: category.parent_category_id || null
      })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateCategory(tenantId, categoryId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.table, {
        name: updates.name,
        parent_category_id: updates.parent_category_id || null
      }, { tenant_id: tenantId, category_id: categoryId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteCategory(tenantId, categoryId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId, category_id: categoryId
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default new CategoriesService()
