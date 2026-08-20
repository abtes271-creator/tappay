import React, { useEffect } from 'react';

/**
 * A clean, clearly visible toast notification - used e.g. for
 * "Credentials Updated Successfully" after a password/username change.
 * Auto-dismisses after `duration` ms unless duration is set to 0.
 */
export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span className="toast-icon">{type === 'success' ? '✓' : '⚠'}</span>
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}
