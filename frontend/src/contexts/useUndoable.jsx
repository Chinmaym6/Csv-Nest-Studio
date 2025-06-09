import { useState, useCallback } from 'react';

export default function useUndoable(initial) {
  const [history, setHistory] = useState({
    past: [],
    present: initial,
    future: []
  });

  const { past, present, future } = history;
//  set is used to update the present state and store the old state into past.
  const set = useCallback(updater => {
    setHistory(h => {
      const next =
        typeof updater === 'function'
          ? updater(h.present)
          : updater;
      if (next === h.present) return h;
      return {
        past: [...h.past, h.present],
        present: next,
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1)
      };
    });
  }, []);

  const reset = useCallback(state => {
    setHistory({ past: [], present: state, future: [] });
  }, []);

  return {
    present,
    set,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };
}