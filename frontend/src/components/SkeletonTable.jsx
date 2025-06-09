import React from 'react';
import './SkeletonTable.css';

/**
 * Renders a skeleton screen for tables.
 * @param {{ rows?: number, cols?: number }} props
 */
export default function SkeletonTable({ rows = 5, cols = 3 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-row header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-cell header-cell"></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-row">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton-cell"></div>
          ))}
        </div>
      ))}
    </div>
  );
}