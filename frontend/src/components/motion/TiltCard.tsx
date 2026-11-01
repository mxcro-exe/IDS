import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltMax?: number;
  whileHover?: any;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  tiltMax = 10,
  whileHover,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useSpring(0, { stiffness: 300, damping: 25 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -tiltMax;
    const rY = ((x - centerX) / centerX) * tiltMax;

    rotateX.set(rX);
    rotateY.set(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={whileHover || { y: -5 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`relative ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
};
