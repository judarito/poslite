<template>
  <div class="list-view ofir-list-view">
    <!-- Toolbar con acciones -->
    <v-card flat class="ofir-list-view__card">
      <v-card-title class="ofir-list-view__title d-flex flex-column flex-sm-row align-start align-sm-center pa-2 pa-sm-4">
        <div class="d-flex align-center mb-2 mb-sm-0">
          <v-icon :icon="icon" class="mr-2"></v-icon>
          <span class="text-h6">{{ title }}</span>
        </div>
        <v-spacer class="d-none d-sm-flex"></v-spacer>
        
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
          class="ofir-list-view__search mb-2 mb-sm-0 mr-sm-2"
          style="max-width: 100%; width: 100%;"
          :style="{ 'max-width': $vuetify.display.smAndUp ? '300px' : '100%' }"
          @update:model-value="debouncedSearch"
        ></v-text-field>

        <!-- Botón crear -->
        <v-btn
          v-if="showCreateButton"
          class="ofir-list-view__create-btn"
          color="primary"
          prepend-icon="mdi-plus"
          :block="$vuetify.display.xs"
          @click="$emit('create')"
        >
          {{ createButtonText }}
        </v-btn>
      </v-card-title>

      <v-divider class="ofir-list-view__divider"></v-divider>

      <v-card-text v-if="$slots.filters" class="ofir-list-view__filters py-3">
        <slot name="filters"></slot>
      </v-card-text>

      <v-divider v-if="$slots.filters" class="ofir-list-view__divider"></v-divider>

      <!-- Loading -->
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        class="ofir-list-view__loading"
      ></v-progress-linear>

      <!-- Lista -->
      <v-list v-if="!loading && items.length > 0" lines="two" class="ofir-list-view__list">
        <template v-for="(item, index) in items" :key="item[itemKey]">
          <v-list-item
            @click="$emit('item-click', item)"
            class="ofir-list-view__item"
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
                <div class="d-flex flex-column flex-sm-row ga-1">
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
                </div>
              </slot>
            </template>
          </v-list-item>

          <v-divider v-if="index < items.length - 1" class="ofir-list-view__item-divider"></v-divider>
        </template>
      </v-list>

      <!-- Sin datos -->
      <v-card-text v-if="!loading && items.length === 0">
        <v-alert type="info" variant="tonal" class="text-center ofir-list-view__empty-alert">
          <v-icon size="48" class="mb-2">{{ emptyIcon }}</v-icon>
          <div>{{ emptyMessage }}</div>
        </v-alert>
      </v-card-text>

      <!-- Paginación -->
      <v-card-actions v-if="totalPages > 1" class="justify-center pa-2 ofir-list-view__pagination">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="$vuetify.display.xs ? 5 : 7"
          :size="$vuetify.display.xs ? 'small' : 'default'"
          @update:model-value="loadPage"
        ></v-pagination>
      </v-card-actions>

      <!-- Info de paginación -->
      <v-card-text v-if="items.length > 0" class="text-center text-caption pa-2 ofir-list-view__meta">
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

.ofir-list-view__card {
  border-radius: 18px;
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 0.98),
    rgba(var(--v-theme-background), 0.92)
  );
  overflow: hidden;
  box-shadow: 0 10px 22px rgba(20, 29, 51, 0.12);
}

:global(.ofir-shell--dark) .ofir-list-view__card {
  border-color: rgba(96, 134, 255, 0.24);
  background: linear-gradient(145deg, rgba(14, 23, 46, 0.92), rgba(9, 17, 34, 0.95)) !important;
  box-shadow: 0 14px 28px rgba(3, 8, 20, 0.36);
}

:global(.ofir-shell--light) .ofir-list-view__card {
  border-color: rgba(40, 88, 211, 0.18);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(242, 248, 255, 0.95)) !important;
}

.ofir-list-view__title {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.16);
  gap: 8px;
}

.ofir-list-view__search :deep(.v-field),
.ofir-list-view__filters :deep(.v-field) {
  border-radius: 12px;
}

.ofir-list-view__create-btn {
  border-radius: 12px;
  font-weight: 700;
}

.ofir-list-view__divider {
  opacity: 0.55;
}

.ofir-list-view__list {
  background: transparent !important;
}

.ofir-list-view__item {
  border-radius: 12px;
  margin: 4px 8px;
  border: 1px solid transparent;
  transition: background-color 0.2s ease;
}

:global(.ofir-shell--dark) .ofir-list-view__item {
  background: linear-gradient(120deg, rgba(14, 23, 46, 0.62), rgba(10, 18, 35, 0.44));
  border-color: rgba(95, 133, 255, 0.14);
}

:global(.ofir-shell--light) .ofir-list-view__item {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(41, 88, 212, 0.1);
}

.ofir-list-view__item-divider {
  margin: 0 12px;
}

.ofir-list-view__empty-alert {
  border-radius: 14px;
}

.ofir-list-view__pagination {
  border-top: 1px solid rgba(var(--v-theme-primary), 0.14);
}

.ofir-list-view__meta {
  opacity: 0.82;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

:global(.ofir-shell--dark) .cursor-pointer:hover {
  background: linear-gradient(120deg, rgba(40, 69, 146, 0.4), rgba(20, 35, 73, 0.34));
}

@media (max-width: 600px) {
  .ofir-list-view__item {
    margin: 2px 6px;
  }
}
</style>
