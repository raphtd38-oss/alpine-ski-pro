import type {
  Course,
  Discipline,
  Frame,
  RacePhase,
  Result,
  SkierState,
} from "./types";
import { angleDiff } from "./types";
import { finishReachAmount, lowHandLead, finishBeamFraction } from "./finish-timing";
export class Race {
  phase: RacePhase = "ready";
  time = 0;
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
    const startTime = this.time;
    this.time += dt;
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
        this.finishBeamTime = startTime + dt * f;
        this.finishBeamTriggeredBy = b > 0.05 ? "hand" : "body";
      }
    }
    while (
      this.nextGate < this.course.gates.length &&
      s.z >= this.course.gates[this.nextGate].z
    ) {
      const g = this.course.gates[this.nextGate];
      const f = (g.z - previous.z) / Math.max(1e-9, s.z - previous.z);
      const crossingX = previous.x + (s.x - previous.x) * f;
      const valid =
        Math.abs(crossingX - g.x) <= g.width / 2 - 0.28 && s.height < 1.5;
      this.gateStatus[this.nextGate] = valid ? "passed" : "missed";
      if (!valid) this.missed++;
      if ((this.nextGate + 1) % 5 === 0) this.splits.push(startTime + dt * f);
      this.nextGate++;
    }
    this.recordTimer += dt;
    if (this.recordTimer >= 1 / 30 || this.frames.length === 0) {
      this.frames.push({
        t: this.time,
        x: s.x,
        z: s.z,
        heading: s.heading,
        edge: s.edge,
        flex: s.flex,
        load: s.load,
        slip: s.slip,
        chatter: s.chatter,
        poleImpact: s.poleImpact,
        poleImpactSide: s.poleImpactSide,
        landingShock: s.landingShock,
        finishReach: finishReachAmount(this.course.id,
          s.z, this.course.length, Math.hypot(s.vx, s.vz), s.fallen),
        startPush: this.course.id === "SG" ? Math.max(0, 1 - this.time / 1.5) : 0,
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
        (dt * (this.course.length - previous.z)) /
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
    heading: a.heading + angleDiff(b.heading, a.heading) * u,
    edge: a.edge + (b.edge - a.edge) * u,
    flex: (a.flex ?? 0) + ((b.flex ?? 0) - (a.flex ?? 0)) * u,
    load: (a.load ?? 0.5) + ((b.load ?? 0.5) - (a.load ?? 0.5)) * u,
    slip: (a.slip ?? 0) + ((b.slip ?? 0) - (a.slip ?? 0)) * u,
    chatter: (a.chatter ?? 0) + ((b.chatter ?? 0) - (a.chatter ?? 0)) * u,
    poleImpact: (a.poleImpact ?? 0) + ((b.poleImpact ?? 0) - (a.poleImpact ?? 0)) * u,
    poleImpactSide: b.poleImpactSide ?? a.poleImpactSide ?? 0,
    landingShock: (a.landingShock ?? 0) + ((b.landingShock ?? 0) - (a.landingShock ?? 0)) * u,
    startPush: (a.startPush ?? 0) + ((b.startPush ?? 0) - (a.startPush ?? 0)) * u,
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
