// -------------------------------------------------------------
// 6. Synthetic Sample Receipt Generator
// -------------------------------------------------------------
export async function createSampleReceiptImageBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('INVOICE #2026-047', 40, 45);

    ctx.font = '16px monospace';
    ctx.fillText('ACME PRIVACY CORP', 40, 75);
    ctx.fillText('Date: 2026-10-28', 40, 100);

    ctx.font = '13px monospace';
    ctx.fillText('--------------------------------------------', 40, 125);
    ctx.fillText('Item                Qty   Price     Total', 40, 150);
    ctx.fillText('VPN Enterprise Sub  1     $1200.00  $1200.00', 40, 180);
    ctx.fillText('SSL Certificate     1     $500.00   $500.00', 40, 210);
    ctx.fillText('--------------------------------------------', 40, 240);

    ctx.font = 'bold 16px monospace';
    ctx.fillText('TOTAL DUE:                      $1700.00', 40, 275);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!ctx || !blob) throw new Error('Could not generate the sample image.');
  return blob;
}

