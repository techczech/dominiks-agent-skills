# Label Taxonomy

Direct quote from the OpenAI Privacy Filter PDF model card (page 11, section 6.1 "Label Taxonomy"):

> The available labels shipped with the model (prior to any customer fine-tuning) are listed below with short descriptions of their coverage.
>
> - **`private_person`**: The name of a private person, including usernames and handles that identify a specific person.
> - **`account_number`**: A credit card number, bank account number, or other account identifier.
> - **`private_url`**: A web URL or IP address that is meant for a private audience or identifies a private person.
> - **`private_email`**: An email address used for personal communication or that identifies a private person.
> - **`private_phone`**: A phone number associated with a private person.
> - **`private_address`**: A specific location or address associated with a private person.
> - **`secret`**: An API key, password, or other credential.
> - **`private_date`**: The date of birth, birth year, or other datetime that identifies a private person.
>
> These labels are broad categories and are intended to cover attributes that identify real people. As such, placeholders are not intended to be classified. For example, the `secret` class does not include example API keys or placeholder values.

## What the taxonomy includes via mapping

The model card's evaluation maps several public-dataset labels onto the eight categories. The mapping (PII-Masking-300k → Privacy Filter, PDF page 12):

- `account, banknum, bic, creditcard, cryptoaddress, docnum, driverlicense, iban, idcard, passport, socialnumber, taxnum` → `account_number`
- `bankmunicip, bankpostcode, bankstreet, building, city, geocoord, postcode, secaddress, street` → `private_address`
- `cardexpiry, date, dob` → `private_date`
- `email` → `private_email`
- `givenname1, givenname2, lastname1, lastname2, lastname3, title, username` → `private_person`
- `tel` → `private_phone`
- `ip` → `private_url`
- `otp, pass, pin` → `secret`

This mapping makes explicit that **passports, driver's licenses, social security numbers, and IBANs all fall under `account_number`** in the released model.

## What the taxonomy does NOT include

By design, the released model does **not** classify:

- Public-figure names (these are people, but not "private persons" in the trained sense)
- Organisation names, company names, government body names
- Generic dates that do not identify a private person (e.g. "the meeting is on 15 May 2026")
- Public-facing URLs or IP addresses that do not identify a person
- Health information, biometric data (these are not in the eight categories)
- Geographic regions broader than a specific address (a bare city or country name)
- Internal organisational identifiers, project codenames, or domain-specific category labels

For categories outside this taxonomy, fine-tuning is the recommended path. See section 7.4.2 "Fine-tuning Efficiency" of the model card for evidence that 10% of a target dataset is enough to drive task-specific F1 above 0.96 on the SPY dataset.
