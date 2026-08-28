import { supabase, isSupabaseConfigured } from './supabase';
import { Contract, ContractCategory, ContractType, SigningMethod, ContractStatus } from '../types';

export const CONTRACT_CATEGORIES: ContractCategory[] = ['HĐ đầu vào', 'HĐ đầu ra'];

export const DEFAULT_CONTRACT_TYPES: ContractType[] = [
  'HĐ đại lý hải quan',
  'HĐ vận chuyển',
  'HĐ lao động',
  'HĐ mua bán hàng hóa',
  'HĐ dịch vụ khác',
];

export const SIGNING_METHODS: SigningMethod[] = ['Ký điện tử', 'Ký đóng dấu'];

export function evaluateContractStatus(contract: Partial<Contract>, referenceDate: Date = new Date()): ContractStatus {
  if (contract.manual_status === 'Tạm dừng') return 'Tạm dừng';
  if (contract.manual_status === 'Đã gia hạn') return 'Đã gia hạn';
  if (contract.manual_status === 'Đã thay thế') return 'Đã thay thế';

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();

  if (contract.effective_date) {
    const effDate = new Date(contract.effective_date).getTime();
    if (effDate > today) {
      return 'Chưa có hiệu lực';
    }
  }

  if (contract.expiration_date) {
    const expDate = new Date(contract.expiration_date).getTime();
    if (expDate < today) {
      return 'Hết hạn';
    }
  }

  return 'Đang áp dụng';
}

export function shouldAlertContract(contract: Contract, referenceDate: Date = new Date()): {
  shouldAlert: boolean;
  type: 'expired' | 'expiring_soon' | null;
  daysDiff: number;
} {
  // If manual status is paused, extended or superseded -> NEVER ALERT
  if (contract.manual_status === 'Tạm dừng' || contract.manual_status === 'Đã gia hạn' || contract.manual_status === 'Đã thay thế') {
    return { shouldAlert: false, type: null, daysDiff: 0 };
  }

  if (!contract.expiration_date) {
    return { shouldAlert: false, type: null, daysDiff: 0 };
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const expDate = new Date(contract.expiration_date).getTime();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { shouldAlert: true, type: 'expired', daysDiff: diffDays };
  } else if (diffDays <= 30) {
    return { shouldAlert: true, type: 'expiring_soon', daysDiff: diffDays };
  }

  return { shouldAlert: false, type: null, daysDiff: diffDays };
}

