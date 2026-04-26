/**
 * AWS S3 helpers — implement when document/label storage is wired.
 */
export async function putObject(_args: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string }> {
  throw new Error("putObject is not implemented");
}
