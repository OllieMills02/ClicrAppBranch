
/**
 * Simple AAMVA Parser for US Driver's Licenses
 * Extracts key fields from raw PDF417 data
 */

export interface ParsedID {
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    dob: string | null; // YYYYMMDD
    expirationDate: string | null; // YYYYMMDD
    idNumber: string | null;
    issuingState: string | null;
    postalCode: string | null;
    gender: string | null;
    city: string | null;
    address: string | null;
}

export function parseAAMVA(data: string): ParsedID {
    const result: ParsedID = {
        firstName: null,
        lastName: null,
        fullName: null,
        dob: null,
        expirationDate: null,
        idNumber: null,
        issuingState: null,
        postalCode: null,
        gender: null,
        city: null,
        address: null
    };

    // Normalize newlines
    const raw = data.replace(/\r/g, '\n');

    // Extract Data Elements using Regex
    // AAMVA format usually has elements like DAA, DAB, etc. preceded by a line feed or specific delimiter
    // Note: This is an approximation. Production parsers handle subfile headers more robustly.

    const extract = (code: string) => {
        const regex = new RegExp(`${code}([^\\n\\r]+)`, 'g');
        const match = regex.exec(raw);
        return match ? match[1].trim() : null;
    };

    result.firstName = extract('DAC');
    result.lastName = extract('DCS');
    result.fullName = extract('DAA');
    result.dob = extract('DBB');
    result.expirationDate = extract('DBA');
    result.idNumber = extract('DAQ');
    result.issuingState = extract('DAJ');
    result.postalCode = extract('DAK');
    result.gender = extract('DBC'); // 1 = Male, 2 = Female usually
    result.city = extract('DAI');
    result.address = extract('DAG');

    // Fallback for some states that use different keys or formats
    if (!result.lastName) result.lastName = extract('DAB'); // Older format Last Name

    return result;
}

export function isExpired(expirationDate: string | null): boolean {
    if (!expirationDate) return false; // Assume valid if unreadable/missing (policy choice)

    // YYYYMMDD
    const y = parseInt(expirationDate.substring(0, 4));
    const m = parseInt(expirationDate.substring(4, 6)) - 1;
    const d = parseInt(expirationDate.substring(6, 8));

    const exp = new Date(y, m, d);
    const now = new Date();

    // Reset time components
    now.setHours(0, 0, 0, 0);

    return exp < now;
}

export function getAge(dob: string | null): number | null {
    if (!dob) return null;

    const y = parseInt(dob.substring(0, 4));
    const m = parseInt(dob.substring(4, 6)) - 1;
    const d = parseInt(dob.substring(6, 8));

    const birth = new Date(y, m, d);
    const now = new Date();

    let age = now.getFullYear() - birth.getFullYear();
    const mDiff = now.getMonth() - birth.getMonth();

    if (mDiff < 0 || (mDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}
