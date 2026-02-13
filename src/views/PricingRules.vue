<template>
  <div>
    <!-- Filtros -->
    <v-card flat class="mb-3">
      <v-card-text class="pa-2">
        <v-row dense>
          <v-col cols="12" md="3">
            <v-select
              v-model="scopeFilter"
              :items="scopeOptions"
              label="Alcance"
              density="compact"
              variant="outlined"
              clearable
              hide-details
              @update:model-value="applyFilters"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              :items="[{label: 'Todos', value: null}, {label: 'Activos', value: true}, {label: 'Inactivos', value: false}]"
              item-title="label"
              item-value="value"
              label="Estado"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="applyFilters"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <ListView
      title="Políticas de Precio"
      icon="mdi-tag-multiple"
      :items="rules"
      :total-items="totalItems"
      :loading="loading"
      item-key="pricing_rule_id"
      title-field="scope"
      avatar-icon="mdi-cash-multiple"
      avatar-color="green"
      empty-message="No hay políticas de precio configuradas"
      create-button-text="Nueva Política"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadRules"
      @search="loadRules"
    >
      <template #title="{ item }">
        {{ getScopeLabel(item.scope) }} — {{ item.pricing_method === 'MARKUP' ? `Markup ${item.markup_percentage}%` : 'Precio Fijo' }}
      </template>
      <template #subtitle="{ item }">
        <span v-if="item.scope === 'TENANT'">Aplica a todo el negocio</span>
        <span v-else-if="item.scope === 'LOCATION'">Sede: {{ item.location?.name }}</span>
        <span v-else-if="item.scope === 'CATEGORY'">Categoría: {{ item.category?.name }}</span>
        <span v-else-if="item.scope === 'PRODUCT'">Producto: {{ item.product?.name }}</span>
        <span v-else-if="item.scope === 'VARIANT'">Variante: {{ item.variant?.sku }} — {{ item.variant?.variant_name }}</span>
      </template>
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </v-chip>
          <v-chip size="small" variant="tonal" color="info">
            Prioridad: {{ item.priority }}
          </v-chip>
          <v-chip v-if="item.price_rounding !== 'NONE'" size="small" variant="tonal" color="orange">
            Redondeo: {{ getRoundingLabel(item.price_rounding) }}
          </v-chip>
        </div>
      </template>
    </ListView>

    <!-- Dialog: Crear/Editar -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          <v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ isEditing ? 'Editar Política' : 'Nueva Política de Precio' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-row>
              <!-- Alcance -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.scope"
                  :items="scopeOptions"
                  label="Alcance *"
                  prepend-inner-icon="mdi-target"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  :disabled="isEditing"
                  @update:model-value="onScopeChange"
                ></v-select>
              </v-col>

              <!-- Prioridad -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.priority"
                  label="Prioridad"
                  prepend-inner-icon="mdi-sort-numeric-ascending"
                  variant="outlined"
                  type="number"
                  hint="Mayor número = mayor prioridad"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Sede (si aplica) -->
              <v-col v-if="formData.scope === 'LOCATION'" cols="12">
                <v-select
                  v-model="formData.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede *"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  :disabled="isEditing"
                ></v-select>
              </v-col>

              <!-- Categoría (si aplica) -->
              <v-col v-if="formData.scope === 'CATEGORY'" cols="12">
                <v-autocomplete
                  v-model="formData.category_id"
                  :items="categories"
                  item-title="name"
                  item-value="category_id"
                  label="Categoría *"
                  prepend-inner-icon="mdi-shape"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  :loading="loadingCategories"
                  :disabled="isEditing"
                ></v-autocomplete>
              </v-col>

              <!-- Producto (si aplica) -->
              <v-col v-if="formData.scope === 'PRODUCT'" cols="12">
                <v-autocomplete
                  v-model="formData.product_id"
                  :items="products"
                  item-title="name"
                  item-value="product_id"
                  label="Producto *"
                  prepend-inner-icon="mdi-package-variant"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  :loading="loadingProducts"
                  :disabled="isEditing"
                  @update:search="searchProducts"
                ></v-autocomplete>
              </v-col>

              <!-- Variante (si aplica) -->
              <v-col v-if="formData.scope === 'VARIANT'" cols="12">
                <v-autocomplete
                  v-model="formData.variant_id"
                  :items="variants"
                  item-value="variant_id"
                  label="Variante *"
                  prepend-inner-icon="mdi-tag"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  :loading="loadingVariants"
                  :disabled="isEditing"
                  @update:search="searchVariants"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :title="`${item.raw.sku} - ${item.raw.variant_name || 'Default'}`" :subtitle="item.raw.product?.name"></v-list-item>
                  </template>
                  <template #selection="{ item }">
                    {{ item.raw.sku }} - {{ item.raw.variant_name || 'Default' }}
                  </template>
                </v-autocomplete>
              </v-col>

              <!-- Configuración de Precio -->
              <v-col cols="12">
                <v-divider class="my-2"></v-divider>
                <div class="text-subtitle-2 mb-3">Configuración de Precio</div>
              </v-col>

              <!-- Método de Precio -->
              <v-col cols="12">
                <v-select
                  v-model="formData.pricing_method"
                  :items="pricingMethods"
                  item-title="label"
                  item-value="value"
                  label="Método de Precio *"
                  prepend-inner-icon="mdi-calculator"
                  variant="outlined"
                  :rules="[rules_validation.required]"
                  hint="MARKUP: automático con margen. FIXED: manual"
                  persistent-hint
                ></v-select>
              </v-col>

              <!-- Markup % (solo si método es MARKUP) -->
              <v-col v-if="formData.pricing_method === 'MARKUP'" cols="12" md="6">
                <v-text-field
                  v-model.number="formData.markup_percentage"
                  label="% Ganancia (Markup) *"
                  prepend-inner-icon="mdi-percent"
                  variant="outlined"
                  type="number"
                  min="0"
                  suffix="%"
                  :rules="[rules_validation.required, rules_validation.positive]"
                  hint="Porcentaje de ganancia sobre costo"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Redondeo (solo si método es MARKUP) -->
              <v-col v-if="formData.pricing_method === 'MARKUP'" cols="12" md="6">
                <v-select
                  v-model="formData.price_rounding"
                  :items="roundingOptions"
                  item-title="label"
                  item-value="value"
                  label="Redondeo"
                  prepend-inner-icon="mdi-circle-outline"
                  variant="outlined"
                  hint="Tipo de redondeo del precio"
                  persistent-hint
                ></v-select>
              </v-col>

              <!-- Redondear a múltiplo (solo si no es NONE) -->
              <v-col v-if="formData.pricing_method === 'MARKUP' && formData.price_rounding !== 'NONE'" cols="12">
                <v-text-field
                  v-model.number="formData.rounding_to"
                  label="Redondear a múltiplo de"
                  prepend-inner-icon="mdi-numeric"
                  variant="outlined"
                  type="number"
                  min="1"
                  :rules="[rules_validation.required, rules_validation.positive]"
                  hint="Ej: 1 (unidades), 10 (decenas), 100 (centenas)"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- Estado -->
              <v-col cols="12">
                <v-switch
                  v-model="formData.is_active"
                  label="Activo"
                  color="success"
                  hide-details
                ></v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false" :disabled="saving">Cancelar</v-btn>
          <v-btn color="primary" @click="save" :loading="saving">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirmar Eliminación</v-card-title>
        <v-card-text>¿Está seguro de eliminar esta política de precio?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false" :disabled="deleting">Cancelar</v-btn>
          <v-btn color="error" @click="doDelete" :loading="deleting">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTenant } from '@/composables/useTenant'
