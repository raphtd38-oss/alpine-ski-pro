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
  // Crisp across the camera's close-up; one shared texture per colour.
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const red = tone === "red";
  const base = red ? "#c6293b" : "#205cc0";
  const edge = red ? "#ef6971" : "#65b2ed";
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, red ? "#ec4c52" : "#367fe1");
  gradient.addColorStop(0.45, base);
  gradient.addColorStop(1, red ? "#a72135" : "#17458e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Original woven polyester fibres: two directions and staggered crossings.
  // No downloaded asset or copied sponsor logo.
  for (let x = 0; x < 1024; x += 6) {
    ctx.fillStyle = x % 12 ? "rgba(255,255,255,.038)" : "rgba(0,0,0,.075)";
    ctx.fillRect(x, 0, 2, 512);
  }
  for (let y = 0; y < 512; y += 6) {
    ctx.fillStyle = y % 12 ? "rgba(255,255,255,.036)" : "rgba(0,0,0,.042)";
    ctx.fillRect(0, y, 1024, 2);
  }
  // Reinforced double-stitched hem and welded corner grommets.
  ctx.strokeStyle = edge;
  ctx.lineWidth = 17;
  ctx.strokeRect(14, 14, 996, 484);
  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.setLineDash([13, 9]);
  ctx.lineWidth = 3;
  ctx.strokeRect(35, 35, 954, 442);
  ctx.setLineDash([]);
  for (const x of [65, 960])
    for (const y of [59, 453]) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#263d50";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#9ab4c9";
      ctx.fill();
    }
  // Text is generic original game branding, not a real event sponsor.
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.textAlign = "center";
  ctx.font = "900 127px Arial, sans-serif";
  ctx.fillText("ALPINE", 512, 225);
  ctx.font = "bold 91px Arial, sans-serif";
  ctx.fillText("SKI PRO", 512, 335);
  ctx.font = "bold 31px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.83)";
  ctx.fillText("ALPINE RACE SERIES", 512, 404);
  return canvas;
}
