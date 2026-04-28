export const createStripeIntent = async (req, res) => {
  res.status(501).json({ message: "Stripe provider placeholder. Use MOCK for now." });
};

export const createRazorpayOrder = async (req, res) => {
  res.status(501).json({ message: "Razorpay provider placeholder. Use MOCK for now." });
};

export const verifyRazorpayPayment = async (req, res) => {
  res.status(501).json({ message: "Razorpay verify placeholder. Use MOCK for now." });
};

export const stripeWebhook = async (req, res) => {
  res.status(501).json({ message: "Stripe webhook placeholder. Use MOCK for now." });
};
