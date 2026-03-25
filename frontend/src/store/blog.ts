import { create } from 'zustand';

interface BlogStore {
  selectedTag: string | null;
  sidebarOpen: boolean;
  setSelectedTag: (tag: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useBlogStore = create<BlogStore>((set) => ({
  selectedTag: null,
  sidebarOpen: false,
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
