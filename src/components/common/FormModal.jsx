import { useEffect, useState, useRef } from 'react';

/**
 * Form modal component for dialogs with forms
 * Similar to ConfirmationModal but designed for form content
 * Supports resizing and position/size persistence via localStorage
 */
export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  width = '500px',
  resizable = false,
  storageKey = null, // e.g., 'listing-form-modal'
  headerActions = null, // Optional JSX to render in header (e.g., buttons)
}) {
  const modalRef = useRef(null);
  const [size, setSize] = useState({ width, height: 'auto' });
  const [position, setPosition] = useState({ x: null, y: null });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Load saved size/position from localStorage
  useEffect(() => {
    if (!storageKey || !resizable) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width) setSize(prev => ({ ...prev, width: parsed.width }));
        if (parsed.height) setSize(prev => ({ ...prev, height: parsed.height }));
        if (parsed.x !== undefined) setPosition(prev => ({ ...prev, x: parsed.x }));
        if (parsed.y !== undefined) setPosition(prev => ({ ...prev, y: parsed.y }));
      }
    } catch (err) {
      console.warn('Failed to load modal state from localStorage:', err);
    }
  }, [storageKey, resizable]);

  // Save size/position to localStorage when modal closes
  useEffect(() => {
    if (!isOpen && storageKey && resizable) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          width: size.width,
          height: size.height,
          x: position.x,
          y: position.y,
        }));
      } catch (err) {
        console.warn('Failed to save modal state to localStorage:', err);
      }
    }
  }, [isOpen, storageKey, size, position, resizable]);

  const handleResizeStart = (e) => {
    if (!resizable) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      
      const newWidth = Math.max(400, resizeStart.current.width + deltaX);
      const newHeight = Math.max(300, resizeStart.current.height + deltaY);
      
      setSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
          style={{ 
            maxWidth: resizable ? 'none' : width,
            width: resizable ? size.width : 'auto',
            height: resizable ? size.height : 'auto',
            maxHeight: '90vh',
            position: resizable ? 'relative' : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <div className="flex items-center gap-3">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4" style={{ maxHeight: resizable ? 'calc(90vh - 140px)' : 'auto', overflowY: 'auto' }}>
            {children}
          </div>

          {/* Resize Handle (bottom-right corner) */}
          {resizable && (
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-50 hover:opacity-100"
              onMouseDown={handleResizeStart}
              style={{
                background: 'linear-gradient(135deg, transparent 0%, transparent 50%, #9CA3AF 50%, #9CA3AF 100%)',
              }}
              title="Drag to resize"
            />
          )}
        </div>
      </div>
    </div>
  );
}

