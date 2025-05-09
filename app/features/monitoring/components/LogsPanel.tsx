import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Badge } from '@/features/shared/components/ui/badge';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

interface LogsPanelProps {
  logs: LogEntry[];
  loading: boolean;
  onRefresh: () => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, loading, onRefresh }) => {
  const [filter, setFilter] = useState<string | null>(null);
  
  const filteredLogs = filter 
    ? logs.filter(log => log.level === filter)
    : logs;
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-500';
      case 'WARN': return 'text-yellow-500';
      case 'INFO': return 'text-green-500';
      case 'DEBUG': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Service Logs</CardTitle>
            <CardDescription>Recent model service logs</CardDescription>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-full hover:bg-gray-100"
            disabled={loading}
          >
            <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>⟳</span>
          </button>
        </div>
        <div className="flex space-x-2 mt-2">
          <Badge 
            variant={filter === null ? 'default' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter(null)}
          >
            All
          </Badge>
          <Badge 
            variant={filter === 'INFO' ? 'success' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('INFO')}
          >
            Info
          </Badge>
          <Badge 
            variant={filter === 'WARN' ? 'warning' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('WARN')}
          >
            Warning
          </Badge>
          <Badge 
            variant={filter === 'ERROR' ? 'destructive' : 'outline'} 
            className="cursor-pointer"
            onClick={() => setFilter('ERROR')}
          >
            Error
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-gray-500">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No logs available
          </div>
        ) : (
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-[400px] overflow-y-auto">
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <div key={index} className={getLevelColor(log.level)}>
                  [{log.timestamp}] {log.level}: {log.message}
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-gray-500">No logs matching the selected filter</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 模拟的日志数据
export const getMockLogs = (): LogEntry[] => {
  return [
    { timestamp: '2025-04-12 14:23:01', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:22:54', level: 'INFO', message: 'Prediction request completed in 345ms' },
    { timestamp: '2025-04-12 14:22:53', level: 'INFO', message: "Prediction request received for model 'sentiment_analysis'" },
    { timestamp: '2025-04-12 14:22:45', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:22:12', level: 'ERROR', message: 'Invalid input format for request' },
    { timestamp: '2025-04-12 14:22:10', level: 'INFO', message: "Prediction request received for model 'sentiment_analysis'" },
    { timestamp: '2025-04-12 14:21:30', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:21:05', level: 'INFO', message: 'Prediction request completed in 321ms' },
    { timestamp: '2025-04-12 14:21:04', level: 'INFO', message: "Prediction request received for model 'sentiment_analysis'" },
    { timestamp: '2025-04-12 14:20:30', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:20:01', level: 'WARN', message: 'High latency detected (1.2s) for prediction request' },
    { timestamp: '2025-04-12 14:20:00', level: 'INFO', message: "Prediction request received for model 'sentiment_analysis'" },
    { timestamp: '2025-04-12 14:19:30', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:19:01', level: 'INFO', message: 'Prediction request completed in 358ms' },
    { timestamp: '2025-04-12 14:19:00', level: 'INFO', message: "Prediction request received for model 'image_classification'" },
    { timestamp: '2025-04-12 14:18:45', level: 'INFO', message: "Model 'image_classification' loaded successfully" },
    { timestamp: '2025-04-12 14:18:30', level: 'INFO', message: 'Health check request received' },
    { timestamp: '2025-04-12 14:18:01', level: 'INFO', message: 'Model service started' },
    { timestamp: '2025-04-12 14:18:00', level: 'INFO', message: 'Initializing model service...' },
  ];
};

export default LogsPanel; 