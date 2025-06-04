import React from 'react';
import { motion } from 'framer-motion';
import { Container, Typography, Box, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ParallaxProvider, Parallax } from 'react-scroll-parallax';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  height: '100%',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const AboutPage: React.FC = () => {
  return (
    <ParallaxProvider>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
        pt: { xs: 12, md: 16 },
        pb: 8
      }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ position: 'relative', mb: 8, height: '60vh', overflow: 'hidden', borderRadius: '24px' }}>
              <Parallax speed={-20}>
                <img 
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80" 
                  alt="LUXE Fashion" 
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.8)'
                  }}
                />
              </Parallax>
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(2px)'
              }}>
                <Typography 
                  variant="h1" 
                  component="h1" 
                  align="center" 
                  sx={{ 
                    fontFamily: 'Playfair Display, serif',
                    color: '#ffffff',
                    fontWeight: 600,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  Về LUXE
                </Typography>
              </Box>
            </Box>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 4,
              mb: 4
            }}>
              <Box>
                <Parallax speed={-5}>
                  <Box sx={{ height: '100%' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" 
                      alt="LUXE Story" 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '16px'
                      }}
                    />
                  </Box>
                </Parallax>
              </Box>

              <Box>
                <Parallax speed={5}>
                  <StyledPaper>
                    <Typography 
                      variant="h4" 
                      gutterBottom
                      sx={{ 
                        fontFamily: 'Playfair Display, serif',
                        color: '#1a1a1a',
                        mb: 3
                      }}
                    >
                      Câu Chuyện Của Chúng Tôi
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      Được thành lập vào năm 1995 bởi nhà thiết kế tài ba Vũ Thành Luân, LUXE đã trở thành biểu tượng của sự sang trọng và đẳng cấp trong làng thời trang Việt Nam. Với tầm nhìn sâu rộng và niềm đam mê bất tận với nghệ thuật thời trang, chúng tôi đã kiến tạo nên một thương hiệu mang đậm dấu ấn văn hóa Á Đông nhưng vẫn giữ được vẻ đẹp hiện đại và quốc tế.
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      Slogan của chúng tôi - "Hãy tấu lên khúc ca xa hoa, nơi tinh hoa thời thượng hội tụ – Tham gia LUXE, ngay tức khắc!" - không chỉ là một câu khẩu hiệu, mà còn là lời hứa về trải nghiệm thời trang đẳng cấp mà chúng tôi mang đến cho mỗi khách hàng.
                    </Typography>
                  </StyledPaper>
                </Parallax>
              </Box>

              <Box>
                <Parallax speed={5}>
                  <StyledPaper>
                    <Typography 
                      variant="h4" 
                      gutterBottom
                      sx={{ 
                        fontFamily: 'Playfair Display, serif',
                        color: '#1a1a1a',
                        mb: 3
                      }}
                    >
                      Điểm Mạnh
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      LUXE tự hào với danh mục sản phẩm thời trang cao cấp, nơi mỗi mẫu thiết kế đều là một tác phẩm nghệ thuật được chăm chút tỉ mỉ. Chúng tôi tập trung vào:
                    </Typography>
                    <ul style={{ color: '#4a4a4a', lineHeight: 1.8, paddingLeft: '20px' }}>
                      <li>Chất liệu cao cấp được lựa chọn kỹ lưỡng</li>
                      <li>Kỹ thuật thêu dệt thủ công tinh xảo</li>
                      <li>Thiết kế độc đáo kết hợp văn hóa Đông-Tây</li>
                      <li>Quy trình sản xuất chuyên nghiệp</li>
                      <li>Dịch vụ khách hàng đẳng cấp</li>
                    </ul>
                  </StyledPaper>
                </Parallax>
              </Box>

              <Box>
                <Parallax speed={-5}>
                  <Box sx={{ height: '100%' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80" 
                      alt="LUXE Strengths" 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '16px'
                      }}
                    />
                  </Box>
                </Parallax>
              </Box>
            </Box>

            <Box>
              <Parallax speed={-10}>
                <StyledPaper>
                  <Typography 
                    variant="h4" 
                    gutterBottom
                    sx={{ 
                      fontFamily: 'Playfair Display, serif',
                      color: '#1a1a1a',
                      mb: 3
                    }}
                  >
                    Thành Tựu Nổi Bật
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: 3
                  }}>
                    <Box sx={{ p: 2 }}>
                      <img 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80" 
                        alt="Florence Exhibition" 
                        style={{ 
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          marginBottom: '16px'
                        }}
                      />
                      <Typography variant="h6" gutterBottom sx={{ color: '#1a1a1a', fontWeight: 600 }}>
                        Khúc Ca Của Nghệ Thuật Thêu Dệt
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4a4a4a' }}>
                        Vào mùa thu năm 2021, LUXE đã được khắc tên trên bảng vàng tại Triển lãm Thời trang Cổ điển Florence, nơi những tấm lụa thêu tay của chúng tôi khiến cả giới quý tộc phải nghiêng mình thán phục.
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <img 
                        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80" 
                        alt="Vienna Fashion Award" 
                        style={{ 
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          marginBottom: '16px'
                        }}
                      />
                      <Typography variant="h6" gutterBottom sx={{ color: '#1a1a1a', fontWeight: 600 }}>
                        Ánh Sáng Của Vương Miện Thời Trang
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4a4a4a' }}>
                        Năm 2023, bộ sưu tập "Lời Thì Thầm Của Hoàng Kim" đã giành vương miện tại Giải thưởng Thời trang Cao quý Vienna, khẳng định LUXE là ngọn hải đăng của sự xa hoa bất tận.
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <img 
                        src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80" 
                        alt="Royal Celebration" 
                        style={{ 
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          marginBottom: '16px'
                        }}
                      />
                      <Typography variant="h6" gutterBottom sx={{ color: '#1a1a1a', fontWeight: 600 }}>
                        Di Sản Của Hoàng Gia
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4a4a4a' }}>
                        Vào năm 2024, LUXE vinh dự trở thành ánh ngọc trong lễ kỷ niệm 75 năm triều đại của Hoàng gia Anh, với những thiết kế lộng lẫy được chọn để tôn vinh vẻ đẹp vương giả.
                      </Typography>
                    </Box>
                  </Box>
                </StyledPaper>
              </Parallax>
            </Box>
          </motion.div>
        </Container>
      </Box>
    </ParallaxProvider>
  );
};

export default AboutPage; 