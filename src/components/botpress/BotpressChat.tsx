"use client"
import React, { useEffect } from 'react';

const BotpressChat = () => {
  useEffect(() => {
    const injectScript = document.createElement('script');
    injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.0/inject.js';
    injectScript.defer = true;
    document.body.appendChild(injectScript);

    const configScript = document.createElement('script');
    configScript.src = 'https://files.bpcontent.cloud/2025/06/24/10/20250624100947-39W09PA9.js';
    configScript.defer = true;
    document.body.appendChild(configScript);

    return () => {
      // Cleanup scripts when component unmounts
      if (document.body.contains(injectScript)) {
        document.body.removeChild(injectScript);
      }
      if (document.body.contains(configScript)) {
        document.body.removeChild(configScript);
      }
    };
  }, []);

  return null;
};

export default BotpressChat; 