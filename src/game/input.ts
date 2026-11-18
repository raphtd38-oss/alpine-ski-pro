import type { Controls } from "./types";

/** Player right is world +X, consistently for keyboard and analogue axes. */
export function steeringFromDirections(left: boolean, right: boolean): number {
  return (right ? 1 : 0) - (left ? 1 : 0);
}
export class Input {
  keys = new Set<string>();
  touchSteer = 0;
  touchBrake = false;
  onAction: (key: string) => void = () => {};
  constructor() {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.onAction(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clear());
  }
  clear() {
    this.keys.clear();
    this.touchSteer = 0;
    this.touchBrake = false;
  }
  sample(): Controls {
    let steer = steeringFromDirections(
      this.keys.has("KeyA") || this.keys.has("ArrowLeft"),
      this.keys.has("KeyD") || this.keys.has("ArrowRight"),
    );
    let tuck = this.keys.has("KeyW") || this.keys.has("ArrowUp"),
      brake =
        this.touchBrake || this.keys.has("KeyS") || this.keys.has("ArrowDown"),
      jump = this.keys.has("Space");
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      if (Math.abs(pad.axes[0]) > 0.12) steer = pad.axes[0];
      tuck ||= !!pad.buttons[7]?.pressed;
      brake ||= !!pad.buttons[6]?.pressed;
      jump ||= !!pad.buttons[0]?.pressed;
    }
    return { steer: steer || this.touchSteer, tuck, brake, jump };
  }
}
