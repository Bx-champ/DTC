import React, { useState, useEffect } from "react";

/*
Props:
 - items: array of items (top of array is top layer)
 - selectedId
 - onSelect(id)
 - onReorder(newOrderIds)
*/
export default function RightLayers({ items = [], selectedId = null, onSelect = () => {}, onReorder = () => {} }) {
  const [dragId, setDragId] = useState(null);
  const [localOrder, setLocalOrder] = useState(items.map(i => i.id));

  useEffect(() => {
    setLocalOrder(items.map(i => i.id));
  }, [items]);

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch (e) {}
  };

  const onDropTo = (e, targetId) => {
    e.preventDefault();
    const moving = dragId || e.dataTransfer.getData("text/plain");
    if (!moving) return;
    const arr = [...localOrder];
    const from = arr.indexOf(moving);
    const to = arr.indexOf(targetId);
    if (from === -1 || to === -1) return;
    arr.splice(from, 1);
    arr.splice(to, 0, moving);
    setLocalOrder(arr);
    onReorder(arr);
    setDragId(null);
  };

  const allowDrop = (e) => { e.preventDefault(); };

  return (
    <aside className="right-layers" role="navigation" aria-label="Layers panel">
      <div className="rl-header"><strong>Layers</strong></div>
      <div className="rl-list">
        {localOrder.map((id, idx) => {
          const it = items.find(i => i.id === id);
          if (!it) return null;
          // visually show top as first item (index 0)
          return (
            <div
              key={id}
              draggable
              onDragStart={(e) => onDragStart(e, id)}
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(e, id)}
              className={`rl-item ${selectedId === id ? "selected" : ""}`}
              onClick={() => onSelect(id)}
            >
              <div className="rl-item-handle">☰</div>
              <div className="rl-item-body">
                <div className="rl-item-title">{it.type} — {it.id}</div>
                <div className="rl-item-sub">x:{Math.round(it.x)} y:{Math.round(it.y)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rl-footer"><small style={{ color: "#64748b" }}>Drag to reorder (top = front)</small></div>
    </aside>
  );
}
