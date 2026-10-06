import React from "react";
import { Composition, Folder } from "remotion";
import { syntheticTernRiverPayroll } from "../../fixtures/cases/synthetic-tern-river-payroll";
import { RENDER_DEFAULTS } from "../domain";
import {
  calculateCaseVideoMetadata,
  CaseVideo,
  type CaseVideoProps,
} from "./compositions/CaseVideo";
import { GALLERY, GalleryItem } from "./compositions/PrimitivesGallery";

const { width, height, fps } = RENDER_DEFAULTS;

export const RemotionRoot: React.FC = () => (
  <>
    {/* Renders any validated case workspace; timing comes from its manifest. */}
    <Composition
      id="FixturePreview"
      component={CaseVideo}
      width={width}
      height={height}
      fps={fps}
      durationInFrames={1}
      defaultProps={
        {
          workspace: syntheticTernRiverPayroll,
          showCaptions: true,
        } satisfies CaseVideoProps
      }
      calculateMetadata={calculateCaseVideoMetadata}
    />
    <Folder name="Primitives">
      {GALLERY.map((item, index) => (
        <Composition
          key={item.id}
          id={`Primitive-${item.id}`}
          component={GalleryItem}
          width={width}
          height={height}
          fps={fps}
          durationInFrames={item.durationInFrames}
          defaultProps={{ index }}
        />
      ))}
    </Folder>
  </>
);
