export type ContractCategory = 'HĐ đầu vào' | 'HĐ đầu ra';

export type ContractType = 
  | 'HĐ đại lý hải quan'
  | 'HĐ vận chuyển'
  | 'HĐ lao động'
  | 'HĐ mua bán hàng hóa'
  | 'HĐ dịch vụ khác'
  | string;

export type SigningMethod = 'Ký điện tử' | 'Ký đóng dấu';

export type ContractStatus = 
  | 'Chưa có hiệu lực'
  | 'Đang áp dụng'
  | 'Hết hạn'
  | 'Tạm dừng'
  | 'Đã gia hạn'
  | 'Đã thay thế';

export interface Contract {
  id: string;
  stt?: number;
  category: ContractCategory; // Phân loại: HĐ đầu vào, HĐ đầu ra
  contract_type: ContractType; // Loại HĐ: HĐ đại lý hải quan, HĐ vận chuyển, HĐ lao động, HĐ mua bán hàng hóa, HĐ dịch vụ khác,...
  contract_number: string; // Số hợp đồng
  title: string; // Tên hợp đồng / Trích yếu
  party_a: string; // Bên A
  party_b: string; // Khách Hàng / Nhà cung cấp
  tax_code: string; // Mã số thuế
  signing_method: SigningMethod; // Hình thức ký: Ký điện tử | Ký đóng dấu
  sign_date: string | null; // Ngày ký (YYYY-MM-DD)
  effective_date: string | null; // Hiệu lực HĐ (YYYY-MM-DD)
  expiration_date: string | null; // Ngày hết hạn (YYYY-MM-DD)
  status?: ContractStatus; // Trạng thái tự động hoặc gán
  manual_status?: 'Tạm dừng' | 'Đã gia hạn' | 'Đã thay thế' | null; // Trạng thái can thiệp
  superseded_by_id?: string | null; // ID HĐ mới khi gia hạn/thay thế
  superseded_by_number?: string | null; // Số HĐ mới khi gia hạn/thay thế
  parent_contract_id?: string | null; // ID HĐ gốc
  action_note?: string | null; // Ghi chú hành động
  value: number; // Giá trị hợp đồng
  file_id: string | null; // Google Drive File ID
  file_url?: string | null; // Base64 Data URL, Object URL, or Direct Link
  file_name?: string | null;
  file_type?: string | null;
  ocr_content: string | null;
  ocr_engine?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
  paused: number;
  totalValue: number;
}

