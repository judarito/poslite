<template>
  <div>
    <!-- Botones de acciones - Responsive -->
    <v-row dense class="mb-3">
      <v-col cols="12" sm="auto">
        <v-btn 
          color="primary" 
          prepend-icon="mdi-cart-plus" 
          @click="openCreateDialog"
          :block="isMobile"
        >
          Nueva Compra
        </v-btn>
      </v-col>
      <v-col cols="12" sm="auto">
        <v-btn 
          color="purple" 
          prepend-icon="mdi-lightbulb-on" 
          variant="tonal" 
          @click="openSuggestionsDialog" 
          :loading="loadingSuggestions"
          :block="isMobile"
        >
          Sugerencias IA
          <v-badge v-if="criticalCount > 0" color="error" :content="criticalCount" inline></v-badge>
        </v-btn>
      </v-col>
      <v-col v-if="aiAvailable" cols="12" sm="auto">
        <v-btn 
          color="deep-purple" 
          prepend-icon="mdi-robot" 
          variant="elevated" 
          @click="openAIAnalysisDialog" 
          :loading="loadingAIAnalysis"
          :block="isMobile"
        >
          Análisis IA Avanzado
          <v-chip v-if="aiAnalysis" size="x-small" color="success" class="ml-2">✓</v-chip>
        </v-btn>
      </v-col>
    </v-row>

    <ListView
      title="Compras"
      icon="mdi-cart-plus"
      :items="purchases"
      :total-items="totalPurchases"
      :loading="loading"
      item-key="purchase_id"
      avatar-icon="mdi-truck-delivery"
      avatar-color="teal"
      empty-message="No hay compras registradas"
      :show-create-button="false"
      :editable="false"
      :deletable="false"
      @load-page="loadPurchasesPage"
      @search="handleSearch"
    >
      <!-- Filtros personalizados -->
      <template #filters>
        <v-row dense>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="selectedLocation"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Sede"
              prepend-inner-icon="mdi-store"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="loadPurchases"
            ></v-select>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="dateFrom"
              label="Fecha desde"
              type="date"
              prepend-inner-icon="mdi-calendar"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="loadPurchases"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="dateTo"
              label="Fecha hasta"
              type="date"
              prepend-inner-icon="mdi-calendar"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="loadPurchases"
            ></v-text-field>
          </v-col>
        </v-row>
      </template>

      <!-- Título del item -->
      <template #title="{ item }">
        {{ item.product_name }}{{ item.variant_name ? ' - ' + item.variant_name : '' }}
      </template>

      <!-- Subtítulo -->
      <template #subtitle="{ item }">
        {{ formatDate(item.purchased_at) }} • {{ item.purchased_by_name }} • {{ item.location_name }}
      </template>

      <!-- Contenido -->
      <template #content="{ item }">
        <div class="mt-2 d-flex flex-wrap ga-2">
          <v-chip size="small" variant="tonal" prepend-icon="mdi-barcode">SKU: {{ item.sku }}</v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-numeric" color="info">Cant: {{ item.quantity }}</v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-cash" color="primary">Costo: {{ formatMoney(item.unit_cost) }}</v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-currency-usd" color="success">Total: {{ formatMoney(item.line_total) }}</v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-tag" color="orange">Precio: {{ formatMoney(item.current_price) }}</v-chip>
        </div>
      </template>
    </ListView>

    <!-- Dialog Sugerencias Inteligentes -->
    <v-dialog v-model="suggestionsDialog" max-width="1200" scrollable>
      <v-card>
        <v-card-title class="bg-purple">
          <v-icon start color="white">mdi-lightbulb-on</v-icon>
          <span class="text-white">Sugerencias Inteligentes de Compra</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-alert v-if="loadingSuggestions" type="info" variant="tonal">
            Analizando inventario y patrones de venta...
          </v-alert>

          <v-tabs v-model="suggestionsTab" color="purple">
            <v-tab value="critical">Crítico ({{ suggestions.filter(s => s.priority === 1).length }})</v-tab>
            <v-tab value="high">Alto ({{ suggestions.filter(s => s.priority === 2).length }})</v-tab>
            <v-tab value="medium">Medio ({{ suggestions.filter(s => s.priority === 3).length }})</v-tab>
          </v-tabs>

          <v-window v-model="suggestionsTab" class="mt-4">
            <!-- CRÍTICO -->
            <v-window-item value="critical">
              <v-alert v-if="suggestions.filter(s => s.priority === 1).length === 0" type="success" variant="tonal" class="mb-4">
                ¡Excelente! No hay productos con prioridad crítica
              </v-alert>
              <v-card v-for="item in suggestions.filter(s => s.priority === 1)" :key="item.variant_id" variant="outlined" class="mb-2">
                <v-card-text>
                  <v-row align="center">
                    <v-col cols="12" md="5">
                      <div class="text-h6">{{ item.product_name }}</div>
                      <div class="text-caption text-grey">{{ item.variant_name || 'Sin variante' }} • SKU: {{ item.sku }}</div>
                      <v-chip size="x-small" color="error" class="mt-1">{{ item.priority_label }}</v-chip>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div class="text-body-2"><strong>Razón:</strong> {{ item.reason }}</div>
                      <div class="text-caption">Stock actual: <strong>{{ item.current_stock }}</strong></div>
                      <div class="text-caption">Demanda diaria: <strong>{{ item.avg_daily_demand }}</strong> unidades</div>
                      <div class="text-caption">Vendido (30d): <strong>{{ item.sold_last_30d }}</strong> unidades</div>
                    </v-col>
                    <v-col cols="12" md="3" class="text-right">
                      <div class="text-h6 text-primary">{{ item.suggested_order_qty }} unidades</div>
                      <div class="text-caption">Costo estimado: {{ formatMoney(item.estimated_cost) }}</div>
                      <v-btn size="small" color="primary" class="mt-2" @click="addSuggestionToCart(item)">
                        Agregar a Compra
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- ALTO -->
            <v-window-item value="high">
              <v-alert v-if="suggestions.filter(s => s.priority === 2).length === 0" type="success" variant="tonal" class="mb-4">
                No hay productos con prioridad alta
              </v-alert>
              <v-card v-for="item in suggestions.filter(s => s.priority === 2)" :key="item.variant_id" variant="outlined" class="mb-2">
                <v-card-text>
                  <v-row align="center">
                    <v-col cols="12" md="5">
                      <div class="text-h6">{{ item.product_name }}</div>
                      <div class="text-caption text-grey">{{ item.variant_name || 'Sin variante' }} • SKU: {{ item.sku }}</div>
                      <v-chip size="x-small" color="warning" class="mt-1">{{ item.priority_label }}</v-chip>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div class="text-body-2"><strong>Razón:</strong> {{ item.reason }}</div>
                      <div class="text-caption">Stock actual: <strong>{{ item.current_stock }}</strong></div>
                      <div class="text-caption">Días de stock: <strong>{{ item.days_of_stock }}</strong></div>
                      <div class="text-caption">Demanda diaria: <strong>{{ item.avg_daily_demand }}</strong></div>
                    </v-col>
                    <v-col cols="12" md="3" class="text-right">
                      <div class="text-h6 text-primary">{{ item.suggested_order_qty }} unidades</div>
                      <div class="text-caption">Costo estimado: {{ formatMoney(item.estimated_cost) }}</div>
                      <v-btn size="small" color="primary" class="mt-2" @click="addSuggestionToCart(item)">
                        Agregar a Compra
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- MEDIO -->
            <v-window-item value="medium">
              <v-alert v-if="suggestions.filter(s => s.priority === 3).length === 0" type="info" variant="tonal" class="mb-4">
                No hay productos con prioridad media
              </v-alert>
              <v-card v-for="item in suggestions.filter(s => s.priority === 3)" :key="item.variant_id" variant="outlined" class="mb-2">
                <v-card-text>
                  <v-row align="center">
                    <v-col cols="12" md="5">
                      <div class="text-h6">{{ item.product_name }}</div>
                      <div class="text-caption text-grey">{{ item.variant_name || 'Sin variante' }} • SKU: {{ item.sku }}</div>
                      <v-chip size="x-small" color="info" class="mt-1">{{ item.priority_label }}</v-chip>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div class="text-body-2"><strong>Razón:</strong> {{ item.reason }}</div>
                      <div class="text-caption">Stock actual: <strong>{{ item.current_stock }}</strong></div>
                      <div class="text-caption">Días de stock: <strong>{{ item.days_of_stock }}</strong></div>
                    </v-col>
                    <v-col cols="12" md="3" class="text-right">
                      <div class="text-h6 text-primary">{{ item.suggested_order_qty }} unidades</div>
                      <div class="text-caption">Costo estimado: {{ formatMoney(item.estimated_cost) }}</div>
                      <v-btn size="small" color="primary" class="mt-2" @click="addSuggestionToCart(item)">
                        Agregar a Compra
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>

          <!-- Resumen total -->
          <v-card v-if="suggestions.length > 0" color="purple" variant="tonal" class="mt-4">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-caption">Total productos sugeridos</div>
                  <div class="text-h5">{{ suggestions.length }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption">Total unidades</div>
                  <div class="text-h5">{{ suggestions.reduce((sum, s) => sum + s.suggested_order_qty, 0) }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption">Inversión estimada</div>
                  <div class="text-h5">{{ formatMoney(suggestions.reduce((sum, s) => sum + s.estimated_cost, 0)) }}</div>
                </v-col>
                <v-col cols="12" md="3" class="text-right">
                  <v-btn color="primary" prepend-icon="mdi-cart-plus" @click="createPurchaseFromSuggestions">
                    Crear Orden de Compra
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="suggestionsDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Análisis IA Avanzado -->
    <v-dialog v-model="aiAnalysisDialog" max-width="1400" scrollable>
      <v-card>
        <v-card-title class="bg-deep-purple">
          <v-icon start color="white">mdi-robot</v-icon>
          <span class="text-white">Análisis IA Avanzado - DeepSeek</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- Loading State -->
          <v-alert v-if="loadingAIAnalysis" type="info" variant="tonal" class="mb-4">
            <v-progress-linear indeterminate color="deep-purple"></v-progress-linear>
            <div class="mt-2">Analizando patrones de venta, tendencias y demanda con IA...</div>
            <div class="text-caption">Esto puede tomar 10-30 segundos</div>
          </v-alert>

          <!-- Error State -->
          <v-alert v-if="aiAnalysisError" type="error" variant="tonal" closable @click:close="aiAnalysisError = null" class="mb-4">
            {{ aiAnalysisError }}
          </v-alert>

          <!-- AI Analysis Results -->
          <div v-if="aiAnalysis && !loadingAIAnalysis">
            <!-- Resumen Ejecutivo -->
            <v-card color="deep-purple" variant="tonal" class="mb-4">
              <v-card-title>📊 Resumen Ejecutivo</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="3">
                    <v-card variant="elevated">
                      <v-card-text class="text-center">
                        <div class="text-h3 text-error">{{ aiAnalysis.executive_summary.critical_products_count }}</div>
                        <div class="text-caption">Productos Críticos</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="elevated">
                      <v-card-text class="text-center">
                        <div class="text-h3 text-success">{{ aiAnalysis.executive_summary.high_confidence_count }}</div>
                        <div class="text-caption">Alta Confianza IA</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="elevated">
                      <v-card-text class="text-center">
                        <div class="text-h3 text-primary">{{ formatMoney(aiAnalysis.executive_summary.total_investment) }}</div>
                        <div class="text-caption">Inversión Estimada</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-card variant="elevated" color="purple">
                      <v-card-text class="text-center text-white">
                        <v-icon size="large">mdi-lightbulb-on</v-icon>
                        <div class="text-caption mt-2">Recomendación Principal</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
                <v-alert type="info" variant="tonal" class="mt-4">
                  <strong>{{ aiAnalysis.executive_summary.recommendation }}</strong>
                </v-alert>
              </v-card-text>
            </v-card>

            <!-- Insights Estratégicos -->
            <v-card v-if="aiAnalysis.insights && aiAnalysis.insights.length > 0" class="mb-4">
              <v-card-title>💡 Insights Estratégicos</v-card-title>
              <v-card-text>
                <v-expansion-panels>
                  <v-expansion-panel v-for="(insight, idx) in aiAnalysis.insights" :key="idx">
                    <v-expansion-panel-title>
                      <div class="d-flex align-center ga-2">
                        <v-icon 
                          :color="insight.type === 'opportunity' ? 'success' : insight.type === 'risk' ? 'warning' : 'info'"
                        >
                          {{ insight.type === 'opportunity' ? 'mdi-trending-up' : insight.type === 'risk' ? 'mdi-alert' : 'mdi-chart-line' }}
                        </v-icon>
                        <span>{{ insight.title }}</span>
                        <v-chip 
                          size="x-small" 
                          :color="insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'info'"
                        >
                          {{ insight.impact }}
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      {{ insight.description }}
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>

            <!-- Advertencias -->
            <v-card v-if="aiAnalysis.warnings && aiAnalysis.warnings.length > 0" class="mb-4">
              <v-card-title>⚠️ Advertencias Importantes</v-card-title>
              <v-card-text>
                <v-alert
                  v-for="(warning, idx) in aiAnalysis.warnings"
                  :key="idx"
                  :type="warning.severity === 'critical' ? 'error' : 'warning'"
                  variant="tonal"
                  class="mb-2"
                >
                  <strong>{{ warning.product_name || 'General' }}:</strong> {{ warning.message }}
                </v-alert>
              </v-card-text>
            </v-card>

            <!-- Consejos de Optimización -->
            <v-card v-if="aiAnalysis.optimization_tips && aiAnalysis.optimization_tips.length > 0" class="mb-4">
              <v-card-title>🎯 Consejos de Optimización</v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item
                    v-for="(tip, idx) in aiAnalysis.optimization_tips"
                    :key="idx"
                    prepend-icon="mdi-lightbulb-outline"
                  >
                    <v-list-item-title>{{ tip.title }}</v-list-item-title>
                    <v-list-item-subtitle>{{ tip.description }}</v-list-item-subtitle>
                    <template v-if="tip.expected_benefit" #append>
                      <v-chip size="small" color="success">{{ tip.expected_benefit }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <!-- Sugerencias Mejoradas con IA -->
            <v-card>
              <v-card-title>🤖 Sugerencias Mejoradas con IA</v-card-title>
              <v-card-text>
                <v-tabs v-model="aiSuggestionsTab" color="deep-purple">
                  <v-tab value="all">Todas ({{ aiAnalysis.suggestions.filter(s => s.has_ai_analysis).length }})</v-tab>
                  <v-tab value="critical">Críticas ({{ aiAnalysis.suggestions.filter(s => s.ai_priority === 1 || s.priority === 1).length }})</v-tab>
                  <v-tab value="high-confidence">Alta Confianza ({{ aiAnalysis.suggestions.filter(s => (s.ai_confidence || 0) > 0.8).length }})</v-tab>
                </v-tabs>

                <v-window v-model="aiSuggestionsTab" class="mt-4">
                  <!-- Todas -->
                  <v-window-item value="all">
                    <div v-if="aiAnalysis.suggestions.filter(s => s.has_ai_analysis).length === 0" class="text-center pa-4 text-grey">
                      No hay sugerencias con análisis IA
                    </div>
                    <v-card
                      v-for="item in aiAnalysis.suggestions.filter(s => s.has_ai_analysis).slice(0, 20)"
                      :key="item.variant_id"
                      variant="outlined"
                      class="mb-2"
                    >
                      <v-card-text>
                        <v-row align="center">
                          <v-col cols="12" md="4">
                            <div class="text-h6">{{ item.product_name }}</div>
                            <div class="text-caption text-grey">{{ item.variant_name || 'Sin variante' }} • SKU: {{ item.sku }}</div>
                            <div class="d-flex ga-1 mt-2">
                              <v-chip size="x-small" :color="getPriorityColor(item.ai_priority || item.priority)">
                                Prioridad: {{ item.ai_priority || item.priority }}
                              </v-chip>
                              <v-chip v-if="item.ai_confidence" size="x-small" :color="getConfidenceColor(item.ai_confidence)">
                                Confianza: {{ Math.round(item.ai_confidence * 100) }}%
                              </v-chip>
                            </div>
                          </v-col>
                          <v-col cols="12" md="5">
                            <div class="text-body-2 mb-2"><strong>Análisis IA:</strong></div>
                            <div class="text-caption">{{ item.ai_reasoning || item.reason }}</div>
                            <div v-if="item.ai_estimated_roi_days" class="text-caption mt-2">
                              <v-icon size="small" color="success">mdi-cash-fast</v-icon>
                              ROI estimado: {{ item.ai_estimated_roi_days }} días
                            </div>
                          </v-col>
                          <v-col cols="12" md="3" class="text-right">
                            <div class="text-caption text-grey">Sistema: {{ item.suggested_order_qty }}</div>
                            <div class="text-h6 text-deep-purple">IA: {{ item.ai_suggested_qty || item.suggested_order_qty }} unidades</div>
                            <div class="text-caption">{{ formatMoney((item.ai_suggested_qty || item.suggested_order_qty) * item.unit_cost) }}</div>
                            <v-btn size="small" color="deep-purple" class="mt-2" @click="addAISuggestionToCart(item)">
                              Agregar a Compra
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </v-window-item>

                  <!-- Críticas -->
                  <v-window-item value="critical">
                    <v-card
                      v-for="item in aiAnalysis.suggestions.filter(s => s.ai_priority === 1 || s.priority === 1)"
                      :key="item.variant_id"
                      variant="outlined"
                      class="mb-2 border-error"
                    >
                      <v-card-text>
                        <v-row align="center">
                          <v-col cols="12" md="6">
                            <div class="text-h6">{{ item.product_name }}</div>
                            <div class="text-caption">{{ item.ai_reasoning || item.reason }}</div>
                          </v-col>
                          <v-col cols="12" md="3">
                            <div class="text-h6 text-error">{{ item.ai_suggested_qty || item.suggested_order_qty }} unidades</div>
                            <div class="text-caption">{{ formatMoney((item.ai_suggested_qty || item.suggested_order_qty) * item.unit_cost) }}</div>
                          </v-col>
                          <v-col cols="12" md="3" class="text-right">
                            <v-btn size="small" color="error" @click="addAISuggestionToCart(item)">
                              Agregar Urgente
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </v-window-item>

                  <!-- Alta Confianza -->
                  <v-window-item value="high-confidence">
                    <v-card
                      v-for="item in aiAnalysis.suggestions.filter(s => (s.ai_confidence || 0) > 0.8)"
                      :key="item.variant_id"
                      variant="outlined"
                      class="mb-2"
                    >
                      <v-card-text>
                        <v-row align="center">
                          <v-col cols="12" md="6">
                            <div class="text-h6">{{ item.product_name }}</div>
                            <div class="text-caption">{{ item.ai_reasoning || item.reason }}</div>
                            <v-chip size="x-small" color="success" class="mt-1">
                              Confianza: {{ Math.round(item.ai_confidence * 100) }}%
                            </v-chip>
                          </v-col>
                          <v-col cols="12" md="3">
                            <div class="text-h6 text-success">{{ item.ai_suggested_qty || item.suggested_order_qty }} unidades</div>
                          </v-col>
                          <v-col cols="12" md="3" class="text-right">
                            <v-btn size="small" color="success" @click="addAISuggestionToCart(item)">
                              Agregar
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="aiAnalysis" color="deep-purple" prepend-icon="mdi-refresh" @click="refreshAIAnalysis">
            Actualizar Análisis
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="aiAnalysisDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Nueva Compra -->
    <v-dialog v-model="dialog" max-width="800" scrollable>
      <v-card>
        <v-card-title>
          <v-icon start>mdi-cart-plus</v-icon>
          Nueva Compra
        </v-card-title>
        <v-card-text>
          <v-form ref="form" @submit.prevent="savePurchase">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="purchaseData.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="location_id"
                  label="Sede"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  :rules="[rules.required]"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="purchaseData.note"
                  label="Nota (opcional)"
                  prepend-inner-icon="mdi-note-text"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <!-- Líneas de compra -->
            <v-divider class="my-4"></v-divider>
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-1 font-weight-bold">Productos</span>
              <v-spacer></v-spacer>
              <v-btn size="small" color="primary" prepend-icon="mdi-plus" variant="tonal" @click="addLine">Agregar</v-btn>
            </div>

            <v-card v-for="(line, i) in purchaseData.lines" :key="i" variant="outlined" class="mb-2">
              <v-card-text>
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-autocomplete
                      v-model="line.variant_id"
                      :items="variants"
                      :loading="searchingVariants"
                      item-title="_displayName"
                      item-value="variant_id"
                      label="Producto"
                      prepend-inner-icon="mdi-package-variant"
                      variant="outlined"
                      density="compact"
                      :rules="[rules.required]"
                      @update:search="searchVariants"
                    >
                      <template #item="{ props, item }">
                        <v-list-item v-bind="props" :subtitle="'SKU: ' + item.raw.sku"></v-list-item>
                      </template>
                    </v-autocomplete>
                  </v-col>
                  <v-col cols="12" sm="2">
                    <v-text-field
                      v-model.number="line.qty"
                      label="Cantidad"
                      type="number"
                      prepend-inner-icon="mdi-numeric"
                      variant="outlined"
                      density="compact"
                      min="1"
                      :rules="[rules.required, rules.positive]"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model.number="line.unit_cost"
                      label="Costo Unitario"
                      type="number"
                      prepend-inner-icon="mdi-cash"
                      variant="outlined"
                      density="compact"
                      min="0"
                      step="0.01"
                      :rules="[rules.required, rules.positive]"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="1" class="d-flex align-center">
                    <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="removeLine(i)"></v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-alert v-if="purchaseData.lines.length === 0" type="info" variant="tonal" class="mt-2">
              Agrega al menos un producto para registrar la compra
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePurchase" :disabled="purchaseData.lines.length === 0">Guardar Compra</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarMessage }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useTenant } from '@/composables/useTenant'
import { useAuth } from '@/composables/useAuth'
import supabaseService from '@/services/supabase.service'
import purchasesService from '@/services/purchases.service'
import ListView from '@/components/ListView.vue'

const { isMobile } = useDisplay()
const { tenantId } = useTenant()
const { userProfile } = useAuth()

const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const form = ref(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const purchases = ref([])
const totalPurchases = ref(0)
const locations = ref([])
const variants = ref([])
const searchingVariants = ref(false)

const selectedLocation = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)
const search = ref('')

const purchaseData = ref({
  location_id: null,
  note: '',
  lines: []
})

// Sugerencias IA
const suggestionsDialog = ref(false)
const suggestions = ref([])
const loadingSuggestions = ref(false)
const suggestionsTab = ref('critical')
const criticalCount = computed(() => suggestions.value.filter(s => s.priority === 1).length)

// Análisis IA Avanzado
const aiAnalysisDialog = ref(false)
const aiAnalysis = ref(null)
const loadingAIAnalysis = ref(false)
const aiAnalysisError = ref(null)
const aiSuggestionsTab = ref('all')
const aiAvailable = ref(false)

// Verificar disponibilidad de IA
onMounted(() => {
  aiAvailable.value = purchasesService.isAIAvailable()
  if (!aiAvailable.value) {
    console.warn('Servicio de IA no disponible. Configure VITE_DEEPSEEK_API_KEY.')
  }
})

const rules = {
  required: v => !!v || v === 0 || 'Campo requerido',
  positive: v => v > 0 || 'Debe ser mayor a 0'
}

// Funciones de sugerencias
const openSuggestionsDialog = async () => {
  suggestionsDialog.value = true
  await loadSuggestions()
}

const loadSuggestions = async () => {
  if (!tenantId.value) return
  loadingSuggestions.value = true
  try {
    const result = await purchasesService.getPurchaseSuggestions(tenantId.value, 3, 50)
    if (result.success) {
      suggestions.value = result.data
      // Auto-abrir tab con datos
      if (criticalCount.value > 0) {
        suggestionsTab.value = 'critical'
      } else if (result.data.filter(s => s.priority === 2).length > 0) {
        suggestionsTab.value = 'high'
      } else {
        suggestionsTab.value = 'medium'
      }
    } else {
      showMsg('Error al cargar sugerencias', 'error')
    }
  } finally {
    loadingSuggestions.value = false
  }
}

const addSuggestionToCart = (item) => {
  // Buscar si ya existe en el carrito
  const existing = purchaseData.value.lines.find(l => l.variant_id === item.variant_id)
  if (existing) {
    existing.qty = item.suggested_order_qty
    existing.unit_cost = item.unit_cost
    showMsg(`Actualizado: ${item.product_name}`, 'info')
  } else {
    purchaseData.value.lines.push({
      variant_id: item.variant_id,
      qty: item.suggested_order_qty,
      unit_cost: item.unit_cost
    })
    showMsg(`Agregado: ${item.product_name}`, 'success')
  }
}

const createPurchaseFromSuggestions = () => {
  // Transferir todas las sugerencias al formulario de compra
  suggestionsDialog.value = false
  dialog.value = true
  purchaseData.value.lines = suggestions.value.map(s => ({
    variant_id: s.variant_id,
    qty: s.suggested_order_qty,
    unit_cost: s.unit_cost
  }))
  showMsg(`${suggestions.value.length} productos agregados a la orden de compra`, 'success')
}

// Funciones de Análisis IA Avanzado
const openAIAnalysisDialog = async () => {
  aiAnalysisDialog.value = true
  if (!aiAnalysis.value) {
    await loadAIAnalysis()
  }
}

const loadAIAnalysis = async () => {
  if (!tenantId.value) return
  if (!aiAvailable.value) {
    aiAnalysisError.value = 'Servicio de IA no disponible. Configure VITE_DEEPSEEK_API_KEY en las variables de entorno.'
    return
  }

  loadingAIAnalysis.value = true
  aiAnalysisError.value = null

  try {
    const result = await purchasesService.getAIPurchaseAnalysis(tenantId.value, {
      businessContext: 'Tienda minorista con análisis histórico de ventas',
      priorityLevel: 3
    })

    if (result.success) {
      aiAnalysis.value = result.data
      showMsg('Análisis IA completado exitosamente', 'success')
    } else {
      aiAnalysisError.value = result.error || 'Error al cargar análisis de IA'
    }
  } catch (error) {
    console.error('Error loading AI analysis:', error)
    aiAnalysisError.value = `Error: ${error.message}`
  } finally {
    loadingAIAnalysis.value = false
  }
}

const refreshAIAnalysis = async () => {
  aiAnalysis.value = null
  await loadAIAnalysis()
}

const addAISuggestionToCart = (item) => {
  const qty = item.ai_suggested_qty || item.suggested_order_qty
  const existing = purchaseData.value.lines.find(l => l.variant_id === item.variant_id)
  
  if (existing) {
    existing.qty = qty
    existing.unit_cost = item.unit_cost
    showMsg(`Actualizado con sugerencia IA: ${item.product_name}`, 'info')
  } else {
    purchaseData.value.lines.push({
      variant_id: item.variant_id,
      qty: qty,
      unit_cost: item.unit_cost
    })
    showMsg(`Agregado con sugerencia IA: ${item.product_name}`, 'success')
  }
  
  // Cerrar diálogo y abrir formulario de compra
  aiAnalysisDialog.value = false
  dialog.value = true
}

const getPriorityColor = (priority) => {
  const colors = {
    1: 'error',
    2: 'warning',
    3: 'info',
    4: 'grey',
    5: 'grey'
  }
  return colors[priority] || 'grey'
}

const getConfidenceColor = (confidence) => {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.6) return 'info'
  if (confidence >= 0.4) return 'warning'
  return 'error'
}

onMounted(async () => {
  await loadLocations()
  await loadPurchases()
  // Cargar sugerencias en background para mostrar badge
  loadSuggestions()
})

const loadLocations = async () => {
  if (!tenantId.value) return
  const { data, error } = await supabaseService.client
    .from('locations')
    .select('location_id, name')
    .eq('tenant_id', tenantId.value)
    .eq('is_active', true)
    .order('name')
  if (!error) locations.value = data || []
}

const loadPurchases = async () => {
  if (!tenantId.value) return
  loading.value = true
  try {
    let query = supabaseService.client
      .from('vw_purchases_summary')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId.value)
      .order('purchased_at', { ascending: false })
      .limit(100)

    if (selectedLocation.value) {
      query = query.eq('location_id', selectedLocation.value)
    }
    if (dateFrom.value) {
      query = query.gte('purchased_at', dateFrom.value)
    }
    if (dateTo.value) {
      query = query.lte('purchased_at', dateTo.value + 'T23:59:59')
    }
    if (search.value) {
      query = query.or(`product_name.ilike.%${search.value}%,sku.ilike.%${search.value}%`)
    }

    const { data, error, count } = await query
    if (error) throw error
    purchases.value = data || []
    totalPurchases.value = count || 0
  } catch (error) {
    showMsg('Error al cargar compras: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const loadPurchasesPage = (page, pageSize) => {
  // Por ahora solo recargamos todo - puedes implementar paginación después
  loadPurchases()
}

const handleSearch = (searchTerm) => {
  search.value = searchTerm
  loadPurchases()
}

const loadInitialVariants = async () => {
  if (!tenantId.value) return
  searchingVariants.value = true
  try {
    const { data, error } = await supabaseService.client
      .from('product_variants')
      .select(`
        variant_id,
        sku,
        variant_name,
        product_id!inner(product_id, name)
      `)
      .eq('tenant_id', tenantId.value)
      .eq('is_active', true)
      .order('sku')
      .limit(50)

    if (error) throw error
    
    if (data) {
      variants.value = data.map(v => ({
        ...v,
        _displayName: `${v.product_id.name}${v.variant_name ? ' - ' + v.variant_name : ''} (${v.sku})`
      }))
    }
  } catch (error) {
    showMsg('Error al cargar productos: ' + error.message, 'error')
  } finally {
    searchingVariants.value = false
  }
}

const searchVariants = async (searchTerm) => {
  if (!tenantId.value) return
  
  // Si no hay término de búsqueda o es muy corto, cargar productos iniciales
  if (!searchTerm || searchTerm.length < 2) {
    await loadInitialVariants()
    return
  }
  
  searchingVariants.value = true
  try {
    // Buscar primero por SKU o variant_name
    let query = supabaseService.client
      .from('product_variants')
      .select(`
        variant_id,
        sku,
        variant_name,
        product_id!inner(product_id, name)
      `)
      .eq('tenant_id', tenantId.value)
      .eq('is_active', true)
      .order('sku')
      .limit(30)

    // Buscar en SKU, variant_name o nombre del producto
    const searchLower = searchTerm.toLowerCase()
    
    const { data, error } = await query
    
    if (error) throw error
    
    if (data) {
      // Filtrar resultados manualmente para incluir búsqueda por nombre de producto
      const filtered = data.filter(v => 
        v.sku?.toLowerCase().includes(searchLower) ||
        v.variant_name?.toLowerCase().includes(searchLower) ||
        v.product_id?.name?.toLowerCase().includes(searchLower)
      )
      
      variants.value = filtered.map(v => ({
        ...v,
        _displayName: `${v.product_id.name}${v.variant_name ? ' - ' + v.variant_name : ''} (${v.sku})`
      }))
    }
  } catch (error) {
    showMsg('Error al buscar productos: ' + error.message, 'error')
  } finally {
    searchingVariants.value = false
  }
}

const openCreateDialog = async () => {
  purchaseData.value = {
    location_id: locations.value.length === 1 ? locations.value[0].location_id : null,
    note: '',
    lines: []
  }
  dialog.value = true
  await loadInitialVariants()
}

const addLine = () => {
  purchaseData.value.lines.push({
    variant_id: null,
    qty: 1,
    unit_cost: 0
  })
}

const removeLine = (index) => {
  purchaseData.value.lines.splice(index, 1)
}

const savePurchase = async () => {
  const { valid } = await form.value.validate()
  if (!valid || !tenantId.value) return
  
  if (purchaseData.value.lines.length === 0) {
    showMsg('Agrega al menos un producto', 'warning')
    return
  }

  if (!userProfile.value?.user_id) {
    showMsg('Error: Usuario no identificado', 'error')
    return
  }

  saving.value = true
  try {
    const { data, error } = await supabaseService.client.rpc('sp_create_purchase', {
      p_tenant: tenantId.value,
      p_location: purchaseData.value.location_id,
      p_supplier_id: null, // Puedes agregar proveedor después
      p_created_by: userProfile.value.user_id,
      p_lines: purchaseData.value.lines,
      p_note: purchaseData.value.note || null
    })

    if (error) throw error
    
    showMsg('Compra registrada exitosamente')
    dialog.value = false
    await loadPurchases()
  } catch (error) {
    showMsg('Error al guardar compra: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMoney = (value) => {
  if (!value && value !== 0) return '$0'
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const showMsg = (msg, color = 'success') => {
  snackbarMessage.value = msg
  snackbarColor.value = color
  snackbar.value = true
}
</script>
