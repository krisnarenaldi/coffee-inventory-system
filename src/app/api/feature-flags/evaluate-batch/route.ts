import { NextRequest, NextResponse } from 'next/server';
import { evaluateFeatureFlags, FeatureFlagContext } from '../../../../../lib/feature-flags';
import { z } from 'zod';

// Validation schema for batch feature flag evaluation
const evaluateBatchSchema = z.object({
  flagKeys: z.array(z.string().min(1)).min(1, 'At least one flag key is required'),
  context: z.object({
    userId: z.string().optional(),
    tenantId: z.string().optional(),
    userRole: z.string().optional(),
    subscriptionPlan: z.string().optional(),
    customAttributes: z.record(z.any()).optional()
  }).optional().default({})
});

// POST /api/feature-flags/evaluate-batch - Evaluate multiple feature flags
export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    const { flagKeys, context } = evaluateBatchSchema.parse(body);

    const results = await evaluateFeatureFlags(flagKeys, context as FeatureFlagContext);

    return NextResponse.json({
      success: true,
      results,
      count: Object.keys(results).length
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error evaluating feature flags:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        results: {},
        count: 0
      },
      { status: 500 }
    );
  }
}