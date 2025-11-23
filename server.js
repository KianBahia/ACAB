const fs = require('fs');
const { plainAddPlaceholder, SignPdf } = require('@signpdf/signpdf');
app.use(express.raw({ type: 'application/pdf', limit: '10mb' }));

// Dummy private key for demo (replace with your real key)
const PRIVATE_KEY = fs.existsSync('private.key') ? fs.readFileSync('private.key') : null;

app.post('/sign-pdf', async (req, res) => {
  try {
    let pdfBuffer = Buffer.from(req.body);
    pdfBuffer = plainAddPlaceholder({ pdfBuffer });
    if (!PRIVATE_KEY) throw new Error('No private key found');
    const signedPdf = new SignPdf().sign(pdfBuffer, PRIVATE_KEY);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(signedPdf);
  } catch (err) {
    res.status(500).send('Error signing PDF');
  }
});
const express = require("express");
const app = express();
const port = 3000;

// a basic route
app.get("/", (req, res) => {
  res.send("Hello from your small web server!");
});

// start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
