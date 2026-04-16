export const POLICIES_BUCKET = "Policies"
export const POLICIES_MANAGE_PERMISSION = "policies.manage"
export const EMPLOYEE_HANDBOOK_FILE_PREFIX = "Employee Handbook"

export interface PolicyFileSummary {
  fileName: string
  displayName: string
}

export function stripPolicyFileExtension(fileName: string) {
  const trimmed = fileName.trim()
  const lastDotIndex = trimmed.lastIndexOf(".")
  if (lastDotIndex <= 0) {
    return trimmed
  }

  return trimmed.slice(0, lastDotIndex)
}

export function getPolicyFileExtension(fileName: string) {
  const trimmed = fileName.trim()
  const lastDotIndex = trimmed.lastIndexOf(".")
  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return ""
  }

  return trimmed.slice(lastDotIndex)
}

export function sanitizePolicyDisplayName(value: string) {
  return value
    .trim()
    .replace(/[\\/]/g, "")
    .replace(/\s+/g, " ")
}

export function buildPolicyFileName({
  displayName,
  extension,
}: {
  displayName: string
  extension: string
}) {
  const sanitized = sanitizePolicyDisplayName(displayName)
  const normalizedExtension = extension.trim()
  return `${sanitized}${normalizedExtension}`
}

export function isEmployeeHandbookPolicyFile(fileName: string) {
  return /^Employee Handbook \d{4}(\.[^.]+)?$/i.test(fileName.trim())
}

export function buildEmployeeHandbookPolicyFileName(
  year = new Date().getFullYear()
) {
  return `${EMPLOYEE_HANDBOOK_FILE_PREFIX} ${year}.pdf`
}
