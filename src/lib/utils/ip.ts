/**
 * Lightweight IP allowlist matching.
 *
 * Supports exact IPv4/IPv6 addresses and CIDR notation.
 * IPv6 CIDR matching is kept simple and covers the common case.
 */

function parseIp(ip: string): bigint | null {
  if (ip.includes('.')) {
    // IPv4
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    let acc = BigInt(0);
    for (const part of parts) {
      const n = parseInt(part, 10);
      if (Number.isNaN(n) || n < 0 || n > 255) return null;
      acc = (acc << BigInt(8)) | BigInt(n);
    }
    return acc;
  }

  if (ip.includes(':')) {
    // IPv6
    const groups = ip.split(':');
    if (groups.length < 2 || groups.length > 8) return null;
    let acc = BigInt(0);
    let filled = false;
    for (const group of groups) {
      if (group === '') {
        if (filled) return null;
        filled = true;
        // Fill remaining groups with zeros.
        const remaining = 8 - groups.length + 1;
        acc = acc << (BigInt(remaining) * BigInt(16));
      } else {
        const n = parseInt(group, 16);
        if (Number.isNaN(n) || n < 0 || n > 0xffff) return null;
        acc = (acc << BigInt(16)) | BigInt(n);
      }
    }
    return acc;
  }

  return null;
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [network, bitsRaw] = cidr.split('/');
  const bits = parseInt(bitsRaw ?? '', 10);
  if (Number.isNaN(bits)) return false;

  const ipValue = parseIp(ip);
  const networkValue = parseIp(network);
  if (ipValue === null || networkValue === null) return false;

  const isV4 = network.includes('.');
  const totalBits = isV4 ? 32 : 128;
  if (bits < 0 || bits > totalBits) return false;

  const shift = BigInt(totalBits - bits);
  return (ipValue >> shift) === (networkValue >> shift);
}

/**
 * Check whether an IP address is allowed by the given allowlist.
 *
 * An empty allowlist means all IPs are allowed.
 */
export function isIpAllowedByList(
  ip: string | null,
  allowed?: string[],
): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!ip || ip === 'unknown') return false;

  return allowed.some((entry) => {
    const trimmed = entry.trim();
    if (trimmed.includes('/')) {
      return ipMatchesCidr(ip, trimmed);
    }
    return trimmed === ip;
  });
}
