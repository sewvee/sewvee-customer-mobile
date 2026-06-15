/**
 * Helper to format order bill numbers.
 * Parses strings like 'ORD1T219', 'ORD219', or just '219' and formats them as 'ORD00219'.
 */
export const formatOrderNumber = (billNo) => {
  if (!billNo) return '';
  const str = String(billNo).trim();
  
  // Try to match ORD + (digits for sequence) + (letters) + (tenant digits)
  const matchWithLetters = str.match(/^ORD(\d+)[a-zA-Z]+/i);
  if (matchWithLetters && matchWithLetters[1]) {
    // Return without leading zeros padding
    return `ORD${parseInt(matchWithLetters[1], 10)}`;
  }
  
  // Try to match standard ORD-?digits
  const matchStandard = str.match(/^ORD-?(\d+)$/i) || str.match(/^(\d+)$/);
  if (matchStandard && matchStandard[1]) {
    // Return without leading zeros padding
    return `ORD${parseInt(matchStandard[1], 10)}`;
  }
  
  return str;
};

/**
 * Helper to format payment bill IDs.
 * Parses strings like '22/20260608/406747418' or '22' and formats strictly as '#bill00022'.
 */
export const formatPaymentBillId = (billId) => {
  if (!billId) return '';
  const str = String(billId).trim();
  
  // Extract first number sequence before the slash if present
  const baseNum = str.includes('/') ? str.split('/')[0] : str;
  const match = baseNum.match(/bill-?(\d+)/i) || baseNum.match(/^#?bill-?(\d+)/i) || baseNum.match(/^(\d+)/);
  if (match && match[1]) {
    // Return without leading zeros padding
    return `#bill${parseInt(match[1], 10)}`;
  }
  return str.startsWith('#') ? str : `#${str}`;
};

