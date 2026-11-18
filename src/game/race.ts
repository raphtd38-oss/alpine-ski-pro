import type {
  Course,
  Discipline,
  Frame,
  RacePhase,
  Result,
  SkierState,
} from "./types";
import { angleDiff } from "./types";
import { startGateAngle } from "./start-gate";
import { finishReachAmount, lowHandLead, finishBeamFraction } from "./finish-timing";
export class Race {
  phase: RacePhase = "ready";
  time = 0;
  /** GO begins movement; the race timer starts only at the wand impulse. */
  launchTime = 0;
  startGateOpened = true;
  startGateImpulseTime: number | null = null;
  startGateDegrees = 0;
  private startGateStepRemainder = 1;
  countdown = 3;
  nextGate = 0;
  missed = 0;
  splits: number[] = [];
  gateStatus: ("pending" | "passed" | "missed")[];
  frames: Frame[] = [];
  result: Result | null = null;
  recordTimer = 0;
  /** First photoelectric beam interruption, before the skier has fully passed. */
  finishBeamTime: number | null = null;
  finishBeamTriggeredBy: "hand" | "body" | null = null;
  constructor(
    public course: Course,
    public equipment: Discipline,
    public training = false,
  ) {
    this.gateStatus = course.gates.map(() => "pending");
  }
  start() {
    this.phase = "countdown";
    this.startGateOpened = this.course.id !== "SG";
    this.launchTime = 0;
    this.startGateImpulseTime = null;
    this.startGateDegrees = 0;
    this.startGateStepRemainder = 1;
  }
  /** Called once by the fixed-step contact detector (never on GO). */
  openStartGate(fractionIntoTick: number, dt: number) {
    if (this.course.id !== "SG" || this.startGateOpened) return;
    this.startGateOpened = true;
    this.startGateImpulseTime = this.launchTime - dt * (1 - fractionIntoTick);
    this.startGateStepRemainder = Math.max(0, Math.min(1, 1 - fractionIntoTick));
  }
  /**
   * Banner collisions deeper than 45% are missed gates. Do not count the
   * same collision again when the fallen athlete slides past the gate plane.
   */
  registerBannerCrash(gateId: number): void {
    const at = this.course.gates.findIndex((gate) => gate.id === gateId);
    if (this.phase !== "racing" || at < 0 || this.gateStatus[at] !== "pending")
      return;
    this.gateStatus[at] = "missed";
    this.missed++;
    if (at === this.nextGate) this.nextGate++;
  }

