const STATUS_STYLES = {
  new: 'bg-primary-100 text-primary-800 border-primary-200',
  accepted: 'bg-primary-100 text-primary-800 border-primary-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-primary-200 text-primary-900 border-primary-300',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS = {
  new: 'New',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function OrderStatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

