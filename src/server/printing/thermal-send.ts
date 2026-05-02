import net from "node:net";

export function sendRawToPrinter(args: {
  host: string;
  port: number;
  payload: Buffer;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = args.timeoutMs ?? 15_000;
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: args.host, port: args.port }, () => {
      socket.write(args.payload, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          socket.end();
        }
      });
    });
    socket.on("close", () => resolve());
    socket.on("error", reject);
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error("Printer connection timed out."));
    });
  });
}

export function pingPrinterHost(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
    });
    socket.on("close", () => resolve());
    socket.on("error", reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error("Connection timed out."));
    });
  });
}
