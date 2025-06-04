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

const MissionPage: React.FC = () => {
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
                  src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80" 
                  alt="LUXE Mission" 
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
                  Sứ Mệnh & Tầm Nhìn
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
                      src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80" 
                      alt="LUXE Mission" 
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
                      Sứ Mệnh
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      Từ khi thành lập vào năm 1995, LUXE đã không ngừng theo đuổi sứ mệnh kiến tạo nên những tác phẩm thời trang đẳng cấp, nơi hội tụ tinh hoa văn hóa Đông-Tây. Dưới sự dẫn dắt của nhà sáng lập Vũ Thành Luân, chúng tôi cam kết mang đến những trải nghiệm thời trang độc đáo, nơi mỗi sản phẩm đều là một câu chuyện về sự sang trọng và đẳng cấp.
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      Với slogan "Hãy tấu lên khúc ca xa hoa, nơi tinh hoa thời thượng hội tụ – Tham gia LUXE, ngay tức khắc!", chúng tôi không chỉ tạo ra những sản phẩm thời trang, mà còn kiến tạo nên một phong cách sống đẳng cấp, nơi mỗi khách hàng đều có thể tỏa sáng với vẻ đẹp riêng biệt.
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
                      Tầm Nhìn
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                      LUXE hướng đến việc trở thành thương hiệu thời trang cao cấp hàng đầu, không chỉ tại Việt Nam mà còn trên toàn cầu. Chúng tôi mong muốn:
                    </Typography>
                    <ul style={{ color: '#4a4a4a', lineHeight: 1.8, paddingLeft: '20px' }}>
                      <li>Tiên phong trong việc kết hợp văn hóa truyền thống với xu hướng hiện đại</li>
                      <li>Định hình phong cách thời trang mới, độc đáo và đẳng cấp</li>
                      <li>Mang đến trải nghiệm thời trang toàn diện cho khách hàng</li>
                      <li>Góp phần nâng tầm ngành thời trang Việt Nam trên trường quốc tế</li>
                    </ul>
                  </StyledPaper>
                </Parallax>
              </Box>

              <Box>
                <Parallax speed={-5}>
                  <Box sx={{ height: '100%' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80" 
                      alt="LUXE Vision" 
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
                    Giá Trị Cốt Lõi
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ color: '#4a4a4a', lineHeight: 1.8 }}>
                    LUXE xây dựng nền tảng phát triển trên những giá trị cốt lõi:
                  </Typography>
                  <ul style={{ color: '#4a4a4a', lineHeight: 1.8, paddingLeft: '20px' }}>
                    <li>Sáng tạo không ngừng trong thiết kế và phong cách</li>
                    <li>Chất lượng vượt trội trong từng sản phẩm</li>
                    <li>Tôn trọng và phát huy giá trị văn hóa truyền thống</li>
                    <li>Cam kết với sự hài lòng của khách hàng</li>
                    <li>Phát triển bền vững và có trách nhiệm</li>
                  </ul>
                </StyledPaper>
              </Parallax>
            </Box>
          </motion.div>
        </Container>
      </Box>
    </ParallaxProvider>
  );
};

export default MissionPage; 