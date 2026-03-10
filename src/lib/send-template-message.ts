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

      // Baileys does NOT support interactive URL/call buttons.
      // We build a beautifully formatted text message instead,
      // with WhatsApp markdown and clickable links.

      const replyButtons = allButtons.filter((btn) => btn.type === "reply" || !btn.type);
      const urlButtons = allButtons.filter((btn) => btn.type === "url" && btn.url);
      const callButtons = allButtons.filter((btn) => btn.type === "call" && btn.phoneNumber);

      // If ALL buttons are reply-type, use native sendButtons
      if (urlButtons.length === 0 && callButtons.length === 0 && replyButtons.length > 0) {
        const nativeButtons = replyButtons.map((btn) => ({
          buttonId: btn.id,
          buttonText: { displayText: btn.text },
        }));
        return sendButtons(instanceName, number, text, "", metadata.footer || "", nativeButtons);
      }

      // Otherwise, build formatted text with links
      let formattedText = text;

      // Add URL buttons as clickable links
      if (urlButtons.length > 0) {
        formattedText += "\n";
        urlButtons.forEach((btn) => {
          formattedText += `\n🔗 *${btn.text}*\n${btn.url}`;
        });
      }

      // Add call buttons
      if (callButtons.length > 0) {
        formattedText += "\n";
        callButtons.forEach((btn) => {
          formattedText += `\n📞 *${btn.text}*: ${btn.phoneNumber}`;
        });
      }

      // Add footer
      if (metadata.footer) {
        formattedText += `\n\n_${metadata.footer}_`;
      }

      return sendTextMessage(instanceName, number, formattedText);
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
