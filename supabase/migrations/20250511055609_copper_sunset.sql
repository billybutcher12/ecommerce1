CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  image_url text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
-- BẢNG SẢN PHẨM (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  discount_price numeric,
  image_url text,
  colors text[] NOT NULL,
  sizes text[] NOT NULL,
  material text,
  washing_instruction text,
  season text,
  origin text,
  is_featured boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sold integer DEFAULT 0,
  stock integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
); 
select colors, sizes from products 
-- BẢNG ĐỊA CHỈ GIAO HÀNG (ADDRESSES)
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  city text NOT NULL,
  district text NOT NULL,
  ward text NOT NULL,
  address_line text NOT NULL,
  label text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  items jsonb NOT NULL, -- [{product_id, name, price, quantity, color, size, image}]
  subtotal numeric NOT NULL,
  orders ADD COLUMN shop_note text,
  shipping_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL, -- 'cod', 'bank', 'momo', ...
  voucher_id uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  refund BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  refund_reason TEXT,
  refund_image_url TEXT,
  refund_request BOOLEAN DEFAULT FALSE,
  refund_status TEXT DEFAULT NULL CHECK (refund_status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE orders ADD COLUMN shop_note text;
COMMENT ON COLUMN orders.shop_note IS 'Ghi chú cho cửa hàng từ khách hàng (ví dụ: giao giờ hành chính, gọi trước khi giao...)';

select * from orders
-- BẢNG ĐÁNH GIÁ SẢN PHẨM (REVIEWS)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL,
  max_discount numeric, -- Giá trị giảm tối đa cho voucher %
  quantity integer DEFAULT 1, -- Số lượng phát hành
  used integer DEFAULT 0, -- Số lượng đã dùng
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  min_order_value numeric DEFAULT 0,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_categories', 'specific_products')),
  applied_items uuid[], -- Danh sách ID sản phẩm/danh mục áp dụng
  is_active boolean DEFAULT true,
  user_id uuid REFERENCES users(id), -- Admin tạo voucher
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

create table public.user_cart_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  price decimal(10,2) not null,
  image text not null,
  quantity integer not null default 1,
  color text not null,
  size text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

CREATE TABLE IF NOT EXISTS contact (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

  -- Thêm các ràng buộc
  constraint user_cart_items_quantity_check check (quantity > 0),
  constraint user_cart_items_price_check check (price >= 0),
  
  -- Thêm unique constraint để tránh trùng lặp sản phẩm
  constraint unique_user_product_color_size unique (user_id, product_id, color, size)
);

create table if not exists public.wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, product_id)
);

-- Tạo indexes
create index user_cart_items_user_id_idx on public.user_cart_items(user_id);
create index user_cart_items_product_id_idx on public.user_cart_items(product_id);

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text,
  description text,
  image_url text NOT NULL,
  page TEXT DEFAULT 'product',
  position INTEGER DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

create table flashsale (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    start_time timestamp not null,
    end_time timestamp not null,
    discount_type text not null check (discount_type in ('percent', 'fixed')),
    discount_value numeric not null,
    is_active boolean default true,
    created_at timestamp default now()
);

create table flashsale_products (
    id uuid primary key default gen_random_uuid(),
    flashsale_id uuid references flashsale(id) on delete cascade,
    product_id uuid references products(id) on delete cascade
);

CREATE TABLE IF NOT EXISTS flashsale_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flashsale_id uuid REFERENCES flashsale(id) ON DELETE CASCADE,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL, -- Danh mục áp dụng (có thể null = tất cả)
    stock_op text,   -- >, >=, <, <=, == (so sánh tồn kho)
    stock_value numeric,
    price_op text,   -- >, >=, <, <=, == (so sánh giá)
    price_value numeric,
    sold_op text,    -- >, >=, <, <=, == (so sánh lượt bán)
    sold_value numeric,
    discount_type text not null check (discount_type in ('percent', 'fixed')),
    discount_value numeric not null,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
