import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS, HTTP_METHODS } from '../types';
import type { API, APIParam } from '../types';

interface ApiEditorProps {
  api: API;
  isEditing: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type TabType = 'params' | 'headers' | 'body' | 'response' | 'comments' | 'history';

function ApiEditor({ api, isEditing, onClose, onSaved }: ApiEditorProps) {
  const { updateApi, loadComments, comments, createComment, settings } = useAppStore();
  
  const [editing, setEditing] = useState(isEditing);
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [name, setName] = useState(api.name);
  const [method, setMethod] = useState(api.method);
  const [path, setPath] = useState(api.path);
  const [description, setDescription] = useState(api.description);
  const [params, setParams] = useState<APIParam[]>([]);
  const [headers, setHeaders] = useState<APIParam[]>([]);
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form' | 'raw'>(api.request_body_type as any);
  const [body, setBody] = useState(api.request_body);
  const [responseDescription, setResponseDescription] = useState(api.response_description);
  const [responseBody, setResponseBody] = useState(api.response_body);
  const [changeLog, setChangeLog] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentField, setCommentField] = useState('整体');

  useEffect(() => {
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
  }, [api]);

  useEffect(() => {
    if (api.id) {
      loadComments(api.id);
    }
  }, [api.id]);

  const handleSave = () => {
    if (!changeLog.trim()) {
      setShowSaveModal(true);
      return;
    }
    doSave();
  };

  const doSave = async () => {
    const data = {
      name,
      method,
      path,
      description,
      request_params: JSON.stringify(params.filter(p => p.key)),
      request_headers: JSON.stringify(headers.filter(h => h.key)),
      request_body_type: bodyType,
      request_body: body,
      response_description: responseDescription,
      response_body: responseBody,
    };
    await updateApi(api.id, data, changeLog || '更新接口');
    setEditing(false);
    setShowSaveModal(false);
    setChangeLog('');
    onSaved();
  };

  const addParam = () => {
    setParams([...params, { key: '', value: '', description: '', required: false }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: keyof APIParam, value: any) => {
    const newParams = [...params];
    (newParams[index] as any)[field] = value;
    setParams(newParams);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', description: '', required: false }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof APIParam, value: any) => {
    const newHeaders = [...headers];
    (newHeaders[index] as any)[field] = value;
    setHeaders(newHeaders);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await createComment(api.id, commentField, newComment.trim(), settings.username || '用户');
    setNewComment('');
  };

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'params', label: '请求参数' },
    { id: 'headers', label: '请求头' },
    { id: 'body', label: '请求体' },
    { id: 'response', label: '响应说明' },
    { id: 'comments', label: `评论 (${comments.length})` },
    { id: 'history', label: '历史版本' },
  ];

