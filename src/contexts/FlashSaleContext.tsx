import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FlashSaleContextType {
  hasNewFlashSale: boolean;
  setHasNewFlashSale: (value: boolean) => void;
  checkNewFlashSale: () => Promise<void>;
}

const FlashSaleContext = createContext<FlashSaleContextType | undefined>(undefined);

export function FlashSaleProvider({ children }: { children: React.ReactNode }) {
  const [hasNewFlashSale, setHasNewFlashSale] = useState(false);

  const checkNewFlashSale = async () => {
    const { data, error } = await supabase
      .from('flashsale')
      .select('created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastFlashSale = new Date(data[0].created_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastFlashSale.getTime()) / (1000 * 60 * 60);
      
      // Nếu flash sale mới được tạo trong vòng 24 giờ
      if (diffHours <= 24) {
        setHasNewFlashSale(true);
      }
    }
  };

  useEffect(() => {
    checkNewFlashSale();
    // Kiểm tra mỗi 5 phút
    const interval = setInterval(checkNewFlashSale, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FlashSaleContext.Provider value={{ hasNewFlashSale, setHasNewFlashSale, checkNewFlashSale }}>
      {children}
    </FlashSaleContext.Provider>
  );
}

export function useFlashSale() {
  const context = useContext(FlashSaleContext);
  if (context === undefined) {
    throw new Error('useFlashSale must be used within a FlashSaleProvider');
  }
  return context;
} 