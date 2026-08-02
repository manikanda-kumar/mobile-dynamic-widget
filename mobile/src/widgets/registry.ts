import type { WidgetType } from '../types/manifest';
import { WIDGET_TYPES } from '../types/manifest';
import type { WidgetComponent } from './types';
import { CreditCardOfferWidget, FdWidget, LoanOfferWidget, PledgeWidget } from './offers';
import {
  EmailVerificationWidget,
  KycWidget,
  MobileVerificationWidget,
  VkycWidget,
} from './verification';
import { AnniversaryWidget, BirthdayWidget } from './celebration';
import { CashbackWidget, RewardsWidget } from './value';
import { InvestmentsWidget, PaymentsWidget } from './money';

/**
 * The whole client-side surface area of the platform: manifest `type` -> component.
 * Adding a widget to the backend without adding it here renders nothing (by design).
 */
export const widgetRegistry: Record<string, WidgetComponent> = {
  loan_offer: LoanOfferWidget,
  credit_card_offer: CreditCardOfferWidget,
  fd: FdWidget,
  pledge: PledgeWidget,
  kyc: KycWidget,
  vkyc: VkycWidget,
  email_verification: EmailVerificationWidget,
  mobile_verification: MobileVerificationWidget,
  birthday: BirthdayWidget,
  anniversary: AnniversaryWidget,
  rewards: RewardsWidget,
  cashback: CashbackWidget,
  payments: PaymentsWidget,
  investments: InvestmentsWidget,
};

export function resolveWidget(type: WidgetType): WidgetComponent | null {
  return widgetRegistry[type] ?? null;
}

/** Dev guard: every type named in the contract must have a component. */
export const MISSING_WIDGET_TYPES = WIDGET_TYPES.filter((t) => !widgetRegistry[t]);
