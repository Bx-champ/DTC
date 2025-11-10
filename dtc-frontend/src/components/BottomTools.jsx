import React from "react";

export default function BottomTools({ currentTool = "select", onToolSelect = () => {} }) {
  const tools = [
    { id: "select", label: "Select" },
    { id: "rect", label: "Rect" },
    { id: "text", label: "Text" },
    { id: "image", label: "Image" },
    { id: "circle", label: "Circle" },
    { id: "line", label: "Line" },
    { id: "pencil", label: "Pencil" }
  ];

  return (
    <div className="bottom-tools">
      {tools.map(t => (
        <button
          key={t.id}
          className={`bt-tool ${currentTool === t.id ? "active" : ""}`}
          onClick={() => onToolSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
