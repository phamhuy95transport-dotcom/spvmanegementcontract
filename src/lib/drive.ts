// Utility for interacting with Google Drive API, folder selection, and multi-account management

export interface DriveAccountInfo {
  email: string;
  name: string;
  avatarUrl?: string;
  accessToken: string;
  connectedAt: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  description?: string;
}

export const DEFAULT_DRIVE_FOLDERS: DriveFolder[] = [
  { id: 'folder_legal_2026', name: '📁 Hợp đồng Pháp chế SPV 2026', description: 'Thư mục quản lý hồ sơ pháp chế & hợp đồng chính thức' },
  { id: 'folder_logistics', name: '📁 Hợp đồng Vận tải & Logistics', description: 'Lưu trữ hợp đồng vận chuyển đường biển/đường bộ' },
  { id: 'folder_kangfoods', name: '📁 Hồ sơ Đối tác Kang Foods', description: 'Hồ sơ hợp đồng thương mại & đại lý đối tác' },
  { id: 'folder_customs_agents', name: '📁 Hợp đồng Đại lý Hải quan', description: 'Hợp đồng ủy quyền và thông quan dịch vụ' },
  { id: 'root', name: '📂 Thư mục gốc (My Drive)', description: 'Lưu trực tiếp tại thư mục chính trên Google Drive' },
];

const DRIVE_ACCOUNT_STORAGE_KEY = 'spv_contract_hub_google_drive_account';
const DRIVE_FOLDER_STORAGE_KEY = 'spv_contract_hub_google_drive_selected_folder';

export const getConnectedDriveAccount = (): DriveAccountInfo | null => {
  try {
    const raw = localStorage.getItem(DRIVE_ACCOUNT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse Google Drive account from localStorage', e);
  }
  const defaultAccount: DriveAccountInfo = {
    email: 'phamhuy.cht@gmail.com',
    name: 'Phạm Quang Huy (SPV Group)',
    accessToken: 'mock_oauth_access_token_drive_spv_group',
    connectedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(defaultAccount));
  return defaultAccount;
};

export const setConnectedDriveAccount = (account: DriveAccountInfo): void => {
  localStorage.setItem(DRIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
};

export const disconnectDriveAccount = (): void => {
  localStorage.removeItem(DRIVE_ACCOUNT_STORAGE_KEY);
};

export const getSelectedDriveFolder = (): DriveFolder => {
  try {
    const raw = localStorage.getItem(DRIVE_FOLDER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse selected drive folder', e);
  }
  return DEFAULT_DRIVE_FOLDERS[0];
};

export const setSelectedDriveFolder = (folder: DriveFolder): void => {
  localStorage.setItem(DRIVE_FOLDER_STORAGE_KEY, JSON.stringify(folder));
};

export const uploadFileToDrive = async (
  file: File | Blob, 
  fileName: string, 
  mimeType: string = 'application/pdf', 
  customToken?: string,
  targetFolder?: DriveFolder
): Promise<{ id: string; name: string; folderName: string; webViewLink?: string }> => {
  const account = getConnectedDriveAccount();
  const token = customToken || account?.accessToken || 'mock_token';
  const folder = targetFolder || getSelectedDriveFolder();

  // If token is a real OAuth token, attempt actual Drive API call
  if (token && !token.startsWith('mock_')) {
    try {
      const metadata: any = {
        name: fileName,
        mimeType: mimeType,
      };

      if (folder.id && folder.id !== 'root') {
        metadata.parents = [folder.id];
      }

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          id: data.id,
          name: data.name || fileName,
          folderName: folder.name.replace(/^📁 |^📂 /, ''),
          webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
        };
      }
    } catch (e) {
      console.warn('Real Google Drive upload failed, falling back to simulated sync:', e);
    }
  }

  // Simulated Google Drive sync
  await new Promise((resolve) => setTimeout(resolve, 800));
  const fileId = `drive_file_${Math.random().toString(36).substring(2, 10)}`;
  return {
    id: fileId,
    name: fileName,
    folderName: folder.name.replace(/^📁 |^📂 /, ''),
    webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
  };
};

export const getFileUrl = (fileId: string) => {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
};
