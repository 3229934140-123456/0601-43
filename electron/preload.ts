import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (data: { name: string; description: string }) => ipcRenderer.invoke('create-project', data),
  updateProject: (id: number, data: { name: string; description: string }) => ipcRenderer.invoke('update-project', id, data),
  deleteProject: (id: number) => ipcRenderer.invoke('delete-project', id),

  getEnvironments: (projectId: number) => ipcRenderer.invoke('get-environments', projectId),
  createEnvironment: (data: { project_id: number; name: string; variables: string }) => ipcRenderer.invoke('create-environment', data),
  updateEnvironment: (id: number, data: { name: string; variables: string }) => ipcRenderer.invoke('update-environment', id, data),
  deleteEnvironment: (id: number) => ipcRenderer.invoke('delete-environment', id),
  setDefaultEnvironment: (projectId: number, envId: number) => ipcRenderer.invoke('set-default-environment', projectId, envId),

  getFolders: (projectId: number) => ipcRenderer.invoke('get-folders', projectId),
  createFolder: (data: { project_id: number; parent_id: number | null; name: string }) => ipcRenderer.invoke('create-folder', data),
  updateFolder: (id: number, name: string) => ipcRenderer.invoke('update-folder', id, name),
  deleteFolder: (id: number) => ipcRenderer.invoke('delete-folder', id),

  getApis: (projectId: number, folderId: number | null) => ipcRenderer.invoke('get-apis', projectId, folderId),
  getAllApis: (projectId: number) => ipcRenderer.invoke('get-all-apis', projectId),
  getApi: (id: number) => ipcRenderer.invoke('get-api', id),
  createApi: (data: any) => ipcRenderer.invoke('create-api', data),
  updateApi: (id: number, data: any, changeLog: string) => ipcRenderer.invoke('update-api', id, data, changeLog),
  deleteApi: (id: number) => ipcRenderer.invoke('delete-api', id),
  toggleDeprecated: (id: number, deprecated: boolean) => ipcRenderer.invoke('toggle-deprecated', id, deprecated),

  getApiVersions: (apiId: number) => ipcRenderer.invoke('get-api-versions', apiId),

  getComments: (apiId: number) => ipcRenderer.invoke('get-comments', apiId),
  createComment: (data: { api_id: number; field_path: string; content: string; author: string }) => ipcRenderer.invoke('create-comment', data),
  updateCommentStatus: (id: number, status: string) => ipcRenderer.invoke('update-comment-status', id, status),
  deleteComment: (id: number) => ipcRenderer.invoke('delete-comment', id),

  getReviewItems: (projectId: number) => ipcRenderer.invoke('get-review-items', projectId),
  createReviewItem: (data: any) => ipcRenderer.invoke('create-review-item', data),
  updateReviewStatus: (id: number, status: string) => ipcRenderer.invoke('update-review-status', id, status),
  deleteReviewItem: (id: number) => ipcRenderer.invoke('delete-review-item', id),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key: string, value: string) => ipcRenderer.invoke('update-setting', key, value),

  sendRequest: (config: any) => ipcRenderer.invoke('send-request', config),
  saveRequestHistory: (data: any) => ipcRenderer.invoke('save-request-history', data),
  getRequestHistory: (apiId: number) => ipcRenderer.invoke('get-request-history', apiId),

  exportProject: (projectId: number) => ipcRenderer.invoke('export-project', projectId),
  importProject: () => ipcRenderer.invoke('import-project'),

  searchApis: (projectId: number, keyword: string) => ipcRenderer.invoke('search-apis', projectId, keyword),

  getRequestCases: (apiId: number | null, projectId: number) => ipcRenderer.invoke('get-request-cases', apiId, projectId),
  createRequestCase: (data: any) => ipcRenderer.invoke('create-request-case', data),
  updateRequestCase: (id: number, data: any) => ipcRenderer.invoke('update-request-case', id, data),
  deleteRequestCase: (id: number) => ipcRenderer.invoke('delete-request-case', id),

  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
