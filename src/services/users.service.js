import { supabase } from '@/plugins/supabase'

/**
 * Obtener todos los usuarios del tenant
 */
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      tenant_id,
      email,
      full_name,
      is_active,
      created_at,
      user_roles (
        role_id,
        roles (
          role_id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error al obtener usuarios:', error)
    throw error
  }

  // Transformar los roles para mejor acceso
  const users = data.map(user => ({
    ...user,
    roles: user.user_roles?.map(ur => ur.roles) || []
  }))

  return users
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      tenant_id,
      email,
      full_name,
      is_active,
      created_at,
      user_roles (
        role_id,
        roles (
          role_id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error al obtener usuario:', error)
    throw error
  }

  // Transformar los roles
  const user = {
    ...data,
    roles: data.user_roles?.map(ur => ur.roles) || []
  }

  return user
}

/**
 * Crear usuario (Supabase Auth + tabla users + roles)
 */
export async function createUser({ email, password, full_name, roleIds = [], is_active = true }) {
  try {
    // 1. Crear usuario en Supabase Auth usando la función admin
    const { data: authData, error: authError } = await supabase.rpc('create_auth_user', {
      p_email: email,
      p_password: password,
      p_full_name: full_name,
      p_role_ids: roleIds,
      p_is_active: is_active
    })

    if (authError) {
      console.error('Error al crear usuario:', authError)
      throw authError
    }

    return authData
  } catch (error) {
    console.error('Error en createUser:', error)
    throw error
  }
}

/**
 * Actualizar usuario
 */
export async function updateUser(userId, { full_name, is_active, roleIds = [] }) {
  try {
    // 1. Actualizar datos del usuario
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name,
        is_active
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error al actualizar usuario:', updateError)
      throw updateError
    }

    // 2. Actualizar roles - eliminar roles existentes
    const { error: deleteRolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteRolesError) {
      console.error('Error al eliminar roles:', deleteRolesError)
      throw deleteRolesError
    }

    // 3. Insertar nuevos roles
    if (roleIds.length > 0) {
      const userRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId
      }))

      const { error: insertRolesError } = await supabase
        .from('user_roles')
        .insert(userRoles)

      if (insertRolesError) {
        console.error('Error al insertar roles:', insertRolesError)
        throw insertRolesError
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error en updateUser:', error)
    throw error
  }
}

/**
 * Eliminar usuario (soft delete)
 */
export async function deleteUser(userId) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('user_id', userId)

  if (error) {
    console.error('Error al desactivar usuario:', error)
    throw error
  }

  return { success: true }
}

/**
 * Cambiar contraseña de un usuario
 */
export async function changeUserPassword(authUserId, newPassword) {
  try {
    const { data, error } = await supabase.rpc('change_user_password', {
      p_auth_user_id: authUserId,
      p_new_password: newPassword
    })

    if (error) {
      console.error('Error al cambiar contraseña:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error en changeUserPassword:', error)
    throw error
  }
}

/**
 * Obtener todos los roles disponibles
 */
export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error al obtener roles:', error)
    throw error
  }

  return data
}
