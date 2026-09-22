import { render } from "preact";
import { loadOrganizerData } from "../data/repositories";
import type { GeminiChat, OrganizerData } from "../domain/types";
import {
    findChatsContainer,
    mountHeaderButton,
    mountMainListDropTarget,
    readChats,
    syncGeminiDom,
} from "../gemini/adapter";
import { observeGeminiDom } from "../gemini/observer";
import { Organizer } from "../ui/Organizer";

let mounted = false;
let mounting = false;
let latestData: OrganizerData | null = null;
let latestChats: GeminiChat[] = [];

function refreshGemini(): void {
    if (!latestData) return;
    latestChats = readChats();
    syncGeminiDom(latestData.folders, latestData.assignments);
}

function updateData(data: OrganizerData): void {
    latestData = data;
    refreshGemini();
}

async function mountOrganizer(): Promise<void> {
    const container = findChatsContainer();
    if (!container) return;
    if (mounted && document.getElementById("gemini-organizer-root")?.isConnected) return;
    if (mounting) return;
    mounting = true;

    try {
        const data = await loadOrganizerData();
        latestData = data;
        latestChats = readChats();

        const root = document.createElement("div");
        root.id = "gemini-organizer-root";
        root.className = "gemini-organizer-mount";
        container.prepend(root);

        render(
            <Organizer initialData={data} chats={latestChats} onDataChange={updateData} />,
            root,
        );

        mountHeaderButton(() => {
            window.dispatchEvent(new CustomEvent("gemini-organizer-create-root-folder"));
        });
        mountMainListDropTarget((chatId) => {
            window.dispatchEvent(new CustomEvent("gemini-organizer-unassign-chat", { detail: chatId }));
        });

        mounted = true;
        refreshGemini();
    } finally {
        mounting = false;
    }
}

observeGeminiDom(() => {
    void mountOrganizer();
    refreshGemini();
});

void mountOrganizer();
