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
  // Inspired by the user's photograph: coloured, slightly wrinkled speed-gate fabric.
  // Red and blue variants share geometry, with white interlocking rings.
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const red = tone === "red";
  const colour = ctx.createLinearGradient(0, 0, 1024, 0);
  colour.addColorStop(0, red ? "#df2d20" : "#0756bb");
  colour.addColorStop(.26, red ? "#ff4930" : "#1379e4");
  colour.addColorStop(.5, red ? "#e62b1e" : "#0d61cd");
  colour.addColorStop(.77, red ? "#f5422b" : "#1174df");
  colour.addColorStop(1, red ? "#d82b20" : "#074eae");
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 1024, 512);
  for (let x = 0; x < 1024; x += 4) {
    ctx.fillStyle = x % 12 === 0
      ? "rgba(0,20,30,.04)" : "rgba(255,255,255,.024)";
    ctx.fillRect(x, 0, 1, 512);
  }
  for (let y = 0; y < 512; y += 6) {
    ctx.fillStyle = "rgba(0,0,0,.022)";
    ctx.fillRect(0, y, 1024, 1);
  }
  // Creased central seam and reinforced upper/lower hems.
  const pleat = ctx.createLinearGradient(472, 0, 552, 0);
  pleat.addColorStop(0, "rgba(0,0,0,0)");
  pleat.addColorStop(.43, "rgba(0,0,0,.20)");
  pleat.addColorStop(.56, "rgba(255,255,255,.14)");
  pleat.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pleat;
  ctx.fillRect(472, 0, 80, 512);
  ctx.fillStyle = "rgba(5,16,28,.17)";
  ctx.fillRect(0, 0, 1024, 19);
  ctx.fillRect(0, 487, 1024, 25);
  ctx.strokeStyle = "rgba(255,255,255,.46)";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(23, 27, 978, 459);
  ctx.setLineDash([]);
  // Five white overlapping rings, centred on the textile panel.
  ctx.strokeStyle = "rgba(255,255,255,.98)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  for (const [x, y] of [[340,226],[512,226],[684,226],[426,282],[598,282]]) {
    ctx.beginPath();
    ctx.arc(x, y, 80, 0, 2 * Math.PI);
    ctx.stroke();
  }
  // Four metal-backed webbing strips to hold the panel to both poles.
  for (const x of [20, 966]) {
    for (const y of [35, 425]) {
      ctx.fillStyle = "rgba(23,40,52,.26)";
      ctx.fillRect(x, y, 34, 56);
      ctx.fillStyle = "#9aa9b3";
      ctx.fillRect(x + 8, y + 2, 13, 51);
      ctx.fillStyle = "#657582";
      ctx.fillRect(x + 11, y + 6, 3, 44);
    }
  }
  return canvas;
}
