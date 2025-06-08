import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Send } from 'lucide-react';
import Logo from '../ui/Logo';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [playlist, setPlaylist] = useState<{url: string, name: string, storageName: string}[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songName, setSongName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(1);
  const [minimized, setMinimized] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleDeleteSong = async (index: number) => {
    try {
      const songToDelete = playlist[index];
      const fileName = songToDelete.storageName;
      // Xóa file từ storage
      const { error } = await supabase
        .storage
        .from('music')
        .remove([`music/${fileName}`]);
      if (error) throw error;
      // Cập nhật playlist
      const newPlaylist = playlist.filter((_, i) => i !== index);
      setPlaylist(newPlaylist);
      // Nếu đang phát bài bị xóa
      if (index === currentIndex) {
        if (newPlaylist.length > 0) {
          setCurrentIndex(0);
          setAudioUrl(newPlaylist[0].url);
          setSongName(newPlaylist[0].name);
        } else {
          setAudioUrl(null);
          setSongName('');
          setIsPlaying(false);
        }
      } else if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error('Lỗi khi xóa bài hát:', error);
    }
  };

  const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const ext = file.name.split('.').pop();
        const storageName = `${Date.now()}_${file.name}`;
        const filePath = `music/${storageName}`;
        const { error } = await supabase.storage.from('music').upload(filePath, file, { 
          upsert: true, 
          contentType: file.type 
        });
        if (error) throw error;
        const { data } = supabase.storage.from('music').getPublicUrl(filePath);
        return {
          url: data.publicUrl,
          name: file.name,
          storageName
        };
      });
      const newSongs = await Promise.all(uploadPromises);
      setPlaylist(prev => [...prev, ...newSongs]);
      // Nếu playlist trống, phát bài đầu tiên
      if (playlist.length === 0 && newSongs.length > 0) {
        setCurrentIndex(0);
        setAudioUrl(newSongs[0].url);
        setSongName(newSongs[0].name);
      }
    } catch (error) {
      console.error('Lỗi khi upload nhạc:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch nhạc từ database khi load trang
  const fetchMusicFromDB = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .storage
        .from('music')
        .list('music', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });
      if (error) throw error;
      if (!Array.isArray(data)) {
        setPlaylist([]);
        return;
      }
      const musicList = await Promise.all(
        data
          .filter(file => file.name.endsWith('.mp3'))
          .map(async (file) => {
            const fullPath = `music/${file.name}`;
            const { data: urlData } = supabase.storage.from('music').getPublicUrl(fullPath);
            return {
              url: urlData.publicUrl,
              name: file.name.replace(/^\d+_/, ''), // Xóa timestamp prefix để hiển thị
              storageName: file.name // Lưu tên thật trong storage
            };
          })
      );
      setPlaylist(musicList);
      if (musicList.length > 0) {
        setCurrentIndex(0);
        setAudioUrl(musicList[0].url);
        setSongName(musicList[0].name);
      }
    } catch (error) {
      console.error('Lỗi khi tải nhạc:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMusicFromDB();
  }, []);

  // Cập nhật volume thực tế cho audio, thêm audioUrl vào dependency để khi đổi bài vẫn giữ volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioUrl]);

  // Điều khiển play/pause thực tế
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  // Hàm format thời gian mm:ss
  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <footer className="bg-secondary-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div>
            <Link to="/">
              <Logo dark={false} />
            </Link>
            <p className="mt-4 text-secondary-300 text-sm leading-relaxed">
              Your premium fashion destination for the latest styles and trends. Quality meets elegance in every piece.
            </p>
            <div className="mt-6 flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary-300 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          {/* Shop Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=women" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Women
                </Link>
              </li>
              <li>
                <Link to="/products?category=men" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Men
                </Link>
              </li>
              <li>
                <Link to="/products?category=accessories" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Accessories
                </Link>
              </li>
              <li>
                <Link to="/products?featured=true" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/products?sale=true" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Sale
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Account Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/profile/orders" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Order History
                </Link>
              </li>
              <li>
                <Link to="/profile/wishlist" className="text-secondary-300 hover:text-white transition-colors text-sm">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Newsletter Column */}
          <div>
            <h3 className="font-serif text-lg font-medium mb-4">Stay Updated</h3>
            <p className="text-secondary-300 text-sm mb-4">
              Subscribe to our newsletter for updates on new arrivals, trends, and exclusive offers.
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="bg-secondary-800 border border-secondary-700 text-white px-4 py-2 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm w-full"
              />
              <button 
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-r flex items-center justify-center transition-colors"
                aria-label="Subscribe"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="pt-8 border-t border-secondary-800 text-center md:flex md:justify-between md:items-center">
          <p className="text-secondary-400 text-sm">
            &copy; {currentYear} LUXE Fashion. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex flex-wrap justify-center md:justify-end gap-4">
            <Link to="/privacy-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Terms of Service
            </Link>
            <Link to="/shipping-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Shipping Policy
            </Link>
            <Link to="/refund-policy" className="text-secondary-400 hover:text-white text-xs transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
      {/* Mini music player góc phải với hiệu ứng 3D */}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col items-end gap-3">
        {minimized ? (
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={() => setMinimized(false)}
              className="rounded-full shadow-lg p-4 transition-all duration-300 focus:outline-none border-2 border-white bg-gradient-to-br from-[#e0c3fc] to-white hover:from-[#a259ec] hover:to-[#e0c3fc]"
              aria-label="Mở trình phát nhạc"
              title="Mở trình phát nhạc"
              style={{
                boxShadow: '0 4px 24px 0 #e0c3fc',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#a259ec" strokeWidth={2.5} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13" />
                <circle cx="6" cy="18" r="3" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            className="cyberpunk-player relative rounded-xl shadow-2xl p-3 flex flex-col items-center gap-2 w-[180px] sm:w-[220px] max-w-[90vw] min-h-[120px] border-2 border-pink-500 before:absolute before:inset-0 before:rounded-xl before:z-[-1]"
            style={{
              background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #ff0080 100%)',
              boxShadow: '0 0 32px 4px #ff00cc, 0 0 64px 8px #00fff0, 0 0 0 4px #fff1 inset',
              border: '2px solid #ff00cc',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center gap-1 w-full justify-between">
              <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  accept="audio/mp3" 
                  onChange={handleMultipleUpload} 
                  multiple
                  className="hidden" 
                  id="music-upload" 
                />
                <label 
                  htmlFor="music-upload" 
                  className="cursor-pointer bg-gradient-to-r from-blue-500 to-orange-400 hover:from-blue-600 hover:to-orange-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md transition-all duration-200"
                >
                  {isUploading ? 'Đang tải...' : 'Tải nhạc'}
                </label>
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="text-white hover:text-blue-100 p-1"
                  title="Playlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-white hover:text-blue-100 p-1" title="Lên đầu">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button onClick={() => setMinimized(true)} className="text-white hover:text-blue-100 ml-1 p-1" title="Thu nhỏ">
                  <svg width="20" height="20" fill="none" stroke="currentColor"><path d="M4 8h12M8 4v12" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            {showPlaylist ? (
              <div className="w-full max-h-[200px] overflow-y-auto bg-black bg-opacity-20 rounded-lg p-2">
                {playlist.map((song, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-xs text-white py-1">
                    <span className="truncate">{song.name}</span>
                    <div className="flex items-center gap-1">
                      {index === currentIndex && (
                        <span className="text-pink-400">▶</span>
                      )}
                      <button
                        onClick={() => handleDeleteSong(index)}
                        className="text-red-400 hover:text-red-300"
                        title="Xóa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center w-full py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                  </div>
                ) : playlist.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 w-full justify-center mt-1">
                      <button onClick={() => setCurrentIndex(currentIndex === 0 ? playlist.length - 1 : currentIndex - 1)} className="text-pink-400 hover:text-pink-200 p-1"><svg width="20" height="20" fill="none" stroke="currentColor"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round"/></svg></button>
                      <button onClick={() => setIsPlaying(!isPlaying)} className="text-pink-400 hover:text-pink-200 scale-110 p-1">
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                            <rect x="6" y="5" width="4" height="14" rx="1" />
                            <rect x="14" y="5" width="4" height="14" rx="1" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                            <polygon points="5,3 19,12 5,21 5,3" />
                          </svg>
                        )}
                      </button>
                      <button onClick={() => setCurrentIndex((currentIndex + 1) % playlist.length)} className="text-pink-400 hover:text-pink-200 p-1"><svg width="20" height="20" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round"/></svg></button>
                      <button onClick={() => setRepeat(!repeat)} className={repeat ? 'text-primary-400' : 'text-gray-400'} title="Lặp lại"><svg width="16" height="16" fill="none" stroke="currentColor"><path d="M17 1v4a1 1 0 0 1-1 1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 1 1 1v4" strokeWidth="2" strokeLinecap="round"/></svg></button>
                    </div>
                    <div className="w-full text-center text-xs text-white font-semibold truncate mt-1 hidden sm:block">{songName}</div>
                    {audioUrl && audioUrl.endsWith('.mp3') && (
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onTimeUpdate={() => {
                          if (audioRef.current) setProgress(audioRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (audioRef.current) setDuration(audioRef.current.duration);
                        }}
                        onEnded={() => {
                          if (repeat) {
                            if (audioRef.current) {
                              audioRef.current.currentTime = 0;
                              audioRef.current.play();
                            }
                          } else {
                            if (playlist.length > 0) {
                              const nextIndex = currentIndex + 1;
                              if (nextIndex < playlist.length) {
                                setCurrentIndex(nextIndex);
                                setAudioUrl(playlist[nextIndex].url);
                                setSongName(playlist[nextIndex].name);
                                setIsPlaying(true);
                              } else {
                                setIsPlaying(false);
                              }
                            }
                          }
                        }}
                        autoPlay={isPlaying}
                      />
                    )}
                    <div className="flex flex-col w-full mt-1">
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={progress}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setProgress(val);
                          if (audioRef.current) audioRef.current.currentTime = val;
                        }}
                        className="w-full accent-pink-500"
                      />
                      <div className="flex justify-between text-[10px] text-white w-full">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 w-full mt-1">
                      <svg width="14" height="14" fill="none" stroke="currentColor" className="text-gray-400"><path d="M3 9v6a2 2 0 0 0 2 2h2" strokeWidth="2"/></svg>
                      <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full accent-pink-500" />
                      <svg width="14" height="14" fill="none" stroke="currentColor" className="text-gray-400"><path d="M15 9v6a2 2 0 0 1-2 2h-2" strokeWidth="2"/></svg>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-xs py-2">Chưa có bài hát</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;