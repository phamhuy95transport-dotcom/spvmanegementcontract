import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchContractById, upsertContract } from '../lib/contractsService';
import { uploadFileToDrive, DEFAULT_DRIVE_FOLDERS, DriveFolder, getSelectedDriveFolder, setSelectedDriveFolder } from '../lib/drive';
import { compressContractFile, CompressionResult } from '../lib/fileCompression';
import { ArrowLeft, Save, Upload, File as FileIcon, HardDrive, Cpu, Loader2, Folder } from 'lucide-react';
import { Contract } from '../types';

export default function ContractForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Contract>>({
    title: '',
    contract_number: '',
    party_a: 'CÔNG TY TNHH SPV GROUP', // default
    party_b: '',
    status: 'Draft',
    value: 0,
    sign_date: '',
    effective_date: '',
    expiration_date: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [targetDriveFolder, setTargetDriveFolder] = useState<DriveFolder>(() => getSelectedDriveFolder());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadContract(id);
    }
  }, [id, isEdit]);

  const loadContract = async (contractId: string) => {
    const existing = await fetchContractById(contractId);
    if (existing) {
      setFormData({
        id: existing.id,
        title: existing.title || '',
        contract_number: existing.contract_number || '',
        party_a: existing.party_a || 'CÔNG TY TNHH SPV GROUP',
        party_b: existing.party_b || '',
        status: existing.status || 'Draft',
        value: existing.value || 0,
        sign_date: existing.sign_date || '',
        effective_date: existing.effective_date || '',
        expiration_date: existing.expiration_date || '',
        file_id: existing.file_id || null,
        ocr_content: existing.ocr_content || '',
      });
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'value' ? Number(value) : value }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setCompressing(true);
      setCompressionInfo(null);
      try {
        const result = await compressContractFile(selectedFile);
        setFile(result.file);
        setCompressionInfo(result);
      } catch (err) {
        console.error("Compression error:", err);
        setFile(selectedFile);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let file_id = formData.file_id;
      if (file) {
        const driveResult = await uploadFileToDrive(file, file.name, file.type || 'application/pdf', undefined, targetDriveFolder);
        file_id = driveResult.id;
      }

      await upsertContract({
        ...formData,
        file_id: file_id || null,
      });

      navigate('/contracts');
    } catch (err) {
      console.error("Error saving contract:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/contracts" className="p-2 rounded-lg hover:bg-gray-200/60 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{isEdit ? 'Chỉnh sửa Hợp đồng' : 'Thêm Hợp Đồng'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Nhập đầy đủ thông tin pháp lý và lưu trữ hồ sơ tệp đính kèm.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Mã số hợp đồng <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="contract_number" 
                required
                placeholder="VD: HD-2025-081"
                value={formData.contract_number} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Tên hợp đồng <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="title" 
                required
                placeholder="VD: Hợp đồng đại lý Hải Quan"
                value={formData.title} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bên A (Chủ thể)</label>
              <input 
                type="text" 
                name="party_a" 
                value={formData.party_a} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Bên B (Đối tác) <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                name="party_b" 
                required
                placeholder="Tên công ty hoặc đối tác"
                value={formData.party_b} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Giá trị hợp đồng (VNĐ)</label>
              <input 
                type="number" 
                name="value" 
                placeholder="0"
                value={formData.value || ''} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trạng thái pháp lý</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-semibold"
              >
                <option value="Draft">Bản nháp (Chờ phê duyệt)</option>
                <option value="Active">Hiệu lực (Đã ký)</option>
                <option value="Expired">Hết hạn hợp đồng</option>
                <option value="Terminated">Chấm dứt trước hạn</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ngày ký kết</label>
              <input 
                type="date" 
                name="sign_date" 
                value={formData.sign_date || ''} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ngày có hiệu lực</label>
              <input 
                type="date" 
                name="effective_date" 
                value={formData.effective_date || ''} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ngày hết hạn</label>
              <input 
                type="date" 
                name="expiration_date" 
                value={formData.expiration_date || ''} 
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Tải file tài liệu đính kèm (Lưu trữ Google Drive)</span>
              <span className="text-blue-600 font-semibold flex items-center gap-1 text-[10px]">
                <HardDrive className="w-3 h-3" /> Auto-Sync Drive
              </span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-200 border-dashed hover:border-blue-500 bg-gray-50/40 hover:bg-blue-50/20 rounded-xl transition-all">
              <div className="space-y-2 text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <div className="flex text-xs text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white px-2 py-0.5 rounded font-semibold text-blue-600 hover:text-blue-700 shadow-2xs">
                    <span>Chọn tệp tin</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                  </label>
                  <p className="pl-2.5 self-center">hoặc kéo thả tập tin hợp đồng vào đây</p>
                </div>
                <p className="text-[11px] text-gray-400">
                  Tự động nén: <b>Ghostscript</b> cho tệp PDF và <b>browser-image-compression</b> cho tệp ảnh (PNG, JPG).
                </p>

                {compressing && (
                  <div className="mt-3 flex items-center justify-center text-xs font-semibold text-blue-700 bg-blue-50 py-2 px-3 rounded-lg border border-blue-200 inline-flex gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Đang nén tập tin... (Ghostscript cho PDF / browser-image-compression cho Ảnh)</span>
                  </div>
                )}

                {!compressing && compressionInfo && (
                  <div className="mt-3 flex flex-col items-center justify-center text-xs font-semibold text-emerald-800 bg-emerald-50 py-2.5 px-4 rounded-xl border border-emerald-200 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold">{compressionInfo.file.name}</span>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-md uppercase tracking-wider font-mono">
                        {compressionInfo.engine}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-700">
                      {compressionInfo.message}
                    </p>
                  </div>
                )}

                {!compressing && !compressionInfo && file && (
                  <div className="mt-3 flex items-center justify-center text-xs font-semibold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-flex">
                    <FileIcon className="w-4 h-4 mr-2 text-emerald-600" />
                    {file.name}
                  </div>
                )}
              </div>
            </div>

            {/* Google Drive Folder Selector */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-800">
                <Folder className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold">Thư mục lưu Google Drive:</span>
              </div>
              <select
                value={targetDriveFolder.id}
                onChange={(e) => {
                  const found = DEFAULT_DRIVE_FOLDERS.find(f => f.id === e.target.value);
                  if (found) {
                    setTargetDriveFolder(found);
                    setSelectedDriveFolder(found);
                  }
                }}
                className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-2xs"
              >
                {DEFAULT_DRIVE_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={() => navigate('/contracts')}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            {loading ? 'Đang lưu...' : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Lưu Hợp Đồng
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

