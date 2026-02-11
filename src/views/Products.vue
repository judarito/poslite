<template>
  <div>
    <ListView
      title="Productos"
      icon="mdi-package-variant-closed"
      :items="products"
      :total-items="totalItems"
      :loading="loading"
      item-key="product_id"
      title-field="name"
      avatar-icon="mdi-package-variant"
      avatar-color="indigo"
      empty-message="No hay productos registrados"
      create-button-text="Nuevo Producto"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @delete="confirmDelete"
      @load-page="loadProducts"
      @search="loadProducts"
    >
      <template #subtitle="{ item }">
        {{ item.category ? item.category.name : 'Sin categoría' }}
      </template>
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
            {{ item.is_active ? 'Activo' : 'Inactivo' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-cube-outline">
            {{ item.product_variants?.length || 0 }} variante(s)
          </v-chip>
          <v-chip v-if="item.track_inventory" size="small" variant="tonal" color="info" prepend-icon="mdi-archive">
            Inventario
          </v-chip>
        </div>
      </template>
    </ListView>

    <!-- Dialog Crear/Editar Producto -->
    <v-dialog v-model="dialog" max-width="700" scrollable>
      <v-card>
        <v-card-title>
          <v-icon start>{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="save">
            <v-row>
              <v-col cols="12" sm="8">
                <v-text-field v-model="formData.name" label="Nombre" prepend-inner-icon="mdi-text" variant="outlined" :rules="[rules.required]"></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select v-model="formData.category_id" label="Categoría" prepend-inner-icon="mdi-shape" variant="outlined" :items="categoryOptions" item-title="name" item-value="category_id" clearable></v-select>
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="formData.description" label="Descripción" prepend-inner-icon="mdi-text-long" variant="outlined" rows="2" auto-grow></v-textarea>
              </v-col>
              <v-col cols="6">
                <v-switch v-model="formData.is_active" label="Activo" color="success" hide-details></v-switch>
              </v-col>
              <v-col cols="6">
                <v-switch v-model="formData.track_inventory" label="Controlar inventario" color="info" hide-details></v-switch>
              </v-col>
            </v-row>

            <!-- Variantes -->
            <v-divider class="my-4"></v-divider>
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-1 font-weight-bold">Variantes</span>
              <v-spacer></v-spacer>
              <v-btn v-if="isEditing" size="small" color="primary" prepend-icon="mdi-plus" variant="tonal" @click="addVariant">Agregar</v-btn>
            </div>

            <div v-if="!isEditing" class="text-body-2 text-grey mb-2">
              Guarde el producto primero, luego agregue variantes.
            </div>

            <!-- Desktop: List -->
            <v-list v-if="isEditing && variants.length > 0" density="compact" class="d-none d-sm-block">
              <template v-for="(v, i) in variants" :key="v.variant_id || i">
                <v-list-item>
                  <v-list-item-title>{{ v.variant_name || 'Default' }} — SKU: {{ v.sku }}</v-list-item-title>
                  <v-list-item-subtitle>Costo: {{ v.cost }} | Precio: {{ v.price }}</v-list-item-subtitle>
                  <template #append>
                    <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editVariant(v)"></v-btn>
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDeleteVariant(v)"></v-btn>
                  </template>
                </v-list-item>
                <v-divider v-if="i < variants.length - 1"></v-divider>
              </template>
            </v-list>

            <!-- Mobile: Cards -->
            <div v-if="isEditing && variants.length > 0" class="d-sm-none">
              <v-card v-for="(v, i) in variants" :key="v.variant_id || i" variant="outlined" class="mb-2">
                <v-card-text>
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-body-2 font-weight-bold">{{ v.variant_name || 'Default' }}</div>
                    <v-chip size="x-small" color="primary">{{ v.sku }}</v-chip>
                  </div>
                  <v-divider class="my-2"></v-divider>
                  <div class="d-flex justify-space-between text-caption mb-1">
                    <span class="text-grey">Costo:</span>
                    <span>{{ v.cost }}</span>
                  </div>
                  <div class="d-flex justify-space-between text-caption mb-2">
                    <span class="text-grey">Precio:</span>
                    <span class="font-weight-bold">{{ v.price }}</span>
                  </div>
                  <div class="d-flex ga-2">
                    <v-btn prepend-icon="mdi-pencil" size="small" variant="outlined" color="primary" flex @click="editVariant(v)">
                      Editar
                    </v-btn>
                    <v-btn prepend-icon="mdi-delete" size="small" variant="outlined" color="error" flex @click="confirmDeleteVariant(v)">
                      Eliminar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">{{ isEditing ? 'Actualizar' : 'Crear' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Variante -->
    <v-dialog v-model="variantDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingVariant ? 'Editar Variante' : 'Nueva Variante' }}</v-card-title>
        <v-card-text>
          <v-form ref="variantForm" @submit.prevent="saveVariant">
            <v-text-field v-model="variantData.sku" label="SKU" prepend-inner-icon="mdi-barcode" variant="outlined" :rules="[rules.required]" class="mb-2"></v-text-field>
            <v-text-field v-model="variantData.variant_name" label="Nombre variante" prepend-inner-icon="mdi-text" variant="outlined" hint="Ej: Rojo / M" class="mb-2"></v-text-field>
            <v-row>
              <v-col cols="6">
                <v-text-field 
                  v-model.number="variantData.cost" 
                  label="Costo" 
                  prepend-inner-icon="mdi-cash-minus" 
                  variant="outlined" 
                  type="number" 
                  :rules="[rules.required, rules.positive]"
                  :readonly="true"
                  hint="Calculado automáticamente (promedio ponderado)"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field 
                  v-model.number="variantData.price" 
                  label="Precio" 
                  prepend-inner-icon="mdi-cash-plus" 
                  variant="outlined" 
                  type="number" 
                  :rules="[rules.required, rules.positive]"
                  :readonly="variantData.pricing_method === 'MARKUP'"
                  :hint="variantData.pricing_method === 'MARKUP' ? 'Calculado automáticamente según markup' : 'Precio manual'"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>

            <!-- Configuración de Precio -->
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-2 mb-3">Configuración de Precio</div>

            <v-select
              v-model="variantData.pricing_method"
              label="Método de precio"
              prepend-inner-icon="mdi-calculator"
              variant="outlined"
              :items="pricingMethods"
              item-title="label"
              item-value="value"
              hint="MARKUP: precio automático con margen. FIXED: precio manual"
              persistent-hint
              class="mb-3"
            ></v-select>

            <v-row v-if="variantData.pricing_method === 'MARKUP'">
              <v-col cols="12">
                <v-text-field
                  v-model.number="variantData.markup_percentage"
                  label="% de Ganancia (Markup)"
                  prepend-inner-icon="mdi-percent"
                  variant="outlined"
                  type="number"
                  min="0"
                  suffix="%"
                  hint="Porcentaje de ganancia sobre el costo"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="variantData.price_rounding"
                  label="Redondeo"
                  prepend-inner-icon="mdi-circle-outline"
                  variant="outlined"
                  :items="roundingOptions"
                  item-title="label"
                  item-value="value"
                  hint="Tipo de redondeo del precio calculado"
                  persistent-hint
                ></v-select>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="variantData.rounding_to"
                  label="Redondear a múltiplo de"
                  prepend-inner-icon="mdi-numeric"
                  variant="outlined"
                  type="number"
                  min="1"
                  hint="Ej: 100 para redondear a centenas"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-2 mb-3">Control de Inventario</div>

            <v-text-field 
              v-model.number="variantData.min_stock" 
              label="Stock mínimo" 
              prepend-inner-icon="mdi-alert-circle-outline" 
              variant="outlined" 
              type="number" 
              min="0"
              hint="Genera alerta cuando stock en cualquier sede esté bajo este valor"
              persistent-hint
              class="mb-2"
            ></v-text-field>
            <v-switch 
              v-model="variantData.allow_backorder" 
              label="Permitir sobreventa" 
              color="warning"
              hint="Si está activo, permite vender aunque no haya stock (inventario negativo)"
              persistent-hint
              class="mb-2"
            ></v-switch>
            <v-switch v-model="variantData.is_active" label="Activo" color="success" hide-details></v-switch>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="variantDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingVariant" @click="saveVariant">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirmations -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title><v-icon start color="error">mdi-alert</v-icon>Confirmar Eliminación</v-card-title>
        <v-card-text>¿Eliminar el producto <strong>{{ itemToDelete?.name }}</strong> y todas sus variantes?</v-card-text>
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
import productsService from '@/services/products.service'
import categoriesService from '@/services/categories.service'

const { tenantId } = useTenant()
const products = ref([])
const totalItems = ref(0)
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const variantDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const savingVariant = ref(false)
const deleting = ref(false)
const form = ref(null)
const variantForm = ref(null)
const itemToDelete = ref(null)
const categoryOptions = ref([])
const variants = ref([])
const editingVariant = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const formData = ref({ product_id: null, name: '', description: '', category_id: null, is_active: true, track_inventory: true })
const variantData = ref({ variant_id: null, product_id: null, sku: '', variant_name: '', cost: 0, price: 0, pricing_method: 'MARKUP', markup_percentage: 20, price_rounding: 'NONE', rounding_to: 1, min_stock: 0, allow_backorder: false, is_active: true })

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

const rules = {
  required: v => !!v || v === 0 || 'Campo requerido',
  positive: v => v >= 0 || 'Debe ser >= 0'
}

const loadProducts = async ({ page, pageSize, search, tenantId: tid }) => {
  if (!tid) return
  loading.value = true
  try {
    const r = await productsService.getProducts(tid, page, pageSize, search)
    if (r.success) { products.value = r.data; totalItems.value = r.total }
    else showMsg('Error al cargar productos', 'error')
  } finally { loading.value = false }
}

const loadCategories = async () => {
  if (!tenantId.value) return
  const r = await categoriesService.getAllCategories(tenantId.value)
  if (r.success) categoryOptions.value = r.data
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = { product_id: null, name: '', description: '', category_id: null, is_active: true, track_inventory: true }
  variants.value = []
  loadCategories()
  dialog.value = true
}

const openEditDialog = async (item) => {
  isEditing.value = true
  loadCategories()
  const r = await productsService.getProductById(tenantId.value, item.product_id)
  if (r.success) {
    formData.value = { product_id: r.data.product_id, name: r.data.name, description: r.data.description, category_id: r.data.category_id, is_active: r.data.is_active, track_inventory: r.data.track_inventory }
    variants.value = r.data.product_variants || []
    dialog.value = true
  } else showMsg('Error al cargar producto', 'error')
}

const save = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  saving.value = true
  try {
    const r = isEditing.value
      ? await productsService.updateProduct(tenantId.value, formData.value.product_id, formData.value)
      : await productsService.createProduct(tenantId.value, formData.value)
    if (r.success) {
      showMsg(isEditing.value ? 'Producto actualizado' : 'Producto creado')
      if (!isEditing.value) {
        // Abrir para editar y poder agregar variantes
        formData.value.product_id = r.data.product_id
        isEditing.value = true
        variants.value = []
      } else {
        dialog.value = false
      }
      loadProducts({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value })
    } else showMsg(r.error || 'Error al guardar', 'error')
  } finally { saving.value = false }
}

const confirmDelete = (item) => { itemToDelete.value = item; deleteDialog.value = true }
const doDelete = async () => {
  if (!itemToDelete.value || !tenantId.value) return
  deleting.value = true
  try {
    const r = await productsService.deleteProduct(tenantId.value, itemToDelete.value.product_id)
    if (r.success) { showMsg('Producto eliminado'); deleteDialog.value = false; loadProducts({ page: 1, pageSize: 10, search: '', tenantId: tenantId.value }) }
    else showMsg(r.error, 'error')
  } finally { deleting.value = false }
}

// Variantes
const addVariant = () => { 
  editingVariant.value = false
  variantData.value = { 
    variant_id: null, 
    product_id: formData.value.product_id, 
    sku: '', 
    variant_name: '', 
    cost: 0, 
    price: 0, 
    pricing_method: 'MARKUP', 
    markup_percentage: 20, 
    price_rounding: 'NONE', 
    rounding_to: 1, 
    min_stock: 0, 
    allow_backorder: false, 
    is_active: true 
  }
  variantDialog.value = true 
}
const editVariant = (v) => { 
  editingVariant.value = true
  variantData.value = { 
    ...v, 
    pricing_method: v.pricing_method || 'MARKUP',
    markup_percentage: v.markup_percentage || 20,
    price_rounding: v.price_rounding || 'NONE',
    rounding_to: v.rounding_to || 1,
    min_stock: v.min_stock || 0, 
    allow_backorder: v.allow_backorder || false 
  }
  variantDialog.value = true 
}

const saveVariant = async () => {
  const { valid } = await variantForm.value.validate()
  if (!valid || !tenantId.value) return
  savingVariant.value = true
  try {
    const r = editingVariant.value
      ? await productsService.updateVariant(tenantId.value, variantData.value.variant_id, variantData.value)
      : await productsService.createVariant(tenantId.value, { ...variantData.value, product_id: formData.value.product_id })
    if (r.success) {
      showMsg('Variante guardada')
      variantDialog.value = false
      // Recargar variantes
      const pr = await productsService.getProductById(tenantId.value, formData.value.product_id)
      if (pr.success) variants.value = pr.data.product_variants || []
    } else showMsg(r.error, 'error')
  } finally { savingVariant.value = false }
}

const confirmDeleteVariant = async (v) => {
  if (!confirm('¿Eliminar esta variante?')) return
  const r = await productsService.deleteVariant(tenantId.value, v.variant_id)
  if (r.success) {
    showMsg('Variante eliminada')
    variants.value = variants.value.filter(x => x.variant_id !== v.variant_id)
  } else showMsg(r.error, 'error')
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }
</script>
