import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS, HTTP_METHODS } from '../types';
import type { API, APIParam } from '../types';

function RequestDebugger() {
  const {
    projects,
    currentProjectId,
    environments,
    currentEnvironmentId,
    setCurrentEnvironment,
    apis,
    loadApis,
    loadAllApis,
    requestResult,
    sendRequest,
    isLoading,
    requestHistory,
    loadRequestHistory,
    settings,
  } = useAppStore();

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<APIParam[]>([{ key: '', value: '', description: '' }]);
  const [headers, setHeaders] = useState<APIParam[]>([{ key: '', value: '', description: '' }]);
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form' | 'raw'>('none');
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'history'>('params');
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [showApiSelector, setShowApiSelector] = useState(false);

  useEffect(() => {
    if (currentProjectId) {
      loadAllApis(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (selectedApiId) {
      loadRequestHistory(selectedApiId);
    }
  }, [selectedApiId]);

  const currentEnv = environments.find(e => e.id === currentEnvironmentId);
  let envVars: Record<string, string> = {};
  try {
    envVars = JSON.parse(currentEnv?.variables || '{}');
  } catch {}

  const replaceEnvVars = (str: string): string => {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return envVars[key] || '';
    });
  };

  const handleSend = async () => {
    if (!url.trim()) {
      alert('请输入请求地址');
      return;
    }

    const validParams = params.filter(p => p.key);
    const validHeaders = headers.filter(h => h.key);

    const paramsObj: Record<string, string> = {};
    validParams.forEach(p => {
      paramsObj[p.key] = replaceEnvVars(p.value);
    });

    const headersObj: Record<string, string> = {};
    validHeaders.forEach(h => {
      headersObj[h.key] = replaceEnvVars(h.value);
    });

    let requestBody: any = undefined;
    if (bodyType === 'json' && body.trim()) {
      try {
        requestBody = JSON.parse(body);
      } catch {
        requestBody = body;
      }
    } else if (bodyType === 'form') {
      requestBody = body;
    } else if (bodyType === 'raw' && body.trim()) {
      requestBody = body;
    }

    const finalUrl = replaceEnvVars(url);

    await sendRequest({
      method,
      url: finalUrl,
      params: paramsObj,
      headers: headersObj,
      body: requestBody,
      timeout: Number(settings.timeout) || 30000,
      apiId: selectedApiId,
    });
  };

  const addParam = () => {
    setParams([...params, { key: '', value: '', description: '' }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: keyof APIParam, value: string) => {
    const newParams = [...params];
    (newParams[index] as any)[field] = value;
    setParams(newParams);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', description: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof APIParam, value: string) => {
    const newHeaders = [...headers];
    (newHeaders[index] as any)[field] = value;
    setHeaders(newHeaders);
  };

  const selectApi = (api: API) => {
    setSelectedApiId(api.id);
    setMethod(api.method);
    
    let baseUrl = envVars.baseURL || '';
    setUrl(baseUrl + api.path);

    try {
      setParams(JSON.parse(api.request_params || '[]'));
    } catch {
      setParams([]);
    }
    try {
      setHeaders(JSON.parse(api.request_headers || '[]'));
    } catch {
      setHeaders([]);
    }
    setBodyType(api.request_body_type as any);
    setBody(api.request_body || '');
    setShowApiSelector(false);
  };

  const formatJson = (data: any): string => {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">🚀</div>
        <p className="text-lg">请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <button
            className="btn btn-secondary flex items-center gap-1"
            onClick={() => setShowApiSelector(!showApiSelector)}
          >
            📋 {selectedApiId ? apis.find(a => a.id === selectedApiId)?.name : '选择接口'}
          </button>
          {showApiSelector && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
              {apis.length === 0 ? (
                <div className="p-3 text-sm text-gray-400 text-center">暂无接口</div>
              ) : (
                apis.map((api: any) => (
                  <div
                    key={api.id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => selectApi(api as API)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`method-badge text-xs ${METHOD_COLORS[api.method]}`}>
                        {api.method}
                      </span>
                      <span className="truncate">{api.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate font-mono">
                      {api.path}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">环境：</span>
          <select
            className="select text-sm w-32"
            value={currentEnvironmentId || ''}
            onChange={(e) => setCurrentEnvironment(Number(e.target.value) || null)}
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          className="select text-sm w-24"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {HTTP_METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          className="input flex-1 font-mono text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入请求地址，支持 {{变量名}} 引用环境变量"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col card overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {[
              { id: 'params', label: 'Params' },
              { id: 'headers', label: 'Headers' },
              { id: 'body', label: 'Body' },
              { id: 'history', label: '历史' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'params' && (
              <div className="space-y-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Query 参数</span>
                  <button className="text-sm text-blue-600 hover:text-blue-800" onClick={addParam}>
                    + 添加
                  </button>
                </div>
                {params.map((param, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="input text-sm flex-1"
                      value={param.key}
                      onChange={(e) => updateParam(index, 'key', e.target.value)}
                      placeholder="key"
                    />
                    <input
                      type="text"
                      className="input text-sm flex-1"
                      value={param.value}
                      onChange={(e) => updateParam(index, 'value', e.target.value)}
                      placeholder="value"
                    />
                    <button
                      className="w-8 h-9 text-red-500 hover:bg-red-50 rounded"
                      onClick={() => removeParam(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">请求头</span>
                  <button className="text-sm text-blue-600 hover:text-blue-800" onClick={addHeader}>
                    + 添加
                  </button>
                </div>
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="input text-sm flex-1"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="name"
                    />
                    <input
                      type="text"
                      className="input text-sm flex-1"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="value"
                    />
                    <button
                      className="w-8 h-9 text-red-500 hover:bg-red-50 rounded"
                      onClick={() => removeHeader(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'body' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['none', 'json', 'form', 'raw'] as const).map((type) => (
                    <button
                      key={type}
                      className={`px-3 py-1.5 text-sm rounded ${
                        bodyType === type
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setBodyType(type)}
                    >
                      {type === 'none' ? 'none' : type.toUpperCase()}
                    </button>
                  ))}
                </div>
                {bodyType !== 'none' && (
                  <textarea
                    className="textarea font-mono text-sm"
                    style={{ height: '300px' }}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : '请求体内容...'}
                  />
                )}
                {bodyType === 'none' && (
                  <p className="text-sm text-gray-400 py-8 text-center">此请求不包含请求体</p>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {requestHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">暂无请求历史</p>
                ) : (
                  requestHistory.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`method-badge text-xs ${METHOD_COLORS[item.method]}`}>
                          {item.method}
                        </span>
                        <span className={`font-medium ${getStatusColor(item.status_code)}`}>
                          {item.status_code || 'Error'}
                        </span>
                        <span className="text-gray-500 text-xs">{item.duration}ms</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 truncate font-mono">
                        {item.url}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col card overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">响应结果</h3>
            {requestResult && (
              <div className="flex items-center gap-4 text-sm">
                <span className={getStatusColor(requestResult.status)}>
                  {requestResult.status} {requestResult.statusText}
                </span>
                <span className="text-gray-500">
                  耗时: {requestResult.duration}ms
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3">
            {!requestResult ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-2">📡</div>
                <p className="text-sm">点击"发送"按钮发起请求</p>
              </div>
            ) : !requestResult.success ? (
              <div className="text-red-600">
                <p className="font-medium mb-2">请求失败</p>
                <p className="text-sm">{requestResult.error}</p>
              </div>
            ) : (
              <pre className="code-editor text-sm" style={{ minHeight: '100%' }}>
                {formatJson(requestResult.data)}
              </pre>
            )}
          </div>

          {requestResult?.success && requestResult.headers && (
            <div className="border-t border-gray-200 p-3 max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">响应头</h4>
              <div className="space-y-1 text-xs">
                {Object.entries(requestResult.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-gray-500 font-mono">{key}:</span>
                    <span className="text-gray-700 font-mono flex-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestDebugger;
