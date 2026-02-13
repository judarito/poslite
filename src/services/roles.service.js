import supabaseService from './supabase.service'

class RolesService {
  constructor() {
    this.table = 'roles'
    this.permissionsTable = 'permissions'
    this.rolePermissionsTable = 'role_permissions'
    this.userRolesTable = 'user_roles'
  }

  async getRoles(tenantId, page = 1, pageSize = 10, search = '') {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabaseService.client
        .from(this.table)
        .select(`
          *,
          role_permissions(permission_id, permissions:permission_id(code, description))
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, to)

      if (search) query = query.ilike('name', `%${search}%`)

      const { data, error, count } = await query
      if (error) throw error
      return { success: true, data: data || [], total: count || 0 }
    } catch (error) {
      return { success: false, error: error.message, data: [], total: 0 }
    }
  }

  async createRole(tenantId, role) {
    try {
      const { data, error } = await supabaseService.insert(this.table, {
        tenant_id: tenantId,
        name: role.name
      })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateRole(tenantId, roleId, updates) {
    try {
      const { data, error } = await supabaseService.update(this.table, {
        name: updates.name
      }, { tenant_id: tenantId, role_id: roleId })
      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async deleteRole(tenantId, roleId) {
    try {
      const { error } = await supabaseService.delete(this.table, {
        tenant_id: tenantId, role_id: roleId
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Permisos
  async getAllPermissions() {
    try {
      const { data, error } = await supabaseService.client
        .from(this.permissionsTable)
        .select('*')
        .order('code')

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  async getRolePermissions(tenantId, roleId) {
    try {
      if (!tenantId) throw new Error('Tenant ID is required')
      
      const { data, error } = await supabaseService.client
        .from(this.rolePermissionsTable)
        .select(`
          permission_id,
          role:role_id!inner(role_id, tenant_id)
        `)
        .eq('role.tenant_id', tenantId)
        .eq('role_id', roleId)

      if (error) throw error
      return { success: true, data: (data || []).map(d => d.permission_id) }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  async setRolePermissions(tenantId, roleId, permissionIds) {
    try {
      if (!tenantId) throw new Error('Tenant ID is required')
      
      // Validar que el role pertenece al tenant
      const { data: role, error: roleError } = await supabaseService.client
        .from(this.table)
        .select('tenant_id')
        .eq('role_id', roleId)
        .single()
      
      if (roleError) throw roleError
      if (!role || role.tenant_id !== tenantId) {
        throw new Error('Unauthorized: Role does not belong to tenant')
      }
      
      // Eliminar todos los permisos existentes
      await supabaseService.client
        .from(this.rolePermissionsTable)
        .delete()
        .eq('role_id', roleId)

      // Insertar nuevos
      if (permissionIds.length > 0) {
        const rows = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }))
        const { error } = await supabaseService.client
          .from(this.rolePermissionsTable)
          .insert(rows)

        if (error) throw error
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // User Roles
  async getUserRoles(tenantId, userId) {
    try {
      if (!tenantId) throw new Error('Tenant ID is required')
      
      const { data, error } = await supabaseService.client
        .from(this.userRolesTable)
        .select(`
          role_id,
          roles:role_id!inner(role_id, name, tenant_id)
        `)
        .eq('roles.tenant_id', tenantId)
        .eq('user_id', userId)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  async setUserRoles(tenantId, userId, roleIds) {
    try {
      if (!tenantId) throw new Error('Tenant ID is required')
      
      // Validar que el usuario pertenece al tenant
      const { data: user, error: userError } = await supabaseService.client
        .from('users')
        .select('tenant_id')
        .eq('user_id', userId)
        .single()
      
      if (userError) throw userError
      if (!user || user.tenant_id !== tenantId) {
        throw new Error('Unauthorized: User does not belong to tenant')
      }
      
      // Validar que todos los roles pertenecen al tenant
      if (roleIds.length > 0) {
        const { data: validRoles, error: rolesError } = await supabaseService.client
          .from(this.table)
          .select('role_id')
          .eq('tenant_id', tenantId)
          .in('role_id', roleIds)
        
        if (rolesError) throw rolesError
        if (validRoles.length !== roleIds.length) {
          throw new Error('Some roles do not belong to this tenant')
        }
      }
      
      // Eliminar roles existentes
      await supabaseService.client
        .from(this.userRolesTable)
        .delete()
        .eq('user_id', userId)

      // Insertar nuevos roles
      if (roleIds.length > 0) {
        const rows = roleIds.map(rid => ({ user_id: userId, role_id: rid }))
        const { error } = await supabaseService.client
          .from(this.userRolesTable)
          .insert(rows)

        if (error) throw error
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

export default new RolesService()
