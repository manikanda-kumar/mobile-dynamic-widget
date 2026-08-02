/**
 * Bundled offline fixture.
 *
 * Purpose: the renderer is developed and demoed against the real Go backend, but
 * it must never be a blank screen when the API is unreachable. Everything here is
 * shaped exactly like DEMO_SPEC.md so the same code path renders both.
 *
 * It also carries the deliberate degradation cases: an unknown widget `type` and a
 * section with an unknown `layout` (guest manifest) to prove graceful fallback.
 */

import type {
  DemoUser,
  Manifest,
  ManifestTheme,
  Section,
  Widget,
  WidgetData,
  WidgetSize,
} from '../types/manifest';

/* ----------------------------------------------------------------- themes -- */

const bankingDark: ManifestTheme = {
  id: 'banking_dark',
  name: 'Banking Dark',
  colors: {
    background: '#0B1120',
    surface: '#151E2E',
    surfaceAlt: '#1E2A3E',
    primary: '#4F8DF7',
    onPrimary: '#FFFFFF',
    text: '#F2F5FA',
    textMuted: '#94A3B8',
    border: '#243449',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
  radius: 16,
  spacing: 12,
};

const bankingLight: ManifestTheme = {
  id: 'banking_light',
  name: 'Banking Light',
  colors: {
    background: '#F4F6FB',
    surface: '#FCFDFF',
    surfaceAlt: '#EDF1F9',
    primary: '#2456D8',
    onPrimary: '#FFFFFF',
    text: '#111A2B',
    textMuted: '#5B6B85',
    border: '#DDE4F0',
    success: '#0E9F6E',
    warning: '#B45309',
    danger: '#DC2626',
  },
  radius: 14,
  spacing: 12,
};

/* ------------------------------------------------------------------ users -- */

export const FIXTURE_USERS: DemoUser[] = [
  { id: 'u_priya', name: 'Priya', segment: 'premium', description: 'KYC done, investments heavy' },
  { id: 'u_arjun', name: 'Arjun', segment: 'new', description: 'Onboarding, KYC pending' },
  { id: 'u_meera', name: 'Meera', segment: 'loyal', description: 'Birthday today' },
  { id: 'u_rahul', name: 'Rahul', segment: 'thin_file', description: 'High risk, secured only' },
  { id: 'anon', name: 'Guest', segment: 'anonymous', description: 'Generic, no personalisation' },
];

/* --------------------------------------------------------------- catalog --- */

type Entry = {
  id: string;
  type: string;
  priority: number;
  size?: WidgetSize;
  data: WidgetData;
  experimentId?: string | null;
  debug?: { basePriority: number; mlBoost: number; appliedRules: string[] };
};

const catalog: Record<string, Entry> = {
  loan: {
    id: 'w_loan_offer',
    type: 'loan_offer',
    priority: 92,
    size: '3x1',
    experimentId: 'exp_offer_position',
    data: {
      title: 'Personal loan, pre-approved',
      subtitle: 'Money in your account in about 2 hours',
      badge: 'Pre-approved',
      icon: 'loan',
      amount: '₹5,00,000',
      stats: [
        { label: 'Rate', value: '10.5% p.a.' },
        { label: 'Tenure', value: 'up to 60 mo' },
        { label: 'EMI from', value: '₹10,742' },
      ],
      cta: { label: 'Check offer', action: 'navigate', target: 'loan/offer/OFF123' },
      footnote: 'No documents. Offer held until 31 Aug.',
    },
    debug: { basePriority: 60, mlBoost: 12, appliedRules: ['r_boost_loan_premium', 'exp_offer_position:B'] },
  },
  card: {
    id: 'w_credit_card_offer',
    type: 'credit_card_offer',
    priority: 78,
    size: '2x1',
    experimentId: 'exp_offer_position',
    data: {
      title: 'Magnus Reserve',
      subtitle: '5x points on travel, unlimited lounge access',
      badge: 'Lifetime free',
      icon: 'card',
      stats: [
        { label: 'Joining fee', value: '₹0' },
        { label: 'Reward rate', value: 'up to 5x' },
      ],
      cta: { label: 'Apply', action: 'navigate', target: 'cards/apply/MAGNUS' },
    },
    debug: { basePriority: 65, mlBoost: 13, appliedRules: ['r_show_card_premium'] },
  },
  fd: {
    id: 'w_fd',
    type: 'fd',
    priority: 71,
    size: '2x1',
    data: {
      title: 'Fixed Deposit',
      subtitle: 'Senior citizens earn +0.50%',
      amount: '7.35%',
      badge: 'Book in 60s',
      icon: 'fd',
      items: [
        { label: '6 months', value: '6.60%' },
        { label: '12 months', value: '7.10%' },
        { label: '18 months', value: '7.35%', meta: 'Best' },
      ],
      cta: { label: 'Book FD', action: 'navigate', target: 'deposits/fd/new' },
    },
    debug: { basePriority: 55, mlBoost: 16, appliedRules: ['r_fd_safe_segment'] },
  },
  pledge: {
    id: 'w_pledge',
    type: 'pledge',
    priority: 68,
    size: '2x1',
    data: {
      title: 'Borrow against your funds',
      subtitle: 'Stay invested, get cash in 4 hours',
      icon: 'pledge',
      amount: '₹2,40,000',
      progress: 0.62,
      progressLabel: '62% of ₹3,85,000 holdings eligible',
      stats: [
        { label: 'Interest', value: '10.9% p.a.' },
        { label: 'Ready in', value: '4 hours' },
      ],
      cta: { label: 'See limit', action: 'navigate', target: 'pledge/limit' },
    },
    debug: { basePriority: 50, mlBoost: 18, appliedRules: ['r_pledge_instead_of_loan'] },
  },
  kyc: {
    id: 'w_kyc',
    type: 'kyc',
    priority: 98,
    size: '3x1',
    data: {
      title: 'Finish your KYC',
      subtitle: 'Unlocks transfers above ₹10,000',
      badge: 'Action needed',
      icon: 'kyc',
      progress: 0.5,
      progressLabel: '2 of 4 steps done',
      items: [
        { label: 'PAN verified', value: 'Done' },
        { label: 'Aadhaar linked', value: 'Done' },
        { label: 'Address proof', value: 'Pending' },
        { label: 'Selfie check', value: 'Pending' },
      ],
      cta: { label: 'Continue', action: 'navigate', target: 'kyc/resume' },
    },
    debug: { basePriority: 70, mlBoost: 8, appliedRules: ['r_pin_kyc_when_pending'] },
  },
  vkyc: {
    id: 'w_vkyc',
    type: 'vkyc',
    priority: 90,
    size: '2x1',
    data: {
      title: 'Video KYC in 3 minutes',
      subtitle: 'One short call with an agent, no branch visit',
      badge: 'Slots today',
      icon: 'vkyc',
      stats: [
        { label: 'Next slot', value: '11:20 AM' },
        { label: 'Duration', value: '~3 min' },
      ],
      cta: { label: 'Start video KYC', action: 'navigate', target: 'kyc/video' },
    },
    debug: { basePriority: 66, mlBoost: 6, appliedRules: ['r_pin_kyc_when_pending'] },
  },
  email: {
    id: 'w_email_verification',
    type: 'email_verification',
    priority: 84,
    size: '1x1',
    data: {
      title: 'Confirm your email',
      subtitle: 'arjun@example.com',
      badge: 'Unverified',
      icon: 'email',
      cta: { label: 'Resend link', action: 'navigate', target: 'verify/email' },
    },
    debug: { basePriority: 60, mlBoost: 4, appliedRules: ['r_show_email_verify'] },
  },
  mobile: {
    id: 'w_mobile_verification',
    type: 'mobile_verification',
    priority: 82,
    size: '1x1',
    data: {
      title: 'Confirm your number',
      subtitle: '+91 98••• ••210',
      icon: 'mobile',
      cta: { label: 'Enter code', action: 'navigate', target: 'verify/mobile' },
    },
    debug: { basePriority: 58, mlBoost: 4, appliedRules: ['r_show_mobile_verify'] },
  },
  birthday: {
    id: 'w_birthday',
    type: 'birthday',
    priority: 99,
    size: '3x1',
    data: {
      title: 'Happy birthday, Meera',
      subtitle: 'A small thank-you from everyone here',
      badge: 'Today',
      icon: 'gift',
      amount: '₹500',
      cta: { label: 'Claim gift', action: 'navigate', target: 'rewards/birthday' },
      footnote: 'Lands in your wallet instantly, valid 30 days.',
    },
    debug: { basePriority: 40, mlBoost: 0, appliedRules: ['r_pin_birthday_today'] },
  },
  anniversary: {
    id: 'w_anniversary',
    type: 'anniversary',
    priority: 62,
    size: '1x1',
    data: {
      title: '3 years with us',
      subtitle: 'Since 14 Aug 2023',
      amount: '3',
      badge: 'Milestone',
      icon: 'anniversary',
      stats: [
        { label: 'Payments', value: '482' },
        { label: 'Earned', value: '₹14,200' },
      ],
      cta: { label: 'See your year', action: 'navigate', target: 'profile/anniversary' },
    },
    debug: { basePriority: 45, mlBoost: 17, appliedRules: [] },
  },
  rewards: {
    id: 'w_rewards',
    type: 'rewards',
    priority: 74,
    size: '1x1',
    data: {
      title: 'Reward points',
      amount: '12,480',
      subtitle: '1,520 points to Platinum',
      icon: 'rewards',
      progress: 0.78,
      delta: '+340 this week',
      deltaDirection: 'up',
      cta: { label: 'Redeem', action: 'navigate', target: 'rewards' },
    },
    debug: { basePriority: 58, mlBoost: 16, appliedRules: ['r_rewards_engaged'] },
  },
  cashback: {
    id: 'w_cashback',
    type: 'cashback',
    priority: 70,
    size: '1x1',
    data: {
      title: 'Cashback this month',
      amount: '₹1,240',
      subtitle: 'Across 18 transactions',
      icon: 'cashback',
      delta: '+18%',
      deltaDirection: 'up',
      series: [4, 6, 5, 9, 8, 12, 11, 15],
      cta: { label: 'Breakdown', action: 'navigate', target: 'rewards/cashback' },
    },
    debug: { basePriority: 52, mlBoost: 18, appliedRules: [] },
  },
  payments: {
    id: 'w_payments',
    type: 'payments',
    priority: 80,
    size: '2x2',
    data: {
      title: 'Bills due this week',
      subtitle: '2 of 3 not on autopay',
      icon: 'payments',
      amount: '₹40,989',
      items: [
        { label: 'Electricity · BESCOM', value: '₹2,340', meta: 'Due Tue' },
        { label: 'Rent · HDFC', value: '₹38,000', meta: 'Due Fri' },
        { label: 'Netflix', value: '₹649', meta: 'Autopay' },
      ],
      cta: { label: 'Pay now', action: 'navigate', target: 'payments/due' },
    },
    debug: { basePriority: 64, mlBoost: 16, appliedRules: ['r_payments_due_soon'] },
  },
  investments: {
    id: 'w_investments',
    type: 'investments',
    priority: 88,
    size: '2x2',
    data: {
      title: 'Portfolio',
      amount: '₹8,42,300',
      subtitle: 'Today +₹19,740',
      icon: 'investments',
      delta: '+2.4%',
      deltaDirection: 'up',
      series: [42, 44, 41, 47, 52, 49, 58, 61, 57, 66, 71, 69, 78],
      stats: [
        { label: 'Equity', value: '62%' },
        { label: 'Debt', value: '28%' },
        { label: 'Gold', value: '10%' },
      ],
      cta: { label: 'View portfolio', action: 'navigate', target: 'invest/portfolio' },
    },
    debug: { basePriority: 68, mlBoost: 20, appliedRules: ['r_boost_investments_premium'] },
  },
  /** Deliberate unknown type — must render nothing and warn. */
  unknown: {
    id: 'w_experimental_ticker',
    type: 'crypto_ticker',
    priority: 30,
    size: '1x1',
    data: { title: 'Shipped by the backend, unknown to this app build' },
  },
};

type Ref = { key: keyof typeof catalog; priority?: number; size?: WidgetSize; data?: Partial<WidgetData> };

function build(ref: Ref, debug: boolean): Widget {
  const base = catalog[ref.key];
  const priority = ref.priority ?? base.priority;
  const w: Widget = {
    id: base.id,
    type: base.type,
    priority,
    size: ref.size ?? base.size ?? '2x1',
    data: { ...base.data, ...(ref.data ?? {}) },
    analytics: {
      impressionKey: `${base.type}::${base.id}`,
      experimentId: base.experimentId ?? null,
    },
  };
  if (debug) {
    const d = base.debug ?? { basePriority: priority, mlBoost: 0, appliedRules: [] };
    w.debug = {
      basePriority: d.basePriority,
      mlBoost: d.mlBoost,
      appliedRules: d.appliedRules,
      finalPriority: priority,
    };
  }
  return w;
}

type SectionSpec = {
  id: string;
  layout: string;
  title?: string | null;
  columns?: number;
  widgets: Ref[];
};

type UserSpec = {
  theme: ManifestTheme;
  layout: string;
  experiments: { id: string; variant: string; bucket: number }[];
  sections: SectionSpec[];
};

const specs: Record<string, UserSpec> = {
  u_priya: {
    theme: bankingDark,
    layout: 'home_v2',
    experiments: [{ id: 'exp_offer_position', variant: 'B', bucket: 47 }],
    sections: [
      { id: 'sec_hero', layout: 'banner', title: null, widgets: [{ key: 'loan', priority: 132, size: '3x1' }] },
      {
        id: 'sec_offers',
        layout: 'carousel',
        title: 'For you',
        widgets: [{ key: 'card' }, { key: 'fd' }, { key: 'pledge' }],
      },
      { id: 'sec_money', layout: 'vertical', title: 'Your money', widgets: [{ key: 'investments' }, { key: 'payments' }] },
      {
        id: 'sec_perks',
        layout: 'grid',
        title: 'Perks',
        columns: 2,
        widgets: [{ key: 'rewards' }, { key: 'cashback' }, { key: 'anniversary' }],
      },
    ],
  },
  u_arjun: {
    theme: bankingLight,
    layout: 'home_onboarding',
    experiments: [{ id: 'exp_offer_position', variant: 'A', bucket: 12 }],
    sections: [
      { id: 'sec_hero', layout: 'banner', title: null, widgets: [{ key: 'kyc' }] },
      { id: 'sec_onboarding', layout: 'vertical', title: 'Finish setting up', widgets: [{ key: 'vkyc' }] },
      {
        id: 'sec_verify',
        layout: 'grid',
        title: 'Quick checks',
        columns: 2,
        widgets: [{ key: 'email' }, { key: 'mobile' }],
      },
      {
        id: 'sec_explore',
        layout: 'horizontal',
        title: 'Explore',
        widgets: [{ key: 'fd' }, { key: 'card' }, { key: 'rewards', data: { subtitle: 'Start earning on day one' } }],
      },
    ],
  },
  u_meera: {
    theme: bankingLight,
    layout: 'home_v2',
    experiments: [{ id: 'exp_offer_position', variant: 'B', bucket: 71 }],
    sections: [
      { id: 'sec_hero', layout: 'banner', title: null, widgets: [{ key: 'birthday' }] },
      {
        id: 'sec_offers',
        layout: 'carousel',
        title: 'Because it is your day',
        widgets: [{ key: 'cashback', priority: 86 }, { key: 'loan', priority: 84, size: '2x1' }, { key: 'card' }],
      },
      { id: 'sec_money', layout: 'vertical', title: 'Your money', widgets: [{ key: 'payments' }] },
      {
        id: 'sec_perks',
        layout: 'grid',
        title: 'Perks',
        columns: 2,
        widgets: [{ key: 'rewards' }, { key: 'anniversary' }],
      },
    ],
  },
  u_rahul: {
    theme: bankingDark,
    layout: 'home_secured',
    experiments: [{ id: 'exp_offer_position', variant: 'A', bucket: 8 }],
    sections: [
      { id: 'sec_hero', layout: 'banner', title: null, widgets: [{ key: 'fd', priority: 104, size: '3x1' }] },
      { id: 'sec_secured', layout: 'vertical', title: 'Secured options', widgets: [{ key: 'pledge' }] },
      { id: 'sec_activity', layout: 'horizontal', title: 'Activity', widgets: [{ key: 'payments', size: '2x1' }, { key: 'investments', size: '2x1' }] },
      { id: 'sec_perks', layout: 'grid', title: 'Perks', columns: 2, widgets: [{ key: 'cashback' }, { key: 'rewards' }] },
    ],
  },
  anon: {
    theme: bankingLight,
    layout: 'home_guest',
    experiments: [{ id: 'exp_offer_position', variant: 'A', bucket: 3 }],
    sections: [
      {
        id: 'sec_hero',
        layout: 'banner',
        title: null,
        widgets: [
          {
            key: 'kyc',
            priority: 100,
            data: {
              title: 'Open your account',
              subtitle: 'Four steps, about six minutes',
              badge: 'Get started',
              progress: 0,
              progressLabel: '0 of 4 steps done',
              cta: { label: 'Start', action: 'navigate', target: 'onboarding/start' },
            },
          },
        ],
      },
      {
        id: 'sec_explore',
        layout: 'carousel',
        title: 'What you get',
        widgets: [
          { key: 'fd', data: { badge: null, subtitle: 'Guaranteed returns, any tenure' } },
          { key: 'card', data: { badge: 'No income proof' } },
          { key: 'investments', size: '2x1', data: { title: 'Invest from ₹100', amount: '₹100', subtitle: 'Mutual funds, gold, bonds', delta: null, series: null } },
          // Unknown type inside a known section: renders nothing, section stays intact.
          { key: 'unknown' },
        ],
      },
      { id: 'sec_perks', layout: 'grid', title: 'Perks', columns: 2, widgets: [{ key: 'rewards', data: { progress: 0, delta: null, subtitle: 'Earn from your first payment' } }, { key: 'cashback', data: { amount: 'Up to 5%', subtitle: 'On everyday spends', delta: null, series: null } }] },
      // Unknown layout: whole section is skipped with a warning.
      { id: 'sec_labs', layout: 'masonry', title: 'Labs', widgets: [{ key: 'payments' }] },
    ],
  },
};

export function fixtureManifest(userId: string, debug = false): Manifest {
  const spec = specs[userId] ?? specs.anon;
  const sections: Section[] = spec.sections.map((s) => ({
    id: s.id,
    layout: s.layout,
    title: s.title ?? null,
    columns: s.columns ?? null,
    // Server-side ordering: the fixture emits widgets already sorted desc by priority.
    widgets: s.widgets
      .map((r) => build(r, debug))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)),
  }));

  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    userId: specs[userId] ? userId : 'anon',
    layout: spec.layout,
    theme: spec.theme,
    experiments: spec.experiments,
    sections,
  };
}

export const FALLBACK_THEME = bankingDark;
