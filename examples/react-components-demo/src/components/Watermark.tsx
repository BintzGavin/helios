import React from 'react';

interface WatermarkProps {
  text?: string;
  image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  style?: React.CSSProperties;
}

export const Watermark: React.FC<WatermarkProps> = ({
  text = 'Helios',
  image,
  position = 'bottom-right',
  opacity = 0.5,
  style
}) => {
  const getPositionStyle = () => {
    switch(position) {
      case 'top-left': return { top: 20, left: 20 };
      case 'top-right': return { top: 20, right: 20 };
      case 'bottom-left': return { bottom: 20, left: 20 };
      case 'bottom-right': return { bottom: 20, right: 20 };
      default: return { bottom: 20, right: 20 };
    }
  };

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyle(),
      opacity,
      pointerEvents: 'none',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      ...style
    }}>
      {image ? (
        <img src={image} alt="watermark" style={{ maxHeight: '40px' }} />
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
};
