// src/components/ColorPalette.jsx
import React, { useEffect, useState } from "react";

/*
Compact top color toolbar with Advanced panel.
Props:
 - selected: selected item object or null
 - onChangeFill(val)
 - onChangeStroke(val)
 - onChangeStrokeWidth(n)
 - presets: optional color presets
*/

export default function ColorPalette({
  selected,
  onChangeFill = () => {},
  onChangeStroke = () => {},
  onChangeStrokeWidth = () => {},
  presets = ["#111827", "#0ea5e9", "#60a5fa", "#f97316", "#ef4444", "#10b981", "#a78bfa"]
}) {
  const [fillHex, setFillHex] = useState("#ffffff");
  const [strokeHex, setStrokeHex] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isFillTransparent, setIsFillTransparent] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // sync when selection changes
  useEffect(() => {
    if (!selected) return;
    const f = selected.fill ?? "#ffffff";
    const s = selected.stroke ?? "#000000";
    setIsFillTransparent(f === "transparent");
    setFillHex(f === "transparent" ? "#ffffff" : (f || "#ffffff"));
    setStrokeHex(s || "#000000");
    setStrokeWidth(typeof selected.strokeWidth === "number" ? selected.strokeWidth : 2);
  }, [selected]);

  // small helpers
  const applyFill = (val, transparent = false) => {
    setIsFillTransparent(transparent);
    setFillHex(val ?? "#ffffff");
    const out = transparent ? "transparent" : (val || "#ffffff");
    onChangeFill(out);
  };

  const applyStroke = (val) => {
    setStrokeHex(val);
    onChangeStroke(val);
  };

  const applyStrokeWidth = (n) => {
    setStrokeWidth(n);
    onChangeStrokeWidth(n);
  };

  // top-bar compact layout (when nothing selected shows neutral state)
  return (
    <>
      <div className="cp-topbar" role="toolbar" aria-label="Color toolbar">
        <div className="cp-left">
          <div className="cp-label">Color</div>
          <div className="cp-mini">
            <div className="cp-mini-block">
              <div className="cp-mini-title">Fill</div>
              <button
                className="cp-swatch-btn"
                onClick={() => {
                  if (!selected) return;
                  applyFill(fillHex, false);
                  setAdvancedOpen(v => !v);
                }}
                title={selected ? "Open Fill panel" : "Select an object"}
                style={{ background: isFillTransparent ? "repeating-conic-gradient(#fff 0 10px,#ddd 0 20px)" : fillHex }}
              />
              <input
                className="cp-mini-hex"
                placeholder="#RRGGBB"
                value={isFillTransparent ? "" : fillHex || ""}
                onChange={(e) => {
                  setFillHex(e.target.value);
                  if (/^#([0-9A-Fa-f]{6})$/.test(e.target.value)) applyFill(e.target.value, false);
                }}
                title="Type hex and press enter"
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && /^#([0-9A-Fa-f]{6})$/.test(fillHex)) applyFill(fillHex, false);
                }}
              />
              <button
                className={`cp-mini-trans ${isFillTransparent ? "active" : ""}`}
                onClick={() => { if (!selected) return; applyFill("", !isFillTransparent); }}
                title="Toggle transparent fill"
              >
                {isFillTransparent ? "Transparent ✓" : "Transparent"}
              </button>
            </div>

            <div className="cp-mini-block" style={{ marginLeft: 12 }}>
              <div className="cp-mini-title">Border</div>
              <button
                className="cp-swatch-btn"
                onClick={() => { if (!selected) return; setAdvancedOpen(v => !v); }}
                style={{ background: strokeHex }}
                title={selected ? "Open Border panel" : "Select an object"}
              />
              <input
                className="cp-mini-hex"
                placeholder="#RRGGBB"
                value={strokeHex || ""}
                onChange={(e) => {
                  setStrokeHex(e.target.value);
                  if (/^#([0-9A-Fa-f]{6})$/.test(e.target.value)) applyStroke(e.target.value);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && /^#([0-9A-Fa-f]{6})$/.test(strokeHex)) applyStroke(strokeHex);
                }}
              />
              <input
                type="range"
                min="0"
                max="20"
                value={strokeWidth}
                onChange={(e) => applyStrokeWidth(Number(e.target.value))}
                className="cp-mini-range"
                title="Border width"
              />
              <span className="cp-mini-range-val">{strokeWidth}px</span>
            </div>
          </div>
        </div>

        <div className="cp-right">
          <button className="cp-adv-btn" onClick={() => setAdvancedOpen(v => !v)} title="Open advanced color panel">
            {advancedOpen ? "Close" : "Advanced"}
          </button>
        </div>
      </div>

      {/* Advanced floating panel (top) */}
      {advancedOpen && (
        <div className="cp-advanced" role="dialog" aria-label="Advanced color panel">
          <div className="cp-advanced-col">
            <div className="cp-advanced-title">Fill</div>
            <input
              type="color"
              className="cp-advanced-wheel"
              value={fillHex}
              onChange={(e) => {
                setFillHex(e.target.value);
                applyFill(e.target.value, false);
              }}
              title="Pick fill color (color wheel available on most browsers)"
            />
            <div className="cp-adv-row">
              <input
                className="cp-hex-input"
                value={isFillTransparent ? "" : (fillHex || "")}
                placeholder="#RRGGBB"
                onChange={(e) => {
                  setFillHex(e.target.value);
                  if (/^#([0-9A-Fa-f]{6})$/.test(e.target.value)) applyFill(e.target.value, false);
                }}
              />
              <button className={`cp-trans-btn ${isFillTransparent ? "active" : ""}`} onClick={() => applyFill("", !isFillTransparent)}>
                {isFillTransparent ? "Transparent ✓" : "Transparent"}
              </button>
            </div>
            <div className="cp-presets">
              {presets.map(p => (
                <button key={p} className="cp-swatch" style={{ background: p }} onClick={() => applyFill(p, false)} />
              ))}
            </div>
          </div>

          <div className="cp-advanced-col">
            <div className="cp-advanced-title">Border</div>
            <input
              type="color"
              className="cp-advanced-wheel"
              value={strokeHex || "#000000"}
              onChange={(e) => applyStroke(e.target.value)}
            />
            <div className="cp-adv-row">
              <input
                className="cp-hex-input"
                value={strokeHex || ""}
                placeholder="#RRGGBB"
                onChange={(e) => {
                  setStrokeHex(e.target.value);
                  if (/^#([0-9A-Fa-f]{6})$/.test(e.target.value)) applyStroke(e.target.value);
                }}
              />
              <div className="cp-strokewrap">
                <input type="range" min="0" max="24" value={strokeWidth} onChange={(e) => applyStrokeWidth(Number(e.target.value))} />
                <span style={{ marginLeft: 8 }}>{strokeWidth}px</span>
              </div>
            </div>
            <div className="cp-presets">
              {presets.map(p => (
                <button key={p + "-b"} className="cp-swatch" style={{ background: p }} onClick={() => applyStroke(p)} />
              ))}
            </div>
          </div>

          <div className="cp-advanced-actions">
            <button className="btn" onClick={() => {
              if (!selected) return;
              applyFill("#ffffff", false);
              applyStroke("#000000");
              applyStrokeWidth(2);
            }}>Reset</button>
            <button className="btn cp-close" onClick={() => setAdvancedOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}
