/**
 * Super-G visual load estimator; not a replacement for the 120 Hz ski forces.
 * Converts the real speed, turn/edge state and physics normal pressure into a
 * stable, bounded load transfer for the 25-bone animation and snow spray.
 *
 * World Cup measurements use GNSS and pressure sensors; these coefficients
 * are honest artistic approximations, not measured force plates.
 */
export interface RaceLoadInput {
  speedMps: number;
  edge: number;                // signed current edge, [-1.1, 1.1]
  engagement: number;          // normalized grip-carve strength
  pressure: number;            // physical normal force / resting load
  skid: number;                // 0 gripping, 1 fully sliding
  physicsLoad?: number;        // signed L/R distribution, existing sim frame
  lateralAccelerationMps2?: number; // measured 120Hz snow force; older frames omit
}

export interface RaceLoadTransfer {
  equivalentRadiusM: number;
  lateralG: number;
  equilibriumLeanDeg: number;
  outsideLoad: number;
  insideLoad: number;
  /** Small extra COM shift into the new turn; not a physical translation. */
  pelvisShiftM: number;
  /** Recovery / slip reduces the body commitment independently of ski roll. */
  gripCommitment: number;
}

const clamp = (value: number, a: number, b: number): number =>
  Math.min(b, Math.max(a, Number.isFinite(value) ? value : a));
const sat = (value: number): number => clamp(value, 0, 1);

export function estimateRaceLoad(input: RaceLoadInput): RaceLoadTransfer {
  const speed = clamp(input.speedMps, 0, 65);
  const edge = clamp(input.edge, -1.1, 1.1);
  const strength = sat(input.engagement);
  const skid = sat(input.skid);
  const pressure = clamp(input.pressure, 0.3, 1.8);
  const edgeAmount = sat(Math.abs(edge) / 1.1);
  // Effective course/turn radius, never equal to a ski's sidecut radius.
  // At high speed the line opens; at an engaged edge it tightens.
  const measuredForce = Number.isFinite(input.lateralAccelerationMps2)
    ? Math.abs(input.lateralAccelerationMps2!) : null;
  const equivalentRadiusM = measuredForce === null
    ? clamp(58 + 0.32 * speed - 32 * strength * (1 - skid * 0.62), 25, 95)
    : Math.min(1e6, speed * speed / Math.max(0.001, measuredForce));
  // New gameplay frames use actual lateral snow contact acceleration.
  // Legacy replay files keep their previous visual estimate unchanged.
  const lateralG = measuredForce === null
    ? clamp(((speed * speed) / (9.81 * equivalentRadiusM)) *
        edgeAmount * (1 - skid * .74) * Math.min(1.15, pressure), 0, 2.8)
    : clamp(measuredForce / 9.81, 0, 2.8);
  const equilibriumLeanDeg = Math.atan2(lateralG, Math.max(0.3, pressure)) * 180 / Math.PI;
  const gripCommitment = strength * (1 - .55 * skid);
  const modelOutside = .5 + gripCommitment * (.24 + .11 * sat(lateralG / 1.8));
  // The actual fixed-step model already knows where the outside load is.
  const measured = clamp(input.physicsLoad ?? .5, 0, 1);
  const simulatedOutside = edge >= 0 ? measured : 1 - measured;
  const outsideLoad = clamp(
    .58 * modelOutside + .42 * Math.max(.5, simulatedOutside),
    .5, .93);
  const insideLoad = 1 - outsideLoad;
  return {
    equivalentRadiusM,
    lateralG,
    equilibriumLeanDeg,
    outsideLoad,
    insideLoad,
    pelvisShiftM: (edge >= 0 ? 1 : -1) *
      .055 * gripCommitment * sat(lateralG / 1.9),
    gripCommitment,
  };
}
