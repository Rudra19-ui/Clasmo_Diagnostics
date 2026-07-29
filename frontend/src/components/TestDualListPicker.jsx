import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function scrollItemIntoView(container, item) {
  if (!container || !item) return;
  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  if (itemTop < containerTop) {
    container.scrollTop = itemTop;
  } else if (itemBottom > containerBottom) {
    container.scrollTop = itemBottom - container.clientHeight;
  }
}

export default function TestDualListPicker({
  available = [],
  selected = [],
  onAdd,
  onRemove,
  onRemoveAll,
  testSearch = '',
  onTestSearchChange,
  selectedTestSearch = '',
  onSelectedTestSearchChange,
  formatLabel = (test) => test.name,
}) {
  const availableListRef = useRef(null);
  const selectedListRef = useRef(null);
  const searchRef = useRef(null);
  const [activeAvailableId, setActiveAvailableId] = useState(null);
  const [activeSelectedIds, setActiveSelectedIds] = useState([]);

  const filteredSelected = useMemo(() => {
    const q = selectedTestSearch.toLowerCase();
    return selected.filter((test) => !q || test.name.toLowerCase().includes(q));
  }, [selected, selectedTestSearch]);

  useEffect(() => {
    if (!available.length) {
      setActiveAvailableId(null);
      return;
    }
    if (!available.some((test) => test.id === activeAvailableId)) {
      setActiveAvailableId(available[0].id);
    }
  }, [available, activeAvailableId]);

  useEffect(() => {
    setActiveSelectedIds((prev) => prev.filter((id) => filteredSelected.some((test) => test.id === id)));
  }, [filteredSelected]);

  const addTests = useCallback(
    (items) => {
      if (!items.length) return;
      onAdd?.(items);
      setActiveSelectedIds(items.map((test) => test.id));
    },
    [onAdd],
  );

  const removeTests = useCallback(
    (items) => {
      if (!items.length) return;
      onRemove?.(items.map((test) => test.id));
      setActiveSelectedIds([]);
    },
    [onRemove],
  );

  const handleAvailableClick = (test) => {
    setActiveAvailableId(test.id);
  };

  const handleAvailableDoubleClick = (test) => {
    addTests([test]);
  };

  const handleSelectedClick = (test, event) => {
    if (event.ctrlKey || event.metaKey) {
      setActiveSelectedIds((prev) =>
        prev.includes(test.id) ? prev.filter((id) => id !== test.id) : [...prev, test.id],
      );
      return;
    }
    if (event.shiftKey && activeSelectedIds.length > 0) {
      const anchorId = activeSelectedIds[activeSelectedIds.length - 1];
      const start = filteredSelected.findIndex((item) => item.id === anchorId);
      const end = filteredSelected.findIndex((item) => item.id === test.id);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        setActiveSelectedIds(filteredSelected.slice(from, to + 1).map((item) => item.id));
      }
      return;
    }
    setActiveSelectedIds([test.id]);
  };

  const handleSelectedDoubleClick = (test) => {
    removeTests([test]);
  };

  const handleAddClick = () => {
    const highlighted = available.filter((test) => test.id === activeAvailableId);
    if (highlighted.length) {
      addTests(highlighted);
      return;
    }
    if (available.length) {
      addTests([available[0]]);
    }
  };

  const handleRemoveClick = () => {
    const items = filteredSelected.filter((test) => activeSelectedIds.includes(test.id));
    if (items.length) {
      removeTests(items);
      return;
    }
    if (filteredSelected.length) {
      removeTests([filteredSelected[0]]);
    }
  };

  const moveAvailableHighlight = (direction) => {
    if (!available.length) return;
    const currentIndex = available.findIndex((test) => test.id === activeAvailableId);
    const nextIndex = currentIndex < 0
      ? 0
      : Math.max(0, Math.min(available.length - 1, currentIndex + direction));
    const nextTest = available[nextIndex];
    setActiveAvailableId(nextTest.id);
    const container = availableListRef.current;
    const item = container?.querySelector(`[data-test-id="${nextTest.id}"]`);
    scrollItemIntoView(container, item);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveAvailableHighlight(1);
      availableListRef.current?.focus();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddClick();
    }
  };

  const handleAvailableKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveAvailableHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveAvailableHighlight(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddClick();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      searchRef.current?.focus();
      onTestSearchChange?.(`${testSearch}${event.key}`);
    }
  };

  const handleSelectedKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      handleRemoveClick();
    }
  };

  return (
    <>
      <div className="reg-sketch-test-list">
        <label className="reg-sketch-search reg-sketch-search--inline">
          <span>Type to Search</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Type to Search"
            value={testSearch}
            onChange={(e) => onTestSearchChange?.(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </label>
        <div
          ref={availableListRef}
          className="test-picker-list-box"
          tabIndex={0}
          role="listbox"
          aria-label="Available tests"
          onKeyDown={handleAvailableKeyDown}
        >
          {available.length === 0 ? (
            <div className="test-picker-empty">No tests found</div>
          ) : (
            available.map((test) => (
              <button
                key={test.id}
                type="button"
                role="option"
                aria-selected={activeAvailableId === test.id}
                data-test-id={test.id}
                className={`test-picker-item${activeAvailableId === test.id ? ' is-active' : ''}`}
                onClick={() => handleAvailableClick(test)}
                onDoubleClick={() => handleAvailableDoubleClick(test)}
              >
                {formatLabel(test)}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="reg-sketch-test-actions">
        <button type="button" title="Add selected test" onClick={handleAddClick}>
          »
        </button>
        <button type="button" title="Remove selected test" onClick={handleRemoveClick}>
          «
        </button>
        <button type="button" title="Remove all tests" onClick={() => onRemoveAll?.()}>
          ««
        </button>
      </div>

      <div className="reg-sketch-selected-panel">
        <label className="reg-sketch-search reg-sketch-search--inline">
          <span>Search From Selected Test</span>
          <input
            type="search"
            placeholder="Search From Selected Test"
            value={selectedTestSearch}
            onChange={(e) => onSelectedTestSearchChange?.(e.target.value)}
          />
        </label>
        <div
          ref={selectedListRef}
          className="test-picker-list-box"
          tabIndex={0}
          role="listbox"
          aria-label="Selected tests"
          aria-multiselectable="true"
          onKeyDown={handleSelectedKeyDown}
        >
          {filteredSelected.length === 0 ? (
            <div className="test-picker-empty">No tests selected</div>
          ) : (
            filteredSelected.map((test) => (
              <button
                key={test.id}
                type="button"
                role="option"
                aria-selected={activeSelectedIds.includes(test.id)}
                className={`test-picker-item${activeSelectedIds.includes(test.id) ? ' is-active' : ''}`}
                onClick={(event) => handleSelectedClick(test, event)}
                onDoubleClick={() => handleSelectedDoubleClick(test)}
              >
                {formatLabel(test)}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