const INITIAL_CONTRACTS: Contract[] = [
  {
    id: '1',
    stt: 1,
    category: 'HĐ đầu ra',
    contract_type: 'HĐ đại lý hải quan',
    contract_number: 'HD-2025-081',
    title: 'Hợp đồng Đại lý Hải quan & Thông quan Ủy thác SPV-KF',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'CÔNG TY TNHH KANG FOODS',
    tax_code: '0110012544',
    signing_method: 'Ký điện tử',
    value: 1200000000,
    sign_date: '2025-08-01',
    effective_date: '2025-08-01',
    expiration_date: '2026-08-01', // Expired
    manual_status: null,
    file_id: 'mock-file-1',
    ocr_content: '1. TÊN HỢP ĐỒNG: HỢP ĐỒNG ĐẠI LÝ HẢI QUAN\n2. BÊN GIAO DỊCH A: CÔNG TY TNHH SPV GROUP (MST: 0101234567)\n3. BÊN GIAO DỊCH B: CÔNG TY TNHH KANG FOODS (MST: 0110012544)\n4. GIÁ TRỊ: 1.200.000.000 VNĐ\n5. THỜI HẠN: 12 THÁNG (01/08/2025 - 01/08/2026)',
    created_at: new Date('2025-08-01').toISOString(),
    updated_at: new Date('2025-08-01').toISOString(),
  },
  {
    id: '2',
    stt: 2,
    category: 'HĐ đầu vào',
    contract_type: 'HĐ vận chuyển',
    contract_number: 'HD-2026-018',
    title: 'Hợp đồng Vận tải Đường biển & Kéo Container Cảng Hải Phòng',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'CÔNG TY CP LOGISTICS ĐÔNG DƯƠNG',
    tax_code: '0200889911',
    signing_method: 'Ký đóng dấu',
    value: 850000000,
    sign_date: '2026-01-15',
    effective_date: '2026-02-01',
    expiration_date: '2027-02-01', // Active
    manual_status: null,
    file_id: 'mock-file-2',
    ocr_content: '',
    created_at: new Date('2026-01-15').toISOString(),
    updated_at: new Date('2026-01-15').toISOString(),
  },
  {
    id: '3',
    stt: 3,
    category: 'HĐ đầu ra',
    contract_type: 'HĐ mua bán hàng hóa',
    contract_number: 'HD-2026-045',
    title: 'Hợp đồng Cung ứng Nguyên liệu Bột mì & Phụ gia Thực phẩm',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'CÔNG TY TNHH THỰC PHẨM MINH PHÁT',
    tax_code: '0312345678',
    signing_method: 'Ký điện tử',
    value: 2350000000,
    sign_date: '2026-03-10',
    effective_date: '2026-03-15',
    expiration_date: '2026-09-15', // Sắp hết hạn trong tháng 9/2026
    manual_status: null,
    file_id: 'mock-file-3',
    ocr_content: '',
    created_at: new Date('2026-03-10').toISOString(),
    updated_at: new Date('2026-03-10').toISOString(),
  },
  {
    id: '4',
    stt: 4,
    category: 'HĐ đầu vào',
    contract_type: 'HĐ lao động',
    contract_number: 'HDLD-2026-09',
    title: 'Hợp đồng Lao động Không xác định thời hạn - Chuyên viên Hải quan',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'Nguyễn Hoàng Long (CCCD: 001200008899)',
    tax_code: '8099234512',
    signing_method: 'Ký đóng dấu',
    value: 240000000,
    sign_date: '2026-05-01',
    effective_date: '2026-05-01',
    expiration_date: '2029-05-01', // Active
    manual_status: null,
    file_id: 'mock-file-4',
    ocr_content: '',
    created_at: new Date('2026-05-01').toISOString(),
    updated_at: new Date('2026-05-01').toISOString(),
  },
  {
    id: '5',
    stt: 5,
    category: 'HĐ đầu vào',
    contract_type: 'HĐ dịch vụ khác',
    contract_number: 'HD-2026-112',
    title: 'Hợp đồng Thuê hạ tầng Máy chủ & Phần mềm ERP Quản lý Vận đơn',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'CÔNG TY CÔNG NGHỆ SỐ VIETCLOUD',
    tax_code: '0108876543',
    signing_method: 'Ký điện tử',
    value: 360000000,
    sign_date: '2026-08-20',
    effective_date: '2026-09-01', // Chưa có hiệu lực
    expiration_date: '2027-09-01',
    manual_status: null,
    file_id: null,
    ocr_content: '',
    created_at: new Date('2026-08-20').toISOString(),
    updated_at: new Date('2026-08-20').toISOString(),
  },
  {
    id: '6',
    stt: 6,
    category: 'HĐ đầu ra',
    contract_type: 'HĐ vận chuyển',
    contract_number: 'HD-2025-055',
    title: 'Hợp đồng Ủy thác Giao nhận hàng dự án Cát Bi',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'TẬP ĐOÀN XÂY DỰNG AN THỊNH',
    tax_code: '0106677889',
    signing_method: 'Ký đóng dấu',
    value: 540000000,
    sign_date: '2025-01-10',
    effective_date: '2025-01-15',
    expiration_date: '2025-12-31', // Đã hết hạn nhưng đã tạm dừng
    manual_status: 'Tạm dừng',
    action_note: 'Tạm dừng do dự án Cát Bi tạm ngưng thi công',
    file_id: null,
    ocr_content: '',
    created_at: new Date('2025-01-10').toISOString(),
    updated_at: new Date('2025-01-10').toISOString(),
  }
];

const LOCAL_STORAGE_KEY = 'contract_hub_contracts_v2';

