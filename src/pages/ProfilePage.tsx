/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, MapPin, ShoppingBag, Heart, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultAvatar from '../assets/default-avatar.svg';
import { useWishlist } from '../hooks/useWishlist';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'info', label: 'Thông tin cá nhân', icon: <User size={20} /> },
  { key: 'address', label: 'Địa chỉ giao hàng', icon: <MapPin size={20} /> },
  { key: 'wishlist', label: 'Yêu thích', icon: <Heart size={20} /> },
  { key: 'password', label: 'Đổi mật khẩu', icon: <KeyRound size={20} /> },
  { key: 'orders', label: 'Đơn hàng của tôi', icon: <ShoppingBag size={20} /> },
  { key: 'orders_waiting', label: 'Chờ vận chuyển', icon: <ShoppingBag size={20} /> },
  { key: 'orders_shipping', label: 'Đã vận chuyển', icon: <ShoppingBag size={20} /> },
  { key: 'orders_review', label: 'Cần đánh giá', icon: <ShoppingBag size={20} /> },
  { key: 'orders_return', label: 'Trả hàng', icon: <ShoppingBag size={20} /> },
];

type Address = {
  id: string;
  user_id: string;
  address_line: string;
  ward: string;
  district: string;
  city: string;
  label: string;
  is_default: boolean;
};



