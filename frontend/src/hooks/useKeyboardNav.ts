import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '../store/commandPalette';

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export function usePostListKeys(slugs: string[]) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navigate = useNavigate();

  useEffect(() => {
    setFocusedIndex(-1);
  }, [slugs]);

  useEffect(() => {
    if (slugs.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || useCommandPalette.getState().isOpen) return;

      if (e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, slugs.length - 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        setFocusedIndex((i) => {
          if (i >= 0 && i < slugs.length) {
            navigate(`/post/${slugs[i]}`);
          }
          return i;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slugs, navigate]);

  return focusedIndex;
}

export function useEscapeBack() {
  const navigate = useNavigate();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (isTyping() || useCommandPalette.getState().isOpen) return;
      if (e.key === 'Escape') {
        navigate('/');
      }
    },
    [navigate],
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
