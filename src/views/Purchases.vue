<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cart-plus</v-icon>
            <span>Compras</span>
            <v-spacer></v-spacer>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
              Nueva Compra
            </v-btn>
          </v-card-title>

          <!-- Filtros -->
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="selectedLocation"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadPurchases"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="dateFrom"
                  label="Fecha desde"
                  type="date"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadPurchases"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="dateTo"
                  label="Fecha hasta"
                  type="date"
                  prepend-inner-icon="mdi-calendar"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadPurchases"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model="search"
                  label="Buscar producto o SKU"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  clearable
                  @keyup.enter="loadPurchases"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Tabla Desktop -->
          <v-card-text v-if="!isMobile" class="pa-0">
            <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
            <div v-else-if="purchases.length === 0" class="text-center pa-8 text-grey">
              <v-icon size="64">mdi-cart-off</v-icon>
              <p class="mt-4">No hay compras registradas</p>
            </div>
            <v-table v-else density="compact" fixed-header height="500">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Sede</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Costo Unit.</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Costo Prom.</th>
                  <th class="text-right">Precio Actual</th>
                  <th>Comprador</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="purchase in purchases" :key="purchase.purchase_id + purchase.variant_id">
                  <td>{{ formatDate(purchase.purchased_at) }}</td>
                  <td>{{ purchase.location_name }}</td>
                  <td>
                    <div>{{ purchase.product_name }}</div>
                    <div v-if="purchase.variant_name" class="text-caption text-grey">{{ purchase.variant_name }}</div>
                  </td>
                  <td>{{ purchase.sku }}</td>
                  <td class="text-right">{{ purchase.quantity }}</td>
                  <td class="text-right">{{ formatMoney(purchase.unit_cost) }}</td>
                  <td class="text-right font-weight-bold">{{ formatMoney(purchase.line_total) }}</td>
                  <td class="text-right text-info">{{ formatMoney(purchase.current_avg_cost) }}</td>
                  <td class="text-right text-success">{{ formatMoney(purchase.current_price) }}</td>
                  <td>{{ purchase.purchased_by_name }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>

          <!-- Cards Mobile -->
          <v-card-text v-else class="pa-2" style="max-height: 500px; overflow-y: auto;">
            <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
            <div v-else-if="purchases.length === 0" class="text-center pa-8 text-grey">
              <v-icon size="64">mdi-cart-off</v-icon>
              <p class="mt-4">No hay compras registradas</p>
            </div>
            <v-card
              v-else
              v-for="purchase in purchases"
              :key="purchase.purchase_id + purchase.variant_id"
              class="mb-2"
              variant="outlined"
            >
              <v-card-text>
                <div class="d-flex justify-space-between align-start mb-2">
                  <div>
                    <div class="text-body-2 font-weight-bold">{{ purchase.product_name }}</div>
                    <div v-if="purchase.variant_name" class="text-caption text-grey">{{ purchase.variant_name }}</div>
                    <div class="text-caption text-grey">SKU: {{ purchase.sku }}</div>
                  </div>
                  <v-chip size="small" color="primary">{{ formatDate(purchase.purchased_at) }}</v-chip>
                </div>
                <v-divider class="my-2"></v-divider>
                <v-row dense class="text-caption">
                  <v-col cols="6">
                    <div class="text-grey">Cantidad:</div>
                    <div class="font-weight-bold">{{ purchase.quantity }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-grey">Costo Unit:</div>
                    <div class="font-weight-bold">{{ formatMoney(purchase.unit_cost) }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-grey">Total:</div>
                    <div class="font-weight-bold text-primary">{{ formatMoney(purchase.line_total) }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-grey">Precio Actual:</div>
                    <div class="font-weight-bold text-success">{{ formatMoney(purchase.current_price) }}</div>
                  </v-col>
                </v-row>
                <v-divider class="my-2"></v-divider>
                <div class="text-caption text-grey">
                  {{ purchase.location_name }} • {{ purchase.purchased_by_name }}
                </div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog Nueva Compra -->
    <v-dialog v-model="dialog" max-width="800" scrollable>
      <v-card>
        <v-card-title>
          <v-icon start>mdi-cart-plus</v-icon>
          Nueva Compra
        </v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="savePurchase">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="purchaseData.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  :rules="[rules.required]"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="purchaseData.note"
                  label="Nota (opcional)"
                  prepend-inner-icon="mdi-note-text"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <!-- Líneas de compra -->
            <v-divider class="my-4"></v-divider>
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-1 font-weight-bold">Productos</span>
              <v-spacer></v-spacer>
              <v-btn size="small" color="primary" prepend-icon="mdi-plus" variant="tonal" @click="addLine">Agregar</v-btn>
            </div>

            <v-card v-for="(line, i) in purchaseData.lines" :key="i" variant="outlined" class="mb-2">
              <v-card-text>
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-autocomplete
                      v-model="line.variant_id"
                      :items="variants"
                      :loading="searchingVariants"
                      item-title="_displayName"
                      item-value="variant_id"
                      label="Producto"
                      prepend-inner-icon="mdi-package-variant"
                      variant="outlined"
                      density="compact"
                      :rules="[rules.required]"
                      @update:search="searchVariants"
                    >
                      <template #item="{ props, item }">
                        <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku"></v-list-item>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="12" sm="2">
                    <v-text-field
                      v-model.number="line.qty"
                      label="Cantidad"
                      type="number"
                      prepend-inner-icon="mdi-numeric"
                      variant="outlined"
                      density="compact"
                      min="1"
                      :rules="[rules.required, rules.positive]"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model.number="line.unit_cost"
                      label="Costo Unitario"
                      type="number"
                      prepend-inner-icon="mdi-cash"
                      variant="outlined"
                      density="compact"
                      min="0"
                      step="0.01"
                      :rules="[rules.required, rules.positive]"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="1" class="d-flex align-center">
                    <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="removeLine(i)"></v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-alert v-if="purchaseData.lines.length === 0" type="info" variant="tonal" class="mt-2">
              Agrega al menos un producto para registrar la compra
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePurchase" :disabled="purchaseData.lines.length === 0">Guardar Compra</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import supabaseService from '@/services/supabase.service'

const { isMobile } = useDisplay()
const { tenantId } = useTenant()
const { userProfile } = useAuth()

const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const form = ref(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const purchases = ref([])
const locations = ref([])
const variants = ref([])
const searchingVariants = ref(false)

const selectedLocation = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)
const search = ref('')

const purchaseData = ref({
  location_id: null,
  note: '',
  lines: []
})

const rules = {
  required: v => !!v || v === 0 || 'Campo requerido',
  positive: v => v > 0 || 'Debe ser mayor a 0'
}

onMounted(async () => {
  await loadLocations()
  await loadPurchases()
})

const loadLocations = async () => {
  if (!tenantId.value) return
  const { data, error } = await supabaseService.client
    .from('locations')
    .select('location_id, name')
    .eq('tenant_id', tenantId.value)
    .eq('is_active', true)
    .order('name')
  if (!error) locations.value = data || []
}

const loadPurchases = async () => {
  if (!tenantId.value) return
  loading.value = true
  try {
    let query = supabaseService.client
      .from('vw_purchases_summary')
      .select('*')
      .eq('tenant_id', tenantId.value)
      .order('purchased_at', { ascending: false })
      .limit(100)

    if (selectedLocation.value) {
      query = query.eq('location_id', selectedLocation.value)
    }
    if (dateFrom.value) {
      query = query.gte('purchased_at', dateFrom.value)
    }
    if (dateTo.value) {
      query = query.lte('purchased_at', dateTo.value + 'T23:59:59')
    }
    if (search.value) {
      query = query.or(`product_name.ilike.%${search.value}%,sku.ilike.%${search.value}%`)
    }

    const { data, error } = await query
    if (error) throw error
    purchases.value = data || []
  } catch (error) {
    showMsg('Error al cargar compras: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const loadInitialVariants = async () => {
  if (!tenantId.value) return
  searchingVariants.value = true
  try {
    const { data, error } = await supabaseService.client
      .from('product_variants')
      .select(`
        variant_id,
        sku,
        variant_name,
        product_id!inner(product_id, name)
      `)
      .eq('tenant_id', tenantId.value)
      .eq('is_active', true)
      .order('sku')
      .limit(50)

    if (error) throw error
    
    if (data) {
      variants.value = data.map(v => ({
        ...v,
        _displayName: `${v.product_id.name}${v.variant_name ? ' - ' + v.variant_name : ''} (${v.sku})`
      }))
    }
  } catch (error) {
    showMsg('Error al cargar productos: ' + error.message, 'error')
  } finally {
    searchingVariants.value = false
  }
}

const searchVariants = async (searchTerm) => {
  if (!tenantId.value) return
  
  // Si no hay término de búsqueda o es muy corto, cargar productos iniciales
  if (!searchTerm || searchTerm.length < 2) {
    await loadInitialVariants()
    return
  }
  
  searchingVariants.value = true
  try {
    // Buscar primero por SKU o variant_name
    let query = supabaseService.client
      .from('product_variants')
      .select(`
        variant_id,
        sku,
        variant_name,
        product_id!inner(product_id, name)
      `)
      .eq('tenant_id', tenantId.value)
      .eq('is_active', true)
      .order('sku')
      .limit(30)

    // Buscar en SKU, variant_name o nombre del producto
    const searchLower = searchTerm.toLowerCase()
    
    const { data, error } = await query
    
    if (error) throw error
    
    if (data) {
      // Filtrar resultados manualmente para incluir búsqueda por nombre de producto
      const filtered = data.filter(v => 
        v.sku?.toLowerCase().includes(searchLower) ||
        v.variant_name?.toLowerCase().includes(searchLower) ||
        v.product_id?.name?.toLowerCase().includes(searchLower)
      )
      
      variants.value = filtered.map(v => ({
        ...v,
        _displayName: `${v.product_id.name}${v.variant_name ? ' - ' + v.variant_name : ''} (${v.sku})`
      }))
    }
  } catch (error) {
    showMsg('Error al buscar productos: ' + error.message, 'error')
  } finally {
    searchingVariants.value = false
  }
}

const openCreateDialog = async () => {
  purchaseData.value = {
    location_id: locations.value.length === 1 ? locations.value[0].location_id : null,
    note: '',
    lines: []
  }
  dialog.value = true
  await loadInitialVariants()
}

const addLine = () => {
  purchaseData.value.lines.push({
    variant_id: null,
    qty: 1,
    unit_cost: 0
  })
}

const removeLine = (index) => {
  purchaseData.value.lines.splice(index, 1)
}

const savePurchase = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  
  if (purchaseData.value.lines.length === 0) {
    showMsg('Agrega al menos un producto', 'warning')
    return
  }

  if (!userProfile.value?.user_id) {
    showMsg('Error: Usuario no identificado', 'error')
    return
  }

  saving.value = true
  try {
    const { data, error } = await supabaseService.client.rpc('sp_create_purchase', {
      p_tenant: tenantId.value,
      p_location: purchaseData.value.location_id,
      p_supplier_id: null, // Puedes agregar proveedor después
      p_created_by: userProfile.value.user_id,
      p_lines: purchaseData.value.lines,
      p_note: purchaseData.value.note || null
    })

    if (error) throw error
    
    showMsg('Compra registrada exitosamente')
    dialog.value = false
    await loadPurchases()
  } catch (error) {
    showMsg('Error al guardar compra: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMoney = (value) => {
  if (!value && value !== 0) return '$0'
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const showMsg = (msg, color = 'success') => {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}
</script>
