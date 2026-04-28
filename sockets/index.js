import jwt from "jsonwebtoken";

export const setupSockets = (io) => {
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    const fallbackUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          socket.join(`user:${decoded.id}`);
        }
      } catch {
        // Ignore invalid socket auth and keep the connection alive for public events.
      }
    } else if (fallbackUserId) {
      socket.join(`user:${fallbackUserId}`);
    }

    socket.on("join:user", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });
  });
};
