import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { createAssetSchema, validateImageAsset, validateVideoAsset } from '../../lib/validation';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const assetRoutes: FastifyPluginAsync = async (fastify) => {
  // Get assets
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          type: { type: 'string', enum: ['image', 'video', 'thumbnail'] },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, type, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (account_id) {
      whereClause += ` AND account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        id,
        account_id,
        type,
        name,
        storage_url,
        width,
        height,
        duration_ms,
        file_size,
        aspect_ratio,
        created_at,
        updated_at
      FROM assets
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { assets: result.rows };
  });

  // Upload asset
  fastify.post('/upload', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
  }, async (request, reply) => {
    const userId = request.user.userId;
    
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          error: 'No file uploaded'
        });
      }
      
      const { filename, mimetype, file } = data;
      const buffer = await data.toBuffer();
      
      // Get account_id from form fields
      const fields = data.fields as any;
      const accountId = fields.account_id?.value;
      
      if (!accountId) {
        return reply.code(400).send({
          error: 'account_id is required'
        });
      }
      
      // Determine asset type
      let assetType: 'image' | 'video' | 'thumbnail';
      if (mimetype.startsWith('image/')) {
        assetType = 'image';
      } else if (mimetype.startsWith('video/')) {
        assetType = 'video';
      } else {
        return reply.code(400).send({
          error: 'Unsupported file type'
        });
      }
      
      // Generate MD5 hash for deduplication
      const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
      
      // Check for existing asset with same hash
      const existingResult = await query(
        'SELECT id, name, storage_url FROM assets WHERE md5 = $1 AND account_id = $2',
        [md5Hash, accountId]
      );
      
      if (existingResult.rows.length > 0) {
        return reply.code(409).send({
          error: 'Asset already exists',
          existing_asset: existingResult.rows[0]
        });
      }
      
      let assetData: any = {
        type: assetType,
        name: filename || `asset_${Date.now()}`,
        file_size: buffer.length,
        md5: md5Hash
      };
      
      // Process based on asset type
      if (assetType === 'image') {
        const imageValidation = validateImageAsset({
          width: 0, // Will be set below
          height: 0, // Will be set below
          size: buffer.length,
          type: mimetype
        });
        
        if (imageValidation.length > 0) {
          return reply.code(400).send({
            error: 'Image validation failed',
            details: imageValidation
          });
        }
        
        // Get image metadata
        const metadata = await sharp(buffer).metadata();
        assetData.width = metadata.width;
        assetData.height = metadata.height;
        assetData.aspect_ratio = calculateAspectRatio(metadata.width!, metadata.height!);
        
        // Optimize image
        const optimizedBuffer = await sharp(buffer)
          .jpeg({ quality: 85 })
          .toBuffer();
        
        // Save to storage
        const storagePath = await saveAssetToStorage(optimizedBuffer, accountId, assetData.name, 'jpg');
        assetData.storage_url = storagePath;
        
      } else if (assetType === 'video') {
        // For video, we'd typically use ffmpeg to get metadata
        // This is a placeholder implementation
        const videoValidation = validateVideoAsset({
          duration: 15000, // Placeholder: 15 seconds
          size: buffer.length,
          type: mimetype
        });
        
        if (videoValidation.length > 0) {
          return reply.code(400).send({
            error: 'Video validation failed',
            details: videoValidation
          });
        }
        
        assetData.duration_ms = 15000; // Placeholder
        
        // Save to storage
        const extension = mimetype.split('/')[1];
        const storagePath = await saveAssetToStorage(buffer, accountId, assetData.name, extension);
        assetData.storage_url = storagePath;
      }
      
      // Save to database
      const result = await query(`
        INSERT INTO assets (
          account_id, type, name, storage_url, md5,
          width, height, duration_ms, file_size, aspect_ratio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        accountId,
        assetData.type,
        assetData.name,
        assetData.storage_url,
        assetData.md5,
        assetData.width || null,
        assetData.height || null,
        assetData.duration_ms || null,
        assetData.file_size,
        assetData.aspect_ratio || null
      ]);
      
      const asset = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        accountId,
        'asset',
        asset.id,
        'upload',
        JSON.stringify(asset)
      ]);
      
      return reply.code(201).send(asset);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Asset upload failed',
        message: error.message
      });
    }
  });

  // Get asset details
  fastify.get('/:assetId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          assetId: { type: 'string' }
        },
        required: ['assetId']
      }
    }
  }, async (request, reply) => {
    const { assetId } = request.params as any;
    
    const result = await query(`
      SELECT 
        a.*,
        COUNT(DISTINCT ad.local_id) as usage_count
      FROM assets a
      LEFT JOIN ads ad ON a.id = ad.thumbnail_id
      WHERE a.id = $1
      GROUP BY a.id
    `, [assetId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Asset not found'
      });
    }
    
    return result.rows[0];
  });

  // Update asset metadata
  fastify.put('/:assetId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          assetId: { type: 'string' }
        },
        required: ['assetId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { assetId } = request.params as any;
    const { name } = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        UPDATE assets 
        SET name = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [name, assetId]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Asset not found'
        });
      }
      
      const updatedAsset = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        updatedAsset.account_id,
        'asset',
        assetId,
        'update',
        JSON.stringify(updatedAsset)
      ]);
      
      return updatedAsset;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Asset update failed',
        message: error.message
      });
    }
  });

  // Delete asset
  fastify.delete('/:assetId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          assetId: { type: 'string' }
        },
        required: ['assetId']
      }
    }
  }, async (request, reply) => {
    const { assetId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      // Check if asset is in use
      const usageResult = await query(
        'SELECT COUNT(*) as usage_count FROM ads WHERE thumbnail_id = $1',
        [assetId]
      );
      
      if (parseInt(usageResult.rows[0].usage_count) > 0) {
        return reply.code(400).send({
          error: 'Cannot delete asset',
          message: 'Asset is currently in use by ads'
        });
      }
      
      const result = await query(
        'DELETE FROM assets WHERE id = $1 RETURNING *',
        [assetId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Asset not found'
        });
      }
      
      const deletedAsset = result.rows[0];
      
      // Delete file from storage
      try {
        await deleteAssetFromStorage(deletedAsset.storage_url);
      } catch (storageError) {
        console.error('Failed to delete asset from storage:', storageError);
      }
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedAsset.account_id,
        'asset',
        assetId,
        'delete',
        JSON.stringify(deletedAsset)
      ]);
      
      return { message: 'Asset deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Asset deletion failed',
        message: error.message
      });
    }
  });

  // Bulk delete assets
  fastify.post('/bulk-delete', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          asset_ids: { type: 'array', items: { type: 'string' } }
        },
        required: ['asset_ids']
      }
    }
  }, async (request, reply) => {
    const { asset_ids } = request.body as any;
    const userId = request.user.userId;
    
    const results = [];
    
    for (const assetId of asset_ids) {
      try {
        // Check usage
        const usageResult = await query(
          'SELECT COUNT(*) as usage_count FROM ads WHERE thumbnail_id = $1',
          [assetId]
        );
        
        if (parseInt(usageResult.rows[0].usage_count) > 0) {
          results.push({
            asset_id: assetId,
            status: 'error',
            message: 'Asset is in use'
          });
          continue;
        }
        
        // Delete asset
        const result = await query(
          'DELETE FROM assets WHERE id = $1 RETURNING *',
          [assetId]
        );
        
        if (result.rows.length > 0) {
          const deletedAsset = result.rows[0];
          
          // Delete from storage
          try {
            await deleteAssetFromStorage(deletedAsset.storage_url);
          } catch (storageError) {
            console.error('Failed to delete asset from storage:', storageError);
          }
          
          results.push({
            asset_id: assetId,
            status: 'success'
          });
        } else {
          results.push({
            asset_id: assetId,
            status: 'error',
            message: 'Asset not found'
          });
        }
        
      } catch (error: any) {
        results.push({
          asset_id: assetId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      results,
      summary: {
        total: asset_ids.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      }
    };
  });

  // Generate asset variants
  fastify.post('/:assetId/variants', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          assetId: { type: 'string' }
        },
        required: ['assetId']
      },
      body: {
        type: 'object',
        properties: {
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aspect_ratio: { type: 'string' },
                width: { type: 'number' },
                height: { type: 'number' }
              }
            }
          }
        },
        required: ['variants']
      }
    }
  }, async (request, reply) => {
    const { assetId } = request.params as any;
    const { variants } = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get original asset
      const assetResult = await query(
        'SELECT * FROM assets WHERE id = $1 AND type = $2',
        [assetId, 'image']
      );
      
      if (assetResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Image asset not found'
        });
      }
      
      const originalAsset = assetResult.rows[0];
      
      // Load original image
      const originalBuffer = await loadAssetFromStorage(originalAsset.storage_url);
      const generatedVariants = [];
      
      for (const variant of variants) {
        try {
          // Generate resized variant
          const resizedBuffer = await sharp(originalBuffer)
            .resize(variant.width, variant.height, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85 })
            .toBuffer();
          
          const variantMd5 = crypto.createHash('md5').update(resizedBuffer).digest('hex');
          const variantName = `${originalAsset.name}_${variant.aspect_ratio}`;
          const storagePath = await saveAssetToStorage(
            resizedBuffer,
            originalAsset.account_id,
            variantName,
            'jpg'
          );
          
          // Save variant to database
          const variantResult = await query(`
            INSERT INTO assets (
              account_id, type, name, storage_url, md5,
              width, height, file_size, aspect_ratio
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `, [
            originalAsset.account_id,
            'image',
            variantName,
            storagePath,
            variantMd5,
            variant.width,
            variant.height,
            resizedBuffer.length,
            variant.aspect_ratio
          ]);
          
          generatedVariants.push(variantResult.rows[0]);
          
        } catch (variantError: any) {
          console.error('Failed to generate variant:', variantError);
        }
      }
      
      return {
        original_asset: originalAsset,
        generated_variants: generatedVariants,
        summary: {
          requested: variants.length,
          generated: generatedVariants.length
        }
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Variant generation failed',
        message: error.message
      });
    }
  });
};

// Helper functions
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const ratioWidth = width / divisor;
  const ratioHeight = height / divisor;
  
  // Map to common aspect ratios
  const ratio = ratioWidth / ratioHeight;
  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 1.91) < 0.1) return '1.91:1';
  if (Math.abs(ratio - 0.8) < 0.1) return '4:5';
  
  return `${ratioWidth}:${ratioHeight}`;
}

async function saveAssetToStorage(buffer: Buffer, accountId: string, name: string, extension: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', accountId);
  await fs.mkdir(uploadsDir, { recursive: true });
  
  const filename = `${Date.now()}_${name}.${extension}`;
  const filepath = path.join(uploadsDir, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return `/public/uploads/${accountId}/${filename}`;
}

async function loadAssetFromStorage(storagePath: string): Promise<Buffer> {
  const filepath = path.join(process.cwd(), storagePath.replace('/public/', 'public/'));
  return await fs.readFile(filepath);
}

async function deleteAssetFromStorage(storagePath: string): Promise<void> {
  const filepath = path.join(process.cwd(), storagePath.replace('/public/', 'public/'));
  await fs.unlink(filepath);
}

export default assetRoutes;
