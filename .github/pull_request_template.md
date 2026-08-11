## Change summary

### Scope and risk
- [ ] Scope and affected systems are identified.
- [ ] Security, privacy, data-classification, and deployment impact have been assessed.
- [ ] No secrets, credentials, private keys, customer-confidential files, bank/accounting exports, or sensitive personal data are included.

### Validation
- [ ] Relevant tests and required checks pass.
- [ ] Rollback or recovery path is documented where applicable.
- [ ] GitHub Actions use minimum permissions and external actions are pinned to full commit SHAs.
- [ ] No `pull_request_target` or persisted checkout credentials are introduced without an approved exception.
- [ ] Dependency/security alerts introduced by this change have been reviewed.

### Governance and evidence
- [ ] CODEOWNERS/security review requirements are satisfied where available.
- [ ] Manual GitHub settings or external dependencies still required are listed as `PENDING_REVIEW`.
- [ ] Evidence and validation results are recorded without secret values.
