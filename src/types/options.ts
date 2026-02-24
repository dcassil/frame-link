/**
 * Configuration options for creating a FrameLink instance.
 */
export interface FrameLinkOptions {
  /**
   * The origin of the target window.
   * Use a specific origin like "https://example.com" for security.
   * Use "*" only when you explicitly accept messages from any origin.
   */
  targetOrigin: string;

  /**
   * Timeout in milliseconds for request/response operations.
   * @default 5000
   */
  timeout?: number;
}
