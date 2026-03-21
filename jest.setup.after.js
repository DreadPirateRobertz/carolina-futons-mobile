// Configure @testing-library/react-native globals.
// Must run in setupFilesAfterEnv so RNTL is fully initialized.
const { configure } = require('@testing-library/react-native');

// Increase waitFor / findBy* timeout to accommodate parallel test execution.
// Default 1000ms is too short when multiple Jest workers share CPU resources.
configure({ asyncUtilTimeout: 5000 });
