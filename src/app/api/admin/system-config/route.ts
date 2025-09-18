import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

interface SystemConfig {
  id: string;
  category: 'general' | 'security' | 'billing' | 'features' | 'limits' | 'integrations';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description: string;
  isPublic: boolean; // Whether this config can be accessed by tenants
  isEditable: boolean; // Whether this config can be modified
  validationRules?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  lastModified: string;
  modifiedBy: string;
}

interface ConfigCategory {
  category: string;
  name: string;
  description: string;
  configs: SystemConfig[];
}

// GET /api/admin/system-config - Get system configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');
    const includePublic = searchParams.get('includePublic') === 'true';

    // If specific config requested
    if (key) {
      const config = await getSystemConfig(key);
      if (!config) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(config);
    }

    // Get all configurations
    const configs = await getAllSystemConfigs(category, includePublic);
    
    // Group by category
    const categorizedConfigs = groupConfigsByCategory(configs);
    
    return NextResponse.json({
      categories: categorizedConfigs,
      totalConfigs: configs.length
    });
  } catch (error) {
    console.error('Error fetching system configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/system-config - Create new configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, key, value, type, description, isPublic, isEditable, validationRules } = body;

    if (!category || !key || value === undefined || !type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if config already exists
    const existingConfig = await getSystemConfig(key);
    if (existingConfig) {
      return NextResponse.json(
        { error: 'Configuration with this key already exists' },
        { status: 409 }
      );
    }

    // Validate value based on type
    const validationResult = validateConfigValue(value, type, validationRules);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error}` },
        { status: 400 }
      );
    }

    const config: SystemConfig = {
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      key,
      value: validationResult.value,
      type,
      description,
      isPublic: isPublic || false,
      isEditable: isEditable !== false, // Default to true
      validationRules,
      lastModified: new Date().toISOString(),
      modifiedBy: session.user.id
    };

    await saveSystemConfig(config);
    
    return NextResponse.json({
      message: 'Configuration created successfully',
      config
    });
  } catch (error) {
    console.error('Error creating system configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/system-config - Update configuration
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { key, value, description, isPublic, isEditable, validationRules } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    const existingConfig = await getSystemConfig(key);
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    if (!existingConfig.isEditable) {
      return NextResponse.json(
        { error: 'This configuration is not editable' },
        { status: 403 }
      );
    }

    // Validate new value if provided
    let newValue = existingConfig.value;
    if (value !== undefined) {
      const validationResult = validateConfigValue(value, existingConfig.type, validationRules || existingConfig.validationRules);
      if (!validationResult.valid) {
        return NextResponse.json(
          { error: `Validation failed: ${validationResult.error}` },
          { status: 400 }
        );
      }
      newValue = validationResult.value;
    }

    const updatedConfig: SystemConfig = {
      ...existingConfig,
      value: newValue,
      description: description || existingConfig.description,
      isPublic: isPublic !== undefined ? isPublic : existingConfig.isPublic,
      isEditable: isEditable !== undefined ? isEditable : existingConfig.isEditable,
      validationRules: validationRules || existingConfig.validationRules,
      lastModified: new Date().toISOString(),
      modifiedBy: session.user.id
    };

    await saveSystemConfig(updatedConfig);
    
    return NextResponse.json({
      message: 'Configuration updated successfully',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/system-config - Delete configuration
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Configuration key is required' },
        { status: 400 }
      );
    }

    const existingConfig = await getSystemConfig(key);
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    if (!existingConfig.isEditable) {
      return NextResponse.json(
        { error: 'This configuration cannot be deleted' },
        { status: 403 }
      );
    }

    await deleteSystemConfig(key);
    
    return NextResponse.json({
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting system configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getSystemConfig(key: string): Promise<SystemConfig | null> {
  // In a real implementation, fetch from database
  const configs = await getAllSystemConfigs();
  return configs.find(c => c.key === key) || null;
}

async function getAllSystemConfigs(category?: string | null, includePublic: boolean = false): Promise<SystemConfig[]> {
  // In a real implementation, fetch from database
  // For now, return mock configurations
  const allConfigs: SystemConfig[] = [
    {
      id: 'config_1',
      category: 'general',
      key: 'app_name',
      value: 'Brewery Inventory Management',
      type: 'string',
      description: 'Application name displayed in the UI',
      isPublic: true,
      isEditable: true,
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_2',
      category: 'general',
      key: 'app_version',
      value: '1.0.0',
      type: 'string',
      description: 'Current application version',
      isPublic: true,
      isEditable: false,
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'system'
    },
    {
      id: 'config_3',
      category: 'security',
      key: 'session_timeout',
      value: 3600,
      type: 'number',
      description: 'Session timeout in seconds',
      isPublic: false,
      isEditable: true,
      validationRules: {
        required: true,
        min: 300,
        max: 86400
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_4',
      category: 'security',
      key: 'password_min_length',
      value: 8,
      type: 'number',
      description: 'Minimum password length',
      isPublic: true,
      isEditable: true,
      validationRules: {
        required: true,
        min: 6,
        max: 128
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_5',
      category: 'security',
      key: 'require_2fa',
      value: false,
      type: 'boolean',
      description: 'Require two-factor authentication for all users',
      isPublic: true,
      isEditable: true,
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_6',
      category: 'billing',
      key: 'trial_period_days',
      value: 14,
      type: 'number',
      description: 'Trial period duration in days',
      isPublic: true,
      isEditable: true,
      validationRules: {
        required: true,
        min: 1,
        max: 90
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_7',
      category: 'billing',
      key: 'grace_period_days',
      value: 3,
      type: 'number',
      description: 'Grace period for failed payments in days',
      isPublic: false,
      isEditable: true,
      validationRules: {
        required: true,
        min: 0,
        max: 30
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_8',
      category: 'features',
      key: 'enable_analytics',
      value: true,
      type: 'boolean',
      description: 'Enable analytics and reporting features',
      isPublic: true,
      isEditable: true,
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_9',
      category: 'features',
      key: 'supported_languages',
      value: ['en', 'es', 'fr', 'de'],
      type: 'array',
      description: 'List of supported language codes',
      isPublic: true,
      isEditable: true,
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_10',
      category: 'limits',
      key: 'max_file_upload_size',
      value: 10485760,
      type: 'number',
      description: 'Maximum file upload size in bytes (10MB)',
      isPublic: true,
      isEditable: true,
      validationRules: {
        required: true,
        min: 1048576,
        max: 104857600
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_11',
      category: 'limits',
      key: 'api_rate_limit',
      value: 1000,
      type: 'number',
      description: 'API rate limit per hour per tenant',
      isPublic: false,
      isEditable: true,
      validationRules: {
        required: true,
        min: 100,
        max: 10000
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    },
    {
      id: 'config_12',
      category: 'integrations',
      key: 'webhook_timeout',
      value: 30,
      type: 'number',
      description: 'Webhook timeout in seconds',
      isPublic: false,
      isEditable: true,
      validationRules: {
        required: true,
        min: 5,
        max: 300
      },
      lastModified: '2024-12-01T10:00:00Z',
      modifiedBy: 'admin_1'
    }
  ];

  let filteredConfigs = allConfigs;
  
  // Filter by category
  if (category) {
    filteredConfigs = filteredConfigs.filter(c => c.category === category);
  }
  
  // Filter by public visibility
  if (!includePublic) {
    // Return all configs for admin
  } else {
    // Return only public configs
    filteredConfigs = filteredConfigs.filter(c => c.isPublic);
  }
  
  return filteredConfigs;
}

async function saveSystemConfig(config: SystemConfig): Promise<void> {
  // In a real implementation, save to database
  console.log('Saving system config:', config.key, config.value);
}

async function deleteSystemConfig(key: string): Promise<void> {
  // In a real implementation, delete from database
  console.log('Deleting system config:', key);
}

function validateConfigValue(value: any, type: string, rules?: SystemConfig['validationRules']): { valid: boolean; value?: any; error?: string } {
  try {
    let processedValue = value;
    
    // Type validation and conversion
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Value must be a string' };
        }
        break;
        
      case 'number':
        processedValue = Number(value);
        if (isNaN(processedValue)) {
          return { valid: false, error: 'Value must be a number' };
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Value must be a boolean' };
        }
        break;
        
      case 'json':
        if (typeof value === 'string') {
          try {
            processedValue = JSON.parse(value);
          } catch {
            return { valid: false, error: 'Value must be valid JSON' };
          }
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Value must be an array' };
        }
        break;
        
      default:
        return { valid: false, error: 'Invalid type specified' };
    }
    
    // Validation rules
    if (rules) {
      if (rules.required && (processedValue === null || processedValue === undefined || processedValue === '')) {
        return { valid: false, error: 'Value is required' };
      }
      
      if (type === 'number' && typeof processedValue === 'number') {
        if (rules.min !== undefined && processedValue < rules.min) {
          return { valid: false, error: `Value must be at least ${rules.min}` };
        }
        if (rules.max !== undefined && processedValue > rules.max) {
          return { valid: false, error: `Value must be at most ${rules.max}` };
        }
      }
      
      if (type === 'string' && typeof processedValue === 'string') {
        if (rules.min !== undefined && processedValue.length < rules.min) {
          return { valid: false, error: `Value must be at least ${rules.min} characters` };
        }
        if (rules.max !== undefined && processedValue.length > rules.max) {
          return { valid: false, error: `Value must be at most ${rules.max} characters` };
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(processedValue)) {
          return { valid: false, error: 'Value does not match required pattern' };
        }
      }
      
      if (rules.options && !rules.options.includes(processedValue)) {
        return { valid: false, error: `Value must be one of: ${rules.options.join(', ')}` };
      }
    }
    
    return { valid: true, value: processedValue };
  } catch (error) {
    return { valid: false, error: 'Validation error occurred' };
  }
}

function groupConfigsByCategory(configs: SystemConfig[]): ConfigCategory[] {
  const categoryMap = new Map<string, SystemConfig[]>();
  
  configs.forEach(config => {
    if (!categoryMap.has(config.category)) {
      categoryMap.set(config.category, []);
    }
    categoryMap.get(config.category)!.push(config);
  });
  
  const categoryInfo = {
    general: { name: 'General Settings', description: 'Basic application settings' },
    security: { name: 'Security Settings', description: 'Authentication and security configurations' },
    billing: { name: 'Billing Settings', description: 'Subscription and payment configurations' },
    features: { name: 'Feature Settings', description: 'Feature flags and capabilities' },
    limits: { name: 'System Limits', description: 'Resource and usage limits' },
    integrations: { name: 'Integration Settings', description: 'Third-party service configurations' }
  };
  
  return Array.from(categoryMap.entries()).map(([category, configs]) => ({
    category,
    name: categoryInfo[category as keyof typeof categoryInfo]?.name || category,
    description: categoryInfo[category as keyof typeof categoryInfo]?.description || '',
    configs: configs.sort((a, b) => a.key.localeCompare(b.key))
  }));
}