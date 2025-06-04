import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useFlashSale } from '../../contexts/FlashSaleContext';
import Logo from '../ui/Logo';
import { supabase } from '../../lib/supabase';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const { hasNewFlashSale } = useFlashSale();
  
  // Change header style on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Gợi ý sản phẩm khi nhập
  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }
      // Thử lấy cả image_urls và image_url, nếu lỗi thì chỉ lấy image_url
      let { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_urls, image_url')
        .ilike('name', `%${searchQuery}%`)
        .limit(6);
      if (error) {
        // Nếu lỗi do image_urls không tồn tại, thử lại chỉ với image_url
        const retry = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .ilike('name', `%${searchQuery}%`)
          .limit(6);
        // Bổ sung image_urls là mảng rỗng để đúng kiểu
        data = (retry.data || []).map(item => ({ ...item, image_urls: [] }));
      }
      if (active) setSuggestions(data || []);
    };
    fetchSuggestions();
    return () => { active = false; };
  }, [searchQuery]);

  // Fetch categories from Supabase
  useEffect(() => {
    setCategoriesLoading(true);
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (!error) setCategories(data || []);
      setCategoriesLoading(false);
    };
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 shadow-lg backdrop-blur-md py-2'
          : 'bg-gradient-to-r from-primary-600 via-purple-500 to-blue-500 py-4 shadow-md'
      }`}
      style={{ boxShadow: isScrolled ? '0 8px 32px 0 rgba(31,38,135,0.10)' : undefined }}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="z-10 flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.08, rotate: 3 }}>
              <Logo dark={isScrolled} />
            </motion.div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`text-base font-semibold px-3 py-2 rounded-lg transition-all duration-200 ${
                isScrolled
                  ? 'text-primary-700 hover:bg-primary-50'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Trang chủ
            </Link>
            {/* Flash Sale */}
            <Link
              to="/flash-sale"
              className={`text-base font-semibold px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 relative ${
                isScrolled
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-white hover:bg-white/10'
              }`}
              style={{ fontWeight: 700 }}
            >
              <span className="text-lg">🔥</span> Flash Sale
              {hasNewFlashSale && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Link>
            {/* Dropdown Sản phẩm */}
            <div className="relative group" onMouseEnter={() => setShowCategoryDropdown(true)} onMouseLeave={() => setShowCategoryDropdown(false)}>
              <Link
                to="/products"
                className={`text-base font-semibold px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  isScrolled
                    ? 'text-primary-700 hover:bg-primary-50'
                    : 'text-white hover:bg-white/10'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowCategoryDropdown(false)}
              >
                Sản phẩm
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </Link>
              {/* Dropdown danh mục */}
              <div
                className={`absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-primary-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible ${showCategoryDropdown ? 'opacity-100 visible' : ''} pointer-events-auto transition-all duration-200 z-50`}
                onMouseEnter={() => setShowCategoryDropdown(true)}
                onMouseLeave={() => setShowCategoryDropdown(false)}
              >
                {categoriesLoading ? (
                  <div className="px-6 py-4 text-center text-primary-500">Đang tải...</div>
                ) : (
                  categories.length > 0 ? (
                    categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/products?category=${cat.id}`}
                        className="block px-6 py-3 text-primary-700 hover:bg-primary-50 transition-colors"
                        onClick={() => setShowCategoryDropdown(false)}
                      >
                        {cat.name}
                      </Link>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-center text-gray-400">Không có danh mục</div>
                  )
                )}
              </div>
            </div>
            {/* Dropdown Giới thiệu */}
            <div className="relative group">
              <button
                className={`text-base font-semibold px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  isScrolled
                    ? 'text-primary-700 hover:bg-primary-50'
                    : 'text-white hover:bg-white/10'
                }`}
                type="button"
              >
                Giới thiệu
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div
                className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-primary-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible pointer-events-auto transition-all duration-200 z-50"
                onMouseEnter={e => { e.currentTarget.classList.add('opacity-100', 'visible'); }}
                onMouseLeave={e => { e.currentTarget.classList.remove('opacity-100', 'visible'); }}
              >
                <Link
                  to="/about"
                  className="block px-6 py-3 text-primary-700 hover:bg-primary-50 rounded-t-xl transition-colors"
                >
                  Về chúng tôi
                </Link>
                <Link
                  to="/mission"
                  className="block px-6 py-3 text-primary-700 hover:bg-primary-50 rounded-b-xl transition-colors"
                >
                  Sứ mệnh
                </Link>
              </div>
            </div>
          </nav>
          
          {/* Search Bar Desktop */}
          <form
            onSubmit={handleSearch}
            className={`hidden md:flex items-center bg-white/90 rounded-full shadow-md px-3 py-1 transition-all duration-300 border-2 ${
              isScrolled ? 'border-primary-200' : 'border-transparent'
            } focus-within:border-primary-500 w-72 relative`}
            style={{ boxShadow: '0 2px 12px 0 rgba(31,38,135,0.08)' }}
          >
            <Search className="text-primary-500 mr-2" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="flex-1 bg-transparent outline-none text-primary-800 placeholder:text-primary-400"
              autoComplete="off"
            />
            <button
              type="submit"
              className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-semibold shadow hover:from-purple-500 hover:to-primary-500 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Tìm
            </button>
            {/* Gợi ý sản phẩm */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-lg border border-primary-100 mt-2 z-50 max-h-80 overflow-y-auto animate-fade-in">
                {suggestions.map((p) => {
                  const img = Array.isArray(p.image_urls) && p.image_urls.length > 0
                    ? p.image_urls[0]
                    : (p.image_url || 'https://via.placeholder.com/60x60?text=No+Image');
                  return (
                    <Link
                      key={p.id + '-suggestion'}
                      to={`/products/${p.id}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-primary-50 transition rounded-lg"
                      onClick={() => setShowSuggestions(false)}
                    >
                      <img
                        src={img}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg border"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-primary-700 line-clamp-1">{p.name}</div>
                        <div className="text-sm text-gray-500">{p.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </form>
          
          {/* Right Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search Icon Mobile */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`md:hidden p-2 rounded-full ${
                isScrolled ? 'text-primary-700 hover:bg-primary-100' : 'text-white hover:bg-white/10'
              } transition-colors`}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            
            {/* User Account Dropdown */}
            <div className="relative">
              <button
                id="profile-icon"
                onClick={() => setShowUserDropdown((v) => !v)}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                className={`p-2 rounded-full ${
                  isScrolled ? 'text-primary-700 hover:bg-primary-100' : 'text-white hover:bg-white/10'
                } transition-colors flex items-center justify-center focus:outline-none`}
                aria-label="Account"
                tabIndex={0}
              >
                <User size={20} />
              </button>
              <AnimatePresence>
                {showUserDropdown && !user && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95, rotateX: -30 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, boxShadow: '0 16px 48px 0 rgba(80,60,200,0.18)' }}
                    exit={{ opacity: 0, y: -10, scale: 0.95, rotateX: -30 }}
                    transition={{ duration: 0.22, type: 'spring', stiffness: 180, damping: 18 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl ring-1 ring-black/10 z-50 p-2 origin-top-right"
                    style={{ perspective: 800 }}
                  >
                    <Link
                      to="/login"
                      className="block px-4 py-2 rounded-lg text-primary-700 font-semibold hover:bg-primary-50 transition-all"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2 rounded-lg text-primary-700 font-semibold hover:bg-primary-50 transition-all"
                    >
                      Đăng ký
                    </Link>
                  </motion.div>
                )}
                {showUserDropdown && user && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95, rotateX: -30 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, boxShadow: '0 16px 48px 0 rgba(80,60,200,0.18)' }}
                    exit={{ opacity: 0, y: -10, scale: 0.95, rotateX: -30 }}
                    transition={{ duration: 0.22, type: 'spring', stiffness: 180, damping: 18 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl ring-1 ring-black/10 z-50 p-2 origin-top-right"
                    style={{ perspective: 800 }}
                  >
                    <Link
                      to="/profile"
                      className="block px-4 py-2 rounded-lg text-primary-700 font-semibold hover:bg-primary-50 transition-all"
                    >
                      Trang cá nhân
                    </Link>
                    <button
                      onClick={async () => { await signOut(); window.location.reload(); }}
                      className="block w-full text-left px-4 py-2 rounded-lg text-red-600 font-semibold hover:bg-red-50 transition-all mt-1"
                    >
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Cart */}
            <Link
              to="/cart"
              className={`p-2 rounded-full relative ${
                isScrolled ? 'text-primary-700 hover:bg-primary-100' : 'text-white hover:bg-white/10'
              } transition-colors`}
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-tr from-primary-600 to-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
            
            {/* Admin Dashboard Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`hidden md:inline-block text-sm font-medium px-3 py-1 rounded-lg shadow transition-colors ${
                  isScrolled
                    ? 'bg-primary-700 text-white hover:bg-primary-600'
                    : 'bg-white text-primary-700 hover:bg-primary-50'
                }`}
              >
                Admin
              </Link>
            )}
            
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full md:hidden ${
                isScrolled ? 'text-primary-700 hover:bg-primary-100' : 'text-white hover:bg-white/10'
              } transition-colors`}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        
        {/* Search Bar (Slide Down) Mobile */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden md:hidden"
            >
              <form onSubmit={handleSearch} className="flex items-center bg-white rounded-full shadow px-2 py-2 border-2 border-primary-200 focus-within:border-primary-500 w-full">
                <Search className="text-primary-500 mr-2" size={20} />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-primary-800 placeholder:text-primary-400"
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-semibold shadow hover:from-purple-500 hover:to-primary-500 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Tìm
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-white z-40 md:hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <Logo />
                <button onClick={() => setIsMenuOpen(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>
              <nav className="space-y-4">
                <Link
                  to="/"
                  className="block text-lg font-semibold text-primary-700 hover:text-primary-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Trang chủ
                </Link>
                <Link
                  to="/flash-sale"
                  className="block text-lg font-semibold text-red-600 hover:text-red-500 flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl">🔥</span> Flash Sale
                </Link>
                {/* Dropdown Sản phẩm mobile */}
                <div>
                  <Link
                    to="/products"
                    className={`text-base font-semibold px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                      isScrolled
                        ? 'text-primary-700 hover:bg-primary-50'
                        : 'text-white hover:bg-white/10'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowCategoryDropdown(false)}
                  >
                    Sản phẩm
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </Link>
                  {showCategoryDropdown && (
                    <div className="pl-4 border-l border-primary-100 mt-1">
                      {categoriesLoading ? (
                        <div className="py-2 text-primary-500">Đang tải...</div>
                      ) : (
                        categories.length > 0 ? (
                          categories.map((cat) => (
                            <Link
                              key={cat.id}
                              to={`/products?category=${cat.id}`}
                              className="block py-2 text-primary-700 hover:text-primary-600 transition-colors"
                              onClick={() => { setIsMenuOpen(false); setShowCategoryDropdown(false); }}
                            >
                              {cat.name}
                            </Link>
                          ))
                        ) : (
                          <div className="py-2 text-gray-400">Không có danh mục</div>
                        )
                      )}
                    </div>
                  )}
                </div>
                {/*<Link
                  to="/contact"
                  className="block py-2 text-lg font-medium text-primary-700 hover:text-primary-600 transition-colors"
                >
                  Liên hệ
                </Link>*/}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block py-2 text-lg font-medium text-primary-700 hover:text-primary-600 transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </nav>
              
              <div className="py-6 border-t border-primary-100">
                {user && typeof user === 'object' ? (
                  <div className="space-y-4">
                    <Link 
                      to="/profile" 
                      className="block py-2 text-primary-700 hover:text-primary-600 transition-colors"
                    >
                      My Account
                    </Link>
                    <Link 
                      to="/cart" 
                      className="block py-2 text-primary-700 hover:text-primary-600 transition-colors"
                    >
                      Shopping Cart ({itemCount})
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Link 
                      to="/login" 
                      className="block py-2 text-primary-700 hover:text-primary-600 transition-colors"
                    >
                      Log In
                    </Link>
                    <Link 
                      to="/register" 
                      className="block py-2 text-primary-700 hover:text-primary-600 transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay for mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-30 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;