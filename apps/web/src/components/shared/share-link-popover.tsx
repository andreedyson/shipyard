"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Mail, Check, PhoneCall, Send } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type ShareLinkPopoverProps = {
  url: string;
};

export function ShareLinkPopover({ url }: ShareLinkPopoverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openShare = (platform: "whatsapp" | "telegram" | "email") => {
    const encoded = encodeURIComponent(url);
    let shareUrl = "";

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encoded}`;
        break;
      case "telegram":
        shareUrl = `https://t.me/share/url?url=${encoded}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=Bagikan Kursus&body=${encoded}`;
        break;
    }

    window.open(shareUrl, "_blank");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 size-4" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2">
        <p className="text-sm font-semibold">Share Link</p>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="mr-2 size-4 text-green-500" />
          ) : (
            <Copy className="mr-2 size-4" />
          )}
          {copied ? "Tersalin!" : "Salin Link"}
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openShare("whatsapp")}
        >
          <PhoneCall className="mr-2 size-4 text-green-600" />
          Share via WhatsApp
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openShare("telegram")}
        >
          <Send className="mr-2 size-4 text-sky-500" />
          Share via Telegram
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openShare("email")}
        >
          <Mail className="mr-2 size-4 text-red-500" />
          Share via Email
        </Button>
      </PopoverContent>
    </Popover>
  );
}
