import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";
import signpdf from "@signpdf/signpdf";
import placeholderPkg from "@signpdf/placeholder-pdfkit010";
import { P12Signer } from "@signpdf/signer-p12";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSelfSignedCertificate } from "./certificate-utils.js";

const { addPlaceholder } = placeholderPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increased limit for image data
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Ensure certificates directory exists
const certsDir = path.join(__dirname, "certs");
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Generate self-signed certificate if it doesn't exist
const certPath = path.join(certsDir, "signing-cert.p12");
const certPassword = process.env.CERT_PASSWORD || "change-me-in-production";

if (!fs.existsSync(certPath)) {
  console.log("Generating self-signed certificate for PDF signing...");
  try {
    generateSelfSignedCertificate(certPath, certPassword);
    console.log("Certificate generated successfully.");
  } catch (error) {
    console.error("Error generating certificate:", error);
  }
}

// PDF generation and signing endpoint
app.post("/api/generate-pdf", async (req, res) => {
  console.log("Received PDF generation request");
  try {
    const { imageData, message, fileName } = req.body;

    if (!message) {
      console.error("PDF generation failed: Message is required");
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`Generating PDF with message length: ${message.length}, has image: ${!!imageData}`);

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Collect PDF data
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", (error) => {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF", details: error.message });
      }
    });
    doc.on("end", async () => {
      try {
        console.log("PDF document created, adding signature placeholder...");
        let pdfBuffer = Buffer.concat(chunks);
        console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);

        // Add signature placeholder
        pdfBuffer = addPlaceholder({
          pdfBuffer,
          reason: "Legal document verification",
          contactInfo: "hackab@example.com",
          name: "Hackab Legal System",
          location: "Switzerland",
        });
        console.log("Signature placeholder added");

        // Sign the PDF
        console.log("Signing PDF...");
        const signer = new P12Signer({
          p12Buffer: fs.readFileSync(certPath),
          passphrase: certPassword,
        });

        const signedPdf = await signpdf.sign(pdfBuffer, signer);
        console.log(`PDF signed successfully, size: ${signedPdf.length} bytes`);

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const finalFileName = fileName || `hackab-document-${timestamp}.pdf`;

        // Set response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${finalFileName}"`
        );

        // Send signed PDF
        res.send(signedPdf);
        console.log("PDF sent to client successfully");
      } catch (signError) {
        console.error("Error signing PDF:", signError);
        console.error("Error stack:", signError.stack);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to sign PDF", details: signError.message });
        }
      }
    });

    // Add image to PDF
    if (imageData) {
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Determine image format from data URL
      let imageFormat = "jpeg";
      if (imageData.startsWith("data:image/png")) {
        imageFormat = "png";
      } else if (imageData.startsWith("data:image/gif")) {
        imageFormat = "gif";
      }

      // Add image (max width 500px, maintain aspect ratio)
      try {
        doc.image(imageBuffer, {
          fit: [500, 400],
          align: "center",
        });
        // Add some space after image
        doc.moveDown(2);
      } catch (imageError) {
        console.error("Error adding image to PDF:", imageError);
        // Continue without image if there's an error
        doc.text("(Image could not be added to PDF)", {
          align: "center",
          italic: true,
        });
        doc.moveDown(2);
      }
    }

    // Add message text
    doc.fontSize(12);
    doc.text(message, {
      align: "left",
      continued: false,
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF", details: error.message });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.send("Hackab PDF Generation Server");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`PDF generation endpoint: http://localhost:${port}/api/generate-pdf`);
});
