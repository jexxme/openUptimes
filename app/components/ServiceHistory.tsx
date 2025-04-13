import { ServiceStatus } from "@/lib/redis";

interface ServiceHistoryProps {
  history?: ServiceStatus[];
  serviceName: string;
}

export function ServiceHistory({ history, serviceName }: ServiceHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center text-xs text-gray-500 py-1">
        No history available
      </div>
    );
  }

  // Sort history by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  
  // Only show the last 5 status records for simplicity
  const limitedHistory = sortedHistory.slice(0, 5);

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-gray-100 text-xs">
      <h4 className="bg-gray-50 py-1 px-2 text-xs text-gray-600 border-b border-gray-100">
        Recent History
      </h4>
      <div className="max-h-32 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-1 text-left text-xs font-normal text-gray-500">Time</th>
              <th className="p-1 text-left text-xs font-normal text-gray-500">Status</th>
              <th className="p-1 text-left text-xs font-normal text-gray-500">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {limitedHistory.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="whitespace-nowrap p-1 text-xs text-gray-600">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </td>
                <td className="p-1 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-1 py-0.5 text-xs ${
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
                <td className="whitespace-nowrap p-1 text-xs text-gray-600">
                  {item.responseTime ? `${item.responseTime}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 