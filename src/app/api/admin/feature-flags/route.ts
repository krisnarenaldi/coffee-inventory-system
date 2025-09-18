import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllFeatureFlags, upsertFeatureFlag } from '../../../../../lib/feature-flags';
import { z } from 'zod';

// Validation schema for feature flag creation/update
const createFeatureFlagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  key: z.string().min(1, 'Key is required').regex(/^[a-z0-9_]+$/, 'Key must contain only lowercase letters, numbers, and underscores'),
  description: z.string().optional(),
  isEnabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).default(0),
  conditions: z.array(z.object({
    type: z.enum(['user_id', 'tenant_id', 'user_role', 'subscription_plan', 'custom']),
    operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'contains', 'greater_than', 'less_than']),
    value: z.string(),
    isEnabled: z.boolean().default(true)
  })).optional().default([])
});

// GET /api/admin/feature-flags - Get all feature flags
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const flags = await getAllFeatureFlags();

    return NextResponse.json({
      success: true,
      data: flags,
      total: flags.length
    });

  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags - Create a new feature flag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createFeatureFlagSchema.parse(body);

    // Create the feature flag without conditions first
    const flagData = {
      name: validatedData.name,
      key: validatedData.key,
      description: validatedData.description || '',
      isEnabled: validatedData.isEnabled,
      rolloutPercentage: validatedData.rolloutPercentage
    };
    
    const flag = await upsertFeatureFlag(flagData);

    return NextResponse.json({
      success: true,
      data: flag,
      message: 'Feature flag created successfully'
    }, { status: 201 });

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

    console.error('Error creating feature flag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}