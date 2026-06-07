export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: number;
  project_id: number;
  name: string;
  variables: string;
  is_default: number;
  created_at: string;
}

export interface Folder {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface APIParam {
  key: string;
  value: string;
  description?: string;
  required?: boolean;
}

export interface API {
  id: number;
  project_id: number;
  folder_id: number | null;
  name: string;
  method: string;
  path: string;
  description: string;
  request_params: string;
  request_headers: string;
  request_body_type: 'none' | 'json' | 'form' | 'raw';
  request_body: string;
  response_description: string;
  response_body: string;
  is_deprecated: number;
  version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApiVersion {
  id: number;
  api_id: number;
  version: number;
  name: string;
  method: string;
  path: string;
  description: string;
  request_params: string;
  request_headers: string;
  request_body_type: string;
  request_body: string;
  response_description: string;
  response_body: string;
  change_log: string;
  created_at: string;
}

export interface Comment {
  id: number;
  api_id: number;
  field_path: string;
  content: string;
  author: string;
  status: string;
  created_at: string;
}

export interface ReviewItem {
  id: number;
  project_id: number;
  api_id: number;
  title: string;
  type: string;
  status: string;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  api_name?: string;
  method?: string;
  path?: string;
}

export interface RequestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  data?: any;
  headers?: Record<string, string>;
  duration: number;
  error?: string;
}

export interface RequestHistory {
  id: number;
  api_id: number | null;
  url: string;
  method: string;
  status_code: number | null;
  duration: number;
  request_data: string;
  response_data: string;
  created_at: string;
}

export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export const HTTP_METHODS: MethodType[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 bg-green-50',
  POST: 'text-amber-600 bg-amber-50',
  PUT: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  PATCH: 'text-purple-600 bg-purple-50',
  HEAD: 'text-gray-600 bg-gray-50',
  OPTIONS: 'text-cyan-600 bg-cyan-50',
};
