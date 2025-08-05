import React from "react";
import GeobaseLogo from "./components/geobase-logo";

const config = {
  head: ({ title }) => {
    return (
      <>
        <meta
          name="description"
          content="Find documentation, guides, examples, and blueprints for GeoAi.app"
        />
        <title>{title ? `${title} — GeoAi Docs` : "GeoAi Docs"}</title>
        <link
          rel="icon"
          type="image/x-icon"
          href="https://geobase.app/favicon.ico"
        />
      </>
    );
  },
  color: {
    hue: {
      dark: 152,
      light: 152,
    },
  },
  logo: (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/9/99/Unofficial_JavaScript_logo_2.svg"
        alt="JavaScript logo"
        style={{
          height: "1.5rem",
          width: "auto",
          marginRight: "0.5rem",
          verticalAlign: "middle",
        }}
      />
      geobase/geoai.js
    </div>
  ),
  project: {
    link: "https://github.com/decision-labs/geobase-ai.js",
  },
  chat: {
    link: "https://geobase.app/discord",
  },
  navbar: {
    extraContent: (
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <a
          href="https://docs.geobase.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <GeobaseLogo
            style={{
              width: "6rem",
              height: "auto",
            }}
          />
        </a>
      </div>
    ),
  },
  docsRepositoryBase: "https://github.com/sabman/geobase-docs",
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
        <span>Geobase.app © {new Date().getFullYear()}</span>
        <a
          href="https://docs.geobase.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          📚 GeoBase Docs
        </a>
      </div>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
};

export default config;
