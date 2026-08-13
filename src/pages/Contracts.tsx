import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllContracts, deleteContract } from '../lib/contractsService';
import { Contract } from '../types';
import { PlusCircle, Search, Edit, Trash2, FileSearch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const data = await fetchAllContracts();
      setContracts(data);
    } catch (err) {
      console.error("Error fetching contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContract(contractToDelete.id);
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
    } catch (err) {
      console.error("Failed to delete contract:", err);
    } finally {
      setIsDeleting(false);
      setContractToDelete(null);
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.party_b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Hoàn tất / Hiệu lực</span>;
      case 'Draft': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Chờ ký / Nháp</span>;
      case 'Expired': return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Hết hạn</span>;
      case 'Terminated': return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Chấm dứt</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Danh sách Hợp đồng</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quản lý, tìm kiếm và xem chi tiết toàn bộ kho tài liệu hợp đồng.</p>
        </div>
        <Link 
          to="/contracts/new" 
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold shadow-2xs"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Thêm hợp đồng mới
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm mã hợp đồng, đối tác, tên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Hiển thị <span className="font-bold text-slate-900">{filteredContracts.length}</span> hợp đồng
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Mã Số</th>
                <th className="px-6 py-3.5 font-semibold">Tên Hợp Đồng</th>
                <th className="px-6 py-3.5 font-semibold">Bên Đối Tác</th>
                <th className="px-6 py-3.5 font-semibold">Ngày Ký</th>
                <th className="px-6 py-3.5 font-semibold">Trạng Thái</th>
                <th className="px-6 py-3.5 font-semibold">Giá Trị</th>
                <th className="px-6 py-3.5 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Đang tải danh sách...</td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Không tìm thấy hợp đồng nào phù hợp.</td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">
                      <Link to={`/contracts/${contract.id}`} className="hover:underline">{contract.contract_number}</Link>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{contract.title}</td>
                    <td className="px-6 py-4 text-slate-600">{contract.party_b}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {contract.sign_date ? format(new Date(contract.sign_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          to={`/contracts/${contract.id}`} 
                          className="px-2.5 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Xem PDF & Trích xuất OCR"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>Xem PDF</span>
                        </Link>
                        <Link 
                          to={`/contracts/${contract.id}/edit`} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => setContractToDelete(contract)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa hợp đồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Xác Nhận Xóa Hợp Đồng</h3>
                <p className="text-xs text-gray-500">Hành động này sẽ xóa vĩnh viễn hợp đồng khỏi lưu trữ</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">{contractToDelete.title}</p>
              <div className="flex items-center justify-between text-gray-600 font-mono text-[11px] pt-1 border-t border-red-100/60">
                <span>Số HĐ: {contractToDelete.contract_number}</span>
                <span>Đối tác: {contractToDelete.party_b}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa hợp đồng này không? Dữ liệu đã xóa sẽ không thể phục hồi.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setContractToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteContract}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


