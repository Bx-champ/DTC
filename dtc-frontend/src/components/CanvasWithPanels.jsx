// CanvasWithPanels.jsx (updated)
// Inline text editing + prevent global delete while editing

import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Text, Image as KImage, Transformer, Line, Ellipse } from "react-konva";
import useImage from "use-image";
import LeftPalette from "./LeftPalette";
import RightLayers from "./RightLayers";
import BottomTools from "./BottomTools";
import { saveAs } from "file-saver";

/* minor Konva image wrapper */
function KonvaImage({ src, ...props }) {
  const [img] = useImage(src, "anonymous");
  return <KImage image={img} {...props} />;
}

function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/*
 Layout rules implemented:
 - Top header with logo "DesignToCode"
 - Canvas centered in a fixed preview container (no page scrolling)
 - Left sliding palette occupies fixed width to left of the preview and never overlaps canvas
 - Right layers panel sits to right of preview, lists layers top->bottom, supports drag reorder
 - Bottom tools bar sits under preview (outside the canvas) and doesn't overlap
*/

export default function CanvasWithPanels() {
  // refs for stage & transformer
  const stageRef = useRef();
  const layerRef = useRef();
  const trRef = useRef();

  // track whether we're editing text inline -> used to block global delete
  const editingRef = useRef(false);

  // preview size (fixed so no scrolling)
  const previewSize = { width: 1100, height: 700 };

  // scene items
  const [items, setItems] = useState([
    { id: "rect-1", type: "rect", x: 120, y: 80, width: 260, height: 140, fill: "#60A5FA", stroke: "#0f172a", strokeWidth: 2 },
    { id: "text-1", type: "text", x: 420, y: 90, text: "Double-click to edit", fontSize: 20, fill: "#111", width: 340 }
  ]);

  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState("select"); // select, rect, text, image, circle, line, pencil

  // left palette visibility is driven by whether an element is selected
  const paletteOpen = !!selectedId;

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("http://localhost:4000/api/export-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: items,
          canvasWidth: previewSize.width,  // <-- ADD THIS
          canvasHeight: previewSize.height // <-- ADD THIS
        }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      const blob = await res.blob();
      saveAs(blob, "design-export.zip");
    } catch (error) {
      console.error("Failed to generate code:", error);
      alert("Error generating code. See the console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  // helper to update an item
  const updateItem = (id, patch) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  // add helpers
  const addRect = (x = 200, y = 200) => {
    const id = uid("rect-");
    setItems(prev => [...prev, { id, type: "rect", x, y, width: 200, height: 120, fill: "#F97316", stroke: "#0f172a", strokeWidth: 2 }]);
    setSelectedId(id);
    setTool("select");
  };
  const addText = (x = 260, y = 260) => {
    const id = uid("text-");
    setItems(prev => [...prev, { id, type: "text", x, y, text: "New text", fontSize: 18, fill: "#111", width: 240 }]);
    setSelectedId(id);
    setTool("select");
    // open inline editor automatically after adding
    setTimeout(() => openTextEditorById(id), 40);
  };
  const addCircle = (x = 300, y = 200) => {
    const id = uid("circ-");
    setItems(prev => [...prev, { id, type: "ellipse", x, y, radiusX: 60, radiusY: 60, fill: "#8b5cf6", stroke: "#0f172a", strokeWidth: 2 }]);
    setSelectedId(id);
    setTool("select");
  };
  const addImageFromFile = (x = 300, y = 300) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = uid("img-");
        setItems(prev => [...prev, { id, type: "image", x, y, width: 240, height: 160, src: reader.result }]);
        setSelectedId(id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // drag & drop reorder from RightLayers
  const reorderItems = (newOrderIds) => {
    setItems(prev => {
      const map = new Map(prev.map(it => [it.id, it]));
      return newOrderIds.map(id => map.get(id)).filter(Boolean);
    });
  };

  // selection handlers & transformer attachment
  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer() && tr.getLayer().batchDraw();
      return;
    }
    const node = layer.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer() && tr.getLayer().batchDraw();
    } else {
      tr.nodes([]);
      tr.getLayer() && tr.getLayer().batchDraw();
    }
  }, [selectedId, items]);

  // delete key: delete selected (but not during inline editing)
  useEffect(() => {
    const onKey = (ev) => {
      if (editingRef.current) return; // DO NOT delete while editing text
      if (ev.key === "Backspace" || ev.key === "Delete") {
        if (selectedId) {
          setItems(prev => prev.filter(i => i.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // mouse handlers to support line/pencil later (for now keep simple)
//   const handleStageMouseDown = (e) => {
//     const stage = e.target.getStage();
//     if (!stage) return;
//     if (e.target === stage) {
//       setSelectedId(null);
//       return;
//     }
//   };

const handleStageMouseDown = (e) => {
  const stage = e.target.getStage();
  if (!stage) return;

  // If we're editing inline text, don't change selection
  if (editingRef.current) return;

  // If clicked the stage itself or our background rect (id="bg"), deselect
  const target = e.target;

  if (target === stage) {
    setSelectedId(null);
    return;
  }

  // If the clicked node is the background rect (id === 'bg')
  try {
    const tid = target && (target.id ? target.id() : (target.attrs && target.attrs.id));
    if (tid === "bg") {
      setSelectedId(null);
      return;
    }
  } catch (err) {
    // ignore errors reading id
  }

  // If clicked on the Transformer or one of its anchors, do nothing.
  // Walk up parent chain to detect a Transformer ancestor
  let p = target;
  while (p) {
    if (p.getClassName && (p.getClassName() === "Transformer" || p.className === "Transformer")) {
      // clicked transformer — keep selection
      return;
    }
    p = p.getParent ? p.getParent() : null;
  }

  // Otherwise, if clicked anywhere else (a shape), selection will be handled
  // by that shape's onClick handler which sets selectedId.
};


  // ---------- Inline text editor ----------
  // Important: create a textarea placed over the canvas at the Text node position.
  const openTextEditorById = (id) => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    const textNode = layer.findOne(`#${id}`);
    if (!textNode) return;

    // block global delete/backspace
    editingRef.current = true;

    // get absolute position of the text node and the stage container box
    const absPos = textNode.getAbsolutePosition();
    const containerRect = stage.container().getBoundingClientRect();

    // create textarea
    const area = document.createElement("textarea");
    area.value = textNode.text();

    // style area to visually match Konva text
    area.style.position = "absolute";
    area.style.top = `${Math.round(containerRect.top + absPos.y)}px`;
    area.style.left = `${Math.round(containerRect.left + absPos.x)}px`;
    area.style.minWidth = `${Math.max(80, textNode.width())}px`;
    area.style.minHeight = `${Math.max(24, textNode.height())}px`;
    area.style.fontSize = `${textNode.fontSize()}px`;
    area.style.lineHeight = "1.2";
    area.style.padding = "6px";
    area.style.margin = "0";
    area.style.border = "1px solid rgba(0,0,0,0.2)";
    area.style.borderRadius = "6px";
    area.style.background = "white";
    area.style.zIndex = 9999;
    area.style.outline = "none";
    area.style.resize = "vertical";
    area.spellcheck = false;
    area.style.fontFamily = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";

    // append and focus
    document.body.appendChild(area);
    area.selectionStart = area.selectionEnd = area.value.length;
    area.focus();

    // handlers
    const commit = () => {
      const newVal = area.value;
      setItems(prev => prev.map(it => it.id === id ? { ...it, text: newVal } : it));
      cleanup();
    };
    const cancel = () => {
      cleanup();
    };
    const cleanup = () => {
      editingRef.current = false;
      try { area.removeEventListener("keydown", onAreaKeyDown, true); } catch (e) {}
      try { area.removeEventListener("blur", onAreaBlur); } catch (e) {}
      if (area && area.parentNode) area.parentNode.removeChild(area);
      // restore selection on the text node
      setSelectedId(id);
    };

    // ensure key events don't bubble to window / Konva
    const onAreaKeyDown = (ev) => {
      ev.stopPropagation();
      // Ctrl/Cmd + Enter commits
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        commit();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancel();
      }
      // Enter alone -> newline (do not commit)
    };

    const onAreaBlur = () => commit();

    area.addEventListener("keydown", onAreaKeyDown, true);
    area.addEventListener("blur", onAreaBlur);
    // prevent mousedown on the textarea from reaching canvas / deselecting
    area.addEventListener("mousedown", (ev) => { ev.stopPropagation(); });

    // Make sure the textarea moves with window scroll / zoom adjustments (optional)
    // If user scrolls or zooms, we could reposition textarea; here we skip as page has no scroll.
  };

  // ---------- rendering helpers ----------
  const renderItem = (it) => {
    const common = {
      id: it.id,
      x: it.x,
      y: it.y,
      draggable: selectedId === it.id,
      onDragEnd: (e) => updateItem(it.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }),
      onClick: () => { if (tool === "select") setSelectedId(it.id); },
      onTap: () => { if (tool === "select") setSelectedId(it.id); }
    };

    if (it.type === "rect") {
      return <Rect key={it.id} {...common} width={it.width} height={it.height} fill={it.fill} stroke={it.stroke} strokeWidth={it.strokeWidth} />;
    }
    if (it.type === "text") {
      return (
        <Text
          key={it.id}
          {...common}
          text={it.text}
          fontSize={it.fontSize}
          fill={it.fill}
          width={it.width}
          onDblClick={() => openTextEditorById(it.id)} // <-- inline editor trigger
        />
      );
    }
    if (it.type === "image") {
      return <KonvaImage key={it.id} {...common} src={it.src} width={it.width} height={it.height} />;
    }
    if (it.type === "ellipse") {
      return <Ellipse key={it.id} {...common} radiusX={it.radiusX} radiusY={it.radiusY} fill={it.fill} stroke={it.stroke} strokeWidth={it.strokeWidth} />;
    }
    if (it.type === "line" || it.type === "pencil") {
      return <Line key={it.id} {...common} points={it.points} stroke={it.stroke} strokeWidth={it.strokeWidth || 2} />;
    }
    return null;
  };

  return (
    <div className="dtc-shell">
      <header className="dtc-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="dtc-logo">DesignToCode</div>

        <button
          className="btn"
          style={{ marginRight: 20 }}
          onClick={handleGenerateCode}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Code & ZIP"}
        </button>
      </header>

      <div className="dtc-main-row">
        {/* LEFT sliding palette (reserves left space and slides in) */}
        <LeftPalette
          open={paletteOpen}
          selected={items.find(i => i.id === selectedId) || null}
          onClose={() => setSelectedId(null)}
          onChangeFill={(val) => selectedId && updateItem(selectedId, { fill: val })}
          onChangeStroke={(val) => selectedId && updateItem(selectedId, { stroke: val })}
          onChangeStrokeWidth={(w) => selectedId && updateItem(selectedId, { strokeWidth: w })}
        />

        {/* CENTER preview (canvas) */}
        <div className="dtc-preview-wrap" style={{ width: previewSize.width }}>
          <div className="dtc-preview" style={{ width: previewSize.width, height: previewSize.height }}>
            <Stage
              width={previewSize.width}
              height={previewSize.height}
              ref={stageRef}
              onMouseDown={handleStageMouseDown}
              style={{ background: "#fff" }}
            >
              <Layer ref={layerRef}>
                {/* white background rectangle so shapes have contrast */}
                <Rect id="bg" x={0} y={0} width={previewSize.width} height={previewSize.height} fill="#fff" />
                {items.map(renderItem)}
                <Transformer ref={trRef} rotateEnabled={true} enabledAnchors={["top-left","top-center","top-right","middle-right","bottom-right","bottom-center","bottom-left","middle-left"]} />
              </Layer>
            </Stage>
          </div>

          {/* bottom tools (outside canvas, never overlaps) */}
          <div className="dtc-bottom-tools">
            <BottomTools
              currentTool={tool}
              onToolSelect={(t) => {
                setTool(t);
                if (t === "rect") addRect(previewSize.width / 2 - 100, previewSize.height / 2 - 60);
                if (t === "text") addText(previewSize.width / 2 - 120, previewSize.height / 2 - 10);
                if (t === "image") addImageFromFile(previewSize.width / 2 - 120, previewSize.height / 2 - 40);
                if (t === "circle") addCircle(previewSize.width / 2, previewSize.height / 2);
              }}
            />
          </div>
        </div>

        {/* RIGHT layers panel */}
        <RightLayers
          items={items}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onReorder={(newOrderIds) => reorderItems(newOrderIds)}
        />
      </div>
    </div>
  );
}
