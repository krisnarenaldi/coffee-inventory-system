import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled, FeatureFlagContext } from '../../../../../lib/feature-flags';
import { z } from 'zod';

// Validation schema for feature flag evaluation
const evaluateSchema = z.object({
  flagKey: z.string().min(1, 'Flag key is required'),
  context: z.object({
    userId: z.string().optional(),
    tenantId: z.string().optional(),
    userRole: z.string().optional(),
    subscriptionPlan: z.string().optional(),
    customAttributes: z.record(z.any()).optional()
  }).optional().default({})
});

// POST /api/feature-flags/evaluate - Evaluate a single feature flag
export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    const { flagKey, context } = evaluateSchema.parse(body);

    const result = await isFeatureEnabled(flagKey, context as FeatureFlagContext);

    return NextResponse.json({
      success: true,
      result,
      flagKey
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

    console.error('Error evaluating feature flag:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        result: {
          isEnabled: false,
          reason: 'Error occurred during evaluation',
          flagKey: body?.flagKey || 'unknown'
        }
      },
      { status: 500 }
    );
  }
}