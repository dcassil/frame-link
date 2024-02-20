module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleDirectories: ["node_modules"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};
