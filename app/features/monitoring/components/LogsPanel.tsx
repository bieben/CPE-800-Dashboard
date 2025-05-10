import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/components/ui/card';
import { Badge } from '@/features/shared/components/ui/badge';

import { 
  LogEntry,
  LogsQueryParams, 
  getLogs, 
  clearLogs,
  getMockLogs 
} from '../services/monitoringService';

interface LogsPanelProps {
  logs?: LogEntry[];
  loading: boolean;
  onRefresh: () => void;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs: initialLogs, loading: initialLoading, onRefresh }) => {
  const [filter, setFilter] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs || []);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const fetchLogs = async (params: LogsQueryParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // 添加当前的筛选条件，但确保格式正确
      const queryParams: LogsQueryParams = {
        limit: Math.min(limit, 100), // 限制最大数量，防止请求过大
        offset: Math.max(0, offset), // 确保偏移量不为负
        ...params
      };
      
      // 确保筛选条件的值有效
      if (filter && ['INFO', 'WARN', 'ERROR', 'DEBUG'].includes(filter)) {
        queryParams.level = filter;
      }
      
      if (searchQuery && searchQuery.trim() !== '') {
        queryParams.query = searchQuery.trim();
      }
      
      // 防止发送空值参数
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key as keyof LogsQueryParams] === undefined || 
            queryParams[key as keyof LogsQueryParams] === null ||
            queryParams[key as keyof LogsQueryParams] === '') {
          delete queryParams[key as keyof LogsQueryParams];
        }
      });
      
      console.log('Fetching logs with params:', queryParams);
      
      // 使用try-catch直接处理模拟数据，避免在服务层抛出错误
      let response;
      try {
        // 调用API获取日志
        response = await getLogs(queryParams);
      } catch (innerError) {
        console.error('Error in getLogs:', innerError);
        // 直接使用模拟数据
        const mockLogs = getMockLogs();
        response = {
          logs: mockLogs,
          total: mockLogs.length,
          offset: 0,
          limit: 50,
          filters_active: {
            level: filter || null,
            model_id: null,
            time_range: [null, null]
          }
        };
        setError('Unable to connect to logs service. Using mock data.');
      }
      
      // 处理响应，确保数据格式一致  
      if (response && Array.isArray(response.logs)) {
        setLogs(response.logs);
        setTotalLogs(response.total || response.logs.length);
        setOffset(response.offset || 0);
        setLimit(response.limit || 50);
        
        // 触发父组件的刷新回调
        if (onRefresh) {
          onRefresh();
        }
      } else {
        // 如果响应无效，使用模拟数据
        const mockLogs = getMockLogs();
        setLogs(mockLogs);
        setTotalLogs(mockLogs.length);
        setOffset(0);
        setError('Invalid response from server. Using mock data instead.');
      }
    } catch (err) {
      console.error('Fatal error in fetchLogs:', err);
      // 使用模拟数据作为最后的回退选项
      const mockLogs = getMockLogs();
      setLogs(mockLogs);
      setTotalLogs(mockLogs.length);
      setOffset(0);
      setError('Failed to fetch logs. Using mock data instead.');
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载和定时刷新
  useEffect(() => {
    fetchLogs();
    
    // 每60秒自动刷新一次
    const interval = setInterval(() => {
      fetchLogs();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [filter]);
  
  const handleLevelFilter = (level: string | null) => {
    setFilter(level);
    setOffset(0); // 重置分页
    fetchLogs({ level: level || undefined, offset: 0 });
  };
  
  const handleSearch = () => {
    setOffset(0); // 重置分页
    fetchLogs({ query: searchQuery, offset: 0 });
  };
  
  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      setLoading(true);
      try {
        const success = await clearLogs();
        if (success) {
          setLogs([]);
          setTotalLogs(0);
          setError(null);
        } else {
          setError('Failed to clear logs.');
        }
      } catch (err) {
        console.error('Error clearing logs:', err);
        setError('Failed to clear logs.');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleNextPage = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchLogs({ offset: newOffset });
  };
  
  const handlePrevPage = () => {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
    fetchLogs({ offset: newOffset });
  };
  
  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-500';
      case 'WARN': 
      case 'WARNING': return 'text-yellow-500';
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs()}
              className="p-2 rounded-full hover:bg-gray-100"
              disabled={loading}
            >
              <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>⟳</span>
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 rounded-full hover:bg-red-100 text-red-600"
              disabled={loading}
              title="Clear all logs"
            >
              <span>🗑️</span>
            </button>
          </div>
        </div>
        
        {/* 筛选控件 */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="flex space-x-2 flex-wrap">
            <Badge 
              variant={filter === null ? 'default' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleLevelFilter(null)}
            >
              All
            </Badge>
            <Badge 
              variant={filter === 'INFO' ? 'success' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleLevelFilter('INFO')}
            >
              Info
            </Badge>
            <Badge 
              variant={filter === 'WARN' ? 'warning' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleLevelFilter('WARN')}
            >
              Warning
            </Badge>
            <Badge 
              variant={filter === 'ERROR' ? 'destructive' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleLevelFilter('ERROR')}
            >
              Error
            </Badge>
            <Badge 
              variant={filter === 'DEBUG' ? 'secondary' : 'outline'} 
              className="cursor-pointer"
              onClick={() => handleLevelFilter('DEBUG')}
            >
              Debug
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-48 h-8 px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="h-8 px-3 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-yellow-50 text-yellow-800 p-2 rounded mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="py-4 text-center text-gray-500">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No logs available
          </div>
        ) : (
          <>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-[400px] overflow-y-auto">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className={getLevelColor(log.level)}>
                    [{log.timestamp}] {log.level}: {log.message}
                    {log.model_id && <span className="text-gray-400"> (model: {log.model_id})</span>}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-gray-500">No logs matching the current filters</div>
                )}
              </div>
            </div>
            
            {/* 分页控件 */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {logs.length} of {totalLogs} logs
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrevPage}
                  disabled={offset === 0 || loading}
                  className="h-8 px-3 text-sm border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <button 
                  onClick={handleNextPage}
                  disabled={(offset + logs.length) >= totalLogs || loading}
                  className="h-8 px-3 text-sm border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LogsPanel; 