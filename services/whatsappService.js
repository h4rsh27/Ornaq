const buildFallbackResponse = (payload) => ({
  preview: true,
  channel: "whatsapp",
  payload
});

export const sendWhatsAppMessage = async ({ to, template = "generic", body, meta = {} }) => {
  if (!to) return null;

  if (!process.env.WHATSAPP_API_URL) {
    const fallback = buildFallbackResponse({ to, template, body, meta });
    console.log("WhatsApp preview:", JSON.stringify(fallback));
    return fallback;
  }

  const response = await fetch(process.env.WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.WHATSAPP_API_TOKEN ? { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } : {})
    },
    body: JSON.stringify({
      to,
      template,
      body,
      meta
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${errorText}`);
  }

  return response.json();
};
