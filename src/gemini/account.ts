const ACCOUNT_META_SELECTOR = 'meta[name="og-profile-acct"]';

export function getGeminiAccountEmail(): string | null {
    const email = document.querySelector<HTMLMetaElement>(ACCOUNT_META_SELECTOR)?.content
        ?.trim()
        .toLowerCase();

    return email || null;
}

export async function getWorkspaceId(): Promise<string | null> {
    const email = getGeminiAccountEmail();
    if (!email) return null;

    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(email),
    );

    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
