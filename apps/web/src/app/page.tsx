import ProtectedRoute from "@/components/ProtectedRoute";

export default function HomePage() {
  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CSYFinproj</h1>
        <p className="text-lg text-gray-600 mb-8">
          Yamaha Motorcycle Sales &amp; Finance Management
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <DashboardCard
            title="Inventory"
            description="Manage motorcycle stock"
            href="/inventory"
          />
          <DashboardCard
            title="Sales"
            description="Track sales transactions"
            href="/sales"
          />
          <DashboardCard
            title="Finance"
            description="Installments & payments"
            href="/finance"
          />
        </div>
      </main>
    </ProtectedRoute>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </a>
  );
}
