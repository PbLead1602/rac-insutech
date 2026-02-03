const SibApiV3Sdk = require("@getbrevo/brevo");

// Initialize the API Client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Set the API Key globally for this instance
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.EMAIL_PASS; 

module.exports = apiInstance;