// backend/index.js (Full Updated File)

const express = require("express");
const cors = require("cors");
const JSZip = require("jszip");
// const fetch = require("node-fetch"); // We don't need this if using Node 18+
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

/**
 * NEW: buildHTMLAndCSS
 * This function now generates responsive units (%) and (vw)
 * based on the original canvas dimensions.
 */
function buildHTMLAndCSS(items, canvasWidth, canvasHeight) {
  // Make sure we have valid numbers to avoid divide-by-zero
  const cW = canvasWidth || 1100;
  const cH = canvasHeight || 700;

  const cssRules = [
    // --- RESPONSIVE CSS ---
    "*,*::before,*::after{box-sizing:border-box}",
    "html, body { height: 100%; margin: 0; padding: 0; }",
    "body{font-family:Inter,system-ui,Arial,Helvetica,sans-serif}",
    // Page container is now full viewport width/height
    "#page{position:relative;width:100vw;height:100vh;background:#fff;overflow:hidden;}",
    ".abs-el{position:absolute;transform-origin: top left;}"
  ];

  let htmlChildren = "";
  const assets = [];

  items.forEach(it => {
    const { id, type, x, y } = it;

    // --- CONVERT PIXELS TO PERCENTAGES ---
    const left = (x / cW * 100).toFixed(2);
    const top = (y / cH * 100).toFixed(2);
    
    if (type === "rect") {
      const { width: w, height: h, fill = "#ddd", rotate = 0 } = it;
      
      // Convert width/height to percentages
      const width = (w / cW * 100).toFixed(2);
      const height = (h / cH * 100).toFixed(2);
      
      const className = `el-${id}`;
      htmlChildren += `<div class="abs-el ${className}"></div>\n`;
      // Use % for all units
      cssRules.push(`.${className}{left:${left}%;top:${top}%;width:${width}%;height:${height}%;background:${fill};transform: rotate(${rotate}deg);}`);

    } else if (type === "text") {
      const { text = "", fontSize = 16, fill = "#000" } = it;
      
      // Convert font-size to viewport-width (vw) to scale with window
      const fontVw = (fontSize / cW * 100).toFixed(2);

      const className = `el-${id}`;
      const escaped = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      htmlChildren += `<div class="abs-el ${className}">${escaped}</div>\n`;
      // Use % for position and vw for font size
      cssRules.push(`.${className}{left:${left}%;top:${top}%;font-size:${fontVw}vw;color:${fill};}`);

    } else if (type === "image") {
      const { width: w = 200, height: h = 120, src } = it;

      // Convert width/height to percentages
      const width = (w / cW * 100).toFixed(2);
      const height = (h / cH * 100).toFixed(2);

      const className = `el-${id}`;
      assets.push({ id, src });
      const filename = `assets/${id}.png`;
      htmlChildren += `<img class="abs-el ${className}" src="${filename}" alt="" />\n`;
      // Use % for all units
      cssRules.push(`.${className}{left:${left}%;top:${top}%;width:${width}%;height:${height}%;}`);
    }
  });

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="styles.css" />
<title>Exported Design</title>
</head>
<body>
  <div id="page">
${htmlChildren}
  </div>
</body>
</html>`.trim();

  return { html, css: cssRules.join("\n"), assets };
}


app.post("/api/export-zip", async (req, res) => {
  try {
    // --- RECEIVE NEW DIMENSIONS ---
    const { items, canvasWidth, canvasHeight } = req.body;
    
    // Check if items were sent
    if (!items) {
      return res.status(400).json({ error: "No 'items' array provided in request body." });
    }

    // --- PASS DIMENSIONS TO BUILDER ---
    const { html, css, assets } = buildHTMLAndCSS(items, canvasWidth, canvasHeight);
    
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("styles.css", css);

    // fetch assets (using global fetch)
    await Promise.all(assets.map(async a => {
      try {
        const resp = await fetch(a.src);
        const buf = await resp.arrayBuffer();
        zip.folder("assets").file(`${a.id}.png`, Buffer.from(buf));
      } catch (e) {
        console.warn("asset error", a.src, e);
      }
    }));

    const content = await zip.generateAsync({ type: "nodebuffer" });
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=design-export.zip",
    });
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("Backend listening on", port));