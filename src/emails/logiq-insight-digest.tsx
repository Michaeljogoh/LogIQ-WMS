import { EmailHeading, EmailLayout } from "@/emails/email-layout";

export function LogiqInsightDigestEmail(props: {
  accountName: string;
  insights: Array<{
    severity: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
}) {
  return (
    <EmailLayout preview={`LogIQ insights for ${props.accountName}`}>
      <EmailHeading>LogIQ daily insight digest</EmailHeading>
      <p style={{ fontSize: 14, color: "#444" }}>{props.accountName}</p>
      <ul style={{ paddingLeft: 20, fontSize: 14 }}>
        {props.insights.map((i) => (
          <li key={`${i.title}-${i.createdAt}`} style={{ marginBottom: 12 }}>
            <strong>
              [{i.severity}] {i.title}
            </strong>
            <br />
            {i.body}
            <br />
            <span style={{ color: "#666", fontSize: 12 }}>{i.createdAt}</span>
          </li>
        ))}
      </ul>
    </EmailLayout>
  );
}
