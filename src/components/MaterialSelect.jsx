import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const MENU_MAX = 290;
const GAP = 8;

export const MaterialSelect = ({ value, onChange, options = [], placeholder = 'Select an option' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  // fixed coordinates, so the menu overlays the page instead of growing its scroll height
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0, maxHeight: MENU_MAX });

  const openMenu = () => {
    const r = containerRef.current?.getBoundingClientRect();
    if (r) {
      setPlace({
        top: r.bottom + GAP,
        left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
        width: r.width,
        maxHeight: MENU_MAX,
      });
    }
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  // Measure the trigger and flip the menu above it when there is no room below.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - GAP - 12;
    const above = r.top - GAP - 12;
    const flip = below < 200 && above > below;
    setPlace({
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: r.width,
      maxHeight: Math.max(160, Math.min(MENU_MAX, flip ? above : below)),
      ...(flip ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    });
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close when the page scrolls or resizes; scrolling the menu's own list is fine.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) setIsOpen(false);
    };
    const onResize = () => setIsOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Box */}
      <div
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        style={{
          width: '100%',
          height: '58px',
          background: 'var(--surface)',
          border: isOpen ? '2px solid #ED7D31' : '2px solid #D8D0C7',
          borderRadius: '16px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 0 3px rgba(237, 125, 49, 0.18)' : 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none'
        }}
      >
        <span style={{
          fontSize: '16.5px',
          fontWeight: value ? 700 : 500,
          color: value ? '#1F1B17' : '#9A928A',
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: '12px',
          fontFamily: 'inherit'
        }}>
          {value || placeholder}
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? '#ED7D31' : '#6E6862',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          <ChevronDown size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Material 3 Dropdown Popover Menu — portaled so it never adds page height */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            ...place,
            background: 'var(--surface)',
            borderRadius: '18px',
            border: '1.5px solid #FDEEE2',
            boxShadow: '0 20px 40px -10px rgba(31, 27, 23, 0.2), 0 0 0 1px rgba(237, 125, 49, 0.1)',
            padding: '8px',
            zIndex: 100002,
            overflowY: 'auto',
            boxSizing: 'border-box',
            animation: 'gomlFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {options.map((option) => {
            const isSelected = value === option;

            return (
              <div
                key={option}
                onClick={() => handleSelect(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  fontSize: '15.5px',
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? '#ED7D31' : '#1E293B',
                  background: isSelected ? '#FEF7F0' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#FAF8F5';
                    e.currentTarget.style.color = '#ED7D31';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#1E293B';
                  }
                }}
              >
                <span>{option}</span>
                {isSelected && (
                  <Check size={18} color="#ED7D31" strokeWidth={3} />
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