  tickCountdown(dt: number) {
    this.countdown -= dt;
    if (this.countdown <= 0) {
      this.phase = "racing";
      this.countdown = 0;
    }
  }
  update(previous: SkierState, s: SkierState, dt: number, tuck: boolean) {
    if (this.phase !== "racing") return;
    if (!this.startGateOpened) return;
    const timedDt = dt * this.startGateStepRemainder;
    this.startGateStepRemainder = 1;
    const startTime = this.time;
    this.time += timedDt;
    // SG reaches forward and DOWN into the low photocell beam near the line.
    // The timing signal can precede the ski-boot reference by a small
    // geometric distance, but results are only validated after full crossing.
    if (this.finishBeamTime === null) {
      const previousReach = finishReachAmount(this.course.id,
        previous.z, this.course.length, Math.hypot(previous.vx, previous.vz),
        previous.fallen);
      const currentReach = finishReachAmount(this.course.id,
        s.z, this.course.length, Math.hypot(s.vx, s.vz), s.fallen);
      const a = lowHandLead(previousReach);
      const b = lowHandLead(currentReach);
      const f = finishBeamFraction(previous.z, s.z, a, b, this.course.length);
      if (f !== null) {
        this.finishBeamTime = startTime + timedDt * f;
        this.finishBeamTriggeredBy = b > 0.05 ? "hand" : "body";
      }
    }
    while (
      this.nextGate < this.course.gates.length &&
      s.z >= this.course.gates[this.nextGate].z
    ) {
      const g = this.course.gates[this.nextGate];
      // The gate is an OPEN corridor between its two inner poles.
      // Evaluate the skier's crossing at the gate plane, not at the end
      // of the physics frame. Airborne skis still pass between the flags:
      // the previous height cutoff incorrectly disqualified clean jumps.
      const dz = s.z - previous.z;
      const f = Math.max(0, Math.min(1,
        dz > 1e-9 ? (g.z - previous.z) / dz : 0));
      const crossingX = previous.x + (s.x - previous.x) * f;
      // A ski edge can brush the flexible inside pole without the entire
      // skier centre being strictly inside the gate: allow the physical ski
      // half-width rather than imposing an arbitrary extra inward penalty.
      // This is a forgiving gameplay crossing, not FIS homologation.
      const halfCorridor = Math.max(0, g.width / 2 + 0.12);
      const valid = Number.isFinite(crossingX) &&
        Math.abs(crossingX - g.x) <= halfCorridor;
      this.gateStatus[this.nextGate] = valid ? "passed" : "missed";
      if (!valid) this.missed++;
      if ((this.nextGate + 1) % 5 === 0) this.splits.push(startTime + dt * f);
      this.nextGate++;
    }
    this.recordTimer += timedDt;
    if (this.recordTimer >= 1 / 30 || this.frames.length === 0) {
      this.frames.push({
        t: this.time,
        x: s.x,
        z: s.z,
        vx: s.vx,
        vz: s.vz,
        heading: s.heading,
        edge: s.edge,
        flex: s.flex,
        load: s.load,
        slip: s.slip,
        lateralAcceleration: s.lateralAcceleration,
        chatter: s.chatter,
        poleImpact: s.poleImpact,
        poleImpactSide: s.poleImpactSide,
        gateCrashElapsed: s.gateCrashElapsed,
        gateCrashSide: s.gateCrashSide,
        gateCrashSeverity: s.gateCrashSeverity,
        landingShock: s.landingShock,
        finishReach: finishReachAmount(this.course.id,
          s.z, this.course.length, Math.hypot(s.vx, s.vz), s.fallen),
        startPush: this.course.id === "SG" ? Math.max(0, 1 - this.launchTime / 1.55) : 0,
        startPhase: this.course.id === "SG" ? this.launchTime : undefined,
        startGateAngle: startGateAngle(this.course.id, s.z, s.x),
        skid: s.skid,
        pressure: s.pressure,
        height: s.height,
        tuck: tuck ? 1 : 0,
        fallen: s.fallen,
      });
      this.recordTimer = 0;
    }
    if (s.z >= this.course.length) {
      this.time = this.finishBeamTime ?? (
        startTime +
        (timedDt * (this.course.length - previous.z)) /
          Math.max(1e-9, s.z - previous.z)
      );
      this.phase = "finished";
      this.result = {
        time: this.time,
        valid: this.missed === 0,
        missed: this.missed,
        splits: [...this.splits],
        course: this.course.id,
        equipment: this.equipment,
        date: new Date().toISOString(),
      };
    }
  }
}
export function replayAt(frames: Frame[], time: number): Frame | null {
  if (!frames.length) return null;
  let lo = 0,
    hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (frames[mid].t < time) lo = mid + 1;
    else hi = mid;
  }
  const b = frames[lo],
    a = frames[Math.max(0, lo - 1)];
  const u = Math.max(0, Math.min(1, (time - a.t) / Math.max(1e-9, b.t - a.t)));
  return {
    t: time,
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    vx: a.vx === undefined && b.vx === undefined ? undefined :
      (a.vx ?? b.vx ?? 0) + ((b.vx ?? a.vx ?? 0) - (a.vx ?? b.vx ?? 0)) * u,
    vz: a.vz === undefined && b.vz === undefined ? undefined :
      (a.vz ?? b.vz ?? 0) + ((b.vz ?? a.vz ?? 0) - (a.vz ?? b.vz ?? 0)) * u,
    heading: a.heading + angleDiff(b.heading, a.heading) * u,
    edge: a.edge + (b.edge - a.edge) * u,
    flex: (a.flex ?? 0) + ((b.flex ?? 0) - (a.flex ?? 0)) * u,
    load: (a.load ?? 0.5) + ((b.load ?? 0.5) - (a.load ?? 0.5)) * u,
    slip: (a.slip ?? 0) + ((b.slip ?? 0) - (a.slip ?? 0)) * u,
    lateralAcceleration: (a.lateralAcceleration ?? 0) +
      ((b.lateralAcceleration ?? 0) - (a.lateralAcceleration ?? 0)) * u,
    chatter: (a.chatter ?? 0) + ((b.chatter ?? 0) - (a.chatter ?? 0)) * u,
    poleImpact: (a.poleImpact ?? 0) + ((b.poleImpact ?? 0) - (a.poleImpact ?? 0)) * u,
    poleImpactSide: b.poleImpactSide ?? a.poleImpactSide ?? 0,
    gateCrashElapsed: (a.gateCrashElapsed ?? -1) >= 0 &&
      (b.gateCrashElapsed ?? -1) >= 0
      ? (a.gateCrashElapsed ?? -1) +
        ((b.gateCrashElapsed ?? -1) - (a.gateCrashElapsed ?? -1)) * u
      : (b.gateCrashElapsed ?? -1) >= 0
        ? b.gateCrashElapsed
        : a.gateCrashElapsed ?? -1,
    gateCrashSide: b.gateCrashSide ?? a.gateCrashSide ?? 0,
    gateCrashSeverity: b.gateCrashSeverity ?? a.gateCrashSeverity ?? 0,
    landingShock: (a.landingShock ?? 0) + ((b.landingShock ?? 0) - (a.landingShock ?? 0)) * u,
    startPush: (a.startPush ?? 0) + ((b.startPush ?? 0) - (a.startPush ?? 0)) * u,
    startPhase: a.startPhase === undefined ? b.startPhase :
      b.startPhase === undefined ? a.startPhase :
      a.startPhase + (b.startPhase - a.startPhase) * u,
    startGateAngle: (a.startGateAngle ?? 0) +
      ((b.startGateAngle ?? 0) - (a.startGateAngle ?? 0)) * u,
    finishGesture: (a.finishGesture ?? 0) + ((b.finishGesture ?? 0) - (a.finishGesture ?? 0)) * u,
    finishReach: (a.finishReach ?? 0) + ((b.finishReach ?? 0) - (a.finishReach ?? 0)) * u,
    skid: (a.skid ?? 0) + ((b.skid ?? 0) - (a.skid ?? 0)) * u,
    pressure: (a.pressure ?? 1) + ((b.pressure ?? 1) - (a.pressure ?? 1)) * u,
    height: a.height + (b.height - a.height) * u,
    tuck: a.tuck + (b.tuck - a.tuck) * u,
    fallen: a.fallen,
  };
}
/** Display elapsed hundredths without ever rounding a second into "60.00". */
export function formatTime(t: number): string {
  const hundredths = Math.floor(Math.max(0, Number.isFinite(t) ? t : 0) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
}
