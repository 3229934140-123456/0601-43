export {};

declare global {
  interface Window {
    electronAPI: {
      getProjects: () => Promise<any[]>;
      createProject: (data: { name: string; description: string }) => Promise<number>;
      updateProject: (id: number, data: { name: string; description: string }) => Promise<boolean>;
      deleteProject: (id: number) => Promise<boolean>;

      getEnvironments: (projectId: number) => Promise<any[]>;
      createEnvironment: (data: { project_id: number; name: string; variables: string }) => Promise<number>;
      updateEnvironment: (id: number, data: { name: string; variables: string }) => Promise<boolean>;
      deleteEnvironment: (id: number) => Promise<boolean>;
      setDefaultEnvironment: (projectId: number, envId: number) => Promise<boolean>;

      getFolders: (projectId: number) => Promise<any[]>;
      createFolder: (data: { project_id: number; parent_id: number | null; name: string }) => Promise<number>;
      updateFolder: (id: number, name: string) => Promise<boolean>;
      deleteFolder: (id: number) => Promise<boolean>;

      getApis: (projectId: number, folderId: number | null) => Promise<any[]>;
      getAllApis: (projectId: number) => Promise<any[]>;
      getApi: (id: number) => Promise<any>;
      createApi: (data: any) => Promise<number>;
      updateApi: (id: number, data: any, changeLog: string) => Promise<boolean>;
      deleteApi: (id: number) => Promise<boolean>;
      toggleDeprecated: (id: number, deprecated: boolean) => Promise<boolean>;

      getApiVersions: (apiId: number) => Promise<any[]>;

      getComments: (apiId: number) => Promise<any[]>;
      createComment: (data: { api_id: number; field_path: string; content: string; author: string }) => Promise<number>;
      updateCommentStatus: (id: number, status: string) => Promise<boolean>;
      deleteComment: (id: number) => Promise<boolean>;

      getReviewItems: (projectId: number) => Promise<any[]>;
      createReviewItem: (data: any) => Promise<number>;
      updateReviewStatus: (id: number, status: string) => Promise<boolean>;
      deleteReviewItem: (id: number) => Promise<boolean>;

      getSettings: () => Promise<Record<string, string>>;
      updateSetting: (key: string, value: string) => Promise<boolean>;

      sendRequest: (config: any) => Promise<any>;
      saveRequestHistory: (data: any) => Promise<number>;
      getRequestHistory: (apiId: number) => Promise<any[]>;

      exportProject: (projectId: number) => Promise<{ success: boolean; path?: string }>;
      importProject: () => Promise<{ success: boolean; projectId?: number; error?: string }>;

      searchApis: (projectId: number, keyword: string) => Promise<any[]>;
    };
  }
}
