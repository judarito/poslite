<template>
  <div>
    <ListView
      title="Roles y Permisos"
      icon="mdi-shield-account"
      :items="roles"
      :total-items="totalItems"
      :loading="loading"
      item-key="role_id"
      title-field="name"
      avatar-icon="mdi-account-key"
      avatar-color="red-darken-1"
      empty-message="No hay roles configurados"
      create-button-text="Nuevo Rol"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadRoles"
      @search="loadRoles"
    >
      <template #subtitle="{ item }">
        {{ item.role_permissions?.length || 0 }} permiso(s) asignado(s)
      </template>
    </ListView>

    <!-- Dialog Crear/Editar Rol -->
    <v-dialog v-model="dialog" max-width="600" scrollable>
      <v-card>
        <v-card-title><v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>{{ isEditing ? 'Editar Rol' : 'Nuevo Rol' }}</v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="save">
            <v-text-field v-model="formData.name" label="Nombre del rol" prepend-inner-icon="mdi-account-key" variant="outlined" :rules="[rules.required]" class="mb-4"></v-text-field>

            <!-- Permisos -->
            <div v-if="isEditing" class="text-subtitle-1 font-weight-bold mb-2">Permisos</div>
            <div v-if="isEditing">
              <div v-for="group in permissionGroups" :key="group.name" class="mb-3">
                <div class="text-subtitle-2 text-grey-darken-1 mb-1">{{ group.name }}</div>
                <v-checkbox
                  v-for="perm in group.permissions"
                  :key="perm.permission_id"
                  v-model="selectedPermissions"
                  :value="perm.permission_id"
                  :label="`${perm.code} — ${perm.description || ''}`"
                  density="compact"
                  hide-details
                ></v-checkbox>
              </div>
            </div>
            <div v-if="!isEditing" class="text-body-2 text-grey">Guarde el rol para asignar permisos.</div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">{{ isEditing ? 'Guardar' : 'Crear' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title><v-icon start color="error">mdi-alert</v-icon>Confirmar Eliminación</v-card-title>
        <v-card-text>¿Eliminar el rol <strong>{{ itemToDelete?.name }}</strong>?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" :loading="deleting" @click="doDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTenant } from '@/composables/useTenant'
import ListView from '@/components/ListView.vue'
import rolesService from '@/services/roles.service'

const { tenantId } = useTenant()
const roles = ref([])
const totalItems = ref(0)
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const form = ref(null)
const itemToDelete = ref(null)
const allPermissions = ref([])
const selectedPermissions = ref([])
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')
const formData = ref({ role_id: null, name: '' })
const rules = { required: v => !!v || 'Campo requerido' }

const permissionGroups = computed(() => {
  const groups = {}
  allPermissions.value.forEach(p => {
    const module = p.code.split('.')[0] || 'GENERAL'
    if (!groups[module]) groups[module] = []
    groups[module].push(p)
  })
  return Object.entries(groups).map(([name, permissions]) => ({ name, permissions }))
})

const loadRoles = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loading.value = true
  try {
    const r = await rolesService.getRoles(tid, page, pageSize, search)
    if (r.success) { roles.value = r.data; totalItems.value = r.total }
    else showMsg('Error al cargar roles', 'error')
  } finally { loading.value = false }
}

const loadPermissions = async () => {
  const r = await rolesService.getAllPermissions()
  if (r.success) allPermissions.value = r.data
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = { role_id: null, name: '' }
  selectedPermissions.value = []
  dialog.value = true
}

const openEditDialog = async (item) => {
  if (!tenantId.value) return
  isEditing.value = true
  formData.value = { role_id: item.role_id, name: item.name }
  await loadPermissions()
  const rp = await rolesService.getRolePermissions(tenantId.value, item.role_id)
  selectedPermissions.value = rp.success ? rp.data : []
  dialog.value = true
}

const confirmDelete = (item) => { itemToDelete.value = item; deleteDialog.value = true }

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  saving.value = true
  try {
    let r
    if (isEditing.value) {
      r = await rolesService.updateRole(tenantId.value, formData.value.role_id, formData.value)
      if (r.success) {
        await rolesService.setRolePermissions(tenantId.value, formData.value.role_id, selectedPermissions.value)
      }
    } else {
      r = await rolesService.createRole(tenantId.value, formData.value)
    }
    if (r.success) { showMsg(isEditing.value ? 'Rol actualizado' : 'Rol creado'); dialog.value = false; loadRoles({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error || 'Error al guardar', 'error')
  } finally { saving.value = false }
}

const doDelete = async () => {
  if (!itemToDelete.value || !tenantId.value) return
  deleting.value = true
  try {
    const r = await rolesService.deleteRole(tenantId.value, itemToDelete.value.role_id)
    if (r.success) { showMsg('Rol eliminado'); deleteDialog.value = false; loadRoles({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { deleting.value = false }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }
</script>
