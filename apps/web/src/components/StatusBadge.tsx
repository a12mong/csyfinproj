import type { Motorcycle } from "@csyfinproj/shared";

type MotorcycleStatus = Motorcycle["status"];

const statusConfig: Record<
  MotorcycleStatus,
  { label: string; className: string }
> = {
  in_stock: {
    label: "In Stock",
    className: "bg-green-100 text-green-700",
  },
  reserved: {
    label: "Reserved",
    className: "bg-yellow-100 text-yellow-700",
  },
  sold: {
    label: "Sold",
    className: "bg-red-100 text-red-700",
  },
};

export default function StatusBadge({ status }: { status: MotorcycleStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
