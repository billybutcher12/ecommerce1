import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ArrowButton from './ArrowButton';

interface Banner {
  id: string | number;
  image_url: string;
  title?: string;
  description?: string;
  link?: string;
  buttonText?: string;
}

interface BannerSliderProps {
  banners: Banner[];
}

const BannerSlider = ({ banners }: BannerSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Preload images
    banners.forEach(banner => {
      const img = new window.Image();
      img.src = banner.image_url;
      img.onload = () => {
        if (currentIndex === banners.indexOf(banner)) {
          setIsLoading(false);
        }
      };
    });
  }, [banners, currentIndex]);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (banners.length === 0) return null;

  const current = banners[currentIndex];

  return (
    <div className="relative w-full aspect-[21/7] max-h-[708px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
          )}
          <img
            src={current.image_url}
            alt={current.title || ''}
            className="w-full h-full object-cover"
            onLoad={() => setIsLoading(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container mx-auto px-4 text-center">
              <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg"
              >
                {current.title || ''}
              </motion.h1>
              {current.description && (
                <motion.p
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl md:text-2xl text-white mb-8 max-w-2xl mx-auto drop-shadow"
                >
                  {current.description}
                </motion.p>
              )}
              {current.link && current.buttonText && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Link
                    to={current.link}
                    className="inline-block bg-white text-primary-700 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-primary-100 transform hover:scale-105 transition-all duration-300"
                  >
                    {current.buttonText}
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'bg-white scale-125' : 'bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <ArrowButton
        direction="left"
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex shadow-lg"
        size={44}
      />
      <ArrowButton
        direction="right"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex shadow-lg"
        size={44}
      />
    </div>
  );
};

export default BannerSlider; 