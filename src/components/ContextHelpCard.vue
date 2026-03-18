<template>
  <v-card
    v-if="context && featuredArticle"
    class="help-context-card"
    :color="context.color"
    variant="tonal"
  >
    <v-card-text class="d-flex flex-column flex-md-row justify-space-between ga-4">
      <div class="help-context-card__copy">
        <div class="d-flex align-center ga-2 mb-2">
          <v-avatar :color="context.color" variant="flat" size="34">
            <v-icon size="18">{{ context.icon }}</v-icon>
          </v-avatar>
          <div class="text-subtitle-1 font-weight-bold">{{ context.title }}</div>
          <v-chip
            v-if="articleProgress.total > 0"
            size="x-small"
            :color="articleProgress.isDone ? 'success' : context.color"
            variant="outlined"
          >
            {{ articleProgress.completed }}/{{ articleProgress.total }} pasos
          </v-chip>
        </div>

        <p class="text-body-2 mb-3">{{ context.summary }}</p>

        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="tip in context.quickTips || []"
            :key="tip"
            size="small"
            variant="outlined"
          >
            {{ tip }}
          </v-chip>
        </div>
      </div>

      <div class="help-context-card__actions d-flex flex-column align-md-end ga-2">
        <v-btn
          color="primary"
          variant="elevated"
          :to="{ path: '/help', query: { article: featuredArticle.slug, process: featuredArticle.process } }"
        >
          Abrir guia
        </v-btn>
        <v-btn
          v-if="firstFaq"
          color="secondary"
          variant="tonal"
          :to="{ path: '/help', query: { process: featuredArticle.process, faq: firstFaq.id, article: featuredArticle.slug } }"
        >
          Ver FAQ
        </v-btn>
        <v-btn
          color="grey"
          variant="text"
          :to="{ path: '/help', query: { process: featuredArticle.process } }"
        >
          Centro de ayuda
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useHelpCenter } from '@/composables/useHelpCenter'

const props = defineProps({
  contextKey: {
    type: String,
    required: true
  }
})

const { getArticle, getFaq, getHelpContext, getArticleProgress } = useHelpCenter()

const context = computed(() => getHelpContext(props.contextKey))
const featuredArticle = computed(() => getArticle(context.value?.featuredArticle || ''))
const firstFaq = computed(() => getFaq(context.value?.faqIds?.[0] || ''))
const articleProgress = computed(() => {
  if (!featuredArticle.value) {
    return { completed: 0, total: 0, isDone: false }
  }
  return getArticleProgress(featuredArticle.value.slug)
})
</script>

<style scoped>
.help-context-card {
  border-radius: 18px;
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.help-context-card__copy {
  flex: 1 1 620px;
}

.help-context-card__actions {
  min-width: 180px;
}
</style>
