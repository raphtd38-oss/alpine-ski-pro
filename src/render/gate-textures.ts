/** Original procedural gate fabrics, not texture files from another game.
 * All canvases are generated once at course load and shared across gates.
 */
export type GateColour = "red" | "blue";

export function gatePoleCanvas(tone: GateColour): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const base = tone === "red" ? "#e83f39" : "#2374dc";
  const gradient = ctx.createLinearGradient(0, 0, 64, 0);
  gradient.addColorStop(0, "#1e3244");
  gradient.addColorStop(0.12, base);
  gradient.addColorStop(0.5, tone === "red" ? "#ff6b55" : "#65a5ff");
  gradient.addColorStop(0.88, base);
  gradient.addColorStop(1, "#26394b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);
  // Fibreglass pole, factory tape at the top and near the spring hinge.
  ctx.fillStyle = "#ecf5f6";
  ctx.fillRect(0, 9, 64, 13);
  ctx.fillRect(0, 211, 64, 9);
  ctx.fillStyle = "#0d2635";
  ctx.fillRect(0, 240, 64, 16);
  for (let x = 2; x < 64; x += 4) {
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fillRect(x, 0, 1, 240);
  }
  return canvas;
}

export function gateBannerCanvas(tone: GateColour): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const primary = tone === "red" ? "#cf313e" : "#205fc8";
  const edge = tone === "red" ? "#fc665c" : "#59a4f5";
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 256);
  const shine = ctx.createLinearGradient(0, 0, 0, 256);
  shine.addColorStop(0, "rgba(255,255,255,0.26)");
  shine.addColorStop(0.3, "rgba(255,255,255,0.03)");
  shine.addColorStop(0.76, "rgba(0,0,0,0.12)");
  shine.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 12;
  ctx.strokeRect(9, 9, 494, 238);
  ctx.fillStyle = "rgba(255,255,255,.93)";
  ctx.textAlign = "center";
  ctx.font = "bold 61px Arial, sans-serif";
  ctx.fillText("ALPINE", 256, 112);
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.fillText("SKI PRO", 256, 164);
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("RACE SERIES", 256, 206);
  // Fine weave/snow speckle makes canvas less flat in close-up.
  for (let y = 5; y < 256; y += 9) {
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fillRect(0, y, 512, 1);
  }
  return canvas;
}
