import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import {
  AccountSummaryProps,
  ExperienceResponse,
  ExperienceSlot,
  fetchExperience,
  FinancialHealthProps,
  IconName,
  OfferProps,
  QuickActionsProps,
  RenderItem,
  sendCommand,
  TaskListProps,
  theme,
} from './src/experience'

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true)

const personas = [
  { id: 'aarav', label: 'Aarav' },
  { id: 'meera', label: 'Meera' },
  { id: 'kabir', label: 'Kabir' },
  { id: 'new-user', label: 'New user' },
]

const navigationIcons: Record<string, IconName> = { home: 'home', payments: 'credit-card', insights: 'pie-chart', profile: 'user' }

function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  return <Feather name={name} color={color} size={size} />
}

function itemProps<T>(item: RenderItem): T {
  return item.props as T
}

function AccountSummary({ item }: { item: RenderItem }) {
  const props = itemProps<AccountSummaryProps>(item)
  return (
    <LinearGradient colors={[theme.primaryDark, theme.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
      <View style={styles.summaryGlow} />
      <View style={styles.summaryTop}>
        <Text style={styles.summaryEyebrow}>{props.eyebrow}</Text>
        {props.segmentLabel ? <View style={styles.premierBadge}><View style={styles.badgeDot} /><Text style={styles.premierText}>{props.segmentLabel.toUpperCase()}</Text></View> : null}
      </View>
      <Text style={styles.balance}>{props.balance}</Text>
      <View style={styles.changeRow}><Icon name="arrow-up-right" color="#C5F1D7" size={14} /><Text style={styles.change}>{props.change}</Text></View>
      <View style={styles.summaryDivider} />
      <View style={styles.accountRow}>
        <View><Text style={styles.accountLabel}>{props.accountLabel}</Text><Text style={styles.accountNumber}>{props.accountNumber}</Text></View>
        <TouchableOpacity style={styles.circleButton} accessibilityLabel="View account"><Icon name="chevron-right" color="#FFFFFF" size={20} /></TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

function QuickActions({ item }: { item: RenderItem }) {
  const props = itemProps<QuickActionsProps>(item)
  return (
    <View style={styles.actionsRow}>
      {props.actions.map((action) => (
        <TouchableOpacity key={action.label} style={styles.action} activeOpacity={0.7}>
          <View style={styles.actionIcon}><Icon name={action.icon} color={theme.primary} size={21} /></View>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function SectionHeader({ slot }: { slot: ExperienceSlot }) {
  if (!slot.title || slot.items.length === 0) return null
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{slot.title}</Text>
      {slot.action ? <Text style={styles.sectionAction}>{slot.action}</Text> : null}
    </View>
  )
}

function OfferCard({ item, busy, onCommand, fullWidth = false }: { item: RenderItem; busy: boolean; onCommand: (item: RenderItem) => void; fullWidth?: boolean }) {
  const props = itemProps<OfferProps>(item)
  const canCommand = item.actions.some((action) => action.type === 'command')
  const { width } = useWindowDimensions()
  const cardWidth = Math.min(width, 480) - 40
  return (
    <View style={[styles.offerCard, { width: cardWidth, backgroundColor: props.color }, fullWidth && styles.offerCardWide]}>
      <View style={styles.offerTop}>
        <Text style={styles.offerTag}>{props.tag}</Text>
        <View style={styles.offerIcon}><Icon name={props.icon} color="#FFFFFF" size={19} /></View>
      </View>
      <Text style={styles.offerTitle}>{props.title}</Text>
      <Text style={styles.offerDescription}>{props.description}</Text>
      <View style={styles.offerFooter}>
        <TouchableOpacity style={styles.offerCta}><Text style={styles.offerCtaText}>{props.cta}</Text><Icon name="chevron-right" color={theme.primary} size={16} /></TouchableOpacity>
        {canCommand ? (
          <TouchableOpacity disabled={busy} onPress={() => onCommand(item)} style={styles.notNowButton}>
            {busy ? <ActivityIndicator size="small" color={theme.muted} /> : <Text style={styles.notNowText}>{item.renderer.type === 'kyc_nudge' ? 'Later' : 'Not now'}</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

function FinancialHealth({ item }: { item: RenderItem }) {
  const props = itemProps<FinancialHealthProps>(item)
  return (
    <View style={styles.healthCard}>
      <View style={styles.healthTop}>
        <View style={styles.scoreRing}><Text style={styles.score}>{props.score}</Text><Text style={styles.scoreUnit}>/100</Text></View>
        <View style={styles.healthCopy}><Text style={styles.healthLabel}>{props.label}</Text><Text style={styles.healthCaption}>{props.caption}</Text></View>
        <Icon name="chevron-right" color={theme.muted} size={20} />
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.metrics}>
        {props.metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <View style={styles.metricTextRow}><Text style={styles.metricLabel}>{metric.label}</Text><Text style={styles.metricValue}>{metric.value}</Text></View>
            <View style={styles.track}><View style={[styles.progress, { width: `${metric.progress * 100}%` }]} /></View>
          </View>
        ))}
      </View>
    </View>
  )
}

function TaskList({ item }: { item: RenderItem }) {
  const props = itemProps<TaskListProps>(item)
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeading}>
        <View><Text style={styles.taskTitle}>{props.title}</Text><Text style={styles.taskProgress}>{props.completed} of {props.tasks.length} completed</Text></View>
        <View style={styles.shieldCircle}><Icon name="shield" color={theme.primary} size={19} /></View>
      </View>
      {props.tasks.map((task, index) => (
        <View key={task.title} style={[styles.taskRow, index > 0 && styles.taskBorder]}>
          <View style={[styles.taskStatus, task.done && styles.taskDone]}><Icon name={task.icon} color={theme.primary} size={16} /></View>
          <View style={styles.taskCopy}><Text style={styles.taskItemTitle}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View>
          <Icon name="chevron-right" color={theme.muted} size={18} />
        </View>
      ))}
    </View>
  )
}

function RenderWidget({ item, busy, onCommand, fullWidth }: { item: RenderItem; busy: boolean; onCommand: (item: RenderItem) => void; fullWidth?: boolean }) {
  switch (item.renderer.type) {
    case 'account_summary': return <AccountSummary item={item} />
    case 'quick_actions': return <QuickActions item={item} />
    case 'loan_offer':
    case 'credit_card_offer':
    case 'journey_status':
    case 'kyc_nudge': return <OfferCard item={item} busy={busy} onCommand={onCommand} fullWidth={fullWidth} />
    case 'financial_health': return <FinancialHealth item={item} />
    case 'task_list': return <TaskList item={item} />
  }
}

function Slot({ slot, busyIds, onCommand }: { slot: ExperienceSlot; busyIds: Set<string>; onCommand: (item: RenderItem) => void }) {
  if (slot.items.length === 0) return null
  if (slot.layout.type === 'carousel') {
    return (
      <View><SectionHeader slot={slot} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerList}>
        {slot.items.map((item) => <RenderWidget key={item.instanceId} item={item} busy={busyIds.has(item.instanceId)} onCommand={onCommand} />)}
      </ScrollView></View>
    )
  }
  return (
    <View><SectionHeader slot={slot} /><View style={styles.verticalSlot}>
      {slot.items.map((item) => <RenderWidget key={item.instanceId} item={item} busy={busyIds.has(item.instanceId)} onCommand={onCommand} fullWidth />)}
    </View></View>
  )
}

function HomeScreen() {
  const [userId, setUserId] = useState('aarav')
  const [experience, setExperience] = useState<ExperienceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const requestSequence = useRef(0)
  const selectedUser = useRef(userId)
  const { width } = useWindowDimensions()
  const contentWidth = Math.min(width, 480)
  const pageStyle = useMemo(() => [styles.page, { width: contentWidth }], [contentWidth])

  const load = useCallback(async (selectedUserId: string, signal?: AbortSignal) => {
    const request = ++requestSequence.current
    setLoading(true)
    try {
      const next = await fetchExperience(selectedUserId, signal)
      if (request === requestSequence.current && selectedUserId === selectedUser.current) {
        setExperience(next)
        setError(null)
      }
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError' && request === requestSequence.current && selectedUserId === selectedUser.current) setError((loadError as Error).message)
    } finally {
      if (request === requestSequence.current && selectedUserId === selectedUser.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(userId, controller.signal)
    return () => controller.abort()
  }, [load, userId])

  const handleCommand = useCallback(async (item: RenderItem) => {
    const action = item.actions.find((candidate) => candidate.type === 'command' && candidate.command)
    if (!action?.command || busyIds.has(item.instanceId)) return
    const commandUser = userId
    setBusyIds((current) => new Set(current).add(item.instanceId))
    try {
      const result = await sendCommand(commandUser, item, action.command)
      if (selectedUser.current !== commandUser) return
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExperience((current) => current ? {
        ...current,
        slots: current.slots.map((slot) => ({ ...slot, items: slot.items.filter((candidate) => !result.removeInstanceIds.includes(candidate.instanceId)) })),
      } : current)
      if (result.refetchDecision) await load(commandUser)
    } catch (commandError) {
      if (selectedUser.current === commandUser) {
        setError((commandError as Error).message)
        await load(commandUser)
      }
    } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(item.instanceId); return next })
    }
  }, [busyIds, load, userId])

  const customerName = experience?.page.customer.name ?? personas.find((persona) => persona.id === userId)?.label ?? 'Customer'
  const pageNavigation = experience?.page.navigation.length
    ? experience.page.navigation
    : [{ id: 'home', label: 'Home' }, { id: 'payments', label: 'Payments' }, { id: 'insights', label: 'Insights' }, { id: 'profile', label: 'Profile' }]

  const selectPersona = (nextUser: string) => {
    if (nextUser === selectedUser.current) return
    selectedUser.current = nextUser
    requestSequence.current += 1
    setExperience(null)
    setBusyIds(new Set())
    setError(null)
    setUserId(nextUser)
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={pageStyle}>
        <View style={styles.topBar}>
          <View><Text style={styles.greeting}>GOOD MORNING</Text><Text style={styles.name}>Hello, {customerName}</Text></View>
          <TouchableOpacity style={styles.notification} accessibilityLabel="Notifications"><Icon name="bell" color={theme.text} size={21} /><View style={styles.notificationDot} /></TouchableOpacity>
        </View>
        <View style={styles.personaBar}>
          {personas.map((persona) => (
            <TouchableOpacity key={persona.id} onPress={() => selectPersona(persona.id)} style={[styles.personaChip, userId === persona.id && styles.personaChipActive]}>
              <Text style={[styles.personaText, userId === persona.id && styles.personaTextActive]}>{persona.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <TouchableOpacity onPress={() => void load(userId)} style={styles.errorBanner}><Text style={styles.errorText}>{error} Tap to retry.</Text></TouchableOpacity> : null}
        {!experience && loading ? <View style={styles.loadingState}><ActivityIndicator color={theme.primary} /><Text style={styles.loadingText}>Building your experience…</Text></View> : null}
        {experience ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.decisionRow}><View style={styles.liveDot} /><Text style={styles.decisionText}>LIVE DECISION · {experience.configVersion}</Text>{loading ? <ActivityIndicator size="small" color={theme.primary} /> : null}</View>
            {experience.slots.map((slot) => <Slot key={slot.id} slot={slot} busyIds={busyIds} onCommand={handleCommand} />)}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        ) : null}
        <View style={styles.navigation}>
          {pageNavigation.map((item, index) => (
            <TouchableOpacity key={item.id} style={styles.navItem}><Icon name={navigationIcons[item.id] ?? 'home'} color={index === 0 ? theme.primary : '#8A948F'} size={21} /><Text style={[styles.navLabel, index === 0 && styles.navLabelActive]}>{item.label}</Text>{index === 0 ? <View style={styles.navIndicator} /> : null}</TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  return <SafeAreaProvider><HomeScreen /></SafeAreaProvider>
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: theme.background },
  page: { flex: 1, overflow: 'hidden', backgroundColor: theme.background, ...Platform.select({ web: { boxShadow: '0 0 40px rgba(20, 45, 36, 0.12)' } }) },
  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  name: { color: theme.text, fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.6 },
  notification: { width: 43, height: 43, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#163B31', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#DD6545', borderWidth: 1.5, borderColor: '#FFFFFF' },
  personaBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, paddingBottom: 12 },
  personaChip: { flex: 1, minHeight: 30, borderRadius: 10, backgroundColor: '#E9EDE8', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  personaChipActive: { backgroundColor: theme.primary },
  personaText: { color: theme.muted, fontSize: 9, fontWeight: '700' },
  personaTextActive: { color: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  decisionRow: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.positive },
  decisionText: { color: theme.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: theme.muted, fontSize: 12 },
  errorBanner: { marginHorizontal: 20, marginBottom: 8, borderRadius: 10, backgroundColor: '#FBE7E1', padding: 9 },
  errorText: { color: '#9B452F', fontSize: 10, textAlign: 'center', fontWeight: '600' },
  verticalSlot: { gap: 14 },
  summary: { minHeight: 218, borderRadius: 24, padding: 21, overflow: 'hidden', shadowColor: '#12382F', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  summaryGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.06)', right: -75, top: -90 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { color: '#C7DDD6', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  premierBadge: { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E8C575' },
  premierText: { color: '#F8F3DC', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  balance: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -1.1, marginTop: 14 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  change: { color: '#C5F1D7', fontSize: 12, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.13)', marginVertical: 18 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountLabel: { color: '#D1E1DC', fontSize: 12, marginBottom: 3 },
  accountNumber: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
  circleButton: { width: 35, height: 35, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 22 },
  action: { alignItems: 'center', width: '24%' },
  actionIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#243E35', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  actionLabel: { color: theme.text, fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13, marginTop: 3 },
  sectionTitle: { color: theme.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.35 },
  sectionAction: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  offerList: { gap: 12, paddingRight: 20, marginBottom: 26 },
  offerCard: { width: 276, minHeight: 218, borderRadius: 21, padding: 18 },
  offerCardWide: { width: '100%', minHeight: 185, marginBottom: 0 },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerTag: { color: theme.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  offerIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
  offerTitle: { color: theme.text, fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.3, marginTop: 11, maxWidth: 230 },
  offerDescription: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 250 },
  offerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  offerCta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  offerCtaText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  notNowButton: { minWidth: 55, minHeight: 24, alignItems: 'flex-end', justifyContent: 'center' },
  notNowText: { color: theme.muted, fontSize: 10, fontWeight: '600' },
  healthCard: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 21, padding: 18 },
  healthTop: { flexDirection: 'row', alignItems: 'center' },
  scoreRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 7, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  score: { color: theme.primary, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  scoreUnit: { color: theme.muted, fontSize: 8, marginTop: 8 },
  healthCopy: { marginLeft: 14, flex: 1 },
  healthLabel: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  healthCaption: { color: theme.positive, fontSize: 11, fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: theme.border, marginVertical: 17 },
  metrics: { flexDirection: 'row', gap: 18 },
  metric: { flex: 1 },
  metricTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricLabel: { color: theme.muted, fontSize: 10 },
  metricValue: { color: theme.text, fontSize: 10, fontWeight: '700' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.border },
  progress: { height: '100%', borderRadius: 3, backgroundColor: theme.primary },
  taskCard: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 21, padding: 18 },
  taskHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { color: theme.text, fontSize: 17, fontWeight: '700' },
  taskProgress: { color: theme.muted, fontSize: 11, marginTop: 4 },
  shieldCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  taskBorder: { borderTopColor: theme.border, borderTopWidth: 1 },
  taskStatus: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
  taskDone: { backgroundColor: theme.accent },
  taskCopy: { marginLeft: 11, flex: 1 },
  taskItemTitle: { color: theme.text, fontSize: 13, fontWeight: '600' },
  taskDetail: { color: theme.muted, fontSize: 10, marginTop: 3 },
  bottomSpacer: { height: 14 },
  navigation: { height: 70, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', paddingHorizontal: 10, paddingBottom: Platform.OS === 'android' ? 6 : 0 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { color: '#8A948F', fontSize: 9, fontWeight: '600' },
  navLabelActive: { color: theme.primary },
  navIndicator: { position: 'absolute', top: 0, width: 20, height: 3, backgroundColor: theme.primary, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
})
