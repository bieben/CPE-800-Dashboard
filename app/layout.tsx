import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ModelProvider } from './features/models/context/ModelContext';
import { AuthProvider } from './features/auth/contexts/AuthContext';
import { DeploymentProvider } from './features/deployments/context/DeploymentContext';
import { PredictiveProvider } from './features/analytics/context/PredictiveContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ICNS Model Management System',
  description: 'A system for managing ML models and deployments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ModelProvider>
            <DeploymentProvider>
              <PredictiveProvider>
                {children}
              </PredictiveProvider>
            </DeploymentProvider>
          </ModelProvider>
        </AuthProvider>
      </body>
    </html>
  );
}