import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { METHOD_COLORS } from '../types';
import type { ReviewItem, API } from '../types';

function ReviewPanel() {
  const {
    projects,
    currentProjectId,
    apis,
    loadAllApis,
    reviewItems,
    loadReviewItems,
    createReviewItem,
    updateReviewStatus,
    deleteReviewItem,
    comments,
  } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('api');
  const [newApiId, setNewApiId] = useState<number | null>(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (currentProjectId) {
      loadReviewItems(currentProjectId);
      loadAllApis(currentProjectId);
    }
  }, [currentProjectId]);

  const handleCreate = async () => {
    if (!currentProjectId || !newTitle.trim() || !newApiId) return;
    
    await createReviewItem({
      project_id: currentProjectId,
      api_id: newApiId,
      title: newTitle.trim(),
      type: newType,
      assignee: newAssignee.trim() || null,
      due_date: newDueDate || null,
    });
    
    setNewTitle('');
    setNewType('api');
    setNewApiId(null);
    setNewAssignee('');
    setNewDueDate('');
    setShowCreateModal(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'api': return '接口评审';
      case 'design': return '设计评审';
      case 'bug': return '问题修复';
      case 'optimization': return '优化建议';
      default: return type;
    }
  };

  const filteredItems = reviewItems.filter((item: ReviewItem) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: reviewItems.length,
    pending: reviewItems.filter((i: ReviewItem) => i.status === 'pending').length,
    in_progress: reviewItems.filter((i: ReviewItem) => i.status === 'in_progress').length,
    completed: reviewItems.filter((i: ReviewItem) => i.status === 'completed').length,
  };

  const generateReviewList = () => {
    if (!currentProjectId || apis.length === 0) return;
    
    const newItems = apis.slice(0, 3).map((api: any) => ({
      project_id: currentProjectId,
      api_id: api.id,
      title: `评审: ${api.name}`,
      type: 'api',
      assignee: null,
      due_date: null,
    }));
    
    newItems.forEach(async (item) => {
      await createReviewItem(item);
    });
    
    alert(`已生成 ${newItems.length} 条评审项`);
  };

  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-lg">请先选择一个项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-500">总计</span>
              <span className="ml-2 font-semibold text-gray-800">{stats.total}</span>
            </div>
            <div className="px-3 py-1.5 bg-yellow-50 rounded-lg">
              <span className="text-sm text-yellow-600">待处理</span>
              <span className="ml-2 font-semibold text-yellow-700">{stats.pending}</span>
            </div>
            <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-600">进行中</span>
              <span className="ml-2 font-semibold text-blue-700">{stats.in_progress}</span>
            </div>
            <div className="px-3 py-1.5 bg-green-50 rounded-lg">
              <span className="text-sm text-green-600">已完成</span>
              <span className="ml-2 font-semibold text-green-700">{stats.completed}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={generateReviewList}>
            📋 生成评审清单
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + 新建评审项
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态:</span>
          <select
            className="select text-sm w-28"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">类型:</span>
          <select
            className="select text-sm w-28"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="api">接口评审</option>
            <option value="design">设计评审</option>
            <option value="bug">问题修复</option>
            <option value="optimization">优化建议</option>
          </select>
        </div>
      </div>

      <div className="flex-1 card overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">暂无评审项</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item: any) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${getStatusBadge(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                      <span className="badge bg-gray-100 text-gray-600">
                        {getTypeText(item.type)}
                      </span>
                      <h4 className="font-medium text-gray-800">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {item.api_name && (
                        <div className="flex items-center gap-1">
                          <span className={`method-badge text-xs ${METHOD_COLORS[item.method || 'GET']}`}>
                            {item.method}
                          </span>
                          <span className="font-mono text-xs">{item.path}</span>
                        </div>
                      )}
                      {item.assignee && <span>负责人: {item.assignee}</span>}
                      {item.due_date && <span>截止: {item.due_date}</span>}
                      <span className="text-xs text-gray-400">
                        创建于 {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      className="select text-xs w-24 py-1"
                      value={item.status}
                      onChange={(e) => updateReviewStatus(item.id, e.target.value)}
                    >
                      <option value="pending">待处理</option>
                      <option value="in_progress">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="rejected">已拒绝</option>
                    </select>
                    <button
                      className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      onClick={() => {
                        if (confirm('确定删除此评审项？')) {
                          deleteReviewItem(item.id);
                        }
                      }}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content w-96" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">新建评审项</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">评审标题</label>
                <input
                  type="text"
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="请输入评审标题"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">评审类型</label>
                <select
                  className="select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="api">接口评审</option>
                  <option value="design">设计评审</option>
                  <option value="bug">问题修复</option>
                  <option value="optimization">优化建议</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联接口</label>
                <select
                  className="select"
                  value={newApiId || ''}
                  onChange={(e) => setNewApiId(Number(e.target.value) || null)}
                >
                  <option value="">请选择接口</option>
                  {apis.map((api: any) => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                  <input
                    type="text"
                    className="input"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                  <input
                    type="date"
                    className="input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewPanel;
