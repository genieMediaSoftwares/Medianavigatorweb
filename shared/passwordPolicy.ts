/** bcrypt ignores bytes after 72; reject new passwords that would be silently truncated. */
export const PASSWORD_BYTE_LIMIT = 72;
export const PASSWORD_BYTE_MESSAGE = 'Use a shorter password (at most 72 UTF-8 bytes).';
export function passwordFitsBcrypt(password: string): boolean {
  let bytes = 0;
  for (const character of password) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes > PASSWORD_BYTE_LIMIT) return false;
  }
  return true;
}
