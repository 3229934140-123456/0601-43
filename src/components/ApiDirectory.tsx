import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import ApiEditor from './ApiEditor';
import { METHOD_COLORS } from '../types';
import type { Folder, API } from '../types';

function ApiDirectory() {
  const {
    projects,
    currentProjectId,
    setCurrentProject,
    folders,
    apis,
    loadFolders,
    loadApis,
    loadAllApis,
    createFolder,
    createApi,
    deleteFolder,
    deleteApi,
    toggleDeprecated,
    searchApis,
    searchResults,
    searchKeyword,
    setSearchKeyword,
    reviewItems,
    loadReviewItems,
    batchMoveApis,
    batchDeprecateApis,
    exportSelectedApis,
  } = useAppStore();

  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [showAllApis, setShowAllApis] = useState(true);
  const [selectedApi, setSelectedApi] = useState<API | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showNewApiInput, setShowNewApiInput] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiMethod, setNewApiMethod] = useState('GET');
  const [newApiPath, setNewApiPath] = useState('');
  const [selectedApiIds, setSelectedApiIds] = useState<Set<number>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<number | null>(null);

  useEffect(() => {
    if (currentProjectId) {
      loadFolders(currentProjectId);
      loadReviewItems(currentProjectId);
      if (showAllApis) {
        loadAllApis(currentProjectId);
      } else {
        loadApis(currentProjectId, currentFolderId);
      }
    }
  }, [currentProjectId, currentFolderId, showAllApis]);

  const handleSelectProject = (projectId: number) => {
    setCurrentProject(projectId);
    setCurrentFolderId(null);
    setShowAllApis(true);
    setSelectedApi(null);
    setShowEditor(false);
    setSelectedApiIds(new Set());
  };

  const handleClickAllApis = () => {
    setShowAllApis(true);
    setCurrentFolderId(null);
    setSelectedApiIds(new Set());
  };

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async () => {
    if (!currentProjectId || !newFolderName.trim()) return;
    await createFolder(currentProjectId, currentFolderId, newFolderName.trim());
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleCreateApi = async () => {
    if (!currentProjectId || !newApiName.trim()) return;
    const id = await createApi({
      project_id: currentProjectId,
      folder_id: currentFolderId,
      name: newApiName.trim(),
      method: newApiMethod,
      path: newApiPath.trim(),
    });
    const api = await useAppStore.getState().loadApi(id);
    if (api) {
      setSelectedApi(api as API);
      setIsEditing(true);
      setShowEditor(true);
    }
    setNewApiName('');
    setNewApiPath('');
    setShowNewApiInput(false);
    loadApis(currentProjectId, currentFolderId);
  };

  const handleSelectApi = (api: API) => {
    setSelectedApi(api);
    setIsEditing(false);
    setShowEditor(true);
  };

  const handleDeleteApi = async (api: API) => {
    if (!confirm(`确定要删除接口"${api.name}"吗？`)) return;
    await deleteApi(api.id);
    if (showAllApis) {
      loadAllApis(currentProjectId!);
    } else {
      loadApis(currentProjectId!, currentFolderId);
    }
    if (selectedApi?.id === api.id) {
      setSelectedApi(null);
      setShowEditor(false);
    }
  };

  const handleToggleDeprecated = async (api: API) => {
    await toggleDeprecated(api.id, !api.is_deprecated);
    if (showAllApis) {
      loadAllApis(currentProjectId!);
    } else {
      loadApis(currentProjectId!, currentFolderId);
    }
    if (selectedApi?.id === api.id) {
      setSelectedApi({ ...selectedApi, is_deprecated: api.is_deprecated ? 0 : 1 });
    }
  };

  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    if (currentProjectId && keyword.trim()) {
      searchApis(currentProjectId, keyword);
    }
    setSelectedApiIds(new Set());
  };

  const toggleSelectApi = (apiId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedApiIds);
    if (newSelected.has(apiId)) {
      newSelected.delete(apiId);
    } else {
      newSelected.add(apiId);
    }
    setSelectedApiIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedApiIds.size === displayApis.length) {
      setSelectedApiIds(new Set());
    } else {
      setSelectedApiIds(new Set(displayApis.map((a: any) => a.id)));
    }
  };

  const handleBatchMove = async () => {
    if (selectedApiIds.size === 0) return;
    await batchMoveApis(Array.from(selectedApiIds), moveTargetFolderId);
    setShowMoveDialog(false);
    setSelectedApiIds(new Set());
    if (showAllApis) {
      loadAllApis(currentProjectId!);
    } else {
      loadApis(currentProjectId!, currentFolderId);
    }
  };

  const handleBatchDeprecate = async (deprecated: boolean) => {
    if (selectedApiIds.size === 0) return;
    if (!confirm(deprecated 
      ? `确定要将选中的 ${selectedApiIds.size} 个接口标记为废弃吗？`
      : `确定要取消选中的 ${selectedApiIds.size} 个接口的废弃标记吗？`
    )) return;
    await batchDeprecateApis(Array.from(selectedApiIds), deprecated);
    setSelectedApiIds(new Set());
    if (showAllApis) {
      loadAllApis(currentProjectId!);
    } else {
      loadApis(currentProjectId!, currentFolderId);
    }
  };

  const handleBatchExport = async () => {
    if (selectedApiIds.size === 0) return;
    const result = await exportSelectedApis(currentProjectId!, Array.from(selectedApiIds));
    if (result.success) {
      alert(`已导出 ${selectedApiIds.size} 个接口到：${result.path}`);
    }
  };

  const getApiReviewStatus = (apiId: number): string | null => {
    const apiReviews = reviewItems.filter(r => r.api_id === apiId);
    if (apiReviews.length === 0) return null;
    const hasPending = apiReviews.some(r => r.status === 'pending' || r.status === 'in_progress');
    if (hasPending) return 'pending';
    return 'done';
  };

  const currentProject = projects.find(p => p.id === currentProjectId);
  const displayApis = searchKeyword.trim() ? searchResults : apis;

  const buildFolderTree = (parentId: number | null): Folder[] => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const renderFolderTree = (parentId: number | null, level: number = 0) => {
    const folderList = buildFolderTree(parentId);
    return folderList.map((folder) => (
      <div key={folder.id}>
        <div
          className={`tree-node ${currentFolderId === folder.id ? 'tree-node-active' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            toggleFolder(folder.id);
            setCurrentFolderId(folder.id);
            setShowAllApis(false);
            setSelectedApiIds(new Set());
          }}
        >
          <span className="text-xs w-4">
            {expandedFolders.has(folder.id) ? '▼' : '▶'}
          </span>
          <span>📂</span>
          <span className="flex-1 truncate">{folder.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded text-xs"
            onClick={(e) => { e.stopPropagation(); }}
          >
            ⋯
          </button>
        </div>
        {expandedFolders.has(folder.id) && renderFolderTree(folder.id, level + 1)}
      </div>
    ));
  };

  const renderMoveFolderOptions = (parentId: number | null, level: number = 0) => {
    const folderList = buildFolderTree(parentId);
    return folderList.map((folder) => (
      <div key={folder.id}>
        <option value={folder.id} style={{ paddingLeft: `${level * 16}px` }}>
          {'　'.repeat(level)}📁 {folder.name}
        </option>
        {renderMoveFolderOptions(folder.id, level + 1)}
      </div>
    ));
  };

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-lg">请先选择一个项目</p>
        {projects.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-sm">选择项目：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {projects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 text-sm"
                  onClick={() => handleSelectProject(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <select
            className="select text-sm"
            value={currentProjectId}
            onChange={(e) => handleSelectProject(Number(e.target.value))}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            className="input text-sm"
            placeholder="🔍 搜索接口..."
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!searchKeyword.trim() && (
            <>
              <div
                className={`tree-node ${showAllApis ? 'tree-node-active' : ''}`}
                onClick={handleClickAllApis}
              >
                <span className="w-4"></span>
                <span>🏠</span>
                <span className="flex-1">全部接口</span>
              </div>

              {renderFolderTree(null)}

              <div className="mt-2 pt-2 border-t border-gray-100">
                {showNewFolderInput ? (
                  <div className="px-2 py-1 space-y-1">
                    <input
                      type="text"
                      className="input text-sm"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="文件夹名称"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <div className="flex gap-1">
                      <button className="btn btn-primary text-xs flex-1" onClick={handleCreateFolder}>
                        确定
                      </button>
                      <button
                        className="btn btn-secondary text-xs flex-1"
                        onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full text-sm text-gray-500 hover:text-blue-600 py-1.5 text-left px-2"
                    onClick={() => setShowNewFolderInput(true)}
                  >
                    + 新建文件夹
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">
              {searchKeyword.trim() ? `搜索结果 (${searchResults.length})` : (showAllApis ? '全部接口' : (folders.find(f => f.id === currentFolderId)?.name || '未分组'))}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              共 {displayApis.length} 个接口
              {selectedApiIds.size > 0 && ` · 已选 ${selectedApiIds.size} 个`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedApiIds.size > 0 && (
              <>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setShowMoveDialog(true)}
                >
                  📁 移动到...
                </button>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => handleBatchDeprecate(true)}
                >
                  ⚠️ 标记废弃
                </button>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => handleBatchDeprecate(false)}
                >
                  🔄 取消废弃
                </button>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={handleBatchExport}
                >
                  📤 导出选中
                </button>
                <button
                  className="btn btn-ghost text-sm"
                  onClick={() => setSelectedApiIds(new Set())}
                >
                  取消选择
                </button>
              </>
            )}
            {!searchKeyword.trim() && (
              <button
                className="btn btn-primary text-sm"
                onClick={() => { setShowNewApiInput(true); setNewApiName(''); setNewApiPath(''); }}
              >
                + 新建接口
              </button>
            )}
          </div>
        </div>

        {showNewApiInput && (
          <div className="p-3 bg-blue-50 border-b border-blue-100">
            <div className="flex gap-2 items-center">
              <select
                className="select text-sm w-24"
                value={newApiMethod}
                onChange={(e) => setNewApiMethod(e.target.value)}
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                className="input text-sm flex-1"
                value={newApiName}
                onChange={(e) => setNewApiName(e.target.value)}
                placeholder="接口名称"
                autoFocus
              />
              <input
                type="text"
                className="input text-sm w-48"
                value={newApiPath}
                onChange={(e) => setNewApiPath(e.target.value)}
                placeholder="/api/path"
              />
              <button className="btn btn-primary text-sm" onClick={handleCreateApi}>
                创建
              </button>
              <button
                className="btn btn-secondary text-sm"
                onClick={() => setShowNewApiInput(false)}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {showMoveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
              <h3 className="font-medium text-lg mb-4">移动到文件夹</h3>
              <p className="text-sm text-gray-600 mb-4">
                已选中 {selectedApiIds.size} 个接口，选择目标文件夹：
              </p>
              <select
                className="select w-full mb-4"
                value={moveTargetFolderId === null ? '' : moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">🏠 未分组（根目录）</option>
                {renderMoveFolderOptions(null)}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setShowMoveDialog(false)}
                >
                  取消
                </button>
                <button
                  className="btn btn-primary text-sm"
                  onClick={handleBatchMove}
                >
                  确认移动
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {displayApis.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>{searchKeyword.trim() ? '没有找到匹配的接口' : '暂无接口'}</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selectedApiIds.size === displayApis.length && displayApis.length > 0}
                  onChange={toggleSelectAll}
                />
                <span className="text-xs text-gray-500">
                  {selectedApiIds.size === displayApis.length && displayApis.length > 0 ? '取消全选' : '全选'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {displayApis.map((api: any) => {
                  const reviewStatus = getApiReviewStatus(api.id);
                  return (
                    <div
                      key={api.id}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer group ${
                        selectedApi?.id === api.id ? 'bg-blue-50' : ''
                      } ${api.is_deprecated ? 'opacity-60' : ''}`}
                      onClick={() => handleSelectApi(api as API)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer"
                          checked={selectedApiIds.has(api.id)}
                          onClick={(e) => toggleSelectApi(api.id, e)}
                          onChange={() => {}}
                        />
                        <span className={`method-badge ${METHOD_COLORS[api.method] || 'bg-gray-100 text-gray-600'}`}>
                          {api.method}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">{api.name}</span>
                            {api.is_deprecated && (
                              <span className="badge bg-gray-200 text-gray-600">已废弃</span>
                            )}
                            {reviewStatus === 'pending' && (
                              <span className="badge bg-yellow-100 text-yellow-700">⏳ 待评审</span>
                            )}
                            {reviewStatus === 'done' && (
                              <span className="badge bg-green-100 text-green-700">✓ 已评审</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5 font-mono">
                            {api.path || '-'}
                          </div>
                        </div>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            className="p-1 hover:bg-gray-200 rounded text-xs"
                            onClick={(e) => { e.stopPropagation(); handleToggleDeprecated(api as API); }}
                            title={api.is_deprecated ? '取消废弃' : '标记废弃'}
                          >
                            {api.is_deprecated ? '🔄' : '⚠️'}
                          </button>
                          <button
                            className="p-1 hover:bg-red-100 rounded text-red-500 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleDeleteApi(api as API); }}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showEditor && selectedApi && (
        <ApiEditor
          api={selectedApi}
          isEditing={isEditing}
          onClose={() => { setShowEditor(false); setSelectedApi(null); }}
          onSaved={() => {
            if (showAllApis) {
              loadAllApis(currentProjectId!);
            } else {
              loadApis(currentProjectId!, currentFolderId);
            }
            if (searchKeyword.trim()) {
              searchApis(currentProjectId!, searchKeyword);
            }
          }}
        />
      )}
    </div>
  );
}

export default ApiDirectory;
