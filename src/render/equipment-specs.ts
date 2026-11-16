/** Real-world-scale racing equipment in metres.
 * The old pole basket had a 3 m scale and obscured the skier in close-ups.
 */
export const PRO_POLE = Object.freeze({
  shaftLength: 1.02,
  shaftDiameter: 0.018,
  basketDiameter: 0.13,
  basketThickness: 0.013,
  gripLength: 0.145,
  gripDiameter: 0.031,
  ferruleLength: 0.055,
} as const);

export const PRO_GEAR = Object.freeze({
  gloveGuardWidth: 0.12,
  gloveGuardHeight: 0.09,
  skiBindingWidth: 0.085,
} as const);
