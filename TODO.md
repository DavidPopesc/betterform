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
- Form data is encrypted, no data is stored in plaintext
- 

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
    - Values
		{
			[{“Name”: “string”}, {“required”
			“Age”: “date”
			“Phone number”: “phone-number”
			“Email”: “email”
			“Comments”: “longtext”
		}

    - Responses
		{
			“Name”: “David”
			“Age”: “51980394059”
			“Phone number”: “678-678-6789”
			“Email”: “Davids@email.com”
			“Comments”: “yeeeee”
			“telemetry”: “192.168.0.2”
		}
