# BetterForm API Documentation

BetterForm provides three distinct API endpoints for different use cases, with separate API keys for enhanced security:

- **Submission API Key**: Used for external form submissions and webhook signatures
- **Data Export API Key**: Used for fetching form responses

## 1. Form Submission API

Submit responses from external websites directly to your BetterForm forms.

### Endpoint
```
POST https://betterform.dev/api/submit/{publicId}
```

### Authentication
Include your **Submission API Key** in the Authorization header:
```
Authorization: Bearer {your-submission-api-key}
```

### Request Body
```json
{
  "responses": {
    "field_id_1": "value1",
    "field_id_2": "value2"
  }
}
```

### Response
```json
{
  "success": true,
  "responseId": "resp_..."
}
```

### Example
```javascript
fetch('https://betterform.dev/api/submit/{publicId}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer bf_sub_your_submission_key_here'
  },
  body: JSON.stringify({
    responses: {
      "field_name": "John Doe",
      "field_email": "john@example.com"
    }
  })
})
```

### Notes
- API submissions bypass email verification requirements
- API submissions bypass one-response-per-user restrictions
- API submissions are not tracked to form accounts (anonymous)

---

## 2. Webhook Notifications

Receive real-time notifications when someone submits a response to your form.

### Configuration
Set your webhook URL in the form's API settings. BetterForm will POST to this URL whenever a new response is submitted.

### Webhook Payload
```json
{
  "formId": "form_...",
  "responseId": "resp_...",
  "responses": {
    "field_id_1": "value1",
    "field_id_2": "value2"
  },
  "respondentEmail": "user@example.com",
  "submittedAt": "2026-02-19T21:00:00.000Z"
}
```

### Signature Verification
Each webhook request includes an `X-BetterForm-Signature` header containing an HMAC-SHA256 signature of the payload, signed with your **Submission API Key**.

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, submissionApiKey) {
  const expectedSignature = crypto
    .createHmac('sha256', submissionApiKey)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

### Example Webhook Handler (Node.js/Express)
```javascript
app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-betterform-signature'];
  const payload = req.body;
  
  if (!verifyWebhook(payload, signature, process.env.BETTERFORM_SUBMISSION_API_KEY)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the response
  console.log('New form response:', payload.responseId);
  console.log('Data:', payload.responses);
  
  res.status(200).send('OK');
});
```

---

## 3. Data Export API

Fetch all responses for a form in JSON format.

### Endpoint
```
GET https://betterform.dev/api/forms/data/{dataApiKey}
```

### Authentication
The **Data Export API Key** is included in the URL path.

### Rate Limiting
- Limited to 1 request per 5 seconds per form
- Rate limit headers are included in the response:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
  - `Retry-After`: Seconds until next request is allowed (429 responses only)

### Response
```json
{
  "formId": "form_...",
  "formName": "Contact Form",
  "totalResponses": 42,
  "responses": [
    {
      "id": "resp_...",
      "createdAt": "2026-02-19T21:00:00.000Z",
      "data": {
        "field_name": "John Doe",
        "field_email": "john@example.com"
      }
    }
  ]
}
```

### Example
```javascript
fetch('https://betterform.dev/api/forms/data/bf_data_your_data_key_here', {
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
})
  .then(res => {
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
      return;
    }
    return res.json();
  })
  .then(data => {
    console.log(`Total responses: ${data.totalResponses}`);
    data.responses.forEach(response => {
      console.log(response.id, response.data);
    });
  });
```

---

## API Key Management

### Generating API Keys
1. Go to your form's Settings tab
2. Enable "API Integration"
3. Two API keys will be automatically generated:
   - **Submission API Key** (starts with `bf_sub_`)
   - **Data Export API Key** (starts with `bf_data_`)

### Regenerating API Keys
Each API key has its own refresh button. Click the refresh icon next to the key you want to regenerate. 

**Warning:** Regenerating a key will invalidate the old key immediately.

### Why Separate Keys?

Separate API keys provide better security:
- **Submission Key**: Share with external services that need to submit data to your forms
- **Data Export Key**: Keep private for internal systems that need to read form responses

If a submission key is compromised, you can regenerate it without affecting your data export integrations, and vice versa.

### Security Best Practices
- Never commit API keys to version control
- Store API keys in environment variables
- Use separate keys for different purposes
- Rotate API keys periodically
- Verify webhook signatures to prevent spoofing
- Use HTTPS for all API requests
- Monitor API usage for suspicious activity
- Regenerate keys immediately if compromised

---

## Error Responses

### Common Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | `invalid_public_id` | The form public ID is missing or invalid |
| 400 | `invalid_response_data` | The response data format is incorrect |
| 400 | `missing_api_key` | API key not provided |
| 401 | `invalid_api_key` | API key is incorrect or expired |
| 403 | `api_disabled` | API access is disabled for this form |
| 403 | `form_closed` | Form is not accepting responses |
| 403 | `deadline_passed` | Response deadline has passed |
| 404 | `form_not_found` | Form does not exist |
| 429 | `rate_limited` | Too many requests, retry after the specified time |
| 500 | `server_error` | Internal server error |

### Example Error Response
```json
{
  "error": "rate_limited",
  "retryAfter": 3
}
```

---

## Support

For additional help or to report issues:
- Email: support@betterform.dev
- Documentation: https://betterform.dev/docs
