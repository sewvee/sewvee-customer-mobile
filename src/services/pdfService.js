import RNPrint from 'react-native-print';
import { generatePDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Alert, Platform } from 'react-native';
import { formatDate } from '../utils/dateUtils';
import { getItemQuantitySections } from '../utils/orderQuantitySections';

export const convertLogoToBase64 = async (logoUrl) => {
  if (!logoUrl || typeof logoUrl !== 'string' || !logoUrl.startsWith('http')) return logoUrl;
  try {
    const localFile = `${RNFS.CachesDirectoryPath}/temp_logo_${Date.now()}.png`;
    const download = RNFS.downloadFile({
      fromUrl: logoUrl,
      toFile: localFile,
    });
    await download.promise;
    const base64 = await RNFS.readFile(localFile, 'base64');
    await RNFS.unlink(localFile).catch(() => {});
    return `data:image/png;base64,${base64}`;
  } catch (e) {
    console.log('Error converting logo to base64', e);
    return logoUrl;
  }
};

const getMeasurementSortIndex = (itemType, key) => {
  if (!key) {
    return 9999;
  }

  const normalizedKey = String(key).toLowerCase().replace(/[_\s]+/g, ' ');
  const sortOrder = [
    'shoulder',
    'neck',
    'bust',
    'chest',
    'waist',
    'hip',
    'stomach',
    'front',
    'back',
    'sleeve',
    'arm',
    'wrist',
    'thigh',
    'knee',
    'ankle',
    'length',
    'height',
    'inseam',
    'outseam'
  ];

  const index = sortOrder.findIndex((term) => normalizedKey.includes(term));
  return index >= 0 ? index : 9999;
};

export const normalizeItems = (orderData, includeCancelled = true) => {
  let items = [];
  
  if (orderData.orderCategory === 'Sales' || (orderData.items && orderData.items.length > 0 && (!orderData.outfits || orderData.outfits.length === 0))) {
    items = (orderData.items || []).map((it) => {
      const q = Number(it.qty || it.quantity || it.qnt || it.count || 1);
      return {
        ...it,
        qty: q,
        quantity: q,
        name: it.name || it.type || 'Item',
        amount: Number(it.amount || it.totalCost || 0),
        rate: it.rate !== undefined ? Number(it.rate) : (it.totalCost ? (Number(it.totalCost) / q) : 0),
        images: it.images || [],
        sketches: it.sketches || (it.sketchUri ? [it.sketchUri] : []),
        fabricSource: it.fabricSource || it.fabric_source || '',
        deliveryDate: it.deliveryDate,
        materials: it.materials || [],
        status: it.status || 'Pending',
        splits: it.splits || []
      };
    });
  } else if (orderData.outfits && orderData.outfits.length > 0) {
    items = orderData.outfits.map((it) => {
      const q = Number(it.qty || it.quantity || it.qnt || it.count || 1);
      const quantitySections =
        Array.isArray(it.quantitySections) && it.quantitySections.length > 0
          ? it.quantitySections
          : getItemQuantitySections(it);
      const filteredQuantitySections = includeCancelled
        ? quantitySections
        : quantitySections.filter(
            section => String(section?.status || '').trim() !== 'Cancelled',
          );
      const activeQty = filteredQuantitySections.length;
      const activeAmount = filteredQuantitySections.reduce(
        (sum, section) => sum + (Number(section?.total) || 0),
        0,
      );
      const resolvedQty = includeCancelled ? q : activeQty;
      const resolvedAmount =
        activeQty > 0 || includeCancelled
          ? activeAmount || Number(it.totalCost) || 0
          : 0;

      return {
        ...it, // Spread original item to preserve any extra fields
        name: it.type || 'Custom Outfit',
        qty: resolvedQty,
        rate:
          resolvedQty > 0
            ? resolvedAmount / resolvedQty
            : 0,
        amount: resolvedAmount,
        description: it.notes || '',
        measurements: it.measurements,
        type: it.type,
        notes: it.notes,
        quantity: resolvedQty,
        images: it.images || [],
        sketches: it.sketches || (it.sketchUri ? [it.sketchUri] : []),
        audioUri: it.audioUri || it.voiceNote,
        transcription: it.transcription,
        fabricSource: it.fabricSource || it.fabric_source || '',
        deliveryDate: it.deliveryDate || (filteredQuantitySections.length > 0 ? filteredQuantitySections[0].deliveryDate : null),
        trialDate: it.trialDate || (filteredQuantitySections.length > 0 ? filteredQuantitySections[0].trialDate : null),
        urgency: it.urgency,
        orderType: it.orderType,
        measurementDressGiven: it.measurementDressGiven,
        materials: it.materials || [],
        status:
          !includeCancelled && activeQty === 0
            ? 'Cancelled'
            : it.status || 'Pending',
        quantitySections: filteredQuantitySections,
        rawQuantities: it.rawQuantities || [],
        splits: filteredQuantitySections,
        services: it.services || it.addons || []
      };
    });
  }

  if (!includeCancelled) {
    return items.filter((it) => (
      it.status !== 'Cancelled' &&
      (Number(it.amount || it.totalCost || 0) > 0 || Number(it.qty || it.quantity || 0) > 0)
    ));
  }
  return items;
};

