import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard, { Glow3DBox, QuantityBox3D, ButtonGradientGlow } from '../components/products/ProductCard';
import { useFlashSale, FlashSaleItem, FlashSaleRule } from '../hooks/useFlashSale';
import { supabase } from '../lib/supabase';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useCart } from '../hooks/useCart';
import { toast } from 'react-toastify';

// const bannerUrl = 'https://cf.shopee.vn/file/vn-50009109-7d2e2e2e1e2e2e2e1e2e2e2e1e2e2e2e';

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Đã kết thúc');
        setIsEnding(false);
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / 1000 / 60 / 60);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsEnding(diff < 10 * 60 * 1000); // <10 phút cuối
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return (
    <span
      className={
        'ml-2 text-6xl md:text-7xl font-extrabold text-white bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300 px-12 py-6 rounded-3xl shadow-2xl tracking-widest font-mono animate-pulse border-4 border-white ' +
        (isEnding ? ' ring-4 ring-pink-400 animate-glow' : '')
      }
      style={{
        textShadow: '0 0 24px #a78bfa, 0 0 48px #c4b5fd',
        letterSpacing: 4,
        fontFamily: 'Digital, monospace',
        border: '4px solid #fff',
        boxShadow: '0 8px 32px 0 rgba(128,0,255,0.18)',
      }}
    >
      <span className="mr-2">⏳</span>{timeLeft}
    </span>
  );
}

// Countdown nhỏ gọn cho khung giờ
function CountdownSmall({ endTime }: { endTime: string }) {
  const [time, setTime] = React.useState('');
  React.useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTime('00:00:00');
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / 1000 / 60 / 60);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return <span className="text-purple-600 font-bold flex items-center gap-1"><span>⏰</span>{time}</span>;
}

// Hàm tính giá giảm động theo rule
function calculateDiscountedPrice(item: FlashSaleItem, rules: FlashSaleRule[]) {
  // Tìm rule phù hợp nhất (ưu tiên theo category)
  const rule = rules.find(rule => {
    if (rule.flashsale_id !== item.flashsale.id) return false;
    if (rule.category_id && rule.category_id !== item.product.category_id) return false;
    // Có thể kiểm tra thêm tồn kho, giá, sold nếu muốn
    return true;
  });
  let discountType = item.flashsale.discount_type;
  let discountValue = item.flashsale.discount_value;
  if (rule) {
    discountType = rule.discount_type;
    discountValue = rule.discount_value;
  }
  const originalPrice = item.product.price;
  if (discountType === 'percent') {
    return Math.round(originalPrice * (1 - discountValue / 100));
  } else {
    return Math.max(0, originalPrice - discountValue);
  }
}

// CountdownBar: đổi màu dấu ':' sang tím nhạt, block số vẫn nền đen chữ trắng
function CountdownBar({ endTime }: { endTime: string }) {
  const [time, setTime] = React.useState(['00','00','00']);
  React.useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTime(['00','00','00']);
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / 1000 / 60 / 60);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTime([
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
      ]);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return (
    <span className="flex items-center gap-1 ml-2">
      <span className="bg-black text-white font-mono text-lg md:text-xl px-2 py-1 rounded-md shadow-inner tracking-widest" style={{fontFamily:'Digital,monospace', minWidth:28, textAlign:'center'}}>{time[0]}</span>
      <span className="font-bold mx-1" style={{color:'#a78bfa'}} >:</span>
      <span className="bg-black text-white font-mono text-lg md:text-xl px-2 py-1 rounded-md shadow-inner tracking-widest" style={{fontFamily:'Digital,monospace', minWidth:28, textAlign:'center'}}>{time[1]}</span>
      <span className="font-bold mx-1" style={{color:'#a78bfa'}} >:</span>
      <span className="bg-black text-white font-mono text-lg md:text-xl px-2 py-1 rounded-md shadow-inner tracking-widest" style={{fontFamily:'Digital,monospace', minWidth:28, textAlign:'center'}}>{time[2]}</span>
    </span>
  );
}