import ListView from '@/components/ListView.vue'
import pricingRulesService from '@/services/pricingRules.service'
import categoriesService from '@/services/categories.service'
import productsService from '@/services/products.service'

const { tenantId } = useTenant()

const rules = ref([])
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

// Filtros
const scopeFilter = ref(null)
const statusFilter = ref(null)

// Catálogos
const locations = ref([])
const categories = ref([])
const products = ref([])
const variants = ref([])
const loadingCategories = ref(false)
const loadingProducts = ref(false)
const loadingVariants = ref(false)

const formData = ref({
  pricing_rule_id: null,
  scope: 'TENANT',
  location_id: null,
  category_id: null,
  product_id: null,
  variant_id: null,
  pricing_method: 'MARKUP',
  markup_percentage: 20,
  price_rounding: 'NONE',
  rounding_to: 1,
  priority: 0,
  is_active: true
})

const scopeOptions = [
  { title: 'Global (Tenant)', value: 'TENANT' },
  { title: 'Por Sede', value: 'LOCATION' },
  { title: 'Por Categoría', value: 'CATEGORY' },
  { title: 'Por Producto', value: 'PRODUCT' },
  { title: 'Por Variante', value: 'VARIANT' }
]

const pricingMethods = [
  { label: 'MARKUP - Precio automático con margen', value: 'MARKUP' },
  { label: 'FIXED - Precio manual', value: 'FIXED' }
]

