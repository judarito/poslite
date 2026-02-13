<template>
  <div>
    <!-- Estado de carga inicial -->
    <div v-if="!isInitialized" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-2">Cargando...</div>
    </div>

    <!-- Contenedor con key para forzar re-render estable -->
    <div v-else :key="`tenant-management-${canManageTenants}`">
      <!-- VALIDACIÓN DE ACCESO -->
      <v-alert 
        v-if="!canManageTenants" 
        type="error" 
        variant="tonal" 
        class="mb-4"
      >
        <v-icon start>mdi-lock</v-icon>
        <strong>Acceso Restringido</strong>
        <div class="mt-2">
          Solo Super Administradores pueden gestionar tenants.
        </div>
        <div class="text-caption mt-1">
          Usuario: {{ superAdminInfo?.email || 'No disponible' }} | 
          Perfil: {{ superAdminInfo?.hasProfile ? 'Con tenant' : 'Sin tenant' }}
        </div>
      </v-alert>

      <!-- INTERFAZ PRINCIPAL -->
      <v-card v-if="canManageTenants">
      <v-card-title class="bg-primary">
        <v-icon start color="white">mdi-office-building-plus</v-icon>
        <span class="text-white">Gestión de Tenants</span>
      </v-card-title>

      <v-tabs v-model="tab" color="primary" class="mt-2">
        <v-tab value="create">Crear Tenant</v-tab>
        <v-tab value="list">Lista de Tenants</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- TAB: CREAR TENANT -->
        <v-window-item value="create">
          <v-card-text>
            <v-form ref="form" @submit.prevent="createTenant">
              <v-row>
                <!-- DATOS DEL TENANT -->
                <v-col cols="12">
                  <div class="text-h6 mb-2">
                    <v-icon start color="primary">mdi-office-building</v-icon>
                    Datos del Negocio
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.name"
                    label="Nombre Comercial *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    prepend-inner-icon="mdi-store"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.legal_name"
                    label="Razón Social"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-file-document"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.tax_id"
                    label="NIT/RUT *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.email"
                    label="Email Empresa *"
                    type="email"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.email]"
                    prepend-inner-icon="mdi-email"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.phone"
                    label="Teléfono"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-phone"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="tenantData.invoice_prefix"
                    label="Prefijo de Facturas *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    hint="Ej: FAC, INV, VTA"
                    prepend-inner-icon="mdi-receipt"
                  ></v-text-field>
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    v-model="tenantData.address"
                    label="Dirección"
                    variant="outlined"
                    density="comfortable"
                    rows="2"
                    prepend-inner-icon="mdi-map-marker"
                  ></v-textarea>
                </v-col>

                <!-- DATOS DEL ADMINISTRADOR -->
                <v-col cols="12" class="mt-4">
                  <v-divider></v-divider>
                  <div class="text-h6 my-2">
                    <v-icon start color="success">mdi-account-tie</v-icon>
                    Usuario Administrador
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="adminData.full_name"
                    label="Nombre Completo *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    prepend-inner-icon="mdi-account"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="adminData.email"
                    label="Email Administrador *"
                    type="email"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.email]"
                    prepend-inner-icon="mdi-email-outline"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="adminData.password"
                    label="Contraseña *"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.minLength(8)]"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPassword = !showPassword"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="confirmPassword"
                    label="Confirmar Contraseña *"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.passwordMatch]"
                    prepend-inner-icon="mdi-lock-check"
                  ></v-text-field>
                </v-col>

                <!-- OPCIONES -->
                <v-col cols="12" class="mt-2">
                  <v-divider></v-divider>
                  <div class="text-h6 my-2">
                    <v-icon start color="info">mdi-cog</v-icon>
                    Opciones de Configuración
                  </div>
                </v-col>

                <v-col cols="12">
                  <v-switch
                    v-model="copyFromTemplate"
                    color="primary"
                    density="comfortable"
                    hide-details
                    :disabled="loadingTenants || tenants.length === 0"
                  >
                    <template v-slot:label>
                      <div>
                        <strong>Copiar configuraciones de un tenant existente</strong>
                        <div class="text-caption text-grey">
                          Incluye métodos de pago, roles, permisos, reglas de precios e impuestos
                          <span v-if="tenants.length === 0 && !loadingTenants" class="text-warning">
                            (No disponible: no hay tenants)
                          </span>
                        </div>
                      </div>
                    </template>
                  </v-switch>
                </v-col>

                <v-col cols="12" v-show="copyFromTemplate">
                  <v-select
                    v-model="selectedTemplateTenant"
                    :items="tenants"
                    item-title="name"
                    item-value="tenant_id"
                    label="Seleccionar tenant plantilla"
                    hint="Elige de qué tenant copiar las configuraciones"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                    :loading="loadingTenants"
                    :rules="copyFromTemplate ? [v => !!v || 'Debes seleccionar un tenant plantilla'] : []"
                    :no-data-text="loadingTenants ? 'Cargando...' : 'No hay tenants disponibles'"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <v-list-item-subtitle>{{ item.raw.legal_name }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>
                  
                  <!-- Alerta cuando no hay tenants -->
                  <v-alert 
                    v-if="!loadingTenants && tenants.length === 0" 
                    type="warning" 
                    variant="tonal" 
                    class="mt-2"
                  >
                    <v-icon start>mdi-alert</v-icon>
                    No hay tenants disponibles para usar como plantilla. El nuevo tenant se creará con configuración por defecto.
                  </v-alert>
                  
                  <!-- Información del tenant seleccionado -->
                  <v-alert 
                    v-if="selectedTemplateTenant && selectedTenantName !== 'Ninguno seleccionado'" 
                    type="info" 
                    variant="tonal" 
                    class="mt-2"
                  >
                    <v-icon start>mdi-information</v-icon>
                    Se copiarán las configuraciones de: <strong>{{ selectedTenantName }}</strong>
                  </v-alert>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-btn
              variant="text"
              @click="resetForm"
            >
              Limpiar
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              :loading="creating"
              @click="createTenant"
              prepend-icon="mdi-plus"
            >
              Crear Tenant
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <!-- TAB: LISTA DE TENANTS -->
        <v-window-item value="list">
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-refresh"
                  @click="loadTenants"
                  :loading="loadingTenants"
                  class="mb-4"
                >
                  Actualizar
                </v-btn>
              </v-col>

              <v-col cols="12">
                <v-card
                  v-for="tenant in tenants"
                  :key="tenant.tenant_id"
                  variant="outlined"
                  class="mb-3"
                >
                  <v-card-text>
                    <v-row align="center">
                      <v-col cols="12" sm="8">
                        <div class="text-h6">{{ tenant.name }}</div>
                        <div class="text-caption text-grey">
                          NIT: {{ tenant.tax_id }} • {{ tenant.email }}
                        </div>
                        <div class="text-caption text-grey">
                          Creado: {{ formatDate(tenant.created_at) }}
                        </div>
                      </v-col>
                      <v-col cols="12" sm="4" class="text-right">
                        <v-chip
                          :color="tenant.is_active ? 'success' : 'error'"
                          size="small"
                          variant="flat"
                          class="mb-2"
                        >
                          {{ tenant.is_active ? 'Activo' : 'Inactivo' }}
                        </v-chip>
                        <br>
                        <v-btn
                          size="small"
                          variant="text"
                          color="primary"
                          @click="viewTenantTemplate(tenant.tenant_id)"
                        >
                          Ver Config
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <v-alert v-if="tenants.length === 0 && !loadingTenants" type="info">
                  No hay tenants registrados
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Dialog de resultados -->
    <v-dialog v-model="resultDialog" max-width="600">
      <v-card>
        <v-card-title class="bg-success">
          <v-icon start color="white">mdi-check-circle</v-icon>
          <span class="text-white">Tenant Creado Exitosamente</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Tenant ID</v-list-item-title>
              <v-list-item-subtitle>{{ createdResult.tenant_id }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Usuario ID</v-list-item-title>
              <v-list-item-subtitle>{{ createdResult.user_id }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Sede ID</v-list-item-title>
              <v-list-item-subtitle>{{ createdResult.location_id }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="font-weight-bold">Caja ID</v-list-item-title>
              <v-list-item-subtitle>{{ createdResult.register_id }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="success" variant="tonal" class="mt-4">
            {{ createdResult.message }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="closeResultDialog">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
    </div> <!-- Cierre del contenedor v-else con key -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useSuperAdmin } from '@/composables/useSuperAdmin'
import { useNotification } from '@/composables/useNotification'
import tenantsService from '@/services/tenants.service'

const { tenantId, currentTenant } = useTenant()
const { canManageTenants, superAdminInfo } = useSuperAdmin()
const { showNotification } = useNotification()

// Agregar estabilidad a los cambios reactivos
const isInitialized = ref(false)

onMounted(() => {
  // Marcar como inicializado después de la primera carga
  setTimeout(() => {
    isInitialized.value = true
  }, 100)
  // Cargar lista de tenants al inicializar 
  loadTenants()
})

const tab = ref('create')
const form = ref(null)
const creating = ref(false)
const showPassword = ref(false)
const copyFromTemplate = ref(false) // Cambio: ya no por defecto true
const selectedTemplateTenant = ref(null) // Nuevo: tenant seleccionado para copiar
const resultDialog = ref(false)
const createdResult = ref({})
const loadingTenants = ref(false)
const tenants = ref([])

const tenantData = ref({
  name: '',
  legal_name: '',
  tax_id: '',
  email: '',
  phone: '',
  address: '',
  invoice_prefix: 'FAC',
  invoice_start_number: 1
})

const adminData = ref({
  full_name: '',
  email: '',
  password: ''
})

const confirmPassword = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const selectedTenantName = computed(() => {
  const selected = tenants.value.find(t => t.tenant_id === selectedTemplateTenant.value)
  return selected?.name || 'Ninguno seleccionado'
})

// Watcher: resetear copyFromTemplate si no hay tenants disponibles
watch(() => tenants.value.length, (newLength) => {
  if (newLength === 0) {
    copyFromTemplate.value = false
    selectedTemplateTenant.value = null
  }
})

const rules = {
  required: v => !!v || 'Campo requerido',
  email: v => /.+@.+\..+/.test(v) || 'Email inválido',
  minLength: (min) => v => (v && v.length >= min) || `Mínimo ${min} caracteres`,
  passwordMatch: v => v === adminData.value.password || 'Las contraseñas no coinciden'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const createTenant = async () => {
  if (!form.value) {
    showMsg('Error: formulario no inicializado', 'error')
    return
  }

  // Validación adicional para template
  if (copyFromTemplate.value && !selectedTemplateTenant.value) {
    showMsg('Debes seleccionar un tenant plantilla o desactivar la opción', 'error')
    return
  }

  const { valid } = await form.value.validate()
  if (!valid) {
    showMsg('Por favor completa todos los campos requeridos', 'error')
    return
  }

  creating.value = true

  try {
    const result = await tenantsService.createTenant(
      tenantData.value,
      adminData.value,
      copyFromTemplate.value ? selectedTemplateTenant.value : null
    )

    if (result.success) {
      createdResult.value = result.data
      resultDialog.value = true
      resetForm()
      showMsg('Tenant creado exitosamente', 'success')
    } else {
      showMsg(`Error: ${result.error}`, 'error')
    }
  } catch (error) {
    console.error('Error creando tenant:', error)
    showMsg(`Error inesperado: ${error.message}`, 'error')
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  tenantData.value = {
    name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    invoice_prefix: 'FAC',
    invoice_start_number: 1
  }
  adminData.value = {
    full_name: '',
    email: '',
    password: ''
  }
  confirmPassword.value = ''
  copyFromTemplate.value = false // Limpiar switch
  selectedTemplateTenant.value = null // Limpiar selección
  form.value?.resetValidation()
}

const loadTenants = async () => {
  loadingTenants.value = true
  try {
    const result = await tenantsService.getAllTenants()
    if (result.success) {
      tenants.value = result.data
    } else {
      showMsg(`Error: ${result.error}`, 'error')
    }
  } finally {
    loadingTenants.value = false
  }
}

const viewTenantTemplate = async (tenantId) => {
  const result = await tenantsService.getTenantTemplate(tenantId)
  if (result.success) {
    console.log('Template del tenant:', result.data)
    showMsg('Template generado (ver consola)', 'info')
  } else {
    showMsg(`Error: ${result.error}`, 'error')
  }
}

const closeResultDialog = () => {
  resultDialog.value = false
  createdResult.value = {}
  tab.value = 'list'
  loadTenants()
}

const showMsg = (msg, color = 'success') => {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(() => {
  // Ya se carga desde el primer onMounted
})
</script>
