import { plugin } from "bun";

// Mock resolver plugin for Bun
plugin({
  name: "mock-resolver",
  setup(build) {
    // Intercept imports and redirect to mocks
    build.onResolve({ filter: /^next\/navigation$/ }, () => {
      return { path: "./node_modules/next/navigation.mock.js" };
    });
    
    build.onResolve({ filter: /^next\/link$/ }, () => {
      return { path: "./node_modules/next/link.mock.js" };
    });
    
    build.onResolve({ filter: /^next\/font\/google$/ }, () => {
      return { path: "./node_modules/next/font/google.mock.js" };
    });
    
    build.onResolve({ filter: /^lucide-react$/ }, () => {
      return { path: "./node_modules/lucide-react.mock.js" };
    });
  }
});