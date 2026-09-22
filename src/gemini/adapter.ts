import { selectors } from "./selectors";
import type { Folder, GeminiChat } from "../domain/types";

export function findChatsContainer(): HTMLElement | null {
    const section = document.querySelector<HTMLElement>(selectors.chatsSection);
    return section?.querySelector<HTMLElement>(selectors.chatsContainer) ?? null;
}

export function findChatsHeader(): HTMLElement | null {
    const section = document.querySelector<HTMLElement>(selectors.chatsSection);
    return section?.querySelector<HTMLElement>(selectors.header) ?? null;
}

export function readChats(): GeminiChat[] {
    return [...(findChatsContainer()?.querySelectorAll<HTMLAnchorElement>(selectors.chatLink) ?? [])]
        .map((link) => {
            const href = link.getAttribute("href");
            if (!href) return null;

            return {
                id: href,
                href,
                label: link.getAttribute("aria-label") || link.textContent?.trim() || href,
            } satisfies GeminiChat;
        })
        .filter((chat): chat is GeminiChat => chat !== null);
}

function setDragSource(link: HTMLAnchorElement, chatId: string): void {
    link.draggable = true;
    link.ondragstart = (event) => {
        event.stopPropagation();
        event.dataTransfer?.setData("text/plain", chatId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    };
}

export function prepareChatLinks(): void {
    for (const link of findChatsContainer()?.querySelectorAll<HTMLAnchorElement>(selectors.chatLink) ?? []) {
        const chatId = link.getAttribute("href");
        if (chatId) setDragSource(link, chatId);
    }
}

export function syncChatMarkers(folders: Folder[], assignments: { chatId: string; folderId: string }[]): void {
    const foldersById = new Map(folders.map((folder) => [folder.id, folder]));

    for (const link of findChatsContainer()?.querySelectorAll<HTMLAnchorElement>(selectors.chatLink) ?? []) {
        const chatId = link.getAttribute("href");
        const assignment = assignments.find((item) => item.chatId === chatId);
        const folder = assignment ? foldersById.get(assignment.folderId) : undefined;
        const marker = link.querySelector<HTMLElement>(".go-folder-marker");

        if (!folder) {
            link.classList.remove("go-chat-in-folder");
            marker?.remove();
            continue;
        }

        link.classList.add("go-chat-in-folder");
        const nextMarker = marker ?? document.createElement("span");
        nextMarker.className = "go-folder-marker";
        nextMarker.title = `In folder: ${folder.name}`;
        nextMarker.setAttribute("aria-label", `In folder: ${folder.name}`);
        nextMarker.style.backgroundColor = folder.color;
        if (!marker) link.appendChild(nextMarker);
    }
}

export function mountHeaderButton(onCreate: () => void): void {
    const header = findChatsHeader();
    if (!header) return;

    header.classList.add("go-chats-header-anchor");
    let button = document.getElementById("gemini-organizer-add-btn") as HTMLButtonElement | null;
    if (button?.parentElement === header) return;
    button?.remove();

    button = document.createElement("button");
    button.id = "gemini-organizer-add-btn";
    button.className = "go-add-folder-icon";
    button.type = "button";
    button.textContent = "+";
    button.title = "Create folder";
    button.setAttribute("aria-label", "Create folder");
    button.addEventListener("click", onCreate);
    header.appendChild(button);
}

export function mountMainListDropTarget(onUnassign: (chatId: string) => void): void {
    const container = findChatsContainer();
    if (!container || container.dataset.goMainDropReady === "1") return;

    container.dataset.goMainDropReady = "1";
    container.addEventListener("dragover", (event) => {
        if ((event.target as Element).closest(".go-folder")) return;
        event.preventDefault();
        document.getElementById("gemini-organizer-root")?.classList.add("go-main-drop-active");
    });
    container.addEventListener("dragleave", (event) => {
        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof Node && container.contains(relatedTarget)) return;
        document.getElementById("gemini-organizer-root")?.classList.remove("go-main-drop-active");
    });
    container.addEventListener("drop", (event) => {
        document.getElementById("gemini-organizer-root")?.classList.remove("go-main-drop-active");
        if ((event.target as Element).closest(".go-folder")) return;
        event.preventDefault();
        const chatId = event.dataTransfer?.getData("text/plain");
        if (chatId) onUnassign(chatId);
    });
}

export function syncGeminiDom(
    folders: Folder[],
    assignments: { chatId: string; folderId: string }[],
): void {
    prepareChatLinks();
    syncChatMarkers(folders, assignments);
}
