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

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["content", "name"],
        childList: true,
        subtree: true,
    });
    return observer;
}
