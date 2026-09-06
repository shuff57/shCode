'use client';

// The real ReshapeStudio component moved to reshape-cad's packages/studio
// (B1 extraction, plan: freecad-browser.md), along with the rest of
// components/model/*, components/ReshapeParamsPanel.tsx and
// lib/format-number.ts/mesh-export.ts/camera-fit.ts -- none of which had any
// importer left outside that set once ReshapeStudio itself moved.
//
// TWO PIECES DID NOT MOVE, deliberately: CodeEditor (shared with
// LessonWorkspace and SandboxWorkspace well beyond reSHape) and
// ReshapePreview (wraps the sandboxed script-runner iframe, itself
// dependent on MoshionPreview.tsx's `encodeCode` -- also outside reSHape,
// and used directly by ReshapeScriptPreview.tsx on the /docs/moshion
// sandbox too). Dragging either into the package would mean the package
// either duplicates shCode's lesson-sandbox chrome or reaches back into
// shCode for it -- neither is right for a package meant to stand on its
// own -- so instead the package's ReshapeStudio takes them as props, and
// this wrapper is what supplies shCode's own copies. This is the one design
// decision from the extraction I was least sure about; see the B1 report.
//
// Everything else about this file is exactly what it says on the tin: a
// thin re-export, so `components/reshape/ReshapeStudio.tsx` stays the import
// path LessonWorkspace.tsx and SandboxWorkspace.tsx already use and no
// lesson's `preview: "reshape"` wiring has to change.

import type { FC } from 'react';
import { ReshapeStudio as PackageReshapeStudio, type ReshapeStudioProps } from '@shuff57/reshape-studio';
import CodeEditor from '../CodeEditor';
import ReshapePreview from '../ReshapePreview';

type Props = Pick<
  ReshapeStudioProps,
  'value' | 'onChange' | 'sides' | 'startSide' | 'onDocChange' | 'onSideChange' | 'toolbarExtra' | 'autoRunOnMount' | 'lessonId'
>;

const ReshapeStudio: FC<Props> = (props) => (
  <PackageReshapeStudio {...props} CodeEditor={CodeEditor} ReshapePreview={ReshapePreview} />
);

export default ReshapeStudio;
