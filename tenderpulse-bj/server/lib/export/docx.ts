import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } from "docx";
import type { Tender } from "../store.js";

export async function tendersToDocx(tenders: Tender[], title = "Tender List"): Promise<Buffer> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Title", "Organization", "District", "Category", "Deadline", "Reference No"].map(
      (text) =>
        new TableCell({
          shading: { fill: "EFEFEF" },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        })
    ),
  });

  const rows = tenders.map(
    (t) =>
      new TableRow({
        children: [
          t.title,
          t.organization || "",
          t.district || "",
          t.category || "",
          t.bid_submission_deadline || "",
          t.external_ref,
        ].map((text) => new TableCell({ children: [new Paragraph(String(text ?? ""))] })),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `${tenders.length} tenders · generated ${new Date().toLocaleString()}` }),
          new Paragraph({ text: "" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
