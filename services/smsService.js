import axios from "axios";
import twilio from "twilio";

/**
 * Send OTP via MSG91
 * @param {string} phone - 10 digit mobile number
 * @param {string} otp - 6 digit OTP
 */
const sendMsg91Otp = async (phone, otp) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;

  if (!authKey || !templateId) {
    console.warn("MSG91 credentials missing. Falling back to console log.");
    console.log(`[MSG91 MOCK] OTP for ${phone}: ${otp}`);
    return;
  }

  try {
    await axios.post(`https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${phone}&authkey=${authKey}&otp=${otp}`);
    console.log(`[MSG91] OTP sent to ${phone}`);
  } catch (error) {
    console.error("[MSG91 Error]", error.response?.data || error.message);
    throw new Error("Failed to send SMS via MSG91");
  }
};

/**
 * Send OTP via Twilio
 * @param {string} phone - 10 digit mobile number
 * @param {string} otp - 6 digit OTP
 */
const sendTwilioOtp = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn("Twilio credentials missing. Falling back to console log.");
    console.log(`[TWILIO MOCK] OTP for ${phone}: ${otp}`);
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: `Your ORNAQ login OTP is ${otp}. It will expire in 5 minutes.`,
      from,
      to: `+91${phone}`
    });
    console.log(`[Twilio] OTP sent to ${phone}`);
  } catch (error) {
    console.error("[Twilio Error]", error.message);
    throw new Error("Failed to send SMS via Twilio");
  }
};

/**
 * Main SMS sending function
 * @param {string} phone - 10 digit mobile number
 * @param {string} otp - 6 digit OTP
 */
export const sendSmsOtp = async (phone, otp) => {
  const mode = process.env.OTP_MODE || "mock";

  if (mode === "mock") {
    console.log(`[MOCK OTP] Phone: ${phone}, OTP: ${otp}`);
    return;
  }

  // Preferred MSG91, fallback to Twilio if MSG91 not configured
  if (process.env.MSG91_AUTH_KEY) {
    return sendMsg91Otp(phone, otp);
  } else if (process.env.TWILIO_ACCOUNT_SID) {
    return sendTwilioOtp(phone, otp);
  } else {
    console.warn("No SMS provider configured. Falling back to mock.");
    console.log(`[MOCK OTP] Phone: ${phone}, OTP: ${otp}`);
  }
};
