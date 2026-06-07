import { create } from 'zustand';
import type { Project, Environment, Folder, API, Comment, ReviewItem, RequestResult, RequestHistory, ApiVersion } from '../types';

interface AppState {
  projects: Project[];
  currentProjectId: number | null;
  environments: Environment[];
  currentEnvironmentId: number | null;
  folders: Folder[];
  apis: API[];
  currentApiId: number | null;
  searchKeyword: string;
  searchResults: API[];
  settings: Record<string, string>;
  comments: Comment[];
  reviewItems: ReviewItem[];
  apiVersions: ApiVersion[];
  requestResult: RequestResult | null;
  requestHistory: RequestHistory[];
  isLoading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<number>;
  updateProject: (id: number, name: string, description: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (id: number | null) => void;

  loadEnvironments: (projectId: number) => Promise<void>;
  createEnvironment: (projectId: number, name: string, variables: string) => Promise<void>;
  updateEnvironment: (id: number, name: string, variables: string) => Promise<void>;
  deleteEnvironment: (id: number) => Promise<void>;
  setDefaultEnvironment: (projectId: number, envId: number) => Promise<void>;
  setCurrentEnvironment: (id: number | null) => void;

  loadFolders: (projectId: number) => Promise<void>;
  createFolder: (projectId: number, parentId: number | null, name: string) => Promise<void>;
  updateFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;

  loadApis: (projectId: number, folderId: number | null) => Promise<void>;
  loadAllApis: (projectId: number) => Promise<void>;
  loadApi: (id: number) => Promise<API | undefined>;
  createApi: (data: any) => Promise<number>;
  updateApi: (id: number, data: any, changeLog: string) => Promise<void>;
  deleteApi: (id: number) => Promise<void>;
  toggleDeprecated: (id: number, deprecated: boolean) => Promise<void>;
  setCurrentApi: (id: number | null) => void;

  loadApiVersions: (apiId: number) => Promise<void>;

  loadComments: (apiId: number) => Promise<void>;
  createComment: (apiId: number, fieldPath: string, content: string, author: string) => Promise<void>;
  updateCommentStatus: (id: number, status: string) => Promise<void>;
  deleteComment: (id: number) => Promise<void>;

  loadReviewItems: (projectId: number) => Promise<void>;
  createReviewItem: (data: any) => Promise<void>;
  updateReviewStatus: (id: number, status: string) => Promise<void>;
  deleteReviewItem: (id: number) => Promise<void>;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;

  sendRequest: (config: any) => Promise<void>;
  loadRequestHistory: (apiId: number) => Promise<void>;

  exportProject: (projectId: number) => Promise<{ success: boolean; path?: string }>;
  importProject: () => Promise<{ success: boolean; projectId?: number; error?: string }>;

  searchApis: (projectId: number, keyword: string) => Promise<void>;
  setSearchKeyword: (keyword: string) => void;

  clearAllData: () => Promise<{ success: boolean; error?: string }>;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  environments: [],
  currentEnvironmentId: null,
  folders: [],
  apis: [],
  currentApiId: null,
  searchKeyword: '',
  searchResults: [],
  settings: {},
  comments: [],
  reviewItems: [],
  apiVersions: [],
  requestResult: null,
  requestHistory: [],
  isLoading: false,

  loadProjects: async () => {
    const projects = await (window as any).electronAPI.getProjects();
    set({ projects });
  },

  createProject: async (name: string, description: string) => {
    const id = await (window as any).electronAPI.createProject({ name, description });
    await get().loadProjects();
    return id;
  },

  updateProject: async (id: number, name: string, description: string) => {
    await (window as any).electronAPI.updateProject(id, { name, description });
    await get().loadProjects();
  },

  deleteProject: async (id: number) => {
    await (window as any).electronAPI.deleteProject(id);
    await get().loadProjects();
    if (get().currentProjectId === id) {
      set({ currentProjectId: null });
    }
  },

  setCurrentProject: (id: number | null) => {
    set({ currentProjectId: id, currentApiId: null });
  },

  loadEnvironments: async (projectId: number) => {
    const environments = await (window as any).electronAPI.getEnvironments(projectId);
    const defaultEnv = environments.find((e: Environment) => e.is_default);
    set({ environments, currentEnvironmentId: defaultEnv?.id || null });
  },

  createEnvironment: async (projectId: number, name: string, variables: string) => {
    await (window as any).electronAPI.createEnvironment({ project_id: projectId, name, variables });
    await get().loadEnvironments(projectId);
  },

  updateEnvironment: async (id: number, name: string, variables: string) => {
    await (window as any).electronAPI.updateEnvironment(id, { name, variables });
    const projectId = get().currentProjectId;
    if (projectId) await get().loadEnvironments(projectId);
  },

  deleteEnvironment: async (id: number) => {
    await (window as any).electronAPI.deleteEnvironment(id);
    const projectId = get().currentProjectId;
    if (projectId) await get().loadEnvironments(projectId);
  },

  setDefaultEnvironment: async (projectId: number, envId: number) => {
    await (window as any).electronAPI.setDefaultEnvironment(projectId, envId);
    await get().loadEnvironments(projectId);
  },

  setCurrentEnvironment: (id: number | null) => {
    set({ currentEnvironmentId: id });
  },

  loadFolders: async (projectId: number) => {
    const folders = await (window as any).electronAPI.getFolders(projectId);
    set({ folders });
  },

  createFolder: async (projectId: number, parentId: number | null, name: string) => {
    await (window as any).electronAPI.createFolder({ project_id: projectId, parent_id: parentId, name });
    await get().loadFolders(projectId);
  },

  updateFolder: async (id: number, name: string) => {
    await (window as any).electronAPI.updateFolder(id, name);
    const projectId = get().currentProjectId;
    if (projectId) await get().loadFolders(projectId);
  },

  deleteFolder: async (id: number) => {
    await (window as any).electronAPI.deleteFolder(id);
    const projectId = get().currentProjectId;
    if (projectId) {
      await get().loadFolders(projectId);
      await get().loadApis(projectId, null);
    }
  },

  loadApis: async (projectId: number, folderId: number | null) => {
    const apis = await (window as any).electronAPI.getApis(projectId, folderId);
    set({ apis });
  },

  loadAllApis: async (projectId: number) => {
    const apis = await (window as any).electronAPI.getAllApis(projectId);
    set({ apis });
  },

  loadApi: async (id: number) => {
    return await (window as any).electronAPI.getApi(id);
  },

  createApi: async (data: any) => {
    const id = await (window as any).electronAPI.createApi(data);
    return id;
  },

  updateApi: async (id: number, data: any, changeLog: string) => {
    await (window as any).electronAPI.updateApi(id, data, changeLog);
  },

  deleteApi: async (id: number) => {
    await (window as any).electronAPI.deleteApi(id);
  },

  toggleDeprecated: async (id: number, deprecated: boolean) => {
    await (window as any).electronAPI.toggleDeprecated(id, deprecated);
  },

  setCurrentApi: (id: number | null) => {
    set({ currentApiId: id, requestResult: null });
  },

  loadApiVersions: async (apiId: number) => {
    const versions = await (window as any).electronAPI.getApiVersions(apiId);
    set({ apiVersions: versions });
  },

  loadComments: async (apiId: number) => {
    const comments = await (window as any).electronAPI.getComments(apiId);
    set({ comments });
  },

  createComment: async (apiId: number, fieldPath: string, content: string, author: string) => {
    await (window as any).electronAPI.createComment({ api_id: apiId, field_path: fieldPath, content, author });
    await get().loadComments(apiId);
  },

  updateCommentStatus: async (id: number, status: string) => {
    await (window as any).electronAPI.updateCommentStatus(id, status);
    const apiId = get().currentApiId;
    if (apiId) await get().loadComments(apiId);
  },

  deleteComment: async (id: number) => {
    await (window as any).electronAPI.deleteComment(id);
    const apiId = get().currentApiId;
    if (apiId) await get().loadComments(apiId);
  },

  loadReviewItems: async (projectId: number) => {
    const items = await (window as any).electronAPI.getReviewItems(projectId);
    set({ reviewItems: items });
  },

  createReviewItem: async (data: any) => {
    await (window as any).electronAPI.createReviewItem(data);
    const projectId = get().currentProjectId;
    if (projectId) await get().loadReviewItems(projectId);
  },

  updateReviewStatus: async (id: number, status: string) => {
    await (window as any).electronAPI.updateReviewStatus(id, status);
    const projectId = get().currentProjectId;
    if (projectId) await get().loadReviewItems(projectId);
  },

  deleteReviewItem: async (id: number) => {
    await (window as any).electronAPI.deleteReviewItem(id);
    const projectId = get().currentProjectId;
    if (projectId) await get().loadReviewItems(projectId);
  },

  loadSettings: async () => {
    const settings = await (window as any).electronAPI.getSettings();
    set({ settings });
  },

  updateSetting: async (key: string, value: string) => {
    await (window as any).electronAPI.updateSetting(key, value);
    await get().loadSettings();
  },

  sendRequest: async (config: any) => {
    set({ isLoading: true });
    const result = await (window as any).electronAPI.sendRequest(config);
    set({ requestResult: result, isLoading: false });

    if (config.apiId) {
      await (window as any).electronAPI.saveRequestHistory({
        api_id: config.apiId,
        url: config.url,
        method: config.method,
        status_code: result.status,
        duration: result.duration,
        request_data: JSON.stringify({ headers: config.headers, body: config.body }),
        response_data: result.success ? JSON.stringify(result.data) : result.error,
      });
      await get().loadRequestHistory(config.apiId);
    }
  },

  loadRequestHistory: async (apiId: number) => {
    const history = await (window as any).electronAPI.getRequestHistory(apiId);
    set({ requestHistory: history });
  },

  exportProject: async (projectId: number) => {
    return await (window as any).electronAPI.exportProject(projectId);
  },

  importProject: async () => {
    return await (window as any).electronAPI.importProject();
  },

  searchApis: async (projectId: number, keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: [], searchKeyword: '' });
      return;
    }
    const results = await (window as any).electronAPI.searchApis(projectId, keyword);
    set({ searchResults: results, searchKeyword: keyword });
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  clearAllData: async () => {
    const result = await (window as any).electronAPI.clearAllData();
    if (result.success) {
      set({
        projects: [],
        currentProjectId: null,
        environments: [],
        currentEnvironmentId: null,
        folders: [],
        apis: [],
        currentApiId: null,
        searchResults: [],
        comments: [],
        reviewItems: [],
        apiVersions: [],
        requestResult: null,
        requestHistory: [],
      });
      await loadSettings();
    }
    return result;
  },
}));
