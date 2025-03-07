'use client';

const stats = [
  { name: 'Total Models', value: '12' },
  { name: 'Running Models', value: '4' },
  { name: 'Total Requests', value: '1.2M' },
  { name: 'Storage Used', value: '85%' },
];

const quickActions = [
  { name: 'Deploy Model', description: 'Deploy a new model to production' },
  { name: 'Monitor Performance', description: 'View model performance metrics' },
  { name: 'Manage Resources', description: 'Adjust resource allocation' },
];

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="stat-card">
            <div className="stat-label">
              {item.name}
            </div>
            <div className="stat-value">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.name}
              className="action-button"
            >
              <h3 className="action-title">
                {action.name}
              </h3>
              <p className="action-description">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="activity-item">
              <div className="flex justify-between items-start">
                <div>
                  <div className="activity-title">
                    Model GPT-3 was updated
                  </div>
                  <div className="activity-description">
                    Performance optimization completed
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="status-success">
                    Successful
                  </div>
                  <div className="activity-time">
                    2 hours ago
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 