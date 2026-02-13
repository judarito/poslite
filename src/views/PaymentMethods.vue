<template>
  <div>
    <ListView
      title="Métodos de Pago"
      icon="mdi-credit-card"
      :items="paymentMethods"
      :total-items="totalItems"
      :loading="loading"
      :page-size="defaultPageSize"
      item-key="payment_method_id"
      title-field="name"
      subtitle-field="code"
      avatar-icon="mdi-cash"
      avatar-color="success"
      empty-message="No hay métodos de pago registrados"
      create-button-text="Nuevo Método"
      :creatable="canManage"
      :editable="canManage"
      :deletable="canManage"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadPaymentMethods"
      @search="loadPaymentMethods"
    >
      <!-- Slot personalizado para el contenido -->
      <template #content="{ item }">
        <div class="mt-2">
          <v-chip
            :color="item.is_active ? 'success' : 'error'"
            size="small"
            variant="flat"
          >
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </div>
      </template>
    </ListView>

    <!-- Dialog Crear/Editar -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ isEditing ? 'Editar Método de Pago' : 'Nuevo Método de Pago' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="form" @submit.prevent="savePaymentMethod">
            <v-text-field
              v-model="formData.code"
              label="Código"
              prepend-inner-icon="mdi-barcode"
              variant="outlined"
              :rules="[rules.required, rules.code]"
              :disabled="isEditing"
              hint="Ej: CASH, CARD, TRANSFER"
              persistent-hint
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="formData.name"
              label="Nombre"
              prepend-inner-icon="mdi-text"
              variant="outlined"
              :rules="[rules.required]"
              class="mb-2"
            ></v-text-field>

            <v-switch
              v-model="formData.is_active"
              label="Activo"
              color="success"
              hide-details
            ></v-switch>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            @click="savePaymentMethod"
          >
            {{ isEditing ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmación Eliminar -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon start color="error">mdi-alert</v-icon>
          Confirmar Eliminación
        </v-card-title>

        <v-card-text>
          ¿Está seguro que desea eliminar el método de pago
          <strong>{{ itemToDelete?.name }}</strong>?
          Esta acción no se puede deshacer.
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn
            color="error"
            :loading="deleting"
            @click="deletePaymentMethod"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para mensajes -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useTenantSettings } from '@/composables/useTenantSettings'
import { useAuth } from '@/composables/useAuth'
import ListView from '@/components/ListView.vue'
import paymentMethodsService from '@/services/paymentMethods.service'

const { tenantId } = useTenant()
const { defaultPageSize, loadSettings } = useTenantSettings()
const { hasPermission } = useAuth()

const canManage = hasPermission('SETTINGS.PAYMENT_METHODS.MANAGE')

const paymentMethods = ref([])
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

const formData = ref({
  payment_method_id: null,
  code: '',
  name: '',
  is_active: true
})

const rules = {
  required: value => !!value || 'Campo requerido',
  code: value => {
    if (!value) return true
    return /^[A-Z_]+$/.test(value) || 'Solo letras mayúsculas y guiones bajos'
  }
}

const loadPaymentMethods = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return

  loading.value = true
  try {
    const result = await paymentMethodsService.getPaymentMethods(
      tid,
      page,
      pageSize,
      search
    )

    if (result.success) {
      paymentMethods.value = result.data
      totalItems.value = result.total
    } else {
      showMessage('Error al cargar métodos de pago', 'error')
    }
  } catch (error) {
    showMessage('Error al cargar métodos de pago', 'error')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    payment_method_id: null,
    code: '',
    name: '',
    is_active: true
  }
  dialog.value = true
}

const openEditDialog = (item) => {
  isEditing.value = true
  formData.value = { ...item }
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  if (form.value) {
    form.value.reset()
  }
}

const savePaymentMethod = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  if (!tenantId.value) {
    showMessage('No se pudo obtener el tenant', 'error')
    return
  }

  // Verificar si el código ya existe
  if (!isEditing.value || formData.value.code !== formData.value.original_code) {
    const exists = await paymentMethodsService.checkCodeExists(
      tenantId.value,
      formData.value.code,
      isEditing.value ? formData.value.payment_method_id : null
    )

    if (exists) {
      showMessage('El código ya existe', 'error')
      return
    }
  }

  saving.value = true
  try {
    let result

    if (isEditing.value) {
      result = await paymentMethodsService.updatePaymentMethod(
        tenantId.value,
        formData.value.payment_method_id,
        formData.value
      )
    } else {
      result = await paymentMethodsService.createPaymentMethod(
        tenantId.value,
        formData.value
      )
    }

    if (result.success) {
      showMessage(
        isEditing.value
          ? 'Método de pago actualizado'
          : 'Método de pago creado',
        'success'
      )
      closeDialog()
      loadPaymentMethods({
        page: 1,
        pageSize: defaultPageSize.value,
        search: '',
        tenantId: tenantId.value
      })
    } else {
      showMessage(result.error || 'Error al guardar', 'error')
    }
  } catch (error) {
    showMessage('Error al guardar método de pago', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const deletePaymentMethod = async () => {
  if (!itemToDelete.value || !tenantId.value) return

  deleting.value = true
  try {
    const result = await paymentMethodsService.deletePaymentMethod(
      tenantId.value,
      itemToDelete.value.payment_method_id
    )

    if (result.success) {
      showMessage('Método de pago eliminado', 'success')
      deleteDialog.value = false
      loadPaymentMethods({
        page: 1,
        pageSize: defaultPageSize.value,
        search: '',
        tenantId: tenantId.value
      })
    } else {
      showMessage(result.error || 'Error al eliminar', 'error')
    }
  } catch (error) {
    showMessage('Error al eliminar método de pago', 'error')
  } finally {
    deleting.value = false
  }
}

const showMessage = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(async () => {
  await loadSettings()
})
</script>
