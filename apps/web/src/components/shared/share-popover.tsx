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

type SharePopoverProps = {
  url: string;
  title?: string;
};

export function SharePopover({ url, title = "Tautan" }: SharePopoverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link disalin ke clipboard!");
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
        shareUrl = `mailto:?subject=Bagikan Tautan&body=${encoded}`;
        break;
    }

    window.open(shareUrl, "_blank");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 size-4" />
          Bagikan
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2">
        <p className="text-sm font-semibold">Bagikan {title}</p>

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
          Kirim via WhatsApp
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openShare("telegram")}
        >
          <Send className="mr-2 size-4 text-sky-500" />
          Kirim via Telegram
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openShare("email")}
        >
          <Mail className="mr-2 size-4 text-red-500" />
          Kirim via Email
        </Button>
      </PopoverContent>
    </Popover>
  );
}