const roundingOptions = [
  { label: 'Sin redondeo', value: 'NONE' },
  { label: 'Redondear hacia arriba', value: 'UP' },
  { label: 'Redondear hacia abajo', value: 'DOWN' },
  { label: 'Redondear al más cercano', value: 'NEAREST' }
]

const rules_validation = {
  required: v => (v !== null && v !== undefined && v !== '') || 'Campo requerido',
  positive: v => v >= 0 || 'Debe ser >= 0'
}

const getScopeLabel = (scope) => {
  const opt = scopeOptions.find(o => o.value === scope)
  return opt ? opt.title : scope
}

const getRoundingLabel = (rounding) => {
  const opt = roundingOptions.find(o => o.value === rounding)
  return opt ? opt.label : rounding
}

const loadRules = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loading.value = true
  try {
    const filters = { scope: scopeFilter.value, is_active: statusFilter.value }
    const r = await pricingRulesService.getPricingRules(tid, page, pageSize, filters)
    if (r.success) {
      rules.value = r.data
      totalItems.value = r.total
    } else showMsg('Error al cargar políticas', 'error')
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  loadRules({ page: 1, pageSize: 50, search: '', tenantId: tenantId.value })
}

const loadLocations = async () => {
  if (!tenantId.value) return
  const r = await pricingRulesService.getLocations(tenantId.value)
  if (r.success) locations.value = r.data
}

const loadCategories = async () => {
  if (!tenantId.value) return
  loadingCategories.value = true
  const r = await categoriesService.getAllCategories(tenantId.value)
  if (r.success) categories.value = r.data
  loadingCategories.value = false
}

const searchProducts = async (search) => {
  if (!search || search.length < 2 || !tenantId.value) return
  loadingProducts.value = true
  const r = await productsService.getProducts(tenantId.value, 1, 50, search)
  if (r.success) products.value = r.data
  loadingProducts.value = false
}

const searchVariants = async (search) => {
  if (!search || search.length < 2 || !tenantId.value) return
  loadingVariants.value = true
  const r = await productsService.searchVariants(tenantId.value, search)
  if (r.success) variants.value = r.data
  loadingVariants.value = false
}

const onScopeChange = () => {
  formData.value.location_id = null
  formData.value.category_id = null
  formData.value.product_id = null
  formData.value.variant_id = null
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    pricing_rule_id: null,
    scope: 'TENANT',
    location_id: null,
    category_id: null,
    product_id: null,
    variant_id: null,
    pricing_method: 'MARKUP',
    markup_percentage: 20,
    price_rounding: 'NONE',
    rounding_to: 1,
    priority: 0,
    is_active: true
  }
  loadLocations()
  loadCategories()
  dialog.value = true
}

const openEditDialog = (item) => {
  isEditing.value = true
  formData.value = { ...item }
  loadLocations()
  loadCategories()
  dialog.value = true
}

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return

  saving.value = true
  try {
    const r = isEditing.value
      ? await pricingRulesService.updatePricingRule(tenantId.value, formData.value.pricing_rule_id, formData.value)
      : await pricingRulesService.createPricingRule(tenantId.value, formData.value)

    if (r.success) {
      showMsg('Política guardada')
      dialog.value = false
      loadRules({ page: 1, pageSize: 50, search: '', tenantId: tenantId.value })
    } else showMsg(r.error || 'Error al guardar', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const doDelete = async () => {
  if (!itemToDelete.value || !tenantId.value) return
  deleting.value = true
  try {
    const r = await pricingRulesService.deletePricingRule(tenantId.value, itemToDelete.value.pricing_rule_id)
    if (r.success) {
      showMsg('Política eliminada')
      deleteDialog.value = false
      loadRules({ page: 1, pageSize: 50, search: '', tenantId: tenantId.value })
    } else showMsg(r.error, 'error')
  } finally {
    deleting.value = false
  }
}

const showMsg = (msg, color = 'success') => {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}
</script>
