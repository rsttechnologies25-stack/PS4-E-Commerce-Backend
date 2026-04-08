/**
 * Seeds default WhatsApp message templates into the database.
 * Run with: npx ts-node src/services/seedWhatsAppTemplates.ts
 */
import prisma from '../lib/prisma';

const defaultTemplates = [
    {
        key: 'ORDER_CONFIRMED',
        name: 'Order Confirmed',
        message: `🎉 *Order Confirmed!*

Hi {customerName},

Thank you for ordering from *Perambur Sri Srinivasa*! 🍬

📦 *Order ID:* {orderId}
💰 *Total:* {totalAmount}

Your order is now being *processed* and will be shipped soon. We'll notify you with tracking details once dispatched.

Thank you for choosing us! 🙏
— Team Perambur Sri Srinivasa`
    },
    {
        key: 'ORDER_SHIPPED',
        name: 'Order Shipped',
        message: `🚚 *Order Shipped!*

Hi {customerName},

Great news! Your order {orderId} has been *shipped*! 📦

🧑‍✈️ *Delivery Partner:* {deliveryManName}
📞 *Contact:* {deliveryManPhone}
🔗 *Track Here:* {trackingLink}
🆔 *Tracking ID:* {trackingId}

You can track your package using the link above. Estimated delivery: 2-4 business days.

— Team Perambur Sri Srinivasa`
    },
    {
        key: 'ORDER_DELIVERED',
        name: 'Order Delivered',
        message: `✅ *Order Delivered!*

Hi {customerName},

Your order {orderId} has been *delivered* successfully! 🎊

We hope you enjoy our sweets! If you have any issues with your order, please don't hesitate to reach out.

Thank you for being a valued customer! 🙏
— Team Perambur Sri Srinivasa`
    },
    {
        key: 'FEEDBACK_REQUEST',
        name: 'Feedback Request',
        message: `⭐ *We'd Love Your Feedback!*

Hi {customerName},

It's been a couple of days since your order {orderId} was delivered. We hope you enjoyed our sweets! 🍬

We'd be incredibly grateful if you could take a moment to share your experience:

👉 {feedbackLink}

Your feedback helps us serve you better! 🙏
— Team Perambur Sri Srinivasa`
    }
];

async function seedTemplates() {
    console.log('Seeding WhatsApp templates...');

    for (const template of defaultTemplates) {
        await prisma.whatsAppTemplate.upsert({
            where: { key: template.key },
            create: template,
            update: {
                name: template.name,
                message: template.message
            }
        });
        console.log(`  ✓ ${template.key}`);
    }

    console.log('Done! All templates seeded.');
    await prisma.$disconnect();
}

seedTemplates().catch(console.error);
