import supabaseService from './supabase.service'

class PaymentMethodsService {
  constructor() {
    this.table = 'payment_methods'
  }

  // Obtener métodos de pago con paginación
  async getPaymentMethods(tenantId, page = 1, pageSize = 10, search = '', options = {}) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, to)

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
      }

      // Filtrar métodos activos si se especifica
      if (options.activeOnly) {
        query = query.eq('is_active', true)
      }

      // Excluir códigos específicos (ej: LAYAWAY para dropdowns)
      if (options.excludeCodes && Array.isArray(options.excludeCodes) && options.excludeCodes.length > 0) {
        query = query.not('code', 'in', `(${options.excludeCodes.join(',')})`)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        success: true,
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0
      }
    }
  }

  /**
   * Obtener métodos de pago para usar en dropdowns
   * Excluye automáticamente LAYAWAY (método interno) y devuelve solo activos
   */
  async getPaymentMethodsForDropdown(tenantId, page = 1, pageSize = 100) {
    return this.getPaymentMethods(tenantId, page, pageSize, '', {
      activeOnly: true,
      excludeCodes: ['LAYAWAY']
    })
  }

  // Crear método de pago
  async createPaymentMethod(tenantId, paymentMethod) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        code: paymentMethod.code.toUpperCase(),
        name: paymentMethod.name,
        is_active: paymentMethod.is_active !== false
      })

      if (error) throw error

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error creating payment method:', error)
      return { success: false, error: error.message }
    }
  }

  // Actualizar método de pago
  async updatePaymentMethod(tenantId, paymentMethodId, updates) {
    try {
      const updateData = {
        name: updates.name,
        is_active: updates.is_active
      }

      if (updates.code) {
        updateData.code = updates.code.toUpperCase()
      }

      const { data, error } = await supabaseService.update(
        this.table,
        updateData,
        {
          tenant_id: tenantId,
          payment_method_id: paymentMethodId
        }
      )

      if (error) throw error

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating payment method:', error)
      return { success: false, error: error.message }
    }
  }

  // Eliminar método de pago
  async deletePaymentMethod(tenantId, paymentMethodId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId,
        payment_method_id: paymentMethodId
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      return { success: false, error: error.message }
    }
  }

  // Verificar si el código ya existe
  async checkCodeExists(tenantId, code, excludeId = null) {
    try {
      let query = supabaseService.client
        .from(this.table)
        .select('payment_method_id')
        .eq('tenant_id', tenantId)
        .eq('code', code.toUpperCase())

      if (excludeId) {
        query = query.neq('payment_method_id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error

      return data && data.length > 0
    } catch (error) {
      console.error('Error checking code:', error)
      return false
    }
  }
}

export default new PaymentMethodsService()
