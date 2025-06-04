import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { ParallaxProvider, Parallax } from 'react-scroll-parallax';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import defaultAvatar from '../assets/default-avatar.svg';
import ProductCard from '../components/products/ProductCard';
import { useFlashSale } from '../hooks/useFlashSale';
import Slider from 'react-slick';
import { Glow3DBox, QuantityBox3D, ButtonGradientGlow } from '../components/products/ProductCard';
import { useCart } from '../hooks/useCart';
import { toast } from 'react-toastify';
import React, { useRef } from 'react';

type Category = Database['public']['Tables']['categories']['Row'];

type Product = Database['public']['Tables']['products']['Row'] & {
  sold?: number;
  discount_price?: number;
};

interface Comment {
  id: string;
  comment: string;
  rating: number;
  created_at: string;
  users?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  products?: {
    name: string;
    image_url?: string;
  };
}

const blobs = [
  {
    className: 'absolute top-[-120px] left-[-120px] w-[350px] h-[350px] bg-purple-200 opacity-40 rounded-full blur-3xl',
    speed: -10,
  },
  {
    className: 'absolute top-[40%] right-[-100px] w-[300px] h-[300px] bg-purple-100 opacity-30 rounded-full blur-2xl',
    speed: 8,
  },
  {
    className: 'absolute bottom-[-100px] left-[20%] w-[280px] h-[280px] bg-violet-100 opacity-30 rounded-full blur-2xl',
    speed: -6,
  },
  {
    className: 'absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-indigo-100 opacity-30 rounded-full blur-3xl',
    speed: 12,
  },
];

