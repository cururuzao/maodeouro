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

      // Build buttons in the official Evolution API format
      const apiButtons = allButtons.map((btn) => {
        if (btn.type === "url" && btn.url) {
          return { type: "url", displayText: btn.text, url: btn.url };
        }
        if (btn.type === "call" && btn.phoneNumber) {
          return { type: "call", displayText: btn.text, phoneNumber: btn.phoneNumber };
        }
        // reply
        return { type: "reply", displayText: btn.text, id: btn.id };
      });

      // Use raw fetch to send with the correct format
      const config = await import("@/lib/evolution-api").then((m) => m.loadConfig());
      if (!config) throw new Error("Evolution API não configurada");

      const url = `${config.baseUrl.replace(/\/$/, "")}/message/sendButtons/${instanceName}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: config.apiKey },
        body: JSON.stringify({
          number,
          title: text,
          description: "",
          footer: metadata.footer || "",
          buttons: apiButtons,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Erro ${res.status}: ${errText}`);
      }
      return res.json();
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
