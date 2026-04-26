import type { ReactNode } from "react";
import { emailTheme, fontSans } from "./email-tokens";

export function EmailLayout(props: { preview: string; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: emailTheme.muted,
          fontFamily: fontSans,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <span
          style={{
            display: "none",
            fontSize: "1px",
            color: emailTheme.card,
            lineHeight: "1px",
            maxHeight: 0,
            maxWidth: 0,
            opacity: 0,
            overflow: "hidden",
          }}
        >
          {props.preview}
        </span>
        <table
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table
                  cellPadding={0}
                  cellSpacing={0}
                  role="presentation"
                  style={{
                    width: "100%",
                    maxWidth: "480px",
                    borderCollapse: "collapse",
                    backgroundColor: emailTheme.card,
                    borderRadius: emailTheme.radius,
                    border: `1px solid ${emailTheme.border}`,
                    boxShadow: emailTheme.shadowSm,
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: "32px" }}>{props.children}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailHeading(props: { children: ReactNode }) {
  return (
    <h1
      style={{
        color: emailTheme.foreground,
        fontSize: "22px",
        fontWeight: 600,
        margin: "0 0 16px",
        fontFamily: fontSans,
      }}
    >
      {props.children}
    </h1>
  );
}

export function EmailText(props: { children: ReactNode }) {
  return (
    <p
      style={{
        color: emailTheme.foreground,
        fontSize: "15px",
        lineHeight: "24px",
        margin: "0 0 20px",
        fontFamily: fontSans,
      }}
    >
      {props.children}
    </p>
  );
}

export function EmailMuted(props: { children: ReactNode }) {
  return (
    <p
      style={{
        color: emailTheme.mutedForeground,
        fontSize: "13px",
        lineHeight: "20px",
        margin: "24px 0 0",
        fontFamily: fontSans,
      }}
    >
      {props.children}
    </p>
  );
}

export function EmailButton(props: { href: string; children: ReactNode }) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ margin: "24px auto", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td align="center">
            <a
              href={props.href}
              style={{
                backgroundColor: emailTheme.primary,
                borderRadius: emailTheme.radius,
                color: emailTheme.primaryForeground,
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
                display: "inline-block",
                padding: "12px 24px",
                lineHeight: "1.25",
                fontFamily: fontSans,
              }}
            >
              {props.children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
