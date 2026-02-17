<template>
  <div>
    <!-- Tabs para separar productos y componentes -->
    <v-tabs v-model="currentTab" class="mb-3" color="primary">
      <v-tab value="products">
        <v-icon start>mdi-package-variant-closed</v-icon>
        Productos para Venta
      </v-tab>
      <v-tab value="components">
        <v-icon start>mdi-cog</v-icon>
        Insumos/Componentes
      </v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <!-- Tab: Productos para Venta -->
      <v-window-item value="products">
        <ListView
          title="Productos para Venta"
          icon="mdi-package-variant-closed"
          :items="products"
          :total-items="totalItems"
          :loading="loading"
          :page-size="defaultPageSize"
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
          <template #actions="{ item }">
            <div class="d-flex flex-column flex-sm-row ga-1">
              <v-tooltip text="Gestionar variantes" location="top">
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-cube-outline"
                    variant="text"
                    size="small"
                    color="primary"
                    v-bind="props"
                    @click.stop="openVariantDialogFromList(item)"
                  ></v-btn>
                </template>
              </v-tooltip>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click.stop="openEditDialog(item)"
              ></v-btn>
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click.stop="confirmDelete(item)"
              ></v-btn>
            </div>
          </template>
        </ListView>
      </v-window-item>

      <!-- Tab: Insumos/Componentes -->
      <v-window-item value="components">
        <ListView
          title="Insumos/Componentes"
          icon="mdi-cog"
          :items="products"
          :total-items="totalItems"
          :loading="loading"
          :page-size="defaultPageSize"
          item-key="product_id"
          title-field="name"
          avatar-icon="mdi-cog"
          avatar-color="orange"
          empty-message="No hay componentes registrados"
          create-button-text="Nuevo Componente"
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
              <v-chip color="orange" size="small" variant="flat">
                Es componente
              </v-chip>
              <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
                {{ item.is_active ? 'Activo' : 'Inactivo' }}
              </v-chip>
              <v-chip size="small" variant="tonal" prepend-icon="mdi-cube-outline">
                {{ item.product_variants?.length || 0 }} variante(s)
              </v-chip>
            </div>
          </template>
          <template #actions="{ item }">
            <div class="d-flex flex-column flex-sm-row ga-1">
              <v-tooltip text="Gestionar variantes" location="top">
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-cube-outline"
                    variant="text"
                    size="small"
                    color="primary"
                    v-bind="props"
                    @click.stop="openVariantDialogFromList(item)"
                  ></v-btn>
                </template>
              </v-tooltip>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click.stop="openEditDialog(item)"
              ></v-btn>
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click.stop="confirmDelete(item)"
              ></v-btn>
            </div>
          </template>
        </ListView>
      </v-window-item>
    </v-window>

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
              <v-col cols="12">
                <v-switch 
                  v-model="formData.requires_expiration" 
                  label="Requiere control de vencimiento" 
                  color="warning"
                  hint="Los productos con esta opción activa deben registrarse en lotes con fecha de vencimiento"
                  persistent-hint
                ></v-switch>
              </v-col>
            </v-row>

            <!-- Manufactura -->
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-1 font-weight-bold mb-3">
              <v-icon start color="primary">mdi-cog</v-icon>
              Configuración de Manufactura
            </div>
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="formData.inventory_behavior"
                  :items="inventoryBehaviorOptions"
                  label="Tipo de Inventario"
                  prepend-inner-icon="mdi-cube-outline"
                  variant="outlined"
                  hint="Define cómo se maneja el inventario"
                  persistent-hint
                ></v-select>
              </v-col>
              <v-col v-if="formData.inventory_behavior === 'MANUFACTURED'" cols="12" sm="6">
                <v-select
                  v-model="formData.production_type"
                  :items="productionTypeOptions"
                  label="Tipo de Producción"
                  prepend-inner-icon="mdi-factory"
                  variant="outlined"
                  hint="Bajo demanda o para stock"
                  persistent-hint
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="formData.is_component"
                  label="Es componente de otros productos"
                  color="warning"
                  hint="Marca este producto como componente para poder usarlo en BOMs"
                  persistent-hint
                ></v-switch>
              </v-col>
              <v-col v-if="formData.inventory_behavior === 'MANUFACTURED' && isEditing" cols="12">
                <v-btn
                  color="primary"
                  variant="tonal"
                  block
                  prepend-icon="mdi-file-tree"
                  @click="openBOMEditor"
                >
                  {{ formData.active_bom_id ? 'Editar BOM' : 'Configurar BOM' }}
                </v-btn>
                <div v-if="formData.active_bom_id" class="text-caption text-success mt-1">
                  <v-icon size="small">mdi-check-circle</v-icon>
                  BOM configurado
                </div>
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
            <div class="d-flex ga-2 align-end mb-2">
              <v-text-field 
                v-model="variantData.sku" 
                label="SKU" 
                prepend-inner-icon="mdi-barcode" 
                variant="outlined" 
                :rules="[rules.required]"
                hint="Código único del producto"
                persistent-hint
                style="flex: 1"
              ></v-text-field>
              <v-tooltip text="Generar SKU automático" location="top">
                <template #activator="{ props }">
                  <v-btn 
                    v-bind="props"
                    icon="mdi-auto-fix"
                    color="primary" 
                    variant="tonal" 
                    @click="autoGenerateSKU"
                    :disabled="!formData.name"
                  ></v-btn>
                </template>
              </v-tooltip>
            </div>
            <v-text-field 
              v-model="variantData.variant_name" 
              label="Nombre variante" 
              prepend-inner-icon="mdi-text" 
              variant="outlined" 
              hint="Ej: Rojo / M" 
              class="mb-2"
            ></v-text-field>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field 
                  v-model.number="variantData.cost" 
                  label="Costo" 
                  prepend-inner-icon="mdi-cash-minus" 
                  variant="outlined" 
                  type="number" 
                  :rules="[rules.required, rules.positive]"
                  hint="Costo base de la variante"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field 
                  v-model.number="variantData.price" 
                  label="Precio de Venta" 
                  prepend-inner-icon="mdi-cash-plus" 
                  variant="outlined" 
                  type="number" 
                  :rules="[rules.required, rules.positive]"
                  hint="Precio calculado según políticas de precio"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-switch 
                  v-model="variantData.price_includes_tax" 
                  label="Precio incluye IVA (IVA incluido)" 
                  color="primary"
                  hint="Si está activo: el precio ya incluye el IVA (se descompone). Si está inactivo: el IVA se suma al precio."
                  persistent-hint
                  class="mb-2"
                ></v-switch>
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
            <div class="mb-2">
              <div class="d-flex align-center ga-2 mb-1">
                <span class="text-body-2">Control de vencimiento</span>
                <v-tooltip text="Null = heredar del producto, True = requerir, False = no requerir">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" size="small" color="grey">mdi-information</v-icon>
                  </template>
                </v-tooltip>
              </div>
              <v-radio-group 
                v-model="variantData.requires_expiration" 
                inline
                hide-details
              >
                <v-radio label="Heredar del producto" :value="null"></v-radio>
                <v-radio label="Sí requiere" :value="true"></v-radio>
                <v-radio label="No requiere" :value="false"></v-radio>
              </v-radio-group>
            </div>
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

    <!-- BOM Editor -->
    <BOMEditor ref="bomEditor" @saved="onBOMSaved" />

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useTenantSettings } from '@/composables/useTenantSettings'
import ListView from '@/components/ListView.vue'
import BOMEditor from '@/components/BOMEditor.vue'
import productsService from '@/services/products.service'
import categoriesService from '@/services/categories.service'
import manufacturingService from '@/services/manufacturing.service'
import { generateSKU, generateShortSKU } from '@/utils/skuGenerator'

