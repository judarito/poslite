<template>
  <div>
    <v-card>
      <v-card-title class="text-h4 primary white--text">
        <v-icon left color="white" size="large">mdi-information</v-icon>
        Acerca de
      </v-card-title>
      <v-card-text class="pa-6">
        <v-row>
          <v-col cols="12">
            <h2 class="mb-4">Características de la Aplicación</h2>
            <v-list>
              <v-list-item
                v-for="feature in features"
                :key="feature.title"
              >
                <template v-slot:prepend>
                  <v-icon :color="feature.color">{{ feature.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ feature.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ feature.description }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>

          <v-col cols="12" class="mt-6">
            <h2 class="mb-4">Tecnologías Utilizadas</h2>
            <v-chip-group column>
              <v-chip
                v-for="tech in technologies"
                :key="tech.name"
                :color="tech.color"
                label
                size="large"
              >
                <v-icon start>{{ tech.icon }}</v-icon>
                {{ tech.name }}
              </v-chip>
            </v-chip-group>
          </v-col>

          <v-col cols="12" class="mt-6">
            <v-alert
              type="info"
              variant="tonal"
              prominent
            >
              <v-alert-title>Información</v-alert-title>
              Esta es una aplicación de ejemplo que demuestra las capacidades de Vue.js 3 
              combinado con Vuetify 3 para crear interfaces modernas y responsivas.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const features = ref([
  {
    title: 'Diseño Responsivo',
    description: 'Se adapta perfectamente a cualquier tamaño de pantalla',
    icon: 'mdi-responsive',
    color: 'primary',
  },
  {
    title: 'Sidebar Colapsable',
    description: 'Menu lateral que se oculta automáticamente en dispositivos móviles',
    icon: 'mdi-menu',
    color: 'success',
  },
  {
    title: 'Material Design',
    description: 'Interfaz moderna siguiendo las directrices de Material Design',
    icon: 'mdi-material-design',
    color: 'warning',
  },
  {
    title: 'Single-File Components',
    description: 'Arquitectura modular con componentes Vue 3',
    icon: 'mdi-file-code',
    color: 'info',
  },
  {
    title: 'Vue Router',
    description: 'Navegación fluida entre diferentes vistas',
    icon: 'mdi-routes',
    color: 'error',
  },
])

const technologies = ref([
  { name: 'Vue.js 3', icon: 'mdi-vuejs', color: 'success' },
  { name: 'Vuetify 3', icon: 'mdi-material-design', color: 'primary' },
  { name: 'Vite', icon: 'mdi-lightning-bolt', color: 'warning' },
  { name: 'Vue Router', icon: 'mdi-routes', color: 'info' },
  { name: 'Material Design Icons', icon: 'mdi-shape', color: 'secondary' },
])
</script>