// Thêm các constants cho validation
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ProfilePage() {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [formData, setFormData] = useState({
    full_name: userInfo?.full_name || '',
    phone: userInfo?.phone || '',
    email: user?.email || '',
    avatar_url: userInfo?.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Địa chỉ giao hàng hiện đại
  const [addresses, setAddresses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    id: string;
    label: string;
    type: string;
    full_address: string;
    lat: number | null;
    lng: number | null;
    country: string;
    is_default: boolean;
  }>({
    id: '',
    label: '',
    type: '',
    full_address: '',
    lat: null,
    lng: null,
    country: 'VN',
    is_default: false,
  });
  

  // Thêm state cho địa chỉ mới
  const [addressForm, setAddressForm] = useState({
    city: '',
    city_code: '',
    district: '',
    district_code: '',
    ward: '',
    ward_code: '',
    address_line: '',
    label: '',
    is_default: false,
  });
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    show: boolean;
  }[]>([]);

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [totalAddresses, setTotalAddresses] = useState(0);
  const maxPages = 3;

  // Thêm state previewUrl để xem trước ảnh
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Thêm state để mở modal xem ảnh
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // State cho modal xác nhận xóa địa chỉ
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  // Thêm state cho đơn hàng
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Thêm state cho modal chi tiết đơn hàng
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Thêm state cho modal yêu cầu hoàn tiền
  const [showRefundRequestModal, setShowRefundRequestModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // State cho đổi mật khẩu
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const { wishlist, removeFromWishlist, loading: wishlistLoading, fetchWishlist } = useWishlist();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);

  // Đưa các state/ref hiệu ứng card wishlist ra ngoài map
  const cardRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
  const [cardStyles, setCardStyles] = useState<{[id: string]: any}>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [borderPos, setBorderPos] = useState<{[id: string]: {x: number, y: number}}>({});

  const handleCardMouseMove = (productId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const box = cardRefs.current[productId];
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBorderPos(prev => ({ ...prev, [productId]: { x, y } }));
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 10;
    const rotateX = -((e.clientY - rect.top - centerY) / centerY) * 10;
    setCardStyles(prev => ({
      ...prev,
      [productId]: {
        transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` ,
        background: '#fff',
        transition: 'transform 0.18s cubic-bezier(.25,.46,.45,.94)',
        border: hoveredCard === productId
          ? '4px solid transparent'
          : '4px solid #fff',
        borderImage: hoveredCard === productId
          ? `radial-gradient(circle at ${(borderPos[productId]?.x ?? 50)}% ${(borderPos[productId]?.y ?? 50)}%, #a78bfa 0%, #7c3aed 60%, transparent 100%) 1` 
          : 'none',
        boxSizing: 'border-box',
      }
    }));
  };
  const handleCardMouseLeave = (productId: string) => {
    setHoveredCard(null);
    setCardStyles(prev => ({
      ...prev,
      [productId]: {
        transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
        background: '#fff',
        border: '4px solid #fff',
        borderImage: 'none',
        transition: 'transform 0.3s, border 0.3s',
        boxSizing: 'border-box',
      }
    }));
  };
  const handleCardMouseEnter = (productId: string) => setHoveredCard(productId);

  // Thêm hàm fetchUserInfo để đồng bộ dữ liệu user sau khi upload avatar
  const fetchUserInfo = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && data) setUserInfo(data);
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => setAddresses(data || []));
  }, [user, modalOpen]);

  // Lấy tỉnh/thành
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setCities(data));
  }, []);

  // Lấy avatar từ userInfo
  useEffect(() => {
    if (userInfo?.avatar_url) {
      setAvatarUrl(userInfo.avatar_url);
      setAvatarError(false);
    }
  }, [userInfo]);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!user || wishlist.length === 0) {
        setWishlistProducts([]);
        return;
      }
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', wishlist);
      if (!error && data) setWishlistProducts(data);
    };
    fetchWishlistProducts();
  }, [user, wishlist]);

  const handleSelect = async (address: string) => {
    setForm(f => ({ ...f, full_address: address }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
    if (!addressForm.city || !addressForm.district || !addressForm.ward || !addressForm.address_line) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Vui lòng nhập đầy đủ thông tin địa chỉ!',
        show: true
      }]);
      return;
    }

      const addressData = {
        user_id: user.id,
        city: addressForm.city,
        district: addressForm.district,
        ward: addressForm.ward,
        address_line: addressForm.address_line,
        label: addressForm.label || null,
        is_default: addressForm.is_default
      };

      let response;
    if (form.id) {
        response = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', form.id);
      } else {
        response = await supabase
          .from('addresses')
          .insert([addressData]);
      }

      if (response.error) {
        throw response.error;
      }

      setModalOpen(false);
      setNotifications(prev => [...prev, {
        type: 'success',
        message: form.id ? 'Cập nhật địa chỉ thành công!' : 'Thêm địa chỉ thành công!',
        show: true
      }]);

      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      
        setAddresses(data || []);
    } catch (error) {
      console.error('Error saving address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi lưu địa chỉ. Vui lòng thử lại!',
        show: true
      }]);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteModalOpen(true);
    setAddressToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressToDelete);
      if (error) throw error;
      setAddresses(addresses.filter(a => a.id !== addressToDelete));
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Xóa địa chỉ thành công!',
        show: true
      }]);
    } catch (error) {
      console.error('Error deleting address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi xóa địa chỉ. Vui lòng thử lại!',
        show: true
      }]);
    }
    setDeleteModalOpen(false);
    setAddressToDelete(null);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    
    try {
      // Reset tất cả địa chỉ về không mặc định
      const { error: resetError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      if (resetError) throw resetError;

      // Set địa chỉ mới làm mặc định
      const { error: updateError } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (updateError) throw updateError;

      // Cập nhật state
    setAddresses(addresses.map(a => ({ ...a, is_default: a.id === id })));
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Đã cập nhật địa chỉ mặc định!',
        show: true
      }]);
    } catch (error) {
      console.error('Error setting default address:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi xảy ra khi cập nhật địa chỉ mặc định. Vui lòng thử lại!',
        show: true
      }]);
    }
  };

  // Lấy danh sách địa chỉ khi component mount hoặc khi đổi trang
  useEffect(() => {
    if (!user) return;

    const fetchAddresses = async () => {
      try {
        // Lấy tổng số địa chỉ
        const { count } = await supabase
          .from('addresses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setTotalAddresses(count || 0);

        // Lấy địa chỉ theo trang
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .range(from, to);
        if (error) throw error;
        setAddresses(data || []);
      } catch (error) {
        setNotifications(prev => [...prev, {
          type: 'error',
          message: 'Lỗi khi tải danh sách địa chỉ',
          show: true
        }]);
      }
    };

    fetchAddresses();
  }, [user, currentPage, modalOpen]);

  // Đơn giản hóa xử lý lỗi ảnh
  const handleImageError = () => {
    setAvatarError(true);
    // Tự động chuyển sang ảnh mặc định
    setAvatarUrl(defaultAvatar);
  };

  // Đơn giản hóa lấy URL avatar
  const getValidAvatarUrl = (url: string | null): string => {
    if (!url || url === defaultAvatar) return defaultAvatar;
    return url;
  };
    
  // Đơn giản hóa render avatar
  const renderAvatar = () => {
    const avatarSrc = getValidAvatarUrl(avatarUrl);
    
    return (
      <div className="relative w-24 h-24">
        <img
          src={avatarSrc}
          alt="avatar"
          className="w-full h-full rounded-full object-cover border-4 border-primary-200 shadow-xl cursor-pointer"
          onClick={() => setShowAvatarModal(true)}
          onError={handleImageError}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    );
  };

  // Cập nhật thông tin cá nhân
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const updateData: any = {
      full_name: formData.full_name,
      phone: formData.phone,
      avatar_url: formData.avatar_url,
    };
    Object.keys(updateData).forEach(
      (key) => (updateData[key] === undefined || updateData[key] === null) && delete updateData[key]
    );
    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
    setLoading(false);
    if (error) {
      setMessage(error.message || 'Cập nhật thất bại');
    } else {
      setMessage('Cập nhật thành công!');
      setIsEditing(false);
      window.location.reload();
    }
  };

  // Badge thành viên
  const badge = userInfo?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
  const badgeColor = userInfo?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500';

  // Khi chọn tỉnh/thành
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city_code = e.target.value;
    const city = cities.find(c => c.code === Number(city_code));
    setAddressForm(f => ({
      ...f,
      city: city.name,
      city_code,
      district: '',
      district_code: '',
      ward: '',
      ward_code: ''
    }));
    setDistricts([]);
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/p/${city_code}?depth=2`)
      .then(res => res.json())
      .then(data => setDistricts(data.districts));
  };

  // Khi chọn quận/huyện
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const district_code = e.target.value;
    const district = districts.find(d => d.code === Number(district_code));
    setAddressForm(f => ({
      ...f,
      district: district.name,
      district_code,
      ward: '',
      ward_code: ''
    }));
    setWards([]);
    fetch(`https://provinces.open-api.vn/api/d/${district_code}?depth=2`)
      .then(res => res.json())
      .then(data => setWards(data.wards));
  };

  // Khi chọn phường/xã
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ward_code = e.target.value;
    const ward = wards.find(w => w.code === Number(ward_code));
    setAddressForm(f => ({
      ...f,
      ward: ward.name,
      ward_code
    }));
  };

  // Upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    // Kiểm tra loại file hợp lệ
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Chỉ hỗ trợ file ảnh JPG, PNG, GIF, WEBP', show: true }
      ]);
      setLoading(false);
      return;
    }
    // Kiểm tra dung lượng file
    if (file.size > 10* 1024 * 1024) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Dung lượng ảnh tối đa 5MB', show: true }
      ]);
      setLoading(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    // Không set header gì thêm, chỉ truyền đúng File
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.log('Upload error:', uploadError);
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Lỗi upload ảnh', show: true }
      ]);
      setLoading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setAvatarUrl(data.publicUrl);
    setFormData((f) => ({ ...f, avatar_url: data.publicUrl }));
    // Cập nhật avatar_url vào database
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id);
    if (updateError) {
      setNotifications(prev => [
        ...prev,
        { type: 'error', message: 'Lỗi cập nhật avatar', show: true }
      ]);
    } else {
      setNotifications(prev => [
        ...prev,
        { type: 'success', message: 'Cập nhật avatar thành công!', show: true }
      ]);
    }
    setLoading(false);
  };

  // Lấy danh sách đơn hàng của user
  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        // Parse items nếu là string
        const safeOrders = (data || []).map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        setOrders(safeOrders);
        setLoadingOrders(false);
        return null;
      });
  }, [user]);

  // Thêm type cho order
  type Order = {
    id: string;
    user_id: string;
    items: any[];
    refund_request?: boolean;
    refund_status?: 'pending' | 'approved' | 'rejected';
    refund_reason?: string;
    refund_image_url?: string;
    [key: string]: any;
  };

  // Thêm state cho review
  // const [reviewMessage, setReviewMessage] = useState('');
  // const [reviewLoading, setReviewLoading] = useState(false);

  // Cập nhật subscription với type checking
  useEffect(() => {
    if (!user) return;

    // Lấy danh sách đơn hàng ban đầu
    setLoadingOrders(true);
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        const safeOrders = (data || []).map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        setOrders(safeOrders);
        setLoadingOrders(false);
      });

    // Subscribe to changes
    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Cập nhật orders state khi có thay đổi
          setOrders(currentOrders => {
            const newOrders = [...currentOrders];
            const newOrder = payload.new as Order;
            const index = newOrders.findIndex(order => order.id === newOrder.id);
            
            if (index !== -1) {
              // Update existing order
              newOrders[index] = {
                ...newOrder,
                items: typeof newOrder.items === 'string' ? JSON.parse(newOrder.items) : newOrder.items
              };
            } else {
              // Add new order
              newOrders.unshift({
                ...newOrder,
                items: typeof newOrder.items === 'string' ? JSON.parse(newOrder.items) : newOrder.items
              });
            }
            
            return newOrders;
          });

          // Hiển thị thông báo khi có thay đổi
          if (payload.eventType === 'UPDATE') {
            const order = payload.new as Order;
            if (order.refund_status === 'approved') {
              setNotifications(prev => [...prev, {
                type: 'success',
                message: 'Yêu cầu hoàn tiền đã được duyệt!',
                show: true
              }]);
            } else if (order.refund_status === 'rejected') {
              setNotifications(prev => [...prev, {
                type: 'error',
                message: 'Yêu cầu hoàn tiền đã bị từ chối!',
                show: true
              }]);
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Thêm hàm hoàn tiền đơn hàng
  const handleRefund = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      if (error) throw error;
      setShowOrderModal(false);
      setSelectedOrder(null);
      setNotifications(prev => [...prev, { type: 'success', message: 'Đã hoàn tiền/hủy đơn thành công!', show: true }]);
      // Reload lại danh sách đơn hàng
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            // Parse items nếu là string
            const safeOrders = (data || []).map(order => ({
              ...order,
              items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            }));
            setOrders(safeOrders);
            setLoadingOrders(false);
            return null;
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, { type: 'error', message: 'Có lỗi khi hoàn tiền/hủy đơn!', show: true }]);
    }
  };

  // Thêm hàm gửi yêu cầu hoàn tiền
  const handleRefundRequest = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          refund_request: true,
          refund_status: 'pending',
          refund_reason: refundReason
        })
        .eq('id', orderId);

      if (error) throw error;

      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Yêu cầu hoàn tiền đã được gửi thành công!',
        show: true
      }]);
      setShowRefundRequestModal(false);
      setRefundReason('');
      // Reload danh sách đơn hàng
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            // Parse items nếu là string
            const safeOrders = (data || []).map(order => ({
              ...order,
              items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            }));
            setOrders(safeOrders);
            setLoadingOrders(false);
            return null;
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi khi gửi yêu cầu hoàn tiền!',
        show: true
      }]);
    }
  };

  // Thêm hàm hủy yêu cầu hoàn tiền
  const handleCancelRefundRequest = async (orderId: string) => {
    try {
      // Lấy thông tin đơn hàng để biết đường dẫn ảnh
      const order = orders.find(o => o.id === orderId);
      let imagePath = null;
      if (order && order.refund_image_url) {
        // Lấy path từ publicUrl
        const url = order.refund_image_url;
        const match = url.match(/images\/(.+)$/);
        if (match) imagePath = match[1];
      }
      // Xóa ảnh trên storage nếu có
      if (imagePath) {
        await supabase.storage.from('images').remove([imagePath]);
      }
      // Cập nhật lại đơn hàng
      const { error } = await supabase
        .from('orders')
        .update({
          refund_request: false,
          refund_status: null,
          refund_reason: null,
          refund_image_url: null
        })
        .eq('id', orderId);
      if (error) throw error;
      setNotifications(prev => [...prev, {
        type: 'success',
        message: 'Đã hủy yêu cầu hoàn tiền!',
        show: true
      }]);
      setShowRefundRequestModal(false);
      setRefundReason('');
      setRefundImage(null);
      setShowOrderModal(false);
      // Cập nhật lại danh sách đơn hàng ngay
      if (user) {
        setLoadingOrders(true);
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            // Parse items nếu là string
            const safeOrders = (data || []).map(order => ({
              ...order,
              items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
            }));
            setOrders(safeOrders);
            setLoadingOrders(false);
            return null;
          });
      }
    } catch (err) {
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Có lỗi khi hủy yêu cầu hoàn tiền!',
        show: true
      }]);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage('');
    if (newPassword.length < 6) {
      setPwMessage('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('Mật khẩu mới không khớp!');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMessage('Đổi mật khẩu thất bại: ' + error.message);
    } else {
      setPwMessage('Đổi mật khẩu thành công!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // State phân trang cho wishlist
  const [wishlistPage, setWishlistPage] = useState(1);
  const wishlistPerPage = 3;
  const wishlistTotalPages = Math.ceil(wishlistProducts.length / wishlistPerPage);
  const paginatedWishlist = wishlistProducts.slice((wishlistPage-1)*wishlistPerPage, wishlistPage*wishlistPerPage);

  // State phân trang cho orders
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPerPage] = useState(2); // Số sản phẩm mỗi trang
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  // Tính toán sản phẩm hiển thị cho trang hiện tại
  const paginatedOrders = useMemo(() => {
    const startIndex = (ordersPage - 1) * ordersPerPage;
    return orders.slice(startIndex, startIndex + ordersPerPage);
  }, [orders, ordersPage, ordersPerPage]);

  // Cập nhật tổng số trang khi orders thay đổi
  useEffect(() => {
    setOrdersTotalPages(Math.ceil(orders.length / ordersPerPage));
  }, [orders, ordersPerPage]);

  // 1. Thêm state cho upload ảnh hoàn tiền
  const [refundImage, setRefundImage] = useState<File | null>(null);
  const [refundImageUrl, setRefundImageUrl] = useState<string | null>(null);
  const [uploadingRefund, setUploadingRefund] = useState(false);

  // 4. Thêm hàm xử lý upload ảnh và gửi yêu cầu hoàn tiền
  const handleRefundRequestWithImage = async (orderId: string) => {
    if (!refundImage) {
      setNotifications(prev => [...prev, { type: 'error', message: 'Vui lòng chọn ảnh minh chứng!', show: true }]);
      return;
    }
    setUploadingRefund(true);
    try {
      // Upload ảnh lên bucket images
      const fileExt = refundImage.name.split('.').pop();
      const filePath = `refunds/${orderId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, refundImage, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      
      // Gửi yêu cầu hoàn tiền kèm ảnh
      const { error } = await supabase
        .from('orders')
        .update({
          refund_request: true,
          refund_status: 'pending',
          refund_reason: refundReason,
          refund_image_url: data.publicUrl
        })
        .eq('id', orderId);

      if (error) throw error;

      setNotifications(prev => [...prev, { 
        type: 'success', 
        message: 'Yêu cầu hoàn tiền đã được gửi thành công! Vui lòng chờ xác nhận từ admin.',
        show: true 
      }]);
      
      setShowRefundRequestModal(false);
      setRefundReason('');
      setRefundImage(null);
      setShowOrderModal(false);
      // Cập nhật lại selectedOrder để modal hiển thị ngay thông tin hoàn tiền
      setSelectedOrder((prev: any) => prev && prev.id === orderId ? {
        ...prev,
        refund_request: true,
        refund_status: 'pending',
        refund_reason: refundReason,
        refund_image_url: data.publicUrl
      } : prev);
      // Cập nhật lại orders để hiển thị thông tin hoàn tiền ngay
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                refund_request: true,
                refund_status: 'pending',
                refund_reason: refundReason,
                refund_image_url: data.publicUrl
              }
            : order
        )
      );
    } catch (err) {
      setNotifications(prev => [...prev, { type: 'error', message: 'Có lỗi khi gửi yêu cầu hoàn tiền!', show: true }]);
    }
    setUploadingRefund(false);
  };

  // State phân trang cho đơn chờ vận chuyển
  const [ordersWaitingPage, setOrdersWaitingPage] = useState(1);
  const ordersWaitingPerPage = 3;
  const ordersWaitingList = orders.filter(o => o.delivery_status === 'pending' || o.delivery_status === 'processing');
  const ordersWaitingTotalPages = Math.ceil(ordersWaitingList.length / ordersWaitingPerPage);
  const paginatedOrdersWaiting = ordersWaitingList.slice((ordersWaitingPage-1)*ordersWaitingPerPage, ordersWaitingPage*ordersWaitingPerPage);

  // State cho đánh giá sản phẩm
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // Thêm state cho phân trang đơn đã vận chuyển
  const [ordersShippingPage, setOrdersShippingPage] = useState(1);
  const [productComments, setProductComments] = useState<{[key: string]: string}>({});

  // State phân trang cho sản phẩm cần đánh giá
  const [reviewPage, setReviewPage] = useState(1);
  const reviewPerPage = 2;

  // State phân trang cho đơn trả hàng
  const [returnPage, setReturnPage] = useState(1);
  const returnPerPage = 2;
  const returnOrders = orders.filter(o => o.delivery_status === 'delivered');
  const returnTotalPages = Math.ceil(returnOrders.length / returnPerPage);
  const paginatedReturnOrders = returnOrders.slice((returnPage-1)*returnPerPage, returnPage*returnPerPage);

  return (
    <div className="relative min-h-screen pt-32 pb-12 px-2 md:px-0 bg-gray-50 overflow-hidden">
      {/* Hiệu ứng động 3D blob */}
      <motion.div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-gradient-to-br from-primary-400 via-purple-400 to-blue-400 rounded-full blur-3xl opacity-30 z-0 pointer-events-none"
        initial={{ scale: 0.8, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.8, 1.1, 0.9, 1], 
          rotate: [0, 30, -20, 0], 
          x: [0, 40, -30, 0],
          y: [0, 20, -10, 0],
          opacity: [0.25, 0.3, 0.2, 0.25] 
        }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        style={{ filter: 'blur(80px)' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-[340px] h-[340px] bg-gradient-to-br from-blue-300 via-purple-200 to-white rounded-full blur-3xl opacity-20 z-0 pointer-events-none"
        initial={{ scale: 0.7, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.7, 1.05, 0.8, 1], 
          rotate: [0, -25, 15, 0], 
          x: [0, -30, 20, 0],
          y: [0, -15, 10, 0],
          opacity: [0.15, 0.2, 0.1, 0.15] 
        }}
        transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        style={{ filter: 'blur(60px)' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[180px] h-[180px] bg-gradient-to-br from-purple-200 via-white to-blue-200 rounded-full blur-2xl opacity-10 z-0 pointer-events-none"
        initial={{ scale: 0.6, rotate: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.6, 1.2, 0.8, 1], 
          rotate: [0, 15, -10, 0], 
          x: [0, 20, -10, 0],
          y: [0, 10, -5, 0],
          opacity: [0.08, 0.12, 0.1, 0.08] 
        }}
        transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
        style={{ filter: 'blur(40px)' }}
      />
      {/* Lớp nền trắng mờ cho vùng nội dung chính */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-white/80" />
      <div className="container mx-auto px-2 md:px-4 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex flex-col md:flex-row w-full">
              <div className="w-full md:w-64 bg-gradient-to-br from-primary-500 to-purple-600 p-4 md:p-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-6">
                  <motion.div
                    initial={{ scale: 0.8, y: 40, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    className="relative"
                  >
                    {renderAvatar()}
                    <label className="absolute bottom-2 right-2 bg-white text-primary-600 rounded-full p-2 cursor-pointer shadow-lg hover:bg-primary-50 transition">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarChange}
                        disabled={loading}
                      />
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <path 
                          fill="currentColor" 
                          d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm7.5-4.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0ZM12 2v2m0 16v2m10-10h-2M4 12H2" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </label>
                  </motion.div>
                  <div className="text-center mt-4">
                    <div className="text-lg font-bold text-white drop-shadow-lg">{userInfo?.full_name || 'Chưa cập nhật'}</div>
                    <div className="text-white/80 text-sm">{user?.email}</div>
                    <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold text-white rounded-full shadow ${badgeColor}`}>{badge}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-4 w-full">
                  {TABS.map((tab) => (
                    <motion.button
                      key={tab.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        activeTab === tab.key
                          ? 'bg-white text-primary-700 shadow-lg'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.icon}
                      <span className="font-medium">{tab.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 p-2 md:p-6 w-full min-w-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'info' && (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-2xl font-bold mb-4 text-primary-700">Thông tin cá nhân</h2>
                        {message && <div className="mb-3 text-green-600 font-semibold text-center bg-green-50 rounded-lg py-2 shadow">{message}</div>}
                        <AnimatePresence>
                          {isEditing ? (
                            <motion.form
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                              onSubmit={handleSubmit}
                              className="space-y-4 max-w-lg mx-auto"
                            >
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input
                                  type="text"
                                  value={formData.full_name}
                                  onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                <input
                                  type="tel"
                                  value={formData.phone}
                                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                  type="email"
                                  value={formData.email}
                                  disabled
                                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-100 shadow-sm cursor-not-allowed"
                                />
                              </div>
                              <div className="flex gap-4 mt-6">
                                <button type="submit" disabled={loading} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-semibold">
                                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                                <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 font-semibold">
                                  Hủy
                                </button>
                              </div>
                            </motion.form>
                          ) : (
                            <motion.div
                              initial={{ scale: 0.98, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.98, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                              className="space-y-4"
                            >
                              <div>
                                <span className="font-semibold text-gray-700">Họ và tên:</span> {userInfo?.full_name?.trim() ? userInfo.full_name : 'Chưa cập nhật'}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Số điện thoại:</span> {userInfo?.phone || 'Chưa cập nhật'}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Email:</span> {user?.email}
                              </div>
                              <button onClick={() => setIsEditing(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-semibold mt-4">
                                Chỉnh sửa thông tin
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'address' && (
                    <motion.div
                      key="address"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-primary-700">Địa chỉ giao hàng</h2>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { 
                            setModalOpen(true); 
                            setForm({ 
                              id: '', 
                              label: '', 
                              type: '', 
                              full_address: '', 
                              lat: null, 
                              lng: null, 
                              country: 'VN', 
                              is_default: false 
                            }); 
                          }}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg shadow-lg hover:bg-primary-600 transition-colors"
                        >
                          Thêm địa chỉ mới
                        </motion.button>
                      </div>

                      {addresses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <MapPin size={64} className="text-primary-400 mb-4" />
                          <div className="text-lg font-semibold text-primary-600 mb-2">Bạn chưa có địa chỉ giao hàng nào</div>
                          <div className="text-gray-500 mb-4">Hãy thêm địa chỉ để thuận tiện cho việc đặt hàng!</div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {addresses
                              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                              .map((address) => (
                                <motion.div
                                  key={address.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow"
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">
                                      {address.type === 'home' ? '🏠' : address.type === 'office' ? '🏢' : address.type === 'gym' ? '🏋️' : '📍'}
                                    </span>
                                    <span className="font-bold text-lg text-primary-700">{address.label || address.type || 'Địa chỉ'}</span>
                                    {address.is_default && (
                                      <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full">Mặc định</span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-gray-800 mb-1">
                                    {address.address_line}, {address.ward}, {address.district}, {address.city}
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => { 
                                        setModalOpen(true); 
                                        setForm(address); 
                                      }}
                                      className="px-3 py-1 rounded bg-primary-100 text-primary-700 font-semibold hover:bg-primary-200 transition"
                                    >
                                      Sửa
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleDelete(address.id)}
                                      className="px-3 py-1 rounded bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition"
                                    >
                                      Xóa
                                    </motion.button>
                                    {!address.is_default && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSetDefault(address.id)}
                                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
                                      >
                                        Đặt làm mặc định
                                      </motion.button>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                          </div>

                          {/* Pagination */}
                          {totalAddresses > itemsPerPage && (
                            <div className="flex justify-center mt-6">
                              <div className="flex space-x-2">
                                {Array.from({ length: Math.min(Math.ceil(totalAddresses / itemsPerPage), maxPages) }, (_, i) => (
                                  <motion.button
                                    key={i + 1}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg ${
                                      currentPage === i + 1
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {i + 1}
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Address Modal */}
                      <AnimatePresence>
                        {modalOpen && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                          >
                            <motion.form
                              initial={{ scale: 0.9, y: 20 }}
                              animate={{ scale: 1, y: 0 }}
                              exit={{ scale: 0.9, y: 20 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              onSubmit={handleSave}
                              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg space-y-4"
                            >
                              <h3 className="text-xl font-bold mb-4 text-primary-700">
                                {form.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                                  <select 
                                    value={addressForm.city_code} 
                                    onChange={handleCityChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                  >
                                    <option value="">Chọn tỉnh/thành</option>
                                    {cities.map(city => (
                                      <option key={city.code} value={city.code}>{city.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                                  <select 
                                    value={addressForm.district_code} 
                                    onChange={handleDistrictChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    disabled={!addressForm.city_code}
                                  >
                                    <option value="">Chọn quận/huyện</option>
                                    {districts.map(d => (
                                      <option key={d.code} value={d.code}>{d.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Phường/Xã</label>
                                  <select 
                                    value={addressForm.ward_code} 
                                    onChange={handleWardChange} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    disabled={!addressForm.district_code}
                                  >
                                    <option value="">Chọn phường/xã</option>
                                    {wards.map(w => (
                                      <option key={w.code} value={w.code}>{w.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Địa chỉ cụ thể</label>
                                  <input
                                    value={addressForm.address_line} 
                                    onChange={e => setAddressForm(f => ({ ...f, address_line: e.target.value }))} 
                                    required 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    placeholder="Số nhà, tên đường, tòa nhà..." 
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Nhãn địa chỉ</label>
                                  <input 
                                    value={addressForm.label} 
                                    onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                                    placeholder="Nhà, Công ty, ..." 
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    type="checkbox"
                                    checked={addressForm.is_default} 
                                    onChange={e => setAddressForm(f => ({ ...f, is_default: e.target.checked }))} 
                                    id="is_default"
                                  />
                                  <label htmlFor="is_default" className="text-sm">Đặt làm mặc định</label>
                                </div>
                              </div>
                              <div className="mt-6 flex justify-end gap-3">
                                <button
                                  onClick={() => {
                                    setShowRefundRequestModal(false);
                                    setRefundReason('');
                                    setRefundImage(null);
                                    setShowOrderModal(false);
                                  }}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                  Hủy
                                </button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="submit"
                                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                                >
                                  Lưu
                                </motion.button>
                              </div>
                            </motion.form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </motion.div>
                  )}

                  {activeTab === 'wishlist' && (
                    <motion.div
                      key="wishlist"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Sản phẩm yêu thích</h2>
                      {wishlistLoading ? (
                        <div className="text-gray-500">Đang tải danh sách yêu thích...</div>
                      ) : wishlistProducts.length === 0 ? (
                        <div className="text-gray-500">Bạn chưa có sản phẩm yêu thích nào.</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {paginatedWishlist.map(product => (
                              <div
                                key={product.id}
                                ref={el => cardRefs.current[product.id] = el}
                                className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center relative group w-full max-w-xs mx-auto min-h-[420px]"
                                style={cardStyles[product.id]}
                                onMouseMove={e => handleCardMouseMove(product.id, e)}
                                onMouseLeave={() => handleCardMouseLeave(product.id)}
                                onMouseEnter={() => handleCardMouseEnter(product.id)}
                              >
                                <motion.button
                                  onClick={async () => {
                                    await removeFromWishlist(product.id);
                                    fetchWishlist();
                                  }}
                                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 z-10"
                                  title="Bỏ yêu thích"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Heart size={28} className="fill-red-500" />
                                </motion.button>
                                <motion.img
                                  src={product.image_url || (Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image')}
                                  alt={product.name}
                                  className="w-40 h-40 object-cover rounded-xl mb-3 border"
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                />
                                <div className="font-semibold text-primary-700 text-center line-clamp-2 mb-2 text-lg">{product.name}</div>
                                <div className="text-primary-600 font-bold mb-3 text-xl">{product.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
                                <div className="flex-1" />
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-full flex justify-center"
                                >
                                  <Link to={`/products/${product.id}`} className="mt-auto px-5 py-2 bg-primary-500 text-white rounded-lg font-semibold shadow hover:bg-primary-600 transition-all text-base w-full text-center">Xem chi tiết</Link>
                                </motion.div>
                              </div>
                            ))}
                          </div>
                          {/* Phân trang wishlist */}
                          {wishlistTotalPages > 1 && (
                            <div className="flex justify-center mt-8 gap-2">
                              {Array.from({ length: wishlistTotalPages }, (_, i) => (
                                <button
                                  key={i+1}
                                  onClick={() => setWishlistPage(i+1)}
                                  className={`w-10 h-10 rounded-lg font-bold ${wishlistPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {i+1}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'password' && (
                    <motion.div
                      key="password"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đổi mật khẩu</h2>
                      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                        <div>
                          <label className="block mb-1">Mật khẩu mới</label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div>
                          <label className="block mb-1">Xác nhận mật khẩu mới</label>
                          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="w-full border rounded px-3 py-2" />
                        </div>
                        <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded" disabled={pwLoading}>
                          {pwLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                        </button>
                        {pwMessage && <div className={`mt-2 ${pwMessage.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>{pwMessage}</div>}
                      </form>
                    </motion.div>
                  )}
                  {activeTab === 'orders' && (
                    <motion.div
                      key="orders"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn hàng của tôi</h2>
                      {loadingOrders ? (
                        <div className="text-gray-500">Đang tải đơn hàng...</div>
                      ) : orders.length === 0 ? (
                        <div className="text-gray-500">Bạn chưa có đơn hàng nào.</div>
                      ) : (
                        <>
                          <div className="space-y-6">
                            {paginatedOrders.map(order => (
                              <div key={order.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 cursor-pointer hover:shadow-lg transition"
                                onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                  <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                                  <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="flex flex-wrap gap-4 items-center mb-2">
                                  <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.status}</span></div>
                                </div>
                                <div className="text-sm text-gray-700 mb-2">Sản phẩm:</div>
                                <ul className="pl-4 list-disc text-sm text-gray-700">
                                  {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                    <li key={idx}>
                                      {item.name} x {item.quantity} ({item.price?.toLocaleString('vi-VN')}đ)
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          {/* Phân trang orders */}
                          {ordersTotalPages > 1 && (
                            <div className="flex justify-center mt-8 gap-2">
                              {Array.from({ length: ordersTotalPages }, (_, i) => (
                                <button
                                  key={i+1}
                                  onClick={() => setOrdersPage(i+1)}
                                  className={`w-10 h-10 rounded-lg font-bold ${ordersPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {i+1}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {/* Modal chi tiết đơn hàng */}
                      <AnimatePresence>
                        {showOrderModal && selectedOrder && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                          >
                            <motion.div
                              initial={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                              animate={{ scale: 1, rotateY: 0, y: 0, opacity: 1 }}
                              exit={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative border border-primary-100"
                              style={{ boxShadow: '0 12px 48px 0 rgba(80,0,200,0.18)' }}
                            >
                              <button
                                onClick={() => setShowOrderModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition"
                              >×</button>
                              <h3 className="text-2xl font-extrabold mb-6 text-primary-700 drop-shadow">Chi tiết đơn hàng</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="space-y-2 text-sm text-gray-700">
                                  <div>Mã đơn: <span className="font-semibold">{selectedOrder.id}</span></div>
                                  <div>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                                  <div>Trạng thái: <span className="font-semibold text-blue-600">{selectedOrder.status}</span></div>
                                  <div>Tổng tiền: <span className="font-bold text-primary-600">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div>Giảm giá: <span className="text-green-600">{selectedOrder.discount?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phí vận chuyển: <span className="text-gray-800">{selectedOrder.shipping_fee?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phương thức thanh toán: <span className="text-gray-800">{selectedOrder.payment_method || '---'}</span></div>
                                  <div>Địa chỉ giao hàng: <span className="text-gray-800">{selectedOrder.address_id || '---'}</span></div>
                                  {selectedOrder.note && (
                                    <div>Ghi chú: <span className="text-gray-800">{selectedOrder.note}</span></div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="font-semibold text-primary-700 mb-2">Sản phẩm:</div>
                                  <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-2">
                                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                      <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.04, rotateY: 4 }}
                                        className="flex gap-4 items-center bg-primary-50 rounded-xl p-3 shadow-sm hover:shadow-lg transition cursor-pointer"
                                      >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-primary-100 shadow">
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                            style={{ boxShadow: '0 2px 8px 0 rgba(80,0,200,0.10)' }}
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                          <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                          <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                        </div>
                                        <div className="font-bold text-primary-600 whitespace-nowrap">{item.price?.toLocaleString('vi-VN')}đ</div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </motion.div>
                  )}
                  
                  {activeTab === 'orders_waiting' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn chờ vận chuyển</h2>
                      {loadingOrders ? (
                        <div className="text-gray-500">Đang tải đơn hàng...</div>
                      ) : ordersWaitingList.length === 0 ? (
                        <div className="text-gray-500">Không có đơn hàng nào chờ vận chuyển.</div>
                      ) : (
                        <>
                          <div className="space-y-6">
                            {paginatedOrdersWaiting.map(order => (
                              <div key={order.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 cursor-pointer hover:shadow-lg transition"
                                onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                  <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                                  <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="flex flex-wrap gap-4 items-center mb-2">
                                  <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.delivery_status}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Phân trang */}
                          {ordersWaitingTotalPages > 1 && (
                            <div className="flex justify-center mt-8 gap-2">
                              {Array.from({ length: ordersWaitingTotalPages }, (_, i) => (
                                <button
                                  key={i+1}
                                  onClick={() => setOrdersWaitingPage(i+1)}
                                  className={`w-10 h-10 rounded-lg font-bold ${ordersWaitingPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {i+1}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {/* Modal chi tiết đơn hàng */}
                      <AnimatePresence>
                        {showOrderModal && selectedOrder && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                          >
                            <motion.div
                              initial={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                              animate={{ scale: 1, rotateY: 0, y: 0, opacity: 1 }}
                              exit={{ scale: 0.92, rotateY: 12, y: 40, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative border border-primary-100"
                              style={{ boxShadow: '0 12px 48px 0 rgba(80,0,200,0.18)' }}
                            >
                              <button
                                onClick={() => setShowOrderModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition"
                              >×</button>
                              <h3 className="text-2xl font-extrabold mb-6 text-primary-700 drop-shadow">Chi tiết đơn hàng</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="space-y-2 text-sm text-gray-700">
                                  <div>Mã đơn: <span className="font-semibold">{selectedOrder.id}</span></div>
                                  <div>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                                  <div>Trạng thái: <span className="font-semibold text-blue-600">{selectedOrder.delivery_status}</span></div>
                                  <div>Tổng tiền: <span className="font-bold text-primary-600">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div>Giảm giá: <span className="text-green-600">{selectedOrder.discount?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phí vận chuyển: <span className="text-gray-800">{selectedOrder.shipping_fee?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phương thức thanh toán: <span className="text-gray-800">{selectedOrder.payment_method || '---'}</span></div>
                                  <div>Địa chỉ giao hàng: <span className="text-gray-800">{selectedOrder.address_id || '---'}</span></div>
                                  {selectedOrder.note && (
                                    <div>Ghi chú: <span className="text-gray-800">{selectedOrder.note}</span></div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="font-semibold text-primary-700 mb-2">Sản phẩm:</div>
                                  <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-2">
                                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                      <motion.div
                                        key={idx}
                                        whileHover={{ scale: 1.04, rotateY: 4 }}
                                        className="flex gap-4 items-center bg-primary-50 rounded-xl p-3 shadow-sm hover:shadow-lg transition cursor-pointer"
                                      >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-primary-100 shadow">
                                          <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                            style={{ boxShadow: '0 2px 8px 0 rgba(80,0,200,0.10)' }}
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                          <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                          <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                        </div>
                                        <div className="font-bold text-primary-600 whitespace-nowrap">{item.price?.toLocaleString('vi-VN')}đ</div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </motion.div>
                  )}
                  {activeTab === 'orders_shipping' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn đã vận chuyển</h2>
                      {loadingOrders ? (
                        <div className="text-gray-500">Đang tải đơn hàng...</div>
                      ) : orders.filter(o => o.delivery_status === 'delivered').length === 0 ? (
                        <div className="text-gray-500">Không có đơn hàng nào đã giao.</div>
                      ) : (
                        <>
                          <div className="space-y-6">
                            {orders
                              .filter(o => o.delivery_status === 'delivered')
                              .slice((ordersShippingPage - 1) * 2, ordersShippingPage * 2)
                              .map(order => (
                                <div
                                  key={order.id}
                                  className="bg-white rounded-xl shadow p-4 border border-gray-100 mb-4 cursor-pointer hover:shadow-lg transition"
                                  onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                                >
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                    <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                                    <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                                  </div>
                                  <div className="flex flex-wrap gap-4 items-center mb-2">
                                    <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                    <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.delivery_status}</span></div>
                                  </div>
                                  <div className="font-semibold text-primary-700 mb-2">Sản phẩm đã giao:</div>
                                  <div className="flex flex-col gap-3">
                                    {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-4 bg-primary-50 rounded-xl p-3 shadow-sm">
                                        <img 
                                          src={item.image || (Array.isArray(item.image_urls) && item.image_urls.length > 0 ? item.image_urls[0] : 'https://via.placeholder.com/300x300?text=No+Image')} 
                                          alt={item.name} 
                                          className="w-16 h-16 rounded-xl object-cover border" 
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                          <div className="text-xs text-gray-500 truncate">
                                            {item.color && <>Màu: {item.color} </>}
                                            {item.size && <>- Size: {item.size}</>}
                                          </div>
                                          <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                          <div className="text-sm">Giá: <span className="font-bold text-primary-600">{item.price?.toLocaleString('vi-VN')}đ</span></div>
                                        </div>
                                        {!item.rating_productshipping ? (
                                          <button
                                            className="px-4 py-2 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500 transition"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSelectedOrder(order);
                                              setReviewProduct(item);
                                              setShowReviewModal(true);
                                              setReviewRating(5);
                                              setReviewMessage('');
                                              setReviewComment('');
                                            }}
                                          >
                                            Đánh giá
                                          </button>
                                        ) : (
                                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Đã đánh giá</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                          {/* Modal chi tiết đơn hàng */}
                          <AnimatePresence>
                            {showOrderModal && selectedOrder && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                              >
                                <motion.div
                                  initial={{ scale: 0.92, y: 40, opacity: 0 }}
                                  animate={{ scale: 1, y: 0, opacity: 1 }}
                                  exit={{ scale: 0.92, y: 40, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                                  className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative border border-primary-100"
                                >
                                  <button
                                    onClick={() => setShowOrderModal(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition"
                                  >×</button>
                                  <h3 className="text-2xl font-extrabold mb-6 text-primary-700 drop-shadow">Chi tiết đơn hàng</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <div>Mã đơn: <span className="font-semibold">{selectedOrder.id}</span></div>
                                      <div>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                                      <div>Trạng thái: <span className="font-semibold text-blue-600">{selectedOrder.delivery_status}</span></div>
                                      <div>Tổng tiền: <span className="font-bold text-primary-600">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                      <div>Giảm giá: <span className="text-green-600">{selectedOrder.discount?.toLocaleString('vi-VN') || 0}đ</span></div>
                                      <div>Phí vận chuyển: <span className="text-gray-800">{selectedOrder.shipping_fee?.toLocaleString('vi-VN') || 0}đ</span></div>
                                      <div>Phương thức thanh toán: <span className="text-gray-800">{selectedOrder.payment_method || '---'}</span></div>
                                      <div>Địa chỉ giao hàng: <span className="text-gray-800">{selectedOrder.address_id || '---'}</span></div>
                                      {selectedOrder.note && (
                                        <div>Ghi chú: <span className="text-gray-800">{selectedOrder.note}</span></div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <div className="font-semibold text-primary-700 mb-2">Sản phẩm:</div>
                                      <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-2">
                                        {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-4 bg-primary-50 rounded-xl p-3 shadow-sm">
                                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border" />
                                            <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                              <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                              <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                      {/* Phân trang */}
                      {Math.ceil(orders.filter(o => o.delivery_status === 'delivered').length / 2) > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                          {Array.from({ length: Math.ceil(orders.filter(o => o.delivery_status === 'delivered').length / 2) }, (_, i) => (
                            <button
                              key={i+1}
                              onClick={() => setOrdersShippingPage(i+1)}
                              className={`w-10 h-10 rounded-lg font-bold ${ordersShippingPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {i+1}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {activeTab === 'orders_review' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn cần đánh giá</h2>
                      {loadingOrders ? (
                        <div className="text-gray-500">Đang tải đơn hàng...</div>
                      ) : (() => {
                        // Gom tất cả sản phẩm chưa đánh giá từ các đơn đã giao
                        const reviewItems: {order: any, item: any}[] = [];
                        orders
                          .filter(o => o.delivery_status === 'delivered' && Array.isArray(o.items) && o.items.some((item: any) => !item.rating_productshipping))
                          .forEach(order => {
                            order.items.filter((item: any) => !item.rating_productshipping).forEach((item: any) => {
                              reviewItems.push({ order, item });
                            });
                          });
                        const totalReviewPages = Math.ceil(reviewItems.length / reviewPerPage);
                        const paginatedReviewItems = reviewItems.slice((reviewPage-1)*reviewPerPage, reviewPage*reviewPerPage);
                        if (reviewItems.length === 0) {
                          return <div className="text-gray-500">Không có đơn hàng nào cần đánh giá.</div>;
                        }
                        return (
                          <>
                            <div className="space-y-6">
                              {paginatedReviewItems.map(({order, item}, idx) => (
                                <div key={order.id + '-' + (item.product_id || item.id) + '-' + idx} className="bg-white rounded-xl shadow p-4 border border-gray-100 cursor-pointer hover:shadow-lg transition"
                                  onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                                >
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                    <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                                    <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                                  </div>
                                  <div className="flex flex-wrap gap-4 items-center mb-2">
                                    <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                    <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.delivery_status}</span></div>
                                  </div>
                                  <div className="font-semibold text-primary-700 mb-2">Sản phẩm chưa đánh giá:</div>
                                  <div className="flex items-center gap-4 bg-primary-50 rounded-xl p-3 shadow-sm">
                                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                      <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                      <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                      <div className="text-sm">Giá: <span className="font-bold text-primary-600">{item.price?.toLocaleString('vi-VN')}đ</span></div>
                                    </div>
                                    <button
                                      className="px-4 py-2 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500 transition"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setSelectedOrder(order);
                                        setReviewProduct(item);
                                        setShowReviewModal(true);
                                        setReviewRating(5);
                                        setReviewMessage('');
                                        setReviewComment('');
                                      }}
                                    >
                                      Đánh giá
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Phân trang */}
                            {totalReviewPages > 1 && (
                              <div className="flex justify-center mt-8 gap-2">
                                {Array.from({ length: totalReviewPages }, (_, i) => (
                                  <button
                                    key={i+1}
                                    onClick={() => setReviewPage(i+1)}
                                    className={`w-10 h-10 rounded-lg font-bold ${reviewPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                  >
                                    {i+1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                  {activeTab === 'orders_return' && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold mb-4 text-primary-700">Đơn trả hàng</h2>
                      {loadingOrders ? (
                        <div className="text-gray-500">Đang tải đơn hàng...</div>
                      ) : returnOrders.length === 0 ? (
                        <div className="text-gray-500">Không có đơn hàng nào trả hàng.</div>
                      ) : (
                        <>
                          <div className="space-y-6">
                            {paginatedReturnOrders.map(order => (
                              <div key={order.id} className="bg-white rounded-xl shadow p-4 border border-gray-100 cursor-pointer hover:shadow-lg transition"
                                onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                              >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                                  <div className="font-semibold text-primary-700">Mã đơn: {order.id}</div>
                                  <div className="text-gray-500 text-sm">Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}</div>
                                </div>
                                <div className="flex flex-wrap gap-4 items-center mb-2">
                                  <div className="text-sm">Tổng tiền: <span className="font-bold text-primary-600">{order.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div className="text-sm">Trạng thái: <span className="font-semibold text-blue-600">{order.delivery_status}</span></div>
                                </div>
                                {order.refund_request && (
                                  <div className="mt-4 p-4 rounded-lg bg-gray-50">
                                    <div className="font-semibold text-primary-700 mb-2">Trạng thái hoàn tiền:</div>
                                    <div className="flex items-center gap-2">
                                      {order.refund_status === 'pending' && (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                                          Đang chờ xác nhận
                                        </span>
                                      )}
                                      {order.refund_status === 'approved' && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                          Đã được duyệt
                                        </span>
                                      )}
                                      {order.refund_status === 'rejected' && (
                                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                                          Đã bị từ chối
                                        </span>
                                      )}
                                    </div>
                                    {/* Đã xóa lý do và ảnh minh chứng ở đây */}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Phân trang trả hàng */}
                          {returnTotalPages > 1 && (
                            <div className="flex justify-center mt-8 gap-2">
                              {Array.from({ length: returnTotalPages }, (_, i) => (
                                <button
                                  key={i+1}
                                  onClick={() => setReturnPage(i+1)}
                                  className={`w-10 h-10 rounded-lg font-bold ${returnPage === i+1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {i+1}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {/* Modal chi tiết đơn trả hàng */}
                      <AnimatePresence>
                        {showOrderModal && selectedOrder && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                          >
                            <motion.div
                              initial={{ scale: 0.92, y: 40, opacity: 0 }}
                              animate={{ scale: 1, y: 0, opacity: 1 }}
                              exit={{ scale: 0.92, y: 40, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative border border-primary-100"
                            >
                              <button
                                onClick={() => setShowOrderModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition"
                              >×</button>
                              <h3 className="text-2xl font-extrabold mb-6 text-primary-700 drop-shadow">Chi tiết đơn hàng</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="space-y-2 text-sm text-gray-700">
                                  <div>Mã đơn: <span className="font-semibold">{selectedOrder.id}</span></div>
                                  <div>Ngày đặt: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</div>
                                  <div>Trạng thái: <span className="font-semibold text-blue-600">{selectedOrder.delivery_status}</span></div>
                                  <div>Tổng tiền: <span className="font-bold text-primary-600">{selectedOrder.total_amount?.toLocaleString('vi-VN')}đ</span></div>
                                  <div>Giảm giá: <span className="text-green-600">{selectedOrder.discount?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phí vận chuyển: <span className="text-gray-800">{selectedOrder.shipping_fee?.toLocaleString('vi-VN') || 0}đ</span></div>
                                  <div>Phương thức thanh toán: <span className="text-gray-800">{selectedOrder.payment_method || '---'}</span></div>
                                  <div>Địa chỉ giao hàng: <span className="text-gray-800">{selectedOrder.address_id || '---'}</span></div>
                                  {selectedOrder.note && (
                                    <div>Ghi chú: <span className="text-gray-800">{selectedOrder.note}</span></div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="font-semibold text-primary-700 mb-2">Sản phẩm:</div>
                                  <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-2">
                                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-4 bg-primary-50 rounded-xl p-3 shadow-sm">
                                        <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-primary-700 truncate">{item.name}</div>
                                          <div className="text-xs text-gray-500 truncate">{item.color && <>Màu: {item.color} </>}{item.size && <>- Size: {item.size}</>}</div>
                                          <div className="text-sm">Số lượng: <span className="font-bold">{item.quantity}</span></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {/* Nút yêu cầu hoàn tiền hoặc hủy yêu cầu */}
                              <div className="flex gap-3 mt-6 justify-end">
                                {!selectedOrder.refund_request && (
                                  <button
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
                                    onClick={() => {
                                      setShowRefundRequestModal(true);
                                    }}
                                  >
                                    Yêu cầu hoàn tiền
                                  </button>
                                )}
                                {selectedOrder.refund_request && selectedOrder.refund_status === 'pending' && (
                                  <button
                                    className="px-4 py-2 bg-red-200 text-red-700 rounded-lg font-semibold hover:bg-red-300 transition"
                                    onClick={() => handleCancelRefundRequest(selectedOrder.id)}
                                    // Đóng modal chi tiết đơn hàng
                                  >
                                    Hủy yêu cầu hoàn tiền
                                  </button>
                                )}
                              </div>
                              {/* Thêm hiển thị lý do và ảnh minh chứng trong modal chi tiết đơn hàng */}
                              {selectedOrder.refund_request && (
                                <div className="mt-6 p-4 rounded-lg bg-gray-50">
                                  <div className="font-semibold text-primary-700 mb-2">Thông tin hoàn tiền:</div>
                                  <div className="flex items-center gap-2 mb-2">
                                    {selectedOrder.refund_status === 'pending' && (
                                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                                        Đang chờ xác nhận
                                      </span>
                                    )}
                                    {selectedOrder.refund_status === 'approved' && (
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                        Đã được duyệt
                                      </span>
                                    )}
                                    {selectedOrder.refund_status === 'rejected' && (
                                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                                        Đã bị từ chối
                                      </span>
                                    )}
                                  </div>
                                  {selectedOrder.refund_reason && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      <b>Lý do:</b> {selectedOrder.refund_reason}
                                    </div>
                                  )}
                                  {selectedOrder.refund_image_url && (
                                    <div className="mt-2">
                                      <img 
                                        src={selectedOrder.refund_image_url} 
                                        alt="Minh chứng hoàn tiền" 
                                        className="max-w-xs rounded-lg border"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal yêu cầu hoàn tiền */}
      <AnimatePresence>
        {showRefundRequestModal && selectedOrder && (
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
              <h3 className="text-xl font-bold mb-4 text-primary-700">Yêu cầu hoàn tiền</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh minh chứng hoàn tiền</label>
                  <input type="file" accept="image/*" onChange={e => setRefundImage(e.target.files?.[0] || null)} />
                  {refundImage && (
                    <img src={URL.createObjectURL(refundImage)} alt="preview" className="max-w-xs mt-2 rounded border" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do yêu cầu hoàn tiền</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Nhập lý do yêu cầu hoàn tiền..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefundRequestModal(false);
                    setRefundReason('');
                    setRefundImage(null);
                    setShowOrderModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleRefundRequestWithImage(selectedOrder.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600"
                  disabled={uploadingRefund}
                >
                  {uploadingRefund ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showReviewModal && selectedOrder && reviewProduct && (
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
            <h3 className="text-xl font-bold mb-4 text-primary-700">Đánh giá sản phẩm</h3>
            <div className="flex items-center gap-4 mb-4">
              <img src={reviewProduct.image} alt={reviewProduct.name} className="w-16 h-16 rounded-xl object-cover border" />
              <div>
                <div className="font-semibold text-primary-700">{reviewProduct.name}</div>
                <div className="text-xs text-gray-500">{reviewProduct.color && <>Màu: {reviewProduct.color} </>}{reviewProduct.size && <>- Size: {reviewProduct.size}</>}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className={star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}
                  style={{ fontSize: 32 }}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nhận xét của bạn</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                onClick={() => setShowReviewModal(false)}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                disabled={reviewLoading}
                onClick={async () => {
                  setReviewLoading(true);
                  setReviewMessage('');
                  try {
                    if (!user) throw new Error('Bạn cần đăng nhập!');
                    // Gửi đánh giá lên bảng reviews
                    const { error } = await supabase.from('reviews').insert({
                      product_id: reviewProduct.product_id || reviewProduct.id,
                      user_id: user.id,
                      rating: reviewRating,
                      comment: reviewComment,
                    });
                    if (error) throw error;
                    // Cập nhật trường rating_productshipping cho item đã đánh giá
                    const updatedItems = selectedOrder.items.map((item: any) =>
                      (item.product_id === (reviewProduct.product_id || reviewProduct.id) && item.color === reviewProduct.color && item.size === reviewProduct.size)
                        ? { ...item, rating_productshipping: true }
                        : item
                    );
                    // Update lại trường items của đơn hàng lên supabase
                    await supabase.from('orders').update({ items: updatedItems }).eq('id', selectedOrder.id);
                    setReviewMessage('Đánh giá thành công!');
                    setTimeout(() => {
                      setShowReviewModal(false);
                      setReviewProduct(null);
                      setReviewComment('');
                      // Reload danh sách đơn hàng
                      setLoadingOrders(true);
                      supabase
                        .from('orders')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .then(({ data, error }) => {
                          // Parse items nếu là string
                          const safeOrders = (data || []).map(order => ({
                            ...order,
                            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
                          }));
                          setOrders(safeOrders);
                          setLoadingOrders(false);
                          return null;
                        });
                    }, 1200);
                  } catch (err) {
                    setReviewMessage('Có lỗi, vui lòng thử lại!');
                  }
                  setReviewLoading(false);
                }}
              >
                {reviewLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
            {reviewMessage && <div className="text-center text-green-600 font-semibold">{reviewMessage}</div>}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
} 