import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mon Ardoise",
    short_name: "Ardoise",
    description: "Prévoir les coûts et les rentrées de vos biens en location",
    start_url: "/fr",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f8",
    theme_color: "#5e5486",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
