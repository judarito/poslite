import supabaseService from './supabase.service'

class CustomersService {
  constructor() {
    this.table = 'customers'
    this.creditTable = 'customer_credit_accounts'
    this.creditMovesTable = 'customer_credit_movements'
  }

  async getCustomers(tenantId, page = 1, pageSize = 10, search = '') {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select(`
          *,
          customer_credit_accounts(credit_account_id, credit_limit, current_balance, is_active)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('full_name', { ascending: true })
        .range(from, to)

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,document.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  async searchCustomers(tenantId, search, limit = 20) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select('customer_id, full_name, document, phone')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`full_name.ilike.%${search}%,document.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(limit)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  async createCustomer(tenantId, customer) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        document: customer.document || null,
        full_name: customer.full_name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        is_active: customer.is_active !== false
      })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateCustomer(tenantId, customerId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.table, {
        document: updates.document || null,
        full_name: updates.full_name,
        phone: updates.phone || null,
        email: updates.email || null,
        address: updates.address || null,
        is_active: updates.is_active
      }, { tenant_id: tenantId, customer_id: customerId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteCustomer(tenantId, customerId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId, customer_id: customerId
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ---- Créditos ----
  async getCreditAccount(tenantId, customerId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.creditTable)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .maybeSingle()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async upsertCreditAccount(tenantId, customerId, creditLimit) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.creditTable)
        .upsert({
          tenant_id: tenantId,
          customer_id: customerId,
          credit_limit: creditLimit,
          is_active: true
        }, { onConflict: 'tenant_id,customer_id' })
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getCreditMovements(tenantId, creditAccountId, page = 1, pageSize = 20) {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabaseService.client
        .from(this.creditMovesTable)
        .select('*, created_by_user:created_by(full_name)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('credit_account_id', creditAccountId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, data: [], total: 0, error: error.message }
    }
  }

  async addCreditPayment(tenantId, creditAccountId, amount, note, userId) {
    try {
      const { data, error } = await supabaseService.insert(this.creditMovesTable, {
        tenant_id: tenantId,
        credit_account_id: creditAccountId,
        source: 'PAYMENT',
        amount: -Math.abs(amount),
        note: note || 'Abono',
        created_by: userId
      })
      if (error) throw error

      // Actualizar saldo
      await supabaseService.client.rpc('', {}) // Se maneja con trigger o manual
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default new CustomersService()
