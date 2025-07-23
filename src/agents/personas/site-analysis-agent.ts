import { GeoAIAgent } from "../core/base-agent";
import { AgentConfig, AgentContext } from "../core/types";

export class SiteAnalysisAgent extends GeoAIAgent {
  constructor() {
    const config: AgentConfig = {
      name: "site-analysis-agent",
      description:
        "Analyzes a site to determine what features are present and provides development recommendations",
      objective: "Provide comprehensive site analysis with actionable insights",
      workflow: [
        {
          id: "initial-scan",
          name: "Initial Site Reconnaissance",
          type: "model",
          task: "zero-shot-object-detection",
          description:
            "Scan site for basic features: buildings, vegetation, water, roads",
          required: true,
        },
        {
          id: "has-features-decision",
          name: "Check if features detected",
          type: "decision",
          description: "Determine if significant features were found",
          condition: context => {
            const scanResult = context.findings.get("initial-scan");
            return scanResult?.detections?.features?.length > 0;
          },
          ifTrue: "detailed-analysis",
          ifFalse: "land-cover-only",
        },
        {
          id: "detailed-analysis",
          name: "Detailed Feature Analysis",
          type: "model",
          task: "building-footprint-segmentation",
          description: "Detailed analysis of detected features",
          required: false,
        },
        {
          id: "land-cover-only",
          name: "Land Cover Analysis",
          type: "model",
          task: "land-cover-classification",
          description:
            "Classify land cover types when no major features detected",
          required: false,
        },
      ],
      defaultConstraints: [],
      timeout: 60000, // 60 seconds
    };

    super(config);
  }

  /**
   * Generate site-specific summary
   */
  protected async generateSummary(
    context: AgentContext,
    _results: any[]
  ): Promise<string> {
    const initialScan = context.findings.get("initial-scan");
    const detectedFeatures = initialScan?.detections?.features?.length || 0;

    if (detectedFeatures === 0) {
      return "Site appears to be undeveloped land with minimal existing infrastructure.";
    }

    return `Site analysis identified ${detectedFeatures} significant features requiring consideration for development planning.`;
  }

  /**
   * Calculate confidence based on data quality and model results
   */
  protected calculateConfidence(context: AgentContext, results: any[]): number {
    // Factor in multiple confidence sources
    let totalConfidence = 0;
    let confidenceFactors = 0;

    // Model result confidence
    results.forEach(result => {
      if (result?.detections?.features) {
        // Average confidence of detected features
        const features = result.detections.features;
        if (features.length > 0) {
          const avgConfidence =
            features.reduce(
              (sum: number, feature: any) =>
                sum + (feature.properties?.confidence || 0.5),
              0
            ) / features.length;
          totalConfidence += avgConfidence;
          confidenceFactors++;
        }
      }
    });

    // Decision confidence
    context.decisions.forEach(decision => {
      totalConfidence += decision.confidence;
      confidenceFactors++;
    });

    return confidenceFactors > 0 ? totalConfidence / confidenceFactors : 0.5;
  }

  /**
   * Extract site-specific findings
   */
  protected extractFindings(results: any[]): any[] {
    const findings: any[] = [];

    results.forEach((result, index) => {
      if (result?.detections?.features) {
        result.detections.features.forEach(
          (feature: any, featureIndex: number) => {
            findings.push({
              type: feature.properties?.label || "detected-feature",
              description: `${feature.properties?.label || "Feature"} detected with ${Math.round((feature.properties?.confidence || 0.5) * 100)}% confidence`,
              confidence: feature.properties?.confidence || 0.5,
              location: feature,
              metadata: {
                stepIndex: index,
                featureIndex,
                area: feature.properties?.area,
                bbox: feature.bbox,
              },
            });
          }
        );
      }
    });

    return findings;
  }

  /**
   * Generate site-specific recommendations
   */
  protected async generateRecommendations(
    context: AgentContext,
    _results: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    const initialScan = context.findings.get("initial-scan");
    const detectedFeatures = initialScan?.detections?.features || [];

    // Basic recommendations based on findings
    if (detectedFeatures.length === 0) {
      recommendations.push("Site appears suitable for new development");
      recommendations.push(
        "Consider conducting soil analysis before construction"
      );
      recommendations.push("Verify utility access and zoning requirements");
    } else {
      recommendations.push(
        "Existing features detected - review for preservation requirements"
      );
      recommendations.push("Consider impact assessment for any modifications");

      // Feature-specific recommendations
      const featureTypes = detectedFeatures
        .map((f: any) => f.properties?.label)
        .filter(Boolean);

      if (featureTypes.includes("building")) {
        recommendations.push(
          "Existing buildings found - verify structural condition and permits"
        );
      }

      if (featureTypes.includes("vegetation")) {
        recommendations.push(
          "Vegetation present - check for protected species or conservation requirements"
        );
      }

      if (featureTypes.includes("water")) {
        recommendations.push(
          "Water features detected - consider wetland regulations and drainage impact"
        );
      }
    }

    // Add constraint-based recommendations
    context.constraints.forEach(constraint => {
      if (constraint.includes("budget")) {
        recommendations.push(
          "Consider cost implications of site modifications"
        );
      }
      if (constraint.includes("wetland")) {
        recommendations.push("Conduct detailed wetland delineation study");
      }
    });

    return recommendations;
  }
}
