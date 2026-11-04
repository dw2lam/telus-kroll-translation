import type { KrollBridge } from '../shared/api'

declare global {
  interface Window {
    kroll?: KrollBridge
  }
}
