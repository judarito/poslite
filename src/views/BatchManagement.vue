<template>
  <div>
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="batches">
        <v-icon start>mdi-barcode</v-icon>
        Lotes
      </v-tab>
      <v-tab value="alerts">
        <v-icon start>mdi-alert-circle</v-icon>
        Alertas
        <v-badge v-if="criticalAlerts > 0" :content="criticalAlerts" color="error" class="ml-2"></v-badge>
      </v-tab>
      <v-tab value="reports">
        <v-icon start>mdi-chart-line</v-icon>
        Reportes
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- LOTES -->
      <v-window-item value="batches">
        <v-card flat>
          <v-card-title class="d-flex align-center flex-wrap ga-2">
            <v-icon start color="blue">mdi-barcode</v-icon>
            Gestión de Lotes
            <v-spacer></v-spacer>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
              Nuevo Lote (Ajuste Manual)
            </v-btn>
          </v-card-title>

          <!-- Nota informativa -->
          <v-alert type="info" variant="tonal" class="mx-4 mt-2" density="compact">
            <strong>💡 Sugerencia</strong>: Los lotes de productos nuevos se crean automáticamente al registrar compras.
            <router-link to="/purchases" class="ml-1">Ir a Compras</router-link>
            <div class="text-caption mt-1">
              Esta pantalla es para consultar lotes existentes y hacer ajustes manuales si es necesario.
            </div>
          </v-alert>

          <!-- Filtros -->
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="filterLocation"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadBatches"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="filterAlertLevel"
                  :items="alertLevels"
                  label="Estado"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadBatches"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="searchBatchNumber"
                  label="Buscar lote"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @update:model-value="loadBatches"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>

          <!-- Tabla de lotes -->
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Sede</th>
                <th>Ubicación</th>
                <th>Vencimiento</th>
                <th class="text-right">Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in batches" :key="batch.batch_id">
                <td>
                  <div class="text-body-2">{{ batch.variant?.product?.name }}</div>
                  <div class="text-caption text-grey">{{ batch.variant?.variant_name }}</div>
                  <div class="text-caption text-grey">SKU: {{ batch.variant?.sku }}</div>
                </td>
                <td>{{ batch.batch_number }}</td>
                <td>{{ batch.location?.name }}</td>
                <td>
                  <v-chip v-if="batch.physical_location" size="small" variant="outlined">
                    {{ batch.physical_location }}
                  </v-chip>
                  <span v-else class="text-grey">-</span>
                </td>
                <td>
                  <div v-if="batch.expiration_date">
                    {{ formatDate(batch.expiration_date) }}
                    <div class="text-caption" :class="getDaysColor(batch)">
                      {{ formatDaysToExpiry(batch) }}
                    </div>
                  </div>
                  <span v-else class="text-grey">Sin vencimiento</span>
                </td>
                <td class="text-right">
                  <div>
                    <strong>{{ batch.on_hand }}</strong>
                    <span v-if="batch.reserved > 0" class="text-grey text-caption ml-1">
                      ({{ batch.reserved }} reserv.)
                    </span>
                  </div>
                  <div class="text-caption text-grey">
                    {{ (batch.on_hand - batch.reserved) }} disponible
                  </div>
                </td>
                <td>
                  <v-chip :color="getAlertColor(batch)" size="small">
                    {{ getAlertLabel(batch) }}
                  </v-chip>
                </td>
                <td>
                  <v-btn
                    icon="mdi-pencil"
                    variant="text"
                    size="small"
                    @click="openEditDialog(batch)"
                  ></v-btn>
                  <v-btn
                    icon="mdi-eye"
                    variant="text"
                    size="small"
                    @click="viewTraceability(batch)"
                  ></v-btn>
                </td>
              </tr>
              <tr v-if="batches.length === 0">
                <td colspan="8" class="text-center text-grey pa-4">
                  No hay lotes registrados
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-pagination
              v-model="currentPage"
              :length="Math.ceil(totalBatches / pageSize)"
              @update:model-value="loadBatches"
            ></v-pagination>
          </v-card-actions>
        </v-card>
      </v-window-item>

      <!-- ALERTAS -->
      <v-window-item value="alerts">
        <ExpirationAlerts :tenant-id="tenantId" ref="alertsComponent" />
      </v-window-item>

      <!-- REPORTES -->
      <v-window-item value="reports">
        <v-card flat>
          <v-card-title>
            <v-icon start color="teal">mdi-chart-line</v-icon>
            Reportes de Vencimiento
          </v-card-title>
          <v-card-text>
            <v-row>
              <!-- Dashboard por sede -->
              <v-col cols="12" md="6" lg="4" v-for="location in dashboardData" :key="location.location_id">
                <v-card variant="outlined">
                  <v-card-title class="text-subtitle-1">
                    {{ location.location_name }}
                  </v-card-title>
                  <v-card-text>
                    <div class="d-flex justify-space-between mb-2">
                      <span class="text-error">Vencidos:</span>
                      <strong>{{ location.expired_count || 0 }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span class="text-orange">Críticos:</span>
                      <strong>{{ location.critical_count || 0 }}</strong>
                    </div>
                    <div class="d-flex justify-space-between mb-2">
                      <span class="text-warning">Advertencia:</span>
                      <strong>{{ location.warning_count || 0 }}</strong>
                    </div>
                    <v-divider class="my-2"></v-divider>
                    <div class="d-flex justify-space-between">
                      <span class="font-weight-bold">Valor en Riesgo:</span>
                      <strong class="text-error">{{ formatMoney(location.total_value_at_risk) }}</strong>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Top productos en riesgo -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title>Top 10 Productos en Riesgo</v-card-title>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th>Vence en</th>
                        <th class="text-right">Lotes</th>
                        <th class="text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in topAtRisk" :key="item.variant_id">
                        <td>{{ item.sku }}</td>
                        <td>{{ item.product_name }}</td>
                        <td :class="item.days_to_expiry < 7 ? 'text-error' : 'text-warning'">
                          {{ item.days_to_expiry }} día(s)
                        </td>
                        <td class="text-right">{{ item.batches_count }}</td>
                        <td class="text-right font-weight-bold">{{ formatMoney(item.total_value) }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Dialog Crear/Editar Lote -->
    <v-dialog v-model="dialog" max-width="700" scrollable>
      <v-card>
        <v-card-title>
          {{ isEditing ? 'Editar Lote' : 'Nuevo Lote' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="formData.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede *"
                  variant="outlined"
                  :rules="[v => !!v || 'Requerido']"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-autocomplete
                  v-model="formData.variant_id"
                  :items="variants"
                  :item-title="v => `${v.sku} - ${v.product?.name}`"
                  item-value="variant_id"
                  label="Producto/Variante *"
                  variant="outlined"
                  :rules="[v => !!v || 'Requerido']"
                  @update:model-value="checkRequiresExpiration"
                ></v-autocomplete>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.batch_number"
                  label="Número de Lote *"
                  variant="outlined"
                  :rules="[v => !!v || 'Requerido']"
                >
                  <template #append>
                    <v-btn
                      icon="mdi-refresh"
                      size="small"
                      variant="text"
                      @click="generateBatchNumber"
                    ></v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formData.expiration_date"
                  label="Fecha de Vencimiento"
                  type="date"
                  variant="outlined"
                  :rules="requiresExpiration ? [v => !!v || 'Requerido'] : []"
                  :hint="requiresExpiration ? 'Requerido para este producto' : 'Opcional'"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="formData.on_hand"
                  label="Cantidad *"
                  type="number"
                  variant="outlined"
                  :rules="[v => v > 0 || 'Debe ser mayor a 0']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="formData.unit_cost"
                  label="Costo Unitario *"
                  type="number"
                  variant="outlined"
                  prefix="$"
                  :rules="[v => v >= 0 || 'Debe ser mayor o igual a 0']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formData.physical_location"
                  label="Ubicación Física"
                  variant="outlined"
                  placeholder="Ej: NEVERA-2"
                  hint="Opcional"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.notes"
                  label="Notas"
                  variant="outlined"
                  rows="2"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveBatch">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import batchesService from '@/services/batches.service'
import locationsService from '@/services/locations.service'
import productsService from '@/services/products.service'
import supabaseService from '@/services/supabase.service'
import ExpirationAlerts from '@/components/ExpirationAlerts.vue'

const router = useRouter()
const tab = ref('batches')

// Current tenant
const { tenantId } = useTenant()

// State
const loading = ref(false)
const batches = ref([])
const locations = ref([])
const variants = ref([])
const dashboardData = ref([])
const topAtRisk = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const totalBatches = ref(0)
const criticalAlerts = ref(0)

// Filtros
const filterLocation = ref(null)
const filterAlertLevel = ref(null)
const searchBatchNumber = ref('')

const alertLevels = [
  { title: 'Vencidos', value: 'EXPIRED' },
  { title: 'Críticos', value: 'CRITICAL' },
  { title: 'Advertencia', value: 'WARNING' },
  { title: 'OK', value: 'OK' }
]

// Dialog
const dialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  location_id: null,
  variant_id: null,
  batch_number: '',
  expiration_date: null,
  on_hand: 0,
  unit_cost: 0,
  physical_location: '',
  notes: ''
})
const requiresExpiration = ref(false)

// Methods
async function loadBatches() {
  if (!tenantId.value) return
  loading.value = true
  try {
    const result = await batchesService.getBatches(tenantId.value, currentPage.value, pageSize.value, {
      location_id: filterLocation.value,
      batch_number: searchBatchNumber.value,
      alert_level: filterAlertLevel.value,
      hasStock: true
    })
    if (result.success) {
      batches.value = result.data
      totalBatches.value = result.total
    }
  } finally {
    loading.value = false
  }
}

async function loadLocations() {
  if (!tenantId.value) return
  const result = await locationsService.getLocations(tenantId.value)
  if (result.success) locations.value = result.data
}

async function loadVariants() {
  if (!tenantId.value) return
  const result = await productsService.getActiveVariants(tenantId.value)
  if (result.success) variants.value = result.data
}

async function loadDashboard() {
  if (!tenantId.value) return
  const result = await batchesService.getExpirationDashboard(tenantId.value)
  if (result.success) dashboardData.value = result.data
}

async function loadTopAtRisk() {
  if (!tenantId.value) return
  const result = await batchesService.getTopAtRiskProducts(tenantId.value, null, 10)
  if (result.success) topAtRisk.value = result.data
}

async function loadCriticalCount() {
  if (!tenantId.value) return
  const result = await batchesService.getExpiringProducts(tenantId.value, { alert_level: 'CRITICAL' })
  if (result.success) criticalAlerts.value = result.data.length
}

function openCreateDialog() {
  isEditing.value = false
  formData.value = {
    location_id: null,
    variant_id: null,
    batch_number: '',
    expiration_date: null,
    on_hand: 0,
    unit_cost: 0,
    physical_location: '',
    notes: ''
  }
  dialog.value = true
}

function openEditDialog(batch) {
  isEditing.value = true
  formData.value = { ...batch }
  dialog.value = true
}

async function checkRequiresExpiration() {
  if (!formData.value.variant_id) return
  const variant = variants.value.find(v => v.variant_id === formData.value.variant_id)
  requiresExpiration.value = variant?.product?.requires_expiration || false
}

async function generateBatchNumber() {
  if (!tenantId.value) return
  if (!formData.value.variant_id) {
    alert('Selecciona primero un producto/variante')
    return
  }
  const result = await batchesService.generateBatchNumber(tenantId.value, formData.value.variant_id)
  if (result.success) formData.value.batch_number = result.batchNumber
}

async function saveBatch() {
  if (!tenantId.value) return
  const form = this.$refs.form
  if (!form.validate()) return

  try {
    const result = isEditing.value
      ? await batchesService.updateBatch(formData.value.batch_id, formData.value)
      : await batchesService.createBatch(tenantId.value, formData.value)

    if (result.success) {
      dialog.value = false
      await loadBatches()
      await loadCriticalCount()
    } else {
      alert('Error: ' + result.error)
    }
  } catch (error) {
    console.error('Error saving batch:', error)
    alert('Error al guardar el lote')
  }
}

function viewTraceability(batch) {
  // TODO: Implementar vista de trazabilidad
  alert(`Trazabilidad del lote ${batch.batch_number}`)
}

function getAlertColor(batch) {
  const level = batchesService.getAlertLevel(batch.expiration_date)
  const colors = {
    EXPIRED: 'error',
    CRITICAL: 'error',
    WARNING: 'warning',
    OK: 'success'
  }
  return colors[level] || 'grey'
}

function getAlertLabel(batch) {
  const level = batchesService.getAlertLevel(batch.expiration_date)
  const labels = {
    EXPIRED: 'Vencido',
    CRITICAL: 'Crítico',
    WARNING: 'Advertencia',
    OK: 'OK'
  }
  return labels[level] || '-'
}

function getDaysColor(batch) {
  if (!batch.expiration_date) return ''
  const today = new Date()
  const expDate = new Date(batch.expiration_date)
  const days = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
  
  if (days < 0) return 'text-error font-weight-bold'
  if (days <= 7) return 'text-error font-weight-bold'
  if (days <= 30) return 'text-warning'
  return ''
}

function formatDaysToExpiry(batch) {
  if (!batch.expiration_date) return ''
  const today = new Date()
  const expDate = new Date(batch.expiration_date)
  const days = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
  return batchesService.formatDaysToExpiry(days)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-CO')
}

function formatMoney(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Lifecycle
onMounted(async () => {
  if (!tenantId.value) return
  
  await Promise.all([
    loadLocations(),
    loadVariants(),
    loadBatches(),
    loadCriticalCount()
  ])
  
  // Cargar datos de reportes cuando se muestre esa pestaña
  if (tab.value === 'reports') {
    await loadDashboard()
    await loadTopAtRisk()
  }
})
</script>
