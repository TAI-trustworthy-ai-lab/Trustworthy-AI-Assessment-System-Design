// src/components/translationCache.tsx
export class TranslationCache {
    private cache: Record<string, string> = {};

    set(original: string, translated: string) {
        this.cache[original] = translated;
    }

    get(original: string) {
        return this.cache[original];
    }

    has(original: string) {
        return !!this.cache[original];
    }

    clear() {
        this.cache = {};
    }
}

export const translationCache = new TranslationCache();
