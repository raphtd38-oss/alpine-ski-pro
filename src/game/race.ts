import type {
  Course,
  Discipline,
  Frame,
  RacePhase,
  Result,
  SkierState,
} from "./types";
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
        height: s.height,
        tuck: tuck ? 1 : 0,
        fallen: s.fallen,
      });
      this.recordTimer = 0;
    }
    if (s.z >= this.course.length) {
      this.time =
        startTime +
        (dt * (this.course.length - previous.z)) /
          Math.max(1e-9, s.z - previous.z);
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
    heading: a.heading + (b.heading - a.heading) * u,
    edge: a.edge + (b.edge - a.edge) * u,
    height: a.height + (b.height - a.height) * u,
    tuck: a.tuck + (b.tuck - a.tuck) * u,
    fallen: a.fallen,
  };
}
export const formatTime = (t: number) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${(t % 60).toFixed(2).padStart(5, "0")}`;
