import React from "react";
import { PROJECT_CONFIG, DOCS_CONFIG, BRAND_CONFIG } from "./config/constants";

const config = {
  head: ({ title }) => {
    return (
      <>
        <meta
          name="description"
          content={DOCS_CONFIG.description}
        />
        <title>{title ? `${title} — ${DOCS_CONFIG.title}` : DOCS_CONFIG.title}</title>
        <link
          rel="icon"
          type="image/x-icon"
          href={DOCS_CONFIG.favicon}
        />
      </>
    );
  },
  color: BRAND_CONFIG.color,
  logo: (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src={DOCS_CONFIG.logo.javascript}
        alt={DOCS_CONFIG.logo.alt}
        style={{
          height: "1.5rem",
          width: "auto",
          marginRight: "0.5rem",
          verticalAlign: "middle",
        }}
      />
      <pre style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
        {PROJECT_CONFIG.npmPackage}
      </pre>
    </div>
  ),
  project: {
    link: PROJECT_CONFIG.repository,
  },
  chat: {
    link: DOCS_CONFIG.chatLink,
  },
  navbar: {
  },
  docsRepositoryBase: DOCS_CONFIG.docsRepositoryBase,
  defaultShowCopyCode: true,
  footer: {
    content: (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          © {new Date().getFullYear()} {BRAND_CONFIG.name}. Open source project by the{" "}
          <a
            href={BRAND_CONFIG.teamUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
            }}
          >
            {BRAND_CONFIG.team}
          </a>
        </span>
      </div>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
};

export default config;
