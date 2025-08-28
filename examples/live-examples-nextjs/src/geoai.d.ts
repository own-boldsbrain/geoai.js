declare module 'geoai' {
  // Provider configuration types
  export interface ProviderParams {
    provider: string;
    [key: string]: any;
  }

  export interface GeobaseParams extends ProviderParams {
    provider: 'geobase';
    projectRef: string;
    apikey: string;
    cogImagery?: string;
  }

  export interface ESRIProviderParams extends ProviderParams {
    provider: 'esri';
    serviceUrl?: string;
    serviceName?: string;
    tileSize?: number;
    attribution?: string;
  }

  export interface MapboxProviderParams extends ProviderParams {
    provider: 'mapbox';
    apiKey: string;
    style?: string;
  }

  // Inference parameters
  export interface InferenceParams {
    inputs: any;
    postProcessingParams?: any;
    mapSourceParams?: any;
    [key: string]: any;
  }

  // Task configuration
  export interface TaskConfig {
    task: string;
    modelId?: string;
    modelParams?: any;
  }

  // Pipeline interface
  export interface Pipeline {
    inference(params: InferenceParams): Promise<any>;
    getImageEmbeddings?(params: InferenceParams): Promise<any>;
  }

  // Main geoai object
  export const geoai: {
    pipeline(tasks: TaskConfig[], providerParams: ProviderParams): Promise<Pipeline>;
  };

  // Export individual types
  export type { ProviderParams, GeobaseParams, ESRIProviderParams, MapboxProviderParams, InferenceParams, TaskConfig, Pipeline };
}
