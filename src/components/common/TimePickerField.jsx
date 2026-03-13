import { useEffect, useMemo, useRef, useState } from 'react';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isValidTime(value) {
  if (!value) return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizeTime(value) {
  if (!isValidTime(value)) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function toMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTimeDisplay(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return '--:--';

  const [hours24, minutes] = normalized.split(':').map(Number);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;

  return `${pad2(hours12)}:${pad2(minutes)} ${period}`;
}

function buildOptions(stepMinutes) {
  const options = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${pad2(hours)}:${pad2(mins)}`);
  }
  return options;
}

export default function TimePickerField({
  value,
  onChange,
  className = 'input-field',
  disabled = false,
  name,
  id,
  required = false,
  stepMinutes = 15,
}) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = normalizeTime(value);
  const baseOptions = useMemo(() => buildOptions(stepMinutes), [stepMinutes]);

  const options = useMemo(() => {
    if (!normalizedValue || baseOptions.includes(normalizedValue)) {
      return baseOptions;
    }

    return [...baseOptions, normalizedValue].sort((a, b) => toMinutes(a) - toMinutes(b));
  }, [baseOptions, normalizedValue]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !menuRef.current || !normalizedValue) return;

    const selectedOption = menuRef.current.querySelector('[data-selected="true"]');
    if (selectedOption && typeof selectedOption.scrollIntoView === 'function') {
      selectedOption.scrollIntoView({ block: 'center' });
    }
  }, [isOpen, normalizedValue]);

  function emitChange(nextValue) {
    if (typeof onChange === 'function') {
      onChange({
        target: {
          value: nextValue,
          name,
          id,
        },
      });
    }
  }

  function handleSelect(nextValue) {
    emitChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="time"
        value={normalizedValue}
        onChange={() => {}}
        name={name}
        id={id}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
      />

      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`${className} flex items-center justify-between gap-2 text-left ${
          disabled ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''
        }`}
      >
        <span className={normalizedValue ? '' : 'text-gray-400'}>{formatTimeDisplay(normalizedValue)}</span>
        <span className="text-gray-500">◷</span>
      </button>

      {isOpen && !disabled && (
        <div ref={menuRef} className="absolute left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-primary-200 bg-white shadow-lg">
          {options.map((option) => {
            const isSelected = option === normalizedValue;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                data-selected={isSelected ? 'true' : 'false'}
                className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary-600 font-semibold text-white'
                    : 'text-gray-700 hover:bg-primary-50'
                }`}
              >
                {formatTimeDisplay(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
