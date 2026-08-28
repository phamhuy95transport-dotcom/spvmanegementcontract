import React, { useState, useEffect } from 'react';
import { HardDrive, Folder, FolderPlus, Check, X, ArrowRight, ShieldCheck, ChevronRight, CornerDownRight, ArrowLeft, Trash2, Search, RefreshCw, FolderTree } from 'lucide-react';
import { 
  DriveFolder, 
  getAllDriveFolders, 
  createDriveFolderAPI, 
  deleteDriveFolderAPI, 
  getSelectedDriveFolder, 
  setSelectedDriveFolder, 
  getConnectedDriveAccount 
} from '../lib/drive';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder?: (folder: DriveFolder) => void;
  fileName?: string;
  isSyncing?: boolean;
}

export default function GoogleDriveFolderModal({ isOpen, onClose, onSelectFolder, fileName, isSyncing }: Props) {
  const currentAccount = getConnectedDriveAccount();
  const [allFolders, setAllFolders] = useState<DriveFolder[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder>(() => getSelectedDriveFolder());
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const list = await getAllDriveFolders();
      setAllFolders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      const current = getSelectedDriveFolder();
      setSelectedFolder(current);
      // Set currentParentId to current folder's parent or root
      if (current && current.parentId !== undefined) {
        setCurrentParentId(current.parentId);
      } else {
        setCurrentParentId('root');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build breadcrumb trail from root to current parent
  const buildBreadcrumbs = (): DriveFolder[] => {
    const crumbs: DriveFolder[] = [];
    let currId: string | null | undefined = currentParentId;
    
    while (currId && currId !== 'root') {
      const found = allFolders.find(f => f.id === currId);
      if (found) {
        crumbs.unshift(found);
        currId = found.parentId;
      } else {
        break;
      }
    }

    const rootFolder = allFolders.find(f => f.id === 'root') || {
      id: 'root',
      name: '📂 My Drive',
      parentId: null,
      path: 'My Drive'
    };

    return [rootFolder, ...crumbs];
  };

  // Get current active folder or root object
  const currentParentFolder = allFolders.find(f => f.id === currentParentId) || allFolders.find(f => f.id === 'root');

  // Filter folders at the current level
  const displayedFolders = searchQuery.trim()
    ? allFolders.filter(f => f.id !== 'root' && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allFolders.filter(f => {
        if (currentParentId === null || currentParentId === 'root') {
          return f.parentId === 'root' || f.parentId === null || f.parentId === undefined;
        }
        return f.parentId === currentParentId;
      });

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      const parent = currentParentId || 'root';
      const created = await createDriveFolderAPI(newFolderName.trim(), parent, newFolderDesc.trim());
      await loadFolders();
      setSelectedFolder(created);
      setIsCreatingSubfolder(false);
      setNewFolderName('');
      setNewFolderDesc('');
      setNotification(`Đã tạo thư mục con "${created.name}" thành công!`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert("Lỗi khi tạo thư mục: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folder: DriveFolder) => {
    e.stopPropagation();
    if (folder.isSystem) {
      alert("Không thể xóa thư mục hệ thống.");
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa thư mục "${folder.name}" và toàn bộ thư mục con?`)) {
      await deleteDriveFolderAPI(folder.id);
      await loadFolders();
      if (selectedFolder.id === folder.id) {
        setSelectedFolder(allFolders.find(f => f.id === 'root') || allFolders[0]);
      }
    }
  };

  const handleConfirmSelection = () => {
    setSelectedDriveFolder(selectedFolder);
    if (onSelectFolder) {
      onSelectFolder(selectedFolder);
    }
    onClose();
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <FolderTree className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <span>Quản Lý & Chọn Thư Mục Google Drive</span>
                <span className="text-[10px] bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-full font-medium">Hỗ trợ Thư mục con</span>
              </h3>
              <p className="text-xs text-blue-100/90 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                <span>Lưu trữ đám mây SPV: <b>{currentAccount?.email || 'giupnhau@spv.biz.vn'}</b></span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb Bar & Navigation */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center flex-wrap gap-1.5 font-medium text-slate-700">
            <span className="text-gray-400 font-normal">Vị trí:</span>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentParentId(crumb.id === 'root' ? 'root' : crumb.id);
                    }}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      isLast 
                        ? 'bg-blue-100 text-blue-800 font-bold' 
                        : 'hover:bg-gray-200 text-gray-600 hover:text-slate-900'
                    }`}
                  >
                    {crumb.name.replace(/^[📁📂]\s*/, '')}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {currentParentId && currentParentId !== 'root' && (
              <button
                onClick={() => {
                  const parent = allFolders.find(f => f.id === currentParentId);
                  setCurrentParentId(parent?.parentId || 'root');
                }}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lên thư mục cha</span>
              </button>
            )}
            <button
              onClick={loadFolders}
              title="Làm mới danh sách thư mục"
              className="p-1 text-gray-500 hover:text-blue-600 rounded-md hover:bg-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notification banner */}
        {notification && (
          <div className="px-5 py-2 bg-emerald-50 text-emerald-800 border-b border-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content area */}
        <div className="p-4 md:p-5 flex-1 overflow-y-auto space-y-4">
          {/* File sync notice if available */}
          {fileName && (
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-gray-500 font-medium">Tệp tải lên: </span>
                <span className="font-bold text-slate-800 font-mono">{fileName}</span>
              </div>
              <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold">Tệp gốc hoàn chỉnh</span>
            </div>
          )}

          {/* Search bar & Create folder button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhanh thư mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setIsCreatingSubfolder(!isCreatingSubfolder)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>+ Tạo thư mục con</span>
            </button>
          </div>

          {/* Create Subfolder Inline Form */}
          {isCreatingSubfolder && (
            <form onSubmit={handleCreateFolder} className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-indigo-600" />
                  <span>Tạo thư mục con bên trong: <b>{currentParentFolder?.name.replace(/^[📁📂]\s*/, '')}</b></span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingSubfolder(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Tên thư mục con (ví dụ: Quý 3 / 2026, Chi nhánh Đà Nẵng...)"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Mô tả thư mục (tùy chọn)"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !newFolderName.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
                >
                  Xác nhận tạo thư mục
                </button>
              </div>
            </form>
          )}

          {/* Folder & Subfolder List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
              <span>Thư mục {searchQuery ? '(Kết quả tìm kiếm)' : 'khả dụng'} ({displayedFolders.length})</span>
              <span>Thao tác</span>
            </div>

            {displayedFolders.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Folder className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-600">Không có thư mục con nào tại vị trí này.</p>
                <p className="text-[11px] text-gray-400 mt-1">Bạn có thể bấm "+ Tạo thư mục con" để thêm thư mục mới.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {displayedFolders.map((folder) => {
                  const isSelected = selectedFolder.id === folder.id;
                  const hasSubfolders = (folder.subfolderCount || 0) > 0 || allFolders.some(f => f.parentId === folder.id);

                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                              {folder.name}
                            </p>
                            {hasSubfolders && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                                Có thư mục con
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {folder.path || folder.description || 'Thư mục Google Drive'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {/* Open subfolder button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery('');
                            setCurrentParentId(folder.id);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          title="Vào xem các thư mục con bên trong"
                        >
                          <span>Mở</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button for custom folders */}
                        {!folder.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolder(e, folder)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa thư mục này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs">
            <span className="text-gray-500">Đang chọn: </span>
            <span className="font-bold text-blue-800 font-mono">{selectedFolder?.name}</span>
            <div className="text-[11px] text-gray-400">{selectedFolder?.path}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Đóng
            </button>

            <button
              onClick={handleConfirmSelection}
              disabled={isSyncing || !selectedFolder}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSyncing ? 'Đang lưu trữ...' : 'Chọn thư mục này làm nơi lưu trữ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
