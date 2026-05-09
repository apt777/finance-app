export type TransitCardInferenceSetting = {
  enabled: boolean
  categoryKey: string | null
}

export const DEFAULT_TRANSIT_CARD_INFERENCE_SETTING: TransitCardInferenceSetting = {
  enabled: false,
  categoryKey: 'transportation',
}

export function getTransitCardInferenceSettingKey(accountId: string) {
  return `transit_card_inference:${accountId}`
}

export function parseTransitCardInferenceSetting(value?: string | null): TransitCardInferenceSetting {
  if (!value) {
    return DEFAULT_TRANSIT_CARD_INFERENCE_SETTING
  }

  try {
    const parsed = JSON.parse(value)
    return {
      enabled: Boolean(parsed?.enabled),
      categoryKey: typeof parsed?.categoryKey === 'string' && parsed.categoryKey.trim().length > 0
        ? parsed.categoryKey
        : DEFAULT_TRANSIT_CARD_INFERENCE_SETTING.categoryKey,
    }
  } catch {
    return DEFAULT_TRANSIT_CARD_INFERENCE_SETTING
  }
}
