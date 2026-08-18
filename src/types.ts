export interface Contract {
  id: string;
  title: string;
  contract_number: string;
  party_a: string;
  party_b: string;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
  value: number;
  sign_date: string | null;
  effective_date: string | null;
  expiration_date: string | null;
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
  totalValue: number;
}
