/**
 * GPU detection and performance optimization utilities
 */

export interface GPUInfo {
  hasWebGPU: boolean;
  isHighPerformance: boolean;
  renderer?: string;
  maxTextureSize?: number;
}

/**
 * Detects GPU capabilities and returns performance information
 * @returns Promise<GPUInfo> - GPU information including WebGPU support and performance level
 */
export async function detectGPU(): Promise<GPUInfo> {
  const gpuInfo: GPUInfo = {
    hasWebGPU: false,
    isHighPerformance: false,
  };

  try {
    // Check for WebGPU support first (highest performance)
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          gpuInfo.hasWebGPU = true;
          gpuInfo.isHighPerformance = true;
          console.log('WebGPU detected, using high-performance rendering');
          return gpuInfo;
        }
      } catch (error) {
        console.log('WebGPU not available, falling back to WebGL detection');
      }
    }

    // Fall back to WebGL detection
    const webglInfo = detectWebGL();
    gpuInfo.hasWebGPU = false;
    gpuInfo.isHighPerformance = webglInfo.isHighPerformance;
    gpuInfo.renderer = webglInfo.renderer;
    gpuInfo.maxTextureSize = webglInfo.maxTextureSize;

    return gpuInfo;
  } catch (error) {
    console.warn('GPU detection failed, using conservative settings:', error);
    return {
      hasWebGPU: false,
      isHighPerformance: false,
    };
  }
}

/**
 * Detects WebGL capabilities and performance
 * @returns WebGL information including performance level and renderer details
 */
function detectWebGL(): {
  isHighPerformance: boolean;
  renderer?: string;
  maxTextureSize?: number;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    if (!gl) {
      return { isHighPerformance: false };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      // Check for high-performance GPUs
      const highPerfGPUs = [
        'nvidia', 'radeon', 'geforce', 'rtx', 'gtx', 'rx', 'amd'
      ];
      const isHighPerformance = highPerfGPUs.some(gpu => renderer.toLowerCase().includes(gpu));
      
      return {
        isHighPerformance,
        renderer,
        maxTextureSize,
      };
    } else {
      // Fallback: check for hardware acceleration based on texture size
      const isHighPerformance = maxTextureSize > 4096;
      
      return {
        isHighPerformance,
        maxTextureSize,
      };
    }
  } catch (error) {
    console.warn('WebGL detection failed:', error);
    return { isHighPerformance: false };
  }
}




