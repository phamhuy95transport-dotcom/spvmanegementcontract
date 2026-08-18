import { supabase, isSupabaseConfigured } from './supabase';
import { Contract } from '../types';

const INITIAL_CONTRACTS: Contract[] = [
  {
    id: '1',
    title: 'Hợp đồng đại lý Hải Quan SPV-KF',
    contract_number: 'HD-2025-081',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'CÔNG TY TNHH KANG FOODS',
    status: 'Active',
    value: 1200000000,
    sign_date: '2025-08-01',
    effective_date: '2025-08-01',
    expiration_date: '2026-08-01',
    file_id: 'mock-file-1',
    ocr_content: '1. TÊN HỢP ĐỒNG: HỢP ĐỒNG ĐẠI LÝ HẢI QUAN\n2. BÊN GIAO DỊCH A: CÔNG TY TNHH SPV GROUP (MST: 0101234567)\n3. BÊN GIAO DỊCH B: CÔNG TY TNHH KANG FOODS (MST: 0110012544)\n4. GIÁ TRỊ: 1.200.000.000 VNĐ\n5. THỜI HẠN: 12 THÁNG (01/08/2025 - 01/08/2026)',
    created_at: new Date('2025-08-01').toISOString(),
    updated_at: new Date('2025-08-01').toISOString(),
  },
  {
    id: '2',
    title: 'Hợp đồng mua bán phần mềm ERP',
    contract_number: 'HD-2025-092',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'Tập đoàn Bất động sản XYZ',
    status: 'Draft',
    value: 450000000,
    sign_date: null,
    effective_date: null,
    expiration_date: null,
    file_id: null,
    ocr_content: '',
    created_at: new Date('2025-08-10').toISOString(),
    updated_at: new Date('2025-08-10').toISOString(),
  },
  {
    id: '3',
    title: 'Hợp đồng cho thuê văn phòng chi nhánh',
    contract_number: 'HD-2025-104',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'Ngân hàng TMCP Quốc tế',
    status: 'Active',
    value: 850000000,
    sign_date: '2025-07-15',
    effective_date: '2025-08-01',
    expiration_date: '2027-08-01',
    file_id: 'mock-file-3',
    ocr_content: '',
    created_at: new Date('2025-07-15').toISOString(),
    updated_at: new Date('2025-07-15').toISOString(),
  },
  {
    id: '4',
    title: 'Hợp đồng vận chuyển giao nhận kho bãi',
    contract_number: 'HD-2025-115',
    party_a: 'CÔNG TY TNHH SPV GROUP',
    party_b: 'Logistics Đông Dương',
    status: 'Expired',
    value: 320000000,
    sign_date: '2024-05-10',
    effective_date: '2024-06-01',
    expiration_date: '2025-06-01',
    file_id: 'mock-file-4',
    ocr_content: '',
    created_at: new Date('2024-05-10').toISOString(),
    updated_at: new Date('2024-05-10').toISOString(),
  }
];

const LOCAL_STORAGE_KEY = 'contract_hub_contracts_v1';

function getLocalContracts(): Contract[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local contracts from storage:', e);
  }
  // Initialize with initial data
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_CONTRACTS));
  return INITIAL_CONTRACTS;
}

function saveLocalContracts(list: Contract[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save contracts to localStorage:', e);
  }
}

export async function fetchAllContracts(): Promise<Contract[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as Contract[];
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
        return data as Contract;
      }
    } catch (e) {
      console.warn('Supabase getById failed, checking local store:', e);
    }
  }
  const localList = getLocalContracts();
  return localList.find(c => c.id === id) || null;
}

export async function upsertContract(contract: Partial<Contract>): Promise<Contract> {
  let saved: Contract;
  
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('contracts').upsert([contract]).select().single();
      if (!error && data) {
        saved = data as Contract;
      }
    } catch (e) {
      console.warn('Supabase upsert failed, using local store:', e);
    }
  }

  const localList = getLocalContracts();
  if (contract.id) {
    const idx = localList.findIndex(c => c.id === contract.id);
    if (idx >= 0) {
      saved = { ...localList[idx], ...contract, updated_at: new Date().toISOString() } as Contract;
      localList[idx] = saved;
    } else {
      saved = {
        id: contract.id,
        title: contract.title || 'Hợp đồng mới',
        contract_number: contract.contract_number || `HD-${Date.now()}`,
        party_a: contract.party_a || 'CÔNG TY TNHH SPV GROUP',
        party_b: contract.party_b || '',
        status: contract.status || 'Draft',
        value: contract.value || 0,
        sign_date: contract.sign_date || null,
        effective_date: contract.effective_date || null,
        expiration_date: contract.expiration_date || null,
        file_id: contract.file_id || null,
        file_url: contract.file_url || null,
        file_name: contract.file_name || null,
        file_type: contract.file_type || null,
        ocr_content: contract.ocr_content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localList.unshift(saved);
    }
  } else {
    saved = {
      id: String(Date.now()),
      title: contract.title || 'Hợp đồng mới',
      contract_number: contract.contract_number || `HD-${Date.now()}`,
      party_a: contract.party_a || 'CÔNG TY TNHH SPV GROUP',
      party_b: contract.party_b || '',
      status: contract.status || 'Draft',
      value: contract.value || 0,
      sign_date: contract.sign_date || null,
      effective_date: contract.effective_date || null,
      expiration_date: contract.expiration_date || null,
      file_id: contract.file_id || null,
      file_url: contract.file_url || null,
      file_name: contract.file_name || null,
      file_type: contract.file_type || null,
      ocr_content: contract.ocr_content || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localList.unshift(saved);
  }

  saveLocalContracts(localList);
  return saved!;
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
