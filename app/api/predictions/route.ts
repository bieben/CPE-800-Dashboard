import { NextResponse } from 'next/server';

// 使用localhost和映射端口访问Docker中的服务
const PREDICTIVE_API_URL = process.env.NEXT_PUBLIC_PREDICTIVE_API_URL || 'http://localhost:5001';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'latest';
  const limit = searchParams.get('limit') || '10';
  
  try {
    let apiUrl = '';
    
    if (type === 'latest') {
      apiUrl = `${PREDICTIVE_API_URL}/api/v1/predictions/latest`;
    } else if (type === 'history') {
      apiUrl = `${PREDICTIVE_API_URL}/api/v1/predictions/history?limit=${limit}`;
    } else {
      return NextResponse.json(
        { error: 'Invalid prediction type requested' },
        { status: 400 }
      );
    }
    
    const response = await fetchWithRetry(apiUrl);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch predictions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 