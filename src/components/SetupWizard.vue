<template>
  <v-card class="mx-auto" max-width="900">
    <v-card-title class="bg-gradient-primary text-white">
      <v-icon start size="large">mdi-rocket-launch</v-icon>
      <span class="text-h5">Asistente de Configuración Inicial</span>
    </v-card-title>

    <v-card-text class="pa-6">
      <!-- Progreso General -->
      <div class="mb-6">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-h6">Progreso de Configuración</span>
          <span class="text-h6 font-weight-bold" :class="progressColor">
            {{ completedSteps }}/{{ totalSteps }}
          </span>
        </div>
        <v-progress-linear
          :model-value="progressPercentage"
          :color="progressColor"
          height="12"
          rounded
        ></v-progress-linear>
        <div class="text-caption text-center mt-1">
          {{ progressPercentage }}% completado
        </div>
      </div>

      <v-alert
        v-if="progressPercentage === 100"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        <v-icon start>mdi-check-circle</v-icon>
        <strong>¡Configuración Completa!</strong>
        <div class="mt-2">
          Tu negocio está listo para comenzar a operar. Puedes empezar a crear productos y realizar ventas.
        </div>
      </v-alert>

      <v-alert
        v-else
        type="info"
        variant="tonal"
        class="mb-4"
      >
        <v-icon start>mdi-information</v-icon>
        <strong>Configuración Inicial Requerida</strong>
        <div class="mt-2">
          Completa los siguientes pasos para poder realizar ventas en tu negocio.
        </div>
      </v-alert>

      <!-- Lista de Pasos de Configuración -->
      <v-list class="bg-transparent">
        <v-list-item
          v-for="step in setupSteps"
          :key="step.id"
          class="mb-2 rounded-lg"
          :class="step.isCompleted ? 'bg-success-lighten-5' : 'bg-grey-lighten-4'"
          @click="navigateToStep(step)"
        >
          <template v-slot:prepend>
            <v-avatar
              :color="step.isCompleted ? 'success' : step.isRequired ? 'warning' : 'grey'"
              size="48"
            >
              <v-icon
                :icon="step.isCompleted ? 'mdi-check-circle' : step.icon"
                color="white"
                size="28"
              ></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="text-h6 mb-1">
            {{ step.title }}
            <v-chip
              v-if="step.isRequired"
              size="x-small"
              color="error"
              class="ml-2"
            >
              Requerido
            </v-chip>
            <v-chip
              v-else
              size="x-small"
              color="grey"
              class="ml-2"
            >
              Opcional
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-wrap">
            {{ step.description }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-btn
              v-if="!step.isCompleted"
              :color="step.isRequired ? 'primary' : 'grey'"
              variant="tonal"
              @click.stop="navigateToStep(step)"
            >
              {{ step.route ? 'Configurar' : 'Ver' }}
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
            <v-chip
              v-else
              color="success"
              variant="flat"
            >
              <v-icon start>mdi-check</v-icon>
              Completado
            </v-chip>
          </template>
        </v-list-item>
      </v-list>

      <!-- Acciones -->
      <div class="mt-6 d-flex justify-space-between">
        <v-btn
          color="grey"
          variant="text"
          @click="closeWizard"
        >
          Cerrar
        </v-btn>
        <v-btn
          v-if="progressPercentage === 100"
          color="success"
          variant="elevated"
          size="large"
          @click="startSelling"
        >
          <v-icon start>mdi-cash-register</v-icon>
          Ir al Punto de Venta
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="elevated"
          @click="refreshProgress"
        >
          <v-icon start>mdi-refresh</v-icon>
          Actualizar Progreso
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { supabase } from '@/plugins/supabase'

const router = useRouter()
const { tenantId } = useTenant()

// Estado
const setupSteps = ref([
  {
    id: 'general_settings',
    title: 'Configuraciones Generales',
    description: 'Moneda, formato de fecha, prefijo de facturas y otras configuraciones básicas.',
    icon: 'mdi-cog',
    route: '/tenant-config',
    isRequired: true,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) return false
      const { data } = await supabase
        .from('tenant_settings')
        .select('invoice_prefix, business_name')
        .eq('tenant_id', tenantId.value)
        .single()
      return data?.invoice_prefix && data?.business_name
    }
  },
  {
    id: 'locations',
    title: 'Ubicaciones',
    description: 'Configura al menos una ubicación o sede donde operas tu negocio.',
    icon: 'mdi-map-marker',
    route: '/locations',
    isRequired: true,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) return false
      const { data, error } = await supabase
        .from('locations')
        .select('location_id')
        .eq('tenant_id', tenantId.value)
        .eq('is_active', true)
      return !error && data && data.length > 0
    }
  },
  {
    id: 'registers',
    title: 'Cajas Registradoras',
    description: 'Configura al menos una caja para poder realizar ventas.',
    icon: 'mdi-cash-register',
    route: '/cash-registers',
    isRequired: true,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) {
        console.log('❌ Registers: No tenantId')
        return false
      }
      const { data, error } = await supabase
        .from('cash_registers')
        .select('cash_register_id')
        .eq('tenant_id', tenantId.value)
        .eq('is_active', true)
      
      console.log('🔍 Registers Check:', {
        tenantId: tenantId.value,
        data,
        error,
        result: !error && data && data.length > 0
      })
      
      return !error && data && data.length > 0
    }
  },
  {
    id: 'categories',
    title: 'Categorías de Productos',
    description: 'Crea categorías para organizar tus productos (ej: Ropa, Alimentos, etc.).',
    icon: 'mdi-tag-multiple',
    route: '/categories',
    isRequired: true,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) return false
      const { data, error } = await supabase
        .from('categories')
        .select('category_id')
        .eq('tenant_id', tenantId.value)
      return !error && data && data.length > 0
    }
  },
  {
    id: 'products',
    title: 'Productos',
    description: 'Crea tus primeros productos para empezar a vender.',
    icon: 'mdi-package-variant',
    route: '/products',
    isRequired: true,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) return false
      const { data, error } = await supabase
        .from('products')
        .select('product_id')
        .eq('tenant_id', tenantId.value)
      return !error && data && data.length > 0
    }
  },
  {
    id: 'users',
    title: 'Usuarios Adicionales',
    description: 'Agrega usuarios para cajeros, vendedores o administradores adicionales (Opcional).',
    icon: 'mdi-account-multiple',
    route: '/auth',
    isRequired: false,
    isCompleted: false,
    checkQuery: async () => {
      if (!tenantId.value) return false
      const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('tenant_id', tenantId.value)
      return !error && data && data.length > 1 // Más de 1 usuario (el admin ya existe)
    }
  }
])

// Computed
const totalSteps = computed(() => setupSteps.value.filter(s => s.isRequired).length)
const completedSteps = computed(() => setupSteps.value.filter(s => s.isRequired && s.isCompleted).length)
const progressPercentage = computed(() => Math.round((completedSteps.value / totalSteps.value) * 100))
const progressColor = computed(() => {
  if (progressPercentage.value === 100) return 'success'
  if (progressPercentage.value >= 50) return 'primary'
  return 'warning'
})

// Métodos
const checkProgress = async () => {
  for (const step of setupSteps.value) {
    if (step.checkQuery) {
      try {
        step.isCompleted = await step.checkQuery()
      } catch (error) {
        console.error(`Error checking step ${step.id}:`, error)
      }
    }
  }
}

const refreshProgress = async () => {
  await checkProgress()
}

const navigateToStep = (step) => {
  if (step.route) {
    router.push(step.route)
  }
}

const closeWizard = () => {
  // Guardar que el usuario cerró el wizard
  localStorage.setItem('setupWizardDismissed', 'true')
  router.push('/')
}

const startSelling = () => {
  router.push('/pos')
}

// Lifecycle
onMounted(async () => {
  await checkProgress()
})
</script>

<style scoped>
.bg-gradient-primary {
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
}

.bg-success-lighten-5 {
  background-color: rgba(76, 175, 80, 0.1);
}

.bg-grey-lighten-4 {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
