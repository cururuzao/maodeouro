/**
 * Sends a message using the correct Evolution API method
 * based on the template type and metadata.
 */
import {
  sendTextMessage,
  sendButtons,
  sendList,
  sendMedia,
  sendContact,
  sendLocation,
} from "@/lib/evolution-api";

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
 * Send a message through the Evolution API using the correct endpoint
 * based on the template type.
 */
export async function sendTemplateMessage(
  instanceName: string,
  number: string,
  text: string,
  type: string,
  metadata: TemplateMetadata
): Promise<any> {
  switch (type) {
    case "buttons": {
      const allButtons = metadata.buttons || [];
      if (allButtons.length === 0) {
        return sendTextMessage(instanceName, number, text);
      }

      // Baileys only supports "reply" buttons.
      // For URL/call buttons, append info to the message text.
      const replyButtons = allButtons
        .filter((btn) => btn.type === "reply" || !btn.type)
        .map((btn) => ({
          buttonId: btn.id,
          buttonText: { displayText: btn.text },
        }));

      // Build extra text for URL/call buttons
      const extraLines: string[] = [];
      allButtons.forEach((btn) => {
        if (btn.type === "url" && btn.url) {
          extraLines.push(`\n🔗 ${btn.text}: ${btn.url}`);
        }
        if (btn.type === "call" && btn.phoneNumber) {
          extraLines.push(`\n📞 ${btn.text}: ${btn.phoneNumber}`);
        }
      });

      const fullText = text + (extraLines.length > 0 ? "\n" + extraLines.join("") : "");

      // If we have reply buttons, send with sendButtons
      if (replyButtons.length > 0) {
        return sendButtons(
          instanceName,
          number,
          fullText,
          "",
          metadata.footer || "",
          replyButtons
        );
      }

      // Otherwise just send as text with links
      const finalText = metadata.footer
        ? fullText + "\n\n_" + metadata.footer + "_"
        : fullText;
      return sendTextMessage(instanceName, number, finalText);
    }

    case "list": {
      const sections = (metadata.listSections || []).map((section) => ({
        title: section.title,
        rows: section.rows.map((row) => ({
          title: row.title,
          description: row.description || "",
          rowId: row.id,
        })),
      }));
      if (sections.length === 0) {
        return sendTextMessage(instanceName, number, text);
      }
      return sendList(
        instanceName,
        number,
        text,
        "",
        metadata.footer || "",
        metadata.listButtonText || "Ver opções",
        sections
      );
    }

    case "media": {
      if (!metadata.mediaUrl) {
        return sendTextMessage(instanceName, number, text);
      }
      return sendMedia(
        instanceName,
        number,
        metadata.mediaType || "image",
        metadata.mediaUrl,
        text,
        metadata.fileName
      );
    }

    case "contact": {
      if (!metadata.contactName || !metadata.contactNumber) {
        return sendTextMessage(instanceName, number, text);
      }
      if (text.trim()) {
        await sendTextMessage(instanceName, number, text);
      }
      return sendContact(
        instanceName,
        number,
        metadata.contactName,
        metadata.contactNumber
      );
    }

    case "location": {
      if (!metadata.latitude || !metadata.longitude) {
        return sendTextMessage(instanceName, number, text);
      }
      if (text.trim()) {
        await sendTextMessage(instanceName, number, text);
      }
      return sendLocation(
        instanceName,
        number,
        parseFloat(metadata.latitude),
        parseFloat(metadata.longitude),
        metadata.locationName,
        metadata.locationAddress
      );
    }

    default: // "text"
      return sendTextMessage(instanceName, number, text);
  }
}
