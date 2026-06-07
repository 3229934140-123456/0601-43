import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import EnvironmentManager from './EnvironmentManager';
import type { Project } from '../types';

function ProjectSpace() {
  const {
    projects,
    currentProjectId,
    setCurrentProject,
    createProject,
    deleteProject,
    updateProject,
    loadFolders,
    loadEnvironments,
    exportProject,
    importProject,
    loadProjects,
  } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (currentProjectId) {
      loadFolders(currentProjectId);
      loadEnvironments(currentProjectId);
    }
  }, [currentProjectId]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    await createProject(projectName.trim(), projectDesc.trim());
    setProjectName('');
    setProjectDesc('');
    setShowCreateModal(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDesc(project.description);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !projectName.trim()) return;
    await updateProject(editingProject.id, projectName.trim(), projectDesc.trim());
    setShowEditModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`确定要删除项目"${project.name}"吗？此操作不可恢复。`)) return;
    await deleteProject(project.id);
  };

  const handleSelectProject = async (project: Project) => {
    setCurrentProject(project.id);
  };

  const handleExportProject = async (project: Project) => {
    const result = await exportProject(project.id);
    if (result.success) {
      alert('项目导出成功！');
    }
  };

  const handleImportProject = async () => {
    const result = await importProject();
    if (result.success) {
      alert('项目导入成功！');
      await loadProjects();
    } else if (result.error) {
      alert(`导入失败: ${result.error}`);
    }
  };

  const handleManageEnvs = (project: Project) => {
    setSelectedProject(project);
    setShowEnvManager(true);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">我的项目</h2>
          <p className="text-sm text-gray-500 mt-1">管理和组织您的接口项目</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleImportProject}>
            📥 导入项目
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + 新建项目
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-lg">暂无项目</p>
            <p className="text-sm mt-2">点击上方按钮创建您的第一个项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                  currentProjectId === project.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleSelectProject(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                      onClick={(e) => { e.stopPropagation(); handleManageEnvs(project); }}
                      title="环境变量"
                    >
                      🌐
                    </button>
                    <button
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-green-600"
                      onClick={(e) => { e.stopPropagation(); handleExportProject(project); }}
                      title="导出"
                    >
                      📤
                    </button>
                    <button
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 truncate">{project.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">
                  {project.description || '暂无描述'}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  更新于 {new Date(project.updated_at).toLocaleDateString()}
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
              <h3 className="text-lg font-semibold">新建项目</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
                <input
                  type="text"
                  className="input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="请输入项目名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
                <textarea
                  className="textarea h-24"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="请输入项目描述（可选）"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateProject}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingProject && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content w-96" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">编辑项目</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
                <input
                  type="text"
                  className="input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
                <textarea
                  className="textarea h-24"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnvManager && selectedProject && (
        <EnvironmentManager
          project={selectedProject}
          onClose={() => {
            setShowEnvManager(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
}

export default ProjectSpace;
