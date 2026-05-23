import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'LevitateOS';
  const type = searchParams.get('type') || 'website';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#C8A96E' }}>{title}</div>
        <div style={{ fontSize: '24px', marginTop: '20px', color: '#F2EFE9' }}>AI automation for Indian SMBs</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
