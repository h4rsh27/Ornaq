const prefixList = (process.env.SERVICEABLE_PINCODE_PREFIXES ||
  "11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,36,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,56,57,58,60,62,63,64,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const isValidPincode = (pincode) => /^\d{6}$/.test(String(pincode || ""));

export const isServiceablePincode = (pincode, product) => {
  const normalized = String(pincode || "").trim();
  if (!isValidPincode(normalized)) {
    return { available: false, message: "Enter a valid 6-digit pincode." };
  }

  if (Array.isArray(product?.serviceablePincodes) && product.serviceablePincodes.length) {
    const available = product.serviceablePincodes.includes(normalized);
    return {
      available,
      message: available ? "Delivery available for this pincode." : "This product is not deliverable to that pincode."
    };
  }

  const available = prefixList.includes(normalized.slice(0, 2));
  return {
    available,
    message: available ? "Delivery available in 3-5 days." : "Delivery is currently unavailable for that pincode."
  };
};
