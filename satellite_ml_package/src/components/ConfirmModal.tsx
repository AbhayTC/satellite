// src/components/ConfirmModal.tsx
import React from 'react';
import { IconAlert } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '2px',
          maxWidth: '460px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <IconAlert size={18} color={isDestructive ? '#ef4444' : 'var(--accent-primary)'} />
          <h3 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {title.toUpperCase()}
          </h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '2px',
              border: '1px solid var(--border-subtle)',
              background: '#141a24',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '2px',
              border: 'none',
              background: isDestructive ? '#ef4444' : 'var(--accent-primary)',
              color: isDestructive ? '#fff' : '#000',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
