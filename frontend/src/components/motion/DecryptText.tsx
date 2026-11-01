import React, { useEffect, useState } from 'react';

interface DecryptTextProps {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
}

const CHARS = 'ABCDEF0123456789!@#$%^&*()_+-=<>?/';

export const DecryptText: React.FC<DecryptTextProps> = ({
  text,
  speed = 25,
  className = '',
  delay = 0,
}) => {
  const [displayText, setDisplayText] = useState<string>('');

  useEffect(() => {
    let timeoutId: any;
    let intervalId: any;
    let iteration = 0;

    timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setDisplayText(
          text
            .split('')
            .map((char, index) => {
              if (index < iteration) {
                return text[index];
              }
              if (char === ' ') return ' ';
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        if (iteration >= text.length) {
          clearInterval(intervalId);
        }

        iteration += 1 / 2; // Decrypt 1 character every 2 ticks
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [text, speed, delay]);

  return <span className={className}>{displayText || text}</span>;
};