alter table public.user_cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table banners enable row level security;
alter table flashsale enable row level security;
alter table flashsale_products enable row level security;
alter table flashsale_rules enable row level security;

-- Chỉ admin được thêm
create policy "Only admin can insert flashsale_rules"
on flashsale_rules
for insert
with check (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được sửa
create policy "Only admin can update flashsale_rules"
on flashsale_rules
for update
using (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được xóa
create policy "Only admin can delete flashsale_rules"
on flashsale_rules
for delete
using (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Ai cũng xem được
create policy "Anyone can view flashsale_rules"
on flashsale_rules
for select
using (true);

-- Chỉ admin được thêm
create policy "Only admin can insert flashsale_products"
on flashsale_products
for insert
with check (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được sửa
create policy "Only admin can update flashsale_products"
on flashsale_products
for update
using (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được xóa
create policy "Only admin can delete flashsale_products"
on flashsale_products
for delete
using (
    exists (
      select 1 from users
      where users.id = auth.uid() and users.role = 'admin'
    )
);

-- Ai cũng xem được
create policy "Anyone can view flashsale_products"
on flashsale_products
for select
using (true);

-- Chỉ admin được thêm
create policy "Only admin can insert flashsale"
on flashsale
for insert
with check (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được sửa
create policy "Only admin can update flashsale"
on flashsale
for update
using (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Chỉ admin được xóa
create policy "Only admin can delete flashsale"
on flashsale
for delete
using (
  exists (
    select 1 from users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

create policy "Anyone can view flashsale"
on flashsale
for select
using (true);

-- Cho phép thêm banner (INSERT)
create policy "Allow insert for authenticated"
on banners
for insert
to authenticated
with check (true);

-- Cho phép xem banner (SELECT)
create policy "Allow select for everyone"
on banners
for select
using (true);

-- Cho phép sửa banner (UPDATE)
create policy "Allow update for authenticated"
on banners
for update
to authenticated
using (true);

-- Cho phép xóa banner (DELETE)
create policy "Allow delete for authenticated"
on banners
for delete
to authenticated
using (true);

-- Cho phép upload file (INSERT)
create policy "Allow upload for authenticated users"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'images');

-- Cho phép đọc file (SELECT)
create policy "Allow read for everyone"
on storage.objects
for select
using (bucket_id = 'images');

-- Cho phép xóa file (DELETE)
create policy "Allow delete for authenticated users"
on storage.objects
for delete
to authenticated
using (bucket_id = 'images');

create policy "Users can update their own wishlist"
  on wishlists
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own wishlist"
  on wishlists
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own wishlist"
  on wishlists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own wishlist"
  on wishlists
  for select
  to authenticated
  using (auth.uid() = user_id);

CREATE POLICY "User can update their own orders"
ON orders
FOR UPDATE
USING (user_id = auth.uid());

-- Chỉ cho phép user có role = 'admin' trong bảng users được xóa/cập nhật user
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Cho phép đọc tất cả voucher công khai hoặc voucher thuộc về user hiện tại
CREATE POLICY "Allow read public or own vouchers"
ON public.vouchers
FOR SELECT
USING (
  is_active = true
  AND (
    user_id IS NULL
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- User chỉ xem được đơn của mình
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User chỉ tạo đơn cho chính mình
CREATE POLICY "Users can create their own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin xem tất cả đơn
CREATE POLICY "Admins can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin cập nhật trạng thái đơn
CREATE POLICY "Admins can update order status"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Policy cho phép user xem giỏ hàng của chính mình
create policy "Users can view their own cart items"
  on public.user_cart_items for select
  using (auth.uid() = user_id);

-- Policy cho phép user thêm sản phẩm vào giỏ hàng
create policy "Users can insert their own cart items"
  on public.user_cart_items for insert
  with check (auth.uid() = user_id);

-- Policy cho phép user cập nhật giỏ hàng của mình
create policy "Users can update their own cart items"
  on public.user_cart_items for update
  using (auth.uid() = user_id);

-- Policy cho phép user xóa sản phẩm khỏi giỏ hàng
create policy "Users can delete their own cart items"
  on public.user_cart_items for delete
  using (auth.uid() = user_id);

-- Cho phép admin xem tất cả voucher (kể cả không hoạt động)
CREATE POLICY "Admins can view all vouchers"
  ON vouchers
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Cho phép admin thêm voucher mới
CREATE POLICY "Admins can insert vouchers"
  ON vouchers
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Cho phép admin cập nhật voucher
CREATE POLICY "Admins can update vouchers"
  ON vouchers
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Cho phép admin xóa voucher
CREATE POLICY "Admins can delete vouchers"
  ON vouchers
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view their own addresses"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
  ON addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage vouchers"
  ON vouchers
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view active vouchers"
  ON vouchers
  FOR SELECT
  USING (is_active = true AND (valid_from IS NULL OR valid_from <= now()) AND (valid_to IS NULL OR valid_to >= now()));

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Cho phép user đã đăng nhập upload ảnh danh mục
CREATE POLICY "Authenticated users can upload category image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- Cho phép user update file của chính mình
CREATE POLICY "Authenticated users can update their category image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid() IS NOT NULL);

-- Cho phép bất kỳ ai xem ảnh danh mục
CREATE POLICY "Anyone can view category images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Give public access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Cho phép user đã đăng nhập upload avatar
create policy "Authenticated users can upload avatar"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Cho phép user đã đăng nhập cập nhật avatar của chính mình
create policy "Authenticated users can update their avatar"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Cho phép bất kỳ ai đọc avatar (public read)
create policy "Public read access to avatars"
on storage.objects
for select
using (bucket_id = 'avatars');

-- Cho phép bất kỳ ai đọc file trong bucket images (public)
create policy "Public read access to images"
on storage.objects
for select
using (bucket_id = 'images');

-- Cho phép user đã đăng nhập upload file vào bucket images
create policy "Authenticated upload to images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'images');

-- Categories policies
CREATE POLICY "Anyone can view categories"
  ON categories
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Products policies
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Cho phép user upload file vào bucket avatars
CREATE POLICY "Authenticated users can upload avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Cho phép user update file của chính mình
CREATE POLICY "Authenticated users can update their avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Cho phép user xem chính mình hoặc admin xem tất cả
CREATE POLICY "Users and Admins can view users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Cho phép user update chính mình hoặc admin update tất cả
CREATE POLICY "Users and Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can create their own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update order status"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Order items policies
CREATE POLICY "Users can view their own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can create their own order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()
  ));

-- Cập nhật các policy để sử dụng bảng users thay vì profiles
CREATE POLICY "Users can update their own information"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Function to handle new user signup and create a profile
CREATE OR REPLACE FUNCTION public.handle_new_user_users()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    now(),
    new.raw_user_meta_data->>'avatar_url',
    'customer' -- luôn gán mặc định là customer
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo function set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger tự động cập nhật updated_at
create trigger set_updated_at
  before update on public.user_cart_items
  for each row
  execute function public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created_users ON auth.users;
CREATE TRIGGER on_auth_user_created_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_users();

CREATE POLICY "Allow public access" ON storage.objects
  FOR ALL USING (bucket_id = 'images');

   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Tạo function kiểm tra admin
CREATE OR REPLACE FUNCTION check_admin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM users WHERE role = 'admin') < 2 
     AND OLD.role = 'admin' 
     AND NEW.role = 'user' THEN
    RAISE EXCEPTION 'Cannot demote last admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger kiểm tra trước khi update role
CREATE TRIGGER ensure_admin_exists
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_admin_count();

select * from auth.users
select lock_type from products where name = 'Quần dài TailoredLinen'

select * from flashsale