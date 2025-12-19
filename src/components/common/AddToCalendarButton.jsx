/**
 * AddToCalendarButton - Dropdown button for adding callbacks to calendar
 */
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { addToCalendar, CalendarOptions } from '../../utils/calendarUtils';

const calendarProviders = [
  { 
    id: CalendarOptions.GOOGLE, 
    name: 'Google Calendar', 
    icon: '📅',
    color: 'text-blue-600',
  },
  { 
    id: CalendarOptions.OUTLOOK, 
    name: 'Outlook', 
    icon: '📧',
    color: 'text-blue-700',
  },
  { 
    id: CalendarOptions.APPLE, 
    name: 'Apple Calendar', 
    icon: '🍎',
    color: 'text-gray-700',
  },
  { 
    id: CalendarOptions.DOWNLOAD, 
    name: 'Download .ics', 
    icon: '⬇️',
    color: 'text-gray-600',
  },
];

export default function AddToCalendarButton({ 
  data, 
  size = 'sm', 
  variant = 'secondary',
  showLabel = true,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    addToCalendar(data, option);
    setIsOpen(false);
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1.5 rounded-md font-medium transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        <Calendar className={size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} />
        {showLabel && <span>Add to Calendar</span>}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {calendarProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelect(provider.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <span>{provider.icon}</span>
              <span className={provider.color}>{provider.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Simple icon-only calendar button for compact spaces
 */
export function AddToCalendarIcon({ data, className = '' }) {
  return (
    <AddToCalendarButton 
      data={data} 
      size="xs" 
      variant="ghost" 
      showLabel={false}
      className={className}
    />
  );
}
