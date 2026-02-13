<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2" size="large">mdi-account-group</v-icon>
          <span class="text-h5">Usuarios</span>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          Nuevo Usuario
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Tabla de usuarios -->
        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
        >
          <!-- Email -->
          <template #[`item.email`]="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-2" size="small">mdi-email</v-icon>
              {{ item.email }}
            </div>
          </template>

          <!-- Roles -->
          <template #[`item.roles`]="{ item }">
            <v-chip
              v-for="role in item.roles"
              :key="role.role_id"
              size="small"
              class="mr-1"
              color="primary"
              variant="tonal"
            >
              {{ role.name }}
            </v-chip>
            <v-chip v-if="!item.roles || item.roles.length === 0" size="small" color="grey">
              Sin roles
            </v-chip>
          </template>

          <!-- Estado -->
          <template #[`item.is_active`]="{ item }">
            <v-chip :color="item.is_active ? 'success' : 'error'" size="small">
              {{ item.is_active ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </template>

          <!-- Fecha de creación -->
          <template #[`item.created_at`]="{ item }">
            {{ formatDate(item.created_at) }}
          </template>

          <!-- Acciones -->
          <template #[`item.actions`]="{ item }">
            <v-tooltip text="Editar">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Cambiar Contraseña">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-lock-reset"
                  size="small"
                  variant="text"
                  @click="openPasswordDialog(item)"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip :text="item.is_active ? 'Desactivar' : 'Activar'">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :icon="item.is_active ? 'mdi-account-off' : 'mdi-account-check'"
                  size="small"
                  variant="text"
                  :color="item.is_active ? 'error' : 'success'"
                  @click="toggleUserStatus(item)"
                ></v-btn>
              </template>
            </v-tooltip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Dialog para crear/editar usuario -->
    <v-dialog v-model="dialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">
            <v-icon class="mr-2">{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
            {{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </span>
        </v-card-title>

        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-text-field
              v-model="form.email"
              label="Correo Electrónico"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              type="email"
              :rules="[rules.required, rules.email]"
              :disabled="isEdit"
              :hint="isEdit ? 'El email no puede ser modificado' : ''"
              persistent-hint
            ></v-text-field>

            <v-text-field
              v-if="!isEdit"
              v-model="form.password"
              label="Contraseña"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[rules.required, rules.minLength]"
              @click:append-inner="showPassword = !showPassword"
            ></v-text-field>

            <v-text-field
              v-model="form.full_name"
              label="Nombre Completo"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              :rules="[rules.required]"
            ></v-text-field>

            <v-select
              v-model="form.roleIds"
              :items="availableRoles"
              item-title="name"
              item-value="role_id"
              label="Roles"
              prepend-inner-icon="mdi-shield-account"
              variant="outlined"
              multiple
              chips
              closable-chips
              :rules="[rules.atLeastOne]"
            >
              <template #chip="{ item, props }">
                <v-chip v-bind="props" color="primary">
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>

            <v-switch
              v-model="form.is_active"
              label="Usuario Activo"
              color="primary"
              hide-details
            ></v-switch>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!formValid"
            @click="saveUser"
          >
            {{ isEdit ? 'Guardar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog para cambiar contraseña -->
    <v-dialog v-model="passwordDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title>
          <span class="text-h5">
            <v-icon class="mr-2">mdi-lock-reset</v-icon>
            Cambiar Contraseña
          </span>
        </v-card-title>

        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            Cambiar la contraseña de: <strong>{{ selectedUser?.email }}</strong>
          </v-alert>

          <v-form ref="passwordFormRef" v-model="passwordFormValid">
            <v-text-field
              v-model="passwordForm.newPassword"
              label="Nueva Contraseña"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              :type="showNewPassword ? 'text' : 'password'"
              :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[rules.required, rules.minLength]"
              @click:append-inner="showNewPassword = !showNewPassword"
            ></v-text-field>

            <v-text-field
              v-model="passwordForm.confirmPassword"
              label="Confirmar Contraseña"
              prepend-inner-icon="mdi-lock-check"
              variant="outlined"
              :type="showConfirmPassword ? 'text' : 'password'"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :rules="[rules.required, rules.passwordMatch]"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
            ></v-text-field>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closePasswordDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="savingPassword"
            :disabled="!passwordFormValid"
            @click="changePassword"
          >
            Cambiar Contraseña
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getRoles
} from '@/services/users.service'

const { tenantId } = useTenant()

// Estado
const users = ref([])
const availableRoles = ref([])
const loading = ref(false)
const dialog = ref(false)
const passwordDialog = ref(false)
const isEdit = ref(false)
const formValid = ref(false)
const passwordFormValid = ref(false)
const saving = ref(false)
const savingPassword = ref(false)
const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const formRef = ref(null)
const passwordFormRef = ref(null)
const selectedUser = ref(null)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Formularios
const form = ref({
  email: '',
  password: '',
  full_name: '',
  roleIds: [],
  is_active: true
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

// Headers de la tabla
const headers = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Nombre Completo', key: 'full_name', sortable: true },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Estado', key: 'is_active', sortable: true },
  { title: 'Fecha Creación', key: 'created_at', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

// Reglas de validación
const rules = {
  required: v => !!v || 'Este campo es requerido',
  email: v => /.+@.+\..+/.test(v) || 'Email inválido',
  minLength: v => (v && v.length >= 6) || 'Mínimo 6 caracteres',
  atLeastOne: v => (v && v.length > 0) || 'Seleccione al menos un rol',
  passwordMatch: v => v === passwordForm.value.newPassword || 'Las contraseñas no coinciden'
}

// Métodos
async function loadUsers() {
  if (!tenantId.value) return
  loading.value = true
  try {
    users.value = await getUsers(tenantId.value)
  } catch (error) {
    showMessage('Error al cargar usuarios', 'error')
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  if (!tenantId.value) return
  try {
    availableRoles.value = await getRoles(tenantId.value)
  } catch (error) {
    showMessage('Error al cargar roles', 'error')
  }
}

function openCreateDialog() {
  isEdit.value = false
  form.value = {
    email: '',
    password: '',
    full_name: '',
    roleIds: [],
    is_active: true
  }
  dialog.value = true
}

function openEditDialog(user) {
  isEdit.value = true
  selectedUser.value = user
  form.value = {
    user_id: user.user_id,
    email: user.email,
    password: '',
    full_name: user.full_name,
    roleIds: user.roles.map(r => r.role_id),
    is_active: user.is_active
  }
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  formRef.value?.resetValidation()
  selectedUser.value = null
}

async function saveUser() {
  if (!formValid.value || !tenantId.value) return

  saving.value = true
  try {
    if (isEdit.value) {
      await updateUser(tenantId.value, form.value.user_id, {
        full_name: form.value.full_name,
        is_active: form.value.is_active,
        roleIds: form.value.roleIds
      })
      showMessage('Usuario actualizado exitosamente', 'success')
    } else {
      await createUser({
        email: form.value.email,
        password: form.value.password,
        full_name: form.value.full_name,
        roleIds: form.value.roleIds,
        is_active: form.value.is_active
      })
      showMessage('Usuario creado exitosamente', 'success')
    }

    closeDialog()
    await loadUsers()
  } catch (error) {
    showMessage(error.message || 'Error al guardar usuario', 'error')
  } finally {
    saving.value = false
  }
}

function openPasswordDialog(user) {
  selectedUser.value = user
  passwordForm.value = {
    newPassword: '',
    confirmPassword: ''
  }
  passwordDialog.value = true
}

function closePasswordDialog() {
  passwordDialog.value = false
  passwordFormRef.value?.resetValidation()
  selectedUser.value = null
}

async function changePassword() {
  if (!passwordFormValid.value) return

  savingPassword.value = true
  try {
    await changeUserPassword(
      selectedUser.value.auth_user_id,
      passwordForm.value.newPassword
    )
    showMessage('Contraseña actualizada exitosamente', 'success')
    closePasswordDialog()
  } catch (error) {
    showMessage(error.message || 'Error al cambiar contraseña', 'error')
  } finally {
    savingPassword.value = false
  }
}

async function toggleUserStatus(user) {
  if (!tenantId.value) return
  try {
    await updateUser(tenantId.value, user.user_id, {
      full_name: user.full_name,
      is_active: !user.is_active,
      roleIds: user.roles.map(r => r.role_id)
    })
    showMessage(
      `Usuario ${!user.is_active ? 'activado' : 'desactivado'} exitosamente`,
      'success'
    )
    await loadUsers()
  } catch (error) {
    showMessage('Error al cambiar estado del usuario', 'error')
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function showMessage(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// Lifecycle
onMounted(async () => {
  await Promise.all([loadUsers(), loadRoles()])
})
</script>

<style scoped>
.v-data-table :deep(.v-data-table__th) {
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
