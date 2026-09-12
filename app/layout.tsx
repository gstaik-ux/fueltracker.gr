import "./globals.css";

export const metadata = {
  title: "Fuel Log",
  description: "Fuel tracking, per vehicle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
