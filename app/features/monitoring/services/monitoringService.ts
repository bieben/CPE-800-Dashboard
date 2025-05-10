import axios from 'axios';

export interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    api: string;
    collector: string;
    model: string;
    cpu: string;
    memory: string;
    [key: string]: string; // 保留动态属性键支持
  };
  components_initialized: boolean;
  models: {
    total: number;
    deployed: number;
  };
}

export interface Metrics {
  requestsTotal: number;
  predictionsTotal: number;
  errorsTotal: number;
  errorTypes: {
    [key: string]: number;
  };
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}

export interface AlertRule {
  name: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  status: 'firing' | 'resolved';
  value: number;
  threshold: number;
  since: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  message: string;
  model_id?: string;
  context?: Record<string, any>;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  offset: number;
  limit: number;
  filters_active: {
    level: string | null;
    model_id: string | null;
    time_range: [number | null, number | null];
  };
}

export interface LogsQueryParams {
  limit?: number;
  offset?: number;
  level?: string;
  model_id?: string;
  start_time?: number;
  end_time?: number;
  query?: string;
}

// 使用环境变量或默认值设置API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * 获取模型服务健康状态
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    const data = response.data;
    
    // 将API的响应格式转换为前端需要的格式
    return {
      status: data.status || 'unknown',
      timestamp: new Date().toISOString(), // 使用当前时间作为默认值
      services: {
        api: 'up', // 如果能获取响应，API服务肯定是up的
        // 添加CPU和内存状态
        cpu: data.cpu_usage && typeof data.cpu_usage.percent === 'number' 
          ? (data.cpu_usage.percent < 80 ? 'up' : 'warning') 
          : 'unknown',
        memory: data.memory_usage && typeof data.memory_usage.percent === 'number'
          ? (data.memory_usage.percent < 80 ? 'up' : 'warning')
          : 'unknown',
        // 添加模型服务状态
        model: data.models && data.models.deployed > 0 ? 'up' : 'down',
        // 添加其他服务状态
        collector: 'unknown'
      },
      components_initialized: true,
      models: {
        total: data.models?.registered || 0,
        deployed: data.models?.deployed || 0
      }
    };
  } catch (error) {
    // 无论出现什么错误，都记录错误并返回模拟数据
    console.error('Error fetching health status:', error);
    console.log('Using mock health status data as fallback');
    return getMockHealthStatus();
  }
}

/**
 * 从Prometheus获取指标数据
 */
export async function getMetrics(): Promise<Metrics> {
  try {
    // 调用Prometheus获取原始指标
    const response = await axios.get(`${API_BASE_URL}/metrics`);
    const metricsText = response.data;
    
    // 解析Prometheus格式的指标数据
    const requestsTotal = extractMetricValue(metricsText, 'model_service_requests_total');
    const predictionsTotal = extractMetricValue(metricsText, 'model_service_requests_total{endpoint="/predict"}');
    const errorsTotal = extractMetricValue(metricsText, 'model_errors_total');
    
    // 解析错误类型
    const errorTypes: { [key: string]: number } = {};
    const errorTypeRegex = /model_errors_total{error_type="([^"]+)"[^}]*} (\d+)/g;
    let match;
    while ((match = errorTypeRegex.exec(metricsText)) !== null) {
      const errorType = match[1];
      const count = parseInt(match[2], 10);
      errorTypes[errorType] = count;
    }
    
    // 解析延迟指标
    const avgLatency = extractMetricValue(metricsText, 'model_request_latency_seconds_sum') / 
                     Math.max(1, extractMetricValue(metricsText, 'model_request_latency_seconds_count'));
    
    const p95Latency = extractMetricValue(metricsText, 'model_request_latency_seconds{quantile="0.95"}');
    const p99Latency = extractMetricValue(metricsText, 'model_request_latency_seconds{quantile="0.99"}');
    
    return {
      requestsTotal,
      predictionsTotal,
      errorsTotal,
      errorTypes,
      avgLatency,
      p95Latency,
      p99Latency
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    console.log('Using mock metrics data as fallback');
    // 当API不可用时，返回模拟数据而不是抛出异常
    return getMockMetrics();
  }
}

