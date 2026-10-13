import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-instrument",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloraSense IoT",
  description: "Sistema vivo entre tierra, agua y datos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FloraSense",
  },
};

export const viewport: Viewport = {
  themeColor: "#3E5C47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${instrumentSerif.variable} ${manrope.variable} ${plexMono.variable} antialiased h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(message, source, lineno, colno, error) {
            var div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.top = '0';
            div.style.left = '0';
            div.style.zIndex = '999999';
            div.style.background = 'red';
            div.style.color = 'white';
            div.style.padding = '20px';
            div.style.width = '100%';
            div.style.fontSize = '12px';
            div.innerHTML = '<b>JS Error:</b> ' + message + '<br>' + source + ':' + lineno;
            document.body.appendChild(div);
          };
          window.addEventListener('unhandledrejection', function(event) {
            var div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.top = '50px';
            div.style.left = '0';
            div.style.zIndex = '999999';
            div.style.background = 'orange';
            div.style.color = 'white';
            div.style.padding = '20px';
            div.style.width = '100%';
            div.style.fontSize = '12px';
            div.innerHTML = '<b>Promise Error:</b> ' + (event.reason && event.reason.message ? event.reason.message : event.reason);
            document.body.appendChild(div);
          });
        `}} />
      </head>
      <body className="font-sans text-ink bg-canvas min-h-full flex flex-col selection:bg-water-soft selection:text-ink">
        {children}
      </body>
    </html>
  );
}
