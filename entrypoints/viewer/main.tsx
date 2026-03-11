import { createRoot } from "react-dom/client";
import App from "./App";
// import App from "./examples/navigate";

const ROOT_NODE = document.getElementById("root")!;

createRoot(ROOT_NODE).render(<App />);
