/**
 * Helper functions para validar Super Admin
 * Se usa en router guard (no puede usar composables)
 */
import { supabase } from '@/plugins/supabase'

/**
 * Verifica si el usuario actual es Super Admin
 * Super Admin = Usuario autenticado pero sin registro en tabla users
 */
export const isSuperAdmin = async () => {
  try {
    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return false
    }

    // 2. Verificar si tiene perfil en tabla users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    // Si no encuentra perfil = Super Admin
    // Si profileError.code === 'PGRST116' significa no hay registros
    if (profileError && profileError.code === 'PGRST116') {
      return true
    }

    // Si encontró perfil = Usuario normal con tenant
    return !profile
    
  } catch (error) {
    console.error('Error checking super admin status:', error)
    return false
  }
}

/**
 * Lista de emails específicos que pueden ser super admin (opcional)
 */
const ALLOWED_SUPER_ADMIN_EMAILS = [
  // 'admin@sistema.com',
  // 'superadmin@empresa.com'
]

/**
 * Verifica si el email del usuario está en la lista de super admins
 */
export const isSuperAdminByEmail = async () => {
  if (ALLOWED_SUPER_ADMIN_EMAILS.length === 0) return true // Sin restricción

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false

    return ALLOWED_SUPER_ADMIN_EMAILS.includes(user.email)
  } catch (error) {
    console.error('Error checking super admin email:', error)
    return false
  }
}

/**
 * Validación completa para acceso de gestión de tenants
 */
export const canManageTenants = async () => {
  const isSuper = await isSuperAdmin()
  const isAllowedEmail = await isSuperAdminByEmail()
  
  return isSuper && isAllowedEmail
}