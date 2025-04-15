import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a secure random password with specified length
 * @param length Length of the password to generate
 * @returns A random password string with mixed characters
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O which can be confused with 1 and 0
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Excluding l which can be confused with 1
  const numberChars = '23456789'; // Excluding 0 and 1 which can be confused with O and l
  const specialChars = '@#$%&*!?';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  let password = '';
  
  // Ensure at least one character from each group
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}
