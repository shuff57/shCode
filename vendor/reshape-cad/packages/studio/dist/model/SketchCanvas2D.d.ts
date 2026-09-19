import type { ModelDoc, SketchFeature } from '@shuff57/reshape-script/model-types';
interface Props {
    sketch: SketchFeature;
    doc: ModelDoc;
    onChange: (next: ModelDoc) => void;
    onExit?: () => void;
}
export default function SketchCanvas2D({ sketch, doc, onChange, onExit }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SketchCanvas2D.d.ts.map