import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION ?? "us-east-1";

const hasS3Config = Boolean(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucket,
);

const s3Client = hasS3Config
  ? new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    })
  : null;

function assertS3Ready() {
  if (!s3Client || !bucket) {
    throw new Error(
      "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.",
    );
  }
  return { s3Client, bucket };
}

export async function putObject(args: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const { s3Client: client, bucket: bucketName } = assertS3Ready();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
  return {
    key: args.key,
    url: `s3://${bucketName}/${args.key}`,
  };
}

export async function getObjectPresignedUrl(args: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { s3Client: client, bucket: bucketName } = assertS3Ready();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: args.key,
  });
  return getSignedUrl(client, command, {
    expiresIn: args.expiresInSeconds ?? 3600,
  });
}
