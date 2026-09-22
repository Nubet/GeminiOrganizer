export const FOLDER_COLORS = [
    "#EA4335",
    "#FB8C00",
    "#F9AB00",
    "#34A853",
    "#00ACC1",
    "#4285F4",
    "#9334E6",
    "#E91E63",
    "#5F6368",
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number] | (string & {});

export interface Folder {
    id: string;
    parentId: string | null;
    name: string;
    color: FolderColor;
    position: number;
    isExpanded: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ChatAssignment {
    chatId: string;
    folderId: string;
    createdAt: number;
    updatedAt: number;
}

export interface OrganizerSettings {
    id: "main";
    foldersVisible: boolean;
}

export interface GeminiChat {
    id: string;
    href: string;
    label: string;
}

export interface OrganizerData {
    folders: Folder[];
    assignments: ChatAssignment[];
    settings: OrganizerSettings;
}
