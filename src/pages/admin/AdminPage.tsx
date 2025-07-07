import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, } from 'recharts';
import { toast } from 'react-hot-toast';
import { User, Package, Settings as Menu, X, Image as ImageIcon, LayoutDashboard, List, ShoppingCart, Users, Bell, Download, Mail, AlertTriangle, Calendar, LucideIcon, Gift } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Pagination from '../../components/shared/Pagination';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { addMonths, format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';


// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_featured: boolean;
  category_id: string | null;
  stock: number;
  created_at: string;
  categories?: { name: string };
  sold?: number;
  colors?: string[];
  sizes?: string[];
  discount_price?: number;
  material?: string;
  season?: string;
  origin?: string;
  washing_instruction?: string;
  product_images?: {
    id: string;
    image_url: string;
    is_primary: boolean;
    color?: string;
  }[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  refund_request?: boolean;
  refund_status?: 'pending' | 'approved' | 'rejected';
  refund_amount?: number;
  refund_reason?: string;
  refund_date?: string;
  user?: {
    email: string;
    full_name: string;
  };
  refund_image_url?: string;
  delivery_status?: 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
  address?: string;
  note?: string;
  items?: any[];
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topSpendingCustomer: {
    name: string;
    total: number;
  };
  orderStatus: {
    pending: number;
    completed: number;
    cancelled: number;
  };
  lowStockProducts: Product[];
  topSellingProducts: {
    product: Product;
    quantity: number;
    revenue: number;
  }[];
  previousPeriodRevenue: number;
  revenueChange: number;
  orders: { created_at: string; total_amount: number }[];
}

// Animation variants
const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const tabVariants = {
  active: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    borderRight: '4px solid #4F46E5',
    transition: { duration: 0.3 }
  },
  inactive: {
    backgroundColor: 'transparent',
    color: '#6B7280',
    borderRight: '4px solid transparent',
    transition: { duration: 0.3 }
  }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3
    }
  }
};

// Time period options
const timePeriods = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'thisWeek' },
  { label: 'Tháng này', value: 'thisMonth' },
  { label: 'Năm nay', value: 'thisYear' },
  { label: 'Tùy chỉnh', value: 'custom' }
];

// Helper functions
const getDateRange = (period: string, customRange?: { start: Date; end: Date }) => {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case 'thisWeek':
      return {
        start: startOfWeek(now, { locale: vi }),
        end: endOfWeek(now, { locale: vi })
      };
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    case 'thisQuarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
      };
    case 'thisYear':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      };
    case 'custom':
      return customRange || {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Hàm dịch trạng thái đơn hàng sang tiếng Việt
function translateOrderStatus(status: string) {
  switch (status) {
    case 'pending': return 'Chờ duyệt';
    case 'confirmed': return 'Đã duyệt';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
}

// Hàm dịch trạng thái giao hàng sang tiếng Việt
function translateDeliveryStatus(status: string) {
  switch (status) {
    case 'pending': return 'Chờ đóng gói';
    case 'processing': return 'Đang đóng gói';
    case 'shipping': return 'Đang giao';
    case 'delivered': return 'Đã giao';
    case 'cancelled': return 'Bị hủy';
    default: return status;
  }
}

// Hàm chuyển tiếng Việt có dấu sang không dấu
function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase();
}

// Hàm rút gọn số tiền kiểu Việt hóa, làm tròn trăm nghìn
function formatShortMoney(amount: number) {
  if (amount >= 1_000_000) {
    const trieu = Math.floor(amount / 1_000_000);
    const tramNghin = Math.ceil((amount % 1_000_000) / 100_000);
    if (tramNghin === 0) return `${trieu} triệu`;
    return `${trieu} triệu ${tramNghin}`;
  }
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return amount.toString();
}

// Hàm gom nhóm doanh thu theo ngày, trả về mảng [{date, revenue}]
function getRevenueByDay(
  orders: { created_at: string; total_amount: number }[],
  period: string,
  customRange?: { start: Date; end: Date }
) {
  let start: Date, end: Date;
  if (period === 'custom' && customRange) {
    start = customRange.start;
    end = customRange.end;
  } else {
    const range = getDateRange(period);
    start = range.start;
    end = range.end;
  }
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diffYears = end.getFullYear() - start.getFullYear();
  console.log('start:', start, 'end:', end, 'diffDays:', diffDays, 'period:', period);
  // Gom nhóm theo ngày nếu <= 31 ngày
  if (diffDays <= 31) {
    const days = eachDayOfInterval({ start, end });
    const revenueMap: Record<string, number> = {};
    days.forEach(day => {
      const d = format(day, 'yyyy-MM-dd');
      revenueMap[d] = 0;
    });
    orders.forEach(order => {
      const d = order.created_at.slice(0, 10);
      if (revenueMap[d] !== undefined) {
        revenueMap[d] += order.total_amount;
      }
    });
    return days.map(day => ({
      date: format(day, 'dd/MM/yyyy'),
      revenue: revenueMap[format(day, 'yyyy-MM-dd')]
    }));
  }
  // Gom nhóm theo tháng nếu > 31 ngày và <= 366 ngày
  if (diffDays > 31 && diffYears < 2) {
    const months = [];
    let current = startOfMonth(start);
    while (current <= end) {
      months.push(new Date(current));
      current = addMonths(current, 1);
    }
    const revenueMap: Record<string, number> = {};
    months.forEach(month => {
      const m = format(month, 'yyyy-MM');
      revenueMap[m] = 0;
    });
    orders.forEach(order => {
      const m = order.created_at.slice(0, 7);
      if (revenueMap[m] !== undefined) {
        revenueMap[m] += order.total_amount;
      }
    });
    return months.map(month => ({
      date: format(month, 'MM/yyyy'),
      revenue: revenueMap[format(month, 'yyyy-MM')]
    }));
  }
  // Gom nhóm theo năm nếu > 366 ngày
  if (diffYears >= 2) {
    const years = [];
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      years.push(y);
    }
    const revenueMap: Record<string, number> = {};
    years.forEach(year => {
      revenueMap[year] = 0;
    });
    orders.forEach(order => {
      const y = new Date(order.created_at).getFullYear();
      if (revenueMap[y] !== undefined) {
        revenueMap[y] += order.total_amount;
      }
    });
    return years.map(year => ({
      date: year.toString(),
      revenue: revenueMap[year]
    }));
  }
  // Trường hợp fallback (gom theo ngày)
  const days = eachDayOfInterval({ start, end });
  const revenueMap: Record<string, number> = {};
  days.forEach(day => {
    const d = format(day, 'yyyy-MM-dd');
    revenueMap[d] = 0;
  });
  orders.forEach(order => {
    const d = order.created_at.slice(0, 10);
    if (revenueMap[d] !== undefined) {
      revenueMap[d] += order.total_amount;
    }
  });
  return days.map(day => ({
    date: format(day, 'dd/MM/yyyy'),
    revenue: revenueMap[format(day, 'yyyy-MM-dd')]
  }));
}

const AdminPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname.split('/admin/')[1] || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<{
    type: 'warning' | 'info' | 'error';
    message: string;
  }[]>([]);
  // State tìm kiếm riêng cho từng tab
  const [searchProducts, setSearchProducts] = useState('');
  const [searchCategories, setSearchCategories] = useState('');
  const [searchVouchers, setSearchVouchers] = useState('');

  const menuItems: { icon: React.ReactNode; label: string; path: string }[] = [
    { icon: <LayoutDashboard />, label: 'Tổng quan', path: '/admin' },
    { icon: <Package />, label: 'Sản phẩm', path: '/admin/products' },
    { icon: <List />, label: 'Danh mục', path: '/admin/categories' },
    { icon: <ShoppingCart />, label: 'Đơn hàng', path: '/admin/orders' },
    { icon: <Users />, label: 'Khách hàng', path: '/admin/customers' },
    { icon: <Gift />, label: 'Voucher', path: '/admin/vouchers' },
    { icon: <Calendar />, label: 'Flash Sale', path: '/admin/flashsale' },
    { icon: <ImageIcon />, label: 'Banner', path: '/admin/banners' },
    { icon: <Download />, label: 'Báo cáo', path: '/admin/reports' },
  ];

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, customDateRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const dateRange = getDateRange(selectedPeriod, customDateRange);
      const previousDateRange = {
        start: subMonths(dateRange.start, 1),
        end: subMonths(dateRange.end, 1)
      };

      // Fetch orders first
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id, items')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      if (ordersError) throw ordersError;

      // Then fetch users for those orders
      const userIds = [...new Set((orders || []).map(o => o.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Fetch previous period orders
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousDateRange.start.toISOString())
        .lte('created_at', previousDateRange.end.toISOString());

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Map users to orders
      const ordersWithUsers = orders?.map(order => ({
        ...order,
        user: users?.find(u => u.id === order.user_id)
      }));

      // Calculate statistics
      const stats: DashboardStats = {
        totalRevenue: ordersWithUsers?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        totalOrders: ordersWithUsers?.length || 0,
        totalCustomers: userIds.length,
        newCustomers: 0,
        returningCustomers: 0,
        topSpendingCustomer: {
          name: '',
          total: 0
        },
        orderStatus: {
          pending: ordersWithUsers?.filter(o => o.status === 'pending').length || 0,
          completed: ordersWithUsers?.filter(o => o.status === 'confirmed').length || 0,
          cancelled: ordersWithUsers?.filter(o => o.status === 'cancelled').length || 0
        },
        lowStockProducts: products?.filter(p => p.stock < 10) || [],
        topSellingProducts: [],
        previousPeriodRevenue: previousOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        revenueChange: 0,
        orders: ordersWithUsers || []
      };

      // Calculate top selling products
      const productSales: Record<string, { product: Product; quantity: number; revenue: number }> = {};
      ordersWithUsers?.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (!item.product_id) return;
            // Chỉ lấy sản phẩm còn tồn tại
            const prod = products?.find(p => p.id === item.product_id);
            if (!prod) return; // Nếu sản phẩm đã xóa thì bỏ qua
            if (!productSales[item.product_id]) {
              productSales[item.product_id] = {
                product: prod,
                quantity: 0,
                revenue: 0
              };
            }
            productSales[item.product_id].quantity += item.quantity;
            productSales[item.product_id].revenue += item.quantity * item.price;
          });
        }
      });

      const sortedProducts = Object.values(productSales);
      stats.topSellingProducts = sortedProducts
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Calculate revenue change
      stats.revenueChange = stats.previousPeriodRevenue
        ? ((stats.totalRevenue - stats.previousPeriodRevenue) / stats.previousPeriodRevenue) * 100
        : 0;

      setDashboardStats(stats);

      // Update notifications
      const newNotifications: { type: 'warning' | 'info' | 'error'; message: string; }[] = [];
      if (stats.orderStatus.pending > 0) {
        newNotifications.push({
          type: 'warning',
          message: `${stats.orderStatus.pending} đơn hàng đang chờ xử lý`
        });
      }
      if (stats.lowStockProducts.length > 0) {
        newNotifications.push({
          type: 'warning',
          message: `${stats.lowStockProducts.length} sản phẩm sắp hết hàng`
        });
      }
      if (stats.revenueChange < 0) {
        newNotifications.push({
          type: 'error',
          message: `Doanh thu giảm ${Math.abs(stats.revenueChange).toFixed(1)}% so với kỳ trước`
        });
      }
      setNotifications(newNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    // TODO: Implement PDF export
    console.log('Exporting report...');
    toast.success('Đang xuất báo cáo...');
  };

  const handleSendPromotion = () => {
    // TODO: Implement email sending
    console.log('Sending promotion emails...');
    toast.success('Đang gửi thông báo khuyến mãi...');
  };

  // Trong AdminPage component, sau khi khai báo state notifications:
  useEffect(() => {
    // Lắng nghe realtime đơn hàng mới
    const orderSub = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        setNotifications(prev => [
          { type: 'info', message: `Có đơn hàng mới: ${payload.new.id}` },
          ...prev
        ]);
      })
      .subscribe();

    // Lắng nghe realtime sản phẩm sắp hết hàng (khi cập nhật stock)
    const productSub = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, payload => {
        if (payload.new.stock < 10 && payload.old.stock >= 10) {
          setNotifications(prev => [
            { type: 'warning', message: `Sản phẩm "${payload.new.name}" sắp hết hàng!` },
            ...prev
          ]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderSub);
      supabase.removeChannel(productSub);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <motion.div
        initial={{ width: isSidebarOpen ? 240 : 0 }}
        animate={{ width: isSidebarOpen ? 240 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-white shadow-lg overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold text-primary-600"
          >
            Admin Panel
          </motion.h1>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-full hover:bg-gray-100"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
        <nav className="mt-4">
          {menuItems.map((item) => (
            <motion.div
              key={item.path}
              variants={tabVariants}
              animate={activeTab === item.path ? 'active' : 'inactive'}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={item.path}
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200"
                onClick={() => setActiveTab(item.path)}
            >
                {item.icon}
                <span>{item.label}</span>
            </Link>
            </motion.div>
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-sm p-4 flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-gray-800">Quản trị</h2>
          <div className="flex items-center gap-4">
            {/* Tìm kiếm riêng cho từng tab */}
            {activeTab === 'products' && (
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchProducts}
                onChange={e => setSearchProducts(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {activeTab === 'categories' && (
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchCategories}
                onChange={e => setSearchCategories(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {activeTab === 'voucher' && (
              <input
                type="text"
                placeholder="Tìm kiếm voucher..."
                value={searchVouchers}
                onChange={e => setSearchVouchers(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            <span className="text-sm text-gray-500">Admin</span>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white cursor-pointer"
            >
              <User size={16} />
            </motion.div>
            </div>
        </motion.header>

        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Routes>
                <Route path="/" element={<Dashboard 
                  stats={dashboardStats}
                  isLoading={isLoading}
                  selectedPeriod={selectedPeriod}
                  setSelectedPeriod={setSelectedPeriod}
                  customDateRange={customDateRange}
                  setCustomDateRange={setCustomDateRange}
                  notifications={notifications}
                  onExportReport={handleExportReport}
                  onSendPromotion={handleSendPromotion}
                />} />
                <Route path="/products" element={<Products search={searchProducts} setSearch={setSearchProducts} />} />
                <Route path="/categories" element={<Categories search={searchCategories} />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/vouchers" element={<VoucherManager search={searchVouchers} />} />
                <Route path="/events" element={<EventManager />} />
                <Route path="/flashsale" element={<FlashSaleManager />} />
                <Route path="/banners" element={<BannerManager />} />
                <Route path="/reports" element={<ReportPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Dashboard Component
interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  customDateRange: { start: Date; end: Date };
  setCustomDateRange: (range: { start: Date; end: Date }) => void;
  notifications: { type: 'warning' | 'info' | 'error'; message: string; }[];
  onExportReport: () => void;
  onSendPromotion: () => void;
}

const Dashboard = ({
  stats,
  isLoading,
  selectedPeriod,
  setSelectedPeriod,
  customDateRange,
  setCustomDateRange,
  notifications,
  
  onSendPromotion
}: DashboardProps) => {
  const COLORS = ['#FFBB28', '#00C49F', '#FF8042'];
  const [lowStockPage, setLowStockPage] = useState(1);
  const lowStockPerPage = 8;
  const paginatedLowStock = stats?.lowStockProducts.slice((lowStockPage - 1) * lowStockPerPage, lowStockPage * lowStockPerPage) || [];
  const totalLowStockPages = stats ? Math.ceil(stats.lowStockProducts.length / lowStockPerPage) : 1;
  const [showNotif, setShowNotif] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Xuất báo cáo Excel
  const handleExportExcel = () => {
    if (!stats || stats.totalOrders === 0) {
      setExportMsg('Chưa có dữ liệu để xuất');
      setShowExportPopup(true);
      return;
    }
    // Chuẩn bị dữ liệu
    const wsData = [
      ['Tên sản phẩm', 'Số lượng bán', 'Doanh thu'],
      ...stats.topSellingProducts.map(item => [item.product.name, item.quantity, item.revenue]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Sản Phẩm');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'bao_cao_san_pham.xlsx');
  };

  let revenueTitle = "Thống kê doanh thu";
if (selectedPeriod === "custom" && customDateRange) {
  const diffDays = Math.ceil((customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diffYears = customDateRange.end.getFullYear() - customDateRange.start.getFullYear();
  if (diffDays <= 31) revenueTitle = "Thống kê doanh thu theo ngày";
  else if (diffDays > 31 && diffYears < 2) revenueTitle = "Thống kê doanh thu theo tháng";
  else revenueTitle = "Thống kê doanh thu theo năm";
} else {
  switch (selectedPeriod) {
    case "today":
      revenueTitle = "Thống kê doanh thu theo ngày";
      break;
    case "thisWeek":
      revenueTitle = "Thống kê doanh thu theo tuần";
      break;
    case "thisMonth":
    case "lastMonth":
    case "thisQuarter":
      revenueTitle = "Thống kê doanh thu theo ngày";
      break;
    case "thisYear":
      revenueTitle = "Thống kê doanh thu theo tháng";
      break;
    default:
      revenueTitle = "Thống kê doanh thu";
  }
}

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tổng quan</h2>
        <div className="flex gap-2">
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotif(v => !v)}
            className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{notifications.length}</span>}
          </motion.button>
        </div>
      </div>

      {/* Time period filter */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {timePeriods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <DatePicker
                selected={customDateRange.start}
                onChange={(date: Date | null) => date && setCustomDateRange({ ...customDateRange, start: date })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                locale={vi}
              />
              <span>đến</span>
              <DatePicker
                selected={customDateRange.end}
                onChange={(date: Date | null) => date && setCustomDateRange({ ...customDateRange, end: date })}
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                dateFormat="dd/MM/yyyy"
                locale={vi}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
              <h3 className="text-lg font-medium text-primary-800">Tổng doanh thu</h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className={`text-sm mt-2 ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}% so với kỳ trước
              </p>
        </motion.div>
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
              <h3 className="text-lg font-medium text-green-800">Tổng đơn hàng</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalOrders}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.orderStatus.pending} đơn đang xử lý
              </p>
        </motion.div>
        <motion.div
              whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-lg"
        >
          <h3 className="text-lg font-medium text-blue-800">Tổng khách hàng</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.newCustomers} khách hàng mới
              </p>
        </motion.div>
      </div>

          {/* Biểu đồ doanh thu theo ngày */}
          <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
          <h3 className="text-lg font-medium mb-4">
            {revenueTitle}
          </h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getRevenueByDay(stats.orders || [], selectedPeriod, customDateRange)}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={formatShortMoney} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#6e56cf" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts and tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order status chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">Trạng thái đơn hàng</h3>
              <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Đã giao', value: stats.orderStatus.completed },
                        { name: 'Bị hủy', value: stats.orderStatus.cancelled }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Đã giao', value: stats.orderStatus.completed },
                        { name: 'Bị hủy', value: stats.orderStatus.cancelled }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
              <Tooltip />
                  </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

            {/* Top selling products */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">Sản phẩm bán chạy</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pb-3">Sản phẩm</th>
                      <th className="pb-3">Số lượng</th>
                      <th className="pb-3">Doanh thu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Màu sắc</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kích cỡ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSellingProducts.map((item) => (
                      <tr key={item.product.id} className="border-t">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <span className="font-medium">{item.product.name}</span>
                          </div>
                        </td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">{formatCurrency(item.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(item.product.colors) ? item.product.colors.join(', ') : ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(item.product.sizes) ? item.product.sizes.join(', ') : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Low stock products */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-medium mb-4">Sản phẩm sắp hết hàng</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500">
                    <th className="pb-3">Sản phẩm</th>
                    <th className="pb-3">Số lượng còn lại</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLowStock.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${product.stock < 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalLowStockPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={lowStockPage}
                  totalPages={totalLowStockPages}
                  onPageChange={setLowStockPage}
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Popup xuất báo cáo */}
      {showExportPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4">
            <AlertTriangle size={40} className="text-red-500" />
            <div className="text-lg font-semibold">{exportMsg}</div>
            <button onClick={() => setShowExportPopup(false)} className="px-4 py-2 bg-primary-500 text-white rounded-lg">Đóng</button>
          </div>
        </div>
      )}

      {/* Danh sách thông báo khi bấm icon */}
      <AnimatePresence>
        {showNotif && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-20 right-8 z-50 w-80 bg-white rounded-xl shadow-xl p-4 space-y-3"
          >
            {notifications.map((notification, index) => (
              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                notification.type === 'error' ? 'bg-red-100 text-red-700' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {notification.type === 'error' ? <AlertTriangle size={24} /> : <Bell size={24} />}
                <span>{notification.message}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Products Component
interface ProductsProps { search: string, setSearch: (val: string) => void }
const Products = ({ search, setSearch }: ProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'product' | 'category'} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    discount_price: '',
    stock: '',
    sold: '',
    category_id: '',
    description: '',
    image: null as File | null,
    is_featured: false,
    colors: '',
    sizes: '',
    material: '',
    season: '',
    origin: '',
    washing_instruction: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Số sản phẩm mỗi trang
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [oldImages, setOldImages] = useState<{url: string, isPrimary: boolean}[]>([]);
  const [imageColors, setImageColors] = useState<string[]>([]);

  // Fetch products & categories from Supabase
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          product_images:product_images(id, image_url, is_primary)
        `)
        .order('created_at', { ascending: false });

      console.log('DATA:', data);
      console.log('ERROR:', error);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    if (!error) setCategories(data || []);
  };

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        discount_price: product.discount_price ? product.discount_price.toString() : '',
        stock: product.stock.toString(),
        sold: product.sold?.toString() || '',
        category_id: product.category_id || '',
        description: product.description,
        image: null,
        is_featured: product.is_featured,
        colors: Array.isArray(product.colors) ? product.colors.join(',') : '',
        sizes: Array.isArray(product.sizes) ? product.sizes.join(',') : '',
        material: product.material || '',
        season: product.season || '',
        origin: product.origin || '',
        washing_instruction: product.washing_instruction || '',
      });
      if (product.product_images && product.product_images.length > 0) {
        setOldImages(product.product_images.map(img => ({ url: img.image_url, isPrimary: img.is_primary })));
        setPreviewImages(product.product_images.map(img => img.image_url));
        setSelectedImages([]);
        setPrimaryImageIndex(product.product_images.findIndex(img => img.is_primary) || 0);
        setImageColors(product.product_images.map(img => img.color || (product.colors?.[0] || '')));
      } else {
        setOldImages([]);
        setPreviewImages([]);
        setSelectedImages([]);
        setPrimaryImageIndex(0);
        setImageColors([]);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        discount_price: '',
        stock: '',
        sold: '',
        category_id: '',
        description: '',
        image: null,
        is_featured: false,
        colors: '',
        sizes: '',
        material: '',
        season: '',
        origin: '',
        washing_instruction: '',
      });
      setOldImages([]);
      setPreviewImages([]);
      setSelectedImages([]);
      setPrimaryImageIndex(0);
      setImageColors([]);
    }
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...files]);
      setPreviewImages(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
      // Thêm màu mặc định (màu đầu tiên hoặc rỗng)
      setImageColors(prev => [
        ...prev,
        ...files.map(() => (formData.colors.split(',')[0]?.trim() || ''))
      ]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      discount_price: '',
      stock: '',
      sold: '',
      category_id: '',
      description: '',
      image: null,
      is_featured: false,
      colors: '',
      sizes: '',
      material: '',
      season: '',
      origin: '',
      washing_instruction: '',
    });
    setImagePreview('');
  };

  const handleRemoveImage = (idx: number) => {
    if (idx < oldImages.length) {
      setOldImages(oldImages.filter((_, i) => i !== idx));
      setPreviewImages(previewImages.filter((_, i) => i !== idx));
      setImageColors(imageColors.filter((_, i) => i !== idx));
    } else {
      const fileIdx = idx - oldImages.length;
      setSelectedImages(selectedImages.filter((_, i) => i !== fileIdx));
      setPreviewImages(previewImages.filter((_, i) => i !== idx));
      setImageColors(imageColors.filter((_, i) => i !== idx));
    }
  };

  const uploadImages = async (files: File[]): Promise<{ url: string; isPrimary: boolean }[]> => {
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        isPrimary: index === primaryImageIndex
      };
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Lấy dữ liệu trực tiếp từ state formData
      const productData: any = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        category_id: formData.category_id || null,
        is_featured: !!formData.is_featured,
        stock: Number(formData.stock),
        colors: formData.colors ? formData.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
        sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        discount_price: formData.discount_price ? Number(formData.discount_price) : null,
        material: formData.material || '',
        season: formData.season || '',
        origin: formData.origin || '',
        washing_instruction: formData.washing_instruction || '',
        sold: formData.sold ? Number(formData.sold) : 0,
      };
      // Log để debug
      console.log('productData:', productData);

      if (editingProduct) {
        // Upload ảnh mới nếu có
        let uploadedImages: {url: string, isPrimary: boolean}[] = [];
        if (selectedImages.length > 0) {
          const uploaded = await uploadImages(selectedImages);
          uploadedImages = uploaded;
        }
        // Gộp ảnh cũ còn lại và ảnh mới
        const allImages = [
          ...oldImages,
          ...uploadedImages
        ].map((img, idx) => ({
          product_id: editingProduct.id,
          image_url: img.url,
          is_primary: idx === primaryImageIndex,
          color: imageColors[idx] || null
        }));
        // Xóa hết ảnh cũ trong DB, thêm lại toàn bộ allImages
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', editingProduct.id);
        if (deleteError) throw deleteError;
        const { error: insertError } = await supabase
          .from('product_images')
          .insert(allImages);
        if (insertError) throw insertError;
        // Cập nhật image_url đại diện
        const primaryImage = allImages.find(img => img.is_primary);
        if (primaryImage) {
          productData.image_url = primaryImage.image_url;
        }
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        // Thêm mới sản phẩm
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();
        if (error) throw error;
        // Thêm ảnh cho sản phẩm mới
        if (selectedImages.length > 0) {
          const uploadedImages = await uploadImages(selectedImages);
          const { error: insertError } = await supabase
            .from('product_images')
            .insert(uploadedImages.map(img => ({
              product_id: data.id,
              image_url: img.url,
              is_primary: img.isPrimary
            })));
          if (insertError) throw insertError;
          // Lấy ảnh chính làm ảnh đại diện
          const primaryImage = uploadedImages.find(img => img.isPrimary);
          if (primaryImage) {
            await supabase.from('products').update({ image_url: primaryImage.url }).eq('id', data.id);
          }
        }
        toast.success('Thêm sản phẩm thành công');
      }
      handleCloseModal();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Có lỗi xảy ra khi lưu sản phẩm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string, type: 'product' | 'category') => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from(itemToDelete.type === 'product' ? 'products' : 'categories')
        .delete()
        .eq('id', itemToDelete.id);
      if (error) throw error;
      if (itemToDelete.type === 'product') {
        await fetchProducts();
        toast.success('Xóa sản phẩm thành công!');
      } else {
        await fetchCategories();
        toast.success('Xóa danh mục thành công!');
      }
    } catch (error) {
      toast.error(`Có lỗi xảy ra khi xóa ${itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Tính toán sản phẩm cho trang hiện tại
  

  // Tính tổng số trang
  const totalPages = Math.ceil(products.length / itemsPerPage);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  // State cho bulk edit
  
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    price: '',
    stock: '',
    category_id: '',
    colors: '',
    sizes: '',
    is_featured: false,
    material: '',
    season: '',
    origin: '',
    washing_instruction: '',
  });

  // Hàm chọn tất cả
  
  // Hàm chọn từng sản phẩm
  

  // Hàm mở modal bulk edit
  const openBulkEditModal = () => {
    setBulkEditModalOpen(true);
    setBulkEditData({ price: '', stock: '', category_id: '', colors: '', sizes: '', is_featured: false, material: '', season: '', origin: '', washing_instruction: '' });
  };

  // Hàm xác nhận bulk edit
  const handleBulkEdit = async () => {
    const updateFields: any = {};
    if (bulkEditData.price !== '') updateFields.price = Number(bulkEditData.price);
    if (bulkEditData.stock !== '') updateFields.stock = Number(bulkEditData.stock);
    if (bulkEditData.category_id !== '') updateFields.category_id = bulkEditData.category_id;
    if (bulkEditData.colors !== '') updateFields.colors = bulkEditData.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (bulkEditData.sizes !== '') updateFields.sizes = bulkEditData.sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (bulkEditData.is_featured) updateFields.is_featured = true;
    if (bulkEditData.material !== '') updateFields.material = bulkEditData.material;
    if (bulkEditData.season !== '') updateFields.season = bulkEditData.season;
    if (bulkEditData.origin !== '') updateFields.origin = bulkEditData.origin;
    if (bulkEditData.washing_instruction !== '') updateFields.washing_instruction = bulkEditData.washing_instruction;
    if (Object.keys(updateFields).length === 0) {
      toast.error('Vui lòng nhập ít nhất một trường để cập nhật!');
      return;
    }
    try {
      const { error } = await supabase
        .from('products')
        .update(updateFields)
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success('Cập nhật hàng loạt thành công!');
      setBulkEditModalOpen(false);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi cập nhật hàng loạt');
    }
  };

  // Lọc sản phẩm theo search (từ props)
  const filteredProducts = products.filter(p => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const name = removeVietnameseTones(p.name);
    return name.includes(q);
  });

  // Trong Products, bổ sung logic xóa hàng loạt
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Hàm chọn tất cả sản phẩm đang hiển thị
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Hàm chọn từng sản phẩm
  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedProducts(prev => checked ? [...prev, id] : prev.filter(pid => pid !== id));
  };

  // Hàm xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts);
      if (error) throw error;
      toast.success('Đã xóa sản phẩm!');
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  // Thêm biến paginatedProducts
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="admin-products-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý sản phẩm</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          {selectedProducts.length > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openBulkEditModal}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-yellow-400"
                style={{ boxShadow: '0 2px 8px 0 rgba(255, 193, 7, 0.12)' }}
              >
                Sửa hàng loạt
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-red-400"
                style={{ boxShadow: '0 2px 8px 0 rgba(255, 0, 0, 0.12)' }}
              >
                Xóa hàng loạt
              </motion.button>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold transition-all duration-200 border-2 border-primary-400"
            style={{ boxShadow: '0 2px 8px 0 rgba(80, 0, 200, 0.12)' }}
          >
            <Package size={20} />
            Thêm sản phẩm mới
          </motion.button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không tìm thấy sản phẩm nào.</div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} onChange={e => handleSelectAll(e.target.checked)} /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá đã giảm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt bán</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nổi bật</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Màu sắc</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kích cỡ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-center"><input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={e => handleSelectProduct(product.id, e.target.checked)} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={product.image_url || '/placeholder.png'}
                        alt={product.name}
                        className="h-16 w-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(product.price).toLocaleString('vi-VN')}đ</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.discount_price ? Number(product.discount_price).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.categories?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.is_featured ? '✔️' : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(product.colors) ? product.colors.join(', ') : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Array.isArray(product.sizes) ? product.sizes.join(', ') : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleOpenModal(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Sửa
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(product.id, product.name, 'product')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                  }}
                />
          </div>
            )}
          </>
        )}
      </div>
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, rotateY: -60, scale: 0.9 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ perspective: 1000 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: -60, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ perspective: 1000 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-[600px]"
            >
              <h3 className="text-xl font-bold mb-4">
                {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-2">
                  <div className="space-y-4">
                    {/* Các trường nhập liệu (giữ nguyên layout dọc) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                      <div className="mt-1 flex flex-wrap gap-4 items-center">
                        {previewImages.map((url, idx) => (
                          <div key={idx} className="relative group flex flex-col items-center">
                            <img
                              src={url}
                              alt={`Preview ${idx}`}
                              className="h-20 w-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveImage(idx);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
                              title="Xóa ảnh"
                            >×</button>
                            {/* Box chọn màu và chọn ảnh chính */}
                            <div className="flex gap-2 mt-2 w-full justify-center">
                              <select
                                className="px-2 py-1 text-xs rounded bg-white border border-gray-300"
                                value={imageColors[idx] || ''}
                                onChange={e => {
                                  const newColors = [...imageColors];
                                  newColors[idx] = e.target.value;
                                  setImageColors(newColors);
                                }}
                              >
                                <option value="">Chọn màu</option>
                                {formData.colors.split(',').map(c => c.trim()).filter(Boolean).map((color, i) => (
                                  <option key={i} value={color}>{color}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setPrimaryImageIndex(idx)}
                                className={`px-2 py-1 text-xs rounded ${primaryImageIndex === idx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                              >{primaryImageIndex === idx ? 'Ảnh chính' : 'Chọn làm chính'}</button>
                            </div>
                          </div>
                        ))}
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <ImageIcon size={20} />
                            Thêm ảnh
                          </div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tên sản phẩm</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Giá</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Giá đã giảm</label>
                      <input
                        type="number"
                        value={formData.discount_price}
                        onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Nhập giá đã giảm nếu có"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tồn kho</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lượt bán</label>
                      <input
                        type="number"
                        value={formData.sold}
                        onChange={(e) => setFormData({ ...formData, sold: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        required
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        id="is_featured"
                      />
                      <label htmlFor="is_featured" className="text-sm text-gray-700">Sản phẩm nổi bật</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Màu sắc (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        value={formData.colors}
                        onChange={e => setFormData({ ...formData, colors: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Đỏ,Xanh,Đen..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kích cỡ (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        value={formData.sizes}
                        onChange={e => setFormData({ ...formData, sizes: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="S,M,L,XL..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chất liệu</label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={e => setFormData({ ...formData, material: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="VD: Cotton, Polyester..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phong cách/Mùa</label>
                      <input
                        type="text"
                        value={formData.season}
                        onChange={e => setFormData({ ...formData, season: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="VD: Hè, Đông, Thể thao..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Xuất xứ</label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={e => setFormData({ ...formData, origin: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="VD: Việt Nam, Trung Quốc..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hướng dẫn vệ sinh</label>
                      <textarea
                        value={formData.washing_instruction}
                        onChange={e => setFormData({ ...formData, washing_instruction: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        rows={2}
                        placeholder="VD: Giặt máy, không tẩy, ủi ở nhiệt độ thấp..."
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, rotateY: 8 }}
                    whileTap={{ scale: 0.95, rotateY: -8 }}
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                  >
                    {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModalOpen && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}
              </h3>
              <p>Bạn có chắc chắn muốn xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'} <b>{itemToDelete.name}</b> không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {bulkEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-primary-700">Sửa hàng loạt sản phẩm</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá mới</label>
                  <input type="number" value={bulkEditData.price} onChange={e => setBulkEditData({ ...bulkEditData, price: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tồn kho mới</label>
                  <input type="number" value={bulkEditData.stock} onChange={e => setBulkEditData({ ...bulkEditData, stock: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                  <select value={bulkEditData.category_id} onChange={e => setBulkEditData({ ...bulkEditData, category_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                    <option value="">Không đổi</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Màu sắc (cách nhau bởi dấu phẩy)</label>
                  <input type="text" value={bulkEditData.colors} onChange={e => setBulkEditData({ ...bulkEditData, colors: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kích cỡ (cách nhau bởi dấu phẩy)</label>
                  <input type="text" value={bulkEditData.sizes} onChange={e => setBulkEditData({ ...bulkEditData, sizes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={bulkEditData.is_featured} onChange={e => setBulkEditData({ ...bulkEditData, is_featured: e.target.checked })} id="bulk_is_featured" />
                  <label htmlFor="bulk_is_featured" className="text-sm text-gray-700">Đánh dấu nổi bật</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chất liệu</label>
                  <input type="text" value={bulkEditData.material} onChange={e => setBulkEditData({ ...bulkEditData, material: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phong cách/Mùa</label>
                  <input type="text" value={bulkEditData.season} onChange={e => setBulkEditData({ ...bulkEditData, season: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Xuất xứ</label>
                  <input type="text" value={bulkEditData.origin} onChange={e => setBulkEditData({ ...bulkEditData, origin: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Không đổi nếu để trống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hướng dẫn vệ sinh</label>
                  <textarea value={bulkEditData.washing_instruction} onChange={e => setBulkEditData({ ...bulkEditData, washing_instruction: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" rows={2} placeholder="Không đổi nếu để trống" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setBulkEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleBulkEdit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">Cập nhật</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa sản phẩm
              </h3>
              <p>Bạn có chắc chắn muốn xóa <b>{selectedProducts.length}</b> sản phẩm đã chọn không? Hành động này <b>không thể hoàn tác</b>.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Categories Component
interface CategoriesProps { search: string }
const Categories = ({ search }: CategoriesProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'product' | 'category'} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Số danh mục mỗi trang (2 dòng x 3 cột)

  // Reset về trang 1 khi thay đổi danh sách danh mục
  useEffect(() => {
    setCurrentPage(1);
  }, [categories]);

  // Scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Lỗi khi tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        image: null,
      });
      setImagePreview(category.image_url || '');
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        image: null,
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: null,
    });
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `categories/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let imageUrl = editingCategory?.image_url || '';
      if (formData.image) {
        imageUrl = await uploadImage(formData.image);
      }
      const categoryData = {
        name: formData.name,
        description: formData.description,
        image_url: imageUrl,
      };
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Cập nhật danh mục thành công!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);
        if (error) throw error;
        toast.success('Thêm danh mục mới thành công!');
      }
      await fetchCategories();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Có lỗi xảy ra khi lưu danh mục');
    }
  };

  const handleDelete = (id: string, name: string, type: 'product' | 'category') => {
    setItemToDelete({ id, name, type });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase
        .from(itemToDelete.type === 'product' ? 'products' : 'categories')
        .delete()
        .eq('id', itemToDelete.id);
      if (error) throw error;
      if (itemToDelete.type === 'category') {
        await fetchCategories();
        toast.success('Xóa danh mục thành công!');
      }
    } catch (error) {
      toast.error(`Có lỗi xảy ra khi xóa ${itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}`);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Tính toán danh mục cho trang hiện tại
  const paginatedCategories = categories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Tính tổng số trang
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  // Lọc danh mục theo search (từ props)
  const filteredCategories = categories.filter(c => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const name = removeVietnameseTones(c.name);
    const desc = removeVietnameseTones(c.description || '');
    return name.includes(q) || desc.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="admin-categories-header flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý danh mục</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Thêm danh mục mới
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
              <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={40} />
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">{category.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(category)}
                  className="flex-1 bg-primary-100 text-primary-700 px-3 py-2 rounded hover:bg-primary-200"
                >
                  Chỉnh sửa
                </button>
                <button
                    onClick={() => handleDelete(category.id, category.name, 'category')}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
          </div>
          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                }}
              />
        </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
                  <div className="mt-1 flex items-center gap-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                    )}
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <ImageIcon size={20} />
                        Chọn ảnh
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên danh mục</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AnimatePresence>
        {deleteModalOpen && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'}
              </h3>
              <p>Bạn có chắc chắn muốn xóa {itemToDelete.type === 'product' ? 'sản phẩm' : 'danh mục'} <b>{itemToDelete.name}</b> không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Orders Component
const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const itemsPerPage = 10; // Số đơn hàng mỗi trang
  const [showRefundDetailModal, setShowRefundDetailModal] = useState(false);
  // State cho modal cập nhật trạng thái giao hàng
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusCurrent, setStatusCurrent] = useState<string>('');
  const [statusNext, setStatusNext] = useState<string>('');
  // State cho modal auto update
  const [showAutoStatusModal, setShowAutoStatusModal] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch orders first
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Then fetch users for those orders
      const userIds = [...new Set((orders || []).map(o => o.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map users to orders
      const ordersWithUsers = orders?.map(order => ({
        ...order,
        user: users?.find(u => u.id === order.user_id)
      }));

      setOrders(ordersWithUsers || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      // 1. Lấy thông tin đơn hàng
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      // 2. Cập nhật số lượng sản phẩm và lượt bán
      for (const item of order.items) {
        // Lấy thông tin sản phẩm hiện tại
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock, sold')
          .eq('id', item.product_id)
          .single();

        if (productError) throw productError;

        // Kiểm tra số lượng tồn kho
        if (product.stock < item.quantity) {
          throw new Error(`Sản phẩm ${item.name} không đủ số lượng trong kho`);
        }

        // Cập nhật số lượng mới
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock: product.stock - item.quantity,
            sold: (product.sold || 0) + item.quantity
          })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }

      // 3. Cập nhật trạng thái đơn hàng
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (statusError) throw statusError;

      toast.success('Đã duyệt đơn hàng!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error approving order:', error);
      toast.error(error.message || 'Lỗi khi duyệt đơn hàng');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id + '-cancel');
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);
    setActionLoading(null);
    if (!error) {
      toast.success('Đã hủy đơn hàng!');
      fetchOrders();
    } else {
      toast.error('Lỗi khi hủy đơn hàng');
    }
  };

  const handleRefund = async (id: string) => {
    setActionLoading(id + '-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          refund: true,
          refund_amount: refundAmount,
          refund_date: new Date().toISOString(),
          refund_reason: refundReason
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã hoàn tiền thành công!');
      setShowRefundModal(false);
      setRefundAmount(0);
      setRefundReason('');
      fetchOrders();
    } catch (error) {
      console.error('Error refunding order:', error);
      toast.error('Lỗi khi hoàn tiền đơn hàng');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveRefund = async (id: string) => {
    setActionLoading(id + '-approve-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          refund_status: 'approved',
          refund_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã duyệt yêu cầu hoàn tiền!');
      fetchOrders();
    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error('Lỗi khi duyệt yêu cầu hoàn tiền');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRefund = async (id: string) => {
    setActionLoading(id + '-reject-refund');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          refund_status: 'rejected',
          refund_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Đã từ chối yêu cầu hoàn tiền!');
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error('Lỗi khi từ chối yêu cầu hoàn tiền');
    } finally {
      setActionLoading(null);
    }
  };

  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // Trong component Orders, thêm hàm autoApproveOrders:
  const autoApproveOrders = async () => {
    let countApproved = 0;
    let countSkipped = 0;
    for (const order of orders.filter(o => o.status === 'pending')) {
      let canApprove = true;
      for (const item of order.items) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
        if (productError || !product || product.stock < item.quantity) {
          toast.error(`Đơn ${order.id}: Sản phẩm "${item.name}" không đủ số lượng trong kho!`);
          canApprove = false;
          break;
        }
      }
      if (canApprove) {
        await handleApprove(order.id);
        countApproved++;
      } else {
        countSkipped++;
      }
    }
    if (countApproved > 0) toast.success(`Đã tự động duyệt ${countApproved} đơn hàng đủ tồn kho!`);
    if (countSkipped > 0) toast.error(`${countSkipped} đơn hàng bị bỏ qua do thiếu hàng.`);
  };

  // Thêm hàm cập nhật trạng thái giao hàng
  const handleUpdateDeliveryStatus = async (id: string, newStatus: string) => {
    setActionLoading(id + '-update-delivery');
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success('Cập nhật trạng thái thành công!');
      fetchOrders();
      setSelectedOrder(prev =>
        prev && prev.id === id
          ? { ...prev, delivery_status: newStatus as Order["delivery_status"] }
          : prev
      );
    } catch (err) {
      toast.error('Có lỗi khi cập nhật trạng thái!');
    } finally {
      setActionLoading(null);
    }
  };

  // Hàm tự động cập nhật trạng thái giao hàng cho tất cả đơn đã duyệt
  const autoUpdateDeliveryStatus = async () => {
    let countUpdated = 0;
    let countSkipped = 0;
    
    // Cập nhật trạng thái giao hàng cho các đơn bị hủy
    for (const order of orders.filter(o => o.status === 'cancelled' && o.delivery_status !== 'cancelled')) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ delivery_status: 'cancelled' })
          .eq('id', order.id);
        if (error) throw error;
        countUpdated++;
      } catch (err) {
        countSkipped++;
      }
    }

    // Cập nhật trạng thái giao hàng cho các đơn đã duyệt
    for (const order of orders.filter(o => o.status === 'confirmed' && ['pending','processing','shipping'].includes(o.delivery_status))) {
      let nextStatus = '';
      if (order.delivery_status === 'pending') nextStatus = 'processing';
      else if (order.delivery_status === 'processing') nextStatus = 'shipping';
      else if (order.delivery_status === 'shipping') nextStatus = 'delivered';
      else continue;
      try {
        const { error } = await supabase
          .from('orders')
          .update({ delivery_status: nextStatus })
          .eq('id', order.id);
        if (error) throw error;
        countUpdated++;
      } catch (err) {
        countSkipped++;
      }
    }
    if (countUpdated > 0) toast.success(`Đã cập nhật trạng thái cho ${countUpdated} đơn hàng!`);
    if (countSkipped > 0) toast.error(`${countSkipped} đơn hàng bị bỏ qua do lỗi!`);
    fetchOrders();
  };

  // Hàm mở modal cập nhật trạng thái
  const handleOpenStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  };

  // Hàm cập nhật trạng thái hàng loạt
  const handleBulkUpdateDeliveryStatus = async (newStatus: string) => {
    for (const id of selectedOrderIds) {
      await supabase.from('orders').update({ delivery_status: newStatus }).eq('id', id);
    }
    setShowAutoStatusModal(false);
    setSelectedOrderIds([]);
    fetchOrders();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý đơn hàng</h2>
        <div className="flex gap-2">
          <button
            onClick={autoApproveOrders}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold shadow"
          >
            Duyệt tự động
          </button>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
            onClick={() => setShowAutoStatusModal(true)}
          >
            Tự động cập nhật trạng thái
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
        {loading ? (
          <div className="text-center text-gray-500">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500">Không có đơn hàng nào.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2">Mã đơn</th>
                <th className="py-2">Khách hàng</th>
                <th className="py-2">Ngày đặt</th>
                <th className="py-2">Tổng tiền</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2">Yêu cầu hoàn tiền</th>
                <th className="py-2">Sản phẩm</th>
                <th className="py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map(order => (
                <tr key={order.id} className="border-t text-sm">
                  <td className="py-2 font-mono text-primary-700 cursor-pointer underline hover:text-primary-600" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>{order.id}</td>
                  <td className="py-2">{order.user?.full_name || order.user_id}<br /><span className="text-xs text-gray-400">{order.user?.email}</span></td>
                  <td className="py-2">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                  <td className="py-2 font-semibold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${order.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                      ${order.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                    `}>{translateOrderStatus(order.status)}</span>
                  </td>
                  <td className="py-2">
                    {order.refund_request && (
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-semibold"
                        onClick={() => { setSelectedOrder(order); setShowRefundDetailModal(true); }}
                      >
                        Xem chi tiết
                      </button>
                    )}
                  </td>
                  <td className="py-2">
                    <ul className="list-disc pl-4">
                      {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.name} x {item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2">
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={actionLoading === order.id + '-approve'}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-approve' ? 'Đang duyệt...' : 'Duyệt'}</button>
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={actionLoading === order.id + '-cancel'}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-cancel' ? 'Đang hủy...' : 'Hủy'}</button>
                      </div>
                    )}
                    {/* Nút cập nhật trạng thái giao hàng */}
                    {order.status === 'confirmed' && (['pending','processing','shipping'].includes(order.delivery_status)) && (
                      <button
                        onClick={() => {
                          handleOpenStatusModal(order);
                          setStatusOrderId(order.id);
                          setStatusCurrent(order.delivery_status);
                          setStatusNext(
                            order.delivery_status === 'pending' ? 'processing' :
                            order.delivery_status === 'processing' ? 'shipping' :
                            order.delivery_status === 'shipping' ? 'delivered' : ''
                          );
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-semibold mt-1"
                      >
                        Cập nhật trạng thái
                      </button>
                    )}
                    {order.refund_request && order.refund_status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveRefund(order.id)}
                          disabled={actionLoading === order.id + '-approve-refund'}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-approve-refund' ? 'Đang duyệt...' : 'Duyệt hoàn tiền'}</button>
                        <button
                          onClick={() => handleRejectRefund(order.id)}
                          disabled={actionLoading === order.id + '-reject-refund'}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold disabled:opacity-60"
                        >{actionLoading === order.id + '-reject-refund' ? 'Đang từ chối...' : 'Từ chối'}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {/* Modal chi tiết đơn hàng */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative animate-fadeIn">
            <button onClick={() => setShowOrderModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-xl">×</button>
            <h3 className="text-2xl font-bold mb-2 text-primary-700">Chi tiết đơn hàng</h3>
            <div className="mb-4 text-sm text-gray-500">Mã đơn: <span className="font-mono text-primary-700">{selectedOrder.id}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="mb-2"><b>Khách hàng:</b> {selectedOrder.user?.full_name || selectedOrder.user_id}</div>
                <div className="mb-2"><b>Email:</b> {selectedOrder.user?.email}</div>
                <div className="mb-2"><b>Ngày đặt:</b> {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                <div className="mb-2"><b>Trạng thái duyệt:</b> <span className="font-semibold">{translateOrderStatus(selectedOrder.status)}</span></div>
                <div className="mb-2"><b>Trạng thái giao hàng:</b> <span className="font-semibold">{translateDeliveryStatus(selectedOrder.delivery_status || "")}</span></div>
                <div className="mb-2"><b>Tổng tiền:</b> <span className="text-primary-600 font-bold">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                {selectedOrder.address && (
                  <div className="mb-2"><b>Địa chỉ giao hàng:</b> {selectedOrder.address}</div>
                )}
                {selectedOrder.note && (
                  <div className="mb-2"><b>Ghi chú:</b> {selectedOrder.note}</div>
                )}
              </div>
              <div>
                <b>Danh sách sản phẩm:</b>
                <ul className="mt-2 space-y-2">
                  {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg border" />}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">x{item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)</div>
                        {item.color && <div className="text-xs">Màu: {item.color}</div>}
                        {item.size && <div className="text-xs">Size: {item.size}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {selectedOrder.status === 'pending' && (
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => { handleApprove(selectedOrder.id); setShowOrderModal(false); }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                >Duyệt đơn</button>
                <button
                  onClick={() => { handleCancel(selectedOrder.id); setShowOrderModal(false); }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                >Hủy đơn</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal hoàn tiền */}
      <AnimatePresence>
        {showRefundModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4 text-primary-700">Hoàn tiền đơn hàng</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền hoàn trả</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max={selectedOrder.total_amount}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hoàn tiền</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Nhập lý do hoàn tiền..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount(0);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleRefund(selectedOrder.id)}
                  disabled={actionLoading === selectedOrder.id + '-refund'}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 disabled:opacity-60"
                >
                  {actionLoading === selectedOrder.id + '-refund' ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal chi tiết hoàn tiền */}
      <AnimatePresence>
        {showRefundDetailModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative"
            >
              <button onClick={() => setShowRefundDetailModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-xl">×</button>
              <h3 className="text-xl font-bold mb-4 text-primary-700">Chi tiết hoàn tiền</h3>
              <div className="space-y-4">
                {selectedOrder.refund_image_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh minh chứng hoàn tiền</label>
                    <img src={selectedOrder.refund_image_url} alt="Ảnh hoàn tiền" className="max-w-full rounded border" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hoàn tiền</label>
                  <div className="bg-gray-100 rounded p-2 text-gray-700 min-h-[40px]">{selectedOrder.refund_reason || 'Không có'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                    ${selectedOrder.refund_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${selectedOrder.refund_status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                    ${selectedOrder.refund_status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {selectedOrder.refund_status === 'pending' ? 'Chờ duyệt' :
                      selectedOrder.refund_status === 'approved' ? 'Đã duyệt' :
                      selectedOrder.refund_status === 'rejected' ? 'Đã từ chối' : 'Không xác định'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal cập nhật trạng thái đơn hàng */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-primary-700">Cập nhật trạng thái đơn hàng</h3>
            <div className="mb-4">
              <div><b>Trạng thái duyệt:</b> <span className="font-semibold">{translateOrderStatus(selectedOrder.status)}</span></div>
              <div><b>Trạng thái giao hàng:</b> <span className="font-semibold">{translateDeliveryStatus(selectedOrder.delivery_status || "")}</span></div>
            </div>
            <div className="flex flex-col gap-4">
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-60"
                onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "processing")}
                disabled={selectedOrder.delivery_status !== 'pending'}
              >
                Đang đóng gói (processing)
              </button>
              <button
                className="px-4 py-2 rounded bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "shipping")}
                disabled={selectedOrder.delivery_status !== 'processing'}
              >
                Đang giao (shipping)
              </button>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-60"
                onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "delivered")}
                disabled={selectedOrder.delivery_status !== 'shipping'}
              >
                Đã giao (delivered)
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-60"
                onClick={() => handleUpdateDeliveryStatus(selectedOrder.id, "cancelled")}
                disabled={selectedOrder.delivery_status === 'delivered' || selectedOrder.delivery_status === 'cancelled'}
              >
                Bị hủy (cancelled)
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                onClick={() => setShowStatusModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal chọn trạng thái cho auto update */}
      {showAutoStatusModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4 text-primary-700">Chọn đơn hàng và trạng thái để cập nhật</h3>
            <div className="mb-4">
              <div className="font-semibold mb-2">Các đơn hàng chờ cập nhật:</div>
              <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
                {orders.filter(o => ['pending', 'processing', 'shipping'].includes(o.delivery_status || '')).length === 0 ? (
                  <div className="text-gray-500">Không có đơn hàng nào chờ cập nhật.</div>
                ) : (
                  orders.filter(o => ['pending', 'processing', 'shipping'].includes(o.delivery_status || '')).map(order => (
                    <label key={order.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedOrderIds(ids => [...ids, order.id]);
                          else setSelectedOrderIds(ids => ids.filter(id => id !== order.id));
                        }}
                      />
                      <span className="font-medium">#{order.id}</span>
                      <span className="text-gray-500 text-sm">({order.delivery_status})</span>
                      <span className="text-gray-500 text-sm ml-2">{order.user?.full_name || order.user_id}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600"
                onClick={() => handleBulkUpdateDeliveryStatus('processing')}
                disabled={selectedOrderIds.length === 0}
              >
                Đang xử lý (processing)
              </button>
              <button
                className="px-4 py-2 rounded bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
                onClick={() => handleBulkUpdateDeliveryStatus('shipping')}
                disabled={selectedOrderIds.length === 0}
              >
                Đang giao (shipping)
              </button>
              <button
                className="px-4 py-2 rounded bg-green-500 text-white font-semibold hover:bg-green-600"
                onClick={() => handleBulkUpdateDeliveryStatus('delivered')}
                disabled={selectedOrderIds.length === 0}
              >
                Đã giao (delivered)
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600"
                onClick={() => handleBulkUpdateDeliveryStatus('cancelled')}
                disabled={selectedOrderIds.length === 0}
              >
                Hủy đơn (cancelled)
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                onClick={() => { setShowAutoStatusModal(false); setSelectedOrderIds([]); }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Customers Component
const Customers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const roleOptions = [
    { value: 'user', label: 'Người dùng' },
    { value: 'admin', label: 'Quản trị viên' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const handleOpenUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
    setDeleteLoading(false);
    if (!error) {
      toast.success('Đã xóa user!');
      setShowUserModal(false);
      setShowDeleteUserModal(false);
      fetchUsers();
    } else {
      toast.error('Lỗi khi xóa user');
    }
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    setRoleLoading(true);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id);
    setRoleLoading(false);
    if (!error) {
      toast.success('Cập nhật quyền thành công!');
      setSelectedUser((prev: any) => ({ ...prev, role: newRole }));
      fetchUsers();
    } else {
      toast.error('Lỗi khi cập nhật quyền');
    }
  };

  // Lọc user theo search
  const filteredUsers = users.filter(u => {
    const q = removeVietnameseTones(search.trim().toLowerCase());
    const name = removeVietnameseTones(u.full_name || '');
    const email = removeVietnameseTones(u.email || '');
    return name.includes(q) || email.includes(q) || (u.id || '').includes(q);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Quản lý khách hàng</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm tên, email, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không tìm thấy user nào.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2">Avatar</th>
                <th className="py-2">Tên</th>
                <th className="py-2">Email</th>
                <th className="py-2">Ngày tạo</th>
                <th className="py-2">Quyền</th>
                <th className="py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenUser(user)}>
                  <td className="py-2">
                    <img src={user.avatar_url || '/avatar-default.png'} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border" />
                  </td>
                  <td className="py-2 font-medium">{user.full_name}</td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                      {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs">{user.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal chi tiết user */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative animate-fadeIn">
            <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-xl">×</button>
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src={selectedUser.avatar_url || '/avatar-default.png'} alt={selectedUser.full_name} className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 shadow" />
              <div className="text-xl font-bold text-primary-700">{selectedUser.full_name}</div>
              <div className="text-gray-500">{selectedUser.email}</div>
              <div className="text-xs text-gray-400">ID: {selectedUser.id}</div>
              <div className="text-sm text-gray-500">Ngày tạo: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('vi-VN') : ''}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium">Quyền:</span>
                <select
                  value={selectedUser.role || 'user'}
                  onChange={e => handleChangeRole(selectedUser.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={roleLoading}
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {roleLoading && <span className="text-xs text-gray-400 ml-2">Đang lưu...</span>}
              </div>
            </div>
            {/* Thông tin khác nếu có */}
            {selectedUser.phone && <div className="mb-2"><b>Điện thoại:</b> {selectedUser.phone}</div>}
            {selectedUser.address && <div className="mb-2"><b>Địa chỉ:</b> {selectedUser.address}</div>}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setUserToDelete(selectedUser); setShowDeleteUserModal(true); }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa user'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showDeleteUserModal && userToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa user
              </h3>
              <p>Bạn có chắc chắn muốn xóa user <b>{userToDelete.full_name}</b> không? Hành động này <b>không thể hoàn tác</b>.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Đang xóa...' : 'Xóa'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Component
const Settings = () => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Cài đặt</h2>
    <div className="bg-white rounded-xl shadow-lg p-6">
      <p className="text-gray-600">Chức năng đang được phát triển...</p>
    </div>
  </div>
);

// Định nghĩa type cho voucher
interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  quantity: number;
  used: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  min_order_value?: number;
  applies_to: 'all' | 'specific_categories' | 'specific_products';
  applied_items: string[];
}

// Hàm ép định dạng ngày về YYYY-MM-DD
function toYYYYMMDD(dateStr: string) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return dateStr;
    // MM/DD/YYYY
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return '';
}

interface VoucherManagerProps { search: string }
function VoucherManager({ search }: VoucherManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{
    code: string;
    title: string;
    description: string;
    discount_type: string;
    discount_value: string;
    quantity: string;
    valid_from: string;
    valid_to: string;
    is_active: boolean;
    min_order_value: string;
    applies_to: string;
    applied_items: string[];
  }>({
    code: '',
    title: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    quantity: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
    min_order_value: '',
    applies_to: 'all',
    applied_items: [],
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);

  // Lấy danh sách danh mục
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Lấy danh sách sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('id, name');
      setProducts(data || []);
    };
    fetchProducts();
  }, []);

  // Lấy danh sách voucher từ Supabase
  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      // Tự động chuyển trạng thái sang ngừng nếu hết hạn
      const now = new Date();
      for (const v of data) {
        if (v.valid_to && new Date(v.valid_to) < now && v.is_active) {
          await supabase.from('vouchers').update({ is_active: false }).eq('id', v.id);
        }
      }
      setVouchers(data.map(v => {
        if (v.valid_to && new Date(v.valid_to) < now) {
          return { ...v, is_active: false };
        }
        return v;
      }) || []);
    }
    setLoading(false);
  };

  // Xử lý mở modal thêm/sửa
  const openAddModal = () => {
    setEditVoucher(null);
    setForm({
      code: '',
      title: '',
      description: '',
      discount_type: 'percent',
      discount_value: '',
      quantity: '',
      valid_from: '',
      valid_to: '',
      is_active: true,
      min_order_value: '',
      applies_to: 'all',
      applied_items: [],
    });
    setShowModal(true);
  };
  const openEditModal = (v: Voucher) => {
    setEditVoucher(v);
    setForm({
      code: v.code,
      title: v.title || '',
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value.toString(),
      quantity: v.quantity.toString(),
      valid_from: v.valid_from ? v.valid_from.slice(0, 10) : '',
      valid_to: v.valid_to ? v.valid_to.slice(0, 10) : '',
      is_active: v.is_active,
      min_order_value: v.min_order_value?.toString() || '',
      applies_to: v.applies_to || 'all',
      applied_items: v.applied_items || [],
    });
    setShowModal(true);
  };

  // Kiểm tra ngày hợp lệ
  const isValidDate = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  // Thêm/sửa voucher
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.title || !form.discount_value || !form.quantity) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }
    if ((form.valid_from && !isValidDate(form.valid_from)) || (form.valid_to && !isValidDate(form.valid_to))) {
      toast.error('Ngày không hợp lệ. Vui lòng chọn ngày từ lịch!');
      return;
    }
    const voucherData = {
      code: form.code,
      title: form.title,
      description: form.description,
      discount_type: form.discount_type as 'percent' | 'fixed',
      discount_value: Number(form.discount_value),
      quantity: Number(form.quantity),
      valid_from: form.valid_from ? toYYYYMMDD(form.valid_from) : null,
      valid_to: form.valid_to ? toYYYYMMDD(form.valid_to) : null,
      is_active: form.is_active,
      min_order_value: Number(form.min_order_value),
      applies_to: form.applies_to,
      applied_items: form.applies_to === 'specific_categories' || form.applies_to === 'specific_products' ? form.applied_items : [],
    };
    try {
      if (editVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update(voucherData)
          .eq('id', editVoucher.id);
        if (error) throw error;
        toast.success('Cập nhật voucher thành công!');
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert([voucherData]);
        if (error) throw error;
        toast.success('Thêm voucher mới thành công!');
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu voucher');
    }
  };

  // Xóa voucher
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', id);
    if (!error) {
      toast.success('Đã xóa voucher!');
      fetchVouchers();
    } else {
      toast.error('Lỗi khi xóa voucher');
    }
  };

  // Hiển thị thời gian giới hạn
  const renderTimeLimit = (v: Voucher) => {
    if (!v.valid_from && !v.valid_to) return 'Không giới hạn';
    const from = v.valid_from ? format(new Date(v.valid_from), 'dd/MM/yyyy') : '...';
    const to = v.valid_to ? format(new Date(v.valid_to), 'dd/MM/yyyy') : '...';
    return `${from} - ${to}`;
  };

  // Lọc voucher theo search (từ props)
  const filteredVouchers = vouchers.filter(v => {
    const q = removeVietnameseTones((search || '').trim().toLowerCase());
    const code = removeVietnameseTones(v.code);
    const title = removeVietnameseTones(v.title || '');
    const desc = removeVietnameseTones(v.description || '');
    return (
      code.includes(q) ||
      title.includes(q) ||
      desc.includes(q) ||
      (v.discount_value + '').includes(q) ||
      (v.quantity + '').includes(q) ||
      (v.is_active ? 'dang hoat dong' : 'ngung').includes(q)
    );
  });

  // Khi bấm Xóa
  const handleDeleteClick = (v: Voucher) => {
    setVoucherToDelete(v);
    setDeleteModalOpen(true);
  };

  // Khi xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!voucherToDelete) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', voucherToDelete.id);
    if (!error) {
      toast.success('Đã xóa voucher!');
      fetchVouchers();
    } else {
      toast.error('Lỗi khi xóa voucher');
    }
    setDeleteModalOpen(false);
    setVoucherToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Quản lý voucher</h2>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold"
          >
            Thêm voucher mới
          </motion.button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá trị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian giới hạn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn tối thiểu</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6">Đang tải...</td></tr>
            ) : filteredVouchers.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-6">Không tìm thấy voucher nào.</td></tr>
            ) : filteredVouchers.map(v => (
              <tr key={v.id}>
                <td className="px-4 py-2 font-bold text-primary-700">{v.code}</td>
                <td className="px-4 py-2">{v.description}</td>
                <td className="px-4 py-2">{v.discount_type === 'percent' ? 'Phần trăm' : 'Cố định'}</td>
                <td className="px-4 py-2">{v.discount_type === 'percent' ? `${v.discount_value}%` : `${v.discount_value.toLocaleString('vi-VN')}đ`}</td>
                <td className="px-4 py-2">{v.quantity}</td>
                <td className="px-4 py-2">{v.used}</td>
                <td className="px-4 py-2">{renderTimeLimit(v)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{v.is_active ? 'Đang hoạt động' : 'Ngừng'}</span>
                </td>
                <td className="px-4 py-2">{v.min_order_value?.toLocaleString('vi-VN')}đ</td>
                <td className="px-4 py-2 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openEditModal(v)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs"
                  >Sửa</motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteClick(v)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs"
                  >Xóa</motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">{editVoucher ? 'Sửa voucher' : 'Thêm voucher mới'}</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã voucher</label>
                  <div className="flex gap-2">
                    <input className="w-full border rounded-lg px-3 py-2" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
                    <button
                      type="button"
                      className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-xs font-semibold"
                      onClick={() => {
                        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
                        setForm(f => ({ ...f, code: random }));
                      }}
                    >
                      Tạo mã ngẫu nhiên
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tiêu đề</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mô tả</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Loại giảm</label>
                    <select className="w-full border rounded-lg px-3 py-2" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                      <option value="percent">Phần trăm</option>
                      <option value="fixed">Cố định</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Giá trị</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Số lượng</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Đã dùng</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={editVoucher?.used || 0} disabled />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày hết hạn</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn hàng tối thiểu</label>
                  <input
                    type="number"
                    value={form.min_order_value}
                    onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    placeholder="Nhập giá trị tối thiểu của đơn hàng"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Loại áp dụng</label>
                    <select className="w-full border rounded-lg px-3 py-2" value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value, applied_items: [] }))}>
                      <option value="all">Tất cả sản phẩm</option>
                      <option value="specific_categories">Danh mục cụ thể</option>
                      <option value="specific_products">Sản phẩm cụ thể</option>
                    </select>
                  </div>
                  {form.applies_to === 'specific_categories' && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Chọn danh mục</label>
                      <select
                        multiple
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.applied_items}
                        onChange={e => setForm(f => ({ ...f, applied_items: Array.from(e.target.selectedOptions, option => option.value) }))}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.applies_to === 'specific_products' && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Chọn sản phẩm</label>
                      <select
                        multiple
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.applied_items}
                        onChange={e => setForm(f => ({ ...f, applied_items: Array.from(e.target.selectedOptions, option => option.value) }))}
                      >
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >Hủy</motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                  >Lưu</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModalOpen && voucherToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                <span>⚠️</span> Xác nhận xóa voucher
              </h3>
              <p>Bạn có chắc chắn muốn xóa voucher <b>{voucherToDelete.title}</b> ({voucherToDelete.code}) không? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setDeleteModalOpen(false); setVoucherToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Xóa
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BannerManager() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    page: 'product',
    position: 1,
    is_active: true
  });
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Khi mở modal sửa, set preview ảnh cũ nếu có
  useEffect(() => {
    if (isModalOpen) {
      setImagePreview(formData.image_url || '');
    }
  }, [isModalOpen, formData.image_url]);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from('banners')
      .select('*', { count: 'exact' })
      .order('position', { ascending: true })
      .range((currentPage - 1) * 10, currentPage * 10 - 1);
    if (error) {
      console.error('Error fetching banners:', error);
    } else {
      setBanners(data || []);
      setTotalPages(Math.ceil((count || 0) / 10));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, [currentPage]);

  const handleOpenModal = (banner: any = null) => {
    if (banner) {
      setSelectedBanner(banner);
      setFormData({
        title: banner.title || '',
        description: banner.description || '',
        image_url: banner.image_url || '',
        page: banner.page || 'product',
        position: banner.position || 1,
        is_active: banner.is_active
      });
      setImagePreview(banner.image_url || '');
    } else {
      setSelectedBanner(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        page: 'product',
        position: 1,
        is_active: true
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBanner(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      page: 'product',
      position: 1,
      is_active: true
    });
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      uploadImage(file).then(url => {
        setFormData(prev => ({ ...prev, image_url: url }));
      });
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview('');
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `banners/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBanner) {
      const { error } = await supabase
        .from('banners')
        .update({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          page: formData.page,
          position: formData.position,
          is_active: formData.is_active
        })
        .eq('id', selectedBanner.id);
      if (error) {
        console.error('Error updating banner:', error);
      } else {
        fetchBanners();
        handleCloseModal();
      }
    } else {
      const { error } = await supabase
        .from('banners')
        .insert({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          page: formData.page,
          position: formData.position,
          is_active: formData.is_active
        });
      if (error) {
        console.error('Error inserting banner:', error);
      } else {
        fetchBanners();
        handleCloseModal();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting banner:', error);
    } else {
      fetchBanners();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBanners.length === 0) return;
    const { error } = await supabase
      .from('banners')
      .delete()
      .in('id', selectedBanners);
    if (error) {
      console.error('Error bulk deleting banners:', error);
    } else {
      setSelectedBanners([]);
      fetchBanners();
    }
    setShowDeleteModal(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !isActive })
      .eq('id', id);
    if (error) {
      console.error('Error toggling banner status:', error);
    } else {
      fetchBanners();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý Banner</h2>
        <div className="flex gap-2 items-center">
          {selectedBanners.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600"
            >
              Xóa hàng loạt
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Thêm Banner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedBanners.length === banners.length && banners.length > 0}
                      onChange={e => setSelectedBanners(e.target.checked ? banners.map(b => b.id) : [])}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ảnh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vị trí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedBanners.includes(banner.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedBanners(prev => [...prev, banner.id]);
                          } else {
                            setSelectedBanners(prev => prev.filter(id => id !== banner.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-16 w-24 object-cover rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{banner.title}</div>
                      <div className="text-sm text-gray-500">{banner.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {banner.page === 'product' ? 'Trang sản phẩm' : banner.page}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{banner.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          banner.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {banner.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(banner)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="flex justify-center mt-6">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <span className="sr-only">Trang trước</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <span className="sr-only">Trang sau</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Modal thêm/sửa banner */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {selectedBanner ? 'Sửa Banner' : 'Thêm Banner'}
              </h3>
              <form onSubmit={handleSubmit}>
                {/* Ảnh lên đầu */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Ảnh</label>
                  <div className="flex items-center gap-4 mt-1">
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
                          title="Xóa ảnh"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <label className="cursor-pointer bg-primary-100 hover:bg-primary-200 px-4 py-2 rounded-lg text-sm font-medium text-primary-700 border border-primary-200">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      Chọn ảnh
                    </label>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Trang</label>
                  <select
                    value={formData.page}
                    onChange={(e) => setFormData(prev => ({ ...prev, page: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="product">Trang sản phẩm</option>
                    <option value="flashsale">Trang Flash Sale</option>
                    <option value="home">Trang chủ</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Vị trí</label>
                  <input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Đang hiển thị</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    {selectedBanner ? 'Cập nhật' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal xác nhận xóa hàng loạt */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4">
            <div className="text-lg font-semibold">
              Bạn có chắc chắn muốn xóa <b>{selectedBanners.length}</b> banner đã chọn không? Hành động này <b>không thể hoàn tác</b>.
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  category_id?: string;
  product_ids: string[];
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

function EventManager() {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    category_id: string;
    discount_type: 'percent' | 'fixed';
    discount_value: string;
    is_active: boolean;
  }>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    category_id: '',
    discount_type: 'percent',
    discount_value: '',
    is_active: true
  });

  useEffect(() => {
    fetchEvents();
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Lỗi khi tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, category_id, description, price, image_url, is_featured, stock, created_at, colors, sizes, discount_price, material, season, origin, washing_instruction, sold');
    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventData = {
        ...form,
        discount_value: Number(form.discount_value),
        product_ids: selectedProducts
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) throw error;
      
      toast.success('Tạo sự kiện thành công!');
      setShowModal(false);
      fetchEvents();
      resetForm();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Có lỗi xảy ra khi tạo sự kiện');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      category_id: '',
      discount_type: 'percent',
      discount_value: '',
      is_active: true
    });
    setSelectedProducts([]);
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quản lý sự kiện</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Tạo sự kiện mới
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl max-h-[80vh] overflow-y-scroll">
            <h3 className="text-xl font-bold mb-6">Tạo sự kiện mới</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên sự kiện</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Loại giảm giá</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giá trị giảm giá</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                    min="0"
                    max={form.discount_type === 'percent' ? "100" : undefined}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn sản phẩm</label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedProducts(prev => [...prev, product.id]);
                            else setSelectedProducts(prev => prev.filter(id => id !== product.id));
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{product.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  id="is_active"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Kích hoạt sự kiện
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Tạo sự kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên sự kiện
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Giảm giá
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{event.name}</div>
                  <div className="text-sm text-gray-500">{event.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(event.start_date).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.end_date).toLocaleDateString('vi-VN')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {event.discount_type === 'percent' ? `${event.discount_value}%` : `${event.discount_value.toLocaleString('vi-VN')}đ`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    event.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {event.is_active ? 'Đang diễn ra' : 'Đã kết thúc'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {/* TODO: Implement edit */}}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {/* TODO: Implement delete */}}
                    className="text-red-600 hover:text-red-900"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Thêm component quản lý Flash Sale trực tiếp trong file
interface FlashSaleProduct {
  id: string;
  name: string;
  image_url: string;
  price: number;
  category_id?: string;
  stock?: number;
  sold?: number;
}

interface FlashSale {
  id: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  products: Product[];
  rules: {
    discount_type: 'percent' | 'fixed';
    discount_value: number;
  }[];
}

// Thêm interface cho rule trước FlashSaleManager
interface FlashSaleRule {
  category: string;
  stockOp: string;
  stockValue: string;
  priceOp: string;
  priceValue: string;
  soldOp: string;
  soldValue: string;
  discountType: string;
  discountValue: string;
}

const FlashSaleManager: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    start_time: '',
    end_time: '',
    is_active: true,
    discount_type: 'percent', // Thêm trường loại giảm giá
    discount_value: '', // Thêm trường giá trị giảm giá
  });
  const [activeTab, setActiveTab] = useState<'manual' | 'rule'>('manual');
  // State cho tab quy tắc
  const [rule, setRule] = useState({
    category: '',
    stockOp: '>',
    stockValue: '',
    priceOp: '>',
    priceValue: '',
    soldOp: '>',
    soldValue: '',
  });
  const [filteredProducts, setFilteredProducts] = useState<FlashSaleProduct[]>([]);
  const [selectedRuleProducts, setSelectedRuleProducts] = useState<string[]>([]);
  // Thêm state rules là mảng các quy tắc lọc
  const [rules, setRules] = useState<FlashSaleRule[]>([]);
  // 1. State cho rule đang nhập
  const [newRule, setNewRule] = useState<FlashSaleRule>({ category: '', stockOp: '>', stockValue: '', priceOp: '>', priceValue: '', soldOp: '>', soldValue: '', discountType: 'percent', discountValue: '' });
  const [editingFlashSaleId, setEditingFlashSaleId] = useState<string | null>(null);

  useEffect(() => {
    fetchFlashSales();
    fetchProducts();
  }, []);

  const fetchFlashSales = async () => {
    const { data: sales } = await supabase.from('flashsale').select('*');
    const { data: saleProducts } = await supabase.from('flashsale_products').select('*');
    const { data: allProducts } = await supabase.from('products').select('id, name, image_url, price, stock, sold, category_id');
    const { data: allRules } = await supabase.from('flashsale_rules').select('*');
    if (!sales || !saleProducts || !allProducts) return;
    const result = sales.map((sale: any) => ({
      ...sale,
      products: saleProducts
        .filter((sp: any) => sp.flashsale_id === sale.id)
        .map((sp: any) => allProducts.find((p: any) => p.id === sp.product_id))
        .filter(Boolean),
      rules: allRules ? allRules.filter((r: any) => r.flashsale_id === sale.id) : [],
    }));
    setFlashSales(result);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, image_url, price, stock, sold, category_id');
    setProducts((data || []) as FlashSaleProduct[]);
  };

  // Lọc sản phẩm theo quy tắc
  const handleFilterRule = () => {
    let filtered = [...products];
    if (rule.category) filtered = filtered.filter(p => p.category_id === rule.category);
    if (rule.stockValue) filtered = filtered.filter(p => eval(`${p.stock || 0} ${rule.stockOp} ${rule.stockValue}`));
    if (rule.priceValue) filtered = filtered.filter(p => eval(`${p.price || 0} ${rule.priceOp} ${rule.priceValue}`));
    if (rule.soldValue) filtered = filtered.filter(p => eval(`${p.sold || 0} ${rule.soldOp} ${rule.soldValue}`));
    setFilteredProducts(filtered);
    setSelectedRuleProducts(filtered.map(p => p.id));
  };

  // Submit cho tab quy tắc
  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_time || !form.end_time || selectedRuleProducts.length === 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    let flashsaleId = editingFlashSaleId;
    if (editingFlashSaleId) {
      // Update flashsale
      await supabase.from('flashsale').update({
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        is_active: form.is_active,
      }).eq('id', editingFlashSaleId);
      // Xóa hết flashsale_products và flashsale_rules cũ, thêm lại mới
      await supabase.from('flashsale_products').delete().eq('flashsale_id', editingFlashSaleId);
      await supabase.from('flashsale_rules').delete().eq('flashsale_id', editingFlashSaleId);
    } else {
      // Thêm mới
      const { data: sale, error } = await supabase
        .from('flashsale')
        .insert([{
          name: form.name,
          start_time: form.start_time,
          end_time: form.end_time,
          is_active: form.is_active,
        }])
        .select()
        .single();
      if (error) {
        toast.error('Lỗi khi tạo flash sale');
        return;
      }
      flashsaleId = sale.id;
    }
    // Lưu các rule vào flashsale_rules
    if (rules.length > 0 && flashsaleId) {
      const ruleInserts = rules.map(rule => ({
        flashsale_id: flashsaleId,
        category_id: rule.category || null,
        stock_op: rule.stockOp,
        stock_value: rule.stockValue ? Number(rule.stockValue) : null,
        price_op: rule.priceOp,
        price_value: rule.priceValue ? Number(rule.priceValue) : null,
        sold_op: rule.soldOp,
        sold_value: rule.soldValue ? Number(rule.soldValue) : null,
        discount_type: rule.discountType,
        discount_value: rule.discountValue ? Number(rule.discountValue) : null,
      }));
      await supabase.from('flashsale_rules').insert(ruleInserts);
    }
    if (flashsaleId) {
      const inserts = selectedRuleProducts.map(pid => ({
        flashsale_id: flashsaleId,
        product_id: pid,
      }));
      await supabase.from('flashsale_products').insert(inserts);
    }
    toast.success(editingFlashSaleId ? 'Cập nhật flash sale thành công!' : 'Tạo flash sale thành công!');
    setShowModal(false);
    setForm({
      name: '',
      start_time: '',
      end_time: '',
      is_active: true,
      discount_type: 'percent',
      discount_value: '',
    });
    setSelectedRuleProducts([]);
    setFilteredProducts([]);
    setRules([]);
    setEditingFlashSaleId(null);
    fetchFlashSales();
  };

  // Lấy danh mục
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  useEffect(() => {
    supabase.from('categories').select('id, name').then(({data}) => setCategories(data || []));
  }, []);

  // Thêm hàm handleSubmit cho tab 'manual' trong FlashSaleManager
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_time || !form.end_time || selectedProducts.length === 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (!form.discount_value) {
      toast.error('Vui lòng nhập giá trị giảm giá!');
      return;
    }
    // Kiểm tra trùng thời gian với các flash sale đang diễn ra (chỉ khi thêm mới)
    if (!editingFlashSaleId) {
      const start = new Date(form.start_time).getTime();
      const end = new Date(form.end_time).getTime();
      const MIN_GAP = 5 * 60 * 1000; // 5 phút
      const overlapOrTouch = flashSales.some(sale => {
        if (!sale.is_active) return false;
        const saleStart = new Date(sale.start_time).getTime();
        const saleEnd = new Date(sale.end_time).getTime();
        // Giao nhau hoặc dính sát
        return (
          (start < saleEnd && end > saleStart) || // giao nhau
          Math.abs(start - saleEnd) < MIN_GAP ||  // bắt đầu dính sát kết thúc
          Math.abs(end - saleStart) < MIN_GAP     // kết thúc dính sát bắt đầu
        );
      });
      if (overlapOrTouch) {
        toast.error('Thời gian bắt đầu/kết thúc của sự kiện này quá sát hoặc trùng với sự kiện khác. Vui lòng chọn thời gian cách nhau ít nhất 5 phút!');
        return;
      }
    }
    if (editingFlashSaleId) {
      // Update flashsale
      await supabase.from('flashsale').update({
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        is_active: form.is_active,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
      }).eq('id', editingFlashSaleId);
      // Xóa hết flashsale_products cũ, thêm lại mới
      await supabase.from('flashsale_products').delete().eq('flashsale_id', editingFlashSaleId);
      const inserts = selectedProducts.map(pid => ({
        flashsale_id: editingFlashSaleId,
        product_id: pid,
      }));
      await supabase.from('flashsale_products').insert(inserts);
      toast.success('Cập nhật flash sale thành công!');
    } else {
      // Thêm mới như cũ
      const { data: sale, error } = await supabase
        .from('flashsale')
        .insert([{
          name: form.name,
          start_time: form.start_time,
          end_time: form.end_time,
          is_active: form.is_active,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
        }])
        .select()
        .single();
      if (error) {
        toast.error('Lỗi khi tạo flash sale');
        return;
      }
      const inserts = selectedProducts.map(pid => ({
        flashsale_id: sale.id,
        product_id: pid,
      }));
      await supabase.from('flashsale_products').insert(inserts);
      toast.success('Tạo flash sale thành công!');
    }
    setShowModal(false);
    setForm({
      name: '',
      start_time: '',
      end_time: '',
      is_active: true,
      discount_type: 'percent',
      discount_value: '',
    });
    setSelectedProducts([]);
    setEditingFlashSaleId(null);
    fetchFlashSales();
  };

  // Hàm mở modal sửa
  const handleEdit = async (sale: FlashSale) => {
    setForm({
      name: sale.name,
      start_time: sale.start_time,
      end_time: sale.end_time,
      is_active: sale.is_active,
      discount_type: sale.discount_type || 'percent',
      discount_value: sale.discount_value?.toString() || '',
    });
    setSelectedProducts(sale.products.map(p => p.id));
    setEditingFlashSaleId(sale.id);
    // Lấy rules từ DB
    const { data: ruleData } = await supabase.from('flashsale_rules').select('*').eq('flashsale_id', sale.id);
    // Map lại về đúng định dạng state rules
    const mappedRules = (ruleData || []).map(r => ({
      category: r.category_id || '',
      stockOp: r.stock_op || '>',
      stockValue: r.stock_value !== null && r.stock_value !== undefined ? r.stock_value.toString() : '',
      priceOp: r.price_op || '>',
      priceValue: r.price_value !== null && r.price_value !== undefined ? r.price_value.toString() : '',
      soldOp: r.sold_op || '>',
      soldValue: r.sold_value !== null && r.sold_value !== undefined ? r.sold_value.toString() : '',
      discountType: r.discount_type || 'percent',
      discountValue: r.discount_value !== null && r.discount_value !== undefined ? r.discount_value.toString() : '',
    }));
    setRules(mappedRules);
    // Lọc lại sản phẩm theo rule khi sửa
    if (mappedRules.length > 0) {
      let filtered = [...products];
      mappedRules.forEach(rule => {
        if (rule.category) filtered = filtered.filter(p => p.category_id === rule.category);
        if (rule.stockValue) filtered = filtered.filter(p => eval(`${p.stock || 0} ${rule.stockOp} ${rule.stockValue}`));
        if (rule.priceValue) filtered = filtered.filter(p => eval(`${p.price || 0} ${rule.priceOp} ${rule.priceValue}`));
        if (rule.soldValue) filtered = filtered.filter(p => eval(`${p.sold || 0} ${rule.soldOp} ${rule.soldValue}`));
      });
      setFilteredProducts(filtered);
      setSelectedRuleProducts(filtered.map(p => p.id));
    } else {
      setFilteredProducts([]);
      setSelectedRuleProducts([]);
    }
    setActiveTab((mappedRules.length > 0) ? 'rule' : 'manual');
    setShowModal(true);
  };

  // Hàm xóa flash sale
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa flash sale này?')) return;
    await supabase.from('flashsale_products').delete().eq('flashsale_id', id);
    await supabase.from('flashsale').delete().eq('id', id);
    toast.success('Đã xóa flash sale!');
    fetchFlashSales();
  };

  // 1. useEffect realtime filter
  useEffect(() => {
    if (rules.length > 0) {
      let matchedProducts: FlashSaleProduct[] = [];
      rules.forEach(rule => {
        let filtered: FlashSaleProduct[] = [...products];
        if (rule.category) filtered = filtered.filter(p => p.category_id === rule.category);
        if (rule.stockValue !== '') filtered = filtered.filter(p => {
          try { return eval(`${p.stock || 0} ${rule.stockOp} ${rule.stockValue}`); }
          catch { return true; }
        });
        if (rule.priceValue !== '') filtered = filtered.filter(p => {
          try { return eval(`${p.price || 0} ${rule.priceOp} ${rule.priceValue}`); }
          catch { return true; }
        });
        if (rule.soldValue !== '') filtered = filtered.filter(p => {
          try { return eval(`${p.sold || 0} ${rule.soldOp} ${rule.soldValue}`); }
          catch { return true; }
        });
        matchedProducts = matchedProducts.concat(filtered);
      });
      // Loại trùng sản phẩm
      const uniqueProducts: FlashSaleProduct[] = Array.from(new Map(matchedProducts.map(p => [p.id, p])).values());
      setFilteredProducts(uniqueProducts);
      setSelectedRuleProducts(uniqueProducts.map(p => p.id));
    } else {
      setFilteredProducts([]);
      setSelectedRuleProducts([]);
    }
  }, [rules, products]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý Flash Sale</h2>
        <button
          onClick={() => {
            setEditingFlashSaleId(null);
            setForm({
              name: '',
              start_time: '',
              end_time: '',
              is_active: true,
              discount_type: 'percent',
              discount_value: '',
            });
            setActiveTab('manual');
            setSelectedProducts([]);
            setRules([]);
            setSelectedRuleProducts([]);
            setFilteredProducts([]);
            setShowModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          Tạo Flash Sale mới
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">Tên sự kiện</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Quy tắc</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {flashSales.map(sale => (
              <tr key={sale.id} className="border-t">
                <td className="px-4 py-2 font-semibold">{sale.name}</td>
                <td className="px-4 py-2">
                  {format(new Date(sale.start_time), 'dd/MM/yyyy HH:mm')} - {format(new Date(sale.end_time), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="px-4 py-2">
                  {Array.isArray(sale.rules) && sale.rules.length > 0 ? (
                    sale.rules.length === 1 ? (
                      sale.rules[0].discount_type === 'percent'
                        ? `${sale.rules[0].discount_value ?? 0}%`
                        : `${(sale.rules[0].discount_value ?? 0).toLocaleString('vi-VN')}đ`
                    ) : (
                      `${sale.rules.length} quy tắc`
                    )
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2">
                  {sale.products.map(p => (
                    <span key={p.id} className="inline-block mr-2">
                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded inline-block mr-1" />
                      {p.name}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sale.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {sale.is_active ? 'Đang diễn ra' : 'Đã kết thúc'}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(sale)}
                    className="bg-blue-500 text-white px-2 py-1 rounded mr-2 hover:bg-blue-600"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(sale.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl w-[1100px] max-h-[80vh] overflow-y-scroll">
            <h3 className="text-xl font-bold mb-4">
              {editingFlashSaleId ? 'Chỉnh sửa Flash Sale' : 'Tạo Flash Sale mới'}
            </h3>
            {/* Tabs */}
            <div className="flex border-b mb-6">
              <button
                className={`px-4 py-2 font-semibold ${activeTab === 'manual' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}
                onClick={() => setActiveTab('manual')}
              >Chọn thủ công</button>
              <button
                className={`px-4 py-2 font-semibold ${activeTab === 'rule' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500'}`}
                onClick={() => setActiveTab('rule')}
              >Áp dụng quy tắc</button>
            </div>
            {/* Tab content */}
            {activeTab === 'manual' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* ... giữ nguyên form thủ công ... */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tên sự kiện</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                    <DatePicker
                      selected={form.start_time ? new Date(form.start_time) : null}
                      onChange={date => setForm(f => ({ ...f, start_time: date ? date.toISOString() : '' }))}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy HH:mm"
                      minDate={new Date()}
                      filterDate={date => {
                        // Không cho chọn ngày có sự kiện giao/dính
                        return !flashSales.some(sale => {
                          if (editingFlashSaleId && sale.id === editingFlashSaleId) return false;
                          const saleStart = new Date(sale.start_time);
                          const saleEnd = new Date(sale.end_time);
                          // Nếu ngày này nằm trong khoảng sale
                          return date >= startOfDay(saleStart) && date <= endOfDay(saleEnd);
                        });
                      }}
                      locale={vi}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                    <DatePicker
                      selected={form.end_time ? new Date(form.end_time) : null}
                      onChange={date => setForm(f => ({ ...f, end_time: date ? date.toISOString() : '' }))}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="dd/MM/yyyy HH:mm"
                      minDate={form.start_time ? new Date(form.start_time) : new Date()}
                      filterDate={date => {
                        // Không cho chọn ngày có sự kiện giao/dính
                        return !flashSales.some(sale => {
                          if (editingFlashSaleId && sale.id === editingFlashSaleId) return false;
                          const saleStart = new Date(sale.start_time);
                          const saleEnd = new Date(sale.end_time);
                          return date >= startOfDay(saleStart) && date <= endOfDay(saleEnd);
                        });
                      }}
                      locale={vi}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                {/* Thêm loại giảm giá và giá trị giảm giá */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.discount_type}
                      onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                    >
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Giá trị giảm giá</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      min="0"
                      max={form.discount_type === 'percent' ? '100' : undefined}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chọn sản phẩm áp dụng</label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto grid grid-cols-2 gap-2">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedProducts(prev => [...prev, p.id]);
                            else setSelectedProducts(prev => prev.filter(id => id !== p.id));
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    id="is_active"
                  />
                  <label htmlFor="is_active" className="text-sm">Kích hoạt sự kiện</label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    disabled={selectedProducts.length === 0}
                  >
                    {editingFlashSaleId ? 'Sửa Flash Sale' : 'Tạo Flash Sale'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'rule' && (
              <form onSubmit={handleSubmitRule} className="space-y-4">
                {/* Ẩn các trường thông tin chung trên tab quy tắc */}
                {/* Chỉ hiển thị form nhập quy tắc và danh sách sản phẩm thỏa mãn */}
                <div className="border p-4 rounded-lg mb-4 bg-white">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-semibold">Thêm quy tắc mới</h4>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Danh mục</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={newRule.category}
                        onChange={e => setNewRule(r => ({ ...r, category: e.target.value }))}
                      >
                        <option value="">Tất cả</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Tồn kho</label>
                      <div className="flex gap-1">
                        <select value={newRule.stockOp} onChange={e => setNewRule(r => ({ ...r, stockOp: e.target.value }))} className="border rounded px-2">
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                          <option value="==">=</option>
                        </select>
                        <input type="number" value={newRule.stockValue} onChange={e => setNewRule(r => ({ ...r, stockValue: e.target.value }))} className="border rounded px-2 w-20" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Giá</label>
                      <div className="flex gap-1">
                        <select value={newRule.priceOp} onChange={e => setNewRule(r => ({ ...r, priceOp: e.target.value }))} className="border rounded px-2">
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                          <option value="==">=</option>
                        </select>
                        <input type="number" value={newRule.priceValue} onChange={e => setNewRule(r => ({ ...r, priceValue: e.target.value }))} className="border rounded px-2 w-20" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Lượt bán</label>
                      <div className="flex gap-1">
                        <select value={newRule.soldOp} onChange={e => setNewRule(r => ({ ...r, soldOp: e.target.value }))} className="border rounded px-2">
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                          <option value="==">=</option>
                        </select>
                        <input type="number" value={newRule.soldValue} onChange={e => setNewRule(r => ({ ...r, soldValue: e.target.value }))} className="border rounded px-2 w-20" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={newRule.discountType}
                        onChange={e => setNewRule(r => ({ ...r, discountType: e.target.value }))}
                      >
                        <option value="percent">Phần trăm (%)</option>
                        <option value="fixed">Số tiền cố định</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Giá trị giảm giá</label>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2"
                        value={newRule.discountValue}
                        onChange={e => setNewRule(r => ({ ...r, discountValue: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Kiểm tra có nhập gì không, nếu không thì không thêm
                        if (
                          !newRule.category &&
                          !newRule.stockValue &&
                          !newRule.priceValue &&
                          !newRule.soldValue
                        ) {
                          toast.error('Vui lòng nhập ít nhất một điều kiện!');
                          return;
                        }
                        setRules(r => {
                          const newRules = [...r, newRule];
                          // Lọc lại sản phẩm ngay khi thêm quy tắc
                          let filtered = [...products];
                          newRules.forEach(rule => {
                            if (rule.category) filtered = filtered.filter(p => p.category_id === rule.category);
                            if (rule.stockValue) filtered = filtered.filter(p => eval(`${p.stock || 0} ${rule.stockOp} ${rule.stockValue}`));
                            if (rule.priceValue) filtered = filtered.filter(p => eval(`${p.price || 0} ${rule.priceOp} ${rule.priceValue}`));
                            if (rule.soldValue) filtered = filtered.filter(p => eval(`${p.sold || 0} ${rule.soldOp} ${rule.soldValue}`));
                          });
                          setFilteredProducts(filtered);
                          setSelectedRuleProducts(filtered.map(p => p.id));
                          return newRules;
                        });
                        setNewRule({ category: '', stockOp: '>', stockValue: '', priceOp: '>', priceValue: '', soldOp: '>', soldValue: '', discountType: 'percent', discountValue: '' });
                      }}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      Thêm quy tắc
                    </button>
                  </div>
                </div>
                {/* Box hiển thị các quy tắc đã thêm */}
                {rules.length > 0 && (
                  <div
                    style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, marginBottom: 16, padding: 8 }}
                    className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  >
                    {rules.map((rule, index) => (
                      <div key={index} className="border p-4 rounded-lg mb-4 bg-white">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-semibold">Quy tắc {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setRules(r => {
                                const newRules = r.filter((_, i) => i !== index);
                                // Lọc lại sản phẩm ngay khi xóa quy tắc
                                let filtered = [...products];
                                newRules.forEach(rule => {
                                  if (rule.category) filtered = filtered.filter(p => p.category_id === rule.category);
                                  if (rule.stockValue) filtered = filtered.filter(p => eval(`${p.stock || 0} ${rule.stockOp} ${rule.stockValue}`));
                                  if (rule.priceValue) filtered = filtered.filter(p => eval(`${p.price || 0} ${rule.priceOp} ${rule.priceValue}`));
                                  if (rule.soldValue) filtered = filtered.filter(p => eval(`${p.sold || 0} ${rule.soldOp} ${rule.soldValue}`));
                                });
                                setFilteredProducts(filtered);
                                setSelectedRuleProducts(filtered.map(p => p.id));
                                return newRules;
                              });
                            }}
                            className="text-red-500"
                          >
                            Xóa quy tắc
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Danh mục</label>
                            <span>{categories.find(c => c.id === rule.category)?.name || 'Tất cả'}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Tồn kho</label>
                            <span>{rule.stockOp} {rule.stockValue}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Giá</label>
                            <span>{rule.priceOp} {rule.priceValue}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Lượt bán</label>
                            <span>{rule.soldOp} {rule.soldValue}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                            <span>{rule.discountType}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Giá trị giảm giá</label>
                            <span>{rule.discountValue}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Hiển thị cảnh báo nếu không có sản phẩm thỏa mãn */}
                {filteredProducts.length === 0 && rules.length > 0 && (
                  <div className="text-red-500 font-semibold mb-2">Không có sản phẩm nào thỏa mãn các quy tắc!</div>
                )}
                {/* Box danh sách sản phẩm thỏa mãn */}
                {filteredProducts.length > 0 && (
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, marginBottom: 16, padding: 8 }}>
                    <label className="block text-sm font-medium mb-1 mt-2">Danh sách sản phẩm thỏa mãn</label>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredProducts.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRuleProducts.includes(p.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedRuleProducts(prev => [...prev, p.id]);
                              else setSelectedRuleProducts(prev => prev.filter(id => id !== p.id));
                            }}
                          />
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded" />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    id="is_active_rule"
                  />
                  <label htmlFor="is_active_rule" className="text-sm">Kích hoạt sự kiện</label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    disabled={selectedRuleProducts.length === 0}
                  >
                    {editingFlashSaleId ? 'Sửa Flash Sale' : 'Tạo Flash Sale'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function ReportPage() {
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  // Hiệu ứng 3D cho card
  const cardClass =
    'bg-white rounded-xl shadow-xl p-8 flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105 hover:rotate-y-3 hover:shadow-2xl cursor-pointer';

  // Hàm xuất Excel sản phẩm
  const handleExportProducts = async (previewOnly = false) => {
    const { data: products } = await supabase.from('products').select('name, price, sold, stock');
    const wsData = [
      ['Tên sản phẩm', 'Giá', 'Số lượng bán', 'Tồn kho'],
      ...(products || []).map(p => [p.name, p.price, p.sold, p.stock])
    ];
    if (previewOnly) {
      setPreviewTitle('Báo cáo sản phẩm');
      setPreviewHeaders(wsData[0]);
      setPreviewData(wsData.slice(1));
      setShowPreview(true);
      // Chuẩn bị blob để tải
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      setExcelBlob(new Blob([wbout], { type: 'application/octet-stream' }));
      return;
    }
    // Nếu không previewOnly thì tải luôn
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'bao_cao_san_pham.xlsx');
  };
  // Hàm xuất Excel đơn hàng
  const handleExportOrders = async (previewOnly = false) => {
    const { data: orders } = await supabase.from('orders').select('id, total_amount, status, created_at, user_id');
    const wsData = [
      ['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Trạng thái', 'Ngày đặt'],
      ...(orders || []).map(o => [o.id, o.user_id, o.total_amount, o.status, o.created_at])
    ];
    if (previewOnly) {
      setPreviewTitle('Báo cáo đơn hàng');
      setPreviewHeaders(wsData[0]);
      setPreviewData(wsData.slice(1));
      setShowPreview(true);
      // Chuẩn bị blob để tải
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      setExcelBlob(new Blob([wbout], { type: 'application/octet-stream' }));
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'bao_cao_don_hang.xlsx');
  };
  // Hàm xuất Excel doanh thu
  const handleExportRevenue = async (previewOnly = false) => {
    const { data: orders } = await supabase.from('orders').select('total_amount, created_at');
    // Gom nhóm doanh thu theo ngày
    const revenueByDate: Record<string, number> = {};
    (orders || []).forEach(o => {
      const date = o.created_at.slice(0, 10);
      revenueByDate[date] = (revenueByDate[date] || 0) + o.total_amount;
    });
    const wsData = [
      ['Ngày', 'Doanh thu'],
      ...Object.entries(revenueByDate)
    ];
    if (previewOnly) {
      setPreviewTitle('Báo cáo doanh thu');
      setPreviewHeaders(['Ngày', 'Doanh thu']);
      setPreviewData(wsData.slice(1));
      setShowPreview(true);
      // Chuẩn bị blob để tải
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      setExcelBlob(new Blob([wbout], { type: 'application/octet-stream' }));
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doanh thu');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'bao_cao_doanh_thu.xlsx');
  };
  
  // Hàm tải file từ blob
  const handleDownload = () => {
    if (excelBlob && previewTitle) {
      let filename = '';
      if (previewTitle.includes('sản phẩm')) filename = 'bao_cao_san_pham.xlsx';
      else if (previewTitle.includes('đơn hàng')) filename = 'bao_cao_don_hang.xlsx';
      else filename = 'bao_cao_doanh_thu.xlsx';
      saveAs(excelBlob, filename);
    }
  };

  
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Báo cáo & Xuất Excel</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass} onClick={() => handleExportProducts(true)}>
          <span className="text-primary-600 text-3xl mb-2"><Download size={32} /></span>
          <span className="font-semibold text-lg mb-1">Báo cáo sản phẩm</span>
          <span className="text-gray-500 text-sm">Xem & tải Excel</span>
        </div>
        <div className={cardClass} onClick={() => handleExportOrders(true)}>
          <span className="text-green-600 text-3xl mb-2"><Download size={32} /></span>
          <span className="font-semibold text-lg mb-1">Báo cáo đơn hàng</span>
          <span className="text-gray-500 text-sm">Xem & tải Excel</span>
        </div>
        <div className={cardClass} onClick={() => handleExportRevenue(true)}>
          <span className="text-blue-600 text-3xl mb-2"><Download size={32} /></span>
          <span className="font-semibold text-lg mb-1">Báo cáo doanh thu</span>
          <span className="text-gray-500 text-sm">Xem & tải Excel</span>
        </div>
      </div>
      {/* Modal xem trước báo cáo */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl animate-flipInY relative">
            <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 text-2xl">×</button>
            <h3 className="text-xl font-bold mb-4 text-primary-700">{previewTitle}</h3>
            {showPreview && previewTitle.includes('doanh thu') ? (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      {previewHeaders.map((h, idx) => (
                        <th key={idx} className="px-4 py-2 border-b bg-gray-50 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData && previewData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b">{row[0]}</td>
                        <td className="px-4 py-2 border-b">{formatShortMoney(Number(row[1]))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : showPreview && (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      {previewHeaders.map((h, idx) => (
                        <th key={idx} className="px-4 py-2 border-b bg-gray-50 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData && previewData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-4 py-2 border-b">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleDownload} className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 shadow-lg">Tải về Excel</button>
              <button onClick={() => setShowPreview(false)} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage; 