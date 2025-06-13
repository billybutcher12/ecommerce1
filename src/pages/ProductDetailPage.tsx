import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame as Fire, Star, AlertTriangle, Clock, Heart } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import defaultAvatar from '../assets/default-avatar.svg';
import ProductCard from '../components/products/ProductCard';
import { useFlashSale } from '../hooks/useFlashSale';
import ArrowButton from '../components/shared/ArrowButton';

// Nút gradient có hiệu ứng sáng theo chuột
const ButtonGradientGlow = ({ children, onClick, disabled }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean }) => {
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

// Box số lượng có hiệu ứng gradient sáng và xoay 3D theo chuột
const QuantityBox3D = ({ children }: { children: React.ReactNode }) => {
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

// Hiệu ứng 3D: nền trắng, border mặc định trắng/trong suốt, khi hover border là gradient tím trượt quanh viền theo chuột
const Glow3DBox = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
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

const ProductDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Database['public']['Tables']['reviews']['Row'][]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [related, setRelated] = useState<Database['public']['Tables']['products']['Row'][]>([]);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [category, setCategory] = useState<{id: string, name: string} | null>(null);
  const { addToCart } = useCart();
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const [heartStyle, setHeartStyle] = useState<any>({});
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<'description' | 'detail'>('description');
  const [relatedPage, setRelatedPage] = useState(0);
  const relatedPerPage = 4;
  const relatedTotalPage = Math.ceil(related.length / relatedPerPage);
  const { items: flashSaleItems, rules: flashSaleRules, isFlashSaleActive, calculateDiscountedPrice } = useFlashSale();
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [visibleReviews, setVisibleReviews] = useState(5);
  const reviewsPerPage = 5;
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name), product_images:product_images(id, image_url, is_primary, color)')
        .eq('id', id)
        .single();
      if (!error) {
        setProduct(data);
        if (data.categories) {
          setCategory(data.categories);
        }
      }
      setLoading(false);
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      setReviewLoading(true);
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      if (filterStar) query = query.eq('rating', filterStar);
      const { data, error } = await query;
      if (!error) setReviews(data || []);
      setReviewLoading(false);
    };
    if (id) fetchReviews();
  }, [id, submitting, filterStar]);

  useEffect(() => {
    // Lấy sản phẩm liên quan cùng danh mục, fetch đủ trường
    const fetchRelated = async () => {
      if (product?.category_id) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', product.category_id)
          .neq('id', product.id)
          .order('created_at', { ascending: false });
        setRelated(data || []);
      }
    };
    if (product) fetchRelated();
  }, [product]);

  // Real-time đánh giá
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('realtime-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `product_id=eq.${id}` }, () => {
        // Khi có thay đổi, fetch lại reviews
        setReviewLoading(true);
        supabase
          .from('reviews')
          .select('*')
          .eq('product_id', id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setReviews(data || []);
            setReviewLoading(false);
          });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Fetch user profiles for reviews
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (reviews.length > 0) {
        const userIds = [...new Set(reviews.map(r => r.user_id))];
        const { data } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        if (data) {
          const profiles = data.reduce((acc, user) => ({
            ...acc,
            [user.id]: user
          }), {});
          setUserProfiles(profiles);
        }
      }
    };
    fetchUserProfiles();
  }, [reviews]);

  useEffect(() => {
    if (product) {
      setSelectedColor(Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : '');
      setSelectedSize(Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : '');
      setQuantity(1);
    }
  }, [product]);

  // Tạo mảng images từ product_images
  const images = product?.product_images && product.product_images.length > 0
    ? product.product_images.map((img: { image_url: string }) => img.image_url)
    : [product?.image_url || 'https://via.placeholder.com/600x600?text=No+Image'];

  // Badge động
  const getBadge = () => {
    if (!product) return null;
    const sold = (product as any).sold;
    if (typeof sold === 'number' && sold > 20) return { label: 'Bán chạy', color: 'bg-orange-100 text-orange-700', icon: <Fire className="w-4 h-4 mr-1" /> };
    if (product.stock !== undefined && product.stock <= 3) return { label: 'Sắp hết hàng', color: 'bg-red-100 text-red-700 animate-pulse', icon: <AlertTriangle className="w-4 h-4 mr-1" /> };
    const created = new Date(product.created_at || '');
    if ((Date.now() - created.getTime()) < 1000 * 60 * 60 * 24 * 7) return { label: 'Mới về', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4 mr-1" /> };
    return null;
  };
  const badge = getBadge();

  // Tính trung bình số sao
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;

  // Gửi đánh giá mới
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
      product_id: id,
        user_id: user.id,
      rating,
      comment,
    });
      if (error) throw error;
    setComment('');
    setRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
    setSubmitting(false);
    }
  };

  // Hàm lấy ảnh theo màu (ưu tiên is_primary, nếu không có thì lấy ảnh đầu tiên của màu đó, nếu không có thì fallback ảnh mặc định)
  const getImageByColor = (color: string): string => {
    if (product?.product_images && product.product_images.length > 0) {
      // Lọc ảnh theo màu
      const imagesOfColor = product.product_images.filter((img: any) => img.color === color);
      if (imagesOfColor.length > 0) {
        const primary = imagesOfColor.find((img: any) => img.is_primary);
        return primary ? primary.image_url : imagesOfColor[0].image_url;
      }
      // Nếu không có ảnh theo màu, fallback ảnh chính
      const primary = product.product_images.find((img: any) => img.is_primary);
      if (primary) return primary.image_url;
      return product.product_images[0].image_url;
    }
    return product?.image_url || 'https://via.placeholder.com/600x600?text=No+Image';
  };

  const handleAddToCart = () => {
    if (!product) return;
    // Kiểm tra số lượng tồn kho
    if (product.stock === 0) {
      toast.error('Sản phẩm đã hết hàng');
      return;
    }
    if ((product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) {
      setShowBuyNowModal(true);
      return;
    }
    const finalPrice =
      typeof discountedPrice === 'number' && discountedPrice < product.price
        ? discountedPrice
        : (typeof product.discount_price === 'number' && product.discount_price > 0 && product.discount_price < product.price
            ? product.discount_price
            : product.price);
    addToCart({
      product_id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image_url,
      quantity: 1,
      color: '',
      size: ''
    });
    toast.success(`${product.name} đã thêm vào giỏ hàng`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock === 0) {
      toast.error('Sản phẩm đã hết hàng');
      return;
    }
    setIsBuyNow(true);
    setShowBuyNowModal(true);
  };

  const handleConfirmBuyNow = () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để mua hàng');
      return;
    }
    if (!product) return;
    if (product.stock === 0) {
      toast.error('Sản phẩm đã hết hàng');
      setShowBuyNowModal(false);
      return;
    }
    if (quantity > product.stock) {
      toast.error('Vượt quá số lượng tồn kho!');
      return;
    }
    const finalPrice =
      typeof discountedPrice === 'number' && discountedPrice < product.price
        ? discountedPrice
        : (typeof product.discount_price === 'number' && product.discount_price > 0 && product.discount_price < product.price
            ? product.discount_price
            : product.price);
    // Lấy đúng ảnh theo màu
    const imageByColor = getImageByColor(selectedColor);
    if (isBuyNow) {
      // Chuyển sang trang thanh toán với đầy đủ thông tin sản phẩm
      setShowBuyNowModal(false);
      setIsBuyNow(false);
      const productData = {
        id: product.id,
        name: product.name,
        price: finalPrice,
        image: imageByColor,
        quantity: quantity,
        color: selectedColor,
        size: selectedSize,
        original_price: product.price,
        discount_price: product.discount_price,
        flashsale_price: discountedPrice
      };
      window.location.href = `/checkout?product=${encodeURIComponent(JSON.stringify(productData))}`;
      return;
    }
    // Thêm vào giỏ hàng như cũ, nhưng lấy đúng ảnh theo màu
    addToCart({
      product_id: product.id,
      name: product.name,
      price: finalPrice,
      image: imageByColor,
      quantity,
      color: selectedColor,
      size: selectedSize
    });
    setShowBuyNowModal(false);
    toast.success(`${product.name} đã thêm vào giỏ hàng`);
  };

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

  const handleHeartClick = async () => {
    if (!user || !product) {
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

  // Kiểm tra sản phẩm này có trong flash sale không
  let discountedPrice: number | undefined = undefined;
  let flashsale: any = undefined;
  if (product) {
    const flashSaleItem = flashSaleItems.find(item => item.product.id === product.id && isFlashSaleActive(item));
    if (flashSaleItem) {
      discountedPrice = calculateDiscountedPrice(flashSaleItem);
      flashsale = flashSaleItem.flashsale;
    }
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Product Image Section */}
          <motion.div
            whileHover={{ scale: 1.04, rotateY: 8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-4 flex items-center justify-center min-h-[320px] sm:min-h-[400px] md:min-h-[500px] relative"
            style={{ perspective: '1200px' }}
          >
            {/* Badge góc trái trên cùng */}
            {badge && (
              <span className={`absolute top-2 left-2 z-20 inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm ${badge.color} sm:hidden`}>{badge.icon}{badge.label}</span>
            )}
            {/* Nút wishlist góc phải trên cùng chỉ hiện trên mobile */}
            <button
              ref={heartBtnRef}
              onClick={handleHeartClick}
              onMouseMove={handleHeartMouseMove}
              onMouseLeave={handleHeartMouseLeave}
              style={heartStyle}
              className="absolute top-2 right-2 z-20 focus:outline-none sm:hidden"
              aria-label="Yêu thích"
            >
              <Heart size={28} className={isWishlisted(product?.id || '') ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
            </button>
            <div className="relative w-full max-w-[320px] sm:max-w-full aspect-square mx-auto">
              <img
                src={images[currentImageIdx]}
                alt={product?.name}
                className="w-full h-full object-cover rounded-2xl sm:rounded-3xl transition-transform duration-500"
                onError={e => {
                  const target = e.currentTarget;
                  if (!target.src.includes('placeholder.com')) {
                    target.src = 'https://via.placeholder.com/600x600?text=No+Image';
                  }
                }}
              />
              {/* Nút chuyển ảnh */}
              {images.length > 1 && (
                <>
                  <ArrowButton
                    direction="left"
                    onClick={() => setCurrentImageIdx((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute top-1/2 left-2 -translate-y-1/2 sm:left-4 z-10"
                    size={32}
                  />
                  <ArrowButton
                    direction="right"
                    onClick={() => setCurrentImageIdx((prev) => (prev + 1) % images.length)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 sm:right-4 z-10"
                    size={32}
                  />
                </>
              )}
              {/* Dots indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_: string, idx: number) => (
                    <button
                      key={idx}
                      className={`w-2 h-2 rounded-full ${currentImageIdx === idx ? 'bg-primary-600' : 'bg-gray-300'}`}
                      onClick={() => setCurrentImageIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Product Details Section */}
          <div className="flex flex-col space-y-8 justify-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-primary-800 mb-2 drop-shadow-lg flex items-center gap-3">
                {loading ? 'Đang tải...' : product?.name}
                {/* Nút wishlist chỉ hiện trên desktop */}
                <span className="hidden sm:inline-block">
                  <button
                    ref={heartBtnRef}
                    onClick={handleHeartClick}
                    onMouseMove={handleHeartMouseMove}
                    onMouseLeave={handleHeartMouseLeave}
                    style={heartStyle}
                    className="ml-2 focus:outline-none relative"
                    aria-label="Yêu thích"
                  >
                    <Heart size={28} className={isWishlisted(product?.id || '') ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                  </button>
                </span>
                {/* Badge chỉ hiện trên desktop */}
                {badge && (
                  <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm ml-2 {badge.color}">{badge.icon}{badge.label}</span>
                )}
              </h1>
              <p className="mt-1 text-2xl text-primary-600 font-bold mb-4">
                {loading ? '' : (
                  discountedPrice && discountedPrice < (product?.price || 0) ? (
                    <>
                      <span className="text-2xl text-purple-700 font-bold mr-3">
                        {discountedPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                      </span>
                      <span className="text-xl text-gray-400 line-through">
                        {product?.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                      </span>
                      <span className="ml-3 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-base align-middle">
                        -{Math.round(100 - (discountedPrice / (product?.price || 1)) * 100)}%
                      </span>
                    </>
                  ) : (
                    typeof product?.discount_price === 'number' && product.discount_price > 0 && product.discount_price < product.price ? (
                      <>
                        <span className="text-2xl text-primary-600 font-bold mr-3">
                          {product.discount_price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                        </span>
                        <span className="text-xl text-gray-400 line-through">
                          {product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                        </span>
                      </>
                    ) : (
                      product?.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
                    )
                  )
                )}
              </p>
              {/* Thông tin bán/kho/size/màu chia thành 2 hàng */}
              <div className="flex flex-wrap gap-2 items-center mb-2">
                <span className="flex items-center gap-1 px-4 py-1 rounded-full font-semibold text-green-700 bg-green-100/60" style={{ fontSize: 18 }}>
                  <Fire className="w-5 h-5 mr-1 text-green-600" /> Đã bán: {typeof (product as any)?.sold === 'number' ? (product as any).sold : 0}
                </span>
                <span className="px-4 py-1 rounded-full font-semibold text-blue-700 bg-blue-100/60" style={{ fontSize: 18 }}>
                  Kho: {typeof product?.stock === 'number' ? product.stock : 0}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center mb-4">
                {Array.isArray(product?.sizes) && product.sizes.length > 0 && (
                  <span className="px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-700">Size: {product.sizes.join(', ')}</span>
                )}
                {Array.isArray(product?.colors) && product.colors.length > 0 && (
                  <span className="flex items-center gap-1">
                    {product.colors.map((color: string, idx: number) => (
                      <span key={color + idx} className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-white text-gray-700 mr-1">
                        {color}
                      </span>
                    ))}
                  </span>
                )}
              </div>

              {/* Tabs mô tả & chi tiết sản phẩm */}
              <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex gap-4 mb-6">
                  <button
                    className={`font-bold text-lg px-4 py-2 rounded-lg transition-all ${tab === 'description' ? 'bg-primary-100 text-primary-700 shadow' : 'text-gray-500 hover:text-primary-700'}`}
                    onClick={() => setTab('description')}
                  >
                    Mô tả
                  </button>
                  <button
                    className={`font-bold text-lg px-4 py-2 rounded-lg transition-all ${tab === 'detail' ? 'bg-primary-100 text-primary-700 shadow' : 'text-gray-500 hover:text-primary-700'}`}
                    onClick={() => setTab('detail')}
                  >
                    Chi tiết sản phẩm
                  </button>
                </div>
                {tab === 'description' && (
                  <div className="prose prose-sm text-gray-600 min-h-[60px]">
                    {loading ? <p>Đang tải thông tin sản phẩm...</p> : <p>{product?.description}</p>}
                  </div>
                )}
                {tab === 'detail' && (
                  <div>
                    <h2 className="text-xl font-bold text-primary-700 mb-4">Thông tin chi tiết</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Danh mục:</span>
                          <span className="text-primary-700">{category.name}</span>
                        </div>
                      )}
                      {Array.isArray(product?.colors) && product.colors.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Màu sắc:</span>
                          <div className="flex flex-wrap gap-2">
                            {product.colors.map((color: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                {color}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(product?.sizes) && product.sizes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Kích thước:</span>
                          <div className="flex flex-wrap gap-2">
                            {product.sizes.map((size: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                {size}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {product?.material && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Chất liệu:</span>
                          <span className="text-primary-700">{product.material}</span>
                        </div>
                      )}
                      {product?.season && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Mùa:</span>
                          <span className="text-primary-700">{product.season}</span>
                        </div>
                      )}
                      {product?.washing_instruction && (
                        <div className="col-span-2">
                          <span className="text-gray-600 font-medium block mb-2">Hướng dẫn giặt:</span>
                          <div className="bg-gray-50 rounded-xl p-4 text-primary-700 border border-gray-100">
                            {product.washing_instruction}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: product?.stock !== 0 ? 1.06 : 1, rotateX: product?.stock !== 0 ? 6 : 0, boxShadow: product?.stock !== 0 ? '0 8px 32px 0 rgba(80, 0, 200, 0.18)' : 'none' }}
                whileTap={{ scale: product?.stock !== 0 ? 0.97 : 1, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={`w-full py-3 px-8 rounded-xl font-bold shadow-lg transition-all text-lg md:text-xl mt-2 mb-4 ${
                  product?.stock === 0 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-gradient-to-r from-primary-600 to-purple-500 text-white hover:from-purple-500 hover:to-primary-600'
                }`}
                disabled={loading || !product || product.stock === 0}
                onClick={handleAddToCart}
              >
                {product?.stock === 0 ? 'Đã hết hàng' : 'Thêm vào giỏ hàng'}
              </motion.button>
              {/* Nút Mua ngay */}
              <motion.button
                type="button"
                whileHover={{ scale: product?.stock !== 0 ? 1.06 : 1, rotateX: product?.stock !== 0 ? 6 : 0, boxShadow: product?.stock !== 0 ? '0 8px 32px 0 rgba(80, 0, 200, 0.18)' : 'none' }}
                whileTap={{ scale: product?.stock !== 0 ? 0.97 : 1, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={`w-full py-3 px-8 rounded-xl font-bold shadow-lg transition-all text-lg md:text-xl mb-4 ${
                  product?.stock === 0 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-purple-500 hover:to-pink-500'
                }`}
                disabled={loading || !product || product.stock === 0}
                onClick={handleBuyNow}
              >
                {product?.stock === 0 ? 'Đã hết hàng' : 'Mua ngay'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Đánh giá & bình luận */}
        <div className="mt-14 bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-2 text-3xl font-bold text-yellow-500">
              {avgRating ? (
                <>
                  {[...Array(Math.round(Number(avgRating)))].map((_, i) => <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }} className="inline-block">★</motion.span>)}
                  {[...Array(5 - Math.round(Number(avgRating)))].map((_, i) => <span key={i}>☆</span>)}
                  <span className="ml-3 text-gray-700 text-lg font-semibold">{avgRating} / 5</span>
                </>
              ) : (
                <span className="text-gray-400">Chưa có đánh giá</span>
              )}
            </div>
            <div className="text-gray-600 text-lg">Tổng {reviews.length} đánh giá</div>
            <div className="flex gap-2 items-center">
              {[1,2,3,4,5].map(star => (
                <button key={star} className={`rounded-full px-2 py-1 border ${filterStar === star ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-gray-100 text-yellow-500 border-gray-200'}`} onClick={() => setFilterStar(filterStar === star ? null : star)}>{star} <Star className="inline w-4 h-4" /></button>
              ))}
              {filterStar && <button className="ml-2 text-sm text-gray-500 underline" onClick={() => setFilterStar(null)}>Bỏ lọc</button>}
            </div>
          </div>

          {/* Danh sách bình luận */}
          <div className="space-y-6 mb-10">
            {reviewLoading ? (
              <div>Đang tải đánh giá...</div>
            ) : reviews.length === 0 ? (
              <div className="text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  <AnimatePresence>
                    {reviews.slice(0, visibleReviews).map((r, idx) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 30, rotateX: -15 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, y: 30, rotateX: 15 }}
                        transition={{ delay: idx * 0.05, duration: 0.4 }}
                        className="border-b pb-4 flex flex-col md:flex-row md:items-center md:gap-4 hover:bg-gray-50 p-4 rounded-xl transition-all duration-300 mb-4"
                        style={{ perspective: '1000px' }}
                      >
                        <div className="flex items-center gap-4 mb-2 md:mb-0">
                          <motion.div
                            whileHover={{ scale: 1.1, rotateY: 10 }}
                            className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-200"
                          >
                            <img
                              src={userProfiles[r.user_id]?.avatar_url || defaultAvatar}
                              alt={userProfiles[r.user_id]?.full_name || 'User'}
                              className="w-full h-full object-cover"
                              onError={e => { e.currentTarget.src = defaultAvatar; }}
                            />
                          </motion.div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary-700">
                              {userProfiles[r.user_id]?.full_name || 'Người dùng'}
                            </span>
                            <span className="text-yellow-500 text-lg">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          </div>
                        </div>
                        <div className="text-gray-700 mb-1 flex-1">{r.comment}</div>
                        <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('vi-VN')}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {reviews.length > visibleReviews && (
                  <div className="flex justify-center mt-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVisibleReviews(prev => prev + reviewsPerPage)}
                      className="px-6 py-2 bg-gradient-to-r from-primary-600 to-purple-500 text-white rounded-xl font-semibold shadow hover:from-purple-500 hover:to-primary-600 transition-all"
                    >
                      Xem thêm {Math.min(reviewsPerPage, reviews.length - visibleReviews)} đánh giá
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form gửi đánh giá mới */}
          <motion.form 
            onSubmit={handleSubmitReview} 
            className="flex flex-col md:flex-row items-center gap-4 mt-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-1">
              <span className="mr-2 font-semibold">Đánh giá:</span>
              {[1,2,3,4,5].map((star) => (
                <motion.button
                  type="button"
                  key={star}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className={star <= rating ? 'text-yellow-500 text-2xl' : 'text-gray-300 text-2xl'}
                  onClick={() => setRating(star)}
                  tabIndex={-1}
                >★</motion.button>
              ))}
            </div>
            <motion.input
              type="text"
              whileFocus={{ scale: 1.02 }}
              className="flex-1 border-2 border-primary-200 rounded-xl px-4 py-2 focus:outline-primary-500 shadow"
              placeholder="Viết bình luận của bạn..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={200}
              required
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05, rotateY: 5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-primary-600 to-purple-500 text-white px-8 py-2 rounded-xl font-semibold shadow hover:from-purple-500 hover:to-primary-600 transition-all text-lg"
              disabled={submitting || !comment.trim()}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </motion.button>
          </motion.form>
        </div>

        {/* Sản phẩm liên quan - Triptych */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 drop-shadow-lg flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Star className="w-7 h-7 text-yellow-400 drop-shadow mr-2" /> Sản phẩm liên quan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {related.slice(relatedPage * relatedPerPage, (relatedPage + 1) * relatedPerPage).map(rp => (
                <div key={rp.id} className="w-full">
                  <ProductCard product={rp} />
                </div>
              ))}
            </div>
            {/* Luôn hiển thị thanh phân trang, kể cả khi chỉ có 1 trang */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 mb-12 z-10 relative">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-primary-100 disabled:opacity-50"
                onClick={() => setRelatedPage(p => Math.max(0, p - 1))}
                disabled={relatedPage === 0}
              >
                &lt;
              </button>
              {Array.from({ length: relatedTotalPage }).map((_, idx) => (
                <button
                  key={idx}
                  className={`px-3 py-2 rounded-lg font-semibold transition-all ${relatedPage === idx ? 'bg-primary-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-primary-100'}`}
                  onClick={() => setRelatedPage(idx)}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-primary-100 disabled:opacity-50"
                onClick={() => setRelatedPage(p => Math.min(relatedTotalPage - 1, p + 1))}
                disabled={relatedPage === relatedTotalPage - 1}
              >
                &gt;
              </button>
            </div>
          </div>
        )}

        {/* Modal chọn màu/size */}
        <AnimatePresence>
          {product && ((product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0)) && showBuyNowModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4"
            >
              <Glow3DBox className="bg-white rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-md max-h-[90vh] overflow-y-auto flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-10 relative">
                {/* Ảnh sản phẩm */}
                <Glow3DBox className="flex flex-col items-center mb-2 cursor-pointer" >
                  <img
                    src={getImageByColor(selectedColor) || product.image_url || (Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image')}
                    alt={product.name}
                    className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-2xl border-2 border-primary-100 shadow-lg mb-2 transition-transform duration-500"
                    onClick={() => setShowImageLightbox(true)}
                    style={{ cursor: 'zoom-in' }}
                  />
                </Glow3DBox>
                <h3 className="text-lg sm:text-2xl font-extrabold text-primary-700 mb-2 sm:mb-4 text-center">Chọn màu và size</h3>
                {Array.isArray(product?.colors) && product.colors.length > 0 && (
                  <div className="mb-4 w-full flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Màu sắc</label>
                    <div className="flex gap-3 flex-wrap justify-center">
                      {product.colors.map((color: string, idx: number) => (
                        <button
                          key={color}
                          type="button"
                          className={`px-4 sm:px-5 py-2 rounded-full border font-semibold shadow transition-all duration-200 text-sm sm:text-base focus:outline-none ${selectedColor === color ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'}`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(product?.sizes) && product.sizes.length > 0 && (
                  <div className="mb-4 w-full flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Kích cỡ</label>
                    <div className="w-full overflow-x-auto pb-2 -mx-4 px-4">
                      <div className="flex gap-3 min-w-max">
                        {product.sizes.map((size: string, idx: number) => (
                          <button
                            key={size}
                            type="button"
                            className={`px-5 py-2 rounded-full border font-semibold shadow transition-all duration-200 text-base focus:outline-none whitespace-nowrap ${selectedSize === size ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white border-primary-600 scale-105 shadow-lg' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-50 hover:text-primary-700'}`}
                            onClick={() => setSelectedSize(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Số lượng và tồn kho */}
                <div className="mb-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full justify-center">
                  <div className="flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Số lượng</label>
                    <QuantityBox3D>
                      <ButtonGradientGlow onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</ButtonGradientGlow>
                      <input type="number" min={1} max={product.stock} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))} className="w-16 text-center border rounded-xl font-semibold text-lg" />
                      <ButtonGradientGlow onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} disabled={quantity >= product.stock}>+</ButtonGradientGlow>
                    </QuantityBox3D>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Tồn kho</label>
                    <div className="text-primary-600 font-bold text-xl">{product.stock}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 sm:mt-6 w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBuyNowModal(false)}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 shadow"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.07, rotateY: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmBuyNow}
                    className="px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-500 rounded-xl shadow hover:from-purple-500 hover:to-primary-600 transition-all"
                  >
                    Xác nhận
                  </motion.button>
                </div>
              </Glow3DBox>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Lightbox xem ảnh lớn */}
        <AnimatePresence>
          {showImageLightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center"
              onClick={() => setShowImageLightbox(false)}
            >
              <motion.img
                src={product?.image_url || (Array.isArray(product?.image_urls) && product?.image_urls.length > 0 ? product?.image_urls[0] : 'https://via.placeholder.com/800x800?text=No+Image')}
                alt={product?.name}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="max-w-[90vw] max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white cursor-zoom-out"
                onClick={e => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductDetailPage;