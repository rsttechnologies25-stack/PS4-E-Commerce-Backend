export interface DeliveryZoneConfig {
    enabled: boolean;
    allowedAreas: string[];
    customPincodes: string[];
}

export const RESTRICTION_RULE_KEY = '__ORDER_ZONE_RESTRICTIONS__';

// Common mapping of districts/cities to their standard pincode prefixes & aliases
export const AREA_PINCODE_MAP: Record<string, { aliases: string[]; pincodes: string[] }> = {
    chennai: {
        aliases: ['chennai', 'madras', 'ch-'],
        pincodes: ['600*']
    },
    tiruvallur: {
        aliases: ['tiruvallur', 'thiruvallur', 'avadi', 'ambattur', 'ponneri', 'gummidipoondi', 'poochiyambakkam'],
        pincodes: ['601*', '602*']
    },
    kanchipuram: {
        aliases: ['kanchipuram', 'kancheepuram', 'kanchi'],
        pincodes: ['631*']
    },
    chengalpattu: {
        aliases: ['chengalpattu', 'chengalpet', 'tambaram', 'chromepet', 'pallavaram', 'vandalur'],
        pincodes: ['603*']
    },
    coimbatore: {
        aliases: ['coimbatore', 'kovai', 'pollachi'],
        pincodes: ['641*']
    },
    madurai: {
        aliases: ['madurai'],
        pincodes: ['625*']
    },
    trichy: {
        aliases: ['trichy', 'tiruchirappalli', 'tiruchirapalli'],
        pincodes: ['620*']
    },
    salem: {
        aliases: ['salem'],
        pincodes: ['636*']
    },
    tirunelveli: {
        aliases: ['tirunelveli', 'nellai'],
        pincodes: ['627*']
    },
    vellore: {
        aliases: ['vellore', 'katpadi'],
        pincodes: ['632*']
    },
    erode: {
        aliases: ['erode'],
        pincodes: ['638*']
    },
    thanjavur: {
        aliases: ['thanjavur', 'tanjore'],
        pincodes: ['613*']
    },
    dindigul: {
        aliases: ['dindigul'],
        pincodes: ['624*']
    },
    ranipet: {
        aliases: ['ranipet'],
        pincodes: ['632*']
    },
    tirupathur: {
        aliases: ['tirupathur', 'tirupattur'],
        pincodes: ['635*']
    },
    tiruppur: {
        aliases: ['tiruppur', 'tirupur'],
        pincodes: ['641*']
    }
};

/**
 * Validates whether a given delivery address falls within the allowed delivery zones.
 * If restrictions are disabled or no areas are specified, returns allowed: true (open everywhere).
 */
export function isDeliveryLocationAllowed(
    address: {
        city?: string | null;
        pincode?: string | null;
        state?: string | null;
        addressLine1?: string | null;
    },
    config: DeliveryZoneConfig
): { allowed: boolean; matchedBy?: string; reason?: string } {
    // If restrictions are not enabled or no areas are specified, orders are open everywhere
    if (!config.enabled || !Array.isArray(config.allowedAreas) || config.allowedAreas.length === 0) {
        return { allowed: true };
    }

    const city = (address.city || '').trim().toLowerCase();
    const pincode = (address.pincode || '').trim().replace(/\s+/g, '');
    const state = (address.state || '').trim().toLowerCase();
    const addressLine1 = (address.addressLine1 || '').trim().toLowerCase();

    for (const rawArea of config.allowedAreas) {
        const areaLower = rawArea.trim().toLowerCase();
        if (!areaLower) continue;

        // 1. Direct city name match (exact or substring)
        if (city && (city === areaLower || city.includes(areaLower) || areaLower.includes(city))) {
            return { allowed: true, matchedBy: rawArea };
        }

        // 2. Address Line 1 contains the area
        if (addressLine1 && addressLine1.includes(areaLower)) {
            return { allowed: true, matchedBy: rawArea };
        }

        // 3. State-wide check (if admin added "Tamil Nadu" as an allowed area)
        if (state && (state === areaLower || state.includes(areaLower))) {
            return { allowed: true, matchedBy: rawArea };
        }

        // 4. Known aliases & pincode mapping
        const mapping = AREA_PINCODE_MAP[areaLower];
        if (mapping) {
            // Check aliases in city or address
            for (const alias of mapping.aliases) {
                if ((city && city.includes(alias)) || (addressLine1 && addressLine1.includes(alias))) {
                    return { allowed: true, matchedBy: rawArea };
                }
            }

            // Check pincode prefixes for this mapped area
            if (pincode) {
                for (const pinPattern of mapping.pincodes) {
                    if (pinPattern.endsWith('*')) {
                        const prefix = pinPattern.slice(0, -1);
                        if (pincode.startsWith(prefix)) {
                            return { allowed: true, matchedBy: `${rawArea} (PIN: ${pincode})` };
                        }
                    } else if (pincode === pinPattern) {
                        return { allowed: true, matchedBy: `${rawArea} (PIN: ${pincode})` };
                    }
                }
            }
        }
    }

    // 5. Custom Pincodes check (if admin specified custom pincodes like "600028" or "601*")
    if (Array.isArray(config.customPincodes) && pincode) {
        for (const rawPin of config.customPincodes) {
            const pinPattern = rawPin.trim();
            if (!pinPattern) continue;

            if (pinPattern.endsWith('*')) {
                const prefix = pinPattern.slice(0, -1);
                if (pincode.startsWith(prefix)) {
                    return { allowed: true, matchedBy: `Pincode ${pinPattern}` };
                }
            } else if (pincode === pinPattern) {
                return { allowed: true, matchedBy: `Pincode ${pinPattern}` };
            }
        }
    }

    const areaListStr = config.allowedAreas.join(', ');
    return {
        allowed: false,
        reason: `Orders are currently accepted only for delivery in: ${areaListStr}.`
    };
}
