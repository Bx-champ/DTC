import React, { useEffect, useRef, useState } from "react";

/*
LeftPalette props:
 - open: boolean
 - onClose: () => void
 - selected: the selected element object (or null)
 - onChangeFill(hexOrTransparent)
 - onChangeStroke(hex)
 - onChangeStrokeWidth(n)
*/
export default function LeftPalette({ open = false, onClose = () => {}, selected = null, onChangeFill = () => {}, onChangeStroke = () => {}, onChangeStrokeWidth = () => {} }) {
  const panelWidth = 280; // fixed width reserved on left
  const [fillHex, setFillHex] = useState("#ffffff");
  const [strokeHex, setStrokeHex] = useState("#000000");
  const [strokeW, setStrokeW] = useState(2);
  const [isTransparent, setIsTransparent] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const f = selected.fill ?? "";
    const s = selected.stroke ?? "#000000";
    setIsTransparent(f === "transparent");
    setFillHex(f && f !== "transparent" ? f : "#ffffff");
    setStrokeHex(s || "#000000");
    setStrokeW(typeof selected.strokeWidth === "number" ? selected.strokeWidth : 2);
  }, [selected]);

  useEffect(() => {
    // propagate changes when local values change
    if (!selected) return;
    if (isTransparent) {
      onChangeFill("transparent");
    } else {
      onChangeFill(fillHex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillHex, isTransparent]);

  useEffect(() => {
    if (!selected) return;
    onChangeStroke(strokeHex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeHex]);

  useEffect(() => {
    if (!selected) return;
    onChangeStrokeWidth(strokeW);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeW]);

  return (
    <>
      {/* a left spacer that reserves space so center preview never shifts — width present even when closed */}
      <div style={{ width: panelWidth, flex: "0 0 auto" }} />

      {/* the actual sliding panel (positioned absolute within the left reserved column) */}
      <div
        className={`left-palette ${open ? "left-palette--open" : "left-palette--closed"}`}
        style={{
          width: panelWidth,
          left: 0
        }}
        aria-hidden={!open}
      >
        <div className="lp-header">
          <div style={{ fontWeight: 700 }}>Colors</div>
          <button className="lp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="lp-body">
          <div style={{ marginBottom: 10, color: "#475569" }}>Fill</div>
          <div className="lp-wheel-placeholder" aria-hidden>
            {/* A real color wheel can be plugged in here later — placeholder circle */}
            <div className="lp-wheel-circle" />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input className="lp-hex" value={isTransparent ? "" : fillHex} placeholder="#RRGGBB" onChange={(e) => setFillHex(e.target.value)} />
            <button className={`btn ${isTransparent ? "active" : ""}`} onClick={() => setIsTransparent(v => !v)}>{isTransparent ? "Transparent ✓" : "Transparent"}</button>
          </div>

          <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #eef2f6" }} />

          <div style={{ marginBottom: 8, color: "#475569" }}>Border</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={strokeHex} onChange={(e) => setStrokeHex(e.target.value)} />
            <input className="lp-hex" value={strokeHex} onChange={(e) => setStrokeHex(e.target.value)} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Border width</div>
            <input type="range" min={0} max={20} value={strokeW} onChange={(e) => setStrokeW(Number(e.target.value))} />
            <div style={{ fontSize: 12, color: "#475569" }}>{strokeW}px</div>
          </div>
        </div>

        <div className="lp-footer">
          <small style={{ color: "#64748b" }}>Palette slides in when element selected</small>
        </div>
      </div>
    </>
  );
}
