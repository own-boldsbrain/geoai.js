import { geoai } from "geoai";

export const  getOptimumZoom = (task: string): number | null => {
// Try to read optimum zoom from the model registry exposed by `geoai`
    try {
      const models = geoai.models();
      const model = models.find((m: any) => m.task === task);
      if (model && (model as any).zoomCompatibility) {
        const vals = Object.values((model as any).zoomCompatibility);
        if (vals && vals.length > 0 && typeof vals[0] === "number") {
          return vals[0] as number;
        }
      }
    } catch (err) {
      console.warn("Failed to get optimum zoom from model registry, falling back to default zoom");
    }
    return null;
}