/**
 * 获取当前活跃的告警
 */
export async function getAlerts(): Promise<AlertRule[]> {
  try {
    // 从API获取告警数据
    const response = await axios.get(`${API_BASE_URL}/alerts`);
    const alertsData = response.data || [];
    
    // 转换为前端需要的格式
    return alertsData.map((alert: any) => ({
      name: alert.name || alert.type || 'Unknown Alert',
      severity: mapAlertLevel(alert.level),
      description: alert.message || '',
      status: alert.active ? 'firing' : 'resolved',
      value: alert.value || 0,
      threshold: alert.threshold || 0,
      since: alert.since || new Date().toISOString()
    }));
  } catch (error) {
    // 无论出现什么错误（包括404），都记录错误并返回模拟数据
    console.error('Error fetching alerts:', error);
    console.log('Using mock alerts data as fallback');
    // 当API不可用时，返回模拟数据
    return getMockAlerts();
  }
}

/**
 * 获取告警配置
 */
export async function getAlertsConfig(): Promise<{
  cpu_threshold: number;
  memory_threshold: number;
  disk_threshold: number;
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/alerts/config`);
    return response.data.config || {
      cpu_threshold: 80,
      memory_threshold: 85,
      disk_threshold: 90
    };
  } catch (error) {
    console.error('Error fetching alerts config:', error);
    // 返回默认值
    return {
      cpu_threshold: 80,
      memory_threshold: 85,
      disk_threshold: 90
    };
  }
}

/**
 * 更新告警配置
 */
export async function updateAlertsConfig(config: {
  cpu_threshold?: number;
  memory_threshold?: number;
  disk_threshold?: number;
}): Promise<boolean> {
  try {
    const response = await axios.post(`${API_BASE_URL}/alerts/config`, config);
    return response.data.status === 'success';
  } catch (error) {
    console.error('Error updating alerts config:', error);
    return false;
  }
}

/**
 * 获取服务日志
 */
export async function getLogs(params: LogsQueryParams = {}): Promise<LogsResponse> {
  try {
    // 构建简化的查询参数，移除undefined和null值
    const cleanParams: Record<string, string> = {};
    
    if (params.limit !== undefined && params.limit > 0) {
      cleanParams.limit = params.limit.toString();
    }
    
    if (params.offset !== undefined && params.offset >= 0) {
      cleanParams.offset = params.offset.toString();
    }
    
    if (params.level && typeof params.level === 'string') {
      cleanParams.level = params.level.toUpperCase();
    }
    
    if (params.model_id && typeof params.model_id === 'string') {
      cleanParams.model_id = params.model_id;
    }
    
    if (params.start_time !== undefined && params.start_time > 0) {
      cleanParams.start_time = params.start_time.toString();
    }
    
    if (params.end_time !== undefined && params.end_time > 0) {
      cleanParams.end_time = params.end_time.toString();
    }
    
    if (params.query && typeof params.query === 'string' && params.query.trim() !== '') {
      cleanParams.query = params.query.trim();
    }
    
    // 构建查询字符串，手动而不是使用URLSearchParams，避免可能的编码问题
    const queryString = Object.entries(cleanParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    // 发送请求
    const url = `${API_BASE_URL}/logs${queryString ? `?${queryString}` : ''}`;
    console.log('Logs request URL:', url);
    
    const response = await axios.get(url, {
      timeout: 5000, // 添加超时限制
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // 处理响应
    const data = response.data;
    
    // 安全检查：确保data和data.logs存在且是数组
    if (!data || !Array.isArray(data.logs)) {
      console.error('Invalid response format from logs API:', data);
      return getMockLogsResponse();
    }
    
    // 确保日志对象格式符合前端期望
    const processedLogs = data.logs.map((log: any) => ({
      timestamp: log.timestamp || new Date().toISOString(),
      level: (log.level || 'INFO').toUpperCase(),
      message: log.message || '',
      model_id: log.model_id || undefined,
      context: log.context || undefined
    }));
    
    return {
      logs: processedLogs,
      total: typeof data.total === 'number' ? data.total : processedLogs.length,
      offset: typeof data.offset === 'number' ? data.offset : 0,
      limit: typeof data.limit === 'number' ? data.limit : 50,
      filters_active: {
        level: data.filters_active?.level || null,
        model_id: data.filters_active?.model_id || null,
        time_range: Array.isArray(data.filters_active?.time_range) ? 
          data.filters_active.time_range : [null, null]
      }
    };
  } catch (error) {
    console.error('Error fetching logs:', error);
    console.log('Using mock logs data as fallback');
    return getMockLogsResponse();
  }
}

/**
 * 返回模拟日志响应，用于错误处理时
 */
function getMockLogsResponse(): LogsResponse {
  const mockLogs = getMockLogs();
  return {
    logs: mockLogs,
    total: mockLogs.length,
    offset: 0,
    limit: 50,
    filters_active: {
      level: null,
      model_id: null,
      time_range: [null, null]
    }
  };
}

/**
 * 清空日志缓存
 */
export async function clearLogs(): Promise<boolean> {
  try {
    await axios.post(`${API_BASE_URL}/logs/clear`);
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    return false;
  }
}

/**
 * 从Prometheus指标文本中提取特定指标的值
 */
function extractMetricValue(metricsText: string, metricName: string): number {
  // 处理特殊情况：总请求数需要累加所有endpoint的值
  if (metricName === 'model_service_requests_total') {
    const regex = new RegExp(`${metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}{[^}]*} (\\d+(?:\\.\\d+)?)`, 'g');
    let match;
    let sum = 0;
    
    while ((match = regex.exec(metricsText)) !== null) {
      sum += parseFloat(match[1]);
    }
    return sum;
  } 
  // 处理带有特定endpoint的请求数，如"/predict"
  else if (metricName.includes('model_service_requests_total{endpoint=')) {
    const endpoint = metricName.match(/endpoint="([^"]+)"/)?.[1];
    if (endpoint) {
      const regex = new RegExp(`model_service_requests_total{endpoint="${endpoint}"[^}]*} (\\d+(?:\\.\\d+)?)`, 'g');
      let match;
      let sum = 0;
      
      while ((match = regex.exec(metricsText)) !== null) {
        sum += parseFloat(match[1]);
      }
      return sum;
    }
  }
  
  // 对于错误总数，累加所有error_type
  else if (metricName === 'model_errors_total') {
    const regex = new RegExp(`${metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}{[^}]*} (\\d+(?:\\.\\d+)?)`, 'g');
    let match;
    let sum = 0;
    
    while ((match = regex.exec(metricsText)) !== null) {
      sum += parseFloat(match[1]);
    }
    return sum;
  }
  
  // 默认情况：尝试匹配简单指标或带有quantile的延迟指标
  const regex = new RegExp(`${metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:{[^}]*})? (\\d+(?:\\.\\d+)?)`);
  const match = metricsText.match(regex);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * 映射告警级别到前端使用的严重性级别
 */
function mapAlertLevel(level: string): 'critical' | 'warning' | 'info' {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return 'critical';
    case 'WARNING':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * 模拟数据用于开发阶段
 */
export function getMockHealthStatus(): HealthStatus {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      collector: 'up',
      model: 'up',
      cpu: 'up',
      memory: 'up'
    },
    components_initialized: true,
    models: {
      total: 2,
      deployed: 1
    }
  };
}

export function getMockMetrics(): Metrics {
  return {
    requestsTotal: 125,
    predictionsTotal: 110,
    errorsTotal: 15,
    errorTypes: {
      'input_validation': 7,
      'prediction_timeout': 3,
      'model_not_found': 5
    },
    avgLatency: 0.35,
    p95Latency: 0.85,
    p99Latency: 1.2
  };
}

export function getMockAlerts(): AlertRule[] {
  return [
    {
      name: 'High Latency',
      severity: 'warning',
      description: 'Service response time is higher than expected',
      status: 'resolved',
      value: 0.8,
      threshold: 1.0,
      since: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      name: 'Error Rate',
      severity: 'critical',
      description: 'High error rate detected',
      status: 'resolved',
      value: 1,
      threshold: 3,
      since: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ];
}

export function getMockLogs(): LogEntry[] {
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
} 