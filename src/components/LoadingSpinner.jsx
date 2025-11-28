export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-primary-600 mx-auto ${sizeClasses[size]}`}
        ></div>
        {text && <p className="mt-4 text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
}

