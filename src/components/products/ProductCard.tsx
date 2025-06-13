import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Star, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Database } from '../../lib/database.types';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../hooks/useWishlist';
import { supabase } from '../../lib/supabase';
import React from 'react';

type Product = Database['public']['Tables']['products']['Row'] & {
  sold?: number;
  discount_price?: number;
  product_images?: { id: string; image_url: string; is_primary: boolean; color?: string }[];
  flashsale?: {
    id: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    timeLeft?: {
      hours: number;
      minutes: number;
      seconds: number;
      total: number;
    } | null;
  };
};

interface ProductCardProps {
  product: Product;
  discountedPrice?: number;
  showAddToCart?: boolean;
  className?: string;
  onAddToCartClick?: (product: Product, discountedPrice?: number) => void;
  images?: string[];
}

const ProductCard = ({ product, discountedPrice, showAddToCart, className, onAddToCartClick, images }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const [heartStyle, setHeartStyle] = useState<any>({});
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const [imgIndex, setImgIndex] = useState(0);

  // Lấy danh sách ảnh từ product_images hoặc image_url
  const imageList = useMemo(() => {
    if (product.product_images && product.product_images.length > 0) {
      // Sắp xếp để ảnh chính (is_primary) lên đầu
      const sortedImages = [...product.product_images].sort((a, b) => 
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
      );
      return sortedImages.map(img => img.image_url);
    }
    return [product.image_url || 'https://via.placeholder.com/400x600?text=No+Image'];
  }, [product.product_images, product.image_url]);

  const imageUrl = imageList[imgIndex] || imageList[0];
  
  // Lấy số sao trung bình từ reviews
  useEffect(() => {
    let isMounted = true;
    const fetchRating = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', product.id);
      if (!error && data && isMounted) {
        const ratings = data.map((r: any) => r.rating);
        const avg = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : null;
        setAvgRating(avg);
        setReviewCount(ratings.length);
      }
    };
    fetchRating();
    return () => { isMounted = false; };
  }, [product.id]);

  const handleHeartMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartStyle({
      transform: `scale(1.25) rotate(${(x-rect.width/2)/3}deg) translate(${(x-rect.width/2)/2.5}px, ${(y-rect.height/2)/2.5}px)`,
      filter: `drop-shadow(0 0 24px #f87171)`,
      transition: 'transform 0.10s, filter 0.10s'
    });
  };

  const handleHeartMouseLeave = () => setHeartStyle({});

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (!user) {
      toast.error('Vui lòng đăng nhập để sử dụng chức năng yêu thích');
      return;
    }
    if (isWishlisted(product.id)) {
      await removeFromWishlist(product.id);
      toast.success('Đã xóa khỏi yêu thích');
    } else {
      await addToWishlist(product.id);
      toast.success('Đã thêm vào yêu thích');
    }
  };

  // Logic giá
  const hasFlashSale = !!product.flashsale && typeof discountedPrice === 'number' && discountedPrice < product.price;
  // Tính phần trăm giảm giá
  const percentOff = hasFlashSale && product.price > 0
    ? Math.round(100 - (discountedPrice! / product.price) * 100)
    : 0;

  // Parse colors và sizes về array nếu bị trả về dạng string
  const colors = typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors;
  const sizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes;

  return (
    <div className="relative">
      <Link
        to={`/products/${product.id}`}
        className="block group flex flex-col items-center bg-white rounded-2xl shadow-xl p-2 sm:p-5 relative"
        style={{ perspective: '1000px', minHeight: 'auto', height: '100%' }}
        tabIndex={0}
      >
        {/* Product Image */}
        <div
          className="aspect-[3/4] w-full max-w-[160px] sm:max-w-[220px] bg-secondary-100 relative overflow-hidden rounded-2xl mb-2 sm:mb-4 flex-shrink-0"
          onMouseEnter={() => { if (imageList.length > 1) setImgIndex(1); }}
          onMouseLeave={() => setImgIndex(0)}
        >
          {/* Ảnh đầu */}
          <img
            src={imageList[0]}
            alt={product.name}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${imgIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            draggable={false}
          />
          {/* Ảnh tiếp theo (nếu có) */}
          {imageList[1] && (
            <img
              src={imageList[1]}
              alt={product.name}
              className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${imgIndex === 1 ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              draggable={false}
            />
          )}
          {/* Badge % giảm giá chỉ khi là flash sale */}
          {typeof discountedPrice === 'number' && discountedPrice < product.price && (
            <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg z-10">
              -{Math.round(100 - (discountedPrice / (product.price || 1)) * 100)}%
            </div>
          )}
          {/* Nút Wishlist */}
          <button
            ref={heartBtnRef}
            onClick={handleHeartClick}
            onMouseMove={handleHeartMouseMove}
            onMouseLeave={handleHeartMouseLeave}
            style={heartStyle}
            className="absolute top-2 right-2 sm:right-3 md:right-4 focus:outline-none z-30 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-lg hover:bg-white transition-all duration-300"
            aria-label="Yêu thích"
          >
            <Heart size={20} className={isWishlisted(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
          </button>
        </div>
        {/* Product Info */}
        <h3 className="font-bold text-sm sm:text-base md:text-lg text-primary-700 mb-1 text-center transition-colors group-hover:text-purple-600 line-clamp-2 min-h-[36px] sm:min-h-[44px]">{product.name}</h3>
        {/* Rating, Sold, Discount */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-700 mb-1 justify-center">
          {avgRating !== null && (
            <span className="flex items-center gap-1">
              {avgRating.toFixed(1)} <Star size={14} className="text-yellow-400 inline-block" fill="#facc15" />
            </span>
          )}
          {product.sold !== undefined && (
            <span>· {product.sold.toLocaleString()} sold</span>
          )}
        </div>
        {/* Giá */}
        <p className="font-bold text-base sm:text-lg flex flex-col sm:flex-row items-center sm:items-baseline justify-center text-center break-words leading-tight mb-1">
          {typeof discountedPrice === 'number' && discountedPrice < product.price ? (
            <>
              <span className="text-purple-700 font-bold mr-0 sm:mr-2 block whitespace-nowrap">
                {discountedPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              </span>
              <span className="text-gray-400 line-through mr-0 sm:mr-2 block whitespace-nowrap">
                {product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              </span>
            </>
          ) : (
            typeof product.discount_price === 'number' && product.discount_price > 0 && product.discount_price < product.price ? (
              <>
                <span className="text-primary-600 font-bold mr-0 sm:mr-2 block whitespace-nowrap">
                  {product.discount_price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                </span>
                <span className="text-gray-400 line-through block whitespace-nowrap">
                  {product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                </span>
              </>
            ) : (
              <span className="block whitespace-nowrap">{product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
            )
          )}
        </p>
        <p className="text-xs sm:text-sm text-secondary-600 line-clamp-2 mb-1 sm:mb-2 min-h-[32px] sm:min-h-[36px] text-center">{product.description}</p>
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 min-h-[16px] sm:min-h-[20px] mb-2 sm:mb-3">
          {Array.isArray(colors) && colors.length > 0 && colors.slice(0, 3).map((color, index) => (
            <span 
              key={index}
              className="w-4 h-4 rounded-full border-2 border-secondary-200 shadow-sm"
              style={{ 
                backgroundColor: 
                  color.toLowerCase() === 'white' ? '#ffffff' :
                  color.toLowerCase() === 'black' ? '#000000' :
                  color.toLowerCase() === 'red' ? '#ef4444' :
                  color.toLowerCase() === 'blue' ? '#3b82f6' :
                  color.toLowerCase() === 'green' ? '#10b981' :
                  color.toLowerCase() === 'yellow' ? '#eab308' :
                  color.toLowerCase() === 'purple' ? '#8b5cf6' :
                  color.toLowerCase() === 'pink' ? '#ec4899' :
                  color.toLowerCase() === 'gray' ? '#6b7280' :
                  color.toLowerCase() === 'brown' ? '#92400e' :
                  color.toLowerCase() === 'navy' ? '#1e3a8a' :
                  color.toLowerCase() === 'tan' ? '#d2b48c' :
                  color.toLowerCase() === 'silver' ? '#c0c0c0' :
                  color.toLowerCase() === 'gold' ? '#ffd700' :
                  color.toLowerCase() === 'tortoise' ? '#704214' : '#cccccc'
              }}
              title={color}
            ></span>
          ))}
          {Array.isArray(colors) && colors.length > 3 && (
            <span className="text-xs text-secondary-500">+{colors.length - 3} nữa</span>
          )}
        </div>
        {/* Nút thêm vào giỏ hàng */}
        <motion.button
          type="button"
          whileHover={{ scale: product.stock !== 0 ? 1.06 : 1, rotateX: product.stock !== 0 ? 6 : 0, boxShadow: product.stock !== 0 ? '0 8px 32px 0 rgba(80, 0, 200, 0.18)' : 'none' }}
          whileTap={{ scale: product.stock !== 0 ? 0.97 : 1, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={`w-full py-1.5 sm:py-2 px-2 sm:px-4 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base ${
            product.stock === 0 
              ? 'bg-gray-400 cursor-not-allowed text-white' 
              : 'bg-gradient-to-r from-primary-600 to-purple-500 text-white hover:from-purple-500 hover:to-primary-600'
          }`}
          disabled={!product || product.stock === 0}
          onClick={e => {
            e.preventDefault();
            if (onAddToCartClick) {
              onAddToCartClick(product, discountedPrice);
            }
          }}
        >
          {product.stock === 0 ? 'Đã hết hàng' : 'Thêm vào giỏ hàng'}
        </motion.button>
      </Link>
    </div>
  );
};

export default ProductCard;

// Hiệu ứng 3D: nền trắng, border mặc định trắng/trong suốt, khi hover border là gradient tím trượt quanh viền theo chuột
export const Glow3DBox = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<any>({});
  const [borderPos, setBorderPos] = React.useState({ x: 50, y: 50 });
  const [hovered, setHovered] = React.useState(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBorderPos({ x, y });
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 10;
    const rotateX = -((e.clientY - rect.top - centerY) / centerY) * 10;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
      background: '#fff',
      transition: 'transform 0.18s cubic-bezier(.25,.46,.45,.94)',
      border: hovered
        ? '4px solid transparent'
        : '4px solid #fff',
      borderImage: hovered
        ? `radial-gradient(circle at ${borderPos.x}% ${borderPos.y}%, #a78bfa 0%, #7c3aed 60%, transparent 100%) 1` 
        : 'none',
      boxSizing: 'border-box',
    });
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
      background: '#fff',
      border: '4px solid #fff',
      borderImage: 'none',
      transition: 'transform 0.3s, border 0.3s',
      boxSizing: 'border-box',
    });
  };
  const handleMouseEnter = () => setHovered(true);
  return (
    <div
      ref={boxRef}
      className={className + ' relative'}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative z-20">{children}</div>
    </div>
  );
};

// Box số lượng có hiệu ứng gradient sáng và xoay 3D theo chuột
export const QuantityBox3D = ({ children }: { children: React.ReactNode }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Xoay nhẹ theo hướng chuột
    const rotateY = ((x - centerX) / centerX) * 10; // max 10deg
    const rotateX = -((y - centerY) / centerY) * 10;
    setStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(124,58,237,0.12) 0%, rgba(168,34,175,0.08) 60%, transparent 100%)`,
      transition: 'transform 0.15s cubic-bezier(.25,.46,.45,.94), background 0.2s',
    });
  };
  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)',
      background: 'transparent',
      transition: 'transform 0.3s, background 0.3s',
    });
  };
  return (
    <div
      ref={boxRef}
      className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-white shadow-lg border border-primary-100"
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

// Nút gradient có hiệu ứng sáng theo chuột
export const ButtonGradientGlow = ({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty('--x', `${x}px`);
    btn.style.setProperty('--y', `${y}px`);
  };
  return (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className="relative w-12 h-12 flex items-center justify-center rounded-full border-none outline-none select-none font-bold text-xl text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-primary-600 to-purple-500 overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(90deg, #7c3aed 0%, #a21caf 100%)',
      }}
    >
      <span className="z-10 relative">{children}</span>
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
          transition: 'background 0.2s',
        }}
      />
    </button>
  );
};