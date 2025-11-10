import React, { useRef, useEffect, useCallback } from "react";

/*
 DraggableToolbar

 Props:
  - parentRef
  - pos
  - onPositionChange
  - onSizeChange
  - onToolSelect
  - currentTool
*/

export default function DraggableToolbar({
  parentRef,
  pos = { x: 0, y: 0 },
  onPositionChange = () => {},
  onSizeChange = () => {},
  onToolSelect = () => {},
  currentTool = "select"
}) {
  const rootRef = useRef(null);
  const draggingRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const lastSizeRef = useRef({ width: 0, height: 0 });

  const reportSize = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (lastSizeRef.current.width !== w || lastSizeRef.current.height !== h) {
      lastSizeRef.current = { width: w, height: h };
      try { onSizeChange({ width: w, height: h }); } catch (e) { console.warn(e); }
    }
  }, [onSizeChange]);

  useEffect(() => {
    reportSize();
    let ro;
    try {
      ro = new ResizeObserver(reportSize);
      if (rootRef.current) ro.observe(rootRef.current);
    } catch (e) {}
    return () => {
      if (ro && rootRef.current) ro.unobserve(rootRef.current);
    };
  }, [reportSize]);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const parent = parentRef?.current;
    const el = rootRef.current;
    if (!parent || !el) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    draggingRef.current.active = true;
    draggingRef.current.startX = e.clientX;
    draggingRef.current.startY = e.clientY;
    draggingRef.current.originX = (pos && typeof pos.x === "number") ? pos.x : 0;
    draggingRef.current.originY = (pos && typeof pos.y === "number") ? pos.y : 0;

    const onPointerMove = (ev) => {
      if (!draggingRef.current.active) return;
      ev.preventDefault();
      const dx = ev.clientX - draggingRef.current.startX;
      const dy = ev.clientY - draggingRef.current.startY;
      let newX = draggingRef.current.originX + dx;
      let newY = draggingRef.current.originY + dy;
      const maxX = Math.max(0, parentRect.width - elRect.width);
      const maxY = Math.max(0, parentRect.height - elRect.height);
      newX = Math.min(Math.max(0, newX), maxX);
      newY = Math.min(Math.max(0, newY), maxY);
      onPositionChange({ x: Math.round(newX), y: Math.round(newY) });
    };

    const onPointerUp = () => {
      if (draggingRef.current.active) {
        draggingRef.current.active = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: false });
  };

  const stopPropagation = (e) => e.stopPropagation();

  const left = (pos && typeof pos.x === "number") ? pos.x : 0;
  const top = (pos && typeof pos.y === "number") ? pos.y : 0;

  const ToolButton = ({ name, label }) => {
    const isActive = currentTool === name;
    return (
      <button
        onClick={(ev) => { ev.stopPropagation(); onToolSelect(name); }}
        title={label}
        style={{
          padding: "6px 8px",
          borderRadius: 6,
          border: isActive ? "2px solid #0369a1" : "1px solid rgba(0,0,0,0.06)",
          background: isActive ? "#e6f6ff" : "#fff",
          cursor: "pointer",
          fontSize: 13
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      className="toolbar-root"
      onPointerDown={stopPropagation}
      style={{ position: "absolute", left, top, touchAction: "none", zIndex: 30 }}
    >
      <div className="toolbar" onPointerDown={stopPropagation} style={{
        width: 320,
        background: "white",
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(12,18,30,0.12)",
        border: "1px solid rgba(15,23,42,0.06)"
      }}>
        <div
          className="toolbar-drag-handle"
          onPointerDown={handlePointerDown}
          title="Drag toolbar"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", cursor: "grab" }}
        >
          <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: "rgba(2,6,23,0.03)" }}>≡</div>
          <div style={{ fontWeight: 700 }}>Toolbar</div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: 10, flexWrap: "wrap" }}>
          <ToolButton name="select" label="Select" />
          <ToolButton name="rect" label="Rect" />
          <ToolButton name="text" label="Text" />
          <ToolButton name="image" label="Image" />
          <ToolButton name="circle" label="Circle" />
          <ToolButton name="line" label="Line" />
          <ToolButton name="pencil" label="Pencil" />
        </div>
      </div>
    </div>
  );
}
