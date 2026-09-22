import { render } from "preact";
import { createOrganizerRepository } from "../data/repositories";
import { OrganizerDB } from "../data/db";
import { getWorkspaceId } from "../gemini/account";
import type { OrganizerRepository } from "../data/repositories";
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
let activeWorkspaceId: string | null = null;
let repository: OrganizerRepository | null = null;
let organizerRoot: HTMLElement | null = null;
let latestData: OrganizerData | null = null;
let latestChats: GeminiChat[] = [];

function renderOrganizer(): void {
    if (!organizerRoot || !repository || !latestData) return;

    render(
        <Organizer
            repository={repository}
            initialData={latestData}
            chats={latestChats}
            onDataChange={updateData}
        />,
        organizerRoot,
    );
}

function refreshGemini(): void {
    if (!latestData) return;
    latestChats = readChats();
    syncGeminiDom(latestData.folders, latestData.assignments);
    renderOrganizer();
}

function updateData(data: OrganizerData): void {
    latestData = data;
    refreshGemini();
}

function unmountOrganizer(): void {
    const root = document.getElementById("gemini-organizer-root");
    if (root) {
        render(null, root);
        root.remove();
    }

    organizerRoot = null;
    repository?.close();
    repository = null;
    activeWorkspaceId = null;
    latestData = null;
    latestChats = [];
    mounted = false;
}

async function mountOrganizer(): Promise<void> {
    const workspaceId = await getWorkspaceId();
    if (!workspaceId) {
        if (mounted) unmountOrganizer();
        return;
    }

    if (mounted && activeWorkspaceId !== workspaceId) unmountOrganizer();

    const container = findChatsContainer();
    if (!container) return;
    if (mounted && activeWorkspaceId === workspaceId && document.getElementById("gemini-organizer-root")?.isConnected) {
        return;
    }
    if (mounting) return;
    mounting = true;

    try {
        const db = new OrganizerDB(workspaceId);
        const nextRepository = createOrganizerRepository(db);
        const data = await nextRepository.loadOrganizerData();

        if (await getWorkspaceId() !== workspaceId) {
            nextRepository.close();
            return;
        }

        repository = nextRepository;
        activeWorkspaceId = workspaceId;
        latestData = data;
        latestChats = readChats();

        organizerRoot = document.createElement("div");
        organizerRoot.id = "gemini-organizer-root";
        organizerRoot.className = "gemini-organizer-mount";
        container.prepend(organizerRoot);

        renderOrganizer();

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
