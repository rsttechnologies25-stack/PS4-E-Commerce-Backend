import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const DELIVERY_RADIUS_KM = 10;

// Haversine formula to calculate distance between two lat/lng points in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function findNearestBranch(lat: number, lng: number, branches: any[]) {
    let nearestBranch: any = null;
    let minDistance = Infinity;

    for (const branch of branches) {
        if (branch.latitude == null || branch.longitude == null) continue;
        const distance = haversineDistance(lat, lng, branch.latitude, branch.longitude);
        if (distance < minDistance) {
            minDistance = distance;
            nearestBranch = branch;
        }
    }
    return { nearestBranch, minDistance };
}

// Check delivery by lat/lng coordinates
router.post('/check', async (req, res) => {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    try {
        const branches = await prisma.branch.findMany();
        const { nearestBranch, minDistance } = findNearestBranch(lat, lng, branches);

        // For nationwide delivery, areaName is determined by geocoding results
        let areaName = 'OTHER STATES';
        try {
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'User-Agent': 'PS4SweetsDeliveryApp/1.0' } }
            );
            const geoData: any = await geoRes.json();
            if (geoData?.address) {
                const cityName = (geoData.address.city || geoData.address.town || geoData.address.village || '').toLowerCase();
                const stateName = (geoData.address.state || '').toLowerCase();

                if (cityName.includes('chennai')) {
                    areaName = 'CHENNAI';
                } else if (stateName.includes('tamil nadu')) {
                    areaName = 'TAMIL NADU';
                }
            }
        } catch (e) { /* fallback to OTHER STATES */ }

        return res.json({
            deliverable: true,
            areaName,
            pincode: null,
            distance: Math.round(minDistance * 10) / 10,
            lat,
            lng,
            nearestBranch: nearestBranch ? { name: nearestBranch.name, city: nearestBranch.city } : null
        });
    } catch (error) {
        console.error('Delivery check error:', error);
        res.status(500).json({ error: 'Failed to check delivery' });
    }
});

// Check delivery by pincode (geocode via Nominatim, then check radius)
router.post('/check-pincode', async (req, res) => {
    const { pincode } = req.body;

    if (!pincode) {
        return res.status(400).json({ error: 'Pincode is required' });
    }

    try {
        const branches = await prisma.branch.findMany();
        
        // Quick offline fallback check first to bypass Nominatim for known formats
        const pincodeTrim = pincode.replace(/\s/g, '');
        const servedBranch = branches.find(b => {
            const branchPincodeRaw = b.address.match(/\d{3}\s?\d{3}/)?.[0] || '';
            const branchPincode = branchPincodeRaw.replace(/\s/g, '');
            
            return (pincodeTrim.length === 6 && branchPincode.length === 6 && pincodeTrim.substring(0, 3) === branchPincode.substring(0, 3));
        });

        if (servedBranch) {
            console.log('[DeliveryCheck] Fast offline fallback match found:', servedBranch.name, pincode);
            return res.json({
                deliverable: true,
                areaName: servedBranch.city,
                pincode: pincodeTrim,
                lat: 0,
                lng: 0,
                distance: null, 
                nearestBranch: { name: servedBranch.name, city: servedBranch.city }
            });
        }

        const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`,
            { headers: { 'User-Agent': 'PS4SweetsDeliveryApp/1.0' }, signal: AbortSignal.timeout(3000) }
        );
        const geoData: any[] = await geoRes.json() as any[];

        if (!geoData || geoData.length === 0) {
            return res.json({
                deliverable: false,
                message: 'Could not find this pincode. Please check and try again.'
            });
        }

        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        const { nearestBranch, minDistance } = findNearestBranch(lat, lng, branches);

        // Fetch all shipping rules to find the most specific areaName for this pincode
        const shippingRules = await prisma.shippingRule.findMany({ where: { isActive: true } });
        
        let areaName = 'OTHER STATES';
        const displayNameLower = (geoData[0].display_name || '').toLowerCase();
        
        // 1. Check for Exact Pincode Match in rules
        const exactRule = shippingRules.find(r => 
            r.pincodes?.split(',').map(p => p.trim()).includes(pincode)
        );
        
        if (exactRule) {
            areaName = exactRule.areaName;
        } else {
            // 2. Check for Wildcard Match (e.g. 600*)
            const wildcardRule = shippingRules.find(r => 
                r.pincodes?.split(',').map(p => p.trim()).some(p => p.endsWith('*') && pincode.startsWith(p.slice(0, -1)))
            );
            
            if (wildcardRule) {
                areaName = wildcardRule.areaName;
            } else {
                // 3. Fallback to Geographic Area
                if (displayNameLower.includes('chennai')) {
                    areaName = 'CHENNAI';
                } else if (displayNameLower.includes('tamil nadu')) {
                    areaName = 'TAMIL NADU';
                }
            }
        }

        return res.json({
            deliverable: true,
            areaName,
            pincode,
            lat,
            lng,
            distance: Math.round(minDistance * 10) / 10,
            nearestBranch: nearestBranch ? { name: nearestBranch.name, city: nearestBranch.city } : null
        });
    } catch (error) {
        console.error('Pincode check error:', error);
        res.status(500).json({ error: 'Failed to check pincode' });
    }
});

export default router;
