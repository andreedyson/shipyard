import config from "@/configs/app";
import { Metadata } from "next";

export function generateMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    ...{
      title: config.appName,
      description: config.appDescription,
      metadataBase: new URL(config.appURL),
      alternates: { canonical: config.appURL },
      openGraph: {
        title: config.appName,
        description: config.appDescription,
        url: config.appURL,
        siteName: config.siteUrl,
        locale: "id-ID",
        images: [
          {
            url: "",
            width: 1200,
            height: 630,
            alt: `${config.appName} preview image`,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: config.appName,
        description: config.appDescription,
        // Enable only if needed, and add more type to the types/config.ts accordingly
        // site: config.twitterHandle,
        images: [""],
      },
      robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
      },
      keywords: [""],
    },
    ...overrides,
  };
}
