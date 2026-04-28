const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockPayment = async () => {
  await wait(700);
  const success = Math.random() >= 0.2;

  return {
    success,
    status: success ? "PAID" : "FAILED",
    transactionId: `MOCK-${Date.now()}`
  };
};

export const processPayment = async ({ paymentMethod }) => {
  switch (paymentMethod) {
    case "MOCK":
      return mockPayment();
    case "RAZORPAY":
    case "STRIPE":
      return {
        success: false,
        status: "FAILED",
        transactionId: null
      };
    default:
      return {
        success: false,
        status: "FAILED",
        transactionId: null
      };
  }
};
