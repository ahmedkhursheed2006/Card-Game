import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
// Create a singleton instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

/**
 * Helper to emit events with promises for cleaner async flow in components.
 */
export const emitAsync = (event, data) => {
  return new Promise((resolve) => {
    socket.emit(event, data, (response) => {
      resolve(response);
    });
  });
};
