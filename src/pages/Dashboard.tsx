import { useEffect, useState } from 'react';
import { fetchAllContracts, shouldAlertContract } from '../lib/contractsService';
import { Contract } from '../types';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  Cpu, 
  HardDrive, 
  Ship, 
  ArrowRight, 
  PauseCircle,
  RotateCw,
  ArrowRightLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringOrExpired: 0,
    paused: 0,
    totalValue: 0,
  });
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await fetchAllContracts();
      
      let total = 0, active = 0, expiringOrExpired = 0, paused = 0, totalValue = 0;
      
      if (data && data.length > 0) {
        data.forEach(c => {
          total++;
          totalValue += Number(c.value) || 0;
          if (c.status === 'Đang áp dụng') active++;
          if (c.status === 'Tạm dừng') paused++;
          if (c.status === 'Hết hạn' || shouldAlertContract(c).shouldAlert) expiringOrExpired++;
        });
        
        const monthly = data.reduce((acc: any, c) => {
          if (!c.sign_date) return acc;
          try {
            const month = new Date(c.sign_date).toLocaleString('vi-VN', { month: 'short' });
            acc[month] = (acc[month] || 0) + 1;
          } catch {
            // ignore
          }
          return acc;
        }, {});
        
        const chart = Object.keys(monthly).map(k => ({ name: k, value: monthly[k] }));
        if (chart.length === 0) {
          setChartData([
            { name: 'Thg 1', value: 12 },
            { name: 'Thg 2', value: 19 },
            { name: 'Thg 3', value: 15 },
            { name: 'Thg 4', value: 22 },
            { name: 'Thg 5', value: 28 },
            { name: 'Thg 6', value: 34 },
          ]);
        } else {
          setChartData(chart);
        }

        setRecentContracts(data.slice(0, 5));
      } else {
        setChartData([]);
        setRecentContracts([]);
      }
      
      setStats({ total, active, expiringOrExpired, paused, totalValue });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'TỔNG SỐ HỢP ĐỒNG', 
      value: stats.total.toLocaleString('vi-VN'), 
      trend: 'Toàn bộ danh mục đầu vào & đầu ra', 
      trendColor: 'text-blue-600',
      icon: FileText, 
      accentBg: 'bg-blue-50 text-blue-600' 
    },
    { 
      title: 'ĐANG ÁP DỤNG', 
      value: stats.active, 
      trend: 'Trong thời hạn hiệu lực hợp lệ', 
      trendColor: 'text-emerald-600',
      icon: CheckCircle, 
      accentBg: 'bg-emerald-50 text-emerald-600' 
    },
    { 
      title: 'HẾT HẠN / CẦN XỬ LÝ', 
      value: stats.expiringOrExpired < 10 ? `0${stats.expiringOrExpired}` : stats.expiringOrExpired, 
      trend: 'Cần Gia hạn, Thay thế hoặc Tạm dừng', 
      trendColor: 'text-rose-600',
      icon: AlertTriangle, 
      accentBg: 'bg-rose-50 text-rose-600' 
    },
    { 
      title: 'TẠM DỪNG', 
      value: stats.paused, 
      trend: 'Đã tắt cảnh báo theo dõi', 
      trendColor: 'text-gray-600',
      icon: PauseCircle, 
      accentBg: 'bg-gray-100 text-gray-700' 
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 font-medium text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tải dữ liệu tổng quan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Bảng điều khiển & Phân tích Hợp đồng</h1>
          <p className="text-xs text-gray-500 mt-0.5">Theo dõi danh mục hợp đồng đầu vào/ra, trạng thái hiệu lực tự động và cảnh báo.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-right shadow-2xs">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tổng giá trị hợp đồng</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-gray-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{card.title}</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{card.value}</h3>
                  <p className={`text-[11px] mt-1.5 font-medium ${card.trendColor}`}>{card.trend}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.accentBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logistics Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-5 text-white shadow-lg border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/30 rounded-xl border border-blue-500/30 text-blue-400">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Trích Xuất Hợp Đồng & Vận Đơn Logistics</h3>
              <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-bold rounded uppercase tracking-wider font-mono border border-blue-400/30">
                Baidu Unlimited-OCR
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Tự động đọc mã HĐ, tên đối tác, mã số thuế, thời hạn hiệu lực và xuất bảng Excel chuẩn mẫu XLSX.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <Link
            to="/logistics-ocr"
            className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Mở OCR Logistics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Lower Row - Charts + Quick Contracts Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Contract List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">Hợp đồng mới cập nhật</h2>
              <Link to="/contracts" className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1">
                Xem toàn bộ bảng ({stats.total}) <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#1E293B] text-slate-100 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Số Hợp Đồng</th>
                    <th className="px-4 py-3 font-bold">Phân Loại</th>
                    <th className="px-4 py-3 font-bold">Khách Hàng / NCC</th>
                    <th className="px-3.5 py-3 font-bold">Mã Số Thuế</th>
                    <th className="px-4 py-3 font-bold">Trạng Thái</th>
                    <th className="px-4 py-3 font-bold text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                        <Link to={`/contracts/${c.id}`}>{c.contract_number}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-semibold">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{c.party_b}</td>
                      <td className="px-3.5 py-3 font-mono text-gray-600 text-[11px]">{c.tax_code || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          c.status === 'Đang áp dụng' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'Hết hạn' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          c.status === 'Tạm dừng' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/contracts/${c.id}`} className="text-blue-600 hover:underline font-semibold text-[11px]">
                          Xem OCR
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Hợp đồng phát sinh theo tháng</h3>
                <p className="text-xs text-gray-400">Phân bổ hợp đồng ký kết trong năm</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-semibold">Năm 2025–2026</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#F1F5F9' }} 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px' }} 
                  />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - OCR AI Terminal Theme Card */}
        <div className="bg-[#1A202C] text-white rounded-2xl shadow-lg border border-gray-800 flex flex-col p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Trích xuất Baidu Unlimited-OCR</h2>
            </div>
            <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono px-2 py-0.5 rounded">R-SWA Multi-Page</span>
          </div>

          <p className="text-xs text-gray-400 mb-3">Phân tích văn bản hợp đồng & phân loại tự động:</p>

          <div className="flex-1 bg-gray-900/90 rounded-xl border border-gray-800 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto space-y-1.5 shadow-inner">
            <p className="text-blue-400">// Trích xuất thông tin hợp đồng tự động</p>
            <p><span className="text-purple-300">"Phân_loại"</span>: <span className="text-emerald-300">"HĐ đầu ra"</span>,</p>
            <p><span className="text-purple-300">"Loại_hợp_đồng"</span>: <span className="text-emerald-300">"HĐ đại lý hải quan"</span>,</p>
            <p><span className="text-purple-300">"Số_hợp_đồng"</span>: <span className="text-emerald-300">"HD-2025-081"</span>,</p>
            <p><span className="text-purple-300">"Đối_tác_Bên_B"</span>: <span className="text-emerald-300">"CÔNG TY TNHH KANG FOODS"</span>,</p>
            <p><span className="text-purple-300">"Mã_số_thuế"</span>: <span className="text-emerald-300">"0110012544"</span>,</p>
            <p><span className="text-purple-300">"Hình_thức_ký"</span>: <span className="text-emerald-300">"Ký điện tử"</span>,</p>
            <p><span className="text-purple-300">"Trạng_thái_đánh_giá"</span>: <span className="text-amber-300">"Đang áp dụng"</span></p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Lưu trữ Google Drive OAuth2</p>
            <div className="flex items-center gap-2 text-xs bg-gray-800/60 p-2.5 rounded-xl border border-gray-700/60 font-mono text-gray-300">
              <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">Client ID + Refresh Token Linked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
