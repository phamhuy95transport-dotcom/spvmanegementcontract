export interface LogisticsCargoItem {
  id: string;
  hs_code?: string; // Mã hàng HS code
  goods_description: string; // Mô tả hàng hóa*
  gross_weight: number; // Tổng trọng lượng* (của dòng hàng)
  dimension_cbm?: number; // Kích thước/thể tích* (CBM)
  container_number?: string; // Số hiệu cont
  seal_number?: string; // Số seal cont
}

export interface HouseBillOfLading {
  id: string;
  stt: number; // STT (*) No (số nguyên tăng dần)
  document_no: string; // Số hồ sơ Document's No (tối đa 9 chữ số)
  document_year: number; // Năm đăng ký hồ sơ Document's Year (VD: 2025, 2026)
  document_function: string; // Chức năng của chứng từ (CN01, CN02, Thêm mới, Thay thế...)
  shipper: string; // Người gửi hàng* Shipper (tối đa 256 ký tự)
  consignee: string; // Người nhận hàng* Consignee (tối đa 256 ký tự)
  notify_party_1?: string; // Người được thông báo 1 Notify Party 1 (tối đa 500 ký tự)
  notify_party_2?: string; // Người được thông báo 2 Notify Party 2 (tối đa 500 ký tự)
  port_transhipment_code?: string; // Mã Cảng chuyển tải/quá cảnh (VNACCS)
  port_destination_code: string; // Mã Cảng giao hàng/cảng đích (VNACCS)
  port_loading_code: string; // Mã Cảng xếp hàng Code of Port of Loading
  port_unloading_code: string; // Mã Cảng dỡ hàng Port of unloading/discharging
  place_of_delivery: string; // Địa điểm giao hàng* (Cont: cảng đích; Hàng lẻ: mã kho)
  cargo_type: string; // Loại hàng* Cargo Type/Terms of Shipment (FCL, LCL, CFS, FCL/FCL...)
  hbl_number: string; // Số vận đơn * Bill of lading number (tối đa 35 ký tự)
  hbl_date: string; // Ngày phát hành vận đơn* (dd/MM/yyyy)
  mbl_number: string; // Số vận đơn gốc* Master bill of lading number (tối đa 35 ký tự)
  mbl_date: string; // Ngày phát hành vận đơn gốc* (dd/MM/yyyy)
  departure_date: string; // Ngày khởi hành* Departure date (dd/MM/yyyy)
  package_quantity: number; // Tổng số kiện* Number of packages (số nguyên)
  package_type: string; // Loại kiện* Kind of packages (CT, PK, PL, BG...)
  total_gross_weight: number; // Tổng trọng lượng* Total gross weight
  gross_weight_unit: 'KGM' | 'TNE'; // Đơn vị tính tổng trọng lượng* (KGM / TNE)
  remark?: string; // Ghi chú Remark
  items: LogisticsCargoItem[]; // Danh sách container / chi tiết hàng hóa
  validation_errors?: string[];
  created_at?: string;
  source_file?: string;
}

export interface LogisticsFilterState {
  searchQuery: string;
  cargoType: string;
  portLoading: string;
  portDestination: string;
  dateFrom: string;
  dateTo: string;
  hasErrorsOnly: boolean;
}
