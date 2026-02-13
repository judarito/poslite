<template>
  <div>
    <ListView
      title="Impuestos"
      icon="mdi-percent"
      :items="taxes"
      :total-items="totalItems"
      :loading="loading"
      :page-size="defaultPageSize"
      item-key="tax_id"
      title-field="name"
      avatar-icon="mdi-percent-circle"
      avatar-color="orange"
      empty-message="No hay impuestos configurados"
      create-button-text="Nuevo Impuesto"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadTaxes"
      @search="loadTaxes"
    >
      <template #subtitle="{ item }">
        Código: {{ item.code }} — Tasa: {{ (item.rate * 100).toFixed(2) }}%
      </template>
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </div>
      </template>
    </ListView>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title><v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>{{ isEditing ? 'Editar Impuesto' : 'Nuevo Impuesto' }}</v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="save">
            <v-text-field v-model="formData.code" label="Código" prepend-inner-icon="mdi-barcode" variant="outlined" :rules="[rules.required]" hint="Ej: IVA, INC" persistent-hint class="mb-2"></v-text-field>
            <v-text-field v-model="formData.name" label="Nombre" prepend-inner-icon="mdi-text" variant="outlined" :rules="[rules.required]" class="mb-2"></v-text-field>
            <v-text-field v-model.number="formData.rate" label="Tasa (decimal)" prepend-inner-icon="mdi-percent" variant="outlined" type="number" step="0.0001" :rules="[rules.required]" hint="Ej: 0.19 para 19%" persistent-hint class="mb-2"></v-text-field>
            <v-switch v-model="formData.is_active" label="Activo" color="success" hide-details></v-switch>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">{{ isEditing ? 'Actualizar' : 'Crear' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title><v-icon start color="error">mdi-alert</v-icon>Confirmar Eliminación</v-card-title>
        <v-card-text>¿Eliminar el impuesto <strong>{{ itemToDelete?.name }}</strong>?</v-card-text>
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
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useTenantSettings } from '@/composables/useTenantSettings'
import ListView from '@/components/ListView.vue'
import taxesService from '@/services/taxes.service'

const { tenantId } = useTenant()
const { defaultPageSize, loadSettings } = useTenantSettings()
const taxes = ref([])
const totalItems = ref(0)
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const form = ref(null)
const itemToDelete = ref(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const formData = ref({ tax_id: null, code: '', name: '', rate: 0.19, is_active: true })
const rules = { required: v => (v !== '' && v !== null && v !== undefined) || 'Campo requerido' }

const loadTaxes = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loading.value = true
  try {
    const r = await taxesService.getTaxes(tid, page, pageSize, search)
    if (r.success) { taxes.value = r.data; totalItems.value = r.total }
    else showMsg('Error al cargar impuestos', 'error')
  } finally { loading.value = false }
}

const openCreateDialog = () => { isEditing.value = false; formData.value = { tax_id: null, code: '', name: '', rate: 0.19, is_active: true }; dialog.value = true }
const openEditDialog = (item) => { isEditing.value = true; formData.value = { ...item }; dialog.value = true }
const confirmDelete = (item) => { itemToDelete.value = item; deleteDialog.value = true }

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  saving.value = true
  try {
    const r = isEditing.value
      ? await taxesService.updateTax(tenantId.value, formData.value.tax_id, formData.value)
      : await taxesService.createTax(tenantId.value, formData.value)
    if (r.success) { showMsg(isEditing.value ? 'Impuesto actualizado' : 'Impuesto creado'); dialog.value = false; loadTaxes({ page: 1, pageSize: defaultPageSize.value, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error || 'Error al guardar', 'error')
  } finally { saving.value = false }
}

const doDelete = async () => {
  if (!itemToDelete.value || !tenantId.value) return
  deleting.value = true
  try {
    const r = await taxesService.deleteTax(tenantId.value, itemToDelete.value.tax_id)
    if (r.success) { showMsg('Impuesto eliminado'); deleteDialog.value = false; loadTaxes({ page: 1, pageSize: defaultPageSize.value, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { deleting.value = false }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }

onMounted(async () => {
  await loadSettings()
})
</script>
