import { ServiceStatus } from "@/lib/redis";

interface ServiceHistoryProps {
  history?: ServiceStatus[];
  serviceName: string;
}

export function ServiceHistory({ history, serviceName }: ServiceHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="mt-4 rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
        No history available for {serviceName}
      </div>
    );
  }

  // Sort history by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  
  // Only show the last 10 status records for simplicity
  const limitedHistory = sortedHistory.slice(0, 10);

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-gray-100">
      <h3 className="border-b border-gray-100 bg-gray-50 p-2 text-xs font-medium">
        Recent Status History
      </h3>
      <div className="max-h-48 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-500">Time</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="p-2 text-left text-xs font-medium text-gray-500">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {limitedHistory.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="whitespace-nowrap p-2 text-xs text-gray-600">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="p-2 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "up"
                        ? "bg-green-100 text-green-800"
                        : item.status === "down"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.status}
                    {item.statusCode && ` (${item.statusCode})`}
                  </span>
                </td>
                <td className="whitespace-nowrap p-2 text-xs text-gray-600">
                  {item.responseTime ? `${item.responseTime}ms` : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 