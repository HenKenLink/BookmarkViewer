import "./style.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("[Content Script] Notification overlay ready");

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "show-notification") {
        showOverlay(message.text, message.status, message.url);
      }
    });

    function showOverlay(text: string, status: "loading" | "success" | "error", url?: string) {
      let overlay = document.getElementById("bookmark-viewer-notification");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "bookmark-viewer-notification";
        document.body.appendChild(overlay);
      }

      const colors = {
        loading: "#2196f3",
        success: "#4caf50",
        error: "#f44336",
      };

      overlay.innerHTML = `
        <span class="bv-notif-text">${text}</span>
        ${url ? `<span class="bv-notif-url" title="${url}">${url}</span>` : ""}
      `;
      overlay.style.backgroundColor = colors[status];
      overlay.classList.add("bv-show");
      overlay.style.display = "flex";

      if (status !== "loading") {
        setTimeout(() => {
          if (overlay) {
            overlay.classList.remove("bv-show");
            setTimeout(() => {
              if (overlay) overlay.style.display = "none";
            }, 400);
          }
        }, 3500);
      }
    }
  },
});