function normalizeContract(c: any, index: number): Contract {
  const norm: Contract = {
    id: c.id || String(Date.now() + index),
    stt: index + 1,
    category: c.category || 'HĐ đầu ra',
    contract_type: c.contract_type || 'HĐ đại lý hải quan',
    contract_number: c.contract_number || `HD-${Date.now()}`,
    title: c.title || 'Hợp đồng mới',
    party_a: c.party_a || 'CÔNG TY TNHH SPV GROUP',
    party_b: c.party_b || '',
    tax_code: c.tax_code || '0101234567',
    signing_method: c.signing_method || 'Ký điện tử',
    sign_date: c.sign_date || null,
    effective_date: c.effective_date || null,
    expiration_date: c.expiration_date || null,
    manual_status: c.manual_status || null,
    superseded_by_id: c.superseded_by_id || null,
    superseded_by_number: c.superseded_by_number || null,
    parent_contract_id: c.parent_contract_id || null,
    action_note: c.action_note || null,
    value: Number(c.value) || 0,
    file_id: c.file_id || null,
    file_url: c.file_url || null,
    file_name: c.file_name || null,
    file_type: c.file_type || null,
    ocr_content: c.ocr_content || '',
    ocr_engine: c.ocr_engine || null,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  };

  norm.status = evaluateContractStatus(norm);
  return norm;
}

function getLocalContracts(): Contract[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c, i) => normalizeContract(c, i));
      }
    }
  } catch (e) {
    console.warn('Failed to parse local contracts from storage:', e);
  }
  // Initialize with initial data
  const normalized = INITIAL_CONTRACTS.map((c, i) => normalizeContract(c, i));
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function saveLocalContracts(list: Contract[]): void {
  try {
    const reIndexed = list.map((c, idx) => ({
      ...c,
      stt: idx + 1,
      status: evaluateContractStatus(c),
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reIndexed));
  } catch (e) {
    console.warn('Failed to save contracts to localStorage:', e);
  }
}

export async function fetchAllContracts(): Promise<Contract[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((c, i) => normalizeContract(c, i));
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local persistence:', e);
    }
  }
  return getLocalContracts();
}

export async function fetchContractById(id: string): Promise<Contract | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
      if (!error && data) {
        return normalizeContract(data, 0);
      }
    } catch (e) {
      console.warn('Supabase getById failed, checking local store:', e);
    }
  }
  const localList = getLocalContracts();
  return localList.find(c => c.id === id) || null;
}

export async function upsertContract(contract: Partial<Contract>): Promise<Contract> {
  const localList = getLocalContracts();
  let saved: Contract;

  if (contract.id) {
    const idx = localList.findIndex(c => c.id === contract.id);
    if (idx >= 0) {
      saved = normalizeContract({
        ...localList[idx],
        ...contract,
        updated_at: new Date().toISOString(),
      }, idx);
      localList[idx] = saved;
    } else {
      saved = normalizeContract({
        ...contract,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, localList.length);
      localList.unshift(saved);
    }
  } else {
    saved = normalizeContract({
      ...contract,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, 0);
    localList.unshift(saved);
  }

  saveLocalContracts(localList);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('contracts').upsert([saved]);
    } catch (e) {
      console.warn('Supabase upsert sync failed:', e);
    }
  }

  return saved;
}

// Action: Tạm dừng hợp đồng (không cảnh báo nữa)
export async function pauseContract(contractId: string, reason?: string): Promise<Contract | null> {
  const localList = getLocalContracts();
  const idx = localList.findIndex(c => c.id === contractId);
  if (idx === -1) return null;

  localList[idx].manual_status = 'Tạm dừng';
  localList[idx].action_note = reason || 'Tạm dừng theo yêu cầu người quản trị';
  localList[idx].status = 'Tạm dừng';
  localList[idx].updated_at = new Date().toISOString();

  saveLocalContracts(localList);
  return localList[idx];
}

