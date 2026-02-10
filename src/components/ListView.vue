<template>
  <div class="list-view">
    <!-- Toolbar con acciones -->
    <v-card flat>
      <v-card-title class="d-flex align-center">
        <v-icon :icon="icon" class="mr-2"></v-icon>
        {{ title }}
        <v-spacer></v-spacer>
        
        <!-- Búsqueda -->
        <v-text-field
          v-if="searchable"
          v-model="searchQuery"
          density="compact"
          variant="outlined"
          label="Buscar"
          prepend-inner-icon="mdi-magnify"
          single-line
          hide-details
          class="mr-2"
          style="max-width: 300px;"
          @update:model-value="debouncedSearch"
        ></v-text-field>

        <!-- Botón crear -->
        <v-btn
          v-if="showCreateButton"
          color="primary"
          prepend-icon="mdi-plus"
          @click="$emit('create')"
        >
          {{ createButtonText }}
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Loading -->
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
      ></v-progress-linear>

      <!-- Lista -->
      <v-list v-if="!loading && items.length > 0" lines="two">
        <template v-for="(item, index) in items" :key="item[itemKey]">
          <v-list-item
            @click="$emit('item-click', item)"
            :class="{ 'cursor-pointer': clickable }"
          >
            <!-- Avatar/Icono -->
            <template v-slot:prepend v-if="$slots.avatar || avatarIcon">
              <slot name="avatar" :item="item">
                <v-avatar :color="avatarColor">
                  <v-icon>{{ avatarIcon }}</v-icon>
                </v-avatar>
              </slot>
            </template>

            <!-- Título y subtítulo -->
            <v-list-item-title>
              <slot name="title" :item="item">
                {{ item[titleField] }}
              </slot>
            </v-list-item-title>

            <v-list-item-subtitle v-if="subtitleField || $slots.subtitle">
              <slot name="subtitle" :item="item">
                {{ item[subtitleField] }}
              </slot>
            </v-list-item-subtitle>

            <!-- Contenido adicional -->
            <template v-if="$slots.content">
              <slot name="content" :item="item"></slot>
            </template>

            <!-- Acciones -->
            <template v-slot:append v-if="showActions || $slots.actions">
              <slot name="actions" :item="item">
                <v-btn
                  v-if="editable"
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click.stop="$emit('edit', item)"
                ></v-btn>
                <v-btn
                  v-if="deletable"
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click.stop="$emit('delete', item)"
                ></v-btn>
              </slot>
            </template>
          </v-list-item>

          <v-divider v-if="index < items.length - 1"></v-divider>
        </template>
      </v-list>

      <!-- Sin datos -->
      <v-card-text v-if="!loading && items.length === 0">
        <v-alert type="info" variant="tonal" class="text-center">
          <v-icon size="48" class="mb-2">{{ emptyIcon }}</v-icon>
          <div>{{ emptyMessage }}</div>
        </v-alert>
      </v-card-text>

      <!-- Paginación -->
      <v-card-actions v-if="totalPages > 1" class="justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          @update:model-value="loadPage"
        ></v-pagination>
      </v-card-actions>

      <!-- Info de paginación -->
      <v-card-text v-if="items.length > 0" class="text-center text-caption">
        Mostrando {{ startIndex + 1 }} - {{ endIndex }} de {{ totalItems }} registros
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'mdi-view-list' },
  items: { type: Array, default: () => [] },
  totalItems: { type: Number, default: 0 },
  itemKey: { type: String, default: 'id' },
  titleField: { type: String, default: 'name' },
  subtitleField: { type: String, default: '' },
  pageSize: { type: Number, default: 10 },
  loading: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  clickable: { type: Boolean, default: false },
  editable: { type: Boolean, default: true },
  deletable: { type: Boolean, default: true },
  showCreateButton: { type: Boolean, default: true },
  createButtonText: { type: String, default: 'Crear' },
  avatarIcon: { type: String, default: '' },
  avatarColor: { type: String, default: 'primary' },
  emptyMessage: { type: String, default: 'No hay registros para mostrar' },
  emptyIcon: { type: String, default: 'mdi-inbox' }
})

const emit = defineEmits([
  'create',
  'edit',
  'delete',
  'item-click',
  'load-page',
  'search'
])

const { tenantId } = useTenant()
const currentPage = ref(1)
const searchQuery = ref('')
let searchTimeout = null

const totalPages = computed(() => Math.ceil(props.totalItems / props.pageSize))
const startIndex = computed(() => (currentPage.value - 1) * props.pageSize)
const endIndex = computed(() => Math.min(startIndex.value + props.pageSize, props.totalItems))
const showActions = computed(() => props.editable || props.deletable)

const loadPage = (page) => {
  emit('load-page', {
    page,
    pageSize: props.pageSize,
    search: searchQuery.value,
    tenantId: tenantId.value
  })
}

const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    emit('search', {
      search: searchQuery.value,
      page: 1,
      pageSize: props.pageSize,
      tenantId: tenantId.value
    })
  }, 500)
}

// Recargar cuando cambia el tenant
watch(() => tenantId.value, () => {
  if (tenantId.value) {
    currentPage.value = 1
    loadPage(1)
  }
})

onMounted(() => {
  if (tenantId.value) {
    loadPage(1)
  }
})
</script>

<style scoped>
.list-view {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
