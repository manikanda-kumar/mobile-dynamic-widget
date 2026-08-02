import { Platform } from 'react-native'

declare const process: { env: Record<string, string | undefined> }

export type IconName =
  | 'arrow-up-right'
  | 'bar-chart-2'
  | 'bell'
  | 'check'
  | 'chevron-right'
  | 'credit-card'
  | 'gift'
  | 'home'
  | 'pie-chart'
  | 'plus'
  | 'send'
  | 'shield'
  | 'user'

export type Theme = {
  background: string
  surface: string
  primary: string
  primaryDark: string
  text: string
  muted: string
  border: string
  accent: string
  positive: string
}

export type AccountSummaryProps = {
  eyebrow: string
  balance: string
  change: string
  accountLabel: string
  accountNumber: string
  segmentLabel?: string
}

export type QuickActionsProps = {
  actions: Array<{ label: string; icon: IconName }>
}

export type OfferProps = {
  tag: string
  title: string
  description: string
  cta: string
  icon: IconName
  color: string
}

export type FinancialHealthProps = {
  score: number
  label: string
  caption: string
  metrics: Array<{ label: string; value: string; progress: number }>
}

export type TaskListProps = {
  title: string
  completed: number
  tasks: Array<{ title: string; detail: string; done: boolean; icon: IconName }>
}

export type RendererType =
  | 'account_summary'
  | 'quick_actions'
  | 'loan_offer'
  | 'credit_card_offer'
  | 'kyc_nudge'
  | 'financial_health'
  | 'task_list'
  | 'journey_status'

export type RenderAction = {
  type: 'navigate' | 'command'
  command?: 'dismiss' | 'snooze'
  target?: string
}

export type RenderItem = {
  instanceId: string
  widgetId: string
  campaignId?: string
  renderer: { type: RendererType; version: 1 }
  rank: number
  instanceVersion: number
  props: Record<string, unknown>
  actions: RenderAction[]
}

export type ExperienceSlot = {
  id: string
  title?: string
  action?: string
  layout: { type: 'vertical' | 'grid' | 'carousel'; columns?: number }
  items: RenderItem[]
}

export type ExperienceResponse = {
  schemaVersion: '1.0'
  decisionId: string
  configVersion: string
  userStateVersion: string
  page: {
    customer: { id: string; name: string }
    theme: Record<string, unknown>
    navigation: Array<{ id: string; label: string }>
  }
  slots: ExperienceSlot[]
}

export const theme: Theme = {
  background: '#F4F6F1',
  surface: '#FFFFFF',
  primary: '#176B5B',
  primaryDark: '#103D35',
  text: '#18211E',
  muted: '#6C7772',
  border: '#E3E8E3',
  accent: '#DDF3E7',
  positive: '#208466',
}

const rendererTypes = new Set<RendererType>([
  'account_summary',
  'quick_actions',
  'loan_offer',
  'credit_card_offer',
  'kyc_nudge',
  'financial_health',
  'task_list',
  'journey_status',
])

