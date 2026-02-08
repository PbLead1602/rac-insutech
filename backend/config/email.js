const SibApiV3Sdk = require("@getbrevo/brevo");

// Create transactional email API instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Set API Key
const apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.EMAIL_PASS;

module.exports = apiInstance;