const { tenantId } = useTenant()
const { defaultPageSize, loadSettings } = useTenantSettings()
const currentTab = ref('products')
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
const bomEditor = ref(null)

const formData = ref({ 
  product_id: null, 
  name: '', 
  description: '', 
  category_id: null, 
  is_active: true, 
  track_inventory: true, 
  requires_expiration: false,
  inventory_behavior: 'RESELL',
  production_type: null,
  is_component: false,
  active_bom_id: null
})

const variantData = ref({ 
  variant_id: null, 
  product_id: null, 
  sku: '', 
  variant_name: '', 
  cost: 0, 
  price: 0, 
  price_includes_tax: false, 
  min_stock: 0, 
  allow_backorder: false, 
  requires_expiration: null, 
  is_active: true 
})

const inventoryBehaviorOptions = [
  { value: 'RESELL', title: 'Reventa (Normal)' },
  { value: 'SERVICE', title: 'Servicio (Sin inventario)' },
  { value: 'MANUFACTURED', title: 'Manufacturado' },
  { value: 'BUNDLE', title: 'Combo/Bundle' }
]

const productionTypeOptions = [
  { value: 'ON_DEMAND', title: 'Bajo Demanda (On-Demand)' },
  { value: 'TO_STOCK', title: 'Para Stock (To-Stock)' }
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
    if (r.success) {
      // Filtrar según el tab activo
      const isComponentTab = currentTab.value === 'components'
      const filtered = r.data.filter(p => p.is_component === isComponentTab)
      products.value = filtered
      totalItems.value = filtered.length
    } else {
      showMsg('Error al cargar productos', 'error')
    }
  } finally { loading.value = false }
}

