import { getStatusColor, getStatusLabel } from '../utils/helpers';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}
