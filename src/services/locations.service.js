import supabaseService from './supabase.service'

class LocationsService {
  constructor() {
    this.table = 'locations'
  }

  // Obtener sedes con paginación
  async getLocations(tenantId, page = 1, pageSize = 10, search = '') {
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
        query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,type.ilike.%${search}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        success: true,
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0
      }
    }
  }

  // Crear sede
  async createLocation(tenantId, location) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        name: location.name,
        type: location.type || 'STORE',
        address: location.address || null,
        is_active: location.is_active !== false
      })

      if (error) throw error

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error creating location:', error)
      return { success: false, error: error.message }
    }
  }

  // Actualizar sede
  async updateLocation(tenantId, locationId, updates) {
    try {
      const updateData = {
        name: updates.name,
        type: updates.type || 'STORE',
        address: updates.address || null,
        is_active: updates.is_active
      }

      const { data, error } = await supabaseService.update(
        this.table,
        updateData,
        {
          tenant_id: tenantId,
          location_id: locationId
        }
      )

      if (error) throw error

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating location:', error)
      return { success: false, error: error.message }
    }
  }

  // Eliminar sede
  async deleteLocation(tenantId, locationId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId,
        location_id: locationId
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting location:', error)
      return { success: false, error: error.message }
    }
  }

  // Obtener todas las sedes activas (sin paginación)
  async getActiveLocations(tenantId) {
    try {
      const { data, error } = await supabaseService.client
        .from(this.table)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('Error fetching active locations:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }
}

export default new LocationsService()
