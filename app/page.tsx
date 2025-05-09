'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useModels } from '@/features/models/context/ModelContext';
import { useDeployments } from '@/features/deployments/context/DeploymentContext';
import Navigation from '@/features/shared/components/Navigation';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  className?: string;
}

function StatCard({ title, value, description, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {value}
            </dd>
          </div>
        </div>
        {description && (
          <p className="mt-2 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  actionText: string;
  href: string;
  className?: string;
}

function ActionCard({ title, description, actionText, href, className = '' }: ActionCardProps) {
  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {actionText}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { models } = useModels();
  const { deployments } = useDeployments();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // 计算统计数据
  const totalModels = models.length;
  const activeDeployments = deployments.filter(d => d.status === 'running').length;
  const totalDeployments = deployments.length;
  const deploymentSuccessRate = totalDeployments > 0
    ? Math.round((deployments.filter(d => d.status !== 'failed').length / totalDeployments) * 100)
    : 100;

  // 获取最近的部署
  const recentDeployments = deployments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎信息 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.email}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your models and deployments
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Models"
            value={totalModels}
            description="Total number of models in your system"
          />
          <StatCard
            title="Active Deployments"
            value={activeDeployments}
            description="Currently running deployments"
          />
          <StatCard
            title="Total Deployments"
            value={totalDeployments}
            description="All deployments across environments"
          />
          <StatCard
            title="Deployment Success Rate"
            value={`${deploymentSuccessRate}%`}
            description="Percentage of successful deployments"
          />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              title="Add New Model"
              description="Upload and configure a new model in the system"
              actionText="Add Model"
              href="/models"
            />
            <ActionCard
              title="Deploy New Model"
              description="Deploy a model to development, staging, or production environment"
              actionText="Deploy Model"
              href="/deployments"
            />
            <ActionCard
              title="View Analytics"
              description="Monitor performance metrics and resource usage"
              actionText="View Analytics"
              href="/analytics"
            />
            <ActionCard
              title="Deploy Fedora Server"
              description="Deploy Fedora Server with Ansible"
              actionText="Deploy Fedora"
              href="/deploy/fedora"
            />
            <ActionCard
              title="Predictive Analytics"
              description="View resource usage forecasts and optimization recommendations"
              actionText="View Predictions"
              href="/predictive"
            />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Deployments</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {recentDeployments.map((deployment) => (
                <li key={deployment.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-primary-600 truncate">
                          {deployment.modelName}
                        </p>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          deployment.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : deployment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : deployment.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {deployment.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(deployment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Environment: {deployment.environment}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {recentDeployments.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No recent deployments
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 