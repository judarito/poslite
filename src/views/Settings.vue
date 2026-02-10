<template>
  <div>
    <v-card>
      <v-card-title class="text-h4 primary white--text">
        <v-icon left color="white" size="large">mdi-cog</v-icon>
        Configuración
      </v-card-title>
      <v-card-text class="pa-6">
        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title>Preferencias Generales</v-card-title>
              <v-card-text>
                <v-switch
                  v-model="settings.notifications"
                  label="Activar Notificaciones"
                  color="primary"
                ></v-switch>

                <v-switch
                  v-model="settings.darkMode"
                  label="Modo Oscuro"
                  color="primary"
                ></v-switch>

                <v-switch
                  v-model="settings.autoSave"
                  label="Guardado Automático"
                  color="primary"
                ></v-switch>

                <v-select
                  v-model="settings.language"
                  :items="languages"
                  label="Idioma"
                  variant="outlined"
                  class="mt-4"
                ></v-select>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title>Perfil de Usuario</v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="profile.name"
                  label="Nombre"
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                ></v-text-field>

                <v-text-field
                  v-model="profile.email"
                  label="Correo Electrónico"
                  variant="outlined"
                  prepend-inner-icon="mdi-email"
                  type="email"
                ></v-text-field>

                <v-text-field
                  v-model="profile.phone"
                  label="Teléfono"
                  variant="outlined"
                  prepend-inner-icon="mdi-phone"
                ></v-text-field>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title>Apariencia</v-card-title>
              <v-card-text>
                <v-slider
                  v-model="settings.fontSize"
                  label="Tamaño de Fuente"
                  :min="12"
                  :max="24"
                  :step="1"
                  thumb-label
                  color="primary"
                ></v-slider>

                <v-radio-group v-model="settings.sidebarPosition" inline>
                  <template v-slot:label>
                    <div>Posición del Sidebar</div>
                  </template>
                  <v-radio label="Izquierda" value="left"></v-radio>
                  <v-radio label="Derecha" value="right"></v-radio>
                </v-radio-group>

                <div class="mt-4">
                  <p class="mb-2">Color Principal</p>
                  <v-chip-group v-model="settings.primaryColor">
                    <v-chip
                      v-for="color in colors"
                      :key="color.value"
                      :color="color.value"
                      :value="color.value"
                      label
                    >
                      {{ color.name }}
                    </v-chip>
                  </v-chip-group>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-btn color="primary" size="large" class="mr-2">
              <v-icon left>mdi-content-save</v-icon>
              Guardar Cambios
            </v-btn>
            <v-btn color="error" variant="outlined" size="large">
              <v-icon left>mdi-cancel</v-icon>
              Cancelar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const settings = ref({
  notifications: true,
  darkMode: false,
  autoSave: true,
  language: 'Español',
  fontSize: 16,
  sidebarPosition: 'left',
  primaryColor: 'blue',
})

const profile = ref({
  name: 'Usuario Demo',
  email: 'usuario@ejemplo.com',
  phone: '+1234567890',
})

const languages = ref(['Español', 'English', 'Français', 'Deutsch', 'Italiano'])

const colors = ref([
  { name: 'Azul', value: 'blue' },
  { name: 'Verde', value: 'green' },
  { name: 'Rojo', value: 'red' },
  { name: 'Púrpura', value: 'purple' },
  { name: 'Naranja', value: 'orange' },
])
</script>
