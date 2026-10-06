import React from "react";
import { staticFile } from "remotion";
import {
  DateCard,
  DocumentaryFrame,
  DocumentViewer,
  EvidenceBoard,
  LocationCard,
  LowerThird,
  MapPlaceholder,
  PhotoFrame,
  QuoteCard,
  SectionTitle,
  SourceCitation,
  Timeline,
} from "../primitives";

/**
 * One short composition per primitive, for visual review in Studio.
 * Sample content is generic placeholder text — no real people or cases.
 */
const cite = [
  { title: "Sample Record (placeholder)", publisher: "Example Archive" },
];

export const GALLERY: {
  id: string;
  durationInFrames: number;
  element: React.ReactNode;
}[] = [
  {
    id: "DateCard",
    durationInFrames: 90,
    element: (
      <DateCard
        date="c. 1952"
        caption="Approximate date — sources give only the year"
      />
    ),
  },
  {
    id: "SectionTitle",
    durationInFrames: 90,
    element: <SectionTitle kicker="Part two" title="The Investigation" />,
  },
  {
    id: "LocationCard",
    durationInFrames: 90,
    element: <LocationCard name="County Courthouse" detail="Sample location" />,
  },
  {
    id: "LowerThird",
    durationInFrames: 90,
    element: (
      <LowerThird
        name="Sample Name"
        role="Witness · testified at trial"
        top={760}
      />
    ),
  },
  {
    id: "DocumentViewer",
    durationInFrames: 150,
    element: (
      <DocumentViewer
        heading="SAMPLE RECORD 00-000"
        subheading="Example Agency · placeholder"
        textureSrc={staticFile("fixtures/paper-texture.svg")}
        lines={[
          {
            text: "A line of typeset excerpt text from a record.",
            strike: false,
          },
          {
            text: "The key passage is highlighted, never paraphrased.",
            highlight: true,
          },
          {
            text: "A contradicted claim appears struck.",
            strike: true,
            marginNote: "Online claim · contradicted",
          },
        ]}
      />
    ),
  },
  {
    id: "PhotoFrame",
    durationInFrames: 120,
    element: (
      <PhotoFrame
        src={staticFile("fixtures/office-illustration.svg")}
        label="ILLUSTRATION"
      />
    ),
  },
  {
    id: "EvidenceBoard",
    durationInFrames: 120,
    element: (
      <EvidenceBoard
        cards={[
          {
            attribution: "Prosecution · argued",
            text: "Statement one, attributed.",
            source: "Example Court",
          },
          {
            attribution: "Defense · argued",
            text: "Statement two, attributed.",
            source: "Example Court",
          },
        ]}
      />
    ),
  },
  {
    id: "Timeline",
    durationInFrames: 120,
    element: (
      <Timeline
        title="TIMELINE"
        gaps={[{ fromId: "b", toId: "c" }]}
        items={[
          {
            id: "a",
            label: "Exact date",
            dateLabel: "March 3, 1950",
            precision: "EXACT",
          },
          {
            id: "b",
            label: "Approximate",
            dateLabel: "c. 1951",
            precision: "APPROXIMATE",
            emphasis: true,
          },
          {
            id: "c",
            label: "Date range",
            dateLabel: "1952 – 1953",
            precision: "RANGE",
          },
          {
            id: "d",
            label: "Unknown date",
            dateLabel: "Date unknown",
            precision: "UNKNOWN",
          },
        ]}
      />
    ),
  },
  {
    id: "MapPlaceholder",
    durationInFrames: 120,
    element: (
      <MapPlaceholder
        markers={[
          { label: "Place A", x: 0.3, y: 0.4 },
          { label: "Place B", x: 0.7, y: 0.65 },
        ]}
      />
    ),
  },
  {
    id: "QuoteCard",
    durationInFrames: 120,
    element: (
      <QuoteCard
        quote="A verbatim line from a verified source."
        speaker="Sample Speaker"
        context="sample context"
      />
    ),
  },
  {
    id: "SourceCitation",
    durationInFrames: 90,
    element: <SourceCitation sources={cite} />,
  },
];

export const GalleryItem: React.FC<{ index: number }> = ({ index }) => (
  <DocumentaryFrame>{GALLERY[index].element}</DocumentaryFrame>
);