function CountdownBar({ endTime }: { endTime: string }) {
  const [time, setTime] = useState(['00','00','00']);
  useEffect(() => {
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

// Hàm chuẩn hóa dữ liệu product cho ProductCard
function normalizeProduct(product: any) {
  return {
    id: product.id,
    created_at: product.created_at || '',
    name: product.name,
    description: product.description || '',
    price: product.price,
    category_id: product.category_id || '',
    image_urls: product.image_urls || (product.image_url ? [product.image_url] : []),
    image_url: product.image_url || '',
    sizes: product.sizes || [],
    colors: product.colors || [],
    stock: product.stock,
    is_featured: false,
    discount_price: product.discount_price || 0,
    material: product.material || '',
    washing_instruction: product.washing_instruction || '',
    season: product.season || '',
    sold: product.sold,
  };
}

// Custom Arrow cho react-slick (3D động, gradient, đẹp)
function SlickArrow(props: any) {
  const { className, style, onClick, direction } = props;
  const btnRef = useRef(null);

  // Hiệu ứng 3D nghiêng theo chuột
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current as HTMLButtonElement | null;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `perspective(400px) scale(1.12) rotateY(${-x / 10}deg) rotateX(${y / 10}deg)`;
    btn.style.boxShadow = '0 8px 32px 0 rgba(128,0,255,0.25), 0 0 32px #a78bfa';
  };
  const handleMouseLeave = () => {
    const btn = btnRef.current as HTMLButtonElement | null;
    if (!btn) return;
    btn.style.transform = 'perspective(400px) scale(1)';
    btn.style.boxShadow = '0 4px 16px 0 rgba(128,0,255,0.12)';
  };

  return (
    <button
      ref={btnRef}
      className={
        `${className} !flex !items-center !justify-center !bg-gradient-to-br !from-purple-400 !to-blue-400 !shadow-2xl !rounded-full !w-16 !h-16 !z-20 !absolute !top-1/2 !-translate-y-1/2 border-4 border-white transition-all duration-300` +
        (direction === 'prev' ? ' !left-[-36px]' : ' !right-[-36px]')
      }
      style={{
        ...style,
        color: '#fff',
        fontSize: 36,
        boxShadow: '0 4px 16px 0 rgba(128,0,255,0.12)',
        outline: 'none',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={direction === 'prev' ? 'Trước' : 'Sau'}
    >
      {direction === 'prev' ? (
        <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="24 8 12 18 24 28"/></svg>
      ) : (
        <svg width="36" height="36" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 24 18 12 28"/></svg>
      )}
    </button>
  );
}

const HomePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const { addToCart } = useCart();
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedDiscountedPrice, setSelectedDiscountedPrice] = useState<number | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Flash Sale Section
  const { items: flashSaleItems, loading: flashSaleLoading, isFlashSaleActive, getTimeLeft, calculateDiscountedPrice } = useFlashSale();
  const now = new Date();
  const activeFlashSaleItems = flashSaleItems.filter(isFlashSaleActive);
  const currentFlashSale = activeFlashSaleItems.length > 0 ? activeFlashSaleItems[0].flashsale : null;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setProducts(data || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, users:users(id, full_name, avatar_url), products(name, image_url)')
        .eq('rating', 5)
        .order('created_at', { ascending: false })
        .limit(6);
      if (!error) setComments(data || []);
    };
    fetchComments();
  }, []);

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
      toast.error('Sản phẩm đã hết hàng');
      setShowBuyNowModal(false);
      return;
    }
    if (quantity > (selectedProduct.stock || 0)) {
      toast.error('Vượt quá số lượng tồn kho!');
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

  return (
    <ParallaxProvider>
      <div className="min-h-screen bg-white text-black relative overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] md:min-h-screen flex items-center justify-center py-12 md:py-0">
          {/* Parallax Background Image */}
          <Parallax speed={-30} className="absolute inset-0 z-0">
            <img
              src="https://images.pexels.com/photos/1884584/pexels-photo-1884584.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="Fashion Hero"
              className="w-full h-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/30 to-white/80" />
          </Parallax>
          {/* Blob pastel */}
          <div className="absolute top-[-80px] left-[-80px] w-[250px] h-[250px] bg-purple-100 opacity-30 rounded-full blur-2xl" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-pink-100 opacity-20 rounded-full blur-3xl" />
          {/* Content */}
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="max-w-4xl mx-auto">
              <motion.h1
                className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 md:mb-8 drop-shadow-[0_4px_32px_rgba(128,0,255,0.25)]"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
              >
                LUXE
                <br />
                <span className="text-purple-400 drop-shadow-[0_2px_16px_rgba(168,85,247,0.35)]">STORY</span>
              </motion.h1>

              <motion.p
                className="text-lg sm:text-xl md:text-2xl text-white mb-8 md:mb-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Khám phá câu chuyện thời trang của bạn
              </motion.p>

              <motion.div
                className="flex flex-col md:flex-row justify-center gap-4 md:gap-6"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Link
                  to="/products"
                  className="px-12 py-5 bg-purple-600 text-white font-bold text-xl rounded-full hover:bg-purple-700 transition-colors duration-300 shadow-xl hover:shadow-2xl drop-shadow-lg"
                >
                  Khám phá ngay
                </Link>
                <Link
                  to="/about"
                  className="px-12 py-5 bg-white/20 backdrop-blur-sm text-white font-bold text-xl rounded-full hover:bg-white/30 transition-colors duration-300 border-2 border-white/30 shadow-xl hover:shadow-2xl drop-shadow-lg"
                >
                  Câu chuyện của chúng tôi
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
        {/* Flash Sale Section */}
        {activeFlashSaleItems.length > 0 && (
          <section className="relative py-10 md:py-16 bg-gradient-to-r from-purple-50 via-white to-purple-100 border-b-2 border-purple-100 mb-8">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl md:text-5xl font-extrabold text-purple-600 tracking-tight flex items-center">
                    <span className="mr-2">⚡</span>FLASH SALE
                  </span>
                  {currentFlashSale?.end_time && <CountdownBar endTime={currentFlashSale.end_time} />}
                </div>
                <Link to="/flash-sale" className="text-purple-600 font-bold hover:underline text-lg md:text-xl transition-transform hover:scale-110">Xem tất cả &gt;</Link>
              </div>
              {flashSaleLoading ? (
                <div className="text-center text-purple-400 py-10">Đang tải Flash Sale...</div>
              ) : (
                <Slider
                  dots={false}
                  infinite={activeFlashSaleItems.length > 4}
                  speed={700}
                  slidesToShow={4}
                  slidesToScroll={1}
                  arrows={true}
                  nextArrow={<SlickArrow direction="next" />}
                  prevArrow={<SlickArrow direction="prev" />}
                  cssEase="cubic-bezier(0.77, 0, 0.175, 1)"
                  responsive={[
                    { breakpoint: 1024, settings: { slidesToShow: 3 } },
                    { breakpoint: 768, settings: { slidesToShow: 2 } },
                    { breakpoint: 480, settings: { slidesToShow: 1 } },
                  ]}
                >
                  {activeFlashSaleItems.map(item => (
                    <div key={item.id} className="px-2">
                      <div className="relative min-w-[280px] max-w-[340px] min-h-[520px] p-4 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 hover:shadow-purple-200">
                        <ProductCard
                          product={{
                            ...normalizeProduct(item.product),
                            flashsale: item.flashsale,
                          }}
                          discountedPrice={calculateDiscountedPrice(item)}
                          showAddToCart={true}
                          onAddToCartClick={handleAddToCartClick}
                        />
                      </div>
                    </div>
                  ))}
                </Slider>
              )}
            </div>
            {/* Modal chọn màu/size */}
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
          </section>
        )}
        {/* Collections Section */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                BỘ SƯU TẬP
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Khám phá những bộ sưu tập độc đáo được thiết kế riêng cho bạn
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CollectionCard
                title="Xuân Hè 2024"
                description="Bộ sưu tập tươi mới với những gam màu pastel và chất liệu nhẹ nhàng"
                imageUrl="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80"
                link="/products?collection=spring-summer"
                tags={['Mới nhất', 'Pastel', 'Nhẹ nhàng']}
              />
              <CollectionCard
                title="Thu Đông 2024"
                description="Phong cách ấm áp với những thiết kế sang trọng và chất liệu cao cấp"
                imageUrl="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                link="/products?collection=fall-winter"
                tags={['Sang trọng', 'Ấm áp', 'Cao cấp']}
              />
              <CollectionCard
                title="Limited Edition"
                description="Những thiết kế độc quyền với số lượng giới hạn"
                imageUrl="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
                link="/products?collection=limited"
                tags={['Độc quyền', 'Giới hạn', 'Premium']}
              />
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-32 relative bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                SẢN PHẨM NỔI BẬT
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Những sản phẩm được yêu thích nhất tại cửa hàng của chúng tôi
              </p>
            </motion.div>

            {/* Quick Filters */}
            {(() => {
              const [filter, setFilter] = useState<'all' | 'newest' | 'bestseller' | 'discount'>('all');
              const filteredProducts = useMemo(() => {
                if (filter === 'all') return products.slice(0, 8);
                if (filter === 'newest') {
                  return [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
                }
                if (filter === 'bestseller') {
                  return [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
                }
                if (filter === 'discount') {
                  // Lấy sản phẩm flash sale trước
                  const flashSaleProducts = activeFlashSaleItems.map(item => normalizeProduct(item.product));
                  // Lấy sản phẩm giảm giá thông thường
                  const regularDiscountProducts = products
                    .filter(p => typeof p.discount_price === 'number' && p.discount_price < p.price)
                    .filter(p => !flashSaleProducts.some(fp => fp.id === p.id)); // Loại bỏ sản phẩm đã có trong flash sale
                  
                  // Kết hợp và giới hạn số lượng
                  return [...flashSaleProducts, ...regularDiscountProducts].slice(0, 8);
                }
                return products.slice(0, 8);
              }, [products, filter, activeFlashSaleItems]);
              return <>
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                  <button
                    className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 focus:outline-none ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setFilter('all')}
                  >Tất cả</button>
                  <button
                    className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 focus:outline-none ${filter === 'newest' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setFilter('newest')}
                  >Mới nhất</button>
                  <button
                    className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 focus:outline-none ${filter === 'bestseller' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setFilter('bestseller')}
                  >Bán chạy</button>
                  <button
                    className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 focus:outline-none ${filter === 'discount' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => setFilter('discount')}
                  >Giảm giá</button>
                </div>
                {loading ? (
                  <div className="text-center text-gray-500 py-20">Đang tải sản phẩm...</div>
                ) : (
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {filteredProducts.map((item) => {
                        // Kiểm tra nếu là sản phẩm flash sale
                        const flashSaleItem = activeFlashSaleItems.find(f => f.product.id === item.id);
                        if (flashSaleItem) {
                          return (
                            <div key={item.id} className="transform hover:scale-105 transition-transform duration-300">
                              <ProductCard 
                                product={{ ...normalizeProduct(flashSaleItem.product), flashsale: flashSaleItem.flashsale }}
                                discountedPrice={calculateDiscountedPrice(flashSaleItem)}
                                showAddToCart
                              />
                            </div>
                          );
                        }
                        // Sản phẩm không flash sale
                        return (
                          <div key={item.id} className="transform hover:scale-105 transition-transform duration-300">
                            <ProductCard product={item} showAddToCart />
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center mt-8">
                      <Link 
                        to={`/products${filter !== 'all' ? `?filter=${filter}` : ''}`}
                        className="inline-block px-8 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition-colors duration-300 shadow-lg hover:shadow-xl"
                      >
                        Xem tất cả
                      </Link>
                    </div>
                  </div>
                )}
              </>;
            })()}
          </div>
        </section>

        {/* Story Section */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                CÂU CHUYỆN CỦA CHÚNG TÔI
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Khám phá hành trình tạo nên những sản phẩm thời trang độc đáo
              </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black text-purple-600 mb-2">30+</div>
                <div className="text-gray-600">Năm kinh nghiệm</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black text-purple-600 mb-2">50k+</div>
                <div className="text-gray-600">Khách hàng hài lòng</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black text-purple-600 mb-2">1000+</div>
                <div className="text-gray-600">Sản phẩm độc đáo</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black text-purple-600 mb-2">15+</div>
                <div className="text-gray-600">Giải thưởng</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-purple-200"></div>

              {/* Timeline Items */}
              <div className="space-y-20">
                <TimelineItem
                  title="Thiết kế"
                  description="Quá trình sáng tạo và phát triển mẫu thiết kế"
                  imageUrl="https://images.pexels.com/photos/532220/pexels-photo-532220.jpeg?auto=compress&w=800&q=80"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  }
                  position="left"
                />
                <TimelineItem
                  title="Sản xuất"
                  description="Công nghệ và kỹ thuật sản xuất hiện đại"
                  imageUrl="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  }
                  position="right"
                />
                <TimelineItem
                  title="Chất lượng"
                  description="Cam kết về chất lượng và tính bền vững"
                  imageUrl="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80"
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  position="left"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 relative bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                KHÁCH HÀNG NÓI GÌ?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Những đánh giá chân thực từ khách hàng của chúng tôi
              </p>
            </motion.div>

            {/* Rating Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-black text-purple-600 mb-2">4.9</div>
                <div className="flex justify-center text-yellow-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <div className="text-gray-600">Đánh giá trung bình</div>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-black text-purple-600 mb-2">98%</div>
                <div className="text-gray-600">Khách hàng hài lòng</div>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-black text-purple-600 mb-2">10k+</div>
                <div className="text-gray-600">Đánh giá</div>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-black text-purple-600 mb-2">95%</div>
                <div className="text-gray-600">Khách hàng quay lại</div>
              </div>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {comments.map((comment) => (
                <TestimonialCard key={comment.id} comment={comment} />
              ))}
            </div>

            {/* Write Review Button */}
            <div className="text-center mt-16">
              <Link to="/products" className="px-8 py-4 bg-purple-600 text-white font-bold text-lg rounded-full hover:bg-purple-700 transition-colors duration-300 shadow-lg hover:shadow-xl">
                Viết đánh giá của bạn
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ParallaxProvider>
  );
};

// Component CollectionCard
const CollectionCard = ({ 
  title, 
  description, 
  imageUrl, 
  link,
  tags 
}: { 
  title: string; 
  description: string; 
  imageUrl: string; 
  link: string;
  tags: string[];
}) => (
  <motion.div
    className="relative group cursor-pointer"
    whileHover={{ y: -10 }}
  >
    <div className="relative h-[300px] md:h-[500px] overflow-hidden rounded-2xl">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      {/* Tags */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span 
            key={index}
            className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full border border-white/30"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h3 className="text-3xl font-black mb-4 text-white">{title}</h3>
        <p className="text-gray-200 mb-6 text-lg">{description}</p>
        <Link
          to={link}
          className="inline-block px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-purple-600 hover:text-white transition-colors duration-300"
        >
          Khám phá ngay
        </Link>
      </div>
    </div>
  </motion.div>
);

// Component TimelineItem
const TimelineItem = ({ 
  title, 
  description, 
  imageUrl, 
  icon,
  position 
}: { 
  title: string; 
  description: string; 
  imageUrl: string; 
  icon: React.ReactNode;
  position: 'left' | 'right';
}) => (
  <motion.div
    className={`flex flex-col md:flex-row items-center gap-8 ${position === 'right' ? 'md:flex-row-reverse' : ''}`}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7 }}
  >
    {/* Content */}
    <div className={`w-1/2 ${position === 'right' ? 'text-right' : ''}`}>
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            {icon}
          </div>
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>

    {/* Timeline Dot */}
    <div className="relative z-10">
      <div className="w-8 h-8 bg-purple-600 rounded-full border-4 border-white"></div>
    </div>

    {/* Image */}
    <div className="w-1/2">
      <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  </motion.div>
);

// Component TestimonialCard
const TestimonialCard = ({ comment }: { comment: Comment }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg overflow-hidden p-4 md:p-8"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <img 
            src={comment.users?.avatar_url || defaultAvatar} 
            alt={comment.users?.full_name || 'User'} 
            className="w-16 h-16 rounded-full object-cover border-2 border-purple-200"
            onError={e => { e.currentTarget.src = defaultAvatar; }}
          />
          <div>
            <div className="font-bold text-lg text-gray-900">{comment.users?.full_name || 'Khách hàng'}</div>
            <div className="text-sm text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Rating */}
        <div className="flex text-yellow-400 mb-4">
          {[...Array(comment.rating)].map((_, i) => (
            <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        {/* Comment */}
        <div className={`text-gray-600 ${!isExpanded && 'line-clamp-3'}`}>
          {comment.comment}
        </div>

        {/* Product Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden">
              <img 
                src={comment.products?.image_url || 'https://via.placeholder.com/100'} 
                alt={comment.products?.name || 'Product'} 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-medium text-gray-900">Về sản phẩm:</div>
              <div className="text-sm text-gray-600">{comment.products?.name || ''}</div>
            </div>
          </div>
        </div>

        {/* Expand Button */}
        {comment.comment.length > 150 && (
          <Link
            to="/products"
            className="mt-4 text-purple-600 font-medium hover:text-purple-700"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
          </Link>
        )}
      </div>
    </motion.div>
  );
};

export default HomePage;