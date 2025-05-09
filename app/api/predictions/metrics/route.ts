import { NextResponse } from 'next/server';

// 使用localhost和映射端口访问Docker中的服务
const PREDICTIVE_API_URL = process.env.NEXT_PUBLIC_PREDICTIVE_API_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const response = await fetch(`${PREDICTIVE_API_URL}/api/v1/metrics`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch system metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 