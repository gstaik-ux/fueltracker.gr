import "./globals.css";

export const metadata = {
  title: "Fuel Log",
  description: "Fuel tracking, per vehicle",
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
