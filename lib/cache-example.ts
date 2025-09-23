/**
 * Example of how to use cache invalidation in API routes
 * 
 * This file shows patterns for implementing cache invalidation
 * when data changes to maintain consistency.
 */

import { CacheInvalidation } from './cache-invalidation';

// Example: Ingredient API with cache invalidation
export async function updateIngredient(tenantId: string, ingredientId: string, data: any) {
  // Update the ingredient in database
  // const updatedIngredient = await prisma.ingredient.update({...});
  
  // Invalidate related caches
  CacheInvalidation.onIngredientChange(tenantId);
  
  // Return updated data
  // return updatedIngredient;
}

// Example: Batch API with cache invalidation
export async function createBatch(tenantId: string, batchData: any) {
  // Create the batch in database
  // const newBatch = await prisma.batch.create({...});
  
  // Invalidate related caches
  CacheInvalidation.onBatchChange(tenantId);
  
  // Return new batch
  // return newBatch;
}

// Example: Subscription API with cache invalidation
export async function updateSubscription(tenantId: string, subscriptionData: any) {
  // Update subscription in database
  // const updatedSubscription = await prisma.subscription.update({...});
  
  // Invalidate subscription caches
  CacheInvalidation.onSubscriptionChange(tenantId);
  
  // Return updated subscription
  // return updatedSubscription;
}

// Example: How to add cache invalidation to existing API routes
/*

// In your API route file (e.g., src/app/api/ingredients/[id]/route.ts):

import { CacheInvalidation } from '../../../../../lib/cache-invalidation';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = await request.json();

    // Update ingredient
    const updatedIngredient = await prisma.ingredient.update({
      where: { id: params.id, tenantId },
      data: body,
    });

    // Invalidate related caches
    CacheInvalidation.onIngredientChange(tenantId);

    return NextResponse.json(updatedIngredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

*/

// Example: Batch cache invalidation for multiple operations
export async function performBulkInventoryUpdate(tenantId: string, updates: any[]) {
  // Perform multiple database operations
  // await Promise.all(updates.map(update => prisma.ingredient.update(update)));
  
  // Single cache invalidation for all changes
  CacheInvalidation.onMajorChange(tenantId);
}

export default {
  updateIngredient,
  createBatch,
  updateSubscription,
  performBulkInventoryUpdate,
};
