import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

function normalizeOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: option, label: String(option), disabled: false };
  }

  return {
    value: option?.value ?? '',
    label: option?.label ?? String(option?.value ?? ''),
    disabled: Boolean(option?.disabled),
  };
}

function joinClasses(...values) {
  return values.filter(Boolean).join(' ');
}

function findEnabledIndex(options, startIndex = 0, direction = 1) {
  if (!options.length) return -1;

  let nextIndex = startIndex;
  for (let attempts = 0; attempts < options.length; attempts += 1) {
    const option = options[nextIndex];
    if (option && !option.disabled) {
      return nextIndex;
    }
    nextIndex = (nextIndex + direction + options.length) % options.length;
  }

  return -1;
}

export default function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  helperText = '',
  errorText = '',
  disabled = false,
  required = false,
  containerClassName = '',
  buttonClassName = '',
  menuClassName = '',
  labelClassName = '',
  onBlur,
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listId = `${id || name || 'select'}-listbox`;
  const normalizedOptions = useMemo(
    () => options.map(normalizeOption),
    [options]
  );
  const selectedIndex = normalizedOptions.findIndex(
    (option) => String(option.value) === String(value ?? '')
  );
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    selectedIndex >= 0
      ? selectedIndex
      : findEnabledIndex(normalizedOptions, 0, 1)
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setHighlightedIndex(
      selectedIndex >= 0
        ? selectedIndex
        : findEnabledIndex(normalizedOptions, 0, 1)
    );
  }, [isOpen, normalizedOptions, selectedIndex]);

  function openMenu(preferredIndex = null) {
    if (disabled) return;

    const fallbackIndex =
      selectedIndex >= 0
        ? selectedIndex
        : findEnabledIndex(normalizedOptions, 0, 1);

    setHighlightedIndex(preferredIndex ?? fallbackIndex);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function commitSelection(index) {
    const option = normalizedOptions[index];
    if (!option || option.disabled) return;

    onChange?.(option.value, option);
    setHighlightedIndex(index);
    closeMenu();
    buttonRef.current?.focus();
  }

  function moveHighlight(direction) {
    if (!normalizedOptions.length) return;

    const currentIndex =
      highlightedIndex >= 0
        ? highlightedIndex
        : selectedIndex >= 0
        ? selectedIndex
        : findEnabledIndex(normalizedOptions, 0, 1);

    const nextIndex = findEnabledIndex(
      normalizedOptions,
      (currentIndex + direction + normalizedOptions.length) % normalizedOptions.length,
      direction
    );

    if (nextIndex >= 0) {
      setHighlightedIndex(nextIndex);
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }

  function handleKeyDown(event) {
    if (disabled) return;

    if ((event.altKey || event.ctrlKey) && event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstIndex = findEnabledIndex(normalizedOptions, 0, 1);
      if (firstIndex >= 0) {
        setHighlightedIndex(firstIndex);
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastIndex = findEnabledIndex(
        normalizedOptions,
        normalizedOptions.length - 1,
        -1
      );
      if (lastIndex >= 0) {
        setHighlightedIndex(lastIndex);
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }

      if (highlightedIndex >= 0) {
        commitSelection(highlightedIndex);
      }
      return;
    }

    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        closeMenu();
      }
    }
  }

  function handleBlur(event) {
    if (rootRef.current?.contains(event.relatedTarget)) return;
    closeMenu();
    onBlur?.(event);
  }

  return (
    <div
      ref={rootRef}
      className={joinClasses('relative w-full', containerClassName)}
      onBlur={handleBlur}
    >
      {label ? (
        <label htmlFor={id} className={joinClasses('mb-2 block text-sm font-medium text-gray-700', labelClassName)}>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}

      <button
        ref={buttonRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(errorText)}
        disabled={disabled}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={joinClasses(
          'input-field flex min-h-[42px] items-center justify-between gap-3 bg-white text-left',
          disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer',
          errorText ? 'border-red-300 focus:ring-red-200' : '',
          buttonClassName
        )}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={joinClasses(
            'h-4 w-4 shrink-0 text-gray-500 transition-transform',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={listId}
          role="listbox"
          className={joinClasses(
            'absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-3xl border border-slate-200 bg-white py-2 shadow-xl',
            menuClassName
          )}
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={`${String(option.value)}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => commitSelection(index)}
                className={joinClasses(
                  'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
                  option.disabled
                    ? 'cursor-not-allowed text-gray-300'
                    : isSelected || isHighlighted
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                )}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {errorText ? <p className="mt-1 text-sm text-red-600">{errorText}</p> : null}
      {!errorText && helperText ? <p className="mt-1 text-xs text-gray-500">{helperText}</p> : null}
    </div>
  );
}
