import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A consistent "back" affordance for pages reached from a dashboard (e.g.
 * Add/Edit Item). Defaults to browser back navigation; pass `to` to always
 * land on a specific route regardless of history.
 */
export default function BackButton({ to, label = 'Back' }) {
  const navigate = useNavigate();

  function handleClick() {
    if (to) navigate(to);
    else navigate(-1);
  }

  return (
    <button type="button" className="back-button" onClick={handleClick}>
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}
