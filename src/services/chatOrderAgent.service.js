import { supabase } from '@/plugins/supabase'

const CHAT_ORDER_EDGE_FUNCTION =
  import.meta.env.VITE_CHAT_ORDER_EDGE_FUNCTION || 'chat-order-parser'
const DEFAULT_TEXT_MODEL =
  import.meta.env.VITE_DEEPSEEK_TEXT_MODEL || 'deepseek-chat'

async function extractInvokeError(error) {
  const fragments = []
  if (error?.message) fragments.push(String(error.message))

  const context = error?.context
  if (!context) return fragments.join(' | ') || 'Error desconocido'

  try {
    const response = typeof context.clone === 'function' ? context.clone() : context
    if (response?.status) fragments.push(`HTTP ${response.status}`)

    let bodyJson = null
    if (typeof response?.json === 'function') {
      bodyJson = await response.json().catch(() => null)
    }

    if (bodyJson?.error) fragments.push(String(bodyJson.error))
    if (bodyJson?.details) fragments.push(String(bodyJson.details))

    if (!bodyJson && typeof response?.text === 'function') {
      const bodyText = await response.text().catch(() => '')
      if (bodyText?.trim()) fragments.push(bodyText.trim().slice(0, 280))
    }
  } catch (_e) {
    // No-op
  }

  const unique = Array.from(new Set(fragments.filter(Boolean)))
  return unique.join(' | ') || 'Error desconocido'
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSku(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl'])

function normalizeSizeToken(token) {
  const clean = String(token || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!clean) return null
  if (SIZE_TOKENS.has(clean)) return clean
  return null
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((t) => t.length >= 2 || SIZE_TOKENS.has(t))
}

function extractSizeTokens(value) {
  const tokens = normalizeText(value).split(' ').filter(Boolean)
  const sizes = new Set()

  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i]
    const next = tokens[i + 1]

    const direct = normalizeSizeToken(current)
    if (direct) sizes.add(direct)

    if (current === 'talla' && next) {
      const hinted = normalizeSizeToken(next)
      if (hinted) sizes.add(hinted)
    }
  }

  return sizes
}

function scoreByTokens(lineText, candidate) {
  const lineTokens = tokenize(lineText)
  if (lineTokens.length === 0) return 0

  const candidateText = `${candidate?.product?.name || ''} ${candidate?.variant_name || ''} ${candidate?.sku || ''}`
  const candidateTokens = tokenize(candidateText)
  if (candidateTokens.length === 0) return 0

  const candidateSet = new Set(candidateTokens)
  const intersection = lineTokens.filter((token) => candidateSet.has(token)).length
  const containmentBonus =
    normalizeText(candidateText).includes(normalizeText(lineText)) ||
    normalizeText(lineText).includes(normalizeText(candidateText))
      ? 0.15
      : 0

  return Math.min(1, intersection / lineTokens.length + containmentBonus)
}

function findBestVariantMatch(line, catalog) {
  const lineSku = normalizeSku(line?.sku)
  const rawName = String(`${line?.raw_name || line?.name || ''} ${line?.unit_hint || ''}`).trim()
  const normalizedName = normalizeText(rawName)
  const lineSizes = extractSizeTokens(rawName)

  if (lineSku) {
    const bySku = catalog.find((item) => normalizeSku(item?.sku) === lineSku)
    if (bySku) return { variant: bySku, confidence: 1, matchReason: 'sku_exact' }
  }

  if (normalizedName) {
    const exactName = catalog.find((item) => {
      const candidate = normalizeText(`${item?.product?.name || ''} ${item?.variant_name || ''}`)
      return candidate === normalizedName
    })
    if (exactName) return { variant: exactName, confidence: 0.94, matchReason: 'name_exact' }
  }

  let candidates = Array.isArray(catalog) ? [...catalog] : []
  if (lineSizes.size > 0) {
    const withOverlappingSize = candidates.filter((candidate) => {
      const candidateText = `${candidate?.product?.name || ''} ${candidate?.variant_name || ''} ${candidate?.sku || ''}`
      const candidateSizes = extractSizeTokens(candidateText)
      if (candidateSizes.size === 0) return false
      return Array.from(lineSizes).some((size) => candidateSizes.has(size))
    })

    if (withOverlappingSize.length > 0) {
      candidates = withOverlappingSize
    }
  }

  let best = null
  for (const candidate of candidates) {
    let score = scoreByTokens(rawName, candidate)
    const candidateText = `${candidate?.product?.name || ''} ${candidate?.variant_name || ''} ${candidate?.sku || ''}`
    const candidateSizes = extractSizeTokens(candidateText)

    if (lineSizes.size > 0 && candidateSizes.size > 0) {
      const hasSizeOverlap = Array.from(lineSizes).some((size) => candidateSizes.has(size))
      if (hasSizeOverlap) score += 0.35
      else score -= 0.35
    }

    if (lineSizes.size > 0 && candidateSizes.size === 0) {
      score -= 0.15
    }

    if (!best || score > best.score) {
      best = { candidate, score }
    }
  }

  if (best && best.score >= 0.42) {
    return {
      variant: best.candidate,
      confidence: Number(Math.min(1, Math.max(0, best.score)).toFixed(3)),
      matchReason: 'name_tokens'
    }
  }

  return null
}

function normalizeMatchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreCustomerName(targetName, customer) {
  const target = normalizeMatchText(targetName)
  const candidate = normalizeMatchText(customer?.full_name || '')
  if (!target || !candidate) return 0
  if (target === candidate) return 1
  if (candidate.includes(target) || target.includes(candidate)) return 0.92

  const targetTokens = target.split(' ').filter((t) => t.length > 1)
  const candidateTokens = candidate.split(' ').filter((t) => t.length > 1)
  if (!targetTokens.length || !candidateTokens.length) return 0

  const candidateSet = new Set(candidateTokens)
  const common = targetTokens.filter((token) => candidateSet.has(token)).length
  return common / targetTokens.length
}

export function findBestCustomerMatch(targetName, customersList) {
  const list = Array.isArray(customersList) ? customersList : []
  let best = null
  for (const c of list) {
    const score = scoreCustomerName(targetName, c)
    if (!best || score > best.score) best = { customer: c, score }
  }
  if (!best || best.score < 0.55) return null
  return best
}

export function matchChatLinesToCatalog(lineItems, catalog) {
  const lines = Array.isArray(lineItems) ? lineItems : []
  const list = Array.isArray(catalog) ? catalog : []

  const matched = []
  const unmatched = []

  for (const line of lines) {
    const best = findBestVariantMatch(line, list)
    if (best?.variant) {
      matched.push({
        line,
        variant: best.variant,
        confidence: best.confidence,
        matchReason: best.matchReason
      })
    } else {
      unmatched.push(line)
    }
  }

  return { matched, unmatched }
}

export async function analyzeChatOrderText({ tenantId, chatText }) {
  if (!tenantId) {
    return { success: false, error: 'tenantId es requerido.' }
  }

  const text = String(chatText || '').trim()
  if (!text) {
    return { success: false, error: 'Escribe o pega un chat para convertir.' }
  }

  const { data, error } = await supabase.functions.invoke(CHAT_ORDER_EDGE_FUNCTION, {
    body: {
      tenant_id: tenantId,
      model: DEFAULT_TEXT_MODEL,
      temperature: 0.1,
      max_tokens: 1800,
      chat_text: text.slice(0, 10000)
    }
  })

  if (error) {
    const details = await extractInvokeError(error)
    return {
      success: false,
      error: `Error invocando Edge Function "${CHAT_ORDER_EDGE_FUNCTION}": ${details}.`
    }
  }

  const lineItems = Array.isArray(data?.line_items) ? data.line_items : []
  if (!lineItems.length) {
    return { success: false, error: 'La IA no devolvió ítems para convertir a venta.' }
  }

  const normalized = lineItems
    .map((item) => ({
      raw_name: String(item?.raw_name || '').trim(),
      sku: item?.sku ? String(item.sku).trim() : null,
      quantity: Math.max(1, Number(item?.quantity || 1)),
      unit_hint: item?.unit_hint ? String(item.unit_hint).trim() : null,
      unit_price: item?.unit_price == null ? null : Number(item.unit_price || 0)
    }))
    .filter((item) => item.raw_name)

  if (!normalized.length) {
    return { success: false, error: 'No se pudieron normalizar ítems válidos del chat.' }
  }

  return {
    success: true,
    data: {
      order: data?.order || {},
      line_items: normalized,
      model: data?.model || null,
      usage: data?.usage || null,
      raw: data?.raw || null,
      cache_hit: Boolean(data?.cache_hit)
    }
  }
}