const loadCategories = async () => {
  if (!tenantId.value) return
  const r = await categoriesService.getAllCategories(tenantId.value)
  if (r.success) categoryOptions.value = r.data
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = { product_id: null, name: '', description: '', category_id: null, is_active: true, track_inventory: true, requires_expiration: false }
  variants.value = []
  loadCategories()
  dialog.value = true
}

const openEditDialog = async (item) => {
  isEditing.value = true
  loadCategories()
  const r = await productsService.getProductById(tenantId.value, item.product_id)
  if (r.success) {
    formData.value = { 
      product_id: r.data.product_id, 
      name: r.data.name, 
      description: r.data.description, 
      category_id: r.data.category_id, 
      is_active: r.data.is_active, 
      track_inventory: r.data.track_inventory,
      requires_expiration: r.data.requires_expiration || false,
      inventory_behavior: r.data.inventory_behavior || 'RESELL',
      production_type: r.data.production_type || null,
      is_component: r.data.is_component || false,
      active_bom_id: r.data.active_bom_id || null
    }
    variants.value = r.data.product_variants || []
    dialog.value = true
  } else showMsg('Error al cargar producto', 'error')
}

const openVariantDialogFromList = async (item) => {
  // Cargar el producto y abrir directamente el diálogo de agregar variante
  isEditing.value = true
  loadCategories()
  const r = await productsService.getProductById(tenantId.value, item.product_id)
  if (r.success) {
    formData.value = { 
      product_id: r.data.product_id, 
      name: r.data.name, 
      description: r.data.description, 
      category_id: r.data.category_id, 
      is_active: r.data.is_active, 
      track_inventory: r.data.track_inventory,
      requires_expiration: r.data.requires_expiration || false
    }
    variants.value = r.data.product_variants || []
    // Abrir inmediatamente el diálogo de agregar variante
    addVariant()
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
    price_includes_tax: false, 
    min_stock: 0, 
    allow_backorder: false, 
    is_active: true,
    requires_expiration: null  // null = hereda del producto
  }
  variantDialog.value = true 
}
const editVariant = (v) => { 
  editingVariant.value = true
  variantData.value = { 
    ...v, 
    min_stock: v.min_stock || 0, 
    allow_backorder: v.allow_backorder || false, 
    price_includes_tax: v.price_includes_tax || false,
    requires_expiration: v.requires_expiration !== undefined ? v.requires_expiration : null
  }
  variantDialog.value = true 
}

