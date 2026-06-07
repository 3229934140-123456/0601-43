import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS } from '../types';
import type { API, ApiVersion } from '../types';

function ChangeLog() {
  const { projects, currentProjectId, apis, loadAllApis, apiVersions, loadApiVersions } = useAppStore();
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareV1, setCompareV1] = useState<number | null>(null);
  const [compareV2, setCompareV2] = useState<number | null>(null);
  const [diffResult, setDiffResult] = useState<string>('');

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
  };

  const handleCompare = () => {
    if (!compareV1 || !compareV2 || !selectedApi) return;
    
    const getVersionData = (versionNum: number): ApiVersion | null => {
      if (versionNum === selectedApi!.version) {
        return {
          id: 0,
          api_id: selectedApi!.id,
          version: selectedApi!.version,
          name: selectedApi!.name,
          method: selectedApi!.method,
          path: selectedApi!.path,
          description: selectedApi!.description,
          request_params: selectedApi!.request_params,
          request_headers: selectedApi!.request_headers,
          request_body_type: selectedApi!.request_body_type,
          request_body: selectedApi!.request_body,
          response_description: selectedApi!.response_description,
          response_body: selectedApi!.response_body,
          change_log: '当前版本',
          created_at: selectedApi!.updated_at,
        } as ApiVersion;
      }
      return apiVersions.find(v => v.version === versionNum) || null;
    };
    
    const v1 = getVersionData(compareV1);
    const v2 = getVersionData(compareV2);
    
    if (!v1 || !v2) {
      setDiffResult('找不到对应的版本数据');
      return;
    }
    
    const diff = generateDiff(v1, v2);
    setDiffResult(diff);
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

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg">请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex p-4 gap-4">
      <div className="w-72 card p-3 overflow-y-auto">
        <h3 className="font-medium text-gray-700 mb-3">接口列表</h3>
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
              <div className="text-xs text-gray-500 mt-1">
                v{api.version} · {new Date(api.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-700">
            {selectedApi ? `${selectedApi.name} - 变更记录` : '请选择接口查看变更记录'}
          </h3>
          {selectedApi && (
            <button
              className="btn btn-secondary text-sm"
              onClick={() => setShowCompare(!showCompare)}
            >
              {showCompare ? '关闭比较' : '版本对比'}
            </button>
          )}
        </div>

        {showCompare && selectedApi && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <select
                className="select text-sm w-32"
                value={compareV1 || ''}
                onChange={(e) => setCompareV1(Number(e.target.value) || null)}
              >
                <option value="">选择版本 V1</option>
                {apiVersions.map((v: any) => (
                  <option key={v.version} value={v.version}>v{v.version}</option>
                ))}
                <option value={selectedApi.version}>v{selectedApi.version} (当前)</option>
              </select>
              <span className="text-gray-400">VS</span>
              <select
                className="select text-sm w-32"
                value={compareV2 || ''}
                onChange={(e) => setCompareV2(Number(e.target.value) || null)}
              >
                <option value="">选择版本 V2</option>
                {apiVersions.map((v: any) => (
                  <option key={v.version} value={v.version}>v{v.version}</option>
                ))}
                <option value={selectedApi.version}>v{selectedApi.version} (当前)</option>
              </select>
              <button className="btn btn-primary text-sm" onClick={handleCompare}>
                比较
              </button>
            </div>
            {diffResult && (
              <div className="p-3 bg-white rounded border border-gray-200">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{diffResult}</pre>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedApi ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">选择左侧接口查看变更历史</p>
            </div>
          ) : apiVersions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>暂无历史版本</p>
              <p className="text-sm mt-1">当前版本 v{selectedApi.version}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {apiVersions.map((version: any, index: number) => (
                  <div key={version.id} className="flex gap-4 pb-6 relative">
                    {index < apiVersions.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0 z-10">
                      {version.version}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">v{version.version}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(version.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {version.change_log || '无变更说明'}
                      </p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>方法: {version.method}</div>
                        <div>路径: {version.path}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {selectedApi.version}
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-800">v{selectedApi.version} (当前)</span>
                      <span className="text-xs text-green-600">最新版本</span>
                    </div>
                    <div className="text-xs text-green-600 space-y-0.5">
                      <div>方法: {selectedApi.method}</div>
                      <div>路径: {selectedApi.path}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChangeLog;
