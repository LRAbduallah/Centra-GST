export function calcLine(item: any, globalGst: number) {
  const qty = parseFloat(item.qty) || 0;
  const enteredRate = parseFloat(item.netRate) || 0; // Treat this input rate as tax-inclusive
  const gstPct = parseFloat(item.gstPct !== null && item.gstPct !== undefined ? item.gstPct : globalGst) || 0;
  
  // Pre-tax net rate = enteredRate / (1 + gstPct / 100)
  const netRate = enteredRate / (1 + gstPct / 100);
  const gstAmt = enteredRate - netRate;
  const rate = enteredRate; // Tax-inclusive rate
  const amount = rate * qty;
  
  return {
    qty,
    netRate,
    gstPct,
    gstAmt,
    rate,
    amount,
    lineGstAmt: gstAmt * qty,
    lineNetAmt: netRate * qty,
  };
}

export function calcTotals(items: any[], profile: any, discountVal: number = 0) {
  const gst = parseFloat(profile?.gstRate) || 18;
  const profileCgstPct = parseFloat(profile?.cgstPct) || gst / 2;
  const profileSgstPct = parseFloat(profile?.sgstPct) || gst / 2;
  
  // First pass: calculate lines without discount to get subTotalBeforeDiscount
  let subTotalBeforeDiscount = 0;
  const rawLines = items.map((item) => {
    const c = calcLine(item, gst);
    subTotalBeforeDiscount += c.lineNetAmt;
    return { ...item, ...c };
  });

  const discountAmount = Math.max(0, parseFloat(discountVal as any) || 0);

  let subTotal = 0;
  let totalGst = 0;
  const usedGstRates = new Set<number>();

  const lines = rawLines.map((line) => {
    // Proportional discount distribution
    const propDiscount = subTotalBeforeDiscount > 0 
      ? discountAmount * (line.lineNetAmt / subTotalBeforeDiscount) 
      : 0;

    const lineNetAmt = Math.max(0, line.lineNetAmt - propDiscount);
    const lineGstAmt = lineNetAmt * (line.gstPct / 100);
    const amount = lineNetAmt + lineGstAmt;
    
    const qty = line.qty;
    const netRate = qty > 0 ? lineNetAmt / qty : 0;
    const rate = qty > 0 ? amount / qty : 0;

    subTotal += lineNetAmt;
    totalGst += lineGstAmt;
    usedGstRates.add(line.gstPct);

    return {
      ...line,
      netRate,
      rate,
      amount,
      lineNetAmt,
      lineGstAmt,
      propDiscount,
    };
  });

  const grandTotalRaw = subTotal + totalGst;
  const grandTotal = Math.round(grandTotalRaw);
  const roundOff = grandTotal - grandTotalRaw;
  
  // CGST and SGST are split exactly 50/50 of the total tax amount
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  
  let cgstPct: number | string = profileCgstPct;
  let sgstPct: number | string = profileSgstPct;
  let isMixed = false;
  
  if (usedGstRates.size === 1) {
    const singleGst = Array.from(usedGstRates)[0];
    cgstPct = singleGst / 2;
    sgstPct = singleGst / 2;
  } else if (usedGstRates.size > 1) {
    isMixed = true;
    cgstPct = '';
    sgstPct = '';
  }
  
  return {
    lines,
    subTotal,
    totalGst,
    grandTotal,
    grandTotalRaw,
    roundOff,
    cgst,
    sgst,
    cgstPct,
    sgstPct,
    isMixed,
    discount: discountAmount,
    subTotalBeforeDiscount,
  };
}
