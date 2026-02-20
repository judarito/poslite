<template>
  <div>
    <v-card class="mb-4" variant="tonal" color="deep-purple">
      <v-card-text class="d-flex align-center gap-3">
        <v-icon size="36" color="deep-purple">mdi-shield-crown</v-icon>
        <div>
          <div class="text-h6 font-weight-bold">Gestión Global: Roles, Permisos y Menús</div>
          <div class="text-body-2 text-medium-emphasis">
            Solo Superadmin — Los cambios se propagan a <strong>todos los tenants</strong>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-tabs v-model="activeTab" color="deep-purple" class="mb-4">
      <v-tab value="roles">
        <v-icon start>mdi-account-key</v-icon>
        Roles y Menús
      </v-tab>
      <v-tab value="menus">
        <v-icon start>mdi-menu</v-icon>
        Catálogo de Menús
      </v-tab>
      <v-tab value="permisos">
        <v-icon start>mdi-lock-check</v-icon>
        Permisos del Sistema
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">

      <!-- ============================================================ -->
      <!-- TAB 1: ROLES Y MENÚS                                         -->
      <!-- ============================================================ -->
      <v-window-item value="roles">
        <v-row>
          <!-- Panel izquierdo: lista de roles estándar -->
          <v-col cols="12" md="4">
            <v-card>
              <v-card-title class="d-flex align-center justify-space-between">
                <span>Roles Estándar</span>
                <v-btn size="small" color="deep-purple" variant="tonal" prepend-icon="mdi-plus"
                  @click="openRoleDialog()">Nuevo</v-btn>
              </v-card-title>
              <v-divider />

              <v-list v-if="standardRoles.length > 0" nav>
                <v-list-item
                  v-for="role in standardRoles"
                  :key="role"
                  :value="role"
                  :active="selectedRoleName === role"
                  active-color="deep-purple"
                  rounded="lg"
                  @click="selectRole(role)"
                >
                  <template #prepend>
                    <v-icon color="deep-purple">mdi-account-key</v-icon>
                  </template>
                  <v-list-item-title>{{ role }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ (roleMenuCodes[role] || []).length }} menús asignados
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-card-text v-else class="text-center text-grey py-6">
                <v-icon size="40" class="mb-2">mdi-account-off</v-icon>
                <div>No hay roles definidos</div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Panel derecho: menús del rol seleccionado -->
          <v-col cols="12" md="8">
            <v-card v-if="selectedRoleName">
              <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
                <span>
                  <v-icon start color="deep-purple">mdi-shield-account</v-icon>
                  Menús para: <strong>{{ selectedRoleName }}</strong>
                </span>
                <v-btn
                  color="deep-purple"
                  variant="elevated"
                  prepend-icon="mdi-sync"
                  :loading="syncingRole"
                  @click="syncRoleToAllTenants()"
                >
                  Sincronizar a todos los tenants
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Selecciona los menús que tendrán los usuarios con el rol
                  <strong>{{ selectedRoleName }}</strong>. Los cambios se propagan a todos los tenants al sincronizar.
                </p>

                <!-- Árbol de menús con checkboxes -->
                <!-- Solo las HOJAS (con ruta) son seleccionables.
                     Los grupos padre son incluidos automáticamente por fn_get_user_menus. -->
                <div v-for="group in menuTreeForRole" :key="group.code" class="mb-4">

                  <!-- Grupo raíz sin hijos (ítem hoja como HOME, POS, REPORTES) -->
                  <div v-if="!group.children || group.children.length === 0"
                    class="d-flex align-center mb-1 pl-1">
                    <v-checkbox
                      v-model="selectedMenuCodes"
                      :value="group.code"
                      hide-details
                      density="compact"
                      color="deep-purple"
                    />
                    <v-icon :icon="group.icon || 'mdi-circle-small'" class="mr-2" size="20" color="deep-purple" />
                    <span class="text-subtitle-2 font-weight-medium">{{ group.label }}</span>
                    <span v-if="group.route" class="text-caption text-grey ml-2">{{ group.route }}</span>
                  </div>

                  <!-- Grupo con hijos: header como etiqueta (no checkbox, auto-incluido) -->
                  <div v-else>
                    <div class="d-flex align-center mb-2 pl-1">
                      <v-icon :icon="group.icon || 'mdi-folder'" class="mr-2" size="20" color="deep-purple" />
                      <span class="text-subtitle-2 font-weight-bold text-deep-purple">{{ group.label }}</span>
                      <v-chip size="x-small" color="deep-purple" variant="tonal" class="ml-2">grupo padre — auto-incluido</v-chip>
                    </div>

                    <!-- Submenús: estos sí son checkboxes (son las hojas reales) -->
                    <div class="pl-8">
                      <div v-for="child in group.children" :key="child.code"
                        class="d-flex align-center mb-1">
                        <v-checkbox
                          v-model="selectedMenuCodes"
                          :value="child.code"
                          hide-details
                          density="compact"
                          color="deep-purple"
                          :disabled="child.is_superadmin_only"
                        />
                        <v-icon :icon="child.icon || 'mdi-circle-small'" class="mr-2" size="16" />
                        <span class="text-body-2">{{ child.label }}</span>
                        <v-chip v-if="child.is_superadmin_only" size="x-small" color="orange" class="ml-2">SUPERADMIN</v-chip>
                        <span v-if="child.route" class="text-caption text-grey ml-2">{{ child.route }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <v-card v-else variant="outlined" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-cursor-pointer</v-icon>
              <div class="text-h6 text-grey">Selecciona un rol para ver sus menús</div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ============================================================ -->
      <!-- TAB 2: CATÁLOGO DE MENÚS                                     -->
      <!-- ============================================================ -->
      <v-window-item value="menus">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Catálogo Global de Menús</span>
            <v-btn color="deep-purple" variant="tonal" prepend-icon="mdi-plus"
              @click="openMenuDialog()">Nuevo Ítem</v-btn>
          </v-card-title>
          <v-divider />

          <v-card-text v-if="loadingMenus" class="text-center py-8">
            <v-progress-circular indeterminate color="deep-purple" />
          </v-card-text>

          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Código</th>
                <th>Label</th>
                <th>Ícono</th>
                <th>Ruta / Acción</th>
                <th>Padre</th>
                <th>Orden</th>
                <th>Solo SA</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in flatMenuItems" :key="item.menu_item_id">
                <td><code class="text-caption">{{ item.code }}</code></td>
                <td>
                  <div class="d-flex align-center gap-1">
                    <v-icon v-if="item.icon" :icon="item.icon" size="16" />
                    {{ item.label }}
                  </div>
                </td>
                <td><code class="text-caption">{{ item.icon }}</code></td>
                <td class="text-caption text-grey">{{ item.route || item.action || '—' }}</td>
                <td><code v-if="item.parent_code" class="text-caption">{{ item.parent_code }}</code><span v-else class="text-grey">—</span></td>
                <td>{{ item.sort_order }}</td>
                <td>
                  <v-chip v-if="item.is_superadmin_only" color="orange" size="x-small">SA</v-chip>
                  <span v-else class="text-grey text-caption">No</span>
                </td>
                <td>
                  <v-chip :color="item.is_active ? 'success' : 'error'" size="x-small">
                    {{ item.is_active ? 'Activo' : 'Inactivo' }}
                  </v-chip>
                </td>
                <td>
                  <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openMenuDialog(item)" />
                  <v-btn
                    :icon="item.is_active ? 'mdi-eye-off' : 'mdi-eye'"
                    size="x-small"
                    variant="text"
                    :color="item.is_active ? 'error' : 'success'"
                    @click="toggleMenu(item)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-window-item>

      <!-- ============================================================ -->
      <!-- TAB 3: PERMISOS DEL SISTEMA                                  -->
      <!-- ============================================================ -->
      <v-window-item value="permisos">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-lock-check</v-icon>
            Permisos del Sistema
            <v-chip size="small" color="grey" class="ml-2">Solo lectura</v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Los permisos son definidos a nivel de sistema y no pertenecen a ningún tenant.
              Se asignan a roles vía <strong>role_permissions</strong> y a menús vía <strong>menu_permissions</strong>.
            </p>

            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="(perms, module) in groupedPermissions"
                :key="module"
              >
                <v-expansion-panel-title>
                  <v-icon class="mr-2" color="deep-purple">mdi-folder-key</v-icon>
                  <strong>{{ module }}</strong>
                  <v-chip size="x-small" color="grey" class="ml-2">{{ perms.length }}</v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in perms" :key="p.permission_id">
                        <td><code class="text-caption">{{ p.code }}</code></td>
                        <td class="text-body-2">{{ p.description || '—' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-window-item>

    </v-window>

    <!-- ============================================================ -->
    <!-- DIALOG: Crear/Editar Rol                                     -->
    <!-- ============================================================ -->
    <v-dialog v-model="roleDialog" max-width="450">
      <v-card>
        <v-card-title>
          <v-icon start>mdi-account-key</v-icon>
          {{ editingRole ? 'Editar Rol' : 'Nuevo Rol Estándar' }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Este rol se creará en <strong>todos los tenants</strong> del sistema.
          </p>
          <v-text-field
            v-model="roleForm.name"
            label="Nombre del rol"
            variant="outlined"
            :rules="[v => !!v || 'Requerido']"
            placeholder="ej: SUPERVISOR"
            hint="Se creará en mayúsculas en todos los tenants"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="roleDialog = false">Cancelar</v-btn>
          <v-btn color="deep-purple" variant="elevated" :loading="savingRole"
            @click="saveRole">
            Crear en todos los tenants
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============================================================ -->
    <!-- DIALOG: Crear/Editar Ítem de Menú                            -->
    <!-- ============================================================ -->
    <v-dialog v-model="menuDialog" max-width="600" scrollable>
      <v-card>
        <v-card-title>
          <v-icon start>mdi-menu</v-icon>
          {{ editingMenu ? 'Editar Ítem de Menú' : 'Nuevo Ítem de Menú' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="menuForm">
            <v-row dense>
              <v-col cols="6">
                <v-text-field v-model="menuFormData.code" label="Código (único)" variant="outlined"
                  :disabled="!!editingMenu" density="compact"
                  placeholder="ej: VENTAS.DEVOLUCIONES" hint="No modificable después de crear"
                  :rules="[v => !!v || 'Requerido']" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="menuFormData.label" label="Etiqueta" variant="outlined"
                  density="compact" :rules="[v => !!v || 'Requerido']" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="menuFormData.icon" label="Ícono MDI" variant="outlined"
                  density="compact" placeholder="mdi-cart" />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="menuFormData.route" label="Ruta (route)" variant="outlined"
                  density="compact" placeholder="/devoluciones" />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="menuFormData.parent_code"
                  :items="parentMenuOptions"
                  item-title="label"
                  item-value="code"
                  label="Menú padre (grupo)"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="3">
                <v-text-field v-model.number="menuFormData.sort_order" label="Orden" type="number"
                  variant="outlined" density="compact" />
              </v-col>
              <v-col cols="3">
                <v-checkbox v-model="menuFormData.is_superadmin_only" label="Solo SA"
                  color="orange" density="compact" hide-details />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="menuDialog = false">Cancelar</v-btn>
          <v-btn color="deep-purple" variant="elevated" :loading="savingMenu"
            @click="saveMenuItem">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import superAdminRolesService from '@/services/superAdminRoles.service'

// ============================================================
// STATE
// ============================================================
const activeTab = ref('roles')
const standardRoles = ref([])
const selectedRoleName = ref(null)
const roleMenuCodes = ref({})       // { CAJERO: ['HOME','POS',...], ... }
const selectedMenuCodes = ref([])   // codigos seleccionados para el rol activo
const flatMenuItems = ref([])
const menuTree = ref([])
const groupedPermissions = ref({})

const loadingMenus = ref(false)
const syncingRole = ref(false)
const savingRole = ref(false)
const savingMenu = ref(false)

const roleDialog = ref(false)
const menuDialog = ref(false)
const editingRole = ref(null)
const editingMenu = ref(null)
const roleForm = ref({ name: '' })
const menuFormData = ref({
  code: '', label: '', icon: '', route: '', parent_code: null, sort_order: 0, is_superadmin_only: false
})
const menuFormRef = ref(null)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// ============================================================
// COMPUTED
// ============================================================

/** Árbol de menús filtrado (solo no-superadmin_only para asignación) */
const menuTreeForRole = computed(() => {
  return menuTree.value.filter(g => !g.is_superadmin_only || g.code === 'CONFIG')
})

/** Ítems raíz disponibles como padres en el select */
const parentMenuOptions = computed(() => {
  return flatMenuItems.value.filter(m => !m.parent_code).map(m => ({
    code: m.code,
    label: `${m.icon ? '[' + m.icon + '] ' : ''}${m.label}`
  }))
})

// ============================================================
// CARGA INICIAL
// ============================================================
onMounted(async () => {
  await Promise.all([
    loadMenus(),
    loadPermissions(),
    loadRoleTemplates()
  ])
})

async function loadMenus() {
  loadingMenus.value = true
  try {
    const result = await superAdminRolesService.getMenuTree()
    if (result.success) {
      menuTree.value = result.data
      // Extraer flat list
      const flat = []
      result.data.forEach(g => { flat.push(g); (g.children || []).forEach(c => flat.push(c)) })
      flatMenuItems.value = flat
    }
  } finally {
    loadingMenus.value = false
  }
}

async function loadPermissions() {
  const result = await superAdminRolesService.getAllPermissionsGrouped()
  if (result.success) groupedPermissions.value = result.data
}

async function loadRoleTemplates() {
  const result = await superAdminRolesService.getAllRoleMenuTemplates()
  if (result.success) {
    // Construir mapa role_name → [menu_codes]
    const map = {}
    Object.entries(result.data).forEach(([roleName, rows]) => {
      map[roleName] = rows.map(r => r.menu_items?.code).filter(Boolean)
    })
    roleMenuCodes.value = map
    standardRoles.value = Object.keys(map).sort()
  }
}

// ============================================================
// SELECCIÓN DE ROL
// ============================================================
function selectRole(roleName) {
  selectedRoleName.value = roleName
  selectedMenuCodes.value = [...(roleMenuCodes.value[roleName] || [])]
}

// Observar cambios en selectedMenuCodes para reflejar en el mapa local
watch(selectedMenuCodes, (newCodes) => {
  if (selectedRoleName.value) {
    roleMenuCodes.value[selectedRoleName.value] = [...newCodes]
  }
})

// ============================================================
// SINCRONIZAR ROL A TODOS LOS TENANTS
// ============================================================
async function syncRoleToAllTenants() {
  if (!selectedRoleName.value) return
  syncingRole.value = true
  try {
    const result = await superAdminRolesService.syncRoleMenusToAllTenants(
      selectedRoleName.value,
      selectedMenuCodes.value
    )
    if (result.success) {
      showMsg(`✓ ${result.data.message}`, 'success')
      await loadRoleTemplates()
    } else {
      showMsg(result.error || 'Error al sincronizar', 'error')
    }
  } finally {
    syncingRole.value = false
  }
}

// ============================================================
// DIALOG ROL
// ============================================================
function openRoleDialog(roleName = null) {
  editingRole.value = roleName
  roleForm.value = { name: roleName || '' }
  roleDialog.value = true
}

async function saveRole() {
  if (!roleForm.value.name?.trim()) return
  savingRole.value = true
  try {
    const name = roleForm.value.name.toUpperCase().trim()
    const result = await superAdminRolesService.createRoleForAllTenants(name, [], [])
    if (result.success) {
      showMsg(`✓ ${result.data.message}`, 'success')
      roleDialog.value = false
      await loadRoleTemplates()
      selectRole(name)
    } else {
      showMsg(result.error || 'Error al crear rol', 'error')
    }
  } finally {
    savingRole.value = false
  }
}

// ============================================================
// DIALOG MENÚ
// ============================================================
function openMenuDialog(item = null) {
  editingMenu.value = item
  menuFormData.value = item
    ? { ...item }
    : { code: '', label: '', icon: '', route: '', parent_code: null, sort_order: 0, is_superadmin_only: false }
  menuDialog.value = true
}

async function saveMenuItem() {
  const { valid } = await menuFormRef.value?.validate() || { valid: true }
  if (!valid) return
  savingMenu.value = true
  try {
    let result
    if (editingMenu.value) {
      result = await superAdminRolesService.updateMenuItem(editingMenu.value.menu_item_id, menuFormData.value)
    } else {
      result = await superAdminRolesService.createMenuItem(menuFormData.value)
    }
    if (result.success) {
      showMsg('Ítem de menú guardado', 'success')
      menuDialog.value = false
      await loadMenus()
    } else {
      showMsg(result.error || 'Error al guardar', 'error')
    }
  } finally {
    savingMenu.value = false
  }
}

async function toggleMenu(item) {
  const result = await superAdminRolesService.toggleMenuItemActive(item.menu_item_id, !item.is_active)
  if (result.success) {
    await loadMenus()
    showMsg(`Menú ${!item.is_active ? 'activado' : 'desactivado'}`, 'info')
  } else {
    showMsg(result.error || 'Error', 'error')
  }
}

// ============================================================
// HELPERS
// ============================================================
function showMsg(msg, color = 'success') {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}
</script>
