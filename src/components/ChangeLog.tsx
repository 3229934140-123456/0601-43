import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS } from '../types';
import type { API, ApiVersion } from '../types';

function ChangeLog() {
  const { projects, currentProjectId, apis, loadAllApis, apiVersions, loadApiVersions, settings } = useAppStore();
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareV1, setCompareV1] = useState<number | null>(null);
  const [compareV2, setCompareV2] = useState<number | null>(null);
  const [diffResult, setDiffResult] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<ApiVersion | null>(null);
  const [showVersionDetail, setShowVersionDetail] = useState(false);

  useEffect(() => {
    if (currentProjectId) {
      loadAllApis(currentProjectId);
    }
  }, [currentProjectId]);

  const handleSelectApi = async (api: API) => {
    setSelectedApi(api);
    await loadApiVersions(api.id);
    setCompareV1(null);
    setCompareV2(null);
    setDiffResult('');
    setSelectedVersion(null);
    setShowVersionDetail(false);
  };

  const getVersionData = (versionNum: number): ApiVersion | null => {
    if (!selectedApi) return null;
    if (versionNum === selectedApi.version) {
      return {
        id: 0,
        api_id: selectedApi.id,
        version: selectedApi.version,
        name: selectedApi.name,
        method: selectedApi.method,
        path: selectedApi.path,
        description: selectedApi.description,
        request_params: selectedApi.request_params,
        request_headers: selectedApi.request_headers,
        request_body_type: selectedApi.request_body_type,
        request_body: selectedApi.request_body,
        response_description: selectedApi.response_description,
        response_body: selectedApi.response_body,
        change_log: '当前版本（最新）',
        created_at: selectedApi.updated_at || new Date().toISOString(),
      } as ApiVersion;
    }
    return apiVersions.find(v => v.version === versionNum) || null;
  };

  const handleCompare = () => {
    if (!compareV1 || !compareV2 || !selectedApi) return;
    
    const v1 = getVersionData(compareV1);
    const v2 = getVersionData(compareV2);
    
    if (!v1 || !v2) {
      setDiffResult('找不到对应的版本数据');
      return;
    }
    
    const diff = generateDiff(v1, v2);
    setDiffResult(diff);
  };

  const handleViewVersionDetail = (version: ApiVersion) => {
    setSelectedVersion(version);
    setShowVersionDetail(true);
  };

  const getPreviousVersion = (versionNum: number): ApiVersion | null => {
    if (!selectedApi) return null;
    const allVersions = getAllVersionsSorted();
    const idx = allVersions.findIndex(v => v.version === versionNum);
    if (idx < allVersions.length - 1) {
      return allVersions[idx + 1];
    }
    return null;
  };

  const getAllVersionsSorted = (): ApiVersion[] => {
    if (!selectedApi) return [];
    const current = getVersionData(selectedApi.version);
    const versions = [...apiVersions];
    if (current) {
      versions.push(current);
    }
    return versions.sort((a, b) => b.version - a.version);
  };

  const generateDiff = (v1: ApiVersion, v2: ApiVersion): string => {
    const changes: string[] = [];
    
    if (v1.name !== v2.name) {
      changes.push(`📝 名称: "${v1.name}" → "${v2.name}"`);
    }
    if (v1.method !== v2.method) {
      changes.push(`🔀 方法: ${v1.method} → ${v2.method}`);
    }
    if (v1.path !== v2.path) {
      changes.push(`🛤️ 路径: ${v1.path} → ${v2.path}`);
    }
    if (v1.description !== v2.description) {
      changes.push(`📄 描述已变更`);
    }
    if (v1.request_params !== v2.request_params) {
      try {
        const params1 = JSON.parse(v1.request_params || '[]');
        const params2 = JSON.parse(v2.request_params || '[]');
        changes.push(`📋 请求参数: ${params1.length} 个 → ${params2.length} 个`);
      } catch {
        changes.push(`📋 请求参数已变更`);
      }
    }
    if (v1.request_headers !== v2.request_headers) {
      try {
        const h1 = JSON.parse(v1.request_headers || '[]');
        const h2 = JSON.parse(v2.request_headers || '[]');
        changes.push(`📌 请求头: ${h1.length} 个 → ${h2.length} 个`);
      } catch {
        changes.push(`📌 请求头已变更`);
      }
    }
    if (v1.request_body_type !== v2.request_body_type) {
      changes.push(`📦 请求体类型: ${v1.request_body_type} → ${v2.request_body_type}`);
    }
    if (v1.request_body !== v2.request_body) {
      changes.push(`📦 请求体内容已变更`);
    }
    if (v1.response_description !== v2.response_description) {
      changes.push(`📝 响应描述已变更`);
    }
    if (v1.response_body !== v2.response_body) {
      changes.push(`📤 响应体已变更`);
    }
    if (v1.change_log !== v2.change_log) {
      changes.push(`📒 变更说明: ${v2.change_log}`);
    }
    
    if (changes.length === 0) {
      return '✅ 两个版本完全相同，没有差异';
    }
    
    return `共发现 ${changes.length} 处变更:\n\n${changes.join('\n')}`;
  };

  const formatJson = (str: string): string => {
    if (!str) return '';
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const DiffBlock = ({ label, oldValue, newValue, isJson = false }: { label: string; oldValue: string; newValue: string; isJson?: boolean }) => {
    const hasChange = oldValue !== newValue;
    if (!hasChange) {
      return (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-1">{label}</h4>
          <pre className="code-editor text-xs p-2 bg-gray-50 max-h-32 overflow-auto whitespace-pre-wrap">
            {isJson ? formatJson(newValue) : (newValue || '(空)')}
          </pre>
        </div>
      );
    }
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
          {label}
          <span className="text-xs text-yellow-600 font-normal">已变更</span>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-red-500 mb-1">▼ 修改前</div>
            <pre className="code-editor text-xs p-2 bg-red-50 max-h-40 overflow-auto whitespace-pre-wrap border border-red-100">
              {isJson ? formatJson(oldValue) : (oldValue || '(空)')}
            </pre>
          </div>
          <div>
            <div className="text-xs text-green-500 mb-1">▼ 修改后</div>
            <pre className="code-editor text-xs p-2 bg-green-50 max-h-40 overflow-auto whitespace-pre-wrap border border-green-100">
              {isJson ? formatJson(newValue) : (newValue || '(空)')}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">�</div>
        <p className="text-lg">请先选择一个项目</p>
      </div>
    );
  }

  const allVersionsSorted = getAllVersionsSorted();
  const prevVersion = selectedVersion ? getPreviousVersion(selectedVersion.version) : null;

  return (
    <div className="h-full flex p-4 gap-4">
      <div className="w-64 card p-3 overflow-y-auto">
        <h3 className="font-medium text-gray-700 mb-3">选择接口</h3>
        <div className="space-y-1">
          {apis.map((api: any) => (
            <div
              key={api.id}
              className={`p-2 rounded cursor-pointer ${
                selectedApi?.id === api.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelectApi(api as API)}
            >
              <div className="flex items-center gap-2">
                <span className={`method-badge text-xs ${METHOD_COLORS[api.method]}`}>
                  {api.method}
                </span>
                <span className="text-sm truncate">{api.name}</span>
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                {api.path}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                v{api.version} · {apiVersions.filter(v => v.api_id === api.id).length} 条历史
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">
              {selectedApi ? `版本历史 - ${selectedApi.name}` : '请选择接口'}
            </h3>
            {selectedApi && (
              <button
                className="btn btn-secondary text-sm"
                onClick={() => setShowCompare(!showCompare)}
              >
                {showCompare ? '隐藏对比' : '🔍 版本对比'}
              </button>
            )}
          </div>

          {showCompare && selectedApi && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="select text-sm flex-1"
                  value={compareV1 || ''}
                  onChange={(e) => setCompareV1(Number(e.target.value) || null)}
                >
                  <option value="">选择旧版本</option>
                  {allVersionsSorted.map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} {v.change_log || ''}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400">→</span>
                <select
                  className="select text-sm flex-1"
                  value={compareV2 || ''}
                  onChange={(e) => setCompareV2(Number(e.target.value) || null)}
                >
                  <option value="">选择新版本</option>
                  {allVersionsSorted.map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} {v.change_log || ''}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary text-sm"
                  onClick={handleCompare}
                  disabled={!compareV1 || !compareV2}
                >
                  对比
                </button>
              </div>
              {diffResult && (
                <pre className="text-xs bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap">
                  {diffResult}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!selectedApi ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">�</div>
              <p className="text-sm">选择接口查看变更历史</p>
            </div>
          ) : allVersionsSorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">暂无变更记录</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {allVersionsSorted.map((version, index) => (
                <div key={version.version} className="relative pl-10 pb-6">
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                    index === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                  }`}></div>
                  
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVersion?.version === version.version
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleViewVersionDetail(version)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">v{version.version}</span>
                        {index === 0 && (
                          <span className="badge bg-blue-100 text-blue-700 text-xs">当前</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {version.change_log || '无变更说明'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className={`method-badge ${METHOD_COLORS[version.method]} text-xs`}>
                        {version.method}
                      </span>
                      <span className="font-mono truncate">{version.path}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showVersionDetail && selectedVersion && (
        <div className="w-[500px] card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              版本详情 - v{selectedVersion.version}
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => { setShowVersionDetail(false); setSelectedVersion(null); }}
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-gray-800 mb-1">
                {selectedVersion.change_log || '无变更说明'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-3">
                <span>👤 {settings.username || '系统用户'}</span>
                <span>🕐 {new Date(selectedVersion.created_at).toLocaleString()}</span>
              </div>
            </div>

            {prevVersion ? (
              <>
                <h4 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  与上一版本 (v{prevVersion.version}) 的对比
                </h4>

                <DiffBlock
                  label="接口名称"
                  oldValue={prevVersion.name || ''}
                  newValue={selectedVersion.name || ''}
                />

                <DiffBlock
                  label="请求方法"
                  oldValue={prevVersion.method || ''}
                  newValue={selectedVersion.method || ''}
                />

                <DiffBlock
                  label="请求路径"
                  oldValue={prevVersion.path || ''}
                  newValue={selectedVersion.path || ''}
                />

                <DiffBlock
                  label="接口描述"
                  oldValue={prevVersion.description || ''}
                  newValue={selectedVersion.description || ''}
                />

                <DiffBlock
                  label="Query 参数"
                  oldValue={prevVersion.request_params || ''}
                  newValue={selectedVersion.request_params || ''}
                  isJson
                />

                <DiffBlock
                  label="请求头"
                  oldValue={prevVersion.request_headers || ''}
                  newValue={selectedVersion.request_headers || ''}
                  isJson
                />

                <DiffBlock
                  label="请求体类型"
                  oldValue={prevVersion.request_body_type || ''}
                  newValue={selectedVersion.request_body_type || ''}
                />

                <DiffBlock
                  label="请求体内容"
                  oldValue={prevVersion.request_body || ''}
                  newValue={selectedVersion.request_body || ''}
                  isJson
                />

                <DiffBlock
                  label="响应描述"
                  oldValue={prevVersion.response_description || ''}
                  newValue={selectedVersion.response_description || ''}
                />

                <DiffBlock
                  label="响应体内容"
                  oldValue={prevVersion.response_body || ''}
                  newValue={selectedVersion.response_body || ''}
                  isJson
                />
              </>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">这是第一个版本，没有可对比的历史版本</p>
                <div className="mt-4 text-left">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">当前内容：</h4>
                  <pre className="code-editor text-xs p-3 bg-gray-50 rounded whitespace-pre-wrap">
                    {JSON.stringify({
                      name: selectedVersion.name,
                      method: selectedVersion.method,
                      path: selectedVersion.path,
                      description: selectedVersion.description,
                      request_params: JSON.parse(selectedVersion.request_params || '[]'),
                      request_headers: JSON.parse(selectedVersion.request_headers || '[]'),
                      request_body_type: selectedVersion.request_body_type,
                      request_body: selectedVersion.request_body,
                      response_description: selectedVersion.response_description,
                      response_body: selectedVersion.response_body,
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChangeLog;
