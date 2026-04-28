import { sendEmail } from "./emailService.js";
import { sendWhatsAppMessage } from "./whatsappService.js";

export const sendCustomerNotification = async ({
  user,
  emailSubject,
  emailText,
  emailHtml,
  whatsappTemplate,
  whatsappText,
  meta
}) => {
  await Promise.allSettled([
    sendEmail({
      to: user?.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml || `<p>${emailText}</p>`
    }),
    sendWhatsAppMessage({
      to: user?.phone,
      template: whatsappTemplate,
      body: whatsappText || emailText,
      meta
    })
  ]);
};
