import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface FlashSaleRule {
  id: string;
  flashsale_id: string;
  category_id: string | null;
  stock_op: string | null;
  stock_value: number | null;
  price_op: string | null;
  price_value: number | null;
  sold_op: string | null;
  sold_value: number | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
}

export interface FlashSaleItem {
  id: string; // id của flashsale_products
  flashsale: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    is_active: boolean;
    created_at: string;
  };
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    description: string;
    stock: number;
    category_id?: string;
    sold?: number;
  };
}

export function useFlashSale() {
  const [items, setItems] = useState<FlashSaleItem[]>([]);
  const [rules, setRules] = useState<FlashSaleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlashSale = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('flashsale_products')
        .select(`
          *,
          flashsale:flashsale_id (
            id,
            name,
            start_time,
            end_time,
            discount_type,
            discount_value,
            is_active,
            created_at
          ),
          product:product_id (
            id,
            name,
            price,
            image_url,
            description,
            stock,
            category_id,
            sold
          )
        `);

      if (error) throw error;

      // Lọc ra các flash sale đang active
      const filtered = (data || []).filter((item: any) => item.flashsale && item.flashsale.is_active);
      setItems(filtered);

      // Lấy danh sách flashsale_id đang active
      const flashsaleIds = filtered.map((item: any) => item.flashsale.id);
      if (flashsaleIds.length > 0) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('flashsale_rules')
          .select('*')
          .in('flashsale_id', flashsaleIds);
        if (rulesError) throw rulesError;
        setRules(rulesData || []);
      } else {
        setRules([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu flash sale');
      console.error('Error fetching flash sale:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hàm so sánh theo toán tử
  function compare(op: string | null, a: number, b: number) {
    switch (op) {
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '==': return a === b;
      default: return true;
    }
  }

  // Tính giá sau khi giảm giá, ưu tiên rule động nếu có
  const calculateDiscountedPrice = (item: FlashSaleItem, customRules?: FlashSaleRule[]) => {
    const originalPrice = item.product.price;
    const allRules = customRules || rules;
    // Tìm rule phù hợp nhất (ưu tiên rule có category_id khớp, và thỏa mãn các điều kiện stock, price, sold)
    const matchedRule = allRules.find(rule => {
      if (rule.flashsale_id !== item.flashsale.id) return false;
      if (rule.category_id && rule.category_id !== item.product.category_id) return false;
      if (rule.stock_op && rule.stock_value !== null && !compare(rule.stock_op, item.product.stock ?? 0, rule.stock_value)) return false;
      if (rule.price_op && rule.price_value !== null && !compare(rule.price_op, originalPrice, rule.price_value)) return false;
      if (rule.sold_op && rule.sold_value !== null && !compare(rule.sold_op, item.product.sold ?? 0, rule.sold_value)) return false;
      return true;
    });
    if (matchedRule) {
      if (matchedRule.discount_type === 'percent') {
        return Math.round(originalPrice * (1 - matchedRule.discount_value / 100));
      } else {
        return Math.max(0, Math.round(originalPrice - matchedRule.discount_value));
      }
    }
    // Nếu không có rule động, dùng giảm giá mặc định của flash sale
    if (item.flashsale.discount_type === 'percent') {
      return Math.round(originalPrice * (1 - item.flashsale.discount_value / 100));
    } else {
      return Math.max(0, Math.round(originalPrice - item.flashsale.discount_value));
    }
  };

  // Kiểm tra xem flash sale có đang diễn ra không
  const isFlashSaleActive = (item: FlashSaleItem) => {
    const now = new Date();
    const start = new Date(item.flashsale.start_time);
    const end = new Date(item.flashsale.end_time);
    return now >= start && now <= end;
  };

  // Lấy thời gian còn lại của flash sale
  const getTimeLeft = (item: FlashSaleItem) => {
    const now = new Date();
    const end = new Date(item.flashsale.end_time);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      hours,
      minutes,
      seconds,
      total: diff
    };
  };

  useEffect(() => {
    fetchFlashSale();
    // Cập nhật dữ liệu mỗi phút
    const interval = setInterval(fetchFlashSale, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    items,
    rules,
    loading,
    error,
    calculateDiscountedPrice,
    isFlashSaleActive,
    getTimeLeft,
    refetch: fetchFlashSale
  };
} 