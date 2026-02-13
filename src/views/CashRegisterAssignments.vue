<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon start color="primary">mdi-cash-register</v-icon>
          Asignación de Cajas a Cajeros
        </div>
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          prepend-icon="mdi-plus" 
          @click="openAssignDialog"
          class="text-none"
        >
          <span class="d-none d-sm-inline">Asignar Caja</span>
          <span class="d-sm-none">Asignar</span>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row class="mb-3">
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.userId"
              :items="users"
              item-title="full_name"
              item-value="user_id"
              label="Filtrar por Cajero"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="loadAssignments"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.locationId"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Filtrar por Sede"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="loadAssignments"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.isActive"
              :items="[{text:'Todas',value:null},{text:'Activas',value:true},{text:'Inactivas',value:false}]"
              item-title="text"
              item-value="value"
              label="Estado"
              variant="outlined"
              density="compact"
              @update:model-value="loadAssignments"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Desktop: Table -->
        <v-table density="comfortable" class="d-none d-sm-table w-100">
          <thead>
            <tr>
              <th>Cajero</th>
              <th>Caja</th>
              <th>Sede</th>
              <th>Estado</th>
              <th>Asignado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in assignments" :key="item.assignment_id">
              <td>{{ item.user_name }}</td>
              <td>{{ item.cash_register_name }}</td>
              <td>{{ item.location_name }}</td>
              <td>
                <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
                  {{ item.is_active ? 'Activa' : 'Inactiva' }}
                </v-chip>
              </td>
              <td>{{ formatDate(item.assigned_at) }}</td>
              <td>
                <v-btn
                  v-if="item.is_active"
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  color="error"
                  @click="deactivateAssignment(item)"
                ></v-btn>
                <v-btn
                  v-else
                  icon="mdi-check"
                  size="small"
                  variant="text"
                  color="success"
                  @click="activateAssignment(item)"
                ></v-btn>
              </td>
            </tr>
            <tr v-if="assignments.length === 0">
              <td colspan="6" class="text-center text-grey pa-4">Sin asignaciones</td>
            </tr>
          </tbody>
        </v-table>

        <!-- Mobile: Cards -->
        <div class="d-sm-none pa-2">
          <v-card v-for="item in assignments" :key="item.assignment_id" variant="outlined" class="mb-2">
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-body-2 font-weight-bold">{{ item.user_name }}</div>
                <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
                  {{ item.is_active ? 'Activa' : 'Inactiva' }}
                </v-chip>
              </div>
              <v-divider class="my-2"></v-divider>
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-grey">Caja:</span>
                <span>{{ item.cash_register_name }}</span>
              </div>
              <div class="d-flex justify-space-between text-caption mb-1">
                <span class="text-grey">Sede:</span>
                <span>{{ item.location_name }}</span>
              </div>
              <div class="d-flex justify-space-between text-caption mb-2">
                <span class="text-grey">Asignado:</span>
                <span>{{ formatDate(item.assigned_at) }}</span>
              </div>
              <v-btn
                v-if="item.is_active"
                prepend-icon="mdi-close"
                size="small"
                variant="outlined"
                color="error"
                block
                @click="deactivateAssignment(item)"
              >
                Desactivar
              </v-btn>
              <v-btn
                v-else
                prepend-icon="mdi-check"
                size="small"
                variant="outlined"
                color="success"
                block
                @click="activateAssignment(item)"
              >
                Activar
              </v-btn>
            </v-card-text>
          </v-card>
          <div v-if="assignments.length === 0" class="text-center text-grey pa-4">Sin asignaciones</div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Dialog: Asignar caja -->
    <v-dialog v-model="assignDialog" max-width="500">
      <v-card>
        <v-card-title>Asignar Caja a Cajero</v-card-title>
        <v-card-text>
          <v-select
            v-model="newAssignment.userId"
            :items="users"
            item-title="full_name"
            item-value="user_id"
            label="Cajero *"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-select>

          <v-select
            v-model="newAssignment.cashRegisterId"
            :items="cashRegisters"
            item-title="display"
            item-value="cash_register_id"
            label="Caja *"
            variant="outlined"
            density="compact"
            class="mb-3"
          ></v-select>

          <v-textarea
            v-model="newAssignment.note"
            label="Nota (opcional)"
            variant="outlined"
            density="compact"
            rows="2"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="assignDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveAssignment" :loading="saving">Asignar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import cashAssignmentService from '@/services/cashAssignment.service'
import { getUsers } from '@/services/users.service'
import cashService from '@/services/cash.service'
import locationsService from '@/services/locations.service'
import { useNotification } from '@/composables/useNotification'

const { tenantId } = useTenant()
const { userProfile } = useAuth()
const { showSuccess, showError } = useNotification()

const assignments = ref([])
const users = ref([])
const cashRegisters = ref([])
const locations = ref([])
const filters = ref({ userId: null, locationId: null, isActive: true })

const assignDialog = ref(false)
const saving = ref(false)
const newAssignment = ref({ userId: null, cashRegisterId: null, note: null })

const formatDate = (d) => d ? new Date(d).toLocaleString('es-CO', { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}) : ''

const loadAssignments = async () => {
  if (!tenantId.value) return
  try {
    const r = await cashAssignmentService.getAllAssignments(tenantId.value, filters.value)
    console.log('loadAssignments result:', r)
    if (r.success) {
      assignments.value = r.data
      console.log('Assignments loaded:', assignments.value.length)
    } else {
      console.error('Error loading assignments:', r.error)
      showError(r.error || 'Error al cargar asignaciones')
    }
  } catch (error) {
    console.error('Exception loading assignments:', error)
    showError('Error al cargar asignaciones')
  }
}

const loadUsers = async () => {
  if (!tenantId.value) return
  try {
    const data = await getUsers(tenantId.value)
    users.value = data.filter(u => u.is_active)
  } catch (error) {
    console.error('Error loading users:', error)
    showError('Error al cargar usuarios')
  }
}

const loadCashRegisters = async () => {
  if (!tenantId.value) return
  try {
    const r = await cashService.getCashRegisters(tenantId.value, 1, 100, '')
    if (r.success) {
      cashRegisters.value = r.data.map(cr => ({
        ...cr,
        display: `${cr.name} (${cr.location?.name || 'Sin sede'})`
      }))
    } else {
      showError('Error al cargar cajas registradoras')
    }
  } catch (error) {
    showError('Error al cargar cajas registradoras')
  }
}

const loadLocations = async () => {
  if (!tenantId.value) return
  const r = await locationsService.getLocations(tenantId.value, 1, 100)
  if (r.success) locations.value = r.data
}

const openAssignDialog = () => {
  newAssignment.value = { userId: null, cashRegisterId: null, note: null }
  assignDialog.value = true
}

const saveAssignment = async () => {
  if (!newAssignment.value.userId || !newAssignment.value.cashRegisterId) {
    showError('Seleccione cajero y caja')
    return
  }

  saving.value = true
  try {
    const r = await cashAssignmentService.assignCashRegisterToUser(
      tenantId.value,
      newAssignment.value.cashRegisterId,
      newAssignment.value.userId,
      userProfile.value.user_id,
      true,
      newAssignment.value.note
    )

    if (r.success) {
      showSuccess('Caja asignada correctamente')
      assignDialog.value = false
      loadAssignments()
    } else {
      showError(r.error || 'Error al asignar caja')
    }
  } finally {
    saving.value = false
  }
}

const deactivateAssignment = async (item) => {
  const r = await cashAssignmentService.assignCashRegisterToUser(
    tenantId.value,
    item.cash_register_id,
    item.user_id,
    userProfile.value.user_id,
    false,
    'Desactivada'
  )

  if (r.success) {
    showSuccess('Asignación desactivada')
    loadAssignments()
  } else {
    showError(r.error || 'Error al desactivar')
  }
}

const activateAssignment = async (item) => {
  const r = await cashAssignmentService.assignCashRegisterToUser(
    tenantId.value,
    item.cash_register_id,
    item.user_id,
    userProfile.value.user_id,
    true,
    'Reactivada'
  )

  if (r.success) {
    showSuccess('Asignación activada')
    loadAssignments()
  } else {
    showError(r.error || 'Error al activar')
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadCashRegisters(), loadLocations()])
  loadAssignments()
})
</script>
