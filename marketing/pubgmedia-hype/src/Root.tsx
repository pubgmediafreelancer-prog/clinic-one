import React from "react";
import { Composition } from "remotion";
import { Hype } from "./Hype";
import { FPS, TOTAL } from "./lib";

const FORMATS = [
  { id: "9x16", width: 1080, height: 1920 },
  { id: "1x1", width: 1080, height: 1080 },
  { id: "16x9", width: 1920, height: 1080 },
];

export const RemotionRoot: React.FC = () => (
  <>
    {(["en", "ar"] as const).flatMap((lang) =>
      FORMATS.map((fmt) => (
        <Composition
          key={`${lang}-${fmt.id}`}
          id={`Hype-${lang.toUpperCase()}-${fmt.id}`}
          component={Hype}
          durationInFrames={TOTAL}
          fps={FPS}
          width={fmt.width}
          height={fmt.height}
          defaultProps={{ lang }}
        />
      )),
    )}
  </>
);
