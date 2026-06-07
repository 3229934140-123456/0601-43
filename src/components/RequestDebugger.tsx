import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS, HTTP_METHODS } from '../types';
import type { API, APIParam, RequestCase } from '../types';

function RequestDebugger() {
  const {
    projects,
    currentProjectId,
    environments,
    currentEnvironmentId,
    setCurrentEnvironment,
    apis,
    loadAllApis,
    requestResult,
    sendRequest,
    isLoading,
    requestHistory,
    loadRequestHistory,
    settings,
    requestCases,
    loadRequestCases,
    createRequestCase,
    updateRequestCase,
    deleteRequestCase,
    updateApi,
    loadApi,
  } = useAppStore();

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<APIParam[]>([{ key: '', value: '', description: '' }]);
  const [headers, setHeaders] = useState<APIParam[]>([{ key: '', value: '', description: '' }]);
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form' | 'raw'>('none');
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'cases' | 'history'>('cases');
  const [selectedApiId, setSelectedApiId] = useState<number | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [showApiSelector, setShowApiSelector] = useState(false);
  const [showNewCaseInput, setShowNewCaseInput] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [caseSaved, setCaseSaved] = useState(false);
  const [responseSaved, setResponseSaved] = useState(false);
  const apiSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentProjectId) {
      loadAllApis(currentProjectId);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (selectedApiId && currentProjectId) {
      loadRequestHistory(selectedApiId);
      loadRequestCases(selectedApiId, currentProjectId);
    }
  }, [selectedApiId, currentProjectId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (apiSelectorRef.current && !apiSelectorRef.current.contains(e.target as Node)) {
        setShowApiSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectApi = (api: API) => {
    setSelectedApiId(api.id);
    setSelectedCaseId(null);
    setMethod(api.method);
    
    let baseUrl = envVars.baseURL || '';
    setUrl(baseUrl + api.path);

    try {
      const parsedParams = JSON.parse(api.request_params || '[]');
      setParams(parsedParams.length > 0 ? parsedParams : [{ key: '', value: '', description: '' }]);
    } catch {
      setParams([{ key: '', value: '', description: '' }]);
    }
    try {
      const parsedHeaders = JSON.parse(api.request_headers || '[]');
      setHeaders(parsedHeaders.length > 0 ? parsedHeaders : [{ key: '', value: '', description: '' }]);
    } catch {
      setHeaders([{ key: '', value: '', description: '' }]);
    }
    setBodyType((api.request_body_type as any) || 'none');
    setBody(api.request_body || '');
    setShowApiSelector(false);
  };

  const selectCase = (caseItem: RequestCase) => {
    setSelectedCaseId(caseItem.id);
    setMethod(caseItem.method);
    setUrl(caseItem.url);
    
    try {
      const parsedParams = JSON.parse(caseItem.params || '[]');
      setParams(parsedParams.length > 0 ? parsedParams : [{ key: '', value: '', description: '' }]);
    } catch {
      setParams([{ key: '', value: '', description: '' }]);
    }
    try {
      const parsedHeaders = JSON.parse(caseItem.headers || '[]');
      setHeaders(parsedHeaders.length > 0 ? parsedHeaders : [{ key: '', value: '', description: '' }]);
    } catch {
      setHeaders([{ key: '', value: '', description: '' }]);
    }
    setBodyType((caseItem.body_type as any) || 'none');
    setBody(caseItem.body || '');
  };

  const handleSaveCase = async () => {
    if (!currentProjectId) return;
    
    if (selectedCaseId) {
      await updateRequestCase(selectedCaseId, {
        name: requestCases.find(c => c.id === selectedCaseId)?.name || '未命名用例',
        method,
        url,
        params: JSON.stringify(params.filter(p => p.key)),
        headers: JSON.stringify(headers.filter(h => h.key)),
        body_type: bodyType,
        body,
      });
      setCaseSaved(true);
      setTimeout(() => setCaseSaved(false), 1500);
      if (selectedApiId) {
        loadRequestCases(selectedApiId, currentProjectId);
      }
    } else {
      setShowNewCaseInput(true);
    }
  };

  const handleCreateCase = async () => {
    if (!currentProjectId || !newCaseName.trim()) return;
    
    const id = await createRequestCase({
      api_id: selectedApiId,
      project_id: currentProjectId,
      name: newCaseName.trim(),
      method,
      url,
      params: JSON.stringify(params.filter(p => p.key)),
      headers: JSON.stringify(headers.filter(h => h.key)),
      body_type: bodyType,
      body,
    });
    
    setSelectedCaseId(id as number);
    setNewCaseName('');
    setShowNewCaseInput(false);
    setCaseSaved(true);
    setTimeout(() => setCaseSaved(false), 1500);
  };

  const handleDeleteCase = async (caseItem: RequestCase, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除用例"${caseItem.name}"吗？`)) return;
    await deleteRequestCase(caseItem.id);
    if (selectedCaseId === caseItem.id) {
      setSelectedCaseId(null);
    }
    if (selectedApiId && currentProjectId) {
      loadRequestCases(selectedApiId, currentProjectId);
    }
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

    const state = useAppStore.getState();
    if (selectedCaseId && state.requestResult) {
      await updateRequestCase(selectedCaseId, {
        name: requestCases.find(c => c.id === selectedCaseId)?.name || '未命名用例',
        method,
        url,
        params: JSON.stringify(params.filter(p => p.key)),
        headers: JSON.stringify(headers.filter(h => h.key)),
        body_type: bodyType,
        body,
        last_status_code: state.requestResult.status,
        last_duration: state.requestResult.duration,
        last_response: state.requestResult.success 
          ? JSON.stringify(state.requestResult.data) 
          : state.requestResult.error || '',
      });
      if (selectedApiId && currentProjectId) {
        loadRequestCases(selectedApiId, currentProjectId);
      }
    }
  };

  const handleSaveResponseAsExample = async () => {
    if (!selectedApiId || !requestResult?.success) {
      alert('请先选择接口并发送成功请求');
      return;
    }

    const api = await loadApi(selectedApiId);
    if (!api) return;

    const responseBody = typeof requestResult.data === 'string' 
      ? requestResult.data 
      : JSON.stringify(requestResult.data, null, 2);

    await updateApi(selectedApiId, {
      name: api.name,
      method: api.method,
      path: api.path,
      description: api.description,
      request_params: api.request_params,
      request_headers: api.request_headers,
      request_body_type: api.request_body_type,
      request_body: api.request_body,
      response_description: '由实际请求保存',
      response_body: responseBody,
    }, '保存实际响应为示例');

    setResponseSaved(true);
    setTimeout(() => setResponseSaved(false), 2000);
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

  const getStatusBg = (status?: number) => {
    if (!status) return 'bg-gray-100 text-gray-500';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700';
    if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const currentApi = apis.find((a: any) => a.id === selectedApiId);
  const selectedCase = requestCases.find(c => c.id === selectedCaseId);

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
        <div className="relative" ref={apiSelectorRef}>
          <button
            className="btn btn-secondary flex items-center gap-1 min-w-[200px] justify-between"
            onClick={() => setShowApiSelector(!showApiSelector)}
          >
            <span className="truncate">
              {selectedApiId ? (currentApi as any)?.name : '📋 选择接口'}
            </span>
            <span className="text-xs ml-2">▼</span>
          </button>
          {showApiSelector && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
              {apis.length === 0 ? (
                <div className="p-3 text-sm text-gray-400 text-center">暂无接口</div>
              ) : (
                (apis as any[]).map((api: API) => (
                  <div
                    key={api.id}
                    className={`px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                      selectedApiId === api.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => selectApi(api)}
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
          className={`btn ${caseSaved ? 'btn-success' : 'btn-secondary'}`}
          onClick={handleSaveCase}
          title="保存为用例"
        >
          {caseSaved ? '✓ 已保存' : '💾 存为用例'}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>

      {showNewCaseInput && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
          <span className="text-sm text-gray-600">用例名：</span>
          <input
            type="text"
            className="input text-sm flex-1"
            value={newCaseName}
            onChange={(e) => setNewCaseName(e.target.value)}
            placeholder="例如：登录成功"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCase()}
          />
          <button className="btn btn-primary text-sm" onClick={handleCreateCase}>
            保存
          </button>
          <button
            className="btn btn-secondary text-sm"
            onClick={() => { setShowNewCaseInput(false); setNewCaseName(''); }}
          >
            取消
          </button>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col card overflow-hidden">
          <div className="border-b border-gray-200 flex">
            {[
              { id: 'params', label: 'Params' },
              { id: 'headers', label: 'Headers' },
              { id: 'body', label: 'Body' },
              { id: 'cases', label: `用例 (${requestCases.length})` },
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

            {activeTab === 'cases' && (
              <div className="space-y-2">
                {requestCases.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">暂无调试用例</p>
                    <p className="text-xs mt-1">编辑好请求后点击"存为用例"保存</p>
                  </div>
                ) : (
                  requestCases.map((caseItem: any) => (
                    <div
                      key={caseItem.id}
                      className={`p-3 rounded-lg border cursor-pointer group transition-colors ${
                        selectedCaseId === caseItem.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => selectCase(caseItem)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`method-badge text-xs ${METHOD_COLORS[caseItem.method]}`}>
                            {caseItem.method}
                          </span>
                          <span className="font-medium text-sm text-gray-800">{caseItem.name}</span>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500"
                          onClick={(e) => handleDeleteCase(caseItem, e)}
                          title="删除用例"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 truncate font-mono mb-2">
                        {caseItem.url}
                      </div>
                      {caseItem.last_status_code && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${getStatusBg(caseItem.last_status_code)}`}>
                            {caseItem.last_status_code}
                          </span>
                          <span className="text-gray-500">{caseItem.last_duration}ms</span>
                          <span className="text-gray-400 text-xs ml-auto">
                            {new Date(caseItem.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {requestHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">暂无请求历史</p>
                ) : (
                  requestHistory.map((item: any) => (
                    <div key={item.id} className="p-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
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
            <div className="flex items-center gap-3">
              {requestResult && requestResult.success && (
                <button
                  className={`text-sm ${responseSaved ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'}`}
                  onClick={handleSaveResponseAsExample}
                  disabled={!selectedApiId}
                  title={selectedApiId ? '保存为当前接口的响应示例' : '请先选择接口'}
                >
                  {responseSaved ? '✓ 已保存到接口' : '💾 存为响应示例'}
                </button>
              )}
              {requestResult && (
                <div className="flex items-center gap-3 text-sm">
                  <span className={getStatusColor(requestResult.status)}>
                    {requestResult.status} {requestResult.statusText}
                  </span>
                  <span className="text-gray-500">
                    耗时: {requestResult.duration}ms
                  </span>
                </div>
              )}
            </div>
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
