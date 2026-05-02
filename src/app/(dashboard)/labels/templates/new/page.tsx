import { Suspense } from "react";
import { TemplateDesigner } from "./template-designer";

export default function NewLabelTemplatePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading designer…
        </div>
      }
    >
      <TemplateDesigner />
    </Suspense>
  );
}
