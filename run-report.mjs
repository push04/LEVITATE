
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, NumberFormat,
  TableOfContents, ExternalHyperlink, PageBreak, UnderlineType
} from 'docx';
import fs from 'fs';

// ── Color Constants ─────────────────────────────────────────────────────────
const C = {
  NAVY:       "0A1628",
  ELECTRIC:   "2563EB",
  CYAN:       "06B6D4",
  DARK:       "0F172A",
  MID:        "334155",
  SLATE:      "64748B",
  LIGHT:      "F1F5F9",
  WHITE:      "FFFFFF",
  GOLD:       "D97706",
  GREEN:      "059669",
  RED:        "DC2626",
  ORANGE:     "EA580C",
  TEAL:       "0D9488",
  PURPLE:     "7C3AED",
  BORDER:     "CBD5E1",
  HEADER_BG:  "0A1628",
  ALT_ROW:    "EFF6FF",
  SECTION_BG: "F8FAFC",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const PT = (pt) => pt * 2;        // half-points
const DXA = (inch) => inch * 1440; // DXA units

function hr(color = C.ELECTRIC, thickness = 6) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: thickness, color, space: 1 } },
    spacing: { before: 60, after: 60 },
  });
}

function spacer(before = 100, after = 100) {
  return new Paragraph({ spacing: { before, after } });
}

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: "Arial",
    size: PT(opts.size || 11),
    bold: opts.bold || false,
    italics: opts.italic || false,
    color: opts.color || C.DARK,
    highlight: opts.highlight || undefined,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: PT(20), bold: true, color: C.NAVY })],
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.ELECTRIC, space: 4 } },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: PT(15), bold: true, color: C.ELECTRIC })],
    spacing: { before: 300, after: 140 },
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: "Arial", size: PT(12), bold: true, color: C.NAVY })],
    spacing: { before: 240, after: 100 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: opts.before || 60, after: opts.after || 100, line: 320 },
    children: typeof text === 'string'
      ? [run(text, opts)]
      : text,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 300 },
    children: typeof text === 'string'
      ? [run(text, { size: 10.5 })]
      : text,
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 300 },
    children: typeof text === 'string'
      ? [run(text, { size: 10.5 })]
      : text,
  });
}

function callout(title, text, color = C.ELECTRIC) {
  const lighterBg = color === C.ELECTRIC ? "EFF6FF"
                  : color === C.GREEN    ? "ECFDF5"
                  : color === C.GOLD     ? "FFFBEB"
                  : color === C.RED      ? "FEF2F2"
                  : "F8FAFC";
  return new Table({
    width: { size: DXA(6.5), type: WidthType.DXA },
    columnWidths: [DXA(6.5)],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: DXA(6.5), type: WidthType.DXA },
        shading: { fill: lighterBg, type: ShadingType.CLEAR },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 12, color },
          bottom: { style: BorderStyle.NIL },
          left:   { style: BorderStyle.SINGLE, size: 12, color },
          right:  { style: BorderStyle.NIL },
        },
        margins: { top: 120, bottom: 120, left: 180, right: 120 },
        children: [
          new Paragraph({ spacing: { before: 0, after: 60 }, children: [
            new TextRun({ text: title, font: "Arial", size: PT(11), bold: true, color }),
          ]}),
          new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.JUSTIFIED, children: [
            new TextRun({ text, font: "Arial", size: PT(10.5), color: C.MID }),
          ]}),
        ],
      })
    ]})]
  });
}

function twoColTable(rows, headerRow = null) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: C.BORDER };
  const borders = { top: border, bottom: border, left: border, right: border };

  const allRows = [];
  if (headerRow) {
    allRows.push(new TableRow({
      tableHeader: true,
      children: headerRow.map((cell, i) => new TableCell({
        width: { size: i === 0 ? DXA(2.4) : DXA(4.1), type: WidthType.DXA },
        shading: { fill: C.NAVY, type: ShadingType.CLEAR },
        borders, margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [
          new TextRun({ text: cell, font: "Arial", size: PT(10), bold: true, color: C.WHITE })
        ]})],
      }))
    }));
  }

  rows.forEach((row, ri) => {
    allRows.push(new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: i === 0 ? DXA(2.4) : DXA(4.1), type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? C.WHITE : C.ALT_ROW, type: ShadingType.CLEAR },
        borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [
          new TextRun({ text: cell, font: "Arial", size: PT(10.5), color: C.DARK,
            bold: i === 0 })
        ]})],
      }))
    }));
  });

  return new Table({ width: { size: DXA(6.5), type: WidthType.DXA }, columnWidths: [DXA(2.4), DXA(4.1)], rows: allRows });
}

function threeColTable(rows, headerRow, widths = [DXA(2.2), DXA(2.2), DXA(2.1)]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: C.BORDER };
  const borders = { top: border, bottom: border, left: border, right: border };

  const allRows = [];
  if (headerRow) {
    allRows.push(new TableRow({
      tableHeader: true,
      children: headerRow.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: C.NAVY, type: ShadingType.CLEAR },
        borders, margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [
          new TextRun({ text: cell, font: "Arial", size: PT(10), bold: true, color: C.WHITE })
        ]})],
      }))
    }));
  }
  rows.forEach((row, ri) => {
    allRows.push(new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? C.WHITE : C.ALT_ROW, type: ShadingType.CLEAR },
        borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [
          new TextRun({ text: String(cell), font: "Arial", size: PT(10.5), color: C.DARK })
        ]})],
      }))
    }));
  });
  return new Table({ width: { size: DXA(6.5), type: WidthType.DXA }, columnWidths: widths, rows: allRows });
}

function fourColTable(rows, headerRow, widths) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: C.BORDER };
  const borders = { top: border, bottom: border, left: border, right: border };
  const allRows = [];
  if (headerRow) {
    allRows.push(new TableRow({
      tableHeader: true,
      children: headerRow.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: C.ELECTRIC, type: ShadingType.CLEAR },
        borders, margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [new Paragraph({ children: [
          new TextRun({ text: cell, font: "Arial", size: PT(9.5), bold: true, color: C.WHITE })
        ]})],
      }))
    }));
  }
  rows.forEach((row, ri) => {
    allRows.push(new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? C.WHITE : C.SECTION_BG, type: ShadingType.CLEAR },
        borders, margins: { top: 70, bottom: 70, left: 100, right: 100 },
        children: [new Paragraph({ children: [
          new TextRun({ text: String(cell), font: "Arial", size: PT(9.5), color: C.DARK })
        ]})],
      }))
    }));
  });
  return new Table({ width: { size: DXA(6.5), type: WidthType.DXA }, columnWidths: widths, rows: allRows });
}

function sectionBanner(text, sub = '') {
  return new Table({
    width: { size: DXA(6.5), type: WidthType.DXA },
    columnWidths: [DXA(6.5)],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: DXA(6.5), type: WidthType.DXA },
        shading: { fill: C.NAVY, type: ShadingType.CLEAR },
        borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
        margins: { top: 200, bottom: 200, left: 240, right: 120 },
        children: [
          new Paragraph({ spacing: { before: 0, after: sub ? 60 : 0 }, children: [
            new TextRun({ text, font: "Arial", size: PT(16), bold: true, color: C.WHITE }),
          ]}),
          ...(sub ? [new Paragraph({ spacing: { before: 0, after: 0 }, children: [
            new TextRun({ text: sub, font: "Arial", size: PT(10), color: "94A3B8", italics: true }),
          ]})] : []),
        ],
      })
    ]})]
  });
}

// ── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 300 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: "\u25e6",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 300 } } }
        }],
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 300 } } }
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: PT(11), color: C.DARK } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(20), bold: true, font: "Arial", color: C.NAVY },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(15), bold: true, font: "Arial", color: C.ELECTRIC },
        paragraph: { spacing: { before: 300, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: PT(12), bold: true, font: "Arial", color: C.NAVY },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: DXA(8.5), height: DXA(11) },
        margin: { top: DXA(1), right: DXA(1), bottom: DXA(1), left: DXA(1.1) },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.ELECTRIC, space: 4 } },
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: "LEVITATE LABS  |  LevitateOS Platform & Market Intelligence Report  |  CONFIDENTIAL", font: "Arial", size: PT(8), color: C.SLATE }),
              new TextRun({ text: "\t\t", font: "Arial", size: PT(8) }),
            ],
            tabStops: [{ type: "right", position: DXA(6.5) }],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.BORDER, space: 4 } },
            spacing: { before: 80, after: 0 },
            tabStops: [{ type: "right", position: DXA(6.5) }],
            children: [
              new TextRun({ text: "levitatelabs.online  |  © 2025–2026 Levitate Labs. All rights reserved.", font: "Arial", size: PT(8), color: C.SLATE }),
              new TextRun({ text: "\t", font: "Arial", size: PT(8) }),
              new TextRun({ children: ["Page ", PageNumber.CURRENT], font: "Arial", size: PT(8), color: C.SLATE }),
            ],
          }),
        ],
      }),
    },
    children: [
      // ════════════════════════════════════════════════════════
      // COVER PAGE
      // ════════════════════════════════════════════════════════
      new Table({
        width: { size: DXA(6.5), type: WidthType.DXA },
        columnWidths: [DXA(6.5)],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: DXA(6.5), type: WidthType.DXA },
          shading: { fill: C.NAVY, type: ShadingType.CLEAR },
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.SINGLE, size: 36, color: C.ELECTRIC }, right: { style: BorderStyle.NIL } },
          margins: { top: DXA(0.35), bottom: DXA(0.35), left: DXA(0.35), right: DXA(0.2) },
          children: [
            new Paragraph({ spacing: { before: 0, after: 80 }, children: [
              new TextRun({ text: "LEVITATE LABS", font: "Arial", size: PT(9), bold: true, color: "94A3B8" }),
              new TextRun({ text: "  ·  PLATFORM DOCUMENTATION", font: "Arial", size: PT(9), color: "64748B" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 120 }, children: [
              new TextRun({ text: "LevitateOS", font: "Arial", size: PT(36), bold: true, color: C.WHITE }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 80 }, children: [
              new TextRun({ text: "Comprehensive Platform Documentation,", font: "Arial", size: PT(16), color: "94A3B8" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 200 }, children: [
              new TextRun({ text: "Technical Architecture & Deep Market Intelligence Report", font: "Arial", size: PT(16), color: "94A3B8" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 80 }, children: [
              new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", font: "Arial", size: PT(10), color: "1E3A8A" }),
            ]}),
            new Paragraph({ spacing: { before: 80, after: 60 }, children: [
              new TextRun({ text: "Prepared by  ", font: "Arial", size: PT(10), color: "64748B" }),
              new TextRun({ text: "Levitate Labs Intelligence Division", font: "Arial", size: PT(10), bold: true, color: "94A3B8" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 60 }, children: [
              new TextRun({ text: "Date  ", font: "Arial", size: PT(10), color: "64748B" }),
              new TextRun({ text: "April 2026", font: "Arial", size: PT(10), bold: true, color: "94A3B8" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 60 }, children: [
              new TextRun({ text: "Version  ", font: "Arial", size: PT(10), color: "64748B" }),
              new TextRun({ text: "2.0 — Full-Stack Edition", font: "Arial", size: PT(10), bold: true, color: "94A3B8" }),
            ]}),
            new Paragraph({ spacing: { before: 0, after: 60 }, children: [
              new TextRun({ text: "Classification  ", font: "Arial", size: PT(10), color: "64748B" }),
              new TextRun({ text: "CONFIDENTIAL — INTERNAL USE ONLY", font: "Arial", size: PT(10), bold: true, color: "DC2626" }),
            ]}),
            new Paragraph({ spacing: { before: 120, after: 0 }, children: [
              new TextRun({ text: "levitatelabs.online  |  github.com/push04/LEVITATE", font: "Arial", size: PT(9), color: "475569", italics: true }),
            ]}),
          ],
        })]})],
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 0 — DISCLAIMER
      // ════════════════════════════════════════════════════════
      callout(
        "Document Notice",
        "This document is a proprietary internal report for Levitate Labs and its stakeholders. Market data is sourced from Grand View Research, MarketsandMarkets, Precedence Research, Statista, Fortune Business Insights, IAMAI, SaaSBoomi, Meta Business Reports, SIDBI, Mordor Intelligence, and other publicly available research as of April 2026. All figures are in USD unless stated otherwise. Indian Rupee (INR) figures use an approximate exchange rate of 1 USD = ₹83.",
        C.SLATE
      ),
      spacer(200, 200),

      // ════════════════════════════════════════════════════════
      // TABLE OF CONTENTS
      // ════════════════════════════════════════════════════════
      heading1("Table of Contents"),
      ...[
        ["01", "Executive Summary", "3"],
        ["02", "About Levitate Labs & LevitateOS", "4"],
        ["03", "Technical Architecture — Repository Analysis", "5"],
        ["04", "Platform Modules & Feature Deep Dive", "7"],
        ["05", "How LevitateOS Is Unique & Different", "9"],
        ["06", "Competitive Landscape & Comparison", "11"],
        ["07", "Global CRM Market Research", "14"],
        ["08", "Marketing Automation Market Research", "16"],
        ["09", "WhatsApp Business Ecosystem", "17"],
        ["10", "Lead Generation Software Market", "19"],
        ["11", "India MSME & SaaS Market Opportunity", "20"],
        ["12", "Target Market Analysis", "22"],
        ["13", "Revenue Model & Pricing Analysis", "23"],
        ["14", "How Levitate Can Scale", "25"],
        ["15", "Key Questions Answered (Strategic FAQ)", "27"],
        ["16", "SWOT Analysis", "29"],
        ["17", "Roadmap & Conclusion", "30"],
      ].map(([num, title, pg]) =>
        new Paragraph({
          spacing: { before: 60, after: 60 },
          tabStops: [{ type: "right", position: DXA(6.5), leader: "dot" }],
          children: [
            new TextRun({ text: `${num}  ${title}`, font: "Arial", size: PT(10.5), color: C.DARK }),
            new TextRun({ text: `\t${pg}`, font: "Arial", size: PT(10.5), color: C.SLATE }),
          ],
        })
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 1 — EXECUTIVE SUMMARY
      // ════════════════════════════════════════════════════════
      sectionBanner("01  Executive Summary", "The big picture at a glance"),
      spacer(160, 80),
      heading2("Overview"),
      para("Levitate Labs is a Vadodara-based full-service digital agency and technology platform builder operating at levitatelabs.online. Its flagship product — LevitateOS — is a craft-built, AI-powered business operating system that integrates CRM, lead generation, WhatsApp automation, email marketing, LinkedIn and Meta ad workflows, project execution, file management, branded business subdomains, and revenue analytics into a single, unified workspace. Rather than selling a patchwork of disconnected tools, Levitate Labs delivers a complete operating layer for Indian service businesses, rolled out and managed from one dashboard, activated immediately on subscription."),
      spacer(80, 60),
      para("The platform is engineered on a modern, zero-marginal-cost infrastructure stack — Next.js 16, React 19, Supabase (PostgreSQL + Realtime), Netlify serverless functions, and an AI layer routing between Groq (Llama 3.3 70B) and Anthropic Claude. Sixteen specialized AI agents handle lead finding, client outreach, discovery conversations, proposal generation, coding, testing, deployment, invoicing, and retention autonomously. The total monthly fixed infrastructure cost is ₹0, while monetization is purely subscription-based from clients — creating extraordinary unit economics."),
      spacer(80, 80),
      callout(
        "Strategic Market Positioning",
        "LevitateOS enters a global CRM and marketing automation market worth $90–163 billion (2025 estimates vary by research firm), growing at 12–15% CAGR through 2030. In India alone, the CRM market was valued at approximately $2.3 billion in 2024 and is expected to reach $5.16 billion by 2033. India's WhatsApp ecosystem — with 550+ million active users and 78% SMB adoption — represents a channel entirely underserved by Western CRM incumbents. Levitate's native WhatsApp-first, INR-priced, India-context-aware positioning is a structural competitive advantage that Salesforce, HubSpot, and Zoho cannot easily replicate at speed.",
        C.ELECTRIC
      ),
      spacer(120, 80),
      heading2("Key Metrics at a Glance"),
      threeColTable([
        ["LevitateOS Pricing", "₹12,999 — ₹39,999/month", "4 tiers incl. Enterprise"],
        ["Global CRM Market (2025)", "$73–90 billion", "CAGR ~14.6% to 2030"],
        ["India CRM Market (2024)", "$2.30 billion", "Reaching $5.16B by 2033"],
        ["Marketing Automation (2025)", "$47 billion", "CAGR 11.5% to 2030"],
        ["WhatsApp Users — India", "550+ million active", "Largest market globally"],
        ["Indian SMBs on WhatsApp", "78% adoption", "65% report higher sales"],
        ["India SaaS Market (2025)", "$20 billion", "Projected $100B by 2035"],
        ["India MSME Count", "59.3 million registered", "30% of GDP contribution"],
        ["Lead Gen Software (Global)", "$8.76 billion (2025)", "CAGR 14.82% to 2032"],
        ["Competitors (HubSpot India)", "₹5,500–10,000/user/mo", "6x more than Zoho"],
        ["LevitateOS Advantage", "All-in-one, INR-priced", "Zero per-user cost"],
        ["Infrastructure Monthly Cost", "₹0 fixed cost", "Exceptional unit economics"],
      ], ["Metric", "Value / Estimate", "Notes"],
      [DXA(2.3), DXA(2.3), DXA(1.9)]),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 2 — ABOUT LEVITATE LABS
      // ════════════════════════════════════════════════════════
      sectionBanner("02  About Levitate Labs & LevitateOS", "Company DNA and product vision"),
      spacer(160, 80),
      heading2("Company Identity"),
      para("Levitate Labs is a modern digital agency and product studio headquartered in Vadodara, Gujarat, India — one of India's fastest-growing startup cities. The company was founded with a clear mission: to make enterprise-grade business automation accessible to Indian SMBs who have been priced out of Western SaaS platforms or underserved by tools not built for their context, language, or operational reality."),
      spacer(60, 60),
      para("The agency operates two parallel business models simultaneously: a client services model (web development, CAD design, branding, marketing) and a SaaS product model (LevitateOS subscriptions). This dual model is strategically powerful — the agency generates cash flow while the platform accumulates recurring revenue, and every client engagement informs product development with real-world feedback."),
      spacer(80, 60),

      heading2("LevitateOS — The Product"),
      para("LevitateOS is described in Levitate Labs' own words as 'a craft-built operating layer' for businesses. The product is not a CRM, not a marketing tool, and not an automation platform in isolation — it is all three combined, plus branded infrastructure (subdomain), plus project and file management, plus revenue analytics. The positioning is deliberate: businesses should not need five different subscriptions to achieve what LevitateOS delivers in one rollout."),
      spacer(60, 60),
      callout(
        "The LevitateOS Promise",
        "CRM, lead generation, WhatsApp automation, email marketing, Meta and LinkedIn workflows, project execution, file handoff, mailbox status, growth analytics, and a branded subdomain — deployed as one complete operating system on the day of subscription activation. No integration headaches. No consulting fees. No per-user charges.",
        C.GREEN
      ),
      spacer(120, 80),

      heading2("The LevitateOS Activation Flow"),
      para("The onboarding experience is engineered for immediate value delivery. The four-step activation sequence is:"),
      numbered("Register or sign in to a Levitate Labs business account"),
      numbered("Open the authenticated business dashboard billing screen"),
      numbered("Select a monthly, annual, or enterprise plan"),
      numbered("Complete payment — the full workspace unlocks automatically"),
      spacer(100, 60),
      para("Each business receives a path-based branded URL at levitatelabs.online/company-name, creating instant digital legitimacy without requiring domain setup or hosting configuration. This zero-setup-friction model is a deliberate product decision designed to reduce drop-off at the point of commitment."),
      spacer(80, 60),

      heading2("Founding Mission & Philosophy"),
      para("Levitate Labs was built to solve a specific, measurable problem: Indian MSMEs — 59.3 million of them — are digitally underserved. According to SIDBI's 2025 survey, while over 90% of Indian MSMEs now accept digital payments, only 13% actively use digital marketing, and fewer use structured CRM or automation tools. The gap between payment digitization and sales/marketing digitization is the entire market opportunity that Levitate Labs is building into."),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 3 — TECHNICAL ARCHITECTURE
      // ════════════════════════════════════════════════════════
      sectionBanner("03  Technical Architecture — Repository Analysis", "Deep analysis of github.com/push04/LEVITATE"),
      spacer(160, 80),
      para("The following analysis is based on direct inspection of the public repository at github.com/push04/LEVITATE, including the README.md, NEW_README.MD (the master Claude Code build guide), all SQL migration files, Netlify function definitions, GitHub Actions workflow configurations, and the package.json dependency manifest. The codebase spans 106 commits, is written in TypeScript (89.6%), JavaScript (6.9%), and PLpgSQL (2.7%)."),
      spacer(80, 60),

      heading2("Technology Stack"),
      twoColTable([
        ["Frontend Framework", "Next.js 16 (App Router) + React 19 — latest stable versions as of 2025"],
        ["Styling", "Tailwind CSS v4 — utility-first CSS with full design system support"],
        ["Animation", "Framer Motion — performance-optimized animations across UI surfaces"],
        ["Database", "Supabase (PostgreSQL) — hosted relational database with Row Level Security (RLS)"],
        ["File Storage", "Supabase Storage — S3-compatible bucket for client assets and uploaded files"],
        ["Realtime", "Supabase Realtime — WebSocket-based live data subscriptions for the admin dashboard"],
        ["Serverless Functions", "Netlify Functions — scheduled (cron), background, and instant function types"],
        ["Long-Running Jobs", "GitHub Actions — used for the multi-step coding pipeline (architect → code → test → deploy)"],
        ["AI Primary", "Groq API (Llama 3.3 70B versatile) — free tier, 14,400 requests/day, fast inference"],
        ["AI Fallback", "Anthropic Claude (claude-haiku-4-5) — pay-per-use overflow and high-stakes tasks"],
        ["Payments", "Razorpay — INR-native payment gateway with webhooks and payment link generation"],
        ["Email", "Resend — transactional email (3,000/month free tier)"],
        ["WhatsApp", "Meta WhatsApp Business API — programmatic outreach, inbound handling, automated replies"],
        ["Web Scraping", "Apify (free tier) — structured web scraping for Google Maps, JustDial, LinkedIn, Instagram"],
        ["Maps/Places", "Google Maps Places API — business discovery and website presence checking"],
        ["PDF Generation", "Puppeteer / html-pdf — automated proposal and GST invoice PDF generation"],
        ["Testing", "Playwright — end-to-end browser tests for all client-delivered websites"],
        ["Deployment", "Netlify CLI — programmatic deployment of client websites to staging and production"],
        ["Monitoring", "UptimeRobot — external uptime monitoring with 5-minute ping intervals"],
      ], ["Layer", "Implementation"]),
      spacer(120, 80),

      heading2("Database Architecture (Supabase PostgreSQL)"),
      para("The database schema is the backbone of the entire autonomous agent system. Every agent reads from and writes to these tables. The schema implements a complete business operating system at the data layer:"),
      spacer(60, 60),
      fourColTable([
        ["leads", "Every potential client found by the BizDev Agent", "Scoring, stage, conversation history, contact", "Core pipeline table"],
        ["clients", "Converted paying clients", "Revenue, project status, branding assets", "Derived from leads"],
        ["projects", "One per client engagement", "Status, Git repo, staging URL, timeline, price", "Links to clients"],
        ["tasks", "Agent task queue", "Type, priority, status, retry logic, context", "Replaces Redis/MQ"],
        ["proposals", "Proposal PDFs + payment links", "Razorpay links, acceptance status, expiry", "Triggers payment"],
        ["invoices", "GST invoice management", "GST calc, payment links, reminder tracking", "Financial records"],
        ["agent_logs", "Every agent action logged", "Input, output, duration, tokens, credits", "Full audit trail"],
        ["agent_rewards", "Agent credit economy", "Balance, success rate, privileges, suspension", "Self-optimization"],
        ["messages", "All WhatsApp/email conversations", "Direction, status, intent classification", "Communication log"],
        ["revenue", "All money received", "Razorpay IDs, amounts, types, timestamps", "Financial reporting"],
        ["system_config", "Runtime configuration", "Rate card, scoring weights, AI budgets", "Hot-reload config"],
      ], ["Table", "Purpose", "Key Fields", "Role"],
      [DXA(1.2), DXA(1.8), DXA(1.9), DXA(1.6)]),
      spacer(120, 80),

      heading2("The 16-Agent Architecture"),
      para("The most significant architectural innovation in the LevitateOS codebase is the autonomous multi-agent system. Each agent is a specialized serverless function with a defined role, credit balance, and performance tracking. All 16 agents communicate exclusively through the Supabase database (tasks table) — no direct agent-to-agent calls, no message broker required."),
      spacer(80, 60),
      fourColTable([
        ["BizDev Agent", "Daily 6 AM", "Finds leads via Google Maps, JustDial, LinkedIn. Scores 1–10."],
        ["Outreach Agent", "Daily 9 AM", "Writes hyper-personalized WhatsApp messages per lead. Sends via API."],
        ["Follow-Up Agent", "Daily 10 AM", "Day 3 and Day 7 follow-ups for non-responding leads."],
        ["Discovery Agent", "Background (webhook)", "Handles inbound replies, qualifies budget/timeline/requirements."],
        ["Proposal Agent", "Background (triggered)", "Generates PDF proposals, creates Razorpay links, sends via WhatsApp."],
        ["Contract Agent", "Background (triggered)", "Auto-generates and sends digital service contracts."],
        ["Onboarding Agent", "Background (triggered)", "Client welcome flow after payment, asset collection."],
        ["Architect Agent", "GitHub Actions", "Designs website architecture: pages, components, APIs, DB schema."],
        ["Coder Agent", "GitHub Actions (Aider)", "Writes complete Next.js website code using Aider + Groq LLM."],
        ["Reviewer Agent", "GitHub Actions", "Code review for quality, security, and best practices."],
        ["Tester Agent", "GitHub Actions (Playwright)", "Writes and runs end-to-end tests for all pages."],
        ["Debugger Agent", "GitHub Actions (on failure)", "Automatically fixes test failures and re-runs tests."],
        ["Deployer Agent", "GitHub Actions", "Deploys to staging URL (slug.levitatelabs.online), notifies client."],
        ["Invoice Agent", "Daily 9 AM", "Sends invoices, tracks overdue, sends chase messages on day 3/7/14."],
        ["Retention Agent", "Weekly Sunday", "30-day check-in, 3-month upsell, 6-month annual maintenance offer."],
        ["Reporter Agent", "Daily 8 AM", "Sends WhatsApp morning digest to owner with leads/revenue/alerts."],
      ], ["Agent", "Schedule/Trigger", "Responsibility"],
      [DXA(1.6), DXA(1.5), DXA(3.4)]),
      spacer(120, 80),

      heading2("Agent Reward System — Credit Economy"),
      para("A standout architectural feature is the agent credit economy. Each agent begins with 100 credits and earns or loses credits based on outcomes. High-performing agents receive increased API budgets and scheduling priority. Agents that consistently fail are automatically suspended with an escalation alert sent to the owner."),
      spacer(60, 60),
      threeColTable([
        ["Lead found and scored", "+5 credits", "BizDev Agent"],
        ["Lead qualified by Discovery", "+20 credits", "Discovery Agent"],
        ["Proposal sent", "+15 credits", "Proposal Agent"],
        ["Proposal accepted (client says yes)", "+50 credits", "Proposal Agent"],
        ["Advance payment received", "+75 credits", "Multiple agents (split)"],
        ["Project delivered", "+100 credits", "Deployer Agent"],
        ["Final payment received", "+75 credits", "Invoice Agent"],
        ["Client 5-star rating", "+50 credits", "Deployer / Client Update"],
        ["Retention upsell closed", "+40 credits", "Retention Agent"],
        ["Task failed (any agent)", "-10 credits", "Failing agent"],
        ["Max retries reached / escalation", "-25 credits", "Failing agent"],
        ["Code review rejected", "-5 credits", "Coder Agent"],
        ["Client complaint received", "-30 credits", "Responsible agent"],
      ], ["Event", "Credit Change", "Responsible Agent"],
      [DXA(2.8), DXA(1.4), DXA(2.3)]),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 4 — PLATFORM MODULES
      // ════════════════════════════════════════════════════════
      sectionBanner("04  Platform Modules & Feature Deep Dive", "What every subscriber actually gets"),
      spacer(160, 80),
      heading2("Module 1: Revenue Pipeline (CRM)"),
      para("The CRM module provides a complete lead-to-revenue pipeline. Businesses get a structured workspace to track every potential client from first contact through closed deal. The system tracks lead stages, ownership (which team member is responsible), conversion probability, and pipeline velocity."),
      spacer(60, 60),
      bullet("Visual pipeline board with drag-and-drop stage management"),
      bullet("Lead scoring (1–10) based on configurable criteria"),
      bullet("Conversation history — every WhatsApp/email message logged automatically"),
      bullet("Revenue attribution — which channel, which agent, which campaign sourced each deal"),
      bullet("Conversion analytics — stage-by-stage drop-off rates"),
      bullet("Real-time updates via Supabase Realtime subscriptions"),
      spacer(100, 80),

      heading2("Module 2: Automation Stack"),
      para("This is the most technically differentiated module. While most SMB CRM tools offer email automation, LevitateOS delivers a multi-channel automation layer spanning WhatsApp (via Meta Business API), email (via Resend), Meta Ads, and LinkedIn — all managed from a single interface."),
      spacer(60, 60),
      bullet("WhatsApp outreach sequences — automated but personalized per contact using AI-generated context"),
      bullet("Follow-up automation — day-3 and day-7 follow-up messages without manual scheduling"),
      bullet("Email workflows — onboarding sequences, invoice reminders, retention campaigns"),
      bullet("Meta (Facebook/Instagram) ad workflow integration — campaign triggers based on CRM lead status"),
      bullet("LinkedIn workflow support — outreach sequences for B2B segments"),
      bullet("Message intent classification — inbound messages automatically tagged by intent (interested, pricing inquiry, objection, approval)"),
      bullet("Rate limiting and compliance — messages respect daily limits to prevent spam classification"),
      spacer(100, 80),

      heading2("Module 3: Operations Clarity"),
      para("The ops module solves a problem specific to service businesses: project execution is opaque, files are scattered across WhatsApp groups, and no one knows the real status of any engagement. LevitateOS centralizes all of this."),
      spacer(60, 60),
      bullet("Project board — each client engagement tracked with status, timeline, agent assignment, and progress"),
      bullet("File handoff — Supabase Storage bucket for client-uploaded assets (logos, content, references)"),
      bullet("Mailbox status — email delivery health and read receipts visible in the dashboard"),
      bullet("Growth analytics — channel performance, campaign ROI, and team activity metrics"),
      bullet("Task queue — structured list of pending actions with priority, deadline, and responsible assignment"),
      bullet("Escalation management — anything requiring human judgment surfaces in a dedicated panel"),
      spacer(100, 80),

      heading2("Module 4: Branded Infrastructure"),
      para("Every LevitateOS client receives a path-based branded subdomain at levitatelabs.online/company-name. This is not a cosmetic feature — it creates a real digital presence for businesses that often have nothing more than a WhatsApp number. The subdomain can serve as a business landing page, a link-in-bio replacement, or a full working website — deployed by the Coder and Deployer agents automatically within hours of payment."),
      spacer(80, 60),
      callout(
        "Why Branded Subdomains Matter",
        "78% of Indian SMBs are on WhatsApp, but most have zero web presence. A branded URL on levitatelabs.online gives every subscriber an instant credibility layer — on Google, on WhatsApp profile, on visiting cards — without requiring them to buy a domain, set up hosting, or hire a developer. This feature alone creates immediate, visible, everyday value.",
        C.TEAL
      ),
      spacer(120, 80),

      heading2("Module 5: AI Chat Widget & Research Engine"),
      para("Integrated into the platform is an AI chat widget powered by OpenRouter (allowing model routing across Claude, GPT, Gemma, and others). The widget provides real-time business intelligence — market research, competitor lookups, content drafting, and legal document summaries — directly inside the workspace. This is documented in the repository as the 'research engines, legal tools, and shareable deliverables' layer."),
      spacer(80, 60),

      heading2("Module 6: Admin Dashboard (24/7 Control Center)"),
      para("The admin dashboard at levitatelabs.online/admin is a real-time control room displaying all activity across all agents, all clients, all projects, and all revenue simultaneously. Built with Supabase Realtime subscriptions, the dashboard updates live without page refresh. Key panels include:"),
      spacer(60, 60),
      bullet("Revenue Strip — today's, this month's, total, and pending revenue always visible at top"),
      bullet("Pipeline Funnel — leads found / contacted / qualified / proposals sent / deals won and lost"),
      bullet("Live Agent Activity Feed — every agent action logged in real-time with credit change"),
      bullet("Agent Leaderboard — ranked by credit balance, success rate, and revenue generated"),
      bullet("Active Projects Board — all current client projects with status and current assigned agent"),
      bullet("Hot Leads Panel — highest-scoring new leads with contact details and outreach status"),
      bullet("Task Queue — pending, in-progress, and failed tasks with retry controls"),
      bullet("Escalations Panel — fixed bottom-right popup for items requiring human judgment"),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 5 — HOW WE ARE UNIQUE
      // ════════════════════════════════════════════════════════
      sectionBanner("05  How LevitateOS Is Unique & Different", "The structural advantages no competitor can quickly replicate"),
      spacer(160, 80),
      para("This section addresses the most critical strategic question for any product: Why should a business choose LevitateOS over Salesforce, HubSpot, Zoho, or any other CRM or marketing automation platform? The answer is not one thing — it is a compound of seven structural advantages that, taken together, create a moat that Western platforms cannot bridge by simply lowering their price."),
      spacer(80, 60),

      heading2("Differentiator 1: India-First Architecture at Every Layer"),
      para("Most global CRM platforms were built for North American or European markets and localized for India as an afterthought. Levitate Labs was born in India, built for India, and every design decision reflects this. INR pricing eliminates the foreign exchange anxiety that makes Western SaaS purchasing difficult for Indian SMB owners. WhatsApp — not email, not Slack — is the primary communication channel because that is the reality of Indian business. The AI agents write in Hinglish (Hindi-English hybrid) naturally, because that is how Indian entrepreneurs actually communicate with customers."),
      spacer(60, 60),
      callout(
        "The Localization Gap in Global CRM",
        "For a 10-person Indian SMB, HubSpot Sales Hub costs approximately ₹1.1–1.5 lakh/year per user, and Salesforce Professional costs ₹9,000–10,000/user/month (₹10.8–12 lakh/year for a team of 10). Zoho CRM Professional — the most India-friendly global competitor — still costs ₹1.8 lakh/year for 10 users. LevitateOS Starter at ₹12,999/month (₹1.56 lakh/year) provides more context-appropriate functionality than any of these, including WhatsApp automation and local business discovery tools they don't have.",
        C.ORANGE
      ),
      spacer(120, 80),

      heading2("Differentiator 2: True Omni-Channel Native (WhatsApp-First)"),
      para("LevitateOS is the only platform in its category where WhatsApp is not an add-on or third-party integration — it is a core primitive built into every layer of the system. The outreach agent writes and sends WhatsApp messages. The discovery agent reads and responds to WhatsApp replies. The proposal agent sends PDF links via WhatsApp. The invoice agent chases payments via WhatsApp. The reporter agent delivers the owner's daily briefing via WhatsApp. No competitor offers this level of WhatsApp integration out of the box at this price point."),
      spacer(80, 60),
      para("This matters enormously in the Indian context. WhatsApp messages have a 98% open rate versus ~22% for email. Indian SMBs generate 80% of their customer communication through WhatsApp. Any platform that treats WhatsApp as an integration plugin rather than a core channel is fundamentally misaligned with Indian SMB reality."),
      spacer(80, 60),

      heading2("Differentiator 3: Zero Fixed Infrastructure Cost = Extraordinary Unit Economics"),
      para("The repository documents a total monthly fixed infrastructure cost of ₹0. This is not marketing language — it is engineered reality. Netlify's free tier handles serverless function execution. Supabase's free tier handles the database, storage, and realtime. Groq's free tier handles AI inference for 14,400 requests per day. GitHub Actions' free tier handles CI/CD. Resend's free tier handles email. This architecture means that every rupee of subscription revenue flows almost entirely to gross margin, creating unit economics that no VC-funded platform can match."),
      spacer(80, 60),

      heading2("Differentiator 4: Autonomous AI Agents Replace an Entire Team"),
      para("LevitateOS does not just provide software tools for humans to use — it provides AI agents that do the work autonomously. The BizDev agent finds leads every morning. The Outreach agent writes personalized messages. The Discovery agent qualifies leads via WhatsApp conversation. The Coder agent builds websites. The Invoice agent chases payments. For a solo founder or small agency, this is the equivalent of hiring a sales team, a developer, an account manager, and a finance assistant — all for the price of a software subscription."),
      spacer(80, 60),

      heading2("Differentiator 5: All-in-One vs. Point Solution"),
      para("The Indian SMB market is flooded with point solutions: a CRM here, a WhatsApp tool there, an email platform somewhere else, a website builder on top. The average Indian SMB uses 4–7 disconnected digital tools, each with its own subscription cost, learning curve, and data silo. LevitateOS eliminates this by delivering CRM, WhatsApp automation, email workflows, lead generation, project management, branded subdomain, and analytics in one platform, with one login, one bill, and one support contact."),
      spacer(80, 60),

      heading2("Differentiator 6: Built-In Business Delivery (Not Just Software)"),
      para("When a client subscribes to LevitateOS, they do not just get software access — the Levitate Labs agency deploys their workspace, sets up their automation workflows, and can build their website for them. This managed setup model dramatically reduces the adoption barrier that kills most SaaS subscriptions. The repository documents full onboarding flows, proposal generation, and automated website delivery as part of the product experience, not a separate consulting engagement."),
      spacer(80, 60),

      heading2("Differentiator 7: Real-Time Intelligence Dashboard"),
      para("The 24/7 admin dashboard provides a level of operational visibility that enterprise platforms charge ₹50,000+/month for. Every agent action, every lead status change, every payment received, every client message — all visible in real-time on a single screen. The escalations panel surfaces items requiring human judgment in a non-intrusive way, keeping the owner informed without overwhelming them. This transforms the owner from a manager of chaos into a supervisor of autonomous systems."),
      spacer(80, 60),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 6 — COMPETITIVE LANDSCAPE
      // ════════════════════════════════════════════════════════
      sectionBanner("06  Competitive Landscape & Comparison", "Where Levitate wins, where competitors lead, what the market looks like"),
      spacer(160, 80),
      heading2("Primary Competitive Categories"),
      para("LevitateOS competes across four overlapping market segments: (1) CRM platforms, (2) Marketing automation platforms, (3) WhatsApp business automation tools, and (4) Indian SMB all-in-one platforms. No single competitor occupies all four categories simultaneously with LevitateOS's combination of India pricing, WhatsApp nativity, and AI automation depth."),
      spacer(80, 60),

      heading2("Head-to-Head Competitor Comparison"),
      fourColTable([
        ["LevitateOS (Levitate Labs)", "₹12,999–39,999/mo flat", "WhatsApp-native, AI agents, all-in-one, India-first, zero setup, website delivery", "India SMBs; service businesses in Tier 1–3 cities"],
        ["Salesforce Sales Cloud", "₹9,000–10,000/user/mo", "Market leader, unlimited customization, massive ecosystem, AI (Agentforce)", "Large enterprises; needs dedicated admin; 3–6 month implementation"],
        ["HubSpot Sales Hub", "₹5,500–10,000/user/mo", "Easy to use, strong marketing tools, free starter tier, good analytics", "Mid-market; pricing escalates fast at scale; limited India context"],
        ["Zoho CRM", "₹800–1,500/user/mo", "Most affordable global CRM, deep customization, India-friendly pricing", "Indian SMBs; no WhatsApp nativity; no AI agents; no website delivery"],
        ["Freshsales (Freshworks)", "₹999–4,999/user/mo", "AI lead scoring, built-in phone/email, India-headquartered", "Indian startups; no WhatsApp automation; no built-in website delivery"],
        ["LeadSquared", "₹2,500–5,000/user/mo", "Lead management, marketing automation, India-focused, education/BFSI strong", "Mid-market India; no WhatsApp-first design; no AI website builder"],
        ["WATI / Respond.io", "₹2,500–8,000/mo", "WhatsApp-focused, chatbot builder, shared inbox, no-code flows", "WhatsApp automation only; no CRM, no website, no lead generation"],
        ["Gupshup", "Enterprise pricing", "Conversational AI, WhatsApp API, 45,000+ enterprise clients", "Large enterprises; no SMB tier; complex setup"],
        ["TeleCRM", "₹1,500–3,000/user/mo", "WhatsApp + CRM for India, telesales focus, affordable", "Indian SMBs; telesales-centric; no AI agents; no website delivery"],
        ["EngageBay", "$12–49/user/mo", "All-in-one CRM + email + helpdesk, affordable", "Global SMBs; USD pricing; no WhatsApp nativity; no India context"],
      ], ["Platform", "Pricing", "Key Strengths", "Best Fit / Gap"],
      [DXA(1.5), DXA(1.4), DXA(2.2), DXA(1.4)]),
      spacer(120, 80),

      heading2("Competitive Gap Analysis"),
      para("The following matrix maps six critical capabilities across LevitateOS and its four most relevant competitors. A checkmark indicates native capability, a partial mark indicates limited or add-on capability, and an X indicates absent capability:"),
      spacer(80, 60),
      fourColTable([
        ["WhatsApp-native automation", "Yes (core)", "No (add-on only)", "No", "No", "Partial (limited)"],
        ["AI-autonomous lead generation", "Yes (BizDev Agent)", "No", "Einstein (paid add-on)", "Zia (limited)", "No"],
        ["Automated website delivery", "Yes (Coder + Deployer)", "No", "No", "No", "No"],
        ["India INR flat pricing", "Yes", "No (USD, per-user)", "No (USD, per-user)", "Yes (per-user)", "No"],
        ["Branded subdomain included", "Yes", "No", "No", "No", "No"],
        ["Zero setup / instant activation", "Yes", "No (3–6 months)", "No (weeks)", "No (days–weeks)", "Partial"],
        ["Real-time agent dashboard", "Yes", "Requires configuration", "Yes", "Yes", "No"],
        ["GST invoice automation", "Yes", "No", "No", "No", "No"],
        ["Monthly fixed cost ₹0 infra", "Yes", "No (heavy infra cost)", "No", "No", "No"],
      ], ["Capability", "LevitateOS", "HubSpot", "Salesforce", "Zoho CRM", "WATI"],
      [DXA(2.0), DXA(0.9), DXA(0.9), DXA(0.9), DXA(0.9), DXA(1.0)]),
      spacer(120, 80),

      heading2("India CRM Market Competitive Positioning"),
      para("The Indian CRM market was valued at approximately USD 2.30 billion in 2024 and is projected to reach USD 5.16 billion by 2033, growing at a CAGR of approximately 9.4% (Source: market research aggregates). The market is currently dominated by global players — Salesforce holds the enterprise segment, HubSpot is gaining mid-market ground, and Zoho dominates SMB pricing. However, the 'India-first, WhatsApp-native, AI-powered, all-in-one' segment that LevitateOS occupies is essentially uncrowded at this price point."),
      spacer(80, 60),
      callout(
        "The Blue Ocean Position",
        "Zoho — the closest affordable alternative — still requires per-user pricing, lacks WhatsApp nativity, and does not provide automated website delivery. HubSpot's Indian SMB pricing starts at ~₹66,000/year per user. LevitateOS at ₹12,999/month flat is positioned in a genuine white space: premium enough to signal seriousness, affordable enough for solo founders and teams of 2–10, and feature-rich enough to replace 4–6 separate subscriptions.",
        C.PURPLE
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 7 — CRM MARKET RESEARCH
      // ════════════════════════════════════════════════════════
      sectionBanner("07  Global CRM Market Research", "Sourced from Grand View Research, Precedence Research, Fortune Business Insights, MarketsandMarkets, Statista, Mordor Intelligence"),
      spacer(160, 80),
      heading2("Market Size & Projections"),
      para("The global CRM market is one of the largest and fastest-growing segments in enterprise software. Research firms vary in their precise estimates depending on scope definition, but all point to the same macro trend: explosive, sustained growth driven by AI integration, cloud migration, and SME adoption."),
      spacer(80, 60),
      fourColTable([
        ["Grand View Research", "$73.40B (2024)", "$163.16B (2030)", "14.6% CAGR"],
        ["Precedence Research", "$90.10B (2025)", "$304.03B (2035)", "12.9% CAGR"],
        ["Fortune Business Insights", "$112.91B (2025)", "$262.74B (2032)", "12.8% CAGR"],
        ["Mordor Intelligence", "$81.20B (2025)", "$123.24B (2030)", "8.70% CAGR"],
        ["ResearchAndMarkets", "$62B (2024)", "$144B (2030)", "15.1% CAGR"],
        ["Market Research Future", "$51.63B (2025)", "$153.35B (2035)", "11.5% CAGR"],
        ["Statista / Demand Sage", "$97.90B (2025)", "$146.1B (2029)", "~10.4% CAGR"],
        ["Technavio", "Growing by $75.4B", "2024–2029 period", "11.5% CAGR"],
      ], ["Research Firm", "2024–2025 Estimate", "Forecast Year Value", "CAGR"],
      [DXA(2.0), DXA(1.5), DXA(1.6), DXA(1.4)]),
      spacer(100, 80),
      para("The wide range in estimates reflects different definitions of 'CRM' — some include only core CRM software, others include adjacent categories like marketing automation, customer experience management, and CRM analytics. The consensus midpoint across major research firms suggests a market of $73–90 billion in 2024–2025, growing to $150–300 billion by 2030–2035."),
      spacer(80, 60),

      heading2("Key Market Drivers"),
      bullet([run("AI and Generative AI Integration: ", { bold: true }), run("65% of businesses have already adopted CRM systems with generative AI as of 2025, with over 70% of all platforms projected to be AI-integrated by end of 2025 (Kixie Research). Businesses using generative AI in CRM are 83% more likely to exceed their sales goals (Salesforce/Vanson Bourne). AI-driven lead scoring can increase conversion rates by up to 20%.")]),
      bullet([run("SME Adoption Surge: ", { bold: true }), run("SMEs are projected to grow at a CAGR of 16.1% — faster than large enterprises — driven by the affordability of cloud solutions and low-code platforms (ResearchAndMarkets). Over 90% of businesses report surge in automation demand (ERP Today).")]),
      bullet([run("Cloud Dominance: ", { bold: true }), run("Over 85% of new CRM deployments in 2024 were cloud-based, marking a decisive departure from legacy on-premise systems (ResearchAndMarkets). The cloud segment accounted for 58.2% of revenue share in 2024 (Grand View Research).")]),
      bullet([run("Asia-Pacific Fastest Growth: ", { bold: true }), run("The Asia-Pacific region is forecasted as the fastest-expanding CRM market with a CAGR of 19.1%, driven by SME adoption, governmental digitalization initiatives, and mobile-first engagement strategies.")]),
      bullet([run("Mobile CRM Growth: ", { bold: true }), run("The mobile CRM software market size is projected to grow from $28.43 billion in 2024 to $31.61 billion in 2025. 65% of sales teams that use mobile-first CRMs hit their quotas — a significant performance difference.")]),
      spacer(100, 80),

      heading2("Market Segmentation Insights"),
      para("Customer service applications dominate CRM revenue at 22.1% of the market. CRM analytics is the fastest-growing application with an 18.7% CAGR through 2030, as businesses seek data-driven insights. Sales force automation is projected to reach $33.45 billion and marketing automation within CRM $27.56 billion by 2035 (Market Research Future). The retail and e-commerce segment is expected to grow fastest at an 18.5% CAGR due to rising consumer expectations for personalized, integrated experiences."),
      spacer(80, 60),
      para("Large enterprises still dominate CRM revenue with 63.1% share in 2024, but SMEs are projected to grow at 16.1% CAGR — the fastest segment. This structural shift toward SME adoption is the direct tailwind for LevitateOS's target market."),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 8 — MARKETING AUTOMATION
      // ════════════════════════════════════════════════════════
      sectionBanner("08  Marketing Automation Market Research", "Sourced from MarketsandMarkets, Grand View Research, Mordor Intelligence"),
      spacer(160, 80),
      heading2("Market Overview"),
      para("Marketing automation — the direct competitive context for LevitateOS's automation stack — is a high-growth market that underpins the entire digital marketing economy. Unlike CRM (which focuses on customer relationship management), marketing automation specifically addresses campaign execution, lead nurturing, email and messaging workflows, and omnichannel engagement at scale."),
      spacer(80, 60),
      threeColTable([
        ["MarketsandMarkets (Jul 2025)", "$47.02B (2025)", "$81.01B by 2030, CAGR 11.5%"],
        ["Grand View Research", "$6.65B (2024)", "$15.58B by 2030, CAGR 15.3%"],
        ["Mordor Intelligence", "$8.16B (2026)", "$14.98B by 2031, CAGR 12.92%"],
        ["Grand View Research (broader)", "$15.62B (2030)", "15.3% annual growth rate"],
        ["US Market Alone", "$1,774.9M (2024)", "$3,679.6M by 2030, CAGR 13.5%"],
      ], ["Source", "Current Market Size", "Forecast & Growth"],
      [DXA(2.5), DXA(1.8), DXA(2.2)]),
      spacer(100, 80),
      para("The variance in estimates reflects scope differences — the $47B figure from MarketsandMarkets includes marketing technology broadly, while Grand View Research's $6.65B reflects core marketing automation software. Both tell the same story: the market is large, growing fast, and increasingly driven by AI."),
      spacer(80, 60),
      heading2("Key Automation Trends Relevant to LevitateOS"),
      bullet("Email marketing automation retains 26.7–28.73% revenue share and is the largest single application — directly relevant to LevitateOS's email workflow module"),
      bullet("Mobile marketing is set to outpace all other applications with a 14.79% CAGR, driven by push notifications and in-app messaging — WhatsApp is the dominant mobile marketing channel in India"),
      bullet("Cloud installations captured 82.14% share in 2025 — aligns with LevitateOS's cloud-native architecture"),
      bullet("Asia-Pacific marketing automation is forecast to grow at 13.96% CAGR, propelled by SMB cloud adoption in India, Indonesia, Vietnam, and the Philippines"),
      bullet("Small firms in India, Indonesia, Vietnam, and the Philippines are adopting cloud marketing suites at 2–3 percentage points faster than North American peers annually (Mordor Intelligence)"),
      bullet("Localized rupee-denominated plans under USD 50/month removed FX risk for Indian micro-enterprises — LevitateOS is positioned precisely here"),
      bullet("AI-driven solutions that enhance customer engagement are the #1 market driver (MarketsandMarkets)"),
      bullet("80% of marketing automation users saw leads increase (Marketing Dive) — automation generates measurable results"),
      bullet("Marketing automation returns $5.44 for every dollar spent (Nucleus Research)"),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 9 — WHATSAPP BUSINESS
      // ════════════════════════════════════════════════════════
      sectionBanner("09  WhatsApp Business Ecosystem", "Sourced from Meta Business Reports, IAMAI Digital India Report 2026, Infobip, Gallabox, WAPIkit, Hyperleap AI"),
      spacer(160, 80),
      heading2("Global WhatsApp Business Statistics (2025–2026)"),
      para("WhatsApp is no longer merely a messaging app — it is the world's largest B2C communication platform, and for Indian businesses, it is the primary commerce and customer service infrastructure. Understanding this market is essential to understanding LevitateOS's strategic position."),
      spacer(80, 60),
      threeColTable([
        ["WhatsApp Global Users (2025)", "2.9–3.2 billion active users", "Most-used messaging app globally"],
        ["Businesses Using WhatsApp", "200+ million worldwide (2025)", "50 million+ using WhatsApp Business app"],
        ["India WhatsApp Users", "550+ million active (2025)", "Largest national market; grew 314% 2021–2025"],
        ["Indian SMBs on WhatsApp", "78% adoption rate", "65% report sales increase after adoption (IAMAI 2026)"],
        ["India Business Downloads", "#1 country globally", "576 million total downloads across platforms"],
        ["WhatsApp Message Open Rate", "98%", "vs. ~22% for email (Meta Business Reports)"],
        ["WhatsApp Click-Through Rate", "45–60%", "vs. 2–5% for email"],
        ["Daily Business Interactions", "175 million people/day", "Message a business on WhatsApp daily (Meta)"],
        ["WhatsApp API Revenue (2025)", "$15.6 billion estimated", "Business API subscriptions ~$9.8B"],
        ["Asia-Pacific API Market Share", "35.4% in 2025", "~$2.9 billion, largest regional market"],
        ["Enterprise API Adoption Plan", "80% of large enterprises", "Planning to adopt WhatsApp Business API by 2025"],
        ["API Growth Rate", "~15% year-over-year", "Global WhatsApp Business API adoption rate"],
        ["AI Chatbot Growth", "60% increase in 2023", "Chatbot interactions on WhatsApp; now dominant"],
        ["Conversational AI on WhatsApp", "91% of all interactions", "On Infobip platform in 2025 (Infobip 2026)"],
      ], ["Metric", "Value", "Context / Source"],
      [DXA(2.3), DXA(1.8), DXA(2.4)]),
      spacer(120, 80),

      heading2("India-Specific WhatsApp Business Dynamics"),
      para("India's WhatsApp ecosystem is unique in global commerce. No other country combines 550+ million users, 78% SMB adoption, a UPI payment infrastructure, and cultural comfort with chat-commerce. Understanding this uniqueness is essential to appreciating why LevitateOS's WhatsApp-native architecture is not just a nice-to-have — it is the most important product decision the company has made."),
      spacer(80, 60),
      bullet("50+ million Indian businesses use WhatsApp Business app in some form (WABB India, 2026)"),
      bullet("For most Indian SMBs, WhatsApp has replaced phone calls and email as the primary customer communication channel"),
      bullet("80% of Indian small businesses consider WhatsApp crucial for scaling their operations (WAPIkit)"),
      bullet("Businesses responding to leads within one minute are 40% more likely to convert — impossible without automation"),
      bullet("Indian businesses migrating from WhatsApp Business App to API report 45% faster response times and 28% higher conversion rates within the first quarter (Hyperleap AI)"),
      bullet("Average monthly spend on WhatsApp AI automation for Indian SMBs: ₹8,000–15,000 (Hyperleap AI)"),
      bullet("78% of AI chatbot users on WhatsApp report at least 25% reduction in customer support costs"),
      bullet("Hindi-English bilingual bots account for 65% of all WhatsApp AI deployments in India"),
      bullet("Meta charges ₹0.88 per marketing conversation and ₹0.13 per utility conversation in India"),
      bullet("Real estate developers and brokers have made WhatsApp their primary lead capture channel for residential sales"),
      spacer(80, 60),
      callout(
        "WhatsApp API Market Opportunity for LevitateOS",
        "The WhatsApp Business API Platform market in Asia-Pacific alone was worth ~$2.9 billion in 2025 (DataIntelo). LevitateOS's native WhatsApp integration — available to every subscriber from day one — positions the platform to capture a meaningful share of this spend by replacing standalone WhatsApp tools that Indian SMBs currently purchase separately.",
        C.GREEN
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 10 — LEAD GENERATION
      // ════════════════════════════════════════════════════════
      sectionBanner("10  Lead Generation Software Market", "Sourced from 360iResearch, ResearchAndMarkets, HTF Market Insights, Deep Market Insights"),
      spacer(160, 80),
      heading2("Global Lead Generation Software Market"),
      para("Lead generation software — one of LevitateOS's core modules via the BizDev and Outreach agents — is a rapidly expanding market driven by demand for automated, AI-powered prospect identification and qualification."),
      spacer(80, 60),
      threeColTable([
        ["360iResearch (2025)", "$8.76 billion", "$23.08B by 2032, CAGR 14.82%"],
        ["ResearchAndMarkets (360i)", "$1.99 billion (2025)", "$3.83B by 2030, CAGR 14.08%"],
        ["HTF Market Insights", "$5 billion (base)", "$9B by 2030, CAGR 11.00%"],
        ["Deep Market Insights (India)", "$86.26M (India, 2025)", "$299.05M by 2034, CAGR 14.94%"],
      ], ["Source", "Current Market", "Forecast & Growth"],
      [DXA(2.3), DXA(1.8), DXA(2.4)]),
      spacer(100, 80),
      heading2("India Lead Generation Software Market"),
      para("India's lead generation software market was valued at USD 86.26 million in 2025 and is projected to reach USD 299.05 million by 2034, growing at a CAGR of 14.94% (Deep Market Insights). India accounts for 4.61% of the global lead generation software market in 2025 — a share expected to grow as SMB digitalization accelerates. Cloud-based solutions are the fastest-growing deployment type, aligning perfectly with LevitateOS's architecture."),
      spacer(80, 60),
      heading2("Key Lead Generation Trends"),
      bullet("AI-powered predictive analytics for lead scoring accuracy is the #1 emerging capability"),
      bullet("Omnichannel engagement strategies combining email, social, and messaging outreach are becoming standard"),
      bullet("Intent data and behavioral signals are increasingly used to identify high-probability buyers"),
      bullet("81% of organizations are expected to adopt AI-powered CRM systems by 2025 (360iResearch)"),
      bullet("Businesses with integrated sales-marketing teams are 58% more likely to exceed revenue targets"),
      bullet("B2B agencies using AI automation report reply rates of 20–30% and cost-per-lead reductions of up to 50% (SMPL, India)"),
      bullet("Conversational AI chatbots to qualify leads and schedule meetings are growing rapidly as an automation category"),
      bullet("Mobile-first lead capture forms optimized for responsiveness are replacing desktop forms"),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 11 — INDIA MSME & SAAS MARKET
      // ════════════════════════════════════════════════════════
      sectionBanner("11  India MSME & SaaS Market Opportunity", "Sourced from SaaSBoomi, SIDBI, Vi Business MSME Study, YourStory, Business Standard"),
      spacer(160, 80),
      heading2("India MSME Sector Profile"),
      para("India's MSME sector is the single most important context for understanding LevitateOS's total addressable market. With 59.3 million registered MSMEs, the sector contributes approximately 30% of India's GDP, accounts for nearly 46% of exports, and employs over 25 crore (250 million) people. 68% of registered MSMEs are concentrated in just 10 states, with Maharashtra, Gujarat, Rajasthan, and Tamil Nadu leading adoption."),
      spacer(80, 60),
      callout(
        "The Digital Paradox",
        "According to SIDBI's 2025 survey: over 90% of Indian MSMEs now accept digital payments — a massive achievement. Yet only 13% actively use digital marketing or e-commerce to reach customers, and fewer than that use structured CRM. 60% of MSMEs plan to focus on digitalization in FY25 (Vi Business MSME Study). The gap between payment digitization and sales/marketing digitization is the entire opportunity that LevitateOS is built to capture.",
        C.ORANGE
      ),
      spacer(120, 80),
      heading2("India SaaS Market"),
      twoColTable([
        ["India SaaS Market Size (2025)", "$20 billion (SaaSBoomi / 1Lattice, 2026)"],
        ["India SaaS Projected Size (2035)", "$100 billion (SaaSBoomi report, January 2026)"],
        ["India SaaS CAGR", "~17% per year (implied from $20B to $100B in 10 years)"],
        ["SMB SaaS Opportunity", "$13 billion addressable (vertical SaaS for SMBs, SaaSBoomi)"],
        ["AI/Cloud Enterprise SaaS", "$35 billion growth lever through 2035"],
        ["Digital-Native Business Spend", "From $4.6B (2025) to $26B by 2035"],
        ["India SaaS CAGR (separate estimate)", "30% CAGR 2024–2030 (Ken Research)"],
        ["Medium Business SaaS Spend", "INR 8–10 lakh annually on cloud hosting"],
        ["Key India SaaS Players", "Zoho, Freshworks, Razorpay (all Indian-origin)"],
        ["Government Support", "Digital India, Startup India initiatives; up to 25% SaaS cost subsidies for qualifying SMBs"],
      ], ["Metric", "Value / Source"]),
      spacer(120, 80),
      heading2("Digital Adoption Gaps = LevitateOS Opportunity"),
      para("The Vi Business MSME Growth Insights Study 2025 documents specific digital maturity gaps across sectors:"),
      spacer(60, 60),
      bullet("Only 23% of MSMEs in the lowest-ranked sectors engage digitally with customers (Vi Business, 2025)"),
      bullet("64% of these businesses plan to increase digital budgets in 2025, focusing on workspace and operations"),
      bullet("52% of manufacturing MSMEs use digital tools for customer outreach — the rest are unreached"),
      bullet("IT-ITeS MSMEs led the 2024 Digital Maturity Index; all other sectors are lagging by 2–4 pillars"),
      bullet("MSMEs in Tier II and III cities report 20% average revenue growth after ONDC integration (EasyPay data, 2025)"),
      bullet("Credit access for micro and small enterprises has improved from 14% to 20%, enabling more SaaS purchasing power"),
      bullet("300,000+ Indian enterprises empowered by Mastercard Strive / CII Digital Saksham; targeting 500,000 by 2026"),
      spacer(80, 60),
      para("SBI processed SME digital loans worth ₹74,434 crore across 225,000 accounts up to August 2025. This capital is being deployed into business operations — and a portion is going toward digital tools. India's SMB segment is not just willing to pay for software — it is being structurally financed to do so."),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 12 — TARGET MARKET ANALYSIS
      // ════════════════════════════════════════════════════════
      sectionBanner("12  Target Market Analysis", "Who LevitateOS is built for"),
      spacer(160, 80),
      heading2("Primary Target Segments"),
      para("Based on the repository's configuration files (config/rate-card.json, config/services.json), the BizDev Agent's scraping targets, and the platform's pricing structure, LevitateOS's initial target market is highly specific:"),
      spacer(80, 60),
      threeColTable([
        ["Restaurants & Food Businesses", "Vadodara, Surat, Ahmedabad", "No website, active Instagram, high WhatsApp use"],
        ["Clinics & Healthcare", "Gujarat Tier 1–2 cities", "Appointment management, patient communication needs"],
        ["Coaching & Education Centres", "Across Gujarat and Maharashtra", "Lead generation, enrollment automation, follow-up"],
        ["Retail & Local Shops", "Gujarat MSME base", "WhatsApp ordering, product catalog, Google presence"],
        ["Service Businesses (agencies, consultants)", "Urban India", "CRM, proposal automation, client management"],
        ["Real Estate Developers/Brokers", "Pan-India", "Lead nurturing, WhatsApp follow-up, proposal generation"],
        ["D2C E-commerce Brands", "Urban India", "Order updates, cart recovery, customer retention"],
        ["Professional Services (lawyers, CAs)", "Tier 1 cities", "Client CRM, document management, billing"],
      ], ["Segment", "Geography", "Primary Pain Point"],
      [DXA(2.1), DXA(1.8), DXA(2.6)]),
      spacer(120, 80),
      heading2("Total Addressable Market (TAM) Estimation"),
      para("India has 59.3 million registered MSMEs. If we conservatively assume 10% — roughly 6 million businesses — are in service-oriented sectors that would benefit from LevitateOS's specific feature set (CRM + WhatsApp automation + website), and of these, 1 in 10 could be reached and converted at a ₹12,999/month price point over 5 years, the conservative TAM is:"),
      spacer(60, 60),
      bullet("600,000 potential subscribers × ₹12,999/month = ₹7,799.4 crore/month ARR at full penetration"),
      bullet("At even 0.1% penetration (6,000 subscribers on Starter plan), ARR = ₹9.36 crore/year"),
      bullet("Realistically, a 1,000-subscriber milestone represents ₹15.6 crore ARR on Starter alone"),
      bullet("Mix-adjusted across Growth OS (₹22,999) and Scale Suite (₹39,999) could 2–3x revenue per subscriber"),
      spacer(80, 60),
      callout(
        "SAM and SOM Reality Check",
        "The Serviceable Addressable Market (SAM) focused on Gujarat and Maharashtra MSMEs with internet access and digital payment capability is approximately 2–3 million businesses. The Serviceable Obtainable Market (SOM) in the first 24 months — focused on Vadodara, Surat, Ahmedabad, and Mumbai — is realistically 500–2,000 active subscribers if outreach, product-market fit, and churn are managed effectively. Each subscriber at ₹22,999/month (Growth OS, recommended plan) generates ₹2.76 lakh/year in ARR.",
        C.ELECTRIC
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 13 — REVENUE MODEL
      // ════════════════════════════════════════════════════════
      sectionBanner("13  Revenue Model & Pricing Analysis", "How LevitateOS makes money and what the unit economics look like"),
      spacer(160, 80),
      heading2("Subscription Pricing Tiers"),
      para("LevitateOS offers a four-tier subscription model, visible on the onboarding page at levitatelabs.online/onboard. Pricing is flat (not per-user), which is a critical competitive differentiator for team-based deployments."),
      spacer(80, 60),
      fourColTable([
        ["Starter CRM", "₹12,999/month", "₹1,29,990/year", "Solo founders, small teams. Clean CRM, basic automation, fast launch."],
        ["Growth OS", "₹22,999/month", "₹2,29,990/year", "Recommended. Service businesses wanting leads and follow-up automation."],
        ["Scale Suite", "₹39,999/month", "₹3,99,990/year", "Larger teams needing custom workflows and hands-on implementation."],
        ["Enterprise Build", "Custom pricing", "Custom pricing", "Multi-location, deep integrations, tailored onboarding."],
      ], ["Plan", "Monthly Price", "Annual Price", "Best For"],
      [DXA(1.3), DXA(1.2), DXA(1.3), DXA(2.7)]),
      spacer(100, 80),
      heading2("Annual vs Monthly Incentive"),
      para("Annual pricing offers a ~17% discount versus monthly (10 months' price for 12 months of service). This structure incentivizes annual commitment, which improves cash flow predictability and reduces churn risk — a standard SaaS pricing strategy used by HubSpot, Salesforce, and Zoho."),
      spacer(80, 60),
      heading2("Revenue Streams"),
      bullet([run("Subscription Revenue (Primary): ", { bold: true }), run("Monthly and annual SaaS subscriptions from LevitateOS clients. Predictable, recurring, high-margin.")]),
      bullet([run("Agency Services Revenue (Secondary): ", { bold: true }), run("Web development (₹3,000–80,000 per project), CAD design, branding, and marketing execution. One-time or project-based.")]),
      bullet([run("Transaction-Based Revenue (Future): ", { bold: true }), run("WhatsApp conversation fees passed through, Razorpay transaction fees, AI usage overages above plan limits.")]),
      bullet([run("Maintenance Retainers (Future): ", { bold: true }), run("The Retention Agent explicitly targets ₹1,499–3,000/month annual maintenance plans from delivered website clients.")]),
      bullet([run("Upsell / Expansion Revenue: ", { bold: true }), run("Plan upgrades from Starter to Growth OS, SEO packages (₹3,000 one-time), content updates, and additional channel integrations.")]),
      spacer(100, 80),
      heading2("Unit Economics Scenario Analysis"),
      threeColTable([
        ["Scenario", "Subscribers", "Avg Plan", "Monthly ARR", "Annual ARR"],
        ["MVP / Initial", "50", "Growth OS ₹22,999", "₹11.5 lakh", "₹1.38 crore"],
        ["Early Traction", "200", "Growth OS ₹22,999", "₹46 lakh", "₹5.52 crore"],
        ["Growth Stage", "500", "Mix ₹25,000 avg", "₹1.25 crore", "₹15 crore"],
        ["Scale Stage", "2,000", "Mix ₹27,000 avg", "₹5.4 crore", "₹64.8 crore"],
        ["Market Leader", "10,000", "Mix ₹28,000 avg", "₹28 crore", "₹336 crore"],
      ].slice(1), ["Scenario", "Subscribers", "Avg Plan", "Monthly ARR", "Annual ARR"],
      [DXA(1.4), DXA(1.0), DXA(1.5), DXA(1.3), DXA(1.3)]),
      spacer(100, 80),
      callout(
        "Infrastructure Cost Advantage",
        "Because LevitateOS's fixed infrastructure cost is ₹0/month (all free tiers), gross margin on subscription revenue is near 100% at early scale — accounting only for AI API calls (Groq free + Anthropic pay-per-use overflow), payment processing (Razorpay 2% per transaction), and human support time. This is extraordinary compared to SaaS industry average gross margins of 70–80%, and enterprise software margins of 60–70%.",
        C.GREEN
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 14 — HOW LEVITATE CAN SCALE
      // ════════════════════════════════════════════════════════
      sectionBanner("14  How Levitate Can Scale", "The 5-phase growth architecture from 50 to 10,000 clients"),
      spacer(160, 80),
      heading2("Phase 1: Local Depth (Month 1–6) — Vadodara / Surat / Ahmedabad"),
      para("The repository documents that the BizDev Agent specifically targets businesses in Vadodara, Surat, and Ahmedabad for lead generation. This geographic focus is deliberate and strategically correct for phase one. Local depth allows direct case study development, word-of-mouth referrals (the highest-converting channel in Indian SMB markets), real-time feedback loops, and in-person relationship building that accelerates trust."),
      spacer(60, 60),
      bullet("Target: 50–100 paying subscribers in Gujarat's three largest cities"),
      bullet("BizDev Agent runs daily to find restaurants, clinics, coaching centres, and retail shops without websites"),
      bullet("Outreach Agent sends personalized Hinglish WhatsApp messages with specific observations about each business"),
      bullet("Case studies from early clients become the primary sales tool for word-of-mouth expansion"),
      bullet("The Retention Agent begins building maintenance revenue at month 4 from the first cohort"),
      bullet("Target ARR at Phase 1 completion: ₹1.38–2.76 crore (50–100 subscribers on Growth OS)"),
      spacer(100, 80),

      heading2("Phase 2: Gujarat Scale (Month 6–18) — All Major Gujarat Cities"),
      para("With 50+ case studies and a refined product, Phase 2 expands the BizDev Agent's geographic radius to cover Rajkot, Gandhinagar, Bhavnagar, Jamnagar, and all Tier 2 Gujarat cities. The scraping targets expand to include additional business categories based on Phase 1 data about which segments convert best."),
      spacer(60, 60),
      bullet("Expand BizDev Agent scraping targets to 15+ Gujarat cities"),
      bullet("Launch referral program: existing clients get one month free for each successful referral"),
      bullet("Begin LinkedIn and Instagram content marketing targeting Gujarat SMB owners"),
      bullet("Hire 1–2 human account managers to handle high-value Scale Suite and Enterprise deals"),
      bullet("Develop 3–5 industry-specific onboarding templates (restaurant, clinic, coaching, retail, real estate)"),
      bullet("Target ARR at Phase 2 completion: ₹5–8 crore (200–300 subscribers)"),
      spacer(100, 80),

      heading2("Phase 3: Maharashtra & Pan-India Digital (Month 18–36)"),
      para("Phase 3 combines geographic expansion with a digital-first acquisition model. Mumbai, Pune, Thane, Nashik, and Nagpur are added to geographic targets. Simultaneously, a content marketing and SEO strategy targets digital-first acquisition — businesses searching for 'WhatsApp CRM India', 'business automation India', 'all-in-one CRM small business', and similar queries."),
      spacer(60, 60),
      bullet("Google Ads and Meta Ads campaigns targeting SMB decision-makers in Maharashtra and Gujarat"),
      bullet("SEO content cluster around 'WhatsApp automation India', 'CRM for Indian small business', 'business OS India'"),
      bullet("Productized onboarding: 48-hour workspace activation guarantee as marketing differentiator"),
      bullet("API partnerships with Razorpay, Gupshup, or regional Meta Business Solution Providers (BSPs)"),
      bullet("Launch LevitateOS reseller / white-label program for digital agencies wanting to offer it to their clients"),
      bullet("Target ARR at Phase 3 completion: ₹15–25 crore (500–1,000 subscribers)"),
      spacer(100, 80),

      heading2("Phase 4: Vertical SaaS Specialization (Month 36–60)"),
      para("Phase 4 transitions LevitateOS from a horizontal platform to a portfolio of vertical-specific products. The codebase already contains category-specific agent prompts for restaurants, clinics, coaching centres, and retail. These become standalone vertical products with dedicated branding, pricing, and feature sets."),
      spacer(60, 60),
      bullet("LevitateOS for Restaurants — reservation management, WhatsApp menu orders, Google Reviews automation"),
      bullet("LevitateOS for Clinics — appointment booking, patient follow-up, prescription reminders via WhatsApp"),
      bullet("LevitateOS for Education — student enrollment CRM, fee collection, batch management"),
      bullet("LevitateOS for Real Estate — property lead qualification, site visit scheduling, MIS reporting"),
      bullet("Vertical products command 30–50% pricing premium over horizontal platform"),
      bullet("Partnership integrations with Practo, Justdial, BookMyShow, and other vertical aggregators"),
      bullet("Target ARR at Phase 4 completion: ₹50–80 crore (2,000–3,000 subscribers)"),
      spacer(100, 80),

      heading2("Phase 5: Platform Ecosystem & International (Month 60+)"),
      para("Phase 5 positions LevitateOS as a platform rather than a product — opening the API and agent framework to third-party developers, international agencies, and enterprise customers in South and Southeast Asia."),
      spacer(60, 60),
      bullet("LevitateOS API — allow third-party apps to read/write CRM data, trigger agents, and access analytics"),
      bullet("Agent Marketplace — agencies and developers build and sell specialized agents on the platform"),
      bullet("International expansion: Bangladesh, Sri Lanka, UAE, and other Indian diaspora business markets where WhatsApp is dominant"),
      bullet("Enterprise tier: multi-location businesses, franchise networks, and large service organizations"),
      bullet("Potential acquisition targets: WhatsApp BSPs, regional CRM tools, or verticalized SaaS companies"),
      bullet("Target ARR at Phase 5 completion: ₹200–500 crore (8,000–15,000 subscribers, international mix)"),
      spacer(80, 60),

      heading2("Scaling Enablers — Infrastructure Considerations"),
      para("As subscriber count grows, the zero-cost infrastructure model will require evolution. Supabase's free tier limits (50,000 monthly active users, 500MB database, 1GB storage) will require paid tier migration at approximately 100–200 active business accounts. Netlify's free tier limits on function execution will require upgrade at scale. These transitions are planned costs and do not represent scaling risks — they are well-understood expenses that grow predictably with revenue."),
      spacer(60, 60),
      bullet("Supabase Pro: $25/month for unlimited MAUs, 8GB database, 100GB storage — covers up to ~500 subscribers comfortably"),
      bullet("Supabase Team: $599/month for enterprise compliance, unlimited storage — appropriate at 2,000+ subscribers"),
      bullet("Netlify Pro: $19/month covers most scaling needs up to 1 million function invocations"),
      bullet("Groq's free tier (14,400 req/day) covers significant AI usage; Anthropic Claude pricing at pay-per-use overflow is predictable"),
      bullet("At 1,000 subscribers, total infrastructure cost is estimated at ₹5,000–8,000/month — less than 0.5% of ARR"),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 15 — KEY QUESTIONS ANSWERED
      // ════════════════════════════════════════════════════════
      sectionBanner("15  Key Questions Answered (Strategic FAQ)", "The most important questions investors, clients, and partners ask"),
      spacer(160, 80),

      heading3("Q1: Is LevitateOS a CRM or a marketing platform or an automation tool?"),
      para("LevitateOS is none of these in isolation — and all of them combined. The correct framing is that LevitateOS is a business operating system: a single infrastructure layer that replaces the need for a separate CRM subscription, a separate WhatsApp automation tool, a separate email marketing platform, a separate project management tool, and a separate analytics dashboard. The positioning as an 'OS' rather than a 'tool' is deliberate and accurate — it is the operating layer on which a business's growth activities run."),
      spacer(80, 80),

      heading3("Q2: How is LevitateOS different from Zoho, which is also India-priced and feature-rich?"),
      para("Zoho is the best global CRM for Indian SMBs from a pricing standpoint — but it still has fundamental gaps that LevitateOS addresses: (1) Zoho requires per-user pricing, which becomes expensive for teams. LevitateOS is flat-rate. (2) Zoho has no native WhatsApp automation — it requires third-party integrations. LevitateOS has WhatsApp built in at every layer. (3) Zoho does not generate leads autonomously via scraping. LevitateOS's BizDev Agent does this daily. (4) Zoho does not build websites for clients. LevitateOS's Coder and Deployer agents do. (5) Zoho requires setup time and technical knowledge. LevitateOS activates instantly upon payment."),
      spacer(80, 80),

      heading3("Q3: Who is the ideal LevitateOS customer?"),
      para("The ideal customer is a service business owner in an Indian Tier 1 or Tier 2 city with 2–20 employees, ₹10–50 lakh annual revenue, active on WhatsApp and Instagram, currently losing leads because of slow follow-up or no digital presence, and aware enough to spend ₹12,999–22,999/month on solving this. Specific profiles: restaurant owners who need WhatsApp ordering and Google visibility; coaching centre founders who need enrollment automation; clinic owners who need appointment management; real estate brokers who need lead nurturing; e-commerce founders who need customer retention automation."),
      spacer(80, 80),

      heading3("Q4: What is the biggest risk to LevitateOS?"),
      para("Three primary risks exist: (1) Churn — if businesses do not see clear ROI within 30–60 days, they cancel. The mitigation is the 48-hour activation guarantee and pre-built workflows that generate visible output (leads found, messages sent, proposals generated) immediately. (2) Competition from well-funded Indian CRM players like LeadSquared or Freshworks launching a WhatsApp-native tier. The mitigation is speed of execution and the proprietary agent architecture that cannot be replicated in months. (3) WhatsApp policy changes — Meta controls the API and can change pricing or access rules. The mitigation is multi-channel architecture (email, LinkedIn, Meta Ads) and the platform's ability to function even if one channel is restricted."),
      spacer(80, 80),

      heading3("Q5: How does LevitateOS acquire customers?"),
      para("Customer acquisition is itself automated. The BizDev Agent identifies potential clients daily by scraping Google Maps, JustDial, and LinkedIn for businesses without websites or with weak digital presence. The Outreach Agent sends personalized WhatsApp messages to these businesses. The Discovery Agent qualifies interested replies. The Proposal Agent converts qualified leads to paying clients — all without human intervention for the first three stages. Human involvement is needed only for Enterprise deals or complex client relationships. This self-acquiring model means LevitateOS's CAC (Customer Acquisition Cost) is primarily the AI API cost of a few hundred WhatsApp messages, not a sales team salary."),
      spacer(80, 80),

      heading3("Q6: Can LevitateOS handle enterprise clients?"),
      para("The Enterprise Build tier (custom pricing) is explicitly designed for multi-location operations, complex integrations, and tailored onboarding. The codebase's architecture supports multi-tenant data isolation via Supabase Row Level Security (RLS). The GitHub Actions pipeline can deploy custom codebases. The agent system can be extended with additional specialized agents for specific enterprise workflows. The main limitation at current maturity is human capacity for bespoke enterprise onboarding — this is addressed by the Scale Suite's 'hands-on implementation' promise and is managed as a professional services capacity constraint."),
      spacer(80, 80),

      heading3("Q7: How does the agent credit economy prevent system failure?"),
      para("The credit economy is an elegant self-regulating mechanism. Agents that consistently produce good outcomes accumulate credits and earn increased API budgets and scheduling priority. Agents that fail lose credits and get deprioritized or suspended. The weekly Evaluator Agent reviews all agent performance and issues bonus credits for excellent weeks or penalty credits for poor weeks. This creates a system where the most reliable agent configurations survive and improve over time — analogous to how A/B testing optimizes marketing copy, but applied to autonomous business logic. An owner receives a WhatsApp alert whenever any agent drops below zero credits or is suspended, ensuring human oversight is maintained."),
      spacer(80, 80),

      heading3("Q8: What is LevitateOS's moat / defensibility over time?"),
      para("Five sources of defensibility build over time: (1) Data moat — every client interaction, lead score, conversion rate, and agent performance metric is stored and can be used to train better models and scoring algorithms. Over time, LevitateOS will know more about Indian SMB customer acquisition patterns than any competitor. (2) Network effects — as more businesses use the platform, referral programs and case study libraries create word-of-mouth flywheel effects. (3) Switching costs — once a business's CRM data, client conversations, project files, and automation workflows are on LevitateOS, migration is painful. (4) Agent improvement — each agent improves through the credit system and prompt refinement; proprietary agent configurations become increasingly difficult to replicate. (5) Brand trust — in Indian SMB markets, trust is built through word-of-mouth and personal relationships. A reputation for delivering measurable results quickly becomes a durable competitive asset."),
      spacer(80, 80),

      heading3("Q9: How does LevitateOS comply with Indian data protection regulations?"),
      para("India's Digital Personal Data Protection (DPDP) Act 2023 requires explicit consent before sending marketing messages and mandates data localization for certain sensitive categories. LevitateOS's WhatsApp automation requires opt-in consent from customers before sending marketing messages, in line with both WhatsApp's policies and the DPDP Act. The Supabase PostgreSQL database can be configured with Indian region hosting. GST invoicing is built into the Invoice Agent with configurable GSTIN fields. The Terms of Service and Privacy Policy infrastructure is referenced in the repository's legal tools module. As regulations evolve, compliance updates are a platform-level responsibility, not a per-client burden."),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 16 — SWOT
      // ════════════════════════════════════════════════════════
      sectionBanner("16  SWOT Analysis", "Honest, data-driven strategic assessment"),
      spacer(160, 80),
      heading2("Strengths"),
      bullet([run("India-first, WhatsApp-native architecture: ", { bold: true }), run("Built for the actual communication patterns and business context of Indian SMBs, not retrofitted from Western products.")]),
      bullet([run("Zero infrastructure cost: ", { bold: true }), run("Near-100% gross margin potential at early scale. No VC runway needed to build a profitable unit economics model.")]),
      bullet([run("Autonomous AI agent system: ", { bold: true }), run("16 specialized agents replace significant human labor in sales, delivery, and operations. Self-generating lead acquisition.")]),
      bullet([run("All-in-one positioning: ", { bold: true }), run("Replaces 4–6 separate subscriptions, creating clear ROI justification and high switching costs.")]),
      bullet([run("Modern tech stack: ", { bold: true }), run("Next.js 16, React 19, Supabase, Netlify — latest stable versions, all cloud-native, all scalable.")]),
      bullet([run("Flat pricing model: ", { bold: true }), run("Eliminates per-user cost anxiety; favorable for growing teams; competitive at all team sizes.")]),
      spacer(100, 80),
      heading2("Weaknesses"),
      bullet([run("Early-stage brand recognition: ", { bold: true }), run("Limited public case studies, testimonials, and brand credibility compared to established players. Trust-building takes time in Indian SMB markets.")]),
      bullet([run("Single-founder / small team concentration risk: ", { bold: true }), run("The system is highly automated, but enterprise deals and escalations require human expertise. Scaling professional services capacity is a constraint.")]),
      bullet([run("Dependency on third-party APIs: ", { bold: true }), run("Meta WhatsApp API, Groq, Razorpay, and Supabase are all external dependencies. Policy changes or outages in any of these affect platform reliability.")]),
      bullet([run("Limited free tier / trial: ", { bold: true }), run("The onboarding page does not show a free trial option. Indian SMBs are accustomed to freemium models (Zoho, HubSpot). The absence of a free tier raises the initial commitment barrier.")]),
      spacer(100, 80),
      heading2("Opportunities"),
      bullet([run("59 million Indian MSMEs: ", { bold: true }), run("The total addressable market is enormous and digitally underserved. Even 0.1% penetration represents 59,000 subscribers.")]),
      bullet([run("Government digital push: ", { bold: true }), run("Digital India, Startup India, ONDC integration requirements, and SBI digital SME loans are all structural tailwinds pushing MSMEs toward digital tools.")]),
      bullet([run("WhatsApp Commerce expansion: ", { bold: true }), run("Meta is actively expanding WhatsApp Payments, Catalog Shopping, and Flows in India. Each new WhatsApp commerce feature creates a new LevitateOS use case.")]),
      bullet([run("International Indian diaspora markets: ", { bold: true }), run("UAE, Singapore, UK Indian business communities share the same WhatsApp-first communication culture and are underserved by India-context-aware tools.")]),
      bullet([run("Vertical SaaS expansion: ", { bold: true }), run("Healthcare, education, real estate, and hospitality verticals each represent billion-rupee SaaS opportunities with specialized needs.")]),
      bullet([run("Agency reseller network: ", { bold: true }), run("Thousands of Indian digital marketing agencies could white-label LevitateOS for their own clients, creating a distribution network at near-zero CAC.")]),
      spacer(100, 80),
      heading2("Threats"),
      bullet([run("Competitive response from incumbents: ", { bold: true }), run("Zoho, Freshworks, or LeadSquared could launch WhatsApp-native CRM tiers targeting the same price point. Their existing customer bases give them distribution advantages.")]),
      bullet([run("Meta API policy changes: ", { bold: true }), run("WhatsApp Business API pricing, access rules, or template approval processes can change without notice. Any restriction would directly impact the automation stack's effectiveness.")]),
      bullet([run("Indian regulatory evolution: ", { bold: true }), run("DPDP Act 2023 implementation details, TRAI regulations on business messaging, and future data localization requirements could add compliance complexity.")]),
      bullet([run("AI commodity risk: ", { bold: true }), run("As AI inference becomes cheaper and more accessible, competitors can build similar autonomous agent systems. The moat must come from data, brand, and integrations, not AI access alone.")]),
      bullet([run("SMB churn patterns: ", { bold: true }), run("Indian SMBs have high business failure rates (70%+ failure within 3 years). Subscriber churn due to business closure, not product dissatisfaction, is a structural market risk.")]),

      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════
      // SECTION 17 — ROADMAP & CONCLUSION
      // ════════════════════════════════════════════════════════
      sectionBanner("17  Roadmap & Conclusion", "Where LevitateOS is going and why it will get there"),
      spacer(160, 80),
      heading2("24-Month Product Roadmap"),
      fourColTable([
        ["Q2 2026 (Now)", "LevitateOS v2.0 live", "All 16 agents operational, 4 pricing tiers, full dashboard, WhatsApp + email automation"],
        ["Q3 2026", "AI Research Engine v2", "Enhanced business intelligence, competitor tracking, legal document generation"],
        ["Q3 2026", "Mobile App (Android)", "LevitateOS on mobile — lead alerts, quick reply, pipeline on the go"],
        ["Q4 2026", "LevitateOS for Restaurants", "First vertical-specific product with reservation management and WhatsApp ordering"],
        ["Q4 2026", "Referral Program Launch", "Systematic word-of-mouth acquisition; 1 free month per successful referral"],
        ["Q1 2027", "Agency Reseller Program", "White-label LevitateOS for digital agencies; revenue share model"],
        ["Q1 2027", "LevitateOS for Clinics", "Appointment booking, patient reminders, prescription follow-up automation"],
        ["Q2 2027", "Maharashtra Expansion", "Geographic BizDev Agent expansion; Mumbai, Pune, Nashik, Thane targets"],
        ["Q2 2027", "API Access (Beta)", "Third-party developers can read/write CRM data and trigger specific agents"],
        ["Q3 2027", "LevitateOS for Education", "Student enrollment CRM, fee automation, batch management, exam notifications"],
        ["Q4 2027", "International Markets", "UAE and Singapore Indian diaspora business market onboarding"],
        ["Q4 2027", "Agent Marketplace (Beta)", "Third-party agent plugins; community-built automations for niche workflows"],
      ], ["Timeline", "Milestone", "Description"],
      [DXA(1.2), DXA(1.8), DXA(3.5)]),
      spacer(120, 80),

      heading2("Conclusion"),
      para("Levitate Labs occupies a genuinely differentiated position in the Indian SMB technology market. LevitateOS is not a CRM, not a marketing tool, and not a WhatsApp automation platform in isolation — it is a complete, autonomous business operating system built for the specific realities of Indian service businesses: WhatsApp-first communication, INR pricing sensitivity, minimal setup tolerance, and the need to generate results within days, not months."),
      spacer(80, 60),
      para("The market environment could not be more favorable. The global CRM market is worth $73–90 billion (2025) and growing at 14.6% CAGR. The marketing automation market is worth $47 billion and growing at 11.5%. India's MSME sector has 59.3 million registered businesses, only 13% of which use digital marketing. India's SaaS market is growing at 30% CAGR toward a $100 billion target by 2035. WhatsApp has 550 million Indian users and 78% SMB adoption. The structural tailwinds are overwhelmingly positive."),
      spacer(80, 60),
      para("The technical architecture — analyzed directly from the repository — is modern, scalable, and strategically sound. The zero-cost infrastructure model creates extraordinary unit economics. The 16-agent autonomous system creates defensibility through proprietary operational logic. The flat INR pricing model creates accessibility that Western competitors cannot match without restructuring their entire business models."),
      spacer(80, 60),
      para("The path to scale is clear: local depth in Gujarat, geographic expansion across India, vertical SaaS specialization, and ultimately a platform ecosystem with an agent marketplace and international reach. Each phase builds on the previous, leveraging the accumulated data, case studies, brand credibility, and agent performance improvements that compound over time."),
      spacer(80, 60),
      callout(
        "Final Assessment",
        "LevitateOS is positioned at the intersection of four massive tailwinds: the Indian SMB digital adoption wave, the WhatsApp commerce explosion, the AI automation revolution, and the SaaS pricing democratization trend. Built with modern technology at zero fixed cost, capable of autonomous client acquisition and delivery, and priced for the exact market it serves — LevitateOS has the architecture, the market timing, and the strategic differentiation to build a significant, durable business in the Indian digital economy.",
        C.ELECTRIC
      ),
      spacer(160, 80),
      hr(C.BORDER, 4),
      spacer(120, 80),

      heading2("Sources & References"),
      para("The following sources were consulted in the preparation of this report:"),
      spacer(60, 40),
      ...[
        "Grand View Research — Customer Relationship Management Market Report (2025–2030)",
        "Precedence Research — Customer Relationship Management Market Size (2026–2035)",
        "Fortune Business Insights — CRM Market Analysis (2025–2032)",
        "MarketsandMarkets — Marketing Automation Market Report (July 2025)",
        "Mordor Intelligence — Marketing Automation Software Market (2025–2031)",
        "Market Research Future — CRM Software Market (2025–2035)",
        "ResearchAndMarkets — CRM Software: A Global Market Overview (August 2025)",
        "Technavio — CRM Market Industry Analysis (2024–2029)",
        "Statista — CRM Software Worldwide Revenue Outlook (2025–2030)",
        "Kixie Research — CRM Statistics and Market Insights for 2025 (February 2026)",
        "Meta Business Reports 2025–2026 — WhatsApp Business Usage Statistics",
        "IAMAI Digital India Report 2026 — Indian SMB WhatsApp Adoption",
        "Infobip — Messaging Trends Report 2026",
        "WAPIkit — Global WhatsApp Business Statistics 2025 (September 2025)",
        "Gallabox — WhatsApp Business Statistics (June 2025)",
        "Hyperleap AI — WhatsApp Statistics India 2026 (January 2026)",
        "WABB India — WhatsApp Automation for Business in India 2026",
        "DataIntelo — WhatsApp Business API Platform Market Research Report 2034",
        "D7 Networks — 60 WhatsApp Business Statistics 2026",
        "SaaSBoomi / 1Lattice — Indian SaaS Market Report (January 2026, Business Standard)",
        "Ken Research — India SMB Digital Transformation (December 2025)",
        "Vi Business / MSME Growth Insights Study 2025",
        "SIDBI MSME Survey 2025",
        "YourStory — Digital Transformation in MSMEs: Adoption, Gaps, and What's Next (May 2025)",
        "Red Fort Capital — Top 5 MSME Growth Sectors India 2026",
        "SAMEEEKSHA — MSME Digital Intelligence (January 2026)",
        "Deep Market Insights — India Lead Generation Software Market Report (2026–2034)",
        "360iResearch — Lead Generation Software Market (2025–2032)",
        "HTF Market Insights — Lead Generation Software Market (2019–2030)",
        "Zoho Corporation — CRM Pricing and Competitor Comparisons (2024–2025)",
        "Zovett — Zoho CRM vs Salesforce 2025 (March 2026)",
        "Groweon — Top 10 CRM Software in India (January 2026)",
        "Sheetify CRM — Best CRM for Startups in India (February 2026)",
        "GitHub — push04/LEVITATE Repository (NEW_README.MD, master build guide, SQL schemas)",
        "Levitate Labs — levitatelabs.online/onboard (Onboarding page, April 2026)",
      ].map(s => bullet(s)),
      spacer(200, 80),
      para("END OF DOCUMENT", { center: true, color: C.SLATE }),
      para("LevitateOS Platform Documentation & Market Intelligence Report — Version 2.0", { center: true, color: C.SLATE }),
      para("© 2025–2026 Levitate Labs. All rights reserved. Confidential — Internal Use Only.", { center: true, color: C.SLATE }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync('outputs', { recursive: true });
  fs.writeFileSync('outputs/LevitateOS_Platform_Documentation_Report.docx', buf);
  console.log('Done — outputs/LevitateOS_Platform_Documentation_Report.docx written.');
});