// Generar SKU automáticamente basado en producto, categoría y variante
const autoGenerateSKU = () => {
  const productName = formData.value.name || ''
  const variantName = variantData.value.variant_name || ''
  
  // Buscar el nombre de la categoría si existe
  let categoryName = ''
  if (formData.value.category_id) {
    const category = categoryOptions.value.find(c => c.category_id === formData.value.category_id)
    categoryName = category ? category.name : ''
  }

  // Generar SKU usando la función utilitaria
  const generatedSKU = generateSKU(productName, categoryName, variantName)
  variantData.value.sku = generatedSKU
  
  showMsg('SKU generado automáticamente', 'info')
}

const saveVariant = async () => {
  console.log('saveVariant called', { 
    hasForm: !!variantForm.value, 
    hasTenant: !!tenantId.value,
    variantData: variantData.value 
  })
  
  if (!variantForm.value) {
    console.error('variantForm is null!')
    showMsg('Error: Formulario no inicializado', 'error')
    return
  }
  
  if (!tenantId.value) {
    console.error('tenantId is null!')
    showMsg('Error: No hay tenant seleccionado', 'error')
    return
  }
  
  const validationResult = await variantForm.value.validate()
  console.log('Validation result:', validationResult)
  
  if (!validationResult.valid) {
    console.log('Form is not valid')
    showMsg('Por favor complete todos los campos requeridos', 'warning')
    return
  }
  
  savingVariant.value = true
  try {
    console.log('Saving variant...', { editing: editingVariant.value })
    const r = editingVariant.value
      ? await productsService.updateVariant(tenantId.value, variantData.value.variant_id, variantData.value)
      : await productsService.createVariant(tenantId.value, { ...variantData.value, product_id: formData.value.product_id })
    console.log('Save result:', r)
    if (r.success) {
      showMsg('Variante guardada')
      variantDialog.value = false
      // Recargar variantes
      const pr = await productsService.getProductById(tenantId.value, formData.value.product_id)
      if (pr.success) variants.value = pr.data.product_variants || []
    } else showMsg(r.error, 'error')
  } catch (error) {
    console.error('Error saving variant:', error)
    showMsg('Error al guardar variante: ' + error.message, 'error')
  } finally { 
    savingVariant.value = false 
  }
}

const confirmDeleteVariant = async (v) => {
  if (!confirm('¿Eliminar esta variante?')) return
  const r = await productsService.deleteVariant(tenantId.value, v.variant_id)
  if (r.success) {
    showMsg('Variante eliminada')
    variants.value = variants.value.filter(x => x.variant_id !== v.variant_id)
  } else showMsg(r.error, 'error')
}

const openBOMEditor = async () => {
  if (!formData.value.product_id) return
  
  // Si ya tiene BOM, cargar el existente
  if (formData.value.active_bom_id) {
    try {
      const result = await manufacturingService.getBOMById(tenantId.value, formData.value.active_bom_id)
      if (result.success && bomEditor.value) {
        bomEditor.value.open(formData.value.product_id, null, result.data)
      }
    } catch (error) {
      console.error('Error loading BOM:', error)
      showMsg('Error al cargar BOM', 'error')
    }
  } else {
    // Crear nuevo BOM
    if (bomEditor.value) {
      bomEditor.value.open(formData.value.product_id, null, null)
    }
  }
}

const onBOMSaved = async (bomData) => {
  // Activar el BOM recién creado/actualizado
  try {
    const result = await manufacturingService.activateBOM(
      tenantId.value,
      formData.value.product_id,
      null, // Variant ID null porque es a nivel de producto
      bomData
    )
    
    if (result.success) {
      formData.value.active_bom_id = bomData
      showMsg('BOM guardado y activado', 'success')
    }
  } catch (error) {
    console.error('Error activating BOM:', error)
    showMsg('BOM guardado pero no se pudo activar', 'warning')
  }
}

const showMsg = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true }

// Lifecycle
onMounted(async () => {
  await loadSettings()
})

// Recargar productos cuando cambie el tab
watch(currentTab, () => {
  if (tenantId.value) {
    loadProducts({ page: 1, pageSize: defaultPageSize.value, search: '', tenantId: tenantId.value })
  }
})
</script>
