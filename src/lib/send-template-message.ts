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
  type ZApiInstance,
} from "@/lib/z-api";

interface TemplateButton {
  id: string;
  text: string;
  type: "reply" | "url" | "call";
  url?: string;
  phoneNumber?: string;
}

interface TemplateMetadata {
  footer?: string;
  buttons?: TemplateButton[];
  listButtonText?: string;
  listSections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  fileName?: string;
  contactName?: string;
  contactNumber?: string;
  latitude?: string;
  longitude?: string;
  locationName?: string;
  locationAddress?: string;
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

      // URL/call buttons: send as text with links appended
      const hasUrlOrCall = allButtons.some((b) => b.type === "url" || b.type === "call");
      if (hasUrlOrCall) {
        let fallbackText = text;
        for (const btn of allButtons) {
          if (btn.type === "url" && btn.url) {
            fallbackText += `\n\n🔗 ${btn.text}: ${btn.url}`;
          } else if (btn.type === "call" && btn.phoneNumber) {
            fallbackText += `\n\n📞 ${btn.text}: ${btn.phoneNumber}`;
          }
        }
        if (metadata.footer) {
          fallbackText += `\n\n_${metadata.footer}_`;
        }
        return sendText(inst, phone, fallbackText);
      }

      // Reply buttons
      return sendButtonList(
        inst,
        phone,
        text,
        metadata.footer || "",
        allButtons.map((b) => ({ id: b.id, label: b.text }))
      );
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
      // Z-API send-option-list endpoint
      const sections = metadata.listSections || [];
      if (sections.length === 0) {
        return sendText(inst, phone, text);
      }
      return apiPostDirect(inst, "send-option-list", {
        phone,
        optionList: {
          title: metadata.listButtonText || "Ver opções",
          message: text,
          footer: metadata.footer || "",
          optionSections: sections.map((s) => ({
            title: s.title,
            rows: s.rows.map((r) => ({
              title: r.title,
              description: r.description || "",
              rowId: r.id,
            })),
          })),
        },
      });
    }

    default: // "text" / "Texto"
      return sendText(inst, phone, text);
  }
}
