import forge from "node-forge";
import fs from "fs";

/**
 * Generate a self-signed certificate for PDF signing
 * In production, you should use a proper certificate from a Certificate Authority
 */
export function generateSelfSignedCertificate(outputPath, password) {
  // Generate a key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1); // Valid for 1 year

  // Set certificate attributes
  const attrs = [
    { name: "countryName", value: "CH" },
    { name: "organizationName", value: "Hackab Legal System" },
    { name: "organizationalUnitName", value: "Document Signing" },
    { name: "commonName", value: "hackab-signing-cert" },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Set extensions
  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: false,
    },
    {
      name: "keyUsage",
      keyCertSign: false,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: false,
      dataEncipherment: false,
    },
  ]);

  // Sign the certificate
  cert.sign(keys.privateKey);

  // Create PKCS#12 container
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    password,
    {
      algorithm: "3des", // 3DES
    }
  );

  // Convert to binary
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  // Write to file
  fs.writeFileSync(outputPath, p12Der, "binary");

  console.log(`Certificate saved to: ${outputPath}`);
  console.log(`Certificate password: ${password}`);
  console.log("⚠️  WARNING: This is a self-signed certificate. For production, use a certificate from a trusted CA.");
}

