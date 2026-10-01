const appConfig = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ...appConfig.expo,
  extra: {
    ...config.extra,
    ...appConfig.expo.extra,
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
});
