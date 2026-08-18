import React, { useState, useEffect } from 'react';
import { HouseBillOfLading, LogisticsCargoItem } from '../types/logistics';
import { X, Plus, Trash2, Save, AlertCircle, Ship, Package, User, MapPin, Layers } from 'lucide-react';
import { validateHouseBill } from '../lib/logisticsService';

interface HouseBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: HouseBillOfLading) => void;
  initialBill?: HouseBillOfLading | null;
  totalBillsCount: number;
}

export default function HouseBillModal({
  isOpen,
  onClose,
  onSave,
  initialBill,
  totalBillsCount,
}: HouseBillModalProps) {
  const [formData, setFormData] = useState<HouseBillOfLading>({
    id: '',
    stt: totalBillsCount + 1,
    document_no: `${new Date().getFullYear()}${String(totalBillsCount + 1).padStart(4, '0')}`,
    document_year: new Date().getFullYear(),
    document_function: 'CN01',
    shipper: '',
    consignee: '',
    notify_party_1: '',
    notify_party_2: '',
    port_transhipment_code: '',
    port_destination_code: 'VNHPH',
    port_loading_code: 'CNSHA',
    port_unloading_code: 'VNHPH',
    place_of_delivery: 'VNHPH',
    cargo_type: 'FCL',
    hbl_number: '',
    hbl_date: formatDateVN(new Date()),
    mbl_number: '',
    mbl_date: formatDateVN(new Date()),
    departure_date: formatDateVN(new Date()),
    package_quantity: 100,
    package_type: 'CT',
    total_gross_weight: 1000,
    gross_weight_unit: 'KGM',
    remark: '',
    items: [
      {
        id: `item-${Date.now()}-0`,
        hs_code: '',
        goods_description: '',
        gross_weight: 1000,
        dimension_cbm: 0,
        container_number: '',
        seal_number: '',
      },
    ],
  });

  const [activeTab, setActiveTab] = useState<'general' | 'parties' | 'route' | 'cargo' | 'items'>('general');

  useEffect(() => {
    if (initialBill) {
      setFormData(initialBill);
    } else {
      setFormData({
        id: `hbl-${Date.now()}`,
        stt: totalBillsCount + 1,
        document_no: `${new Date().getFullYear()}${String(totalBillsCount + 1).padStart(4, '0')}`,
        document_year: new Date().getFullYear(),
        document_function: 'CN01',
        shipper: '',
        consignee: '',
        notify_party_1: '',
        notify_party_2: '',
        port_transhipment_code: '',
        port_destination_code: 'VNHPH',
        port_loading_code: 'CNSHA',
        port_unloading_code: 'VNHPH',
        place_of_delivery: 'VNHPH',
        cargo_type: 'FCL',
        hbl_number: `HBL-${new Date().getFullYear()}-${String(totalBillsCount + 1).padStart(4, '0')}`,
        hbl_date: formatDateVN(new Date()),
        mbl_number: `MBL-${new Date().getFullYear()}-001`,
        mbl_date: formatDateVN(new Date()),
        departure_date: formatDateVN(new Date()),
        package_quantity: 100,
        package_type: 'CT',
        total_gross_weight: 1000,
        gross_weight_unit: 'KGM',
        remark: '',
        items: [
          {
            id: `item-${Date.now()}-0`,
            hs_code: '',
            goods_description: 'Hàng hóa thương mại tổng hợp',
            gross_weight: 1000,
            dimension_cbm: 20,
            container_number: 'TCKU9918234',
            seal_number: 'SL-88129',
          },
        ],
      });
    }
  }, [initialBill, totalBillsCount, isOpen]);

  if (!isOpen) return null;

  function formatDateVN(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'stt' || name === 'document_year' || name === 'package_quantity' 
        ? parseInt(value, 10) || 0 
        : name === 'total_gross_weight' 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const handleItemChange = (index: number, field: keyof LogisticsCargoItem, val: string | number) => {
    const updated = [...formData.items];
    updated[index] = {
      ...updated[index],
      [field]: field === 'gross_weight' || field === 'dimension_cbm' ? parseFloat(val as string) || 0 : val,
    };
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${prev.items.length}`,
          hs_code: '',
          goods_description: '',
          gross_weight: 0,
          dimension_cbm: 0,
          container_number: '',
          seal_number: '',
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateHouseBill(formData);
    onSave(validated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400 border border-blue-500/30">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {initialBill ? `Chỉnh sửa Vận đơn HBL #${formData.stt}: ${formData.hbl_number}` : 'Thêm Vận đơn Gom hàng mới (House Bill)'}
              </h2>
              <p className="text-[11px] text-gray-300">
                Chuẩn biểu mẫu e-Manifest / VNACCS Tổng cục Hải quan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 overflow-x-auto">
          {[
            { id: 'general', label: '1. Hồ sơ & Vận đơn', icon: Layers },
            { id: 'parties', label: '2. Bên gửi/nhận hàng', icon: User },
            { id: 'route', label: '3. Tuyến & Cảng biển', icon: MapPin },
            { id: 'cargo', label: '4. Kiện & Trọng lượng', icon: Package },
            { id: 'items', label: `5. Cont & Chi tiết hàng (${formData.items.length})`, icon: Ship },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    STT (*) No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stt"
                    value={formData.stt}
                    onChange={handleTextChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400">Số nguyên tăng dần</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Số hồ sơ Document's No
                  </label>
                  <input
                    type="text"
                    name="document_no"
                    value={formData.document_no}
                    onChange={handleTextChange}
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400">Tối đa 9 chữ số</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Năm đăng ký hồ sơ
                  </label>
                  <input
                    type="number"
                    name="document_year"
                    value={formData.document_year}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Chức năng chứng từ
                  </label>
                  <select
                    name="document_function"
                    value={formData.document_function}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="CN01">CN01 - Khai mới</option>
                    <option value="CN02">CN02 - Sửa đổi / Bổ sung</option>
                    <option value="CN03">CN03 - Hủy chứng từ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Số vận đơn * (HBL Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hbl_number"
                    value={formData.hbl_number}
                    onChange={handleTextChange}
                    maxLength={35}
                    required
                    placeholder="VD: SPVSHA2508001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                  <p className="text-[10px] text-gray-400">Xâu ký tự, tối đa 35</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Ngày phát hành vận đơn* (HBL Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hbl_date"
                    value={formData.hbl_date}
                    onChange={handleTextChange}
                    placeholder="dd/MM/yyyy (VD: 15/08/2025)"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Số vận đơn gốc* (Master B/L Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mbl_number"
                    value={formData.mbl_number}
                    onChange={handleTextChange}
                    maxLength={35}
                    required
                    placeholder="VD: COSU6392019482"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Ngày phát hành vận đơn gốc* (MBL Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mbl_date"
                    value={formData.mbl_date}
                    onChange={handleTextChange}
                    placeholder="dd/MM/yyyy (VD: 12/08/2025)"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTIES */}
          {activeTab === 'parties' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Người gửi hàng* (Shipper) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="shipper"
                  value={formData.shipper}
                  onChange={handleTextChange}
                  maxLength={256}
                  rows={2}
                  required
                  placeholder="Tên công ty và địa chỉ người gửi hàng (tối đa 256 ký tự)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Bắt buộc nhập theo tiêu chuẩn e-Manifest</span>
                  <span>{formData.shipper.length}/256 ký tự</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Người nhận hàng* (Consignee) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="consignee"
                  value={formData.consignee}
                  onChange={handleTextChange}
                  maxLength={256}
                  rows={2}
                  required
                  placeholder="Tên công ty và địa chỉ người nhận hàng (tối đa 256 ký tự)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Bắt buộc nhập theo tiêu chuẩn e-Manifest</span>
                  <span>{formData.consignee.length}/256 ký tự</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Người được thông báo 1 (Notify Party 1)
                  </label>
                  <textarea
                    name="notify_party_1"
                    value={formData.notify_party_1 || ''}
                    onChange={handleTextChange}
                    maxLength={500}
                    rows={2}
                    placeholder="Bên thông báo 1 (tối đa 500 ký tự)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Người được thông báo 2 (Notify Party 2)
                  </label>
                  <textarea
                    name="notify_party_2"
                    value={formData.notify_party_2 || ''}
                    onChange={handleTextChange}
                    maxLength={500}
                    rows={2}
                    placeholder="Bên thông báo 2 (nếu có)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROUTE & PORTS */}
          {activeTab === 'route' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Mã Cảng xếp hàng (POL) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="port_loading_code"
                    value={formData.port_loading_code}
                    onChange={handleTextChange}
                    maxLength={20}
                    required
                    placeholder="VD: CNSHA, KRPUS, JPTYO, SGSIN"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Mã Cảng dỡ hàng (POD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="port_unloading_code"
                    value={formData.port_unloading_code}
                    onChange={handleTextChange}
                    maxLength={20}
                    required
                    placeholder="VD: VNHPH, VNSGN, VNCAT"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Mã Cảng chuyển tải/quá cảnh
                  </label>
                  <input
                    type="text"
                    name="port_transhipment_code"
                    value={formData.port_transhipment_code || ''}
                    onChange={handleTextChange}
                    maxLength={20}
                    placeholder="VD: SGSIN, MYPKG (nếu có)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Mã Cảng giao hàng / cảng đích <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="port_destination_code"
                    value={formData.port_destination_code}
                    onChange={handleTextChange}
                    maxLength={20}
                    required
                    placeholder="VD: VNHPH, VNSGN, VNDAD"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono uppercase font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Địa điểm giao hàng* <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="place_of_delivery"
                    value={formData.place_of_delivery}
                    onChange={handleTextChange}
                    required
                    placeholder="Cont: mã cảng đích; Hàng lẻ: mã kho"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  />
                  <p className="text-[10px] text-gray-400">Cont = Cảng đích, CFS = Mã kho</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Loại hàng* (Cargo Type) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="cargo_type"
                    value={formData.cargo_type}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="FCL">FCL - Hàng nguyên container</option>
                    <option value="LCL">LCL - Hàng lẻ</option>
                    <option value="CFS">CFS - Kho hàng lẻ</option>
                    <option value="FCL/FCL">FCL/FCL</option>
                    <option value="LCL/LCL">LCL/LCL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Ngày khởi hành* (Departure Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="departure_date"
                    value={formData.departure_date}
                    onChange={handleTextChange}
                    placeholder="dd/MM/yyyy"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CARGO TOTALS */}
          {activeTab === 'cargo' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Tổng số kiện* <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="package_quantity"
                    value={formData.package_quantity}
                    onChange={handleTextChange}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Loại kiện* (Kind of packages) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="package_type"
                    value={formData.package_type}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="CT">CT - Carton (Thùng carton)</option>
                    <option value="PK">PK - Package (Kiện hàng)</option>
                    <option value="PL">PL - Pallet (Kệ hàng)</option>
                    <option value="BG">BG - Bag (Bao bì)</option>
                    <option value="DR">DR - Drum (Thùng phuy)</option>
                    <option value="BX">BX - Box (Hộp gỗ/kim loại)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Tổng trọng lượng* (Total GW) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="total_gross_weight"
                    value={formData.total_gross_weight}
                    onChange={handleTextChange}
                    min="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Đơn vị tính trọng lượng* <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="gross_weight_unit"
                    value={formData.gross_weight_unit}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="KGM">KGM - Ki-lô-gam (Kilogram)</option>
                    <option value="TNE">TNE - Tấn (Metric Ton)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Ghi chú (Remark)
                </label>
                <textarea
                  name="remark"
                  value={formData.remark || ''}
                  onChange={handleTextChange}
                  maxLength={500}
                  rows={3}
                  placeholder="Ghi chú chi tiết cho vận đơn gom hàng (tối đa 500 ký tự)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 5: CONTAINER & CARGO ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh sách Container & Chi tiết Hàng hóa
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Phân tích chi tiết từng số Container, Seal chì, Mã HS và kích thước CBM
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng hàng / Cont</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 space-y-3 relative group hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-blue-700 font-mono">
                        #{idx + 1}. Dòng hàng / Cont {item.container_number ? `(${item.container_number})` : ''}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          Số hiệu Cont (Cont. number)
                        </label>
                        <input
                          type="text"
                          value={item.container_number || ''}
                          onChange={(e) => handleItemChange(idx, 'container_number', e.target.value)}
                          maxLength={35}
                          placeholder="VD: TCKU9283741"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          Số Seal Cont (Seal number)
                        </label>
                        <input
                          type="text"
                          value={item.seal_number || ''}
                          onChange={(e) => handleItemChange(idx, 'seal_number', e.target.value)}
                          maxLength={35}
                          placeholder="VD: SL-SHA9921"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          Mã hàng (HS code if avail)
                        </label>
                        <input
                          type="text"
                          value={item.hs_code || ''}
                          onChange={(e) => handleItemChange(idx, 'hs_code', e.target.value)}
                          maxLength={20}
                          placeholder="VD: 6109.10.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        Mô tả hàng hóa* (Description of Goods) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={item.goods_description}
                        onChange={(e) => handleItemChange(idx, 'goods_description', e.target.value)}
                        rows={2}
                        maxLength={4000}
                        required
                        placeholder="Mô tả chi tiết quy cách, chủng loại hàng hóa..."
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          Trọng lượng dòng hàng* (Gross weight)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.gross_weight}
                          onChange={(e) => handleItemChange(idx, 'gross_weight', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">
                          Kích thước / Thể tích (CBM)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.dimension_cbm || 0}
                          onChange={(e) => handleItemChange(idx, 'dimension_cbm', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thông tin Vận đơn HBL</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
