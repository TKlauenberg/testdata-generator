import type { RNG } from '../rng';

/**
 * Curated list of diverse first names including Western and international names
 */
const FIRST_NAMES: readonly string[] = [
  // Western names
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Christopher',
  'Karen',
  'Charles',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  // Hispanic/Latino names
  'Carlos',
  'Maria',
  'Jose',
  'Sofia',
  'Luis',
  'Carmen',
  'Miguel',
  'Ana',
  'Juan',
  'Isabel',
  // Asian names
  'Wei',
  'Yuki',
  'Raj',
  'Aisha',
  'Li',
  'Mei',
  'Hiroshi',
  'Priya',
  'Chen',
  'Sakura',
  // European names
  'Hans',
  'Lucia',
  'Dmitri',
  'Sofie',
  'Pierre',
  'Elena',
  'Marco',
  'Nina',
  'Klaus',
  'Ingrid',
  // Middle Eastern names
  'Ahmed',
  'Fatima',
  'Omar',
  'Layla',
  'Hassan',
  'Zara',
  // African names
  'Kofi',
  'Amara',
  'Kwame',
  'Nia',
] as const;

/**
 * Curated list of diverse surnames including common and international surnames
 */
const LAST_NAMES: readonly string[] = [
  // Common Western surnames
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Thompson',
  'White',
  'Harris',
  'Clark',
  'Lewis',
  'Robinson',
  'Walker',
  'Hall',
  'Allen',
  // Asian surnames
  'Zhang',
  'Wang',
  'Kim',
  'Patel',
  'Singh',
  'Chen',
  'Liu',
  'Yang',
  'Nguyen',
  'Kumar',
  'Tanaka',
  'Suzuki',
  'Sato',
  'Sharma',
  'Reddy',
  // European surnames
  'Mueller',
  'Schmidt',
  'Schneider',
  'Fischer',
  'Weber',
  'Meyer',
  'Wagner',
  'Becker',
  'Schulz',
  'Hoffmann',
  'Rossi',
  'Russo',
  'Ferrari',
  'Romano',
  'Colombo',
  // Middle Eastern surnames
  'Ali',
  'Hassan',
  'Hussein',
  'Ibrahim',
  'Mahmoud',
  // African surnames
  'Okafor',
  'Adeyemi',
  'Mwangi',
  'Diop',
] as const;

/**
 * Generates a random first name from the curated list
 * @param rng - Random number generator for deterministic selection
 * @returns A first name from FIRST_NAMES array
 */
export function firstName(rng: RNG): string {
  const index = rng.nextIntRange(0, FIRST_NAMES.length - 1);
  return FIRST_NAMES[index];
}

/**
 * Generates a random last name from the curated list
 * @param rng - Random number generator for deterministic selection
 * @returns A surname from LAST_NAMES array
 */
export function lastName(rng: RNG): string {
  const index = rng.nextIntRange(0, LAST_NAMES.length - 1);
  return LAST_NAMES[index];
}

/**
 * Generates a random full name by combining first and last names
 * @param rng - Random number generator for deterministic selection
 * @returns A full name in "FirstName LastName" format
 */
export function fullName(rng: RNG): string {
  return `${firstName(rng)} ${lastName(rng)}`;
}

/**
 * Generates a realistic email address using firstname.lastname pattern
 * @param rng - Random number generator for deterministic selection
 * @param domain - Email domain (defaults to 'example.com')
 * @returns A valid email address in lowercase
 */
export function email(rng: RNG, domain: string = 'example.com'): string {
  const first = firstName(rng).toLowerCase();
  const last = lastName(rng).toLowerCase();

  // Clean names: replace non-alphanumeric characters with dash
  const cleanFirst = first.replace(/[^a-z0-9]/g, '-');
  const cleanLast = last.replace(/[^a-z0-9]/g, '-');

  return `${cleanFirst}.${cleanLast}@${domain}`;
}

/**
 * Generates a phone number using a format pattern
 * @param rng - Random number generator for deterministic digit generation
 * @param format - Phone number format pattern where '#' represents a digit (defaults to "(###) ###-####")
 * @returns A phone number matching the format pattern
 */
export function phoneNumber(rng: RNG, format: string = '(###) ###-####'): string {
  let result = '';
  for (const char of format) {
    if (char === '#') {
      result += rng.nextIntRange(0, 9).toString();
    } else {
      result += char;
    }
  }
  return result;
}
