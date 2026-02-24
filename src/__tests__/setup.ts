import "@testing-library/jest-dom";

// Handle unhandled promise rejections in tests to prevent crashes
// This allows tests that verify destroy() behavior to run properly
process.on("unhandledRejection", (reason: unknown) => {
  if (reason instanceof Error && reason.message === "FrameLink destroyed") {
    return;
  }
  throw reason;
});
