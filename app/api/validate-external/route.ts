/**
 * API Route: /api/validate-external
 * 
 * Validates AHP calculations against AhpAnpLib (Creative Decisions Foundation).
 * 
 * Reference:
 *   MU, E. Creative Decisions Foundation Announces the Release of AHP/ANP
 *   Python Library. International Journal of the Analytic Hierarchy Process,
 *   v. 15, n. 2, 2023. DOI: 10.13033/ijahp.v15i2.1163
 */

import { NextRequest, NextResponse } from 'next/server';

const VALIDATOR_URL = process.env.AHP_VALIDATOR_URL || 'https://web-production-49489.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action = 'validate', ...payload } = data;

    // Route to appropriate endpoint
    let endpoint: string;
    switch (action) {
      case 'validate':
        endpoint = '/validate';
        break;
      case 'validate-project':
        endpoint = '/validate-project';
        break;
      case 'calculate':
        endpoint = '/calculate';
        break;
      default:
        endpoint = '/validate';
    }

    const response = await fetch(`${VALIDATOR_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Validator returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to validation service' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(VALIDATOR_URL, { method: 'GET' });
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Validation service unavailable', details: error.message },
      { status: 503 }
    );
  }
}
