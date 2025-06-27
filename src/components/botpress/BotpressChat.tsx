"use client"
import React, { useEffect } from 'react';

const BotpressChat = () => {
  useEffect(() => {
    // Kiểm tra đã có Botpress chưa
    if (typeof window !== 'undefined' && (window as any).botpressWebChat) {
      return;
    }

    // Inject script Botpress
    const script = document.createElement('script');
    script.src = 'https://cdn.botpress.cloud/webchat/v3.0/inject.js';
    script.async = true;
    
    script.onload = () => {
      // Đợi Botpress sẵn sàng rồi chạy config
      const checkReady = setInterval(() => {
        if ((window as any).botpress) {
          clearInterval(checkReady);
          (window as any).botpress.init({
            botId: "df1b453e-defc-402c-b495-e1ab4a987861",
            clientId: "0da59460-c99e-448b-ad25-d7f4c988774d",
            configuration: {
              version: "v1",
              botName: "LUXE-Fashion",
              botAvatar: "https://files.bpcontent.cloud/2025/06/24/10/20250624102122-0LBMRIA6.jpeg",
              fabImage: "https://files.bpcontent.cloud/2025/06/24/10/20250624101524-DDECIKPX.jpeg",
              website: {},
              email: {
                title: "nguyenthuantai00@gmail.com",
                link: "nguyenthuantai00@gmail.com"
              },
              phone: {
                title: "0559669281",
                link: "0559669281"
              },
              termsOfService: {},
              privacyPolicy: {},
              color: "#6e56cf",
              variant: "soft",
              headerVariant: "glass",
              themeMode: "light",
              fontFamily: "inter",
              radius: 4,
              feedbackEnabled: false,
              footer: "[⚡ by Botpress](https://botpress.com/?from=webchat)",
              showOnInit: true // Tự động hiện chat khi vào web
            }
          });
        }
      }, 200);
    };
    
    script.onerror = () => {
      console.error('Failed to load Botpress');
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup nếu cần
      try {
        if (typeof window !== 'undefined' && (window as any).botpressWebChat) {
          (window as any).botpressWebChat.close();
        }
      } catch (error) {}
    };
  }, []);

  return null;
};

export default BotpressChat; 