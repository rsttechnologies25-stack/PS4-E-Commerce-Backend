import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendOrderWhatsApp } from './whatsapp';

// Default feedback link — can be overridden via environment variable
const FEEDBACK_LINK = process.env.FEEDBACK_LINK || 'https://g.page/r/your-google-review-link';

/**
 * Cron job that runs every hour to send feedback request WhatsApp messages.
 * Targets orders that were delivered >= 2 days ago and haven't received feedback yet.
 */
export function startFeedbackCron() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('[FeedbackCron] Checking for orders needing feedback request...');

        try {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            const orders = await prisma.order.findMany({
                where: {
                    status: 'DELIVERED',
                    deliveredAt: {
                        not: null,
                        lte: twoDaysAgo
                    },
                    whatsappFeedbackSent: false
                }
            });

            console.log(`[FeedbackCron] Found ${orders.length} orders for feedback.`);

            for (const order of orders) {
                const sent = await sendOrderWhatsApp('FEEDBACK_REQUEST', order, {
                    feedbackLink: FEEDBACK_LINK
                });

                if (sent) {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            whatsappFeedbackSent: true,
                            feedbackSentAt: new Date()
                        }
                    });
                    console.log(`[FeedbackCron] Feedback sent for order ${order.id}`);
                }
            }
        } catch (error) {
            console.error('[FeedbackCron] Error:', error);
        }
    });

    console.log('[FeedbackCron] Feedback cron job started (runs every hour).');
}
