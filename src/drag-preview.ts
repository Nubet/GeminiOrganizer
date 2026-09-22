export function setSingleChatDragImage(event: DragEvent, label: string, source: HTMLElement): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;

    const preview = document.createElement("div");
    preview.textContent = label;
    preview.style.cssText = [
        "position:fixed",
        "top:-1000px",
        "left:-1000px",
        "width:260px",
        "padding:8px 12px",
        "overflow:hidden",
        "border:1px solid rgba(128,128,128,.35)",
        "border-radius:8px",
        "background:#fff",
        "color:#202124",
        'font:14px "Google Sans","Segoe UI",sans-serif',
        "white-space:nowrap",
        "text-overflow:ellipsis",
        "pointer-events:none",
    ].join(";");

    document.body.appendChild(preview);
    dataTransfer.setDragImage(preview, 12, 12);
    source.addEventListener("dragend", () => preview.remove(), { once: true });
}
