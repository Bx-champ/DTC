import React, { useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Image } from "react-konva";
import useImage from "use-image";
import { saveAs } from "file-saver";
import JSZip from "jszip";

// Simple Konva Image wrapper
const KonvaImage = ({ src, x, y, width, height, onClick }) => {
  const [img] = useImage(src);
  return <Image image={img} x={x} y={y} width={width} height={height} onClick={onClick} />;
};

function defaultScene(){
  return [
    { id: "rect-1", type: "rect", x: 20, y: 20, width: 280, height: 180, fill: "#60A5FA", rotate:0 },
    { id: "text-1", type: "text", x: 40, y: 40, text: "Hello World", fontSize: 24, fill: "#fff" }
  ];
}

export default function CanvasEditor(){
  const stageRef = useRef();
  const [items, setItems] = useState(defaultScene());
  const [selectedId, setSelectedId] = useState(null);

  // helpers
  const addRect = () => {
    const id = "rect-" + Date.now();
    setItems([...items, { id, type: "rect", x: 50, y: 50, width: 200, height: 120, fill: "#F97316", rotate:0 }]);
  };
  const addText = () => {
    const id = "text-" + Date.now();
    setItems([...items, { id, type: "text", x: 80, y: 80, text: "New text", fontSize: 18, fill: "#111" }]);
  };
  const addImageFromUrl = () => {
    const url = prompt("Image URL");
    if(!url) return;
    const id = "img-" + Date.now();
    setItems([...items, { id, type: "image", x: 100, y: 100, width: 240, height: 160, src: url }]);
  };

  const updateItem = (id, patch) => {
    setItems(items.map(it => it.id === id ? {...it, ...patch} : it));
  };

  // Convert scene -> HTML and CSS (absolute positioning)
  const generateHTMLCSS = async () => {
    // stage size
    const stage = stageRef.current;
    const width = stage.width();
    const height = stage.height();

    // Build HTML body with container #page
    let htmlChildren = "";
    let cssRules = [
      "*,*::before,*::after{box-sizing:border-box}",
      "body{margin:0;font-family:Inter,system-ui,Arial,Helvetica,sans-serif}",
      "#page{position:relative;width:100%;max-width:1200px;margin:24px auto;background:#fff;min-height:600px;border:1px solid #e5e7eb}",
      ".abs-el{position:absolute;transform-origin: top left;}"
    ];

    // For images we'll fetch blobs to include in zip
    const assets = [];

    items.forEach(it => {
      const { id, type, x, y } = it;
      const left = Math.round(x);
      const top = Math.round(y);

      if(type === "rect"){
        const { width: w, height: h, fill = "#ddd", rotate = 0 } = it;
        const className = `el-${id}`;
        htmlChildren += `<div class="abs-el ${className}"></div>\n`;
        cssRules.push(`.${className}{left:${left}px;top:${top}px;width:${Math.round(w)}px;height:${Math.round(h)}px;background:${fill};transform: rotate(${rotate}deg);}`);
      } else if(type === "text"){
        const { text = "", fontSize=16, fill="#000" } = it;
        const className = `el-${id}`;
        const escaped = String(text).replace(/</g,"&lt;").replace(/>/g,"&gt;");
        htmlChildren += `<div class="abs-el ${className}">${escaped}</div>\n`;
        cssRules.push(`.${className}{left:${left}px;top:${top}px;font-size:${fontSize}px;color:${fill};}`);
      } else if(type === "image"){
        const { width:w = 200, height:h = 120, src } = it;
        const className = `el-${id}`;
        // Save for asset inclusion
        assets.push({ id, src });
        // Use an <img> tag referencing the file name (we'll add to zip)
        const filename = `assets/${id}.png`;
        htmlChildren += `<img class="abs-el ${className}" src="${filename}" alt="" />\n`;
        cssRules.push(`.${className}{left:${left}px;top:${top}px;width:${Math.round(w)}px;height:${Math.round(h)}px;}`);
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

    const css = cssRules.join("\n");

    // Build ZIP
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("styles.css", css);

    // fetch assets
    await Promise.all(assets.map(async a => {
      try{
        const res = await fetch(a.src);
        const blob = await res.blob();
        zip.folder("assets").file(`${a.id}.png`, blob);
      }catch(e){
        console.warn("Failed to fetch asset", a.src, e);
      }
    }));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "design-export.zip");
  };

  // Render items
  return (
    <div className="flex gap-4">
      <aside className="w-56 bg-white p-3 rounded shadow">
        <div className="flex flex-col gap-2">
          <button onClick={addRect} className="p-2 bg-blue-600 text-white rounded">Add Rectangle</button>
          <button onClick={addText} className="p-2 bg-green-600 text-white rounded">Add Text</button>
          <button onClick={addImageFromUrl} className="p-2 bg-indigo-600 text-white rounded">Add Image (URL)</button>
          <button onClick={generateHTMLCSS} className="p-2 bg-gray-800 text-white rounded mt-4">Generate Code & Download ZIP</button>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Layers</h3>
          <ul>
            {items.map(it => (
              <li key={it.id} className={`p-1 cursor-pointer ${selectedId===it.id ? "bg-slate-100":""}`} onClick={() => setSelectedId(it.id)}>
                {it.type} — {it.id}
              </li>
            ))}
          </ul>
        </div>

        {selectedId && (() => {
          const sel = items.find(i=>i.id===selectedId);
          if(!sel) return null;
          return (
            <div className="mt-4">
              <h4 className="font-medium">Inspector</h4>
              <div className="flex flex-col gap-2 mt-2">
                <label>
                  X: <input type="number" value={Math.round(sel.x)} onChange={(e)=>updateItem(sel.id,{x: Number(e.target.value)})} className="w-full"/>
                </label>
                <label>
                  Y: <input type="number" value={Math.round(sel.y)} onChange={(e)=>updateItem(sel.id,{y: Number(e.target.value)})} className="w-full"/>
                </label>
                {sel.type === "rect" && <>
                  <label>Width: <input type="number" value={Math.round(sel.width)} onChange={(e)=>updateItem(sel.id,{width:Number(e.target.value)})} className="w-full" /></label>
                  <label>Height: <input type="number" value={Math.round(sel.height)} onChange={(e)=>updateItem(sel.id,{height:Number(e.target.value)})} className="w-full" /></label>
                  <label>Fill: <input type="color" value={sel.fill || "#ffffff"} onChange={(e)=>updateItem(sel.id,{fill:e.target.value})} className="w-full" /></label>
                </>}
                {sel.type === "text" && <>
                  <label>Text: <input value={sel.text} onChange={(e)=>updateItem(sel.id,{text:e.target.value})} className="w-full" /></label>
                  <label>Font Size: <input type="number" value={sel.fontSize || 16} onChange={(e)=>updateItem(sel.id,{fontSize:Number(e.target.value)})} className="w-full" /></label>
                </>}
                {sel.type === "image" && <>
                  <label>Source: <input value={sel.src} onChange={(e)=>updateItem(sel.id,{src:e.target.value})} className="w-full"/></label>
                  <label>Width: <input type="number" value={Math.round(sel.width)} onChange={(e)=>updateItem(sel.id,{width:Number(e.target.value)})} className="w-full"/></label>
                  <label>Height: <input type="number" value={Math.round(sel.height)} onChange={(e)=>updateItem(sel.id,{height:Number(e.target.value)})} className="w-full"/></label>
                </>}
                <button className="mt-2 p-2 bg-red-600 text-white rounded" onClick={() => setItems(items.filter(i=>i.id!==sel.id))}>Delete</button>
              </div>
            </div>
          )
        })()}
      </aside>

      <section className="flex-1">
        <div className="border rounded bg-white">
          <Stage width={1000} height={700} ref={stageRef} style={{background:"#f8fafc"}}>
            <Layer>
              {/* page background */}
              <Rect x={0} y={0} width={1000} height={700} fill="#ffffff" />
              {items.map(it => {
                if(it.type === "rect"){
                  return <Rect key={it.id} x={it.x} y={it.y} width={it.width} height={it.height} fill={it.fill} draggable onDragEnd={(e)=>updateItem(it.id,{x:e.target.x(), y:e.target.y()})} onClick={()=>setSelectedId(it.id)} />;
                } else if(it.type === "text"){
                  return <Text key={it.id} x={it.x} y={it.y} text={it.text} fontSize={it.fontSize} fill={it.fill} draggable onDragEnd={(e)=>updateItem(it.id,{x:e.target.x(), y:e.target.y()})} onClick={()=>setSelectedId(it.id)} />;
                } else if(it.type === "image"){
                  return <KonvaImage key={it.id} src={it.src} x={it.x} y={it.y} width={it.width} height={it.height} onClick={()=>setSelectedId(it.id)} draggable onDragEnd={(e)=>updateItem(it.id,{x:e.target.x(), y:e.target.y()})} />;
                } else return null;
              })}
            </Layer>
          </Stage>
        </div>
      </section>
    </div>
  );
}
