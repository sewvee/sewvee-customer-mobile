const fs = require('fs');
const file = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-portal/customer-portal.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `.leftJoin('o.outfits', 'outfit')`,
  `.leftJoin('o.outfits', 'outfit')
      .leftJoin('outfit.stitching', 'stitching')
      .leftJoin('stitching.category', 'cat')
      .leftJoin('stitching.option', 'opt')
      .leftJoin('outfit.photos', 'photo')`
);

code = code.replace(
  `'outfit.requested_photos_from_client',`,
  `'outfit.requested_photos_from_client',
        'outfit.outfit_order_type',
        'outfit.urgency',
        'outfit.customer_notes',
        'outfit.trial_date',
        'outfit.delivery_date',
        'outfit.total_amount',
        'stitching.id',
        'cat.name',
        'opt.name',
        'photo.id',
        'photo.file_url',
        'photo.category',`
);

code = code.replace(
  `outfits: ((o as any).outfits || []).map((outfit: any) => ({
        id: outfit.id,
        name: outfit.outfit_type,
        requestedPhotosFromClient: outfit.requested_photos_from_client,
        photos: [],
      })),`,
  `outfits: ((o as any).outfits || []).map((outfit: any) => ({
        id: outfit.id,
        name: outfit.outfit_type,
        requestedPhotosFromClient: outfit.requested_photos_from_client,
        orderType: outfit.outfit_order_type,
        urgency: outfit.urgency,
        notes: outfit.customer_notes,
        trialDate: outfit.trial_date,
        deliveryDate: outfit.delivery_date,
        totalAmount: outfit.total_amount,
        photos: (outfit.photos || []).map((p: any) => ({
          id: p.id,
          file_url: p.file_url,
          category: p.category,
        })),
        stitching: (outfit.stitching || []).map((s: any) => ({
          id: s.id,
          category: { name: s.category?.name },
          option: { name: s.option?.name },
        })),
      })),`
);

fs.writeFileSync(file, code);
