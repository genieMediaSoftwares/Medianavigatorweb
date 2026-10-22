/**
 * The smallest denominator an engagement rate may be calculated from.
 *
 * Engagement rate = interactions ÷ reach (or views) × 100. On a very small denominator the rate is
 * not a measure of performance, it is an artefact: nine likes on four accounts reached is 225%,
 * and a single extra like moves the number by 25 points. Such a rate is also not comparable with
 * a rate measured on thousands of accounts, so it would distort rankings and baselines.
 *
 * Below this threshold the rate is reported as unavailable instead of being shown or compared.
 */
export const MIN_ENGAGEMENT_DENOMINATOR = 10;

/** True when a denominator is large enough for the rate to mean anything. */
export function hasMeaningfulDenominator(denominator: number | null | undefined): boolean {
  return typeof denominator === 'number' && Number.isFinite(denominator) && denominator >= MIN_ENGAGEMENT_DENOMINATOR;
}