// Sửa ParallaxBanner để overlay countdown
function ParallaxBanner({ src, alt }: { src: string, alt: string }) {
  const bannerRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const handleScroll = () => {
      if (bannerRef.current) {
        const scrolled = window.scrollY;
        bannerRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <div className="relative w-full h-48 sm:h-[300px] md:h-[400px] lg:h-screen overflow-hidden flex items-center justify-center">
      <img
        ref={bannerRef}
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}

const FlashSalePage = () => {
  const { items, rules, loading, error, isFlashSaleActive, getTimeLeft } = useFlashSale();
  const [now, setNow] = useState(new Date());
  const [bannerList, setBannerList] = useState<string[]>([]);
  const { addToCart } = useCart();
  // Modal state
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedDiscountedPrice, setSelectedDiscountedPrice] = useState<number | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 8;

  // FILTER
  const [filter, setFilter] = useState<'top' | 'low' | 'category' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 1. Thêm state categories và fetch danh mục từ supabase
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Lấy danh mục giảm giá từ flashsale_rules
  const discountCategoryIdsFromRules = Array.from(new Set(rules.map(r => r.category_id).filter(Boolean)));
  const validDiscountCategories = categories.filter(cat => discountCategoryIdsFromRules.includes(cat.id));

  useEffect(() => {
    const fetchBanner = async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('image_url, page')
        .eq('page', 'flashsale')
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (data && data.length > 0) {
        setBannerList(data.filter(b => b.page === 'flashsale').map(b => b.image_url));
      }
    };
    fetchBanner();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lọc các sự kiện flash sale đang diễn ra
  let activeItems = items.filter(item => isFlashSaleActive(item));

  // Áp dụng filter
  if (filter === 'top') {
    activeItems = [...activeItems].sort((a, b) => (b.product.sold || 0) - (a.product.sold || 0));
  } else if (filter === 'low') {
    activeItems = [...activeItems].sort((a, b) => (a.product.sold || 0) - (b.product.sold || 0));
  } else if (filter === 'category' && selectedCategory) {
    activeItems = activeItems.filter(item => item.product.category_id === selectedCategory);
  }

  // Lấy thông tin flash sale hiện tại (nếu có)
  const currentFlashSale = activeItems.length > 0 ? activeItems[0].flashsale : null;

  // PHÂN TRANG: Tính toán sản phẩm hiển thị
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const productsToShow = activeItems.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(activeItems.length / productsPerPage);

  // Cài đặt cho Slider banner
  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: false,
  };

  // Lọc các sự kiện flash sale sắp tới
  const upcomingFlashSales = items
    .map(item => item.flashsale)
    .filter((fs, idx, arr) => new Date(fs.start_time) > now && arr.findIndex(f => f.id === fs.id) === idx)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Lọc các sự kiện flash sale đang diễn ra
  const allFlashSales = items.map(item => item.flashsale);

  // Lọc sự kiện đang diễn ra và sắp diễn ra (ẩn đã kết thúc)
  const displayFlashSales = allFlashSales.filter(fs => new Date(fs.end_time) > now);
  // State: tab đang chọn
  const defaultActive = displayFlashSales.find(fs => now >= new Date(fs.start_time) && now <= new Date(fs.end_time))?.id || displayFlashSales[0]?.id;
  const [selectedFlashSaleId, setSelectedFlashSaleId] = React.useState<string | undefined>(defaultActive);
  React.useEffect(() => {
    // Nếu danh sách sự kiện thay đổi, tự động chọn lại tab phù hợp
    if (!selectedFlashSaleId || !displayFlashSales.find(fs => fs.id === selectedFlashSaleId)) {
      setSelectedFlashSaleId(defaultActive);
    }
    // eslint-disable-next-line
  }, [displayFlashSales.length]);
  const selectedFlashSale = displayFlashSales.find(fs => fs.id === selectedFlashSaleId);
  const [showDetail, setShowDetail] = React.useState<string | null>(null);

  // Callback mở modal
  const handleAddToCartClick = async (product: any, discountedPrice?: number) => {
    let sizes = product.sizes;
    let colors = product.colors;
    // Nếu thiếu, fetch lại từ bảng products
    if (!sizes || !colors || sizes.length === 0 || colors.length === 0) {
      const { data } = await supabase.from('products').select('sizes,colors').eq('id', product.id).single();
      if (data) {
        sizes = typeof data.sizes === 'string' ? JSON.parse(data.sizes) : (data.sizes || []);
        colors = typeof data.colors === 'string' ? JSON.parse(data.colors) : (data.colors || []);
      }
    }
    setSelectedProduct({ ...product, sizes, colors });
    setSelectedDiscountedPrice(discountedPrice);
    setShowBuyNowModal(true);
    setSelectedColor('');
    setSelectedSize('');
    setQuantity(1);
  };
  // Xác nhận mua
  const handleConfirmBuyNow = () => {
    if (!selectedProduct) return;
    if (selectedProduct.stock === 0) {
      alert('Sản phẩm đã hết hàng');
      setShowBuyNowModal(false);
      return;
    }
    if (quantity > (selectedProduct.stock || 0)) {
      alert('Vượt quá số lượng tồn kho!');
      return;
    }
    const finalPrice = typeof selectedDiscountedPrice === 'number' && selectedDiscountedPrice < selectedProduct.price
      ? selectedDiscountedPrice
      : (typeof selectedProduct.discount_price === 'number' && selectedProduct.discount_price > 0 && selectedProduct.discount_price < selectedProduct.price
          ? selectedProduct.discount_price
          : selectedProduct.price);
    addToCart({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: finalPrice,
      image: Array.isArray(selectedProduct.image_urls) && selectedProduct.image_urls.length > 0 ? selectedProduct.image_urls[0] : selectedProduct.image_url,
      quantity,
      color: selectedColor,
      size: selectedSize
    });
    setShowBuyNowModal(false);
    toast.success(`${selectedProduct.name} đã thêm vào giỏ hàng!`);
  };

  const [showFilterModal, setShowFilterModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-200 pt-36 md:pt-20 pb-12">
      {/* Banner fullwidth, responsive */}
      <div className="w-full relative mb-10">
        {/* Countdown overlay căn giữa banner */}
        {currentFlashSale?.end_time && (
          <div className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 flex justify-center w-full pointer-events-none">
            <div className="bg-black/60 rounded-xl px-3 py-3 sm:px-8 sm:py-6 flex flex-col items-center shadow-2xl">
              <span className="text-lg sm:text-3xl md:text-5xl font-extrabold text-white mb-2 drop-shadow">FLASH SALE ĐANG DIỄN RA</span>
              <CountdownBar endTime={currentFlashSale.end_time} />
            </div>
          </div>
        )}
        <Slider {...bannerSettings}>
          {bannerList.map((url, idx) => (
            <div key={idx} className="w-full">
              <ParallaxBanner src={url} alt={`Banner ${idx + 1}`} />
            </div>
          ))}
        </Slider>
      </div>


      {/* Danh sách sản phẩm flash sale + filter layout */}
      <div className="container mx-auto px-2 sm:px-4 py-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filter bên trái */}
          <div className="md:w-1/4 w-full bg-white/80 rounded-2xl shadow-lg p-4 border border-purple-100 inline-flex flex-col gap-2 hidden md:block">
            <div className="text-lg font-bold text-purple-700 mb-4">Bộ lọc sản phẩm</div>
            <button
              className={`w-full mb-2 px-4 py-2 rounded-lg font-semibold border-2 transition ${filter==='top' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100'}`}
              onClick={() => { setFilter('top'); setCurrentPage(1); }}
            >
              Top bán chạy
            </button>
            <button
              className={`w-full mb-2 px-4 py-2 rounded-lg font-semibold border-2 transition ${filter==='low' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100'}`}
              onClick={() => { setFilter('low'); setCurrentPage(1); }}
            >
              Bán ít nhất
            </button>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-purple-700 mb-1">Danh mục đang giảm giá</label>
              <select
                className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value); setFilter('category'); setCurrentPage(1); }}
              >
                <option value="">-- Chọn danh mục --</option>
                {validDiscountCategories.length === 0 ? (
                  <option value="" disabled>Không có danh mục giảm giá</option>
                ) : (
                  validDiscountCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
            <button
              className="w-full mt-6 px-4 py-2 rounded-lg font-semibold border-2 border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
              onClick={() => { setFilter(null); setSelectedCategory(''); setCurrentPage(1); }}
              disabled={!filter && !selectedCategory}
            >
              Đặt lại bộ lọc
            </button>
          </div>
          {/* Nút icon tròn nổi mở bộ lọc trên mobile */}
          <button
            className="fixed bottom-4 left-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 shadow-xl flex items-center justify-center text-white text-3xl border-2 border-white/80 md:hidden"
            onClick={() => setShowFilterModal(true)}
            aria-label="Bộ lọc sản phẩm"
          >
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg>
          </button>

          {/* Modal bộ lọc trên mobile */}
          {showFilterModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
              <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 max-h-[90vh] overflow-y-auto animate-fade-in relative">
                <button
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-600 hover:bg-gray-200"
                  onClick={() => setShowFilterModal(false)}
                  aria-label="Đóng bộ lọc"
                >
                  ×
                </button>
                <div className="text-lg font-bold text-purple-700 mb-4">Bộ lọc sản phẩm</div>
                <button
                  className={`w-full mb-2 px-4 py-2 rounded-lg font-semibold border-2 transition ${filter==='top' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100'}`}
                  onClick={() => { setFilter('top'); setCurrentPage(1); setShowFilterModal(false); }}
                >
                  Top bán chạy
                </button>
                <button
                  className={`w-full mb-2 px-4 py-2 rounded-lg font-semibold border-2 transition ${filter==='low' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100'}`}
                  onClick={() => { setFilter('low'); setCurrentPage(1); setShowFilterModal(false); }}
                >
                  Bán ít nhất
                </button>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-purple-700 mb-1">Danh mục đang giảm giá</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
                    value={selectedCategory}
                    onChange={e => { setSelectedCategory(e.target.value); setFilter('category'); setCurrentPage(1); setShowFilterModal(false); }}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {validDiscountCategories.length === 0 ? (
                      <option value="" disabled>Không có danh mục giảm giá</option>
                    ) : (
                      validDiscountCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  className="w-full mt-6 px-4 py-2 rounded-lg font-semibold border-2 border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
                  onClick={() => { setFilter(null); setSelectedCategory(''); setCurrentPage(1); setShowFilterModal(false); }}
                  disabled={!filter && !selectedCategory}
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>
          )}
          {/* Sản phẩm bên phải */}
          <div className="md:w-3/4 w-full">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-400"></div>
              </div>
            ) : activeItems.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-lg font-semibold">
                Không có sản phẩm flash sale nào đang diễn ra.
              </div>
            ) : (
              <>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08 } }
                }}
              >
                {productsToShow.map((item, idx) => {
                  const timeLeft = getTimeLeft(item);
                  let className = '';
                  let badge = null;
                  if (item.product.stock <= 3) {
                    className += ' animate-pulse';
                    badge = <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow animate-bounce z-10">Sắp hết!</span>;
                  }
                  if (timeLeft && timeLeft.total < 10 * 60 * 1000) {
                    className += ' animate-bounce ring-2 ring-pink-400';
                    badge = <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse z-10">Sắp kết thúc</span>;
                  }
                  return (
                    <React.Fragment key={item.id}>
                      {badge}
                      <ProductCard
                        product={{
                          id: item.product.id,
                          created_at: '',
                          name: item.product.name,
                          description: item.product.description,
                          price: item.product.price,
                          image_url: item.product.image_url,
                          category_id: item.product.category_id || '',
                          image_urls: [],
                          sizes: typeof (item.product as any).sizes === 'string' ? JSON.parse((item.product as any).sizes) : ((item.product as any).sizes || []),
                          colors: typeof (item.product as any).colors === 'string' ? JSON.parse((item.product as any).colors) : ((item.product as any).colors || []),
                          stock: item.product.stock,
                          is_featured: false,
                          discount_price: undefined,
                          material: (item.product as any).material || '',
                          washing_instruction: (item.product as any).washing_instruction || '',
                          season: (item.product as any).season || '',
                          sold: item.product.sold || 0,
                          flashsale: item.flashsale,
                        }}
                        discountedPrice={calculateDiscountedPrice(item, rules)}
                        showAddToCart={true}
                        className={className}
                        onAddToCartClick={handleAddToCartClick}
                      />
                    </React.Fragment>
                  );
                })}
              </motion.div>
              {/* Thanh phân trang */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    className="px-3 py-1 rounded bg-purple-100 text-purple-600 font-bold hover:bg-purple-200 transition disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1 rounded font-bold border-2 ${currentPage === i + 1 ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="px-3 py-1 rounded bg-purple-100 text-purple-600 font-bold hover:bg-purple-200 transition disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Render modal ngoài cùng */}
      <AnimatePresence>
        {showBuyNowModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4"
            style={{ minHeight: '100dvh' }}
          >
            <Glow3DBox className="bg-white rounded-2xl shadow-2xl w-full max-w-xs md:max-w-md p-4 md:p-8 flex flex-col items-center relative animate-fadeIn">
              <Glow3DBox className="flex flex-col items-center mb-2 cursor-pointer" >
                <img
                  src={Array.isArray(selectedProduct.image_urls) && selectedProduct.image_urls.length > 0 ? selectedProduct.image_urls[0] : selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border-2 border-primary-100 shadow-lg mb-2"
                />
                <span className="text-gray-500 text-xs">Ảnh sản phẩm</span>
              </Glow3DBox>
              <h3 className="text-xl md:text-2xl font-bold text-primary-700 mb-4 md:mb-6 text-center">Chọn màu và size</h3>
              {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 && (
                <div className="mb-4 md:mb-6 w-full flex flex-col items-center">
                  <label className="block text-base font-semibold text-gray-700 mb-2 md:mb-3">Màu sắc</label>
                  <div className="flex gap-2 md:gap-3 flex-wrap justify-center">
                    {selectedProduct.colors.map((color: string) => (
                      <button
                        key={color}
                        type="button"
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border font-semibold shadow transition-all duration-200 ${
                          selectedColor === color 
                            ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' 
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0 && (
                <div className="mb-4 md:mb-6 w-full flex flex-col items-center">
                  <label className="block text-base font-semibold text-gray-700 mb-2 md:mb-3">Kích cỡ</label>
                  <div className="flex gap-2 md:gap-3 flex-wrap justify-center">
                    {selectedProduct.sizes.map((size: string) => (
                      <button
                        key={size}
                        type="button"
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border font-semibold shadow transition-all duration-200 ${
                          selectedSize === size 
                            ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' 
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-4 flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full justify-center">
                <div className="flex flex-col items-center">
                  <label className="block text-base font-semibold text-gray-700 mb-1 md:mb-2">Số lượng</label>
                  <QuantityBox3D>
                    <ButtonGradientGlow onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</ButtonGradientGlow>
                    <input type="number" min={1} max={selectedProduct.stock || 1} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(selectedProduct.stock || 1, Number(e.target.value))))} className="w-10 md:w-12 text-center border rounded-xl font-semibold text-lg" />
                    <ButtonGradientGlow onClick={() => setQuantity(q => Math.min(selectedProduct.stock || 1, q + 1))} disabled={quantity >= (selectedProduct.stock || 1)}>+</ButtonGradientGlow>
                  </QuantityBox3D>
                </div>
                <div className="flex flex-col items-center">
                  <label className="block text-base font-semibold text-gray-700 mb-1 md:mb-2">Tồn kho</label>
                  <div className="text-primary-600 font-bold text-lg md:text-xl">{selectedProduct.stock}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2 md:gap-3 mt-6 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowBuyNowModal(false)}
                  className="px-4 md:px-6 py-2 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 shadow"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.07, rotateY: 5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmBuyNow}
                  className="px-4 md:px-6 py-2 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-500 rounded-xl shadow hover:from-purple-500 hover:to-primary-600 transition-all"
                >
                  Xác nhận
                </motion.button>
              </div>
            </Glow3DBox>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlashSalePage; 