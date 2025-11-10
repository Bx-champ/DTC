import React from "react";

/*
 LeftToolbar

 Props:
  - open: boolean (controls visible state)
  - onClose: () => void
  - onToolSelect: (toolName) => void
  - currentTool: string
*/

export default function LeftToolbar({ open = false, onClose = () => {}, onToolSelect = () => {}, currentTool = "select" }) {
  const tools = [
    { id: "select", label: "Select" },
    { id: "rect", label: "Rectangle" },
    { id: "text", label: "Text" },
    { id: "image", label: "Image" },
    { id: "circle", label: "Circle" },
    { id: "line", label: "Line" },
    { id: "pencil", label: "Pencil" }
  ];

  return (
    <>
      {/* backdrop to close panel when clicking outside */}
      <div
        aria-hidden={!open}
        className={`lt-backdrop ${open ? "lt-backdrop--show" : ""}`}
        onClick={onClose}
      />

      <aside className={`left-toolbar ${open ? "left-toolbar--open" : ""}`} role="navigation" aria-hidden={!open}>
        <div className="lt-header">
          <div style={{ fontWeight: 700 }}>Tools</div>
          <button aria-label="Close toolbar" className="lt-close" onClick={onClose}>✕</button>
        </div>

        <div className="lt-tools">
          {tools.map(t => {
            const active = currentTool === t.id;
            return (
              <button
                key={t.id}
                className={`lt-tool-btn ${active ? "active" : ""}`}
                onClick={() => {
                  onToolSelect(t.id);
                }}
                title={t.label}
              >
                <div className="lt-tool-icon" aria-hidden>
                  {/* simple icon glyphs — replace with real icons if you want */}
                  {t.id === "select" && "↪"}
                  {t.id === "rect" && "▭"}
                  {t.id === "text" && "T"}
                  {t.id === "image" && "🖼"}
                  {t.id === "circle" && "◯"}
                  {t.id === "line" && "／"}
                  {t.id === "pencil" && "✎"}
                </div>
                <div className="lt-tool-label">{t.label}</div>
              </button>
            );
          })}
        </div>

        <div className="lt-footer">
          <small style={{ color: "#64748b" }}>Tip: double-click text to edit. Drag shapes to move.</small>
        </div>
      </aside>
    </>
  );
}
