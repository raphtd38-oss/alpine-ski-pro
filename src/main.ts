import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow/latin-800.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./ui/style.css";
import { COURSES, EQUIPMENT, terrainHeight } from "./game/course";
import { startPushAcceleration } from "./game/superg";
import { startGateImpulseFraction, startGateAngle, SUPER_G_START_STROKES, startDriveBlend } from "./game/start-gate";
import { finishReachAmount } from "./game/finish-timing";
import { sampleSnowSurface } from "./game/surface";
import { snowLabel } from "./game/snow-model";
import {
  FIXED_DT,
  FixedClock,
  initialState,
  stepPhysics,
} from "./game/physics";
import { Race, replayAt, formatTime } from "./game/race";
import { PoleSimulation } from "./game/poles";
import { Input } from "./game/input";
import { readSettings, writeSettings } from "./game/settings";
import { Progress } from "./game/storage";
import { SkiAudio } from "./game/audio";
import { createRenderer } from "./render/engine";
import { PRO_POLE } from "./render/equipment-specs";
import { Vec3 } from "playcanvas";
import { UI, type Settings } from "./ui/ui";
import type { Frame, Controls } from "./game/types";

async function boot() {
  const settings = readSettings();
  const requestedQuality = new URLSearchParams(location.search).get("quality");
  if (
    requestedQuality &&
    ["low", "medium", "high", "ultra"].includes(requestedQuality)
  )
    settings.quality = requestedQuality as Settings["quality"];
  const progress = new Progress(),
    ui = new UI(document.querySelector("#app")!, settings, progress),
    input = new Input(),
    audio = new SkiAudio();
  const renderer = await createRenderer(document.querySelector("#game")!, settings.quality);
  renderer.build(
    COURSES[settings.course],
    EQUIPMENT[settings.equipment],
    settings.quality,
    settings.weather,
    settings.autoPerformance,
  );
  renderer.athlete.paint(settings.suit);
  audio.setEnabled(settings.sound);
  let state = initialState(),
    previous = { ...state },
    race = new Race(COURSES[settings.course], settings.equipment),
    paused = false,
    playing = false,
    replaying = false,
    replayTime = 0,
    replaySpeed = 1,
    resultShown = false,
    celebrationTime = 0,
    celebrationPending = false,
    best = false,
    hudTimer = 0,
    lastCountdown = 4;
  let poles = new PoleSimulation(COURSES[settings.course]);
  const clock = new FixedClock();
  let lastFrames: Frame[] = [];
  let lastResult: ReturnType<typeof Object.assign> | null = null;
  const snapshot = (time: number): Frame => ({
    t: time,
    x: state.x,
    z: state.z,
    heading: state.heading,
    vx: state.vx,
    vz: state.vz,
    edge: state.edge,
    flex: state.flex,
    load: state.load,
    slip: state.slip,
    chatter: state.chatter,
    poleImpact: state.poleImpact,
    poleImpactSide: state.poleImpactSide,
    gateCrashElapsed: state.gateCrashElapsed,
    gateCrashSide: state.gateCrashSide,
    gateCrashSeverity: state.gateCrashSeverity,
    landingShock: state.landingShock,
    startPush: race.course.id === "SG" && race.phase === "countdown"
      ? 0.78 : startDriveBlend(race.course.id, race.launchTime),
    startPhase: race.course.id === "SG"
      ? race.phase === "countdown" ? -Math.max(0.001, race.countdown) :
        race.phase === "ready" ? -4 : race.launchTime : undefined,
    startGateAngle: startGateAngle(race.course.id, state.z, state.x),
    finishReach: race.course.id === "SG"
      ? race.phase === "racing"
        ? finishReachAmount("SG", state.z, race.course.length,
          Math.hypot(state.vx, state.vz), state.fallen)
        : race.phase === "finished"
          ? Math.max(0, 1 - celebrationTime * 0.85) : 0
      : 0,
    skid: state.skid,
    pressure: state.pressure,
    height: state.height,
    tuck: input.sample().tuck ? 1 : 0,
    fallen: state.fallen,
  });
  const build = () => {
    renderer.build(
      COURSES[settings.course],
      EQUIPMENT[settings.equipment],
      settings.quality,
      settings.weather,
      settings.autoPerformance,
    );
    renderer.athlete.paint(settings.suit);
    ui.updateCourse();
    audio.setEnabled(settings.sound);
  };
  function start(training = false) {
    state = initialState();
    previous = { ...state };
    race = new Race(COURSES[settings.course], settings.equipment, training);
    race.start();
    poles = new PoleSimulation(race.course);
    playing = true;
    replaying = false;
    paused = false;
    resultShown = false;
    celebrationTime = 0;
    celebrationPending = false;
    lastCountdown = 4;
    clock.reset();
    renderer.menu = false;
    renderer.cameraReady = false;
    renderer.effects.reset();
    // Normal races remain clean; the route is advisory in training only.
    // During a race the player can opt in/out using the existing G toggle.
    if (renderer.world.trainingGuide) renderer.world.trainingGuide.enabled = training;
    ui.setReplayUI(false);
    ui.setRace(true);
    ui.text("race-message", "");
    ui.text(
      "split",
      training
        ? "Entraînement · sans classement"
        : race.course.id === "SG"
          ? "Super-G · 4 piquets et 2 fanions par porte"
          : "Passez entre les portes du Super-G",
    );
    void audio
      .start()
      .catch(() => ui.toast("Le son est indisponible dans ce navigateur."));
  }
  ui.start = start;
  ui.restart = () => start(race.training);
  ui.pause = () => {
    if (!playing || paused) return;
    paused = true;
    input.clear();
    audio.update(0, 0, 0, false);
    ui.paused();
  };
  ui.resume = () => {
    paused = false;
    clock.reset();
  };
  ui.home = () => {
    playing = false;
    paused = false;
    replaying = false;
    celebrationTime = 0;
    celebrationPending = false;
    renderer.menu = true;
    state = initialState();
    previous = { ...state };
    clock.reset();
    renderer.effects.reset();
    if (renderer.world.trainingGuide) renderer.world.trainingGuide.enabled = false;
    ui.setReplayUI(false);
    ui.setRace(false);
    ui.text("race-message", "");
  };
  ui.replay = () => {
    if (!lastFrames.length) return;
    replaying = true;
    replayTime = 0;
    replaySpeed = 1;
    paused = false;
    playing = true;
    renderer.menu = false;
    renderer.cameraMode = 3;
    renderer.cameraReady = false;
    if (renderer.world.trainingGuide) renderer.world.trainingGuide.enabled = false;
    ui.setRace(true);
    ui.setReplayUI(true);
    ui.text("countdown", "");
    ui.toast("Replay · C : caméra · Échap : pause · R : nouvelle course");
  };
  ui.onReplaySpeed = (speed) => {
    if (replaying && [0.5, 1, 2].includes(speed)) replaySpeed = speed;
  };
  ui.onReplaySeek = (fraction) => {
    if (!replaying || !lastFrames.length) return;
    replayTime = Math.max(0, Math.min(1, fraction)) *
      lastFrames[lastFrames.length - 1].t;
  };
  ui.settingsChanged = () => {
    if (!writeSettings(settings))
      ui.toast("Préférences conservées pour cette session uniquement.");
    build();
    if (playing) start(race.training);
  };
  input.onAction = (key) => {
    if (key === "KeyR" && playing) ui.restart();
    if (key === "KeyC" && playing) ui.toast(renderer.changeCamera());
    if (key === "KeyG" && playing && renderer.world.trainingGuide) {
      renderer.world.trainingGuide.enabled = !renderer.world.trainingGuide.enabled;
      ui.toast(renderer.world.trainingGuide.enabled
        ? "Trajectoire affichée · passe entre les deux fanions"
        : "Trajectoire masquée");
    }
    if (key === "Escape" && !playing && !ui.modal.hidden) {
      ui.close();
      return;
    }
    if (key === "Escape" && playing) {
      if (paused) {
        ui.close();
        ui.resume();
      } else if (race.phase !== "finished" || replaying) ui.pause();
    }
    if (key === "Enter" && !playing && ui.modal.hidden) start();
  };
  document.addEventListener(
    "pointerdown",
    () => {
      void audio.start().catch(() => {});
    },
    { once: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (playing) ui.pause();
      void audio.ctx?.suspend();
    } else if (audio.ctx) void audio.ctx.resume();
  });
  window.addEventListener("blur", () => {
    if (playing && race.phase !== "finished") ui.pause();
  });
  document.querySelectorAll<HTMLElement>("[data-touch]").forEach((b) => {
    const clear = () => {
      input.touchSteer = 0;
      input.touchBrake = false;
    };
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      if (b.dataset.touch === "brake") input.touchBrake = true;
      else input.touchSteer = b.dataset.touch === "left" ? 1 : -1;
    });
    b.addEventListener("pointerup", clear);
    b.addEventListener("pointercancel", clear);
  });
  function fixed(dt: number, control: Controls) {
    if (race.phase === "countdown") {
      race.tickCountdown(dt);
      const count = Math.ceil(race.countdown);
      if (count !== lastCountdown) {
        audio.tone(count === 0 ? 880 : 440);
        lastCountdown = count;
      }
      return;
    }
    if (race.phase !== "racing") return;
    previous = { ...state };
    const snow = sampleSnowSurface(state.x, state.z, race.course, settings.weather);
    stepPhysics(
      state,
      control,
      EQUIPMENT[settings.equipment],
      race.course,
      dt,
      snow.grip,
      snow.ice,
      snow.depth,
    );
    // The three planted double-pole strokes drive the skis and share their
    // fixed-step clock with the 18-bone animation and snow-contact sound.
    const launchBefore = race.launchTime;
    if (race.course.id === "SG") race.launchTime += dt;
    state.vz += startPushAcceleration(race.course.id, launchBefore) * dt;
    if (race.course.id === "SG") {
      for (const stroke of SUPER_G_START_STROKES) {
        if (launchBefore < stroke.centre && race.launchTime >= stroke.centre)
          audio.polePlant();
      }
      race.startGateDegrees = startGateAngle("SG", state.z, state.x);
      const fraction = startGateImpulseFraction("SG",
        previous.z, state.z, previous.x, state.x);
      if (fraction !== null && !race.startGateOpened) {
        race.openStartGate(fraction, dt);
        audio.startGateClick();
      }
    }
    poles.update(previous, state, dt);
    if (poles.lastBannerCrash) {
      race.registerBannerCrash(poles.lastBannerGate);
      ui.toast("CHUTE ! Contact trop profond avec la banderole");
      audio.tone(150, 0.25);
    }
    if (poles.lastRebounds)
      audio.rebound(poles.lastReboundSide, poles.lastReboundStrength);
    if (poles.lastImpacts)
      audio.impact(
        Math.hypot(state.vx, state.vz), state.poleImpactSide,
        true,
        poles.lastImpactKind === "arm" ? "arm" : "shin",
      );
    const oldGate = race.nextGate;
    race.update(previous, state, dt, control.tuck);
    if (race.nextGate !== oldGate) {
      const passed = race.gateStatus[race.nextGate - 1] === "passed";
      audio.tone(passed ? 680 : 180, 0.08);
      if (!passed)
        ui.toast(
          `Porte ${race.nextGate} manquée${race.training ? "" : " · disqualification"}`,
        );
    }
  }
  const display = () => {
    if (state.z > race.course.length - 110)
      renderer.world.updateTiming(
        replaying ? replayTime : race.time,
        race.missed,
      );
    ui.text("time", formatTime(replaying ? replayTime : race.time));
    ui.text("speed", String(Math.round(Math.hypot(state.vx, state.vz) * 3.6)));
    const surface = sampleSnowSurface(state.x, state.z, race.course, settings.weather);
    ui.text("surface-label", snowLabel(surface));
    ui.text("fps-meter", `${Math.round(renderer.fps)} FPS · RENDU ${Math.round(renderer.renderScale * 100)}%`);
    const upcoming = race.course.gates[race.nextGate];
    ui.text("next-gate", upcoming
      ? `PORTE ${String(race.nextGate + 1).padStart(2, "0")} · ${Math.max(0, Math.round(upcoming.z - state.z))} m`
      : "ARRIVÉE · DERNIÈRE LIGNE DROITE");
    ui.text(
      "gates",
      `${race.nextGate - race.missed} / ${race.course.gates.length}`,
    );
    ui.text(
      "race-status",
      replaying
        ? "REPLAY"
        : race.missed
          ? race.training
            ? "ENTRAÎNEMENT"
            : "DISQUALIFIÉ"
          : state.fallen > 0
            ? "DÉSÉQUILIBRE"
            : "EN PISTE",
    );
    ui.text(
      "remaining",
      String(Math.max(0, Math.round(race.course.length - state.z))),
    );
    ui.text(
      "edge-label",
      settings.edges
        ? `CARRES ${Math.round((Math.abs(state.edge) * 180) / Math.PI)}°`
        : "",
    );
    ui.text(
      "countdown",
      race.phase === "countdown"
        ? String(Math.ceil(race.countdown))
        : race.time < 0.8 && race.phase === "racing"
          ? "GO"
          : "",
    );
    if (race.splits.length) {
      const index = race.splits.length - 1,
        current = race.splits[index],
        reference = progress.data.records[settings.course]?.[0]?.splits[index];
      const difference =
        reference === undefined
          ? ""
          : `  /  ${current - reference >= 0 ? "+" : ""}${(current - reference).toFixed(2)} s vs record`;
      ui.text(
        "split",
        `INTER ${index + 1}  ${formatTime(current)}${difference}`,
      );
    }
    (document.querySelector("#progress") as HTMLElement).style.width =
      `${Math.min(100, (state.z / race.course.length) * 100)}%`;
    (document.querySelector("#speed-bar") as HTMLElement).style.width =
      `${Math.min(100, Math.hypot(state.vx, state.vz) * 3.6)}%`;
  };
  renderer.app.on("update", (realDt: number) => {
    const dt = Math.min(realDt, 0.1),
      control = input.sample();
    let alpha = 1;
    let frame = snapshot(race.time);
    if (playing && !paused) {
      if (replaying) {
        replayTime += dt * replaySpeed;
        const f = replayAt(lastFrames, replayTime);
        if (f) {
          frame = f;
          const prevZ = state.z, prevX = state.x;
          const elapsed = Math.max(0.001, dt * replaySpeed);
          state = {
            ...state,
            x: f.x,
            z: f.z,
            heading: f.heading,
            edge: f.edge,
            flex: f.flex ?? 0,
            load: f.load ?? 0.5,
            slip: f.slip ?? 0,
            chatter: f.chatter ?? 0,
            poleImpact: f.poleImpact ?? 0,
            poleImpactSide: f.poleImpactSide ?? 0,
            gateCrashElapsed: f.gateCrashElapsed ?? -1,
            gateCrashSide: f.gateCrashSide ?? 0,
            gateCrashSeverity: f.gateCrashSeverity ?? 0,
            landingShock: f.landingShock ?? 0,
            skid: f.skid ?? 0,
            pressure: f.pressure ?? 1,
            height: f.height,
            fallen: f.fallen,
            vz: Math.max(0, Math.min(70, (f.z - prevZ) / elapsed)),
            vx: Math.max(-40, Math.min(40, (f.x - prevX) / elapsed)),
          };
          ui.updateReplayTime(replayTime, lastFrames[lastFrames.length - 1].t);
        }
        if (replayTime >= lastFrames[lastFrames.length - 1].t) {
          replaying = false;
          playing = false;
          ui.setReplayUI(false);
          ui.results(race.result!, best, race.training);
        }
      } else {
        alpha = clock.advance(realDt, (d) => fixed(d, control));
        frame = snapshot(race.time);
        if (race.phase === "racing") {
          frame.x = previous.x + (state.x - previous.x) * alpha;
          frame.z = previous.z + (state.z - previous.z) * alpha;
        }
      }
    }
    if (race.phase === "finished" && !resultShown && !replaying) {
      resultShown = true;
      lastFrames = [...race.frames];
      lastResult = race.result;
      best = !race.training && progress.record(race.result!, race.frames);
      audio.tone(1100, 0.5);
      if (race.course.id === "SG") {
        // Hold the photofinish reach and low hand briefly after crossing.
        celebrationPending = true;
        celebrationTime = 0;
      } else ui.results(race.result!, best, race.training);
    }
    if (celebrationPending && !paused && !replaying) {
      celebrationTime += dt;
      frame.finishReach = Math.max(0, 1 - celebrationTime * 0.85);
      if (celebrationTime >= 2.25) {
        celebrationPending = false;
        ui.results(race.result!, best, race.training);
      }
    }
    const ghost =
      playing && !replaying && settings.ghost && race.phase === "racing"
        ? replayAt(
            progress.data.ghosts[settings.course]?.frames ?? [],
            race.time,
          )
        : null;
    renderer.update(
      state,
      frame,
      realDt,
      playing && !paused && !replaying && race.phase === "racing",
      ghost,
    );
    renderer.world.updateGates(race.gateStatus, poles.poles, realDt, state.z);
    audio.update(
      Math.hypot(state.vx, state.vz),
      state.edge,
      state.slip,
      playing && !paused && (replaying || race.phase === "racing"),
      sampleSnowSurface(state.x, state.z, race.course, settings.weather).grip,
      {
        chatter: state.chatter, skid: state.skid,
        depth: sampleSnowSurface(state.x, state.z, race.course, settings.weather).depth,
      },
    );
    audio.menu(!playing);
    audio.crowd(
      playing && !paused ? 1 - Math.abs(race.course.length - state.z) / 100 : 0,
    );
    hudTimer += dt;
    if (hudTimer > 0.05) {
      display();
      hudTimer = 0;
    }
  });
  ui.text(
    "renderer-info",
    `${renderer.app.graphicsDevice.deviceType.toUpperCase()} / PLAYCANVAS / ${renderer.ammoEnabled ? "AMMO.JS" : "PHYSIQUE CLASSIQUE"}`,
  );
  document.querySelector("#loading")!.remove();
  renderer.app.start();
  if (new URLSearchParams(location.search).has("graphics-recovery"))
    ui.toast("Rendu WebGL 2 activé après un problème WebGPU.");
  // Explicitly development-only observability. Never included in the production bundle.
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __ski: {
        /** DEV ONLY: world-space contact diagnostics for animation regression.
         * Production builds never expose these graph/bone references.
         */
        getAthletePose: () => {
          const athlete = renderer.athlete;
          const groundClearance = (name: string) => {
            const bone = athlete.rig.findByName(name);
            if (!bone) return null;
            const p = bone.getPosition();
            return p.y - terrainHeight(p.x, p.z, race.course);
          };
          const gripError = (index: number) => {
            const pole = athlete.poles[index];
            const wrist = athlete.joints[index === 0 ? "LWrist" : "RWrist"];
            if (!pole || !wrist) return null;
            const offset = (PRO_POLE.shaftLength - PRO_POLE.gripLength) * 0.5;
            const grip = pole.getWorldTransform().transformPoint(
              new Vec3(0, offset, 0));
            return grip.distance(wrist.getPosition());
          };
          return {
            seamless: athlete.isSeamless,
            edge: athlete.visualEdge,
            crouch: athlete.visualCrouch,
            tuck: athlete.visualTuck,
            leftBoot: groundClearance("LeftFoot"),
            rightBoot: groundClearance("RightFoot"),
            pelvis: groundClearance(athlete.isSeamless ? "Hips" : "Pelvis"),
            poleGripError: [gripError(0), gripError(1)],
            competitionPose: athlete.getCompetitionDiagnostics(),
          };
        },
        getState: () => ({
          ...state,
          phase: race.phase,
          time: race.time,
          gate: race.nextGate,
          missed: race.missed,
          paused,
          course: race.course.id,
          fps: renderer.fps,
          guideActive: Boolean(renderer.world.trainingGuide?.enabled),
          startArchVisible: Boolean(renderer.world.startArch?.enabled),
          startHouse: Boolean(renderer.world.startBooth),
          timingWands: renderer.world.startWands.length,
          startGateOpened: race.startGateOpened,
          startGateImpulseTime: race.startGateImpulseTime,
          startGateDegrees: race.startGateDegrees,
          startLaunchTime: race.launchTime,
          timingWandAngle: renderer.world.startWands[0]?.getLocalEulerAngles().y ?? 0,
          pairedGatePoles: renderer.world.gateEntities.reduce(
            (count, gate) => count + gate.children.reduce(
              (n, hinge) => n + hinge.children.filter(
                (child) => child.name === "Second pole of flag pair",
              ).length, 0,
            ), 0,
          ),
          celebrationTime,
          finishBeamTime: race.finishBeamTime,
          finishBeamTriggeredBy: race.finishBeamTriggeredBy,
          finishReach: finishReachAmount(race.course.id, state.z,
            race.course.length, Math.hypot(state.vx, state.vz), state.fallen),
          blueBorderDye: Boolean(renderer.world.blueBorderDye),
          sprayedBlueDye: renderer.world.resources.some(
            (tex) => tex.name === "Original powder sprayed FIS-style blue dye",
          ),
          gateFlagCount: renderer.world.gateEntities.reduce(
            (count, gate) => count + gate.children.reduce(
              (flags, pivot) => flags + pivot.children.filter(
                (child) => child.name === "Gate textile flag",
              ).length, 0,
            ), 0,
          ),
          flexiblePoleTips: renderer.world.gateEntities.reduce(
            (count, gate) => count + gate.children.filter(
              (pivot) => pivot.children.some(
                (child) => child.name === "Pole elastic upper section",
              ),
            ).length, 0,
          ),
          texturedGatePoles: renderer.world.gateEntities.reduce(
            (count, gate) => count + gate.children.reduce(
              (poles, pivot) => poles + pivot.children.filter(
                (child) => child.name === "Flexible slalom pole",
              ).length, 0,
            ), 0,
          ),
          visibleAlpineDetails: renderer.alpineAssets.visibleDetails,
          athleteBones: Object.keys(renderer.athlete.joints).length,
          athleteSeamless: renderer.athlete.isSeamless,
          athleteVariant: renderer.racerVariant,
          athleteHasAttachedSkis: !!renderer.athlete.rig.findByName("LEFTFOOT/Top glossy curved topsheet") && !!renderer.athlete.rig.findByName("RIGHTFOOT/Top glossy curved topsheet"),
          raceSkiTextureCount: renderer.athlete.ownedTextures.length,
          cameraTerrainClearance: (() => {
            const p = renderer.camera.getPosition();
            return p.y - terrainHeight(p.x, p.z, race.course);
          })(),
          athleteTexturedSurfaces: renderer.athlete.rig.findComponents("render").reduce(
            (n,c) => n + (c as import("playcanvas").RenderComponent)
              .meshInstances.filter(mi =>
                Boolean((mi.material as import("playcanvas").StandardMaterial).diffuseMap),
              ).length, 0,
          ),
          athleteSurfaces: renderer.athlete.rig.findComponents("render").reduce(
            (n, c) => n + (c as import("playcanvas").RenderComponent).meshInstances.length, 0,
          ),
          replaying,
          replaySpeed,
          replayTime,
          renderer: renderer.app.graphicsDevice.deviceType,
        }),
        start,
        step: (n: number, control: Controls) => {
          for (let i = 0; i < n; i++) fixed(FIXED_DT, control);
        },
        // DEV only: frame-perfect photographic inspection without advancing wall-clock physics.
        freezeSimulation: (frozen: boolean) => { paused = frozen; clock.reset(); },
        getCourse: () => race.course,
        getResult: () => lastResult,
      },
    });
  }
}
boot().catch((error) => {
  console.error(error);
  const loading = document.querySelector("#loading")!;
  loading.innerHTML =
    '<div class="error-panel"><h1>La montagne attend.</h1><p>Le moteur 3D n’a pas pu démarrer. Vérifiez que l’accélération graphique est activée et utilisez un navigateur récent compatible WebGL 2 ou WebGPU.</p><button class="primary" id="retry">Réessayer</button><p id="error-detail"></p></div>';
  document.querySelector("#error-detail")!.textContent = String(error);
  document
    .querySelector("#retry")!
    .addEventListener("click", () => location.reload());
});
