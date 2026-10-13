// src/components/CopyButton.tsx
import React, { useState } from 'react';
import { IconCopy, IconCheck } from './Icons';

interface CopyButtonProps {
  text: string;
  label?: string;
  title?: string;
  style?: React.CSSProperties;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label, title = 'Copy payload', style }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.5rem',
        fontSize: '0.72rem',
        fontFamily: 'var(--font-mono)',
        borderRadius: '2px',
        border: '1px solid #283344',
        background: copied ? 'rgba(16, 185, 129, 0.15)' : '#101622',
        color: copied ? '#10b981' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'background 0.08s ease, color 0.08s ease',
        borderColor: copied ? '#10b981' : '#283344',
        ...style,
      }}
    >
      {copied ? <IconCheck size={12} color="#10b981" /> : <IconCopy size={12} />}
      <span>{copied ? 'COPIED' : (label ?? 'COPY')}</span>
    </button>
  );
};

export default CopyButton;
