Better Forms
Should:
- Use Shadcn ui
- Have a form builder that has virtually every field google forms have
    - Short answer
    - Paragraph
    - Multiple choice
    - Checkboxes
    - Dropdown
    - File upload…?(think)
    - Linear Scale
    - Rating
    - Multiple choice grid
    - Checkbox grid
    - Date
    - Time
- Have an account that can make different forms and view form responses
    - Account can view forms in a Google forms fashion
    - Account can view forms as a spreadsheet 
    - Account can export form data as a csv
    - Generic copy/paste code for forms built
    - Have a QR code of the form readily available (literally a lucide icon already out there)
    - Account can sign out other accounts.


- Form data is encrypted, no data is stored in plaintext

- Session token and everything important should be hashed
Postgres DB Layout
- Account
    - Account UUID
    - Email
    - Password
    - 2FA google authenticator thing
    - Forms [Forms]

- Forms
    - UUID
    - Name
    - Telemetry
    - IPAddress
    - ResponsesPerIp
    - ResponsesPerEmail
    - Values.json
    - Response [Responses]
    
    
<!-- (bunch of json files) -->
- Responses 
    - UUID
    - Data
		{
			“Name”: “David”
			“Age”: “51980394059”
			“Phone number”: “678-678-6789”
			“Email”: “Davids@email.com”
			“Comments”: “yeeeee”
			“telemetry”: “192.168.0.2”
		}
