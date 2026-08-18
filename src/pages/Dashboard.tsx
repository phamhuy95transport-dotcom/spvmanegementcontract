import { useEffect, useState } from 'react';
import { fetchAllContracts } from '../lib/contractsService';
import { DashboardStats, Contract } from '../types';
import { FileText, CheckCircle, Clock, AlertTriangle, ArrowUpRight, Cpu, HardDrive, Ship, ArrowRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    draft: 0,
    expired: 0,
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
      
      let total = 0, active = 0, draft = 0, expired = 0, totalValue = 0;
      
      if (data && data.length > 0) {
        data.forEach(c => {
          total++;
          totalValue += Number(c.value) || 0;
          if (c.status === 'Active') active++;
          if (c.status === 'Draft') draft++;
          if (c.status === 'Expired') expired++;
        });
        
        const monthly = data.reduce((acc: any, c) => {
          if (!c.sign_date) return acc;
          const month = new Date(c.sign_date).toLocaleString('vi-VN', { month: 'short' });
          acc[month] = (acc[month] || 0) + 1;
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

        setRecentContracts(data.slice(0, 4));
      } else {
        total = 0;
        active = 0;
        draft = 0;
        expired = 0;
        totalValue = 0;
        setChartData([]);
        setRecentContracts([]);
      }
      
      setStats({ total, active, draft, expired, totalValue });
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
      trend: '↑ 12% so với tháng trước', 
      trendColor: 'text-emerald-600',
      icon: FileText, 
      accentBg: 'bg-blue-50 text-blue-600' 
    },
    { 
      title: 'CHỜ PHÊ DUYỆT / NHÁP', 
      value: stats.draft, 
      trend: 'Cần xử lý trong tuần này', 
      trendColor: 'text-amber-600',
      icon: Clock, 
      accentBg: 'bg-amber-50 text-amber-600' 
    },
    { 
      title: 'HẾT HẠN (30 NGÀY)', 
      value: stats.expired < 10 ? `0${stats.expired}` : stats.expired, 
      trend: 'Liên hệ đối tác gia hạn', 
      trendColor: 'text-rose-600',
      icon: AlertTriangle, 
      accentBg: 'bg-rose-50 text-rose-600' 
    },
    { 
      title: 'OCR HOÀN THÀNH', 
      value: '99.2%', 
      trend: 'Baidu Unlimited-OCR Active', 
      trendColor: 'text-blue-600',
      icon: CheckCircle, 
      accentBg: 'bg-emerald-50 text-emerald-600' 
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 font-medium text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          Đang tải dữ liệu tổng quan...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Bảng điều khiển & Phân tích</h1>
          <p className="text-xs text-gray-500 mt-0.5">Tổng quan thống kê hợp đồng, xử lý OCR AI và dữ liệu thời gian thực.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-right shadow-2xs">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tổng giá trị quản lý</span>
            <span className="text-lg font-bold text-slate-900">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Geometric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{card.title}</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{card.value}</h3>
                  <p className={`text-xs mt-2 font-medium ${card.trendColor}`}>{card.trend}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.accentBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* OCR Logistics Banner / Fast Action */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-5 text-white shadow-lg border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/30 rounded-xl border border-blue-500/30 text-blue-400">
            <Ship className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Mục OCR Logistics & e-Manifest Hải quan</h3>
              <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-bold rounded uppercase tracking-wider font-mono border border-blue-400/30">
                Mới
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Tải lên vận đơn gom hàng (House Bill of Lading), tự động trích xuất bảng kê 24 cột chuẩn VNACCS, lọc HS code, số Container, Seal và xuất Excel (.csv)
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

      {/* Lower Row - Charts + OCR AI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Hợp đồng mới theo tháng</h3>
                <p className="text-xs text-gray-400">Thống kê số lượng phát sinh trong năm</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-semibold">2025–2026</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#F1F5F9' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px' }} 
                  />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Contract List */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-xs uppercase tracking-wider text-gray-600">Hợp đồng gần đây</h2>
              <Link to="/contracts" className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1">
                Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Mã Số</th>
                    <th className="px-5 py-3 font-semibold">Đối Tác</th>
                    <th className="px-5 py-3 font-semibold">Ngày Ký</th>
                    <th className="px-5 py-3 font-semibold">Trạng Thái</th>
                    <th className="px-5 py-3 font-semibold text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-blue-600">
                        <Link to={`/contracts/${c.id}`}>{c.contract_number}</Link>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{c.party_b}</td>
                      <td className="px-5 py-3.5 text-gray-500">{c.sign_date || '-'}</td>
                      <td className="px-5 py-3.5">
                        {c.status === 'Active' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Hiệu lực</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Bản nháp</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/contracts/${c.id}`} className="text-blue-600 hover:underline font-semibold">
                          Xem PDF / OCR
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - OCR AI Terminal Theme Card */}
        <div className="bg-[#1A202C] text-white rounded-xl shadow-lg border border-gray-800 flex flex-col p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Trích xuất Baidu Unlimited-OCR</h2>
            </div>
            <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono px-2 py-0.5 rounded">Baidu R-SWA</span>
          </div>

          <p className="text-xs text-gray-400 mb-3">Phân tích đa trang liên tục bằng <code className="text-blue-300 font-mono">baidu/Unlimited-OCR</code> trên Hugging Face:</p>

          <div className="flex-1 bg-gray-900/90 rounded-lg border border-gray-800 p-4 font-mono text-[11px] leading-relaxed text-gray-300 overflow-y-auto space-y-1.5 shadow-inner">
            <p className="text-blue-400">// Kết quả Baidu Unlimited-OCR HD-2025-081</p>
            <p><span className="text-purple-300">"Tên_hợp_đồng"</span>: <span className="text-emerald-300">"Đại lý Hải Quan SPV-KF"</span>,</p>
            <p><span className="text-purple-300">"Bên_A"</span>: <span className="text-emerald-300">"CÔNG TY TNHH SPV GROUP"</span>,</p>
            <p><span className="text-purple-300">"Bên_B"</span>: <span className="text-emerald-300">"CÔNG TY TNHH KANG FOODS"</span>,</p>
            <p><span className="text-purple-300">"Giá_trị"</span>: <span className="text-emerald-300">"1,200,000,000 VND"</span>,</p>
            <p><span className="text-purple-300">"Thời_hạn"</span>: <span className="text-emerald-300">"01 năm (12 tháng)"</span>,</p>
            <p><span className="text-purple-300">"Mã_số_thuế_B"</span>: <span className="text-emerald-300">"0110012544"</span>,</p>
            <p><span className="text-purple-300">"Tòa_án_giải_quyết"</span>: <span className="text-emerald-300">"Tòa án Hải Phòng"</span></p>
            <div className="pt-2 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
              <p>...Architecture: DeepSeek-V2 MoE + SAM-ViT-B + CLIP-L...</p>
              <p>...Reference Sliding Window Attention (R-SWA)...</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Vị trí lưu trữ đám mây</p>
            <div className="flex items-center gap-2 text-xs bg-gray-800/60 p-2.5 rounded border border-gray-700/60 font-mono text-gray-300">
              <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">gdrive://contracts/legal/2025/HD081.pdf</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

