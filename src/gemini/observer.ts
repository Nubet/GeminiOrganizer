export function observeGeminiDom(onChange: () => void): MutationObserver {
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            onChange();
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
}
