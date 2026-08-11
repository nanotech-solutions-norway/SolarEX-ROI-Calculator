# Security Policy

## Supported scope

Security fixes are applied to the current default branch and actively maintained release branches.

## Reporting a vulnerability

Do not disclose vulnerabilities, credentials, tokens, private keys, customer data, internal endpoints, or other sensitive evidence in a public GitHub issue, pull request, discussion, workflow log, artifact, or release.

Use GitHub private vulnerability reporting when it is enabled. Otherwise report the issue through an established private NanoTech Solutions Norway AS contact channel. Include the affected repository/path or commit, impact, reproduction steps that do not expose secrets, and any containment already performed.

## Response principles

1. Contain affected workflows, deployments, credentials, or integrations.
2. Revoke and rotate potentially exposed credentials outside the repository.
3. Preserve redacted evidence and relevant commit/workflow identifiers.
4. Remediate code and repository history where required.
5. Validate security controls before restoring service.
6. Coordinate disclosure only after remediation and approval.

## Repository security requirements

- Never commit secret values, private keys, production credentials, customer-confidential files, bank/accounting exports, or sensitive personal data.
- Security-sensitive changes must use a pull request and required checks.
- GitHub Actions must use minimum permissions and external actions pinned to full commit SHAs.
- Changes to `.github/**`, deployment configuration, access controls, or this policy require explicit security review.
