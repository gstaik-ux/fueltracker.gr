import "./globals.css";

export const metadata = {
  title: "Carall",
  description: "Το βιβλιάριο του οχήματός σας - καύσιμα, ΚΤΕΟ, ασφάλεια, διόδια, συνεργείο, στατιστικά. Όλα σε ένα μέρος.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
