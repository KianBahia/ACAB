import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateConversationPdf(messages) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = 750;
  page.drawText('Conversation Transcript', {
    x: 50,
    y,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 40;
  messages.forEach((msg, i) => {
    const text = `${msg.role}: ${msg.content}`;
    page.drawText(text, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;
    if (y < 50) {
      y = 750;
      pdfDoc.addPage([612, 792]);
    }
  });
  return await pdfDoc.save();
}
