# Label Taxonomy

The released `openai/privacy-filter` checkpoint predicts eight labels. This page states what each one covers in practice and where the boundaries sit, so you can predict the model's behaviour without reading the source document. For the vendor's own wording, see section 6.1 of the model card: <https://huggingface.co/openai/privacy-filter>.

## The eight labels

| Label | What it fires on |
|---|---|
| `private_person` | Personal names of non-public individuals, plus usernames and handles that pin down one specific person. |
| `account_number` | Any identifier that names an account or an official record — card numbers, bank accounts, and, through the training mapping, national IDs, passports, driving licences, tax numbers and IBANs. |
| `private_url` | URLs and IP addresses aimed at a private audience or traceable to one individual. |
| `private_email` | Email addresses used personally or attached to a named individual. |
| `private_phone` | Telephone numbers belonging to an individual. |
| `private_address` | A place specific enough to locate a person: street addresses, buildings, postcodes, coordinates. |
| `secret` | Live credentials — API keys, passwords, tokens, PINs, one-time codes. |
| `private_date` | Dates that identify someone, chiefly dates and years of birth. |

The label strings above are exactly what the model emits, and the skill's scripts key off them directly.

## Boundaries worth knowing before you rely on it

**Real people, not stand-ins.** The taxonomy is built around attributes that identify actual individuals, so obviously fake material is meant to pass through untouched: a documentation example key or a placeholder value should not be tagged `secret`. Expect leakage in both directions where a placeholder looks convincing.

**Official identifiers collapse into one bucket.** Because the training mapping folds passports, driving licences, social security numbers and IBANs into `account_number`, you cannot tell those document types apart from the label alone. If your downstream handling depends on the distinction, apply your own pattern checks to the span text.

**What the model is not looking for.** Public-figure names sit outside the definition of a private person. So do organisations, companies and government bodies; dates with no personal referent (a meeting date, a fiscal year); public URLs and infrastructure IPs; health and biometric details, which have no category at all; place names broader than an address, such as a bare city or country; and anything internal to your organisation — project codenames, team names, in-house record identifiers.

## If your categories fall outside the eight

Fine-tuning is the supported route, and it is cheaper than it sounds: the model card reports that training on a tenth of a target dataset was enough to push task-specific F1 above 0.96 on its out-of-domain medical/legal benchmark (see the fine-tuning efficiency results in section 7.4.2). Use the `opf train` command in the official repository — this skill does not expose a training entry point.
