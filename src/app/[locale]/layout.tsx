import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Source_Serif_4 } from "next/font/google";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { routing } from "@/i18n/routing";

import "../globals.css";

// Une seule police chargée, pour les titres et les grands chiffres. Le texte courant
// prend la police système : plus rapide, et c'est ce qui donne l'aspect natif.
const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-display",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });

  return {
    title: t("name"),
    description: t("tagline"),
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className={display.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
