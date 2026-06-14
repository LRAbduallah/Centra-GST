export function calcLine(item: any, globalGst: number) {
  const qty = parseFloat(item.qty) || 0;
  const netRate = parseFloat(item.netRate) || 0;
  const gstPct = parseFloat(item.gstPct !== null && item.gstPct !== undefined ? item.gstPct : globalGst) || 0;
  const gstAmt = netRate * (gstPct / 100);
  const rate = netRate + gstAmt;
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

export function calcTotals(items: any[], profile: any) {
  const gst = parseFloat(profile?.gstRate) || 18;
  const cgstPct = parseFloat(profile?.cgstPct) || gst / 2;
  const sgstPct = parseFloat(profile?.sgstPct) || gst / 2;
  
  let subTotal = 0;
  let totalGst = 0;
  
  const lines = items.map((item) => {
    const c = calcLine(item, gst);
    subTotal += c.lineNetAmt;
    totalGst += c.lineGstAmt;
    return { ...item, ...c };
  });
  
  const grandTotal = subTotal + totalGst;
  
  // corrected GST splits of total tax amount
  const cgst = totalGst * (cgstPct / (cgstPct + sgstPct || 1));
  const sgst = totalGst * (sgstPct / (cgstPct + sgstPct || 1));
  
  return {
    lines,
    subTotal,
    totalGst,
    grandTotal,
    cgst,
    sgst,
    cgstPct,
    sgstPct,
  };
}
