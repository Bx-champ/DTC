// src/components/CanvasWithToolbar.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import LeftToolbar from "./LeftToolbar";
import { Stage, Layer, Rect, Text, Image as KImage, Transformer, Line, Ellipse } from "react-konva";
import useImage from "use-image";
import DraggableToolbar from "./DraggableToolbar";
import ColorPalette from "./ColorPalette";

function KonvaImage({ src, ...props }) {
  const [img] = useImage(src, "anonymous");
  return <KImage image={img} {...props} />;
}

function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function CanvasWithToolbar() {
  const containerRef = useRef(null);
  const previewRef = useRef(null);
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const trRef = useRef(null);

  const editingRef = useRef(false);

  // Preview size (smaller, no scroll). You can tweak these values.
  const [previewSize, setPreviewSize] = useState({ width: 1100, height: 700 });

  // track fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [toolbarPos, setToolbarPos] = useState({ x: 24, y: 24 });
  const [toolbarSize, setToolbarSize] = useState({ width: 220, height: 58 });
  const onToolbarResize = useCallback((s) => {
    setToolbarSize(prev => {
      if (!prev || prev.width !== s.width || prev.height !== s.height) return s;
      return prev;
    });
  }, []);

  const [leftToolbarOpen, setLeftToolbarOpen] = useState(false);

  // items
  const [items, setItems] = useState([
    { id: "rect-1", type: "rect", x: 120, y: 80, width: 260, height: 140, fill: "#60A5FA", stroke: "#0f172a", strokeWidth: 2, rotation: 0 },
    { id: "text-1", type: "text", x: 420, y: 90, text: "Double-click to edit. Resize box to wrap. Corners keep ratio.", fontSize: 20, fill: "#111", stroke: undefined, strokeWidth: 0, width: 340 }
  ]);

  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState("select");
  const drawingRef = useRef({ active: false, tool: null, id: null });

  // adjust stage when preview size or fullscreen changes
  const [stageSize, setStageSize] = useState({ width: previewSize.width, height: previewSize.height });

  useEffect(() => {
    if (isFullscreen) {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    } else {
      setStageSize({ width: previewSize.width, height: previewSize.height });
    }
  }, [previewSize, isFullscreen]);

  // keep preview centered on resize for a nicer layout
  useEffect(() => {
    const onResize = () => {
      if (!isFullscreen) {
        // optionally clamp preview size if viewport is smaller
        const maxW = Math.max(600, Math.min(window.innerWidth - 80, 1400));
        const maxH = Math.max(400, Math.min(window.innerHeight - 160, 900));
        setPreviewSize(prev => ({ width: Math.min(prev.width, maxW), height: Math.min(prev.height, maxH) }));
        setStageSize({ width: Math.min(previewSize.width, maxW), height: Math.min(previewSize.height, maxH) });
      } else {
        setStageSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  // cursor change for draw tools
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (tool === "line" || tool === "pencil") {
      el.style.cursor = "crosshair";
    } else {
      el.style.cursor = "default";
    }
  }, [tool]);

  const updateItem = (id, patch) => setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  /* creation helpers */
  const addRect = (x = 200, y = 200) => {
    const id = uid("rect-");
    setItems(prev => [...prev, { id, type: "rect", x, y, width: 200, height: 120, fill: "#F97316", stroke: "#0f172a", strokeWidth: 2, rotation: 0 }]);
    setSelectedId(id);
    setTool("select");
  };

  const addText = (x = 260, y = 260) => {
    const id = uid("text-");
    setItems(prev => [...prev, { id, type: "text", x, y, text: "New text (double-click to edit)", fontSize: 18, fill: "transparent", stroke: "#000000", strokeWidth: 0, width: 240 }]);
    setSelectedId(id);
    setTool("select");
    setTimeout(() => openTextEditorById(id), 60);
  };

  const addImageFromUrl = async (x = 300, y = 300) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result;
          const id = uid("img-");
          setItems(prev => [...prev, { id, type: "image", x, y, width: 240, height: 160, src, stroke: "#0f172a", strokeWidth: 2 }]);
          setSelectedId(id);
          setTool("select");
        };
        reader.readAsDataURL(file);
      } else {
        const url = prompt("Image URL (CORS-enabled recommended)");
        if (url) {
          const id = uid("img-");
          setItems(prev => [...prev, { id, type: "image", x, y, width: 240, height: 160, src: url, stroke: "#0f172a", strokeWidth: 2 }]);
          setSelectedId(id);
          setTool("select");
        }
      }
    };
    input.click();
  };

  const addCircle = (x = 300, y = 200) => {
    const id = uid("circ-");
    const radius = 60;
    setItems(prev => [...prev, { id, type: "ellipse", x, y, radiusX: radius, radiusY: radius, fill: "#8b5cf6", stroke: "#0f172a", strokeWidth: 2, rotation: 0 }]);
    setSelectedId(id);
    setTool("select");
  };

  /* Line & pencil */
  const startLine = (x, y) => {
    const id = uid("line-");
    const item = { id, type: "line", points: [x, y, x, y], stroke: "#0f172a", strokeWidth: 3, hitStrokeWidth: 14 };
    setItems(prev => [...prev, item]);
    drawingRef.current = { active: true, tool: "line", id };
    setSelectedId(id);
  };
  const updateLine = (id, x, y) => setItems(prev => prev.map(it => it.id === id ? { ...it, points: [it.points[0], it.points[1], x, y] } : it));
  const finishLine = () => { drawingRef.current = { active: false, tool: null, id: null }; };

  const startPencil = (x, y) => {
    const id = uid("p-");
    const item = { id, type: "pencil", points: [x, y], stroke: "#111827", strokeWidth: 2, tension: 0.2, lineCap: "round", lineJoin: "round", hitStrokeWidth: 14 };
    setItems(prev => [...prev, item]);
    drawingRef.current = { active: true, tool: "pencil", id };
    setSelectedId(id);
  };
  const updatePencil = (id, x, y) => setItems(prev => prev.map(it => it.id === id ? { ...it, points: [...it.points, x, y] } : it));
  const finishPencil = () => { drawingRef.current = { active: false, tool: null, id: null }; };

  /* Inline text editor (same as before) */
  const openTextEditorById = (id) => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    const textNode = layer.findOne(`#${id}`);
    if (!textNode) return;
    editingRef.current = true;
    const absPos = textNode.getAbsolutePosition();
    const containerRect = stage.container().getBoundingClientRect();
    const area = document.createElement("textarea");
    area.value = textNode.text();
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
    area.style.borderRadius = "4px";
    area.style.background = "white";
    area.style.zIndex = 9999;
    area.style.outline = "none";
    area.style.resize = "vertical";
    area.spellcheck = false;
    document.body.appendChild(area);
    area.selectionStart = area.selectionEnd = area.value.length;
    area.focus();
    const onAreaKeyDown = (ev) => {
      ev.stopPropagation();
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault(); commit();
      } else if (ev.key === "Escape") { ev.preventDefault(); cancel(); }
    };
    const onAreaBlur = () => commit();
    const commit = () => { const newVal = area.value; setItems(prev => prev.map(it => it.id === id ? { ...it, text: newVal } : it)); cleanup(); };
    const cancel = () => cleanup();
    const cleanup = () => {
      editingRef.current = false;
      try { area.removeEventListener("keydown", onAreaKeyDown, true); } catch(e) {}
      try { area.removeEventListener("blur", onAreaBlur); } catch(e) {}
      if (area && area.parentNode) area.parentNode.removeChild(area);
      setSelectedId(id);
    };
    area.addEventListener("keydown", onAreaKeyDown, true);
    area.addEventListener("blur", onAreaBlur);
    area.addEventListener("mousedown", (ev) => ev.stopPropagation());
  };

  /* Stage handlers */
  const handleStageMouseDown = (e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const { x, y } = pointer;
    if (tool === "line") {
      if (!drawingRef.current.active) startLine(x, y);
      else { const id = drawingRef.current.id; updateLine(id, x, y); finishLine(); }
      return;
    }
    if (tool === "pencil") { startPencil(x, y); return; }
    if (tool === "circle") { addCircle(x, y); return; }
    if (tool === "select") {
      if (e.target === stage) { setSelectedId(null); return; }
    } else {
      if (e.target === stage) setSelectedId(null);
    }
  };

  const handleStageMouseMove = (e) => {
    if (!drawingRef.current.active) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const { x, y } = pos;
    const id = drawingRef.current.id;
    if (drawingRef.current.tool === "line") updateLine(id, x, y);
    if (drawingRef.current.tool === "pencil") updatePencil(id, x, y);
  };

  const handleStageMouseUp = (e) => {
    if (!drawingRef.current.active) return;
    if (drawingRef.current.tool === "pencil") finishPencil();
  };

  /* Transformer handling (same as before) */
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const onTransformStart = () => {
      try {
        const active = tr.getActiveAnchor();
        if (!active) return;
        const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];
        tr.keepRatio(corners.includes(active));
      } catch (e) {}
    };
    tr.on("transformstart", onTransformStart);
    return () => tr.off("transformstart", onTransformStart);
  }, []);

  const onTransformEndNode = (node, it) => {
    if (!node || !it) return;
    if (it.type === "text") {
      const newWidth = Math.max(20, Math.round(node.width() * node.scaleX()));
      updateItem(it.id, { x: node.x(), y: node.y(), width: newWidth });
      node.width(newWidth); node.scaleX(1); node.scaleY(1); return;
    }
    if (it.type === "rect" || it.type === "image") {
      const newW = Math.max(5, Math.round(node.width() * node.scaleX()));
      const newH = Math.max(5, Math.round(node.height() * node.scaleY()));
      updateItem(it.id, { x: node.x(), y: node.y(), rotation: node.rotation ? node.rotation() : 0, width: newW, height: newH });
      node.scaleX(1); node.scaleY(1); return;
    }
    if (it.type === "ellipse") {
      const rX = Math.max(2, Math.round(node.radiusX() * node.scaleX()));
      const rY = Math.max(2, Math.round(node.radiusY() * node.scaleY()));
      updateItem(it.id, { x: node.x(), y: node.y(), radiusX: rX, radiusY: rY, rotation: node.rotation ? node.rotation() : 0 });
      node.scaleX(1); node.scaleY(1); return;
    }
    if (it.type === "line" || it.type === "pencil") {
      const scaleX = node.scaleX(), scaleY = node.scaleY();
      const box = node.getClientRect({ skipStroke: false });
      if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) { node.scaleX(1); node.scaleY(1); return; }
      setItems(prev => prev.map(itm => {
        if (itm.id !== it.id) return itm;
        if (!itm.points || itm.points.length === 0) return itm;
        const newPoints = [];
        for (let i = 0; i < itm.points.length; i += 2) {
          const px = itm.points[i]; const py = itm.points[i + 1];
          const relX = px - box.x; const relY = py - box.y;
          const scaledX = box.x + relX * scaleX; const scaledY = box.y + relY * scaleY;
          newPoints.push(Math.round(scaledX), Math.round(scaledY));
        }
        return { ...itm, points: newPoints };
      }));
      node.scaleX(1); node.scaleY(1); return;
    }
  };

  useEffect(() => {
    const tr = trRef.current; const layer = layerRef.current;
    if (!tr || !layer) return;
    const handleTransformEnd = () => {
      const nodes = tr.nodes(); if (!nodes || nodes.length === 0) return;
      const node = nodes[0]; const it = items.find(i => i.id === node.id()); if (!it) return;
      onTransformEndNode(node, it);
    };
    tr.on("transformend", handleTransformEnd);
    return () => tr.off("transformend", handleTransformEnd);
  }, [selectedId, items]);

  useEffect(() => {
    const tr = trRef.current; const layer = layerRef.current;
    if (!tr || !layer) return;
    if (selectedId) {
      const node = layer.findOne(`#${selectedId}`);
      if (node) { tr.nodes([node]); tr.getLayer().batchDraw(); }
      else { tr.nodes([]); tr.getLayer().batchDraw(); }
    } else { tr.nodes([]); tr.getLayer().batchDraw(); }
  }, [selectedId, items]);

  // global delete/backspace (do not delete while editing)
  useEffect(() => {
    const onKeyDown = (ev) => {
      if (editingRef.current) return;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        if (selectedId) { setItems(prev => prev.filter(i => i.id !== selectedId)); setSelectedId(null); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  /* rendering helpers */
  const commonProps = (it) => ({
    id: it.id,
    x: it.x,
    y: it.y,
    draggable: selectedId === it.id,
    onDragEnd: (e) => updateItem(it.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }),
    onClick: (e) => { if (tool === "select") { setSelectedId(it.id); setTool("select"); } },
    onTap: (e) => { if (tool === "select") { setSelectedId(it.id); setTool("select"); } },
    listening: true
  });

  const renderItem = (it) => {
    const strokeVal = (typeof it.stroke !== "undefined") ? it.stroke : undefined;
    const strokeW = it.strokeWidth || 0;

    if (it.type === "rect") {
      return <Rect key={it.id} {...commonProps(it)} width={it.width} height={it.height} fill={it.fill === "transparent" ? undefined : it.fill} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (it.type === "text") {
      return <Text key={it.id} {...commonProps(it)} text={it.text} fontSize={it.fontSize} fill={it.fill === "transparent" ? undefined : it.fill} stroke={strokeVal} strokeWidth={strokeW} width={it.width} wrap="word" onDblClick={() => openTextEditorById(it.id)} />;
    }
    if (it.type === "image") {
      return <KonvaImage key={it.id} {...commonProps(it)} src={it.src} width={it.width} height={it.height} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (it.type === "ellipse") {
      return <Ellipse key={it.id} {...commonProps(it)} radiusX={it.radiusX} radiusY={it.radiusY} fill={it.fill === "transparent" ? undefined : it.fill} stroke={strokeVal} strokeWidth={strokeW} />;
    }
    if (it.type === "line") {
      return <Line key={it.id} {...commonProps(it)} points={it.points} stroke={it.stroke || "#000"} strokeWidth={it.strokeWidth || 3} hitStrokeWidth={it.hitStrokeWidth || 14} />;
    }
    if (it.type === "pencil") {
      return <Line key={it.id} {...commonProps(it)} points={it.points} stroke={it.stroke || "#000"} strokeWidth={it.strokeWidth || 2} tension={it.tension} lineCap={it.lineCap} lineJoin={it.lineJoin} hitStrokeWidth={it.hitStrokeWidth || 14} />;
    }
    return null;
  };

  // color handlers wired to palette
  const handleFillChange = (val) => { if (!selectedId) return; updateItem(selectedId, { fill: val }); };
  const handleStrokeChange = (val) => { if (!selectedId) return; updateItem(selectedId, { stroke: val }); };
  const handleStrokeWidthChange = (n) => { if (!selectedId) return; updateItem(selectedId, { strokeWidth: n }); };

  /* tool selection */
  const onToolSelect = (t) => {
    setTool(t);
    if (t === "rect") addRect(Math.round(stageSize.width / 2 - 100), Math.round(stageSize.height / 2 - 60));
    if (t === "text") addText(Math.round(stageSize.width / 2 - 120), Math.round(stageSize.height / 2 - 10));
    if (t === "image") addImageFromUrl(Math.round(stageSize.width / 2 - 120), Math.round(stageSize.height / 2 - 40));
    if (t === "circle") addCircle(Math.round(stageSize.width / 2), Math.round(stageSize.height / 2));
  };

  const handleToolSelectFromLeft = (toolName) => {
    const closeOnSelect = ["rect", "text", "image", "circle"];
    if (closeOnSelect.includes(toolName)) setLeftToolbarOpen(false);
    onToolSelect(toolName);
  };

  /* fullscreen toggle */
  const toggleFullscreen = async () => {
    const el = previewRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen API failed", e);
    }
  };

  // react to fullscreen change (user may press ESC)
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const transformerAnchors = ["top-left","top-center","top-right","middle-right","bottom-right","bottom-center","bottom-left","middle-left"];

  return (
    <div ref={containerRef} className="app-canvas-shell" style={{ position: "relative", minHeight: "100vh", background: "#f3f4f6", padding: 18 }}>
      {/* TOP color palette toolbar (non obstructive) */}
      <ColorPalette
        selected={items.find(it => it.id === selectedId) || null}
        onChangeFill={handleFillChange}
        onChangeStroke={handleStrokeChange}
        onChangeStrokeWidth={handleStrokeWidthChange}
      />

      {/* Left drawer toggle */}
      <button className="left-toolbar-toggle" onClick={() => setLeftToolbarOpen(v => !v)} style={{ position: "fixed", left: 18, top: 86, zIndex: 90 }}>
        {leftToolbarOpen ? "Close Tools" : "Tools"}
      </button>

      <LeftToolbar open={leftToolbarOpen} onClose={() => setLeftToolbarOpen(false)} onToolSelect={handleToolSelectFromLeft} currentTool={tool} />

      {/* Floating draggable toolbar */}
      <DraggableToolbar parentRef={containerRef} pos={toolbarPos} onPositionChange={setToolbarPos} onSizeChange={onToolbarResize} onToolSelect={onToolSelect} currentTool={tool} />

      {/* Preview area centered */}
      <div className="preview-wrap" style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 18 }}>
        <div ref={previewRef} className="preview-area" style={{ width: previewSize.width, height: previewSize.height, background: "#ffffff", borderRadius: 10, boxShadow: "0 6px 20px rgba(2,6,23,0.08)", position: "relative", overflow: "hidden" }}>
          {/* fullscreen toggle */}
          <div style={{ position: "absolute", right: 12, top: 12, zIndex: 70, display: "flex", gap: 8 }}>
            <button className="btn" onClick={toggleFullscreen}>{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</button>
            <div style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>Tool: <strong style={{ color: "#0f172a" }}>{tool}</strong></div>
          </div>

          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            style={{ background: "#fff", display: "block" }}
          >
            <Layer ref={layerRef}>
              {items.map(it => renderItem(it))}
              <Transformer ref={trRef} enabledAnchors={transformerAnchors} rotateEnabled={true} keepRatio={false} boundBoxFunc={(oldBox, newBox) => { if (newBox.width < 6 || newBox.height < 6) return oldBox; return newBox; }} />
            </Layer>
          </Stage>
        </div>
      </div>

      {/* bottom toolbar */}
      <div style={{ position: "fixed", bottom: 18, left: 18, display: "flex", gap: 8, zIndex: 40 }}>
        <button className="btn" onClick={() => onToolSelect("select")}>Select</button>
        <button className="btn" onClick={() => onToolSelect("rect")}>Rect</button>
        <button className="btn" onClick={() => onToolSelect("text")}>Text</button>
        <button className="btn" onClick={() => onToolSelect("image")}>Image</button>
        <button className="btn" onClick={() => onToolSelect("circle")}>Circle</button>
        <button className="btn" onClick={() => onToolSelect("line")}>Line Mode</button>
        <button className="btn" onClick={() => onToolSelect("pencil")}>Pencil Mode</button>
      </div>
    </div>
  );
}