  return (
    <div className="flex-1 flex flex-col border-l border-gray-200 bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                className="text-lg font-semibold text-gray-800 w-full border-none outline-none bg-transparent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-800">
                {api.name}
                {api.is_deprecated && <span className="ml-2 badge bg-gray-200 text-gray-600">已废弃</span>}
              </h3>
            )}
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-xl ml-4" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
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
                className="input text-sm flex-1 font-mono"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/path"
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`method-badge ${METHOD_COLORS[method]}`}>{method}</span>
              <span className="font-mono text-sm text-gray-600">{path}</span>
            </div>
          )}
          <div className="flex gap-1 ml-auto">
            {editing ? (
              <>
                <button className="btn btn-secondary text-sm" onClick={() => setEditing(false)}>
                  取消
                </button>
                <button className="btn btn-primary text-sm" onClick={handleSave}>
                  保存
                </button>
              </>
            ) : (
              <button className="btn btn-secondary text-sm" onClick={() => setEditing(true)}>
                编辑
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <textarea
            className="textarea text-sm mt-3 h-16"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="接口描述..."
          />
        ) : description ? (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        ) : null}
      </div>

      <div className="border-b border-gray-200 flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'params' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Query 参数</h4>
              {editing && (
                <button className="text-sm text-blue-600 hover:text-blue-800" onClick={addParam}>
                  + 添加参数
                </button>
              )}
            </div>
            {params.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无参数</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 text-xs text-gray-500 px-1">
                  <span>参数名</span>
                  <span>示例值</span>
                  <span>说明</span>
                  <span className="w-16"></span>
                </div>
                {params.map((param, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                    {editing ? (
                      <>
                        <input
                          type="text"
                          className="input text-sm"
                          value={param.key}
                          onChange={(e) => updateParam(index, 'key', e.target.value)}
                          placeholder="key"
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          value={param.value}
                          onChange={(e) => updateParam(index, 'value', e.target.value)}
                          placeholder="value"
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          value={param.description || ''}
                          onChange={(e) => updateParam(index, 'description', e.target.value)}
                          placeholder="描述"
                        />
                        <button
                          className="text-red-500 hover:text-red-700 px-2"
                          onClick={() => removeParam(index)}
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-700">{param.key}</span>
                        <span className="text-sm text-gray-500 font-mono">{param.value}</span>
                        <span className="text-sm text-gray-600">{param.description}</span>
                        <span></span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">请求头</h4>
              {editing && (
                <button className="text-sm text-blue-600 hover:text-blue-800" onClick={addHeader}>
                  + 添加请求头
                </button>
              )}
            </div>
            {headers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无请求头</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 text-xs text-gray-500 px-1">
                  <span>名称</span>
                  <span>值</span>
                  <span>说明</span>
                  <span className="w-16"></span>
                </div>
                {headers.map((header, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                    {editing ? (
                      <>
                        <input
                          type="text"
                          className="input text-sm"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          placeholder="name"
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          placeholder="value"
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          value={header.description || ''}
                          onChange={(e) => updateHeader(index, 'description', e.target.value)}
                          placeholder="描述"
                        />
                        <button
                          className="text-red-500 hover:text-red-700 px-2"
                          onClick={() => removeHeader(index)}
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-700 font-mono">{header.key}</span>
                        <span className="text-sm text-gray-500 font-mono">{header.value}</span>
                        <span className="text-sm text-gray-600">{header.description}</span>
                        <span></span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">请求体类型：</span>
              {editing ? (
                <select
                  className="select text-sm w-32"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value as any)}
                >
                  <option value="none">none</option>
                  <option value="json">JSON</option>
                  <option value="form">form-data</option>
                  <option value="raw">raw</option>
                </select>
              ) : (
                <span className="text-sm text-gray-600">{bodyType.toUpperCase()}</span>
              )}
            </div>
            {bodyType !== 'none' && (
              editing ? (
                <textarea
                  className="textarea font-mono text-sm"
                  style={{ height: '300px' }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="请求体内容..."
                />
              ) : (
                <pre className="code-editor" style={{ minHeight: '200px' }}>
                  {bodyType === 'json' ? formatJson(body) : body || '（空）'}
                </pre>
              )
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">响应描述</h4>
              {editing ? (
                <textarea
                  className="textarea text-sm h-20"
                  value={responseDescription}
                  onChange={(e) => setResponseDescription(e.target.value)}
                  placeholder="响应描述..."
                />
              ) : (
                <p className="text-sm text-gray-600">{responseDescription || '暂无描述'}</p>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">响应示例</h4>
              {editing ? (
                <textarea
                  className="textarea font-mono text-sm"
                  style={{ height: '300px' }}
                  value={responseBody}
                  onChange={(e) => setResponseBody(e.target.value)}
                  placeholder="响应体 JSON..."
                />
              ) : (
                <pre className="code-editor" style={{ minHeight: '200px' }}>
                  {formatJson(responseBody) || '（空）'}
                </pre>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  className="select text-sm w-32"
                  value={commentField}
                  onChange={(e) => setCommentField(e.target.value)}
                >
                  <option value="整体">整体</option>
                  <option value="请求参数">请求参数</option>
                  <option value="请求体">请求体</option>
                  <option value="响应">响应</option>
                </select>
                <input
                  type="text"
                  className="input text-sm flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的评论..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button className="btn btn-primary text-sm" onClick={handleAddComment}>
                  发送
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">暂无评论</p>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{comment.author}</span>
                        <span className="badge bg-blue-100 text-blue-700">{comment.field_path}</span>
                        <span
                          className={`badge ${
                            comment.status === 'resolved'
                              ? 'bg-green-100 text-green-700'
                              : comment.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {comment.status === 'pending' ? '待处理' : comment.status === 'resolved' ? '已解决' : '已拒绝'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">当前版本：v{api.version}</p>
            <div className="space-y-2">
              {api.version <= 1 ? (
                <p className="text-sm text-gray-400 py-4 text-center">暂无历史版本</p>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: api.version - 1 }, (_, i) => api.version - 1 - i).map((v) => (
                    <div key={v} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">v{v}</span>
                        <button className="text-xs text-blue-600 hover:text-blue-800">
                          查看详情
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content w-96" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">保存变更</h3>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">变更说明</label>
              <textarea
                className="textarea h-24"
                value={changeLog}
                onChange={(e) => setChangeLog(e.target.value)}
                placeholder="描述本次修改内容..."
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={doSave}>
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiEditor;