// Action: Gia hạn hợp đồng (tạo dòng mới, đổi trạng thái dòng cũ thành Đã gia hạn + link sang số HĐ mới)
export async function extendContract(
  oldContractId: string,
  extensionData: {
    new_contract_number: string;
    new_effective_date: string;
    new_expiration_date: string;
    new_sign_date?: string;
    new_value?: number;
    action_note?: string;
  }
): Promise<{ oldContract: Contract; newContract: Contract } | null> {
  const localList = getLocalContracts();
  const oldIdx = localList.findIndex(c => c.id === oldContractId);
  if (oldIdx === -1) return null;

  const oldContract = localList[oldIdx];
  const newContractId = String(Date.now());

  // Tạo hợp đồng mới kế thừa từ hợp đồng cũ
  const newContract: Contract = normalizeContract({
    id: newContractId,
    category: oldContract.category,
    contract_type: oldContract.contract_type,
    contract_number: extensionData.new_contract_number,
    title: `${oldContract.title} (Gia hạn)`,
    party_a: oldContract.party_a,
    party_b: oldContract.party_b,
    tax_code: oldContract.tax_code,
    signing_method: oldContract.signing_method,
    sign_date: extensionData.new_sign_date || new Date().toISOString().split('T')[0],
    effective_date: extensionData.new_effective_date,
    expiration_date: extensionData.new_expiration_date,
    value: extensionData.new_value !== undefined ? extensionData.new_value : oldContract.value,
    parent_contract_id: oldContract.id,
    manual_status: null,
    action_note: `Gia hạn từ hợp đồng ${oldContract.contract_number}`,
    file_id: oldContract.file_id,
    file_url: oldContract.file_url,
    file_name: oldContract.file_name,
    ocr_content: oldContract.ocr_content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, 0);

  // Cập nhật hợp đồng cũ
  oldContract.manual_status = 'Đã gia hạn';
  oldContract.status = 'Đã gia hạn';
  oldContract.superseded_by_id = newContractId;
  oldContract.superseded_by_number = extensionData.new_contract_number;
  oldContract.action_note = extensionData.action_note || `Đã gia hạn sang số hợp đồng mới ${extensionData.new_contract_number}`;
  oldContract.updated_at = new Date().toISOString();

  // Thêm hợp đồng mới vào danh sách
  localList.unshift(newContract);
  saveLocalContracts(localList);

  return { oldContract, newContract };
}

// Action: Thay thế hợp đồng (tạo dòng mới, đổi trạng thái dòng cũ thành Đã thay thế + link sang số HĐ mới)
export async function replaceContract(
  oldContractId: string,
  replaceData: {
    new_contract_number: string;
    new_title?: string;
    new_sign_date: string;
    new_effective_date: string;
    new_expiration_date: string;
    new_value?: number;
    new_signing_method?: SigningMethod;
    action_note?: string;
  }
): Promise<{ oldContract: Contract; newContract: Contract } | null> {
  const localList = getLocalContracts();
  const oldIdx = localList.findIndex(c => c.id === oldContractId);
  if (oldIdx === -1) return null;

  const oldContract = localList[oldIdx];
  const newContractId = String(Date.now());

  // Tạo hợp đồng thay thế
  const newContract: Contract = normalizeContract({
    id: newContractId,
    category: oldContract.category,
    contract_type: oldContract.contract_type,
    contract_number: replaceData.new_contract_number,
    title: replaceData.new_title || `${oldContract.title} (Thay thế)`,
    party_a: oldContract.party_a,
    party_b: oldContract.party_b,
    tax_code: oldContract.tax_code,
    signing_method: replaceData.new_signing_method || oldContract.signing_method,
    sign_date: replaceData.new_sign_date,
    effective_date: replaceData.new_effective_date,
    expiration_date: replaceData.new_expiration_date,
    value: replaceData.new_value !== undefined ? replaceData.new_value : oldContract.value,
    parent_contract_id: oldContract.id,
    manual_status: null,
    action_note: `Thay thế cho hợp đồng ${oldContract.contract_number}`,
    file_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, 0);

  // Cập nhật hợp đồng cũ
  oldContract.manual_status = 'Đã thay thế';
  oldContract.status = 'Đã thay thế';
  oldContract.superseded_by_id = newContractId;
  oldContract.superseded_by_number = replaceData.new_contract_number;
  oldContract.action_note = replaceData.action_note || `Đã thay thế bằng hợp đồng mới ${replaceData.new_contract_number}`;
  oldContract.updated_at = new Date().toISOString();

  localList.unshift(newContract);
  saveLocalContracts(localList);

  return { oldContract, newContract };
}

export async function deleteContract(id: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('contracts').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete failed:', e);
    }
  }
  const localList = getLocalContracts();
  const updated = localList.filter(c => c.id !== id);
  saveLocalContracts(updated);
  return true;
}

