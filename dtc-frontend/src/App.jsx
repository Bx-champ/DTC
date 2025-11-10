// import React from "react";
// import CanvasWithToolbar from "./components/CanvasWithToolbar";
// // import DraggableToolbar from "./components/DraggableToolbar";


// export default function App() {
//   return (
//     <div className="app-root">
//       <header className="app-header">
//         <h1>Design → Code — Canvas + Draggable Toolbar</h1>
//       </header>

//       <main className="app-main">
//         <CanvasWithToolbar />
//         {/* <DraggableToolbar /> */}
//       </main>
//     </div>
//   );
// }




import React from "react";
import CanvasWithPanels from "./components/CanvasWithPanels";

export default function App() {
  return (
    <div className="app-shell">
      <CanvasWithPanels />
    </div>
  );
}