const COMMON_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @page { margin: 20px; }
  body { font-family: 'Inter', sans-serif; padding: 20px; color: #1F2937; background-color: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 12px; }
  .company-logo { width: 50px; height: 50px; background-color: #0E9F8A; color: white; border-radius: 8px; display: flex; justify-content: center; align-items: center; text-align: center; vertical-align: middle; line-height: 50px; font-weight: 700; font-size: 20px; margin-bottom: 5px; overflow: hidden; }
  .company-name { font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; color: #0E9F8A; }
  .company-details { font-size: 11px; color: #6B7280; line-height: 1.3; max-width: 300px; }
  .document-label { background-color: #F3F4F6; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #374151; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
  .info-group { flex: 1 1 20%; min-width: 80px; }
  .info-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .info-value { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background-color: #F9FAFB; text-align: left; padding: 8px; font-size: 10px; color: #6B7280; border-bottom: 1px solid #E5E7EB; text-transform: uppercase; }
  td { padding: 8px; font-size: 12px; border-bottom: 1px solid #F3F4F6; }
  .footer { display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid #E5E7EB; padding-top: 15px; }
  .terms { font-size: 9px; color: #9CA3AF; max-width: 300px; }
  .signature-area { text-align: right; }
  .signature-text { font-size: 10px; color: #6B7280; margin-top: 8px; }
`;

const getBaseHeader = (companyData, label) => {
  const boutiqueName = companyData.name || 'My Boutique';
  
  let logoContent;
  let logoStyle;
  
  if (companyData.logo) {
    logoContent = `<img src="${companyData.logo}" style="width: 100%; height: 100%; object-fit: contain;" />`;
    logoStyle = "width: 50px; height: 50px; margin-bottom: 5px; overflow: hidden; background-color: transparent;";
  } else {
    logoContent = boutiqueName.substring(0, 2).toUpperCase();
    logoStyle = "width: 50px; height: 50px; background-color: #0E9F8A; color: white; border-radius: 8px; display: flex; justify-content: center; align-items: center; text-align: center; vertical-align: middle; line-height: 50px; font-weight: 700; font-size: 20px; margin-bottom: 5px; overflow: hidden;";
  }

  return `
    <div class="header">
      <div>
        <div class="company-logo" style="${logoStyle}">${logoContent}</div>
        <h1 class="company-name">${boutiqueName}</h1>
        <div class="company-details">
          ${companyData.address}<br/>
          Phone: ${companyData.phone}<br/>
          ${companyData.gstin ? `GSTIN: ${companyData.gstin}` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="document-label">${label}</div>
      </div>
    </div>
  `;
};

export const getInvoiceHTML = (orderData, companyData) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${COMMON_STYLES}
        </style>
      </head>
      <body>
        ${getBaseHeader(companyData, 'Invoice')}

        <div style="border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 15px; overflow: hidden;">
            <div style="display: flex; border-bottom: 1px solid #E5E7EB;">
                <div style="flex: 1; border-right: 1px solid #E5E7EB; padding: 8px 12px; background-color: #F9FAFB;">
                    <div style="font-size: 9px; color: #6B7280; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Customer Info</div>
                    <div style="font-size: 13px; font-weight: 800; color: #111827; text-transform: uppercase;">${orderData.customerName}</div>
                    <div style="font-size: 10px; color: #4B5563; margin-top: 2px;">${orderData.customerMobile}</div>
                </div>
                <div style="flex: 1; border-right: 1px solid #E5E7EB; padding: 8px 12px;">
                    <div style="font-size: 9px; color: #6B7280; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Order Details</div>
                    <div style="font-size: 11px; font-weight: 700;">#${orderData.billNo}</div>
                    <div style="font-size: 10px; color: #6B7280;">${formatDate(orderData.date)}</div>
                </div>
                <div style="flex: 1; padding: 8px 12px;">
                    <div style="font-size: 9px; color: #6B7280; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Delivery & ID</div>
                    <div style="font-size: 11px; font-weight: 700; color: #0E9F8A;">${orderData.deliveryDate ? formatDate(orderData.deliveryDate) : 'TBD'}</div>
                    <div style="font-size: 10px; color: #6B7280;">#${orderData.customerDisplayId || '---'}</div>
                </div>
            </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; border-bottom: 2px solid #E5E7EB;">S.No</th>
              <th style="border-bottom: 2px solid #E5E7EB;">Description</th>
              <th style="width: 80px; text-align: center; border-bottom: 2px solid #E5E7EB;">Delivery</th>
              <th style="text-align: center; width: 50px; border-bottom: 2px solid #E5E7EB;">Qty</th>
              <th style="text-align: right; width: 80px; border-bottom: 2px solid #E5E7EB;">Rate</th>
              <th style="text-align: right; width: 90px; border-bottom: 2px solid #E5E7EB;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${normalizeItems(orderData, false).map((item, index) => `
              <tr>
                <td style="vertical-align: top;">${index + 1}</td>
                <td style="vertical-align: top;">
                    <div style="font-weight: 600;">${item.name}</div>
                    ${item.description ? `<div style="font-size: 10px; color: #6B7280; margin-top: 2px;">${item.description}</div>` : ''}
                </td>
                <td style="text-align: center; vertical-align: top;">
                    ${item.deliveryDate ? `
                        <div style="font-size: 10px; font-weight: 600; color: #059669; background: #ECFDF5; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                            ${formatDate(item.deliveryDate)}
                        </div>
                    ` : '<span style="font-size: 10px; color: #9CA3AF;">-</span>'}
                </td>
                <td style="text-align: center; vertical-align: top;">${item.qty}</td>
                <td style="text-align: right; vertical-align: top;">₹${(parseFloat(item.rate) || 0).toFixed(2)}</td>
                <td style="text-align: right; vertical-align: top; font-weight: 600;">₹${(parseFloat(item.amount) || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 200px;">
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span>Subtotal</span>
              <span>₹${(parseFloat(orderData.total) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span>Advance</span>
              <span>₹${(parseFloat(orderData.advance) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #0E9F8A; font-weight: 700; font-size: 16px; color: #0E9F8A;">
              <span>BALANCE</span>
              <span>₹${(parseFloat(orderData.balance) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="terms">
            <strong>TERMS & CONDITIONS</strong><br/>
            No Refund / No Exchange / No Cancellation<br/>
            E & O.E.
          </div>
          <div class="signature-area">
            <div style="height: 40px;"></div>
            <div class="signature-text">For ${companyData.name}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generateInvoicePDF = async (orderData, companyData) => {
  const htmlContent = getInvoiceHTML(orderData, companyData);
  const filename = getInvoiceFilename(orderData);

  return await finalizeAndSharePDF(htmlContent, filename, `Invoice #${orderData.billNo}`);
};

export const getTailorCopyHTML = (orderData, companyData, processedItems) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${COMMON_STYLES}
          .item-card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 15px; margin-bottom: 15px; }
          .item-block { page-break-inside: avoid; break-inside: avoid; }
          .item-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
          .item-title { font-size: 16px; font-weight: 700; color: #111827; }
          .item-qty { background: #E0E7FF; color: #4338CA; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .measurement-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
          .measurement-item { border-left: 2px solid #0E9F8A; padding-left: 8px; }
          .measurement-label { font-size: 9px; color: #6B7280; text-transform: capitalize; }
          .measurement-value { font-size: 13px; font-weight: 600; }
          .notes-box { background: #FFFBEB; border: 1px solid #FEF3C7; padding: 10px; border-radius: 8px; margin-top: 10px; page-break-inside: avoid; break-inside: avoid; }
          .notes-label { font-size: 10px; font-weight: 700; color: #92400E; margin-bottom: 2px; text-transform: uppercase; }
          .notes-text { font-size: 12px; color: #78350F; line-height: 1.4; }
          .image-grid-page { page-break-inside: avoid; break-inside: avoid; margin-top: 15px; }
          .grid-2x2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px; }
          .grid-single { display: block; margin-top: 10px; text-align: center; }
          .grid-image { width: 100%; height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E7EB; background-color: #F9FAFB; }
          .grid-image-single { max-width: 80%; height: 350px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E7EB; background-color: #F9FAFB; }
          .page-break-divider { page-break-after: always; break-after: page; }
        </style>
      </head>
      <body>
        ${getBaseHeader(companyData, 'Tailor Copy')}

        <div class="info-row" style="border-bottom: 1px solid #E5E7EB; padding: 6px 0; margin-bottom: 10px; align-items: flex-start; flex-wrap: nowrap;">
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Customer</div>
            <div class="info-value" style="font-size: 13px;">${orderData.customerName}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Mobile</div>
            <div class="info-value" style="font-size: 13px;">${orderData.customerMobile}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Order No</div>
            <div class="info-value" style="font-size: 13px;">#${orderData.billNo}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Date</div>
            <div class="info-value" style="font-size: 13px;">${orderData.date ? formatDate(orderData.date) : formatDate(new Date().toISOString())}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">ID</div>
            <div class="info-value" style="font-size: 13px;">#${orderData.customerDisplayId || '---'}</div>
          </div>
          ${orderData.takenByName ? `
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Taken By</div>
            <div class="info-value" style="font-size: 13px;">${orderData.takenByName}</div>
          </div>
          ` : ''}
        </div>

        ${processedItems.map((item, idx) => `
          <div class="item-card">
            <div class="item-header">
              <div style="display: flex; flex-direction: column;">
                <div class="item-title">${idx + 1}. ${item.type || item.name}</div>
                ${(item.deliveryDate || orderData.deliveryDate) ? `
                  <div style="font-size: 11px; margin-top: 4px; display: inline-block;">
                    <span style="background: ${(function () {
        const now = new Date();
        const target = new Date(item.deliveryDate || orderData.deliveryDate);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3 ? '#FEE2E2' : '#E0E7FF';
      })()}; color: ${(function () {
        const now = new Date();
        const target = new Date(item.deliveryDate || orderData.deliveryDate);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3 ? '#DC2626' : '#4338CA';
      })()}; padding: 3px 8px; border-radius: 4px; font-weight: 700;">
                      DUE: ${formatDate(item.deliveryDate || orderData.deliveryDate)}
                    </span>
                  </div>
                ` : ''}
              </div>
              <div class="item-qty">Qty: ${item.quantity || item.qty}</div>
            </div>

            ${item.measurements && Object.keys(item.measurements).length > 0 ? `
              <div class="notes-label" style="margin-bottom: 10px; color: #0E9F8A;">Measurements</div>
              <div class="measurement-grid">
                ${Object.entries(item.measurements)
        .sort(([keyA], [keyB]) => {
          const idxA = getMeasurementSortIndex(item.type || item.name, keyA);
          const idxB = getMeasurementSortIndex(item.type || item.name, keyB);
          if (idxA === idxB) return keyA.localeCompare(keyB); // Fallback to alpha if both unknown
          return idxA - idxB;
        })
        .map(([key, val]) => `
                  <div class="measurement-item">
                    <div class="measurement-label">${key.replace(/_/g, ' ')}</div>
                    <div class="measurement-value">${val}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${(item.images && item.images.length > 0) ? (function() {
              const chunks = [];
              for (let i = 0; i < item.images.length; i += 4) {
                chunks.push(item.images.slice(i, i + 4));
              }
              return chunks.map((chunk, chunkIdx) => `
                <div class="image-grid-page ${chunkIdx < chunks.length - 1 ? 'page-break-divider' : ''}">
                  <div class="notes-label" style="margin-top: 15px; color: #0E9F8A;">
                    Attachments / Photos ${chunks.length > 1 ? `(Page ${chunkIdx + 1}/${chunks.length})` : ''}
                  </div>
                  ${chunk.length === 1 ? `
                    <div class="grid-single">
                      <img src="${chunk[0]}" class="grid-image-single" />
                    </div>
                  ` : `
                    <div class="grid-2x2">
                      ${chunk.map((img) => `<img src="${img}" class="grid-image" />`).join('')}
                    </div>
                  `}
                </div>
              `).join('');
            })() : ''}

            ${item.sketches && item.sketches.length > 0 ? `
              <div class="notes-label" style="margin-top: 15px; color: #0E9F8A;">Design Sketches</div>
              <div class="grid-2x2">
                ${item.sketches.map((img) => `
                    <div style="display: flex; flex-direction: column; width: 100%;">
                        <img src="${img}" class="grid-image" style="border: 2px dashed #0E9F8A; background-color: white;" />
                    </div>
                `).join('')}
              </div>
            ` : ''}

            ${item.notes || item.transcription ? `
              <div class="notes-box">
                ${item.notes ? `
                    <div class="notes-label">Customer Notes</div>
                    <div class="notes-text">${item.notes}</div>
                ` : ''}
                ${item.transcription ? `
                    <div class="notes-label" style="margin-top: 8px; color: #8B5CF6;">AI Transcription</div>
                    <div class="notes-text" style="font-style: italic; color: #4B5563;">"${item.transcription}"</div>
                ` : ''}
              </div>
            ` : ''}

            ${item.fabricSource ? `
              <div style="margin-top: 15px; font-size: 12px; color: #6B7280;">
                <strong>Fabric Source:</strong> ${item.fabricSource}
              </div>
            ` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <div style="font-size: 10px; color: #9CA3AF;">
            Generated by Sewvee - ${new Date().toLocaleString()}
          </div>
          <div class="signature-area">
             <div class="signature-text" style="margin-top: 0;">Authorized Work Order</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const prepareTailorCopyItems = async (orderData) => {
  const rawItems = normalizeItems(orderData, false);
  return Promise.all(rawItems.map(async (item) => {
    // Helper to process any image URI into Base64
    const processImageUri = async (uri, mimeType = 'image/jpeg') => {
      try {
        if (!uri) return null;

        // Handle Base64 images directly
        if (uri.startsWith('data:')) return uri;

        let targetUri = uri;

        // Normalize local paths: ensure they start with file:// if they are absolute paths
        if (targetUri.startsWith('/')) {
          targetUri = 'file://' + targetUri;
        }

        // Handle Local Files (file://, content://)
        if (targetUri.startsWith('file://') || targetUri.startsWith('content://')) {
          try {
            // Some URIs might be double encoded or have special characters
            const decodedUri = targetUri.includes('%') ? decodeURIComponent(targetUri) : targetUri;
            const cleanPath = decodedUri.replace('file://', '');

            const exists = await RNFS.exists(cleanPath);
            if (!exists) {
              // Try the non-decoded version as a fallback
              const originalPath = targetUri.replace('file://', '');
              const originalExists = await RNFS.exists(originalPath);
              if (!originalExists) {
                return `ERR_FILE_NOT_FOUND: ${cleanPath.substring(Math.max(0, cleanPath.length - 20))}`;
              }
            }

            const activePath = (await RNFS.exists(cleanPath)) ? cleanPath : targetUri.replace('file://', '');

            // Copy to cache to bypass scoped storage restrictions (especially on newer Android)
            const ext = mimeType.split('/')[1] || 'img';
            const tempCopyPath = RNFS.CachesDirectoryPath + '/pdftemp_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + ext;

            try {
              await RNFS.copyFile(activePath, tempCopyPath);
              const base64 = await RNFS.readFile(tempCopyPath, 'base64');
              // Cleanup early
              await RNFS.unlink(tempCopyPath);
              return `data:${mimeType};base64,${base64}`;
            } catch (copyErr) {
              // Fallback direct read
              try {
                const base64 = await RNFS.readFile(activePath, 'base64');
                return `data:${mimeType};base64,${base64}`;
              } catch (readErr) {
                return `ERR_READ_FAIL: ${readErr.message?.substring(0, 20)}`;
              }
            }
          } catch (e) {
            return `ERR_PROCESS_CATCH: ${e.message?.substring(0, 20)}`;
          }
        }

        // Handle Remote Images (HTTP/HTTPS) - Let Print handle them if possible, or convert to B64
        // For Tailor Copy, we prefer converting to B64 to ensure they show up in PDF
        if (targetUri.startsWith('http')) {
          return targetUri; // Print usually handles remote images fine if connected
        }

        return `ERR_UNSUPPORTED_SCHEME: ${targetUri.substring(0, 10)}`;

      } catch (e) {
        return `ERR_CRASH: ${e.message?.substring(0, 20)}`;
      }
    };

    // Process Photos
    if (item.images && item.images.length > 0) {
      const base64Images = await Promise.all(item.images.map((uri) => processImageUri(uri, 'image/jpeg')));
      item.images = base64Images.filter(Boolean);
    }

    // Process Sketches
    const sketchesToProcess = item.sketches || (item.sketchUri ? [item.sketchUri] : []);

    if (sketchesToProcess.length > 0) {
      const base64Sketches = await Promise.all(sketchesToProcess.map((uri) => processImageUri(uri, 'image/png')));
      item.sketches = base64Sketches.filter(Boolean);
    }

    return item;
  }));
};

export const getTailorCopyPreviewHTML = async (orderData, companyData) => {
  const processedItems = await prepareTailorCopyItems(orderData);
  return getTailorCopyHTML(orderData, companyData, processedItems);
};

export const saveTailorCopyPDF = async (orderData, companyData) => {
  const htmlContent = await getTailorCopyPreviewHTML(orderData, companyData);
  return saveGeneratedPDF(htmlContent, getTailorCopyFilename(orderData));
};

export const generateTailorCopyPDF = async (orderData, companyData) => {
  const htmlContent = await getTailorCopyPreviewHTML(orderData, companyData);
  const filename = getTailorCopyFilename(orderData);

  return await finalizeAndSharePDF(htmlContent, filename, `Tailor Copy #${orderData.billNo}`);
};

export const getCustomerCopyHTML = (orderData, companyData) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${COMMON_STYLES}
          .terms { font-size: 11px; color: #374151; max-width: 100%; margin-top: 10px; font-weight: 500; }
          .footer-branding { text-align: center; margin-top: 20px; border-top: 1px dashed #E5E7EB; padding-top: 10px; }
          .branding-text { font-size: 10px; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase; }
          .branding-logo { font-weight: 700; color: #0E9F8A; font-size: 12px; }
        </style>
      </head>
      <body>
        ${getBaseHeader(companyData, 'Customer Copy')}

        <!-- Single Row Data Strip Header -->
        <div class="info-row" style="border-bottom: 1px solid #E5E7EB; padding: 6px 0; margin-bottom: 10px; align-items: flex-start; flex-wrap: nowrap;">
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Customer</div>
            <div class="info-value" style="font-size: 13px;">${orderData.customerName}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Mobile</div>
            <div class="info-value">${orderData.customerMobile}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Order No</div>
            <div class="info-value">#${orderData.billNo}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Date</div>
            <div class="info-value">${orderData.date ? formatDate(orderData.date) : formatDate(new Date().toISOString())}</div>
          </div>
          <div class="info-group" style="flex: 1;">
            <div class="info-label">ID</div>
            <div class="info-value">#${orderData.customerDisplayId || '---'}</div>
          </div>
          ${orderData.takenByName ? `
          <div class="info-group" style="flex: 1;">
            <div class="info-label">Taken By</div>
            <div class="info-value" style="font-size: 13px;">${orderData.takenByName}</div>
          </div>
          ` : ''}
        </div>

        <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
          <thead>
            <tr>
              <th style="width: 40px; border-bottom: 2px solid #E5E7EB; padding: 10px;">S.No</th>
              <th style="border-bottom: 2px solid #E5E7EB; padding: 10px;">Description</th>
              <th style="width: 100px; text-align: center; border-bottom: 2px solid #E5E7EB; padding: 10px;">Delivery</th>
              <th style="text-align: center; width: 50px; border-bottom: 2px solid #E5E7EB; padding: 10px;">Qty</th>
              <th style="text-align: right; width: 90px; border-bottom: 2px solid #E5E7EB; padding: 10px;">Rate</th>
              <th style="text-align: right; width: 100px; border-bottom: 2px solid #E5E7EB; padding: 10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${normalizeItems(orderData, false).map((item, index) => {
    // Fallback to Order Delivery Date if Item date is missing
    const itemDeliveryDate = item.deliveryDate || orderData.deliveryDate;

    return `
              <tr>
                <td style="vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6;">${index + 1}</td>
                <td style="vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6;">
                    <div style="font-weight: 600; color: #1F2937;">${item.name}</div>
                    ${item.description ? `<div style="font-size: 11px; color: #6B7280; margin-top: 4px;">${item.description}</div>` : ''}
                </td>
                <td style="text-align: center; vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6;">
                    ${itemDeliveryDate ? `
                        <div style="font-size: 10px; font-weight: 600; color: ${item.deliveryDate ? '#0E9F8A' : '#4B5563'}; background: ${item.deliveryDate ? '#ECFDF5' : '#F3F4F6'}; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                            ${formatDate(itemDeliveryDate)}
                        </div>
                    ` : '<span style="font-size: 11px; color: #9CA3AF;">-</span>'}
                </td>
                <td style="text-align: center; vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6; font-weight: 500;">${item.qty}</td>
                <td style="text-align: right; vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6;">₹${(parseFloat(item.rate) || 0).toFixed(2)}</td>
                <td style="text-align: right; vertical-align: top; padding: 10px; border-bottom: 1px solid #F3F4F6; font-weight: 600; color: #111827;">₹${(parseFloat(item.amount) || 0).toFixed(2)}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 200px;">
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span>Subtotal</span>
              <span>₹${(parseFloat(orderData.total) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span>Advance</span>
              <span>₹${(parseFloat(orderData.advance) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row" style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #0E9F8A; font-weight: 700; font-size: 16px; color: #0E9F8A;">
              <span>BALANCE</span>
              <span>₹${(parseFloat(orderData.balance) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${Array.isArray(orderData.payments) && orderData.payments.length > 0 ? `
        <div style="margin-top: 30px; margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 8px; text-transform: uppercase;">Payment History</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr>
                <th style="border-bottom: 2px solid #E5E7EB; padding: 8px 4px; text-align: left; color: #6B7280;">Bill No</th>
                <th style="border-bottom: 2px solid #E5E7EB; padding: 8px 4px; text-align: left; color: #6B7280;">Date</th>
                <th style="border-bottom: 2px solid #E5E7EB; padding: 8px 4px; text-align: left; color: #6B7280;">Mode</th>
                <th style="border-bottom: 2px solid #E5E7EB; padding: 8px 4px; text-align: right; color: #6B7280;">Paid Amount</th>
                <th style="border-bottom: 2px solid #E5E7EB; padding: 8px 4px; text-align: right; color: #6B7280;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${orderData.payments.map((p, idx) => {
                 const billNo = `BILL ${orderData.payments.length - idx}`;
                 const pDate = p.created_at || p.date || p.payment_date || new Date().toISOString();
                 const pMode = p.payment_mode || p.mode || 'Cash';
                 const pAmount = parseFloat(p.amount || 0).toFixed(2);
                 const pBal = parseFloat(p.balance_amount ?? p.balance ?? 0).toFixed(2);
                 const pStatus = (p.payment_status || p.status || '').toUpperCase();
                 const isCancelled = pStatus === 'CANCELLED' || pStatus === 'CANCEL';
                 const rowStyle = isCancelled ? 'opacity: 0.5; text-decoration: line-through;' : '';

                 return `
                   <tr style="${rowStyle}">
                     <td style="padding: 8px 4px; border-bottom: 1px solid #F3F4F6; font-weight: 600;">${billNo}</td>
                     <td style="padding: 8px 4px; border-bottom: 1px solid #F3F4F6;">${formatDate(pDate)}</td>
                     <td style="padding: 8px 4px; border-bottom: 1px solid #F3F4F6;">${pMode} ${isCancelled ? '<span style="color:#EF4444; font-size:10px;">(Cancelled)</span>' : ''}</td>
                     <td style="padding: 8px 4px; border-bottom: 1px solid #F3F4F6; text-align: right; font-weight: 600; color: #059669;">₹${pAmount}</td>
                     <td style="padding: 8px 4px; border-bottom: 1px solid #F3F4F6; text-align: right; font-weight: 600; color: ${pBal > 0 ? '#EF4444' : '#111827'};">₹${pBal}</td>
                   </tr>
                 `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <div class="terms">
            <strong>TERMS & CONDITIONS</strong><br/>
            No Refund / No Exchange / No Cancellation<br/>
            E & O.E.
          </div>
          <div class="signature-area">
            <div style="height: 40px;"></div>
            <div class="signature-text">For ${companyData.name}</div>
          </div>
        </div>
        
        <div class="footer-branding">
          <div class="branding-text">Powered by <span class="branding-logo">SEWVEE</span></div>
        </div>
      </body>
    </html>
  `;
};

export const generateCustomerCopyPDF = async (orderData, companyData) => {
  const htmlContent = getCustomerCopyHTML(orderData, companyData);
  const filename = getCustomerCopyFilename(orderData);

  return await finalizeAndSharePDF(htmlContent, filename, `Customer Copy #${orderData.billNo}`);
};

export const saveCustomerCopyPDF = async (orderData, companyData) => {
  const htmlContent = getCustomerCopyHTML(orderData, companyData);
  return saveGeneratedPDF(htmlContent, getCustomerCopyFilename(orderData));
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getPayslipHTML = (payrollData, user, companyData, roleName) => {
  const totalSalary = payrollData?.netPayable ?? 0;
  const advance = payrollData?.advance ?? 0;
  const balance = Math.max(0, totalSalary - advance);
  const deductions = payrollData?.deductions ?? 0;
  const baseSalary = payrollData?.baseSalary ?? user?.baseSalary ?? 0;
  const month = payrollData?.month ?? new Date().getMonth() + 1;
  const year = payrollData?.year ?? new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${COMMON_STYLES}
          .payslip-section { border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
          .payslip-row { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #F3F4F6; }
          .payslip-row:last-child { border-bottom: none; }
          .payslip-row-highlight { background-color: #ECFDF5; font-weight: 700; color: #059669; }
        </style>
      </head>
      <body>
        ${getBaseHeader(companyData, 'Payslip')}

        <div class="payslip-section">
          <div class="payslip-row">
            <span class="info-label">Employee</span>
            <span class="info-value">${user?.name || '—'}</span>
          </div>
          <div class="payslip-row">
            <span class="info-label">Role</span>
            <span class="info-value">${roleName || '—'}</span>
          </div>
          <div class="payslip-row">
            <span class="info-label">Payroll Period</span>
            <span class="info-value">${MONTH_NAMES[month - 1]} ${year}</span>
          </div>
        </div>

        <div class="payslip-section">
          <div class="payslip-row">
            <span class="info-label">Base Salary</span>
            <span class="info-value">₹${baseSalary.toLocaleString('en-IN')}</span>
          </div>
          ${deductions > 0 ? `
          <div class="payslip-row">
            <span class="info-label">Deductions</span>
            <span class="info-value" style="color: #DC2626;">- ₹${deductions.toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          <div class="payslip-row">
            <span class="info-label">Total Salary</span>
            <span class="info-value">₹${totalSalary.toLocaleString('en-IN')}</span>
          </div>
          ${advance > 0 ? `
          <div class="payslip-row">
            <span class="info-label">Advance</span>
            <span class="info-value">₹${advance.toLocaleString('en-IN')}</span>
          </div>
          ` : ''}
          <div class="payslip-row payslip-row-highlight">
            <span class="info-label">Net Payable</span>
            <span class="info-value">₹${balance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="payslip-section">
          <div class="payslip-row">
            <span class="info-label">Status</span>
            <span class="info-value">${payrollData?.paymentStatus === 'Paid' ? 'Paid' : 'Pending'}</span>
          </div>
          ${payrollData?.paymentDate ? `
          <div class="payslip-row">
            <span class="info-label">Paid On</span>
            <span class="info-value">${formatDate(payrollData.paymentDate)}</span>
          </div>
          ` : ''}
          ${payrollData?.paymentMode ? `
          <div class="payslip-row">
            <span class="info-label">Payment Mode</span>
            <span class="info-value">${payrollData.paymentMode}</span>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="terms">
            This is a computer-generated payslip. E & O.E.
          </div>
          <div class="signature-area">
            <div class="signature-text">For ${companyData?.name || 'My Boutique'}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generatePayslipPDF = async (payrollData, user, companyData, roleName) => {
  const htmlContent = getPayslipHTML(payrollData, user, companyData, roleName);
  const safeName = (user?.name || 'Employee').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const month = payrollData?.month ?? new Date().getMonth() + 1;
  const year = payrollData?.year ?? new Date().getFullYear();

  return await finalizeAndSharePDF(
    htmlContent,
    `Payslip_${safeName}_${MONTH_NAMES[month - 1]}_${year}.pdf`,
    `Payslip - ${user?.name}`
  );
};

export const getAdvanceReceiptHTML = (transaction, user, companyData) => {
  const amount = transaction?.amount ?? 0;
  const date = transaction?.date ?? new Date().toISOString().split('T')[0];
  const paymentMode = transaction?.paymentMode || 'Cash';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${COMMON_STYLES}
          .receipt-section { border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
          .receipt-row { display: flex; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #F3F4F6; }
          .receipt-row:last-child { border-bottom: none; }
          .receipt-row-highlight { background-color: #ECFDF5; font-weight: 700; color: #059669; font-size: 18px; }
        </style>
      </head>
      <body>
        ${getBaseHeader(companyData, 'Advance Receipt')}

        <div class="receipt-section">
          <div class="receipt-row">
            <span class="info-label">Employee</span>
            <span class="info-value">${user?.name || '—'}</span>
          </div>
          <div class="receipt-row">
            <span class="info-label">Date</span>
            <span class="info-value">${formatDate(date)}</span>
          </div>
          <div class="receipt-row">
            <span class="info-label">Payment Mode</span>
            <span class="info-value">${paymentMode}</span>
          </div>
          <div class="receipt-row receipt-row-highlight">
            <span class="info-label">Amount</span>
            <span class="info-value">₹${amount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="footer">
          <div class="terms">
            This is a computer-generated advance receipt. E & O.E.
          </div>
          <div class="signature-area">
            <div class="signature-text">For ${companyData?.name || 'My Boutique'}</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const generateAdvanceReceiptPDF = async (transaction, user, companyData) => {
  const htmlContent = getAdvanceReceiptHTML(transaction, user, companyData);
  const safeName = (user?.name || 'Employee').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = (transaction?.date || '').replace(/-/g, '');

  return await finalizeAndSharePDF(
    htmlContent,
    `Advance_Receipt_${safeName}_${dateStr}.pdf`,
    `Advance Receipt - ${user?.name}`
  );
};

export const printHTML = async (html) => {
  try {
    await RNPrint.print({ html });
  } catch (error) {
    console.error('[PDF] Print Error:', error);
    throw error;
  }
};

const sanitizePdfToken = (value, fallback) => {
  const safeValue = String(value || fallback)
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return safeValue || fallback;
};

const getCustomerCopyFilename = orderData => {
  const safeBillNo = sanitizePdfToken(orderData?.billNo, 'Draft');
  return `Customer_Copy_${safeBillNo}.pdf`;
};

const getTailorCopyFilename = orderData => {
  const safeBillNo = sanitizePdfToken(orderData?.billNo, 'Draft');
  const safeCustomerName = sanitizePdfToken(orderData?.customerName, 'Customer');
  return `Tailor_${safeBillNo}_${safeCustomerName}.pdf`;
};

const getInvoiceFilename = orderData => {
  const safeBillNo = sanitizePdfToken(orderData?.billNo, 'Draft');
  const safeCustomerName = sanitizePdfToken(orderData?.customerName, 'Customer');
  return `Bill_${safeBillNo}_${safeCustomerName}.pdf`;
};

const getPdfDestinationDirectory = () => (
  Platform.OS === 'android'
    ? RNFS.DownloadDirectoryPath
    : RNFS.DocumentDirectoryPath
);

const ensureUniquePdfPath = async (targetPath) => {
  const hasExtension = /\.pdf$/i.test(targetPath);
  const basePath = hasExtension ? targetPath.replace(/\.pdf$/i, '') : targetPath;
  let candidatePath = hasExtension ? targetPath : `${targetPath}.pdf`;
  let counter = 1;

  while (await RNFS.exists(candidatePath)) {
    candidatePath = `${basePath}_${counter}.pdf`;
    counter += 1;
  }

  return candidatePath;
};

export const saveGeneratedPDF = async (html, filename) => {
  try {
    const options = {
      html,
      fileName: filename.replace(/\.pdf$/i, ''),
      directory: 'Documents',
    };

    const generatedFile = await generatePDF(options);
    const sourcePath = generatedFile?.filePath;

    if (!sourcePath) {
      throw new Error('PDF generator did not return a file path');
    }

    const targetDirectory = getPdfDestinationDirectory();
    await RNFS.mkdir(targetDirectory);

    const targetPath = await ensureUniquePdfPath(`${targetDirectory}/${filename}`);
    await RNFS.copyFile(sourcePath, targetPath);

    if (Platform.OS === 'android' && typeof RNFS.scanFile === 'function') {
      await RNFS.scanFile(targetPath).catch(() => null);
    }

    await RNFS.unlink(sourcePath).catch(() => null);

    return targetPath;
  } catch (error) {
    console.error('[PDF] Save Error:', error);
    Alert.alert('PDF Error', error.message || 'Failed to save PDF');
    throw error;
  }
};

const shareSavedPDF = async (filePath, shareTitle) => {
  await Share.open({
    url: `file://${filePath}`,
    type: 'application/pdf',
    title: shareTitle,
    failOnCancel: false,
  });
};

const finalizeAndSharePDF = async (html, filename, shareTitle) => {
  try {
    const finalPath = await saveGeneratedPDF(html, filename);
    await shareSavedPDF(finalPath, shareTitle);
  } catch (error) {
    console.error('[PDF] Error:', error);
    throw error;
  }
};
