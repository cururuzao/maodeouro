/**
 * Sends a message using the correct Z-API method
 * based on the template type and metadata.
 */
import {
  sendText,
  sendImage,
  sendVideo,
  sendDocument,
  sendAudio,
  sendContact,
  sendLocation,
  sendLink,
  sendButtonList,
  sendButtonActions,
  sendOptionList,
  sendSticker,
  sendGif,
  sendPoll,
  sendPix,
  type ZApiInstance,
} from "@/lib/z-api";

interface TemplateButton {
  id: string;
  text: string;
  type: "reply" | "url" | "call" | "copy";
  url?: string;
  phoneNumber?: string;
}

interface TemplateMetadata {
  footer?: string;
  title?: string;
  buttons?: TemplateButton[];
  listButtonText?: string;
  listSections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  fileName?: string;
  viewOnce?: boolean;
  contactName?: string;
  contactNumber?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  locationAddress?: string;
  // Link
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  // Sticker
  stickerUrl?: string;
  stickerAuthor?: string;
  // GIF
  gifUrl?: string;
  // Poll
  pollOptions?: { name: string }[];
  pollMaxOptions?: number;
  // PIX
  pixKey?: string;
  pixType?: string;
  merchantName?: string;
  // Profile customization
  profileName?: string;
  profilePictureUrl?: string;
  profileDescription?: string;
}

/**
 * Replace template variables in a string with lead data.
 */
export function replaceVariables(
  text: string,
  lead: { name?: string | null; phone: string; extra_data?: Record<string, any> | null }
): string {
  const extra = lead.extra_data || {};
  return text
    .replace(/\{\{nome\}\}/gi, lead.name || "")
    .replace(/\{\{telefone\}\}/gi, lead.phone || "")
    .replace(/\{\{email\}\}/gi, extra.email || "")
    .replace(/\{\{empresa\}\}/gi, extra.empresa || "")
    .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString("pt-BR"))
    .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
}

/**
 * Send a message through Z-API using the correct endpoint
 * based on the template type.
 */
export async function sendTemplateMessage(
  inst: ZApiInstance,
  phone: string,
  text: string,
  type: string,
  metadata: TemplateMetadata
): Promise<any> {
  switch (type) {
    case "buttons": {
      const allButtons = metadata.buttons || [];
      if (allButtons.length === 0) {
        return sendText(inst, phone, text);
      }

      // Fallback: send buttons as formatted text for maximum compatibility
      // (Z-API interactive button endpoints may silently fail on some plans)
      let fullText = text;
      for (const btn of allButtons) {
        if (btn.type === "url" && btn.url) {
          fullText += `\n\n🔗 ${btn.text}: ${btn.url}`;
        } else if (btn.type === "call" && btn.phoneNumber) {
          fullText += `\n\n📞 ${btn.text}: ${btn.phoneNumber}`;
        } else if (btn.type === "copy" && btn.url) {
          fullText += `\n\n📋 ${btn.text}: ${btn.url}`;
        } else {
          fullText += `\n\n▪️ ${btn.text}`;
        }
      }
      if (metadata.footer) {
        fullText += `\n\n_${metadata.footer}_`;
      }
      return sendText(inst, phone, fullText);
    }

    case "media": {
      if (!metadata.mediaUrl) {
        return sendText(inst, phone, text);
      }
      switch (metadata.mediaType) {
        case "video":
          return sendVideo(inst, phone, metadata.mediaUrl, text);
        case "document":
          return sendDocument(inst, phone, metadata.mediaUrl, metadata.fileName || "file", text);
        case "audio":
          return sendAudio(inst, phone, metadata.mediaUrl);
        default:
          return sendImage(inst, phone, metadata.mediaUrl, text);
      }
    }

    case "contact": {
      if (!metadata.contactName || !metadata.contactNumber) {
        return sendText(inst, phone, text);
      }
      if (text.trim()) await sendText(inst, phone, text);
      return sendContact(inst, phone, metadata.contactName, metadata.contactNumber);
    }

    case "location": {
      if (!metadata.latitude || !metadata.longitude) {
        return sendText(inst, phone, text);
      }
      if (text.trim()) await sendText(inst, phone, text);
      return sendLocation(
        inst,
        phone,
        parseFloat(metadata.latitude),
        parseFloat(metadata.longitude),
        metadata.locationName,
        metadata.locationAddress
      );
    }

    case "list": {
      const sections = metadata.listSections || [];
      if (sections.length === 0) {
        return sendText(inst, phone, text);
      }
      return sendOptionList(
        inst,
        phone,
        metadata.listButtonText || "Ver opções",
        text,
        metadata.footer || "",
        sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((r) => ({
            title: r.title,
            description: r.description || "",
            rowId: r.id,
          })),
        }))
      );
    }

    case "link": {
      if (!metadata.linkUrl) {
        return sendText(inst, phone, text);
      }
      return sendLink(
        inst,
        phone,
        text,
        metadata.linkUrl,
        metadata.linkTitle,
        metadata.linkDescription,
        metadata.linkImage
      );
    }

    case "sticker": {
      if (!metadata.stickerUrl) {
        return sendText(inst, phone, text);
      }
      return sendSticker(inst, phone, metadata.stickerUrl, metadata.stickerAuthor);
    }

    case "gif": {
      if (!metadata.gifUrl) {
        return sendText(inst, phone, text);
      }
      return sendGif(inst, phone, metadata.gifUrl, text);
    }

    case "poll": {
      const options = metadata.pollOptions || [];
      if (options.length < 2) {
        return sendText(inst, phone, text);
      }
      return sendPoll(inst, phone, text, options, metadata.pollMaxOptions);
    }

    case "pix": {
      if (!metadata.pixKey || !metadata.pixType) {
        return sendText(inst, phone, text);
      }
      return sendPix(inst, phone, metadata.pixKey, metadata.pixType, metadata.merchantName, text);
    }

    default: // "text"
      return sendText(inst, phone, text);
  }
}
