import { create } from "zustand";

interface VersionInfo {
  version: string;
  commit_sha: string;
  built_at: string;
  uptime_seconds: number;
}

interface VersionState {
  info: VersionInfo | null;
  fetch: () => Promise<void>;
}

export const useVersionStore = create<VersionState>((set) => ({
  info: null,
  fetch: async () => {
    try {
      const res = await fetch("/health");
      if (res.ok) {
        const data = await res.json();
        set({ info: data as VersionInfo });
      }
    } catch {
      // health endpoint unavailable — leave info as null
    }
  },
}));
