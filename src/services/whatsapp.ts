import prisma from '../lib/prisma';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Sends a plain text WhatsApp message to a phone number.
 * Phone number should be in format: 91XXXXXXXXXX (country code + number)
 */
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        console.error('[WhatsApp] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
        return false;
    }

    // Normalize phone number: remove spaces, dashes, + prefix
    let normalizedPhone = phoneNumber.replace(/[\s\-\+]/g, '');

    // If it starts with 0, remove it and prepend 91 (India)
    if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '91' + normalizedPhone.slice(1);
    }

    // If it's 10 digits, prepend 91
    if (normalizedPhone.length === 10) {
        normalizedPhone = '91' + normalizedPhone;
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'text',
                text: { body: message }
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`[WhatsApp] Message sent to ${normalizedPhone}:`, data);
            return true;
        } else {
            console.error(`[WhatsApp] Failed to send to ${normalizedPhone}:`, data);
            return false;
        }
    } catch (error) {
        console.error('[WhatsApp] Network error:', error);
        return false;
    }
}

/**
 * Replaces template variables with actual order values.
 * Supported variables: {customerName}, {orderId}, {totalAmount}, {trackingLink},
 * {trackingId}, {deliveryManName}, {deliveryManPhone}, {feedbackLink}
 */
export function replaceTemplateVariables(
    template: string,
    order: any,
    extras: { feedbackLink?: string } = {}
): string {
    const shortOrderId = order.id?.slice(-8)?.toUpperCase() || 'N/A';

    return template
        .replace(/\{customerName\}/g, order.customerName || 'Customer')
        .replace(/\{orderId\}/g, `#${shortOrderId}`)
        .replace(/\{totalAmount\}/g, `₹${order.totalAmount}`)
        .replace(/\{trackingLink\}/g, order.trackingLink || 'N/A')
        .replace(/\{trackingId\}/g, order.trackingId || 'N/A')
        .replace(/\{deliveryManName\}/g, order.deliveryManName || 'Our Delivery Partner')
        .replace(/\{deliveryManPhone\}/g, order.deliveryManPhone || 'N/A')
        .replace(/\{feedbackLink\}/g, extras.feedbackLink || 'N/A');
}

/**
 * Fetches a WhatsApp template by key and sends populated message.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendOrderWhatsApp(
    templateKey: string,
    order: any,
    extras: { feedbackLink?: string } = {}
): Promise<boolean> {
    try {
        const template = await prisma.whatsAppTemplate.findUnique({
            where: { key: templateKey }
        });

        if (!template || !template.isActive) {
            console.log(`[WhatsApp] Template "${templateKey}" not found or inactive. Skipping.`);
            return false;
        }

        if (!order.phoneNumber) {
            console.log(`[WhatsApp] Order ${order.id} has no phone number. Skipping.`);
            return false;
        }

        const message = replaceTemplateVariables(template.message, order, extras);
        return await sendWhatsAppMessage(order.phoneNumber, message);
    } catch (error) {
        console.error(`[WhatsApp] Error sending "${templateKey}" for order ${order.id}:`, error);
        return false;
    }
}
