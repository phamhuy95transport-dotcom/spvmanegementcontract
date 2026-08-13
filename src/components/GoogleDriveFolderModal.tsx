import React, { useState } from 'react';
import { HardDrive, Folder, FolderPlus, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { DriveFolder, DEFAULT_DRIVE_FOLDERS, getSelectedDriveFolder, setSelectedDriveFolder, getConnectedDriveAccount } from '../lib/drive';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folder: DriveFolder) => void;
  fileName?: string;
  isSyncing?: boolean;
}

export default function GoogleDriveFolderModal({ isOpen, onClose, onSelectFolder, fileName, isSyncing }: Props) {
  const currentAccount = getConnectedDriveAccount();
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder>(() => getSelectedDriveFolder());
  const [customFolderName, setCustomFolderName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    let finalFolder = selectedFolder;
    if (isCreatingNew && customFolderName.trim()) {
      finalFolder = {
        id: `folder_custom_${Date.now()}`,
        name: `📁 ${customFolderName.trim()}`,
        description: 'Thư mục mới tạo trên Google Drive',
      };
    }
    setSelectedDriveFolder(finalFolder);
    onSelectFolder(finalFolder);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <HardDrive className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Chọn Thư Mục Google Drive</h3>
              <p className="text-xs text-blue-100/90 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                <span>Tài khoản: <b>{currentAccount?.email || 'Chưa kết nối'}</b></span>
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {fileName && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-gray-500 font-medium">Tệp đồng bộ: </span>
                <span className="font-bold text-slate-800 font-mono">{fileName}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Danh sách thư mục khả dụng
            </label>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {DEFAULT_DRIVE_FOLDERS.map((folder) => {
                const isSelected = !isCreatingNew && selectedFolder.id === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedFolder(folder);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {folder.name}
                        </p>
                        {folder.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{folder.description}</p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Option to create a new custom folder */}
          <div className="pt-2 border-t border-gray-100">
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full py-2 px-3 border border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-xs font-semibold text-blue-700 bg-gray-50/50 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>+ Tạo thư mục lưu trữ mới trên Google Drive</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-blue-600" />
                    Tạo thư mục mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-[11px] text-gray-500 hover:text-gray-700 underline"
                  >
                    Hủy
                  </button>
                </div>
                <input
                  type="text"
                  value={customFolderName}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  placeholder="Nhập tên thư mục (ví dụ: Hợp đồng Mua bán Q3/2026)"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleConfirm}
            disabled={isSyncing || (isCreatingNew && !customFolderName.trim())}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <span>Xác nhận & Lưu vào Drive</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
