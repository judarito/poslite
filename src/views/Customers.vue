<template>
  <div>
    <ListView
      title="Clientes"
      icon="mdi-account-group"
      :items="customers"
      :total-items="totalItems"
      :loading="loading"
      item-key="customer_id"
      title-field="full_name"
      avatar-icon="mdi-account"
      avatar-color="teal"
      empty-message="No hay clientes registrados"
      create-button-text="Nuevo Cliente"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadCustomers"
      @search="loadCustomers"
    >
      <template #subtitle="{ item }">
        {{ [item.document, item.phone, item.email].filter(Boolean).join(' • ') || 'Sin datos de contacto' }}
      </template>
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </v-chip>
          <v-chip v-if="item.customer_credit_accounts?.length" size="small" variant="tonal" color="warning" prepend-icon="mdi-credit-card-clock">
            Crédito: {{ formatMoney(item.customer_credit_accounts[0].current_balance) }} / {{ formatMoney(item.customer_credit_accounts[0].credit_limit) }}
          </v-chip>
        </div>
      </template>
    </ListView>

    <!-- Dialog Crear/Editar -->
    <v-dialog v-model="dialog" max-width="600" scrollable>
      <v-card>
        <v-card-title>
          <v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="save">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.full_name" label="Nombre completo" prepend-inner-icon="mdi-account" variant="outlined" :rules="[rules.required]"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.document" label="Documento" prepend-inner-icon="mdi-card-account-details" variant="outlined"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.phone" label="Teléfono" prepend-inner-icon="mdi-phone" variant="outlined" type="tel"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="formData.email" label="Email" prepend-inner-icon="mdi-email" variant="outlined" type="email"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="formData.address" label="Dirección" prepend-inner-icon="mdi-map-marker" variant="outlined" rows="2" auto-grow></v-textarea>
              </v-col>
              <v-col cols="12">
                <v-switch v-model="formData.is_active" label="Activo" color="success" hide-details></v-switch>
              </v-col>
            </v-row>

            <!-- Crédito -->
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-1 font-weight-bold mb-2">Crédito (Fiado)</div>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="creditLimit" label="Cupo de crédito" prepend-inner-icon="mdi-cash" variant="outlined" type="number" hint="0 = sin crédito" persistent-hint></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" v-if="isEditing && creditBalance !== null">
                <v-text-field :model-value="creditBalance" label="Saldo actual" prepend-inner-icon="mdi-cash-clock" variant="outlined" readonly></v-text-field>
              </v-col>
            </v-row>
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
        <v-card-text>¿Eliminar el cliente <strong>{{ itemToDelete?.full_name }}</strong>?</v-card-text>
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
import { ref } from 'vue'
import { useTenant } from '@/composables/useTenant'
import ListView from '@/components/ListView.vue'
import customersService from '@/services/customers.service'

const { tenantId } = useTenant()
const customers = ref([])
const totalItems = ref(0)
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const form = ref(null)
const itemToDelete = ref(null)
const creditLimit = ref(0)
const creditBalance = ref(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const formData = ref({ customer_id: null, full_name: '', document: '', phone: '', email: '', address: '', is_active: true })
const rules = { required: v => !!v || 'Campo requerido' }

const formatMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)

const loadCustomers = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loading.value = true
  try {
    const r = await customersService.getCustomers(tid, page, pageSize, search)
    if (r.success) { customers.value = r.data; totalItems.value = r.total }
    else showMsg('Error al cargar clientes', 'error')
  } finally { loading.value = false }
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = { customer_id: null, full_name: '', document: '', phone: '', email: '', address: '', is_active: true }
  creditLimit.value = 0
  creditBalance.value = null
  dialog.value = true
}

const openEditDialog = async (item) => {
  isEditing.value = true
  formData.value = { ...item }
  creditLimit.value = 0
  creditBalance.value = null

  // Cargar crédito
  const cr = await customersService.getCreditAccount(tenantId.value, item.customer_id)
  if (cr.success && cr.data) {
    creditLimit.value = cr.data.credit_limit
    creditBalance.value = cr.data.current_balance
  }
  dialog.value = true
}

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  saving.value = true
  try {
    const r = isEditing.value
      ? await customersService.updateCustomer(tenantId.value, formData.value.customer_id, formData.value)
      : await customersService.createCustomer(tenantId.value, formData.value)

    if (r.success) {
      const custId = r.data?.customer_id || formData.value.customer_id
      // Guardar crédito si cupo > 0
      if (creditLimit.value > 0) {
        await customersService.upsertCreditAccount(tenantId.value, custId, creditLimit.value)
      }
      showMsg(isEditing.value ? 'Cliente actualizado' : 'Cliente creado')
      dialog.value = false
      loadCustomers({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value })
    } else showMsg(r.error || 'Error al guardar', 'error')
  } finally { saving.value = false }
}

const confirmDelete = (item) => { itemToDelete.value = item; deleteDialog.value = true }
const doDelete = async () => {
  if (!itemToDelete.value || !tenantId.value) return
  deleting.value = true
  try {
    const r = await customersService.deleteCustomer(tenantId.value, itemToDelete.value.customer_id)
    if (r.success) { showMsg('Cliente eliminado'); deleteDialog.value = false; loadCustomers({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { deleting.value = false }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }
</script>
