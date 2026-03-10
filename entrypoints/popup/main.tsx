import { createRoot } from "react-dom/client";
import App from "./App";

const ROOT_NODE = document.getElementById("root")!;

createRoot(ROOT_NODE).render(<App />);