const iconNames = new Set<IconName>([
  'arrow-up-right', 'bar-chart-2', 'bell', 'check', 'chevron-right', 'credit-card', 'gift', 'home', 'pie-chart', 'plus', 'send', 'shield', 'user',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStrings(value: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof value[key] === 'string')
}

function validProps(type: RendererType, props: Record<string, unknown>) {
  if (type === 'account_summary') return hasStrings(props, ['eyebrow', 'balance', 'change', 'accountLabel', 'accountNumber'])
  if (type === 'quick_actions') return Array.isArray(props.actions) && props.actions.every((action) => isRecord(action) && typeof action.label === 'string' && iconNames.has(action.icon as IconName))
  if (type === 'loan_offer' || type === 'credit_card_offer' || type === 'kyc_nudge' || type === 'journey_status') {
    return hasStrings(props, ['tag', 'title', 'description', 'cta', 'color']) && iconNames.has(props.icon as IconName)
  }
  if (type === 'financial_health') {
    return typeof props.score === 'number'
      && hasStrings(props, ['label', 'caption'])
      && Array.isArray(props.metrics)
      && props.metrics.every((metric) => isRecord(metric) && hasStrings(metric, ['label', 'value']) && typeof metric.progress === 'number')
  }
  return type === 'task_list'
    && typeof props.completed === 'number'
    && typeof props.title === 'string'
    && Array.isArray(props.tasks)
    && props.tasks.every((task) => isRecord(task) && hasStrings(task, ['title', 'detail']) && typeof task.done === 'boolean' && iconNames.has(task.icon as IconName))
}

function isRenderAction(value: unknown): value is RenderAction {
  if (!isRecord(value) || (value.type !== 'navigate' && value.type !== 'command')) return false
  if (value.type === 'navigate') return typeof value.target === 'string'
  return value.command === 'dismiss' || value.command === 'snooze'
}

function isRenderItem(value: unknown): value is RenderItem {
  if (!isRecord(value) || !isRecord(value.renderer)) return false
  const type = value.renderer.type
  return typeof value.instanceId === 'string'
    && typeof value.widgetId === 'string'
    && typeof type === 'string'
    && rendererTypes.has(type as RendererType)
    && value.renderer.version === 1
    && typeof value.rank === 'number'
    && typeof value.instanceVersion === 'number'
    && isRecord(value.props)
    && validProps(type as RendererType, value.props)
    && Array.isArray(value.actions)
    && value.actions.every(isRenderAction)
}

export function parseExperience(value: unknown): ExperienceResponse {
  if (!isRecord(value) || value.schemaVersion !== '1.0' || !isRecord(value.page) || !Array.isArray(value.slots)) {
    throw new Error('The experience response has an unsupported shape.')
  }
  const customer = value.page.customer
  if (!isRecord(customer) || typeof customer.id !== 'string' || typeof customer.name !== 'string') {
    throw new Error('The experience response is missing its customer context.')
  }
  const slots: ExperienceSlot[] = value.slots.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || !isRecord(candidate.layout) || !Array.isArray(candidate.items)) return []
    const layoutType = candidate.layout.type
    if (layoutType !== 'vertical' && layoutType !== 'grid' && layoutType !== 'carousel') return []
    return [{
      id: candidate.id,
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      action: typeof candidate.action === 'string' ? candidate.action : undefined,
      layout: { type: layoutType, columns: typeof candidate.layout.columns === 'number' ? candidate.layout.columns : undefined },
      items: candidate.items.filter(isRenderItem),
    }]
  })
  return {
    schemaVersion: '1.0',
    decisionId: typeof value.decisionId === 'string' ? value.decisionId : 'unknown',
    configVersion: typeof value.configVersion === 'string' ? value.configVersion : 'unknown',
    userStateVersion: typeof value.userStateVersion === 'string' ? value.userStateVersion : 'unknown',
    page: {
      customer: { id: customer.id, name: customer.name },
      theme: isRecord(value.page.theme) ? value.page.theme : {},
      navigation: Array.isArray(value.page.navigation)
        ? value.page.navigation.filter((entry): entry is { id: string; label: string } => isRecord(entry) && typeof entry.id === 'string' && typeof entry.label === 'string')
        : [],
    },
    slots,
  }
}

export function apiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin
    if (/\-p\d+\.onamp\.dev$/.test(origin)) return origin.replace(/\-p\d+\.onamp\.dev$/, '-p8090.onamp.dev')
    return `${window.location.protocol}//${window.location.hostname}:8090`
  }
  return 'http://10.0.2.2:8090'
}

export async function fetchExperience(userId: string, signal?: AbortSignal): Promise<ExperienceResponse> {
  const response = await fetch(`${apiBaseUrl()}/v1/experiences/home`, {
    headers: { 'X-Mock-User-Id': userId, 'X-Renderer-Catalog-Version': '1' },
    signal,
  })
  if (!response.ok) throw new Error(`Experience service returned ${response.status}.`)
  return parseExperience(await response.json())
}

export async function sendCommand(userId: string, item: RenderItem, command: 'dismiss' | 'snooze') {
  const response = await fetch(`${apiBaseUrl()}/v1/widget-instances/${encodeURIComponent(item.instanceId)}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Mock-User-Id': userId },
    body: JSON.stringify({
      commandId: `${userId}-${item.instanceId}-${Date.now()}`,
      command,
      expectedInstanceVersion: item.instanceVersion,
      ...(command === 'snooze' ? { snoozedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString() } : {}),
    }),
  })
  if (!response.ok) throw new Error(`Command failed with ${response.status}.`)
  const value: unknown = await response.json()
  if (!isRecord(value) || !Array.isArray(value.removeInstanceIds) || !value.removeInstanceIds.every((id) => typeof id === 'string') || typeof value.refetchDecision !== 'boolean') {
    throw new Error('The command response has an unsupported shape.')
  }
  return { removeInstanceIds: value.removeInstanceIds as string[], refetchDecision: value.refetchDecision }
}
