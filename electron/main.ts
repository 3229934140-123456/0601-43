import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import axios from 'axios';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;

const resolveHtmlPath = (htmlFileName: string) => {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }
  return path.resolve(__dirname, htmlFileName);
};

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'api-manager.db');
  return dbPath;
}

function initDatabase() {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS environments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      variables TEXT DEFAULT '{}',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      parent_id INTEGER,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      folder_id INTEGER,
      name TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      path TEXT NOT NULL,
      description TEXT,
      request_params TEXT DEFAULT '[]',
      request_headers TEXT DEFAULT '[]',
      request_body_type TEXT DEFAULT 'none',
      request_body TEXT DEFAULT '',
      response_description TEXT,
      response_body TEXT DEFAULT '{}',
      is_deprecated INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS api_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      name TEXT,
      method TEXT,
      path TEXT,
      description TEXT,
      request_params TEXT,
      request_headers TEXT,
      request_body_type TEXT,
      request_body TEXT,
      response_description TEXT,
      response_body TEXT,
      change_log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER NOT NULL,
      field_path TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT DEFAULT '匿名',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      api_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      assignee TEXT,
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      duration INTEGER,
      request_data TEXT,
      response_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS request_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      url TEXT NOT NULL,
      params TEXT DEFAULT '[]',
      headers TEXT DEFAULT '[]',
      body_type TEXT DEFAULT 'none',
      body TEXT DEFAULT '',
      last_status_code INTEGER,
      last_duration INTEGER,
      last_response TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  const settingStmt = db.prepare('SELECT COUNT(*) as count FROM settings');
  const count = (settingStmt.get() as { count: number }).count;
  if (count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('theme', 'light');
    insertSetting.run('username', '用户');
    insertSetting.run('timeout', '30000');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
    db = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-projects', () => {
  const stmt = db!.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
  return stmt.all();
});

ipcMain.handle('create-project', (_event, data: { name: string; description: string }) => {
  const stmt = db!.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
  const result = stmt.run(data.name, data.description);
  const projectId = result.lastInsertRowid as number;
  
  const envStmt = db!.prepare('INSERT INTO environments (project_id, name, variables, is_default) VALUES (?, ?, ?, 1)');
  envStmt.run(projectId, '开发环境', JSON.stringify({ baseURL: 'http://localhost:3000' }));
  
  return projectId;
});

ipcMain.handle('update-project', (_event, id: number, data: { name: string; description: string }) => {
  const stmt = db!.prepare('UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(data.name, data.description, id);
  return true;
});

ipcMain.handle('delete-project', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('get-environments', (_event, projectId: number) => {
  const stmt = db!.prepare('SELECT * FROM environments WHERE project_id = ? ORDER BY is_default DESC, created_at ASC');
  return stmt.all(projectId);
});

ipcMain.handle('create-environment', (_event, data: { project_id: number; name: string; variables: string }) => {
  const stmt = db!.prepare('INSERT INTO environments (project_id, name, variables) VALUES (?, ?, ?)');
  const result = stmt.run(data.project_id, data.name, data.variables);
  return result.lastInsertRowid;
});

ipcMain.handle('update-environment', (_event, id: number, data: { name: string; variables: string }) => {
  const stmt = db!.prepare('UPDATE environments SET name = ?, variables = ? WHERE id = ?');
  stmt.run(data.name, data.variables, id);
  return true;
});

ipcMain.handle('delete-environment', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM environments WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('set-default-environment', (_event, projectId: number, envId: number) => {
  db!.prepare('UPDATE environments SET is_default = 0 WHERE project_id = ?').run(projectId);
  db!.prepare('UPDATE environments SET is_default = 1 WHERE id = ?').run(envId);
  return true;
});

ipcMain.handle('get-folders', (_event, projectId: number) => {
  const stmt = db!.prepare('SELECT * FROM folders WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC');
  return stmt.all(projectId);
});

ipcMain.handle('create-folder', (_event, data: { project_id: number; parent_id: number | null; name: string }) => {
  const stmt = db!.prepare('INSERT INTO folders (project_id, parent_id, name) VALUES (?, ?, ?)');
  const result = stmt.run(data.project_id, data.parent_id, data.name);
  return result.lastInsertRowid;
});

ipcMain.handle('update-folder', (_event, id: number, name: string) => {
  const stmt = db!.prepare('UPDATE folders SET name = ? WHERE id = ?');
  stmt.run(name, id);
  return true;
});

ipcMain.handle('delete-folder', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM folders WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('get-apis', (_event, projectId: number, folderId: number | null) => {
  if (folderId === null) {
    const stmt = db!.prepare('SELECT * FROM apis WHERE project_id = ? AND folder_id IS NULL ORDER BY sort_order ASC, created_at DESC');
    return stmt.all(projectId);
  }
  const stmt = db!.prepare('SELECT * FROM apis WHERE project_id = ? AND folder_id = ? ORDER BY sort_order ASC, created_at DESC');
  return stmt.all(projectId, folderId);
});

ipcMain.handle('get-all-apis', (_event, projectId: number) => {
  const stmt = db!.prepare('SELECT * FROM apis WHERE project_id = ? ORDER BY updated_at DESC');
  return stmt.all(projectId);
});

ipcMain.handle('get-api', (_event, id: number) => {
  const stmt = db!.prepare('SELECT * FROM apis WHERE id = ?');
  return stmt.get(id);
});

ipcMain.handle('create-api', (_event, data: any) => {
  const stmt = db!.prepare(`
    INSERT INTO apis (project_id, folder_id, name, method, path, description,
                    request_params, request_headers, request_body_type, request_body,
                    response_description, response_body)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.project_id,
    data.folder_id,
    data.name,
    data.method || 'GET',
    data.path || '',
    data.description || '',
    data.request_params || '[]',
    data.request_headers || '[]',
    data.request_body_type || 'none',
    data.request_body || '',
    data.response_description || '',
    data.response_body || '{}'
  );
  const apiId = result.lastInsertRowid as number;
  
  const versionStmt = db!.prepare(`
    INSERT INTO api_versions (api_id, version, name, method, path, description,
                            request_params, request_headers, request_body_type, request_body,
                            response_description, response_body, change_log)
    VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '初始版本')
  `);
  versionStmt.run(
    apiId,
    data.name,
    data.method || 'GET',
    data.path || '',
    data.description || '',
    data.request_params || '[]',
    data.request_headers || '[]',
    data.request_body_type || 'none',
    data.request_body || '',
    data.response_description || '',
    data.response_body || '{}'
  );
  
  return apiId;
});

ipcMain.handle('update-api', (_event, id: number, data: any, changeLog: string) => {
  const api = db!.prepare('SELECT * FROM apis WHERE id = ?').get(id) as any;
  const newVersion = (api?.version || 1) + 1;
  
  const versionStmt = db!.prepare(`
    INSERT INTO api_versions (api_id, version, name, method, path, description,
                            request_params, request_headers, request_body_type, request_body,
                            response_description, response_body, change_log)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  versionStmt.run(
    id,
    newVersion,
    api.name,
    api.method,
    api.path,
    api.description,
    api.request_params,
    api.request_headers,
    api.request_body_type,
    api.request_body,
    api.response_description,
    api.response_body,
    changeLog || '更新接口'
  );
  
  const stmt = db!.prepare(`
    UPDATE apis SET 
      name = ?, method = ?, path = ?, description = ?,
      request_params = ?, request_headers = ?, request_body_type = ?, request_body = ?,
      response_description = ?, response_body = ?, version = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    data.name,
    data.method,
    data.path,
    data.description,
    data.request_params,
    data.request_headers,
    data.request_body_type,
    data.request_body,
    data.response_description,
    data.response_body,
    newVersion,
    id
  );
  
  return true;
});

ipcMain.handle('delete-api', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM apis WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('toggle-deprecated', (_event, id: number, deprecated: boolean) => {
  const stmt = db!.prepare('UPDATE apis SET is_deprecated = ? WHERE id = ?');
  stmt.run(deprecated ? 1 : 0, id);
  return true;
});

ipcMain.handle('get-api-versions', (_event, apiId: number) => {
  const stmt = db!.prepare('SELECT * FROM api_versions WHERE api_id = ? ORDER BY version DESC');
  return stmt.all(apiId);
});

ipcMain.handle('get-comments', (_event, apiId: number) => {
  const stmt = db!.prepare('SELECT * FROM comments WHERE api_id = ? ORDER BY created_at DESC');
  return stmt.all(apiId);
});

ipcMain.handle('create-comment', (_event, data: { api_id: number; field_path: string; content: string; author: string }) => {
  const stmt = db!.prepare('INSERT INTO comments (api_id, field_path, content, author) VALUES (?, ?, ?, ?)');
  const result = stmt.run(data.api_id, data.field_path, data.content, data.author);
  return result.lastInsertRowid;
});

ipcMain.handle('update-comment-status', (_event, id: number, status: string) => {
  const stmt = db!.prepare('UPDATE comments SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return true;
});

ipcMain.handle('delete-comment', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM comments WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('get-review-items', (_event, projectId: number) => {
  const stmt = db!.prepare(`
    SELECT ri.*, a.name as api_name, a.method, a.path
    FROM review_items ri
    LEFT JOIN apis a ON ri.api_id = a.id
    WHERE ri.project_id = ?
    ORDER BY ri.created_at DESC
  `);
  return stmt.all(projectId);
});

ipcMain.handle('create-review-item', (_event, data: any) => {
  const stmt = db!.prepare('INSERT INTO review_items (project_id, api_id, title, type, assignee, due_date) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(data.project_id, data.api_id, data.title, data.type, data.assignee || null, data.due_date || null);
  return result.lastInsertRowid;
});

ipcMain.handle('update-review-status', (_event, id: number, status: string) => {
  const stmt = db!.prepare('UPDATE review_items SET status = ? WHERE id = ?');
  stmt.run(status, id);
  return true;
});

ipcMain.handle('delete-review-item', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM review_items WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('get-settings', () => {
  const stmt = db!.prepare('SELECT * FROM settings');
  const rows = stmt.all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
});

ipcMain.handle('update-setting', (_event, key: string, value: string) => {
  const stmt = db!.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run(key, value);
  return true;
});

ipcMain.handle('send-request', async (_event, config: any) => {
  const startTime = Date.now();
  try {
    const response = await axios({
      method: config.method,
      url: config.url,
      headers: config.headers || {},
      data: config.body || undefined,
      params: config.params || {},
      timeout: config.timeout || 30000,
      validateStatus: () => true,
    });
    const duration = Date.now() - startTime;
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      duration,
    };
  }
});

ipcMain.handle('save-request-history', (_event, data: any) => {
  const stmt = db!.prepare(`
    INSERT INTO request_history (api_id, url, method, status_code, duration, request_data, response_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.api_id || null,
    data.url,
    data.method,
    data.status_code || null,
    data.duration || 0,
    data.request_data || '',
    data.response_data || ''
  );
  return result.lastInsertRowid;
});

ipcMain.handle('get-request-history', (_event, apiId: number) => {
  const stmt = db!.prepare('SELECT * FROM request_history WHERE api_id = ? ORDER BY created_at DESC LIMIT 20');
  return stmt.all(apiId);
});

ipcMain.handle('export-project', async (_event, projectId: number) => {
  const project = db!.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const environments = db!.prepare('SELECT * FROM environments WHERE project_id = ?').all(projectId);
  const folders = db!.prepare('SELECT * FROM folders WHERE project_id = ?').all(projectId);
  const apis = db!.prepare('SELECT * FROM apis WHERE project_id = ?').all(projectId);
  
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    project,
    environments,
    folders,
    apis,
  };
  
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: '导出项目',
    defaultPath: `${(project as any).name}.json`,
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
  });
  
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
    return { success: true, path: result.filePath };
  }
  
  return { success: false };
});

ipcMain.handle('import-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '导入项目',
    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
    properties: ['openFile'],
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      const data = JSON.parse(content);
      
      if (!data.project || !data.apis) {
        return { success: false, error: '文件格式不正确' };
      }
      
      const projectStmt = db!.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
      const projectResult = projectStmt.run(data.project.name, data.project.description || '');
      const newProjectId = projectResult.lastInsertRowid as number;
      
      if (data.environments && data.environments.length > 0) {
        const envStmt = db!.prepare('INSERT INTO environments (project_id, name, variables, is_default) VALUES (?, ?, ?, ?)');
        data.environments.forEach((env: any) => {
          envStmt.run(newProjectId, env.name, env.variables || '{}', env.is_default || 0);
        });
      }
      
      const folderIdMap: Record<number, number> = {};
      if (data.folders && data.folders.length > 0) {
        const folderStmt = db!.prepare('INSERT INTO folders (project_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)');
        data.folders.forEach((folder: any) => {
          const folderResult = folderStmt.run(newProjectId, null, folder.name, folder.sort_order || 0);
          folderIdMap[folder.id] = folderResult.lastInsertRowid as number;
        });
      }
      
      if (data.apis && data.apis.length > 0) {
        const apiStmt = db!.prepare(`
          INSERT INTO apis (project_id, folder_id, name, method, path, description,
                            request_params, request_headers, request_body_type, request_body,
                            response_description, response_body, is_deprecated, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.apis.forEach((api: any) => {
          const newFolderId = api.folder_id ? folderIdMap[api.folder_id] : null;
          apiStmt.run(
            newProjectId,
            newFolderId,
            api.name,
            api.method,
            api.path,
            api.description || '',
            api.request_params || '[]',
            api.request_headers || '[]',
            api.request_body_type || 'none',
            api.request_body || '',
            api.response_description || '',
            api.response_body || '{}',
            api.is_deprecated || 0,
            api.version || 1
          );
        });
      }
      
      return { success: true, projectId: newProjectId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false };
});

ipcMain.handle('search-apis', (_event, projectId: number, keyword: string) => {
  const searchKeyword = `%${keyword}%`;
  const stmt = db!.prepare(`
    SELECT * FROM apis 
    WHERE project_id = ? 
    AND (name LIKE ? OR path LIKE ? OR description LIKE ?)
    ORDER BY updated_at DESC
  `);
  return stmt.all(projectId, searchKeyword, searchKeyword, searchKeyword);
});

ipcMain.handle('get-request-cases', (_event, apiId: number | null, projectId: number) => {
  if (apiId) {
    const stmt = db!.prepare('SELECT * FROM request_cases WHERE api_id = ? ORDER BY sort_order ASC, created_at DESC');
    return stmt.all(apiId);
  }
  const stmt = db!.prepare('SELECT * FROM request_cases WHERE project_id = ? ORDER BY sort_order ASC, created_at DESC');
  return stmt.all(projectId);
});

ipcMain.handle('create-request-case', (_event, data: any) => {
  const stmt = db!.prepare(`
    INSERT INTO request_cases (api_id, project_id, name, method, url, params, headers, body_type, body)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.api_id || null,
    data.project_id,
    data.name,
    data.method || 'GET',
    data.url,
    data.params || '[]',
    data.headers || '[]',
    data.body_type || 'none',
    data.body || ''
  );
  return result.lastInsertRowid;
});

ipcMain.handle('update-request-case', (_event, id: number, data: any) => {
  const stmt = db!.prepare(`
    UPDATE request_cases SET 
      name = ?, method = ?, url = ?, params = ?, headers = ?, 
      body_type = ?, body = ?, last_status_code = ?, last_duration = ?, 
      last_response = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    data.name,
    data.method,
    data.url,
    data.params,
    data.headers,
    data.body_type,
    data.body,
    data.last_status_code || null,
    data.last_duration || null,
    data.last_response || null,
    id
  );
  return true;
});

ipcMain.handle('delete-request-case', (_event, id: number) => {
  const stmt = db!.prepare('DELETE FROM request_cases WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('clear-all-data', () => {
  try {
    db!.exec(`
      DELETE FROM request_history;
      DELETE FROM request_cases;
      DELETE FROM comments;
      DELETE FROM review_items;
      DELETE FROM api_versions;
      DELETE FROM apis;
      DELETE FROM folders;
      DELETE FROM environments;
      DELETE FROM projects;
      DELETE FROM settings WHERE key != 'theme' AND key != 'username' AND key != 'timeout';
    `);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